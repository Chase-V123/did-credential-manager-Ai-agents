/**
 * Agent Registry Storage
 *
 * SQLite-based store for registered AI agents.
 *
 * @module storage/agent-store
 */

import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { logger } from '@did-edu/common';

export interface RegisteredAgent {
  agentDid: string;
  agentId: string;
  capabilities: string[];
  serviceEndpoint: string;
  credential: any;
  registeredAt: string;
}

export class AgentStore {
  private db: Database.Database;

  constructor(dbPath: string = './registry-agents.db') {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    this.db = new Database(dbPath);
    this.initialize();
    logger.info(`Agent store initialized at ${dbPath}`);
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        agentDid TEXT PRIMARY KEY,
        agentId TEXT NOT NULL,
        capabilities TEXT NOT NULL,
        serviceEndpoint TEXT NOT NULL,
        credential TEXT NOT NULL,
        registeredAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_agentId ON agents(agentId);
    `);
  }

  registerAgent(agent: Omit<RegisteredAgent, 'registeredAt'>): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO agents (agentDid, agentId, capabilities, serviceEndpoint, credential, registeredAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      agent.agentDid,
      agent.agentId,
      JSON.stringify(agent.capabilities),
      agent.serviceEndpoint,
      JSON.stringify(agent.credential),
      new Date().toISOString()
    );
    logger.info(`Agent registered: ${agent.agentDid} (${agent.agentId})`);
  }

  getAgent(agentDid: string): RegisteredAgent | null {
    const stmt = this.db.prepare('SELECT * FROM agents WHERE agentDid = ?');
    const row = stmt.get(agentDid) as any;
    return row ? this.rowToAgent(row) : null;
  }

  findByCapability(capability: string): RegisteredAgent[] {
    const stmt = this.db.prepare(
      "SELECT * FROM agents WHERE capabilities LIKE ? ORDER BY registeredAt ASC"
    );
    const rows = stmt.all(`%${capability}%`) as any[];
    return rows.map(r => this.rowToAgent(r));
  }

  getAllAgents(): RegisteredAgent[] {
    const stmt = this.db.prepare('SELECT * FROM agents ORDER BY registeredAt DESC');
    const rows = stmt.all() as any[];
    return rows.map(r => this.rowToAgent(r));
  }

  private rowToAgent(row: any): RegisteredAgent {
    return {
      agentDid: row.agentDid,
      agentId: row.agentId,
      capabilities: JSON.parse(row.capabilities),
      serviceEndpoint: row.serviceEndpoint,
      credential: JSON.parse(row.credential),
      registeredAt: row.registeredAt,
    };
  }

  close(): void {
    this.db.close();
  }
}
