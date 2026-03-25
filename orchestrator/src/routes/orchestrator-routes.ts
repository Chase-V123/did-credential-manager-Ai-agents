/**
 * Orchestrator Routes
 *
 * HTTP endpoints for the Orchestrator service.
 *
 * @module routes/orchestrator-routes
 */

import express, { Request, Response, Router } from 'express';
import { OrchestratorAgent } from '../agent.js';
import { logger } from '@did-edu/common';

export function createOrchestratorRoutes(agent: OrchestratorAgent): Router {
  const router = express.Router();

  /**
   * GET /did
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
      service: 'orchestrator',
      did: agent.getDid(),
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * POST /orchestrate
   * Main entry point: discover agent, verify identity, delegate task.
   *
   * Body: { task: string, summary: string }
   * Returns: { verified: true, agentDid: string, result: { output, model, executedAt } }
   */
  router.post('/orchestrate', async (req: Request, res: Response) => {
    try {
      const { task, summary } = req.body;

      if (!task || typeof task !== 'string') {
        res.status(400).json({ error: 'task string is required' });
        return;
      }

      if (!summary || typeof summary !== 'string') {
        res.status(400).json({ error: 'summary string is required' });
        return;
      }

      logger.info('Orchestration requested', { summary, taskLength: task.length });

      const result = await agent.orchestrate(task, summary);

      res.json(result);
    } catch (error: any) {
      logger.error('Orchestration failed:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /didcomm
   * Receive DIDComm messages (VPs from agents).
   */
  router.post('/didcomm', async (req: Request, res: Response) => {
    try {
      const packedMessage = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      await agent.handleMessage(packedMessage);
      res.status(200).json({ success: true });
    } catch (error: any) {
      logger.error('Error handling DIDComm message:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
