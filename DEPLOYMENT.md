# Deploying Agents for Nanda Registry

## Overview
Your DID Credential Manager has two AI agents that can be registered with the Nanda registry:
1. **DID Summarization Agent** - Summarizes text and answers research questions
2. **DID Task Orchestrator** - Discovers and delegates tasks to agents

## Deployment Steps

### Option 1: Quick Testing with ngrok (Local Development)
If you want to test registration quickly:

1. Install ngrok: `brew install ngrok` (on Mac)
2. Start your services: `docker-compose up`
3. Expose each service:
   ```bash
   ngrok http 5006  # AI Agent
   ngrok http 5005  # Orchestrator
   ```
4. Note the ngrok URLs (e.g., `https://abc123.ngrok.io`)
5. Run registration: `./register-agents.sh https://abc123.ngrok.io`

### Option 2: Production Deployment
For production, deploy to a cloud platform:

1. **Railway** (Recommended for Docker apps):
   - Sign up at railway.app
   - Connect your GitHub repo
   - Railway will auto-detect docker-compose.yml
   - Get the domain (e.g., `yourapp.railway.app`)

2. **Render**:
   - Sign up at render.com
   - Create a new service for each container
   - Use Docker images from your repo

3. **Google Cloud Run**:
   - Use `gcloud run deploy` with your Docker images

### Registration
Once deployed with public URLs:

```bash
./register-agents.sh https://your-domain.com
```

The script will register both agents with the Nanda registry.

## Agent Details

**DID Summarization Agent:**
- Endpoint: `/ai-agent`
- Capabilities: summarization, text-analysis, research-questions

**DID Task Orchestrator:**
- Endpoint: `/orchestrator`
- Capabilities: orchestration, task-delegation, agent-discovery, didcomm-verification

## Notes
- Ensure your deployed services are accessible via HTTPS
- The agents use DIDComm for secure communication
- The orchestrator can discover and verify other agents via the Nanda registry