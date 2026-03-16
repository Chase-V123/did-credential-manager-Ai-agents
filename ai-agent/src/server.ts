/**
 * AI Agent Server
 *
 * Express server for the AI Agent service.
 *
 * @module server
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createAIAgent } from './agent.js';
import { createAgentRoutes } from './routes/agent-routes.js';
import { logger } from '@did-edu/common';

dotenv.config();

const PORT = process.env.PORT || 5006;
// DIDComm service endpoint (embedded in DID document)
const SERVICE_ENDPOINT = process.env.SERVICE_ENDPOINT || `http://localhost:${PORT}/didcomm`;
// Base HTTP URL registered with the registry (used by orchestrator for task delegation)
const AGENT_BASE_URL = process.env.AGENT_BASE_URL || `http://localhost:${PORT}`;
const REGISTRY_URL = process.env.REGISTRY_URL || 'http://localhost:5004';
const AGENT_ID = process.env.AGENT_ID || 'summarization-agent-1';
const AGENT_CAPABILITIES = (process.env.AGENT_CAPABILITIES || 'summarization').split(',').map(s => s.trim());
const IDENTITY_PATH = process.env.IDENTITY_PATH || './data/ai-agent-identity.json';
const DB_PATH = process.env.DB_PATH || './data/ai-agent-credentials.db';

async function startServer() {
  try {
    logger.info('Starting AI agent server...');

    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.text({ type: 'application/didcomm-encrypted+json' }));

    const agent = await createAIAgent({
      serviceEndpoint: SERVICE_ENDPOINT,
      agentBaseUrl: AGENT_BASE_URL,
      agentId: AGENT_ID,
      capabilities: AGENT_CAPABILITIES,
      registryUrl: REGISTRY_URL,
      identityPath: IDENTITY_PATH,
      dbPath: DB_PATH,
    });

    app.use('/', createAgentRoutes(agent));

    app.get('/', (_req, res) => {
      res.json({
        service: 'DID AI Agent',
        did: agent.getDid(),
        capabilities: agent.getCapabilities(),
        endpoints: {
          did: 'GET /did',
          capabilities: 'GET /capabilities',
          health: 'GET /health',
          executeTask: 'POST /tasks/execute',
          didcomm: 'POST /didcomm',
        },
      });
    });

    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error', message: err.message });
    });

    const server = app.listen(PORT, () => {
      logger.info(`✅ AI Agent server running on port ${PORT}`);
      logger.info(`   DID: ${agent.getDid()}`);
      logger.info(`   Capabilities: ${agent.getCapabilities().join(', ')}`);
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
    logger.error('Failed to start AI agent server:', error);
    process.exit(1);
  }
}

startServer();
