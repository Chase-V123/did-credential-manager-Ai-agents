#!/usr/bin/env bash
set -e
BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Clean previous run state
rm -rf "$BASE/registry/data" "$BASE/ai-agent/data" "$BASE/orchestrator/data" 2>/dev/null || true

NODE_FLAGS="--experimental-wasm-modules --import tsx/esm"

# Start services
(cd "$BASE/registry" && node $NODE_FLAGS src/server.ts 2>&1 | sed 's/^/[registry] /') &
REGISTRY_PID=$!
sleep 5

(cd "$BASE/ai-agent" && REGISTRY_URL=http://localhost:5004 node $NODE_FLAGS src/server.ts 2>&1 | sed 's/^/[ai-agent] /') &
AGENT_PID=$!
sleep 5

(cd "$BASE/orchestrator" && REGISTRY_URL=http://localhost:5004 node $NODE_FLAGS src/server.ts 2>&1 | sed 's/^/[orchestrator] /') &
ORCH_PID=$!
sleep 3

cleanup() {
  kill $REGISTRY_PID $AGENT_PID $ORCH_PID 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT

echo ""
echo "=== HEALTH CHECKS ==="
curl -sf http://localhost:5004/health | python3 -c "import sys,json; d=json.load(sys.stdin); print('  registry:', d['status'])"
curl -sf http://localhost:5006/health | python3 -c "import sys,json; d=json.load(sys.stdin); print('  ai-agent:', d['status'], '| caps:', d['capabilities'])"
curl -sf http://localhost:5005/health | python3 -c "import sys,json; d=json.load(sys.stdin); print('  orchestrator:', d['status'])"

echo ""
echo "=== REGISTERED AGENTS ==="
curl -sf "http://localhost:5004/agents" | python3 -c "
import sys,json
agents = json.load(sys.stdin).get('agents', [])
for a in agents:
    print(f'  - {a[\"agentId\"]} {a[\"capabilities\"]}')
if not agents:
    print('  (none)')
"

echo ""
echo "=== POST /orchestrate ==="
curl -sf -X POST http://localhost:5005/orchestrate \
  -H "Content-Type: application/json" \
  -d '{"task":"Summarize: The quick brown fox jumps over the lazy dog","capability":"summarization"}' \
  | python3 -m json.tool
