/**
 * Identity Persistence Store
 *
 * Saves and loads DID + secrets to/from disk for stable agent identity across restarts.
 *
 * @module utils/identity-store
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import type { Secret } from 'didcomm';

export interface IdentityRecord {
  did: string;
  secrets: Secret[];
}

/**
 * Save a DID and its associated secrets to disk.
 */
export function saveIdentity(
  filePath: string,
  did: string,
  secrets: Record<string, Secret>
): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const record: IdentityRecord = { did, secrets: Object.values(secrets) };
  writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf8');
}

/**
 * Load a DID and its secrets from disk.
 * Returns null if the file does not exist.
 */
export function loadIdentity(filePath: string): IdentityRecord | null {
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as IdentityRecord;
  } catch {
    return null;
  }
}
