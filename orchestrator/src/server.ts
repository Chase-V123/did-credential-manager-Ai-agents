/**
 * Orchestrator Server
 *
 * Express server for the Orchestrator service.
 *
 * @module server
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createOrchestratorAgent } from './agent.js';
import { createOrchestratorRoutes } from './routes/orchestrator-routes.js';
import { logger } from '@did-edu/common';

dotenv.config();

const PORT = process.env.PORT || 5005;
const SERVICE_ENDPOINT = process.env.SERVICE_ENDPOINT || `http://localhost:${PORT}/didcomm`;
const REGISTRY_URL = process.env.REGISTRY_URL || 'http://localhost:5004';
const IDENTITY_PATH = process.env.IDENTITY_PATH || './data/orchestrator-identity.json';
const TASK_TIMEOUT_MS = parseInt(process.env.TASK_TIMEOUT_MS || '30000', 10);

async function startServer() {
  try {
    logger.info('Starting orchestrator server...');

    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.text({ type: 'application/didcomm-encrypted+json' }));

    const agent = await createOrchestratorAgent({
      serviceEndpoint: SERVICE_ENDPOINT,
      registryUrl: REGISTRY_URL,
      identityPath: IDENTITY_PATH,
      taskTimeoutMs: TASK_TIMEOUT_MS,
    });

    app.use('/', createOrchestratorRoutes(agent));

    app.get('/', (_req, res) => {
      res.json({
        service: 'DID Orchestrator',
        did: agent.getDid(),
        endpoints: {
          did: 'GET /did',
          health: 'GET /health',
          orchestrate: 'POST /orchestrate',
          didcomm: 'POST /didcomm',
        },
      });
    });

    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error', message: err.message });
    });

    const server = app.listen(PORT, () => {
      logger.info(`✅ Orchestrator server running on port ${PORT}`);
      logger.info(`   DID: ${agent.getDid()}`);
      logger.info(`   Health: http://localhost:${PORT}/health`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use. Run: npx kill-port ${PORT}`);
      } else {
        logger.error('Server error:', err);
      }
      process.exit(1);
    });

    process.on('SIGINT', () => process.exit(0));
    process.on('SIGTERM', () => process.exit(0));
  } catch (error) {
    logger.error('Failed to start orchestrator server:', error);
    process.exit(1);
  }
}

startServer();
