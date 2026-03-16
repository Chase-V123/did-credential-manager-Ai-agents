/**
 * Registry Routes
 *
 * HTTP endpoints for agent registration and capability discovery.
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
   * Register a trusted vendor and receive a VendorCredential.
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

      const credential = await agent.issueVendorCredential({ vendorDid, vendorId });
      agent.getAgentStore().registerVendor({ vendorDid, vendorId, credential });

      res.json({ credential, registryDid: agent.getDid() });
    } catch (error: any) {
      logger.error('Error registering vendor:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /vendors
   * List all trusted vendors.
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
   * Body: { agentDid, agentId, capabilities, serviceEndpoint, vendorCredential }
   */
  router.post('/agents/register', async (req: Request, res: Response) => {
    try {
      const { agentDid, agentId, capabilities, serviceEndpoint, vendorCredential } = req.body;

      if (!agentDid || !agentId || !capabilities || !serviceEndpoint) {
        res.status(400).json({ error: 'agentDid, agentId, capabilities, and serviceEndpoint are required' });
        return;
      }

      if (!Array.isArray(capabilities) || capabilities.length === 0) {
        res.status(400).json({ error: 'capabilities must be a non-empty array' });
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
        capabilities,
        serviceEndpoint,
      });

      agent.getAgentStore().registerAgent({
        agentDid,
        agentId,
        vendorDid,
        capabilities,
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
   * List agents, optionally filtered by capability.
   *
   * Query: ?capability=summarization
   */
  router.get('/agents', (req: Request, res: Response) => {
    try {
      const { capability } = req.query;

      const agents = capability
        ? agent.getAgentStore().findByCapability(capability as string)
        : agent.getAgentStore().getAllAgents();

      res.json({ agents });
    } catch (error: any) {
      logger.error('Error listing agents:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
