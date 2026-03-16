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
   * POST /agents/register
   * Register an AI agent and receive an AgentIdentityCredential.
   *
   * Body: { agentDid, agentId, capabilities, serviceEndpoint }
   */
  router.post('/agents/register', async (req: Request, res: Response) => {
    try {
      const { agentDid, agentId, capabilities, serviceEndpoint } = req.body;

      if (!agentDid || !agentId || !capabilities || !serviceEndpoint) {
        res.status(400).json({ error: 'agentDid, agentId, capabilities, and serviceEndpoint are required' });
        return;
      }

      if (!Array.isArray(capabilities) || capabilities.length === 0) {
        res.status(400).json({ error: 'capabilities must be a non-empty array' });
        return;
      }

      const credential = await agent.issueAgentCredential({
        agentDid,
        agentId,
        capabilities,
        serviceEndpoint,
      });

      agent.getAgentStore().registerAgent({
        agentDid,
        agentId,
        capabilities,
        serviceEndpoint,
        credential,
      });

      logger.info(`Agent registered: ${agentId} (${agentDid})`);
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
