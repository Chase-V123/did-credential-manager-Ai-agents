/**
 * Orchestrator Agent
 *
 * Wraps VerifierAgent to add:
 * - Persistent identity
 * - Registry client (discover agents by capability)
 * - Async DIDComm challenge-response bridged to sync HTTP via pending-task map
 * - Capability authorization after VP verification
 *
 * @module agent
 */

import {
  DIDComm,
  PrefixResolver,
  EphemeralSecretsResolver,
  saveIdentity,
  loadIdentity,
  logger,
} from '@did-edu/common';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrchestrateResult {
  verified: boolean;
  agentDid: string;
  result: any;
}

interface PendingTask {
  resolve: (value: OrchestrateResult) => void;
  reject: (reason: any) => void;
  agentDid: string;
  serviceEndpoint: string;
  task: string;
  requiredCapability: string;
  challengeValue: string;
}

// ---------------------------------------------------------------------------
// Minimal inline verifier (avoids cross-package import issues at runtime)
// ---------------------------------------------------------------------------

function verifyPresentation(presentation: any, expectedChallenge: string): { verified: boolean; claims: any; errors: string[] } {
  const errors: string[] = [];

  if (!presentation) {
    return { verified: false, claims: null, errors: ['No presentation provided'] };
  }

  // Check challenge matches
  const proofChallenge = presentation.proof?.challenge;
  if (!proofChallenge) {
    errors.push('Presentation proof missing challenge');
  } else if (proofChallenge !== expectedChallenge) {
    errors.push(`Challenge mismatch: expected ${expectedChallenge}, got ${proofChallenge}`);
  }

  if (errors.length > 0) {
    return { verified: false, claims: null, errors };
  }

  // Extract claims from first AgentIdentityCredential in the VP
  const credentials: any[] = presentation.verifiableCredential || [];
  const agentCred = credentials.find(
    vc => (vc.type as string[] || []).includes('AgentIdentityCredential')
  );

  const claims = agentCred?.credentialSubject || null;
  return { verified: true, claims, errors: [] };
}

// ---------------------------------------------------------------------------
// OrchestratorAgent
// ---------------------------------------------------------------------------

export interface OrchestratorAgentConfig {
  serviceEndpoint: string;
  registryUrl: string;
  identityPath: string;
  taskTimeoutMs?: number;
}

export class OrchestratorAgent {
  private didcomm: DIDComm;
  private secretsResolver: EphemeralSecretsResolver;
  private orchestratorDid: string | null = null;
  private readonly registryUrl: string;
  private readonly serviceEndpoint: string;
  private readonly identityPath: string;
  private readonly taskTimeoutMs: number;

  /**
   * Map from challengeValue → pending task info.
   * When a VP arrives on /didcomm we look up the challenge from the proof.
   */
  private pendingTasks: Map<string, PendingTask> = new Map();

  constructor(config: OrchestratorAgentConfig) {
    this.serviceEndpoint = config.serviceEndpoint;
    this.registryUrl = config.registryUrl;
    this.identityPath = config.identityPath;
    this.taskTimeoutMs = config.taskTimeoutMs ?? 30_000;
    this.secretsResolver = new EphemeralSecretsResolver();
    this.didcomm = new DIDComm(this.secretsResolver);
  }

  async initialize(): Promise<string> {
    const stored = loadIdentity(this.identityPath);
    if (stored) {
      this.orchestratorDid = stored.did;
      this.didcomm.storeSecrets(stored.secrets);
      logger.info(`Orchestrator: loaded existing DID: ${this.orchestratorDid}`);
    } else {
      this.orchestratorDid = await this.didcomm.generateDid(this.serviceEndpoint);
      saveIdentity(this.identityPath, this.orchestratorDid, this.secretsResolver.getAllSecrets());
      logger.info(`Orchestrator: generated new DID: ${this.orchestratorDid}`);
    }
    return this.orchestratorDid!;
  }

  getDid(): string {
    if (!this.orchestratorDid) throw new Error('Orchestrator not initialized');
    return this.orchestratorDid;
  }

  // ---------------------------------------------------------------------------
  // Orchestration
  // ---------------------------------------------------------------------------

  /**
   * Full orchestration flow:
   * 1. Discover agent via registry
   * 2. Send DIDComm presentation request with a challenge
   * 3. Wait (async) for agent to respond on /didcomm
   * 4. Verify VP + capability claim
   * 5. Delegate task via HTTP
   * 6. Return result
   */
  async orchestrate(task: string, capability: string): Promise<OrchestrateResult> {
    if (!this.orchestratorDid) throw new Error('Orchestrator not initialized');

    // Step 1: discover agent
    const { agentDid, serviceEndpoint } = await this.discoverAgent(capability);
    logger.info(`Orchestrator: found agent ${agentDid} at ${serviceEndpoint} for capability "${capability}"`);

    // Step 2: generate challenge and send presentation request via DIDComm
    const challengeValue = uuidv4();

    const requestMessage = {
      type: 'https://didcomm.org/present-proof/3.0/request-presentation',
      body: {
        challenge: challengeValue,
        credential_types: ['AgentIdentityCredential'],
      },
    };

    // Step 3: register the pending task BEFORE sending the request, so the
    // VP callback can be matched even if it arrives during sendMessage.
    const responsePromise = new Promise<OrchestrateResult>((resolve, reject) => {
      const pending: PendingTask = {
        resolve,
        reject,
        agentDid,
        serviceEndpoint,
        task,
        requiredCapability: capability,
        challengeValue,
      };

      this.pendingTasks.set(challengeValue, pending);

      setTimeout(() => {
        if (this.pendingTasks.has(challengeValue)) {
          this.pendingTasks.delete(challengeValue);
          reject(new Error(`Orchestration timed out waiting for agent VP (challenge: ${challengeValue})`));
        }
      }, this.taskTimeoutMs);
    });

    await this.didcomm.sendMessage(agentDid, this.orchestratorDid, requestMessage);
    logger.info(`Orchestrator: presentation request sent to ${agentDid}`, { challenge: challengeValue });

    return responsePromise;
  }

  // ---------------------------------------------------------------------------
  // DIDComm message handling
  // ---------------------------------------------------------------------------

  /**
   * Handle an incoming DIDComm message.
   * When we receive a VP from an agent, verify it and complete the pending task.
   */
  async handleMessage(packedMessage: string): Promise<any> {
    const [message] = await this.didcomm.receiveMessage(packedMessage);
    const plaintext = message.as_value();

    logger.info(`Orchestrator received DIDComm message: ${plaintext.type}`);

    switch (plaintext.type) {
      case 'https://didcomm.org/present-proof/3.0/presentation':
        return await this.handlePresentation(plaintext);

      case 'https://didcomm.org/trust-ping/2.0/ping':
        return await this.handleTrustPing(plaintext);

      default:
        logger.warn(`Orchestrator: unknown message type: ${plaintext.type}`);
        return null;
    }
  }

  private async handlePresentation(message: any): Promise<void> {
    const presentation = message.body?.verifiable_presentation;

    if (!presentation) {
      logger.error('Orchestrator: received presentation message with no VP body');
      return;
    }

    // Find the pending task by matching the challenge in the VP proof
    const challenge = presentation.proof?.challenge as string | undefined;

    if (!challenge) {
      logger.error('Orchestrator: VP has no challenge in proof — cannot match to pending task');
      return;
    }

    const pending = this.pendingTasks.get(challenge);

    if (!pending) {
      logger.warn(`Orchestrator: no pending task for challenge ${challenge}`);
      return;
    }

    this.pendingTasks.delete(challenge);

    // Verify the presentation
    const verificationResult = verifyPresentation(presentation, pending.challengeValue);

    if (!verificationResult.verified) {
      logger.warn('Orchestrator: VP verification failed', { errors: verificationResult.errors });
      pending.reject(new Error(`VP verification failed: ${verificationResult.errors.join(', ')}`));
      return;
    }

    // Authorization: check capabilities claim
    const agentCapabilities: string[] = verificationResult.claims?.capabilities || [];
    if (!agentCapabilities.includes(pending.requiredCapability)) {
      const err = new Error(
        `Agent ${pending.agentDid} not authorized for capability: ${pending.requiredCapability}`
      );
      logger.warn(err.message);
      pending.reject(err);
      return;
    }

    logger.info(`Orchestrator: agent ${pending.agentDid} verified and authorized for "${pending.requiredCapability}"`);

    // Delegate task to agent via HTTP
    try {
      const taskResult = await this.delegateTask(pending.serviceEndpoint, pending.task, pending.agentDid);
      pending.resolve({
        verified: true,
        agentDid: pending.agentDid,
        result: taskResult,
      });
    } catch (error) {
      pending.reject(error);
    }
  }

  private async handleTrustPing(message: any): Promise<void> {
    if (!this.orchestratorDid) return;
    if (message.body?.response_requested !== false) {
      await this.didcomm.sendMessage(message.from, this.orchestratorDid, {
        type: 'https://didcomm.org/trust-ping/2.0/ping-response',
        thid: message.id,
        body: {},
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async discoverAgent(capability: string): Promise<{ agentDid: string; serviceEndpoint: string }> {
    const url = `${this.registryUrl}/agents?capability=${encodeURIComponent(capability)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Registry lookup failed (${response.status})`);
    }

    const { agents } = await response.json() as { agents: any[] };

    if (!agents || agents.length === 0) {
      throw new Error(`No agents found with capability: ${capability}`);
    }

    const agent = agents[0];
    return { agentDid: agent.agentDid, serviceEndpoint: agent.serviceEndpoint };
  }

  private async delegateTask(serviceEndpoint: string, task: string, agentDid: string): Promise<any> {
    const response = await fetch(`${serviceEndpoint}/tasks/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, requestedBy: this.orchestratorDid }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Task delegation to ${agentDid} failed (${response.status}): ${text}`);
    }

    return (await response.json() as { result: any }).result;
  }
}

export async function createOrchestratorAgent(config: OrchestratorAgentConfig): Promise<OrchestratorAgent> {
  const agent = new OrchestratorAgent(config);
  await agent.initialize();
  return agent;
}
