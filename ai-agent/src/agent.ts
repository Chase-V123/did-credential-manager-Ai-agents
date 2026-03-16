/**
 * AI Agent
 *
 * DID-backed AI agent. Wraps the HolderAgent pattern with:
 * - Persistent identity (survives restarts)
 * - Auto-registration with the Agent Registry on first start
 * - DIDComm handling for orchestrator presentation requests
 *
 * @module agent
 */

import { createAgent, IResolver, ICredentialPlugin } from '@veramo/core';
import { CredentialPlugin } from '@veramo/credential-w3c';
import { DIDResolverPlugin } from '@veramo/did-resolver';
import { Resolver } from 'did-resolver';
import {
  DIDComm,
  PrefixResolver,
  EphemeralSecretsResolver,
  saveIdentity,
  loadIdentity,
  logger,
} from '@did-edu/common';

// Inline the credential store and VP builder imports
// (mirrors holder internals to avoid cross-package runtime coupling)
import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

// ---------------------------------------------------------------------------
// Minimal credential store (same schema as holder)
// ---------------------------------------------------------------------------

interface StoredCredential {
  id: string;
  credential: any;
}

class CredentialStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS credentials (
        id TEXT PRIMARY KEY,
        credential TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);
  }

  store(credential: any): void {
    const id = credential.id || `vc-${Date.now()}`;
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO credentials (id, credential, createdAt) VALUES (?, ?, ?)'
    );
    stmt.run(id, JSON.stringify(credential), new Date().toISOString());
  }

  getAll(): StoredCredential[] {
    const rows = this.db.prepare('SELECT * FROM credentials').all() as any[];
    return rows.map(r => ({ id: r.id, credential: JSON.parse(r.credential) }));
  }

  findByType(type: string): StoredCredential[] {
    const rows = this.db.prepare('SELECT * FROM credentials').all() as any[];
    return rows
      .map(r => ({ id: r.id, credential: JSON.parse(r.credential) }))
      .filter(s => (s.credential.type as string[] || []).includes(type));
  }

  close(): void {
    this.db.close();
  }
}

// ---------------------------------------------------------------------------
// VP builder (inline minimal version)
// ---------------------------------------------------------------------------

function buildPresentation(holderDid: string, credentials: any[], challenge?: string, domain?: string): any {
  const vp: any = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiablePresentation'],
    holder: holderDid,
    verifiableCredential: credentials,
  };
  if (challenge || domain) {
    vp.proof = {
      type: 'Ed25519Signature2020',
      created: new Date().toISOString(),
      proofPurpose: 'authentication',
      verificationMethod: `${holderDid}#key-1`,
      ...(challenge && { challenge }),
      ...(domain && { domain }),
    };
  }
  return vp;
}

// ---------------------------------------------------------------------------
// AIAgent
// ---------------------------------------------------------------------------

export interface AIAgentConfig {
  serviceEndpoint: string;
  /** Base HTTP URL registered with the registry (e.g. http://localhost:5006).
   *  Orchestrators use this to POST /tasks/execute. Defaults to stripping /didcomm. */
  agentBaseUrl?: string;
  agentId: string;
  capabilities: string[];
  registryUrl: string;
  identityPath: string;
  dbPath?: string;
}

export class AIAgent {
  private didcomm: DIDComm;
  private secretsResolver: EphemeralSecretsResolver;
  private credentialStore: CredentialStore;
  private agentDid: string | null = null;
  private readonly config: AIAgentConfig;

  constructor(config: AIAgentConfig) {
    this.config = config;
    this.secretsResolver = new EphemeralSecretsResolver();
    this.didcomm = new DIDComm(this.secretsResolver);
    this.credentialStore = new CredentialStore(config.dbPath || './data/ai-agent-credentials.db');

    // Veramo agent (for resolver support — not strictly needed but keeps parity)
    const prefixResolver = new PrefixResolver();
    const didResolver = new Resolver({
      peer: async (did: string) => {
        const doc = await prefixResolver.resolve(did);
        if (!doc) throw new Error(`Could not resolve DID: ${did}`);
        return {
          didDocument: doc,
          didDocumentMetadata: {},
          didResolutionMetadata: { contentType: 'application/did+ld+json' },
        };
      },
    });
    createAgent<IResolver & ICredentialPlugin>({
      plugins: [new DIDResolverPlugin({ resolver: didResolver }), new CredentialPlugin()],
    });
  }

  /**
   * Initialize: load or generate persistent identity, then register with registry if needed.
   */
  async initialize(): Promise<string> {
    // 1. Load or generate DID
    const stored = loadIdentity(this.config.identityPath);
    if (stored) {
      this.agentDid = stored.did;
      this.didcomm.storeSecrets(stored.secrets);
      logger.info(`AI Agent: loaded existing DID: ${this.agentDid}`);
    } else {
      this.agentDid = await this.didcomm.generateDid(this.config.serviceEndpoint);
      saveIdentity(this.config.identityPath, this.agentDid, this.secretsResolver.getAllSecrets());
      logger.info(`AI Agent: generated new DID: ${this.agentDid}`);
    }

    // 2. Register with registry if we don't already have an AgentIdentityCredential
    const existing = this.credentialStore.findByType('AgentIdentityCredential');
    if (existing.length === 0) {
      await this.registerWithRegistry();
    } else {
      logger.info('AI Agent: already registered (credential found in store)');
    }

    return this.agentDid!;
  }

  /**
   * POST to registry to register and receive AgentIdentityCredential.
   */
  private async registerWithRegistry(): Promise<void> {
    const { registryUrl, agentId, capabilities, serviceEndpoint, agentBaseUrl } = this.config;
    // Register with the base HTTP URL, not the /didcomm URL
    const registrationEndpoint = agentBaseUrl || serviceEndpoint.replace(/\/didcomm$/, '');
    logger.info(`AI Agent: registering with registry at ${registryUrl}`);

    const response = await fetch(`${registryUrl}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentDid: this.agentDid,
        agentId,
        capabilities,
        serviceEndpoint: registrationEndpoint,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Registry registration failed (${response.status}): ${text}`);
    }

    const { credential } = await response.json() as { credential: any };
    this.credentialStore.store(credential);
    logger.info('AI Agent: received and stored AgentIdentityCredential');
  }

  getDid(): string {
    if (!this.agentDid) throw new Error('Agent not initialized');
    return this.agentDid;
  }

  getCapabilities(): string[] {
    return this.config.capabilities;
  }

  getCredentials(): StoredCredential[] {
    return this.credentialStore.getAll();
  }

  /**
   * Handle incoming DIDComm messages (presentation requests from orchestrator).
   */
  async handleMessage(packedMessage: string): Promise<any> {
    const [message] = await this.didcomm.receiveMessage(packedMessage);
    const plaintext = message.as_value();

    logger.info(`AI Agent received message: ${plaintext.type}`);

    switch (plaintext.type) {
      case 'https://didcomm.org/present-proof/3.0/request-presentation':
        return await this.handlePresentationRequest(plaintext);

      case 'https://didcomm.org/trust-ping/2.0/ping':
        return await this.handleTrustPing(plaintext);

      default:
        logger.warn(`AI Agent: unknown message type: ${plaintext.type}`);
        return null;
    }
  }

  private async handlePresentationRequest(message: any): Promise<void> {
    if (!this.agentDid) throw new Error('Agent not initialized');

    logger.info('AI Agent: building VP in response to presentation request', {
      from: message.from,
      challenge: message.body?.challenge,
    });

    const credentials = this.credentialStore.getAll().map(sc => sc.credential);

    if (credentials.length === 0) {
      logger.warn('AI Agent: no credentials available for presentation');
      await this.didcomm.sendMessage(message.from, this.agentDid, {
        type: 'https://didcomm.org/present-proof/3.0/problem-report',
        thid: message.id,
        body: { code: 'no-credentials', comment: 'No credentials available' },
      });
      return;
    }

    const presentation = buildPresentation(
      this.agentDid,
      credentials,
      message.body?.challenge,
      message.body?.domain
    );

    await this.didcomm.sendMessage(message.from, this.agentDid, {
      type: 'https://didcomm.org/present-proof/3.0/presentation',
      thid: message.id,
      body: { verifiable_presentation: presentation },
    });

    logger.info('AI Agent: VP sent to orchestrator');
  }

  private async handleTrustPing(message: any): Promise<void> {
    if (!this.agentDid) throw new Error('Agent not initialized');
    if (message.body?.response_requested !== false) {
      await this.didcomm.sendMessage(message.from, this.agentDid, {
        type: 'https://didcomm.org/trust-ping/2.0/ping-response',
        thid: message.id,
        body: {},
      });
    }
  }

  close(): void {
    this.credentialStore.close();
  }
}

export async function createAIAgent(config: AIAgentConfig): Promise<AIAgent> {
  const agent = new AIAgent(config);
  await agent.initialize();
  return agent;
}
