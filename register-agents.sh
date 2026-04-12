#!/bin/bash

# Script to register DID Credential Manager agents with Nanda registry
# Usage: ./register-agents.sh <base-url>
# Example: ./register-agents.sh https://myagents.projectnanda.org

if [ $# -eq 0 ]; then
    echo "Usage: $0 <base-url>"
    echo "Example: $0 https://myagents.projectnanda.org"
    exit 1
fi

BASE_URL=$1

echo "Registering agents with base URL: $BASE_URL"

# Register AI Agent (Summarization)
echo "Registering AI Summarization Agent..."
curl -X POST https://nest.projectnanda.org/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "did-summarization-agent",
    "name": "DID Summarization Agent",
    "endpoint": "'$BASE_URL'/ai-agent",
    "description": "AI agent with DID-backed identity that summarizes text and answers concise research questions over HTTP",
    "capabilities": ["summarization", "text-analysis", "research-questions"],
    "agent_type": "skill"
  }'

echo -e "\n"

# Register Orchestrator
echo "Registering DID Task Orchestrator..."
curl -X POST https://nest.projectnanda.org/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "did-task-orchestrator",
    "name": "DID Task Orchestrator",
    "endpoint": "'$BASE_URL'/orchestrator",
    "description": "Orchestrator that discovers agents via registry, challenges identity via DIDComm, and delegates tasks",
    "capabilities": ["orchestration", "task-delegation", "agent-discovery", "didcomm-verification"],
    "agent_type": "orchestrator"
  }'

echo -e "\nRegistration complete!"