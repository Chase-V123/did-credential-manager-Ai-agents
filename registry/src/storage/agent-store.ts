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

export interface RegisteredVendor {
  vendorDid: string;
  vendorId: string;
  credential: any;
  registeredAt: string;
}

export interface VendorApplication {
  vendorDid: string;
  vendorId: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  reviewedAt: string | null;
}

export interface RegisteredAgent {
  agentDid: string;
  agentId: string;
  vendorDid: string;
  summary: string;
  callingConvention: string;
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
      CREATE TABLE IF NOT EXISTS vendors (
        vendorDid TEXT PRIMARY KEY,
        vendorId TEXT NOT NULL,
        credential TEXT NOT NULL,
        registeredAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS agents (
        agentDid TEXT PRIMARY KEY,
        agentId TEXT NOT NULL,
        vendorDid TEXT NOT NULL,
        summary TEXT NOT NULL,
        callingConvention TEXT NOT NULL,
        serviceEndpoint TEXT NOT NULL,
        credential TEXT NOT NULL,
        registeredAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_agentId ON agents(agentId);

      CREATE TABLE IF NOT EXISTS vendor_applications (
        vendorDid TEXT PRIMARY KEY,
        vendorId TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        appliedAt TEXT NOT NULL,
        reviewedAt TEXT
      );
    `);

    const columns = this.db.prepare("PRAGMA table_info('agents')").all() as Array<{ name: string }>;
    const columnNames = new Set(columns.map(column => column.name));

    if (!columnNames.has('summary')) {
      this.db.exec(`ALTER TABLE agents ADD COLUMN summary TEXT NOT NULL DEFAULT ''`);
    }

    if (!columnNames.has('callingConvention')) {
      this.db.exec(`ALTER TABLE agents ADD COLUMN callingConvention TEXT NOT NULL DEFAULT 'http'`);
    }
  }

  registerVendor(vendor: Omit<RegisteredVendor, 'registeredAt'>): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO vendors (vendorDid, vendorId, credential, registeredAt)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(vendor.vendorDid, vendor.vendorId, JSON.stringify(vendor.credential), new Date().toISOString());
    logger.info(`Vendor registered: ${vendor.vendorId} (${vendor.vendorDid})`);
  }

  isTrustedVendor(vendorDid: string): boolean {
    const row = this.db.prepare('SELECT vendorDid FROM vendors WHERE vendorDid = ?').get(vendorDid);
    return !!row;
  }

  getAllVendors(): RegisteredVendor[] {
    const rows = this.db.prepare('SELECT * FROM vendors ORDER BY registeredAt DESC').all() as any[];
    return rows.map(r => ({
      vendorDid: r.vendorDid,
      vendorId: r.vendorId,
      credential: JSON.parse(r.credential),
      registeredAt: r.registeredAt,
    }));
  }

  registerAgent(agent: Omit<RegisteredAgent, 'registeredAt'>): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO agents (agentDid, agentId, vendorDid, summary, callingConvention, serviceEndpoint, credential, registeredAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      agent.agentDid,
      agent.agentId,
      agent.vendorDid,
      agent.summary,
      agent.callingConvention,
      agent.serviceEndpoint,
      JSON.stringify(agent.credential),
      new Date().toISOString()
    );
    logger.info(`Agent registered: ${agent.agentDid} (${agent.agentId}) via vendor ${agent.vendorDid}`);
  }

  getAgent(agentDid: string): RegisteredAgent | null {
    const stmt = this.db.prepare('SELECT * FROM agents WHERE agentDid = ?');
    const row = stmt.get(agentDid) as any;
    return row ? this.rowToAgent(row) : null;
  }

  findBySummary(summary: string): RegisteredAgent[] {
    const stmt = this.db.prepare(
      "SELECT * FROM agents WHERE summary LIKE ? ORDER BY registeredAt ASC"
    );
    const rows = stmt.all(`%${summary}%`) as any[];
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
      vendorDid: row.vendorDid,
      summary: row.summary,
      callingConvention: row.callingConvention,
      serviceEndpoint: row.serviceEndpoint,
      credential: JSON.parse(row.credential),
      registeredAt: row.registeredAt,
    };
  }

  // ---------------------------------------------------------------------------
  // Vendor application methods
  // ---------------------------------------------------------------------------

  applyVendor(vendorDid: string, vendorId: string): VendorApplication {
    const existing = this.getVendorApplication(vendorDid);
    if (existing) return existing;

    const application: VendorApplication = {
      vendorDid,
      vendorId,
      status: 'pending',
      appliedAt: new Date().toISOString(),
      reviewedAt: null,
    };

    const stmt = this.db.prepare(`
      INSERT INTO vendor_applications (vendorDid, vendorId, status, appliedAt, reviewedAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(application.vendorDid, application.vendorId, application.status, application.appliedAt, application.reviewedAt);
    logger.info(`Vendor application submitted: ${vendorId} (${vendorDid})`);
    return application;
  }

  getVendorApplication(vendorDid: string): VendorApplication | null {
    const row = this.db.prepare('SELECT * FROM vendor_applications WHERE vendorDid = ?').get(vendorDid) as any;
    return row ? { ...row, reviewedAt: row.reviewedAt || null } : null;
  }

  getPendingApplications(): VendorApplication[] {
    const rows = this.db.prepare("SELECT * FROM vendor_applications WHERE status = 'pending' ORDER BY appliedAt DESC").all() as any[];
    return rows.map(r => ({ ...r, reviewedAt: r.reviewedAt || null }));
  }

  getAllApplications(status?: string): VendorApplication[] {
    if (status) {
      const rows = this.db.prepare('SELECT * FROM vendor_applications WHERE status = ? ORDER BY appliedAt DESC').all(status) as any[];
      return rows.map(r => ({ ...r, reviewedAt: r.reviewedAt || null }));
    }
    const rows = this.db.prepare('SELECT * FROM vendor_applications ORDER BY appliedAt DESC').all() as any[];
    return rows.map(r => ({ ...r, reviewedAt: r.reviewedAt || null }));
  }

  approveVendor(vendorDid: string): void {
    const stmt = this.db.prepare(`
      UPDATE vendor_applications SET status = 'approved', reviewedAt = ? WHERE vendorDid = ?
    `);
    stmt.run(new Date().toISOString(), vendorDid);
    logger.info(`Vendor approved: ${vendorDid}`);
  }

  rejectVendor(vendorDid: string): void {
    const stmt = this.db.prepare(`
      UPDATE vendor_applications SET status = 'rejected', reviewedAt = ? WHERE vendorDid = ?
    `);
    stmt.run(new Date().toISOString(), vendorDid);
    logger.info(`Vendor rejected: ${vendorDid}`);
  }

  close(): void {
    this.db.close();
  }
}
