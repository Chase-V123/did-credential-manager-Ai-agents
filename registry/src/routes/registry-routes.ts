/**
 * Registry Routes
 *
 * HTTP endpoints for agent registration and agent discovery.
 *
 * @module routes/registry-routes
 */

import express, { Request, Response, Router } from 'express';
import { RegistryAgent } from '../agent.js';
import { logger } from '@did-edu/common';

export function createRegistryRoutes(agent: RegistryAgent): Router {
  const router = express.Router();

  /**
   * GET /did
   * Returns the registry's own DID.
   */
  router.get('/did', (_req: Request, res: Response) => {
    res.json({ did: agent.getDid() });
  });

  /**
   * GET /health
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'registry',
      did: agent.getDid(),
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * POST /vendors/register
   * Submit a vendor application for admin approval.
   * No credential is issued until an admin approves.
   *
   * Body: { vendorDid, vendorId }
   */
  router.post('/vendors/register', async (req: Request, res: Response) => {
    try {
      const { vendorDid, vendorId } = req.body;

      if (!vendorDid || !vendorId) {
        res.status(400).json({ error: 'vendorDid and vendorId are required' });
        return;
      }

      // Check if already approved
      if (agent.getAgentStore().isTrustedVendor(vendorDid)) {
        res.status(200).json({ status: 'already_approved', vendorDid });
        return;
      }

      const application = agent.getAgentStore().applyVendor(vendorDid, vendorId);
      res.status(202).json({ status: application.status, vendorDid, message: 'Vendor application submitted. Awaiting admin approval.' });
    } catch (error: any) {
      logger.error('Error submitting vendor application:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /vendors/applications
   * List vendor applications, optionally filtered by status.
   *
   * Query: ?status=pending
   */
  router.get('/vendors/applications', (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      const applications = agent.getAgentStore().getAllApplications(status as string | undefined);
      res.json({ applications });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /vendors/status/:vendorDid
   * Check a vendor's application status. If approved, includes the credential.
   * This is polled by AI agents waiting for their vendor to be approved.
   */
  router.get('/vendors/status/:vendorDid', (req: Request, res: Response) => {
    try {
      const { vendorDid } = req.params;
      const application = agent.getAgentStore().getVendorApplication(vendorDid);

      if (!application) {
        res.status(404).json({ status: 'not_found' });
        return;
      }

      if (application.status === 'approved') {
        // Retrieve the credential from the vendors table
        const vendors = agent.getAgentStore().getAllVendors();
        const vendor = vendors.find(v => v.vendorDid === vendorDid);
        res.json({ status: 'approved', credential: vendor?.credential || null });
      } else {
        res.json({ status: application.status });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /vendors/approve
   * Admin approves a pending vendor application. Issues VendorCredential.
   *
   * Body: { vendorDid }
   */
  router.post('/vendors/approve', async (req: Request, res: Response) => {
    try {
      const { vendorDid } = req.body;

      if (!vendorDid) {
        res.status(400).json({ error: 'vendorDid is required' });
        return;
      }

      const application = agent.getAgentStore().getVendorApplication(vendorDid);
      if (!application) {
        res.status(404).json({ error: 'No vendor application found for this DID' });
        return;
      }

      if (application.status === 'approved') {
        res.status(200).json({ status: 'already_approved' });
        return;
      }

      if (application.status === 'rejected') {
        res.status(400).json({ error: 'This vendor application has been rejected' });
        return;
      }

      // Issue credential and register as trusted vendor
      const credential = await agent.issueVendorCredential({ vendorDid, vendorId: application.vendorId });
      agent.getAgentStore().approveVendor(vendorDid);
      agent.getAgentStore().registerVendor({ vendorDid, vendorId: application.vendorId, credential });

      logger.info(`Vendor approved and credential issued: ${application.vendorId} (${vendorDid})`);
      res.json({ status: 'approved', credential, registryDid: agent.getDid() });
    } catch (error: any) {
      logger.error('Error approving vendor:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /vendors/reject
   * Admin rejects a pending vendor application.
   *
   * Body: { vendorDid }
   */
  router.post('/vendors/reject', async (req: Request, res: Response) => {
    try {
      const { vendorDid } = req.body;

      if (!vendorDid) {
        res.status(400).json({ error: 'vendorDid is required' });
        return;
      }

      const application = agent.getAgentStore().getVendorApplication(vendorDid);
      if (!application) {
        res.status(404).json({ error: 'No vendor application found for this DID' });
        return;
      }

      agent.getAgentStore().rejectVendor(vendorDid);
      logger.info(`Vendor rejected: ${vendorDid}`);
      res.json({ status: 'rejected' });
    } catch (error: any) {
      logger.error('Error rejecting vendor:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /vendors
   * List all trusted (approved) vendors.
   */
  router.get('/vendors', (_req: Request, res: Response) => {
    try {
      const vendors = agent.getAgentStore().getAllVendors();
      res.json({ vendors });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /agents/register
   * Register an AI agent and receive an AgentIdentityCredential.
   * Requires a valid VendorCredential — only agents from trusted vendors are accepted.
   *
   * Body: { agentDid, agentId, summary, callingConvention, serviceEndpoint, vendorCredential }
   */
  router.post('/agents/register', async (req: Request, res: Response) => {
    try {
      const { agentDid, agentId, summary, callingConvention, serviceEndpoint, vendorCredential } = req.body;

      if (!agentDid || !agentId || !summary || !callingConvention || !serviceEndpoint) {
        res.status(400).json({ error: 'agentDid, agentId, summary, callingConvention, and serviceEndpoint are required' });
        return;
      }

      if (typeof summary !== 'string' || summary.trim().length === 0) {
        res.status(400).json({ error: 'summary must be a non-empty string' });
        return;
      }

      if (typeof callingConvention !== 'string' || callingConvention.trim().length === 0) {
        res.status(400).json({ error: 'callingConvention must be a non-empty string' });
        return;
      }

      if (!vendorCredential) {
        res.status(400).json({ error: 'vendorCredential is required — only agents from trusted vendors are accepted' });
        return;
      }

      const vendorDid = vendorCredential.credentialSubject?.id;
      if (!vendorDid || !agent.getAgentStore().isTrustedVendor(vendorDid)) {
        res.status(403).json({ error: `Vendor ${vendorDid} is not registered as a trusted vendor` });
        return;
      }

      const credential = await agent.issueAgentCredential({
        agentDid,
        agentId,
        vendorDid,
        summary: summary.trim(),
        callingConvention: callingConvention.trim(),
        serviceEndpoint,
      });

      agent.getAgentStore().registerAgent({
        agentDid,
        agentId,
        vendorDid,
        summary: summary.trim(),
        callingConvention: callingConvention.trim(),
        serviceEndpoint,
        credential,
      });

      logger.info(`Agent registered: ${agentId} (${agentDid}) via vendor ${vendorDid}`);
      res.json({ credential, registryDid: agent.getDid() });
    } catch (error: any) {
      logger.error('Error registering agent:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /agents
   * List agents, optionally filtered by summary text.
   *
   * Query: ?summary=summarization
   */
  router.get('/agents', (req: Request, res: Response) => {
    try {
      const { summary } = req.query;

      const agents = summary
        ? agent.getAgentStore().findBySummary(summary as string)
        : agent.getAgentStore().getAllAgents();

      res.json({ agents });
    } catch (error: any) {
      logger.error('Error listing agents:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
