/**
 * Registry Server
 *
 * Express server for the Agent Registry Authority.
 *
 * @module server
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRegistryAgent } from './agent.js';
import { createRegistryRoutes } from './routes/registry-routes.js';
import { logger } from '@did-edu/common';

dotenv.config();

const PORT = process.env.PORT || 5004;
const SERVICE_ENDPOINT = process.env.SERVICE_ENDPOINT || `http://localhost:${PORT}/didcomm`;
const IDENTITY_PATH = process.env.IDENTITY_PATH || './data/registry-identity.json';
const DB_PATH = process.env.DB_PATH || './data/registry-agents.db';

async function startServer() {
  try {
    logger.info('Starting registry server...');

    const app = express();
    app.use(cors());
    app.use(express.json());

    const agent = await createRegistryAgent({
      serviceEndpoint: SERVICE_ENDPOINT,
      identityPath: IDENTITY_PATH,
      dbPath: DB_PATH,
    });

    app.use('/', createRegistryRoutes(agent));

    app.get('/', (_req, res) => {
      res.json({
        service: 'DID Agent Registry',
        did: agent.getDid(),
        endpoints: {
          did: 'GET /did',
          health: 'GET /health',
          register: 'POST /agents/register',
          list: 'GET /agents?capability=<cap>',
        },
      });
    });

    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error', message: err.message });
    });

    const server = app.listen(PORT, () => {
      logger.info(`✅ Registry server running on port ${PORT}`);
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

    process.on('SIGINT', () => { agent.close(); process.exit(0); });
    process.on('SIGTERM', () => { agent.close(); process.exit(0); });
  } catch (error) {
    logger.error('Failed to start registry server:', error);
    process.exit(1);
  }
}

startServer();
