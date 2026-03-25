# Ollama Orchestration Tutorial

This tutorial walks through the updated agent flow using:

- `summary`
- `callingConvention`
- the registry
- `ai-agent`
- the orchestrator
- a local Ollama model such as `llama3.1:8b`

## What Changed

The old agent metadata field `capabilities` has been replaced by:

- `summary`: a human-readable description of what the agent does
- `callingConvention`: how the orchestrator should invoke the agent

Example:

```json
{
  "summary": "Summarizes text and answers concise research questions over HTTP.",
  "callingConvention": "http"
}
```

The orchestrator now:

1. Queries the registry with `GET /agents?summary=...`
2. Challenges the selected agent over DIDComm
3. Verifies the presented `AgentIdentityCredential`
4. Checks the credentialed `summary` and `callingConvention`
5. Delegates the task using the declared calling convention

## Prerequisites

- Node.js and npm installed
- Ollama installed locally
- `llama3.1:8b` pulled in Ollama

Check Ollama:

```powershell
Invoke-RestMethod http://127.0.0.1:11434/api/tags
```

You should see `llama3.1:8b` in the model list.

## Install And Build

From the repo root:

```powershell
npm install
npm run build -w common
npm run build -w registry
npm run build -w ai-agent
npm run build -w orchestrator
```

## Start The Services

Open three terminals.

### 1. Start the registry

```powershell
cd registry
$env:PORT="5004"
$env:SERVICE_ENDPOINT="http://localhost:5004/didcomm"
node --experimental-wasm-modules dist/server.js
```

### 2. Start the AI agent with Ollama

```powershell
cd ai-agent
$env:PORT="5006"
$env:SERVICE_ENDPOINT="http://localhost:5006/didcomm"
$env:AGENT_BASE_URL="http://localhost:5006"
$env:REGISTRY_URL="http://localhost:5004"
$env:AGENT_ID="summary-agent-1"
$env:AGENT_SUMMARY="Summarizes text and answers concise research questions over HTTP."
$env:AGENT_CALLING_CONVENTION="http"
$env:LLM_PROVIDER="ollama"
$env:OLLAMA_MODEL="llama3.1:8b"
$env:OLLAMA_BASE_URL="http://127.0.0.1:11434"
node --experimental-wasm-modules dist/server.js
```

What this does:

- creates or loads the agent DID
- registers the agent as a trusted vendor
- registers the agent with the registry
- stores an `AgentIdentityCredential` containing `summary` and `callingConvention`

### 3. Start the orchestrator with Ollama enabled

The orchestrator can also use the same local model for inline execution paths.

```powershell
cd orchestrator
$env:PORT="5005"
$env:SERVICE_ENDPOINT="http://localhost:5005/didcomm"
$env:REGISTRY_URL="http://localhost:5004"
$env:LLM_PROVIDER="ollama"
$env:OLLAMA_MODEL="llama3.1:8b"
$env:OLLAMA_BASE_URL="http://127.0.0.1:11434"
node --experimental-wasm-modules dist/server.js
```

## Health Checks

```powershell
Invoke-RestMethod http://localhost:5004/health
Invoke-RestMethod http://localhost:5006/health
Invoke-RestMethod http://localhost:5005/health
```

The AI agent health response should include:

```json
{
  "summary": "Summarizes text and answers concise research questions over HTTP.",
  "callingConvention": "http"
}
```

## Discover The Registered Agent

```powershell
Invoke-RestMethod "http://localhost:5004/agents?summary=Summarizes text"
```

You should get back a registered agent record containing:

- `summary`
- `callingConvention`
- `serviceEndpoint`

## Run The Orchestration Flow

Send a task to the orchestrator:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://localhost:5005/orchestrate `
  -ContentType "application/json" `
  -Body '{"task":"Summarize this in one sentence: Verifiable credentials let issuers make signed claims that holders can present selectively to verifiers.","summary":"Summarizes text"}'
```

Expected result shape:

```json
{
  "verified": true,
  "agentDid": "did:peer:...",
  "result": {
    "output": "Verifiable credentials enable issuers to create digitally signed, claim-based documents that holders can control and share with authorized verifiers as needed.",
    "model": "llama3.1:8b",
    "executedAt": "2026-03-25T15:07:57.245Z"
  }
}
```

## What Happens Internally

When you call `POST /orchestrate`:

1. The orchestrator searches the registry using `summary`
2. The registry returns the best matching registered agent
3. The orchestrator sends a DIDComm presentation request with a challenge
4. The AI agent builds a verifiable presentation containing its latest `AgentIdentityCredential`
5. The orchestrator verifies the challenge and trust chain
6. The orchestrator checks that the agent credential's `summary` matches the requested summary
7. The orchestrator reads `callingConvention`
8. For `http`, the orchestrator calls `POST /tasks/execute` on the agent
9. The AI agent sends the task to Ollama at `http://127.0.0.1:11434`
10. The model response is returned to the orchestrator and then to the client

## Calling Convention Notes

Current supported values are:

- `http`: delegate to the agent's `/tasks/execute` endpoint
- `openai-chat` or `local-chat`: execute inline in the orchestrator fallback executor

For the normal remote-agent flow, use `http`.

## Troubleshooting

### Ollama is not reachable

Check:

```powershell
Invoke-RestMethod http://127.0.0.1:11434/api/tags
```

If that fails, start Ollama first.

### The model is missing

Pull it:

```powershell
ollama pull llama3.1:8b
```

### The agent does not show up in the registry

Check the AI agent logs for registration errors. The agent should:

- register as a vendor first
- then register as an agent

### Orchestration times out

This usually means one of these:

- the DIDComm endpoint is wrong
- the agent never answered the presentation request
- the stored credential is stale

Restarting the AI agent with a clean identity/database is the quickest way to test a fresh registration.

## Relevant Files

- `registry/src/routes/registry-routes.ts`
- `registry/src/storage/agent-store.ts`
- `registry/src/agent.ts`
- `ai-agent/src/agent.ts`
- `ai-agent/src/executor/chat-agent.ts`
- `ai-agent/src/executor/task-executor.ts`
- `orchestrator/src/agent.ts`
- `orchestrator/src/executor/chat-agent.ts`
- `orchestrator/src/executor/task-executor.ts`

