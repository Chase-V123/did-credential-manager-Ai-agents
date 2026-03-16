/**
 * Registry Agent
 *
 * Acts as the authority/issuer for AgentIdentityCredentials.
 * Wraps the IssuerAgent pattern with persistent identity.
 *
 * @module agent
 */

import { createAgent, IResolver } from '@veramo/core';
import { CredentialPlugin, ICredentialIssuer } from '@veramo/credential-w3c';
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
import { AgentStore } from './storage/agent-store.js';

export interface RegistryAgentConfig {
  serviceEndpoint: string;
  identityPath: string;
  dbPath?: string;
}

export class RegistryAgent {
  private veramoAgent: any;
  private didcomm: DIDComm;
  private secretsResolver: EphemeralSecretsResolver;
  private registryDid: string | null = null;
  private agentStore: AgentStore;
  private identityPath: string;
  private serviceEndpoint: string;

  constructor(config: RegistryAgentConfig) {
    this.serviceEndpoint = config.serviceEndpoint;
    this.identityPath = config.identityPath;
    this.secretsResolver = new EphemeralSecretsResolver();
    this.didcomm = new DIDComm(this.secretsResolver);
    this.agentStore = new AgentStore(config.dbPath);

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

    this.veramoAgent = createAgent<IResolver & ICredentialIssuer>({
      plugins: [
        new DIDResolverPlugin({ resolver: didResolver }),
        new CredentialPlugin(),
      ],
    });
  }

  async initialize(): Promise<string> {
    const stored = loadIdentity(this.identityPath);
    if (stored) {
      this.registryDid = stored.did;
      this.didcomm.storeSecrets(stored.secrets);
      logger.info(`Registry: loaded existing DID: ${this.registryDid}`);
    } else {
      this.registryDid = await this.didcomm.generateDid(this.serviceEndpoint);
      saveIdentity(this.identityPath, this.registryDid, this.secretsResolver.getAllSecrets());
      logger.info(`Registry: generated new DID: ${this.registryDid}`);
    }
    return this.registryDid!;
  }

  getDid(): string {
    if (!this.registryDid) throw new Error('Registry agent not initialized');
    return this.registryDid;
  }

  getAgentStore(): AgentStore {
    return this.agentStore;
  }

  /**
   * Issue an AgentIdentityCredential for a registering AI agent.
   */
  async issueAgentCredential(params: {
    agentDid: string;
    agentId: string;
    capabilities: string[];
    serviceEndpoint: string;
  }): Promise<any> {
    if (!this.registryDid) throw new Error('Registry agent not initialized');

    const credential = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', 'AgentIdentityCredential'],
      issuer: { id: this.registryDid },
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: params.agentDid,
        agentId: params.agentId,
        capabilities: params.capabilities,
        serviceEndpoint: params.serviceEndpoint,
      },
    };

    const signed = {
      ...credential,
      proof: {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        proofPurpose: 'assertionMethod',
        verificationMethod: `${this.registryDid}#key-1`,
      },
    };

    logger.info('Issued AgentIdentityCredential', {
      subject: params.agentDid,
      capabilities: params.capabilities,
    });

    return signed;
  }

  close(): void {
    this.agentStore.close();
  }
}

export async function createRegistryAgent(config: RegistryAgentConfig): Promise<RegistryAgent> {
  const agent = new RegistryAgent(config);
  await agent.initialize();
  return agent;
}
