/**
 * DID Education Toolkit - Common Package
 * 
 * Shared utilities, DIDComm v2.1 implementation, and types
 * 
 * @module @did-edu/common
 */

// DIDComm exports
export {
  DIDComm,
  DIDCommMessage,
  DID,
  generateDid,
  generateDidForMediator,
  DIDPeerResolver,
  DIDPeer4Resolver,
  PrefixResolver,
  EphemeralSecretsResolver,
  SecretsManager,
} from './didcomm/wrapper.js';

export { default as DIDPeer } from './didcomm/peer2.js';
export * as DIDPeer4 from './didcomm/peer4.js';

// Types exports
export * from './types/credentials.js';
export * from './types/messages.js';

// Utils exports
export { default as logger, Logger, LogLevel, LogRecord, MessageRecord } from './utils/logger.js';
export { saveIdentity, loadIdentity, IdentityRecord } from './utils/identity-store.js';

// Protocol exports
export * from './protocols/index.js';

// Messaging exports
export * from './messaging/index.js';

// Re-export commonly used types from didcomm library
export type {
  DIDResolver,
  DIDDoc,
  Secret,
  Message,
  UnpackMetadata,
  PackEncryptedMetadata,
  MessagingServiceMetadata,
  IMessage,
  Service,
} from 'didcomm';

