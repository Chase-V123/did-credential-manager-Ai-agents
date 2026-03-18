# Investor Demo Guide

Demonstrates a zero-trust AI agent orchestration system built on decentralized identity (DID) and Verifiable Credentials (W3C standards).

## What This Shows

An **Orchestrator** needs to delegate a task to an **AI Agent** — but first it must cryptographically verify the agent's identity. No API keys. No shared secrets. The agent proves who it is using a DID-backed Verifiable Presentation, challenged and verified in real time over DIDComm v2.1.

**Trust chain: Registry → Vendor → Agent**

| Service | Port | Role |
|---------|------|------|
| Registry | 5004 | Vets vendors and issues `VendorCredential`. Agents can only register via a trusted vendor. |
| AI Agent | 5006 | Registers as a vendor, then registers its agent using the `VendorCredential` as proof |
| Orchestrator | 5005 | Discovers agents, challenges identity, verifies vendor trust chain, delegates tasks |

---

## Prerequisites

- Docker Desktop running

---

## Step 1 — Start the Services

```powershell
docker compose up --build registry ai-agent orchestrator
```

Wait ~30 seconds. You'll see each service log its DID and confirm it's ready:

```
did-registry      | ✅ Registry server running on port 5004
did-ai-agent      | ✅ AI Agent server running on port 5006
did-orchestrator  | ✅ Orchestrator server running on port 5005
```

You'll also see the two-step registration play out automatically:

```
did-ai-agent | AI Agent: registering as vendor with registry at http://did-registry:5004
did-ai-agent | AI Agent: received VendorCredential
did-ai-agent | AI Agent: registering agent with registry
did-ai-agent | AI Agent: received and stored AgentIdentityCredential (vendorDid recorded in credential)
```

---

## Step 2 — Health Check

```powershell
Invoke-RestMethod http://localhost:5004/health | ConvertTo-Json
Invoke-RestMethod http://localhost:5006/health | ConvertTo-Json
Invoke-RestMethod http://localhost:5005/health | ConvertTo-Json
```

Each returns `"status": "healthy"` and its own DID.

---

## Step 3 — Show the Trust Chain

**Trusted vendors:**
```powershell
Invoke-RestMethod http://localhost:5004/vendors | ConvertTo-Json -Depth 3
```

**Registered agents (each linked to a vendor):**
```powershell
Invoke-RestMethod http://localhost:5004/agents | ConvertTo-Json -Depth 3
```

This shows `summarization-agent-1` registered with a `did:peer:4...` identity, its `VendorCredential` issued by the registry, and its `AgentIdentityCredential` recording the `vendorDid`.

---

## Step 4 — Run the Orchestration

```powershell
Invoke-RestMethod http://localhost:5005/orchestrate `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"task":"Summarize: Decentralized identity gives users control over their own data without relying on a central authority.","capability":"summarization"}' `
  | ConvertTo-Json -Depth 5
```

**Expected response:**
```json
{
  "verified": true,
  "agentDid": "did:peer:4...",
  "result": {
    "output": "[Mock LLM] Processed task: \"Summarize: Decentralized identity gives users control...\"",
    "model": "mock-llm-v1",
    "executedAt": "2026-03-16T..."
  }
}
```

**What just happened:**
1. Orchestrator queried the registry for a `summarization`-capable agent
2. Sent a one-time DIDComm challenge to the agent's cryptographic DID
3. Agent responded with a signed Verifiable Presentation
4. Orchestrator verified the VP, confirmed `vendorDid` is present (trust chain intact), and confirmed the `summarization` capability claim
5. Only then delegated the task — fully zero-trust, no API keys

---

## Step 5 (Bonus) — Identity Persistence

Restart the AI agent to show its DID survives:

```powershell
docker compose restart ai-agent
Start-Sleep -Seconds 10
Invoke-RestMethod http://localhost:5006/health | ConvertTo-Json
```

The `did` field is identical to before restart. Identity is persisted to a Docker volume — no re-registration needed.

---

## Tear Down

```powershell
docker compose down -v
```

---

## Key Points

- **Two-level trust chain** — the registry vets vendors; vendors vouch for their agents. An agent without a valid `vendorDid` in its credential is rejected before any task is delegated.
- **Zero-trust by default** — the orchestrator never blindly trusts an agent. Every interaction starts with a cryptographic challenge.
- **No central auth server** — identity is self-sovereign. The DID document is derived from the agent's own keys.
- **Standards-based** — W3C Verifiable Credentials, DIDComm v2.1, did:peer. Not proprietary.
- **Plug in any LLM** — swap `ai-agent/src/executor/task-executor.ts` to call Claude, GPT-4, or any model. The identity and verification layer is model-agnostic.
- **Production-ready patterns** — persistent identity across restarts, SQLite credential store, capability-based authorization.



##  Trust Chain: Registry → Vendor → Agent

  1. How the agent gets its DID

  On initialize() (ai-agent/src/agent.ts:155), the agent either loads a persistent DID from disk or generates a fresh
  did:peer via DIDComm.generateDid(). The DID and its secrets are saved to identityPath so they survive restarts.

  2. How the vendor gets registered with the registry

  This is currently open/unauthenticated — POST /vendors/register (registry/src/routes/registry-routes.ts:42) accepts
  any { vendorDid, vendorId } body and immediately issues a VendorCredential. There is no vetting step. The registry
  just:
  1. Signs a VendorCredential with its own DID as issuer
  2. Stores the vendor in SQLite via AgentStore.registerVendor()

  So right now, anyone who knows the registry URL can become a trusted vendor by self-declaring.

  3. How the agent gets trust from the vendor/registry

  AIAgent.registerWithRegistry() (ai-agent/src/agent.ts:184) runs a two-step protocol:

  Step 1 — Vendor registration:
  POST /vendors/register  { vendorDid: agentDid, vendorId: agentId }
  → receives VendorCredential (signed by registry)
  The agent registers itself as the vendor (its own DID is the vendor DID).

  Step 2 — Agent registration (requires VendorCredential):
  POST /agents/register  { agentDid, agentId, capabilities, serviceEndpoint, vendorCredential }
  → receives AgentIdentityCredential
  The registry checks (registry-routes.ts:101):
  - vendorCredential.credentialSubject.id must be a DID already in the trusted vendors table
  - If trusted → issues AgentIdentityCredential with vendorDid recorded in the credential subject

  The agent stores the AgentIdentityCredential in its local SQLite DB. Later, when the orchestrator challenges it, it
  presents this credential as a VP.

  ---
  Key gap

  The vendor registration step has no gatekeeping — it's effectively a self-service allowlist. In a real system you'd
  add some form of pre-authorization (API key, admin approval, signed invite token) before issuing a VendorCredential.