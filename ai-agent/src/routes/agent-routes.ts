/**
 * AI Agent Routes
 *
 * HTTP endpoints for the AI Agent service.
 *
 * @module routes/agent-routes
 */

import express, { Request, Response, Router } from 'express';
import { AIAgent } from '../agent.js';
import { executeTask } from '../executor/task-executor.js';
import { logger } from '@did-edu/common';

export function createAgentRoutes(agent: AIAgent): Router {
  const router = express.Router();

  /**
   * GET /did
   */
  router.get('/did', (_req: Request, res: Response) => {
    res.json({ did: agent.getDid() });
  });

  /**
   * GET /capabilities
   */
  router.get('/capabilities', (_req: Request, res: Response) => {
    res.json({ capabilities: agent.getCapabilities() });
  });

  /**
   * GET /health
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'ai-agent',
      did: agent.getDid(),
      capabilities: agent.getCapabilities(),
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * POST /tasks/execute
   * Execute a delegated task (called by orchestrator after verification).
   *
   * Body: { task: string, requestedBy?: string }
   */
  router.post('/tasks/execute', async (req: Request, res: Response) => {
    try {
      const { task, requestedBy } = req.body;

      if (!task || typeof task !== 'string') {
        res.status(400).json({ error: 'task string is required' });
        return;
      }

      logger.info('Executing task', { requestedBy, taskLength: task.length });

      const result = await executeTask(task);

      res.json({
        agentDid: agent.getDid(),
        result,
      });
    } catch (error: any) {
      logger.error('Error executing task:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /didcomm
   * Receive DIDComm messages (presentation requests from orchestrator).
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
