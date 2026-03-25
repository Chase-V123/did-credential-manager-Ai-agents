/**
 * Orchestrator Agent
 *
 * Wraps VerifierAgent to add:
 * - Persistent identity
 * - Registry client (discover agents by summary)
 * - Async DIDComm challenge-response bridged to sync HTTP via pending-task map
 * - Summary authorization after VP verification
 * - Calling-convention aware delegation
 *
 * @module agent
 */

import {
  DIDComm,
  EphemeralSecretsResolver,
  saveIdentity,
  loadIdentity,
  logger,
} from '@did-edu/common';
import { v4 as uuidv4 } from 'uuid';
import { executeTask, TaskResult } from './executor/task-executor.js';

export interface OrchestrateResult {
  verified: boolean;
  agentDid: string;
  result: TaskResult;
}

interface PendingTask {
  resolve: (value: OrchestrateResult) => void;
  reject: (reason: any) => void;
  agentDid: string;
  serviceEndpoint: string;
  task: string;
  requiredSummary: string;
  challengeValue: string;
}

interface VerificationResult {
  verified: boolean;
  claims: any;
  errors: string[];
}

function verifyPresentation(presentation: any, expectedChallenge: string): VerificationResult {
  const errors: string[] = [];

  if (!presentation) {
    return { verified: false, claims: null, errors: ['No presentation provided'] };
  }

  const proofChallenge = presentation.proof?.challenge;
  if (!proofChallenge) {
    errors.push('Presentation proof missing challenge');
  } else if (proofChallenge !== expectedChallenge) {
    errors.push(`Challenge mismatch: expected ${expectedChallenge}, got ${proofChallenge}`);
  }

  if (errors.length > 0) {
    return { verified: false, claims: null, errors };
  }

  const credentials: any[] = presentation.verifiableCredential || [];
  const agentCred = credentials.find(
    vc => (vc.type as string[] || []).includes('AgentIdentityCredential')
  );

  return {
    verified: true,
    claims: agentCred?.credentialSubject || null,
    errors: [],
  };
}

function summaryMatches(agentSummary: string | undefined, requestedSummary: string): boolean {
  if (!agentSummary) return false;
  return agentSummary.toLowerCase().includes(requestedSummary.trim().toLowerCase());
}

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
    return this.orchestratorDid;
  }

  getDid(): string {
    if (!this.orchestratorDid) throw new Error('Orchestrator not initialized');
    return this.orchestratorDid;
  }

  async orchestrate(task: string, summary: string): Promise<OrchestrateResult> {
    if (!this.orchestratorDid) throw new Error('Orchestrator not initialized');

    const { agentDid, serviceEndpoint } = await this.discoverAgent(summary);
    logger.info(`Orchestrator: found agent ${agentDid} at ${serviceEndpoint} for summary "${summary}"`);

    const challengeValue = uuidv4();

    const requestMessage = {
      type: 'https://didcomm.org/present-proof/3.0/request-presentation',
      body: {
        challenge: challengeValue,
        credential_types: ['AgentIdentityCredential'],
      },
    };

    const responsePromise = new Promise<OrchestrateResult>((resolve, reject) => {
      this.pendingTasks.set(challengeValue, {
        resolve,
        reject,
        agentDid,
        serviceEndpoint,
        task,
        requiredSummary: summary,
        challengeValue,
      });

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

    const challenge = presentation.proof?.challenge as string | undefined;

    if (!challenge) {
      logger.error('Orchestrator: VP has no challenge in proof and cannot be matched to a pending task');
      return;
    }

    const pending = this.pendingTasks.get(challenge);
    if (!pending) {
      logger.warn(`Orchestrator: no pending task for challenge ${challenge}`);
      return;
    }

    this.pendingTasks.delete(challenge);

    const verificationResult = verifyPresentation(presentation, pending.challengeValue);
    if (!verificationResult.verified) {
      pending.reject(new Error(`VP verification failed: ${verificationResult.errors.join(', ')}`));
      return;
    }

    const vendorDid: string | undefined = verificationResult.claims?.vendorDid;
    if (!vendorDid) {
      pending.reject(new Error(`Agent ${pending.agentDid} credential is missing vendorDid`));
      return;
    }

    const agentSummary: string | undefined = verificationResult.claims?.summary;
    const callingConvention: string = verificationResult.claims?.callingConvention || 'http';

    if (!summaryMatches(agentSummary, pending.requiredSummary)) {
      pending.reject(
        new Error(`Agent ${pending.agentDid} summary does not satisfy request: ${pending.requiredSummary}`)
      );
      return;
    }

    logger.info(
      `Orchestrator: agent ${pending.agentDid} verified via vendor ${vendorDid}; callingConvention=${callingConvention}`
    );

    try {
      const taskResult = await this.delegateTask(
        pending.serviceEndpoint,
        pending.task,
        pending.agentDid,
        callingConvention
      );
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

  private async discoverAgent(summary: string): Promise<{ agentDid: string; serviceEndpoint: string }> {
    const url = `${this.registryUrl}/agents?summary=${encodeURIComponent(summary)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Registry lookup failed (${response.status})`);
    }

    const { agents } = await response.json() as { agents: Array<{ agentDid: string; serviceEndpoint: string }> };

    if (!agents || agents.length === 0) {
      throw new Error(`No agents found matching summary: ${summary}`);
    }

    return agents[0];
  }

  private async delegateTask(
    serviceEndpoint: string,
    task: string,
    agentDid: string,
    callingConvention: string
  ): Promise<TaskResult> {
    if (callingConvention === 'http') {
      const response = await fetch(`${serviceEndpoint}/tasks/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, requestedBy: this.orchestratorDid }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Task delegation to ${agentDid} failed (${response.status}): ${text}`);
      }

      return (await response.json() as { result: TaskResult }).result;
    }

    if (callingConvention === 'openai-chat' || callingConvention === 'local-chat') {
      logger.info(`Orchestrator: executing task inline for ${agentDid} using ${callingConvention}`);
      return await executeTask(task);
    }

    throw new Error(`Unsupported callingConvention for ${agentDid}: ${callingConvention}`);
  }
}

export async function createOrchestratorAgent(config: OrchestratorAgentConfig): Promise<OrchestratorAgent> {
  const agent = new OrchestratorAgent(config);
  await agent.initialize();
  return agent;
}
