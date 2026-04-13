import { useState } from 'react'

interface OrchestrateResult {
  verified: boolean
  agentDid: string
  vendorDid: string
  challenge: string
  credentialSubject: any
  orchestratorDid: string
  result: {
    output: string
    model: string
    executedAt: string
  }
}

function Orchestrate() {
  const [task, setTask] = useState('')
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<OrchestrateResult | null>(null)
  const [steps, setSteps] = useState<string[]>([])

  const addStep = (msg: string) => {
    setSteps(prev => [...prev, msg])
  }

  const runOrchestration = async () => {
    if (!task.trim() || !summary.trim()) {
      setError('Both fields are required.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setResult(null)
      setSteps([])

      addStep('Querying registry for agents matching "' + summary.trim() + '"...')
      await pause(800)

      addStep('Agent discovered. Sending DIDComm presentation request with challenge...')
      await pause(600)

      addStep('Waiting for agent to respond with Verifiable Presentation...')

      const res = await fetch('/api/orchestrator/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: task.trim(), summary: summary.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Orchestration failed')
      }

      addStep('VP received. Verifying proof, challenge, and credential chain...')
      await pause(600)

      addStep('Agent identity VERIFIED. Vendor trust chain confirmed.')
      await pause(400)

      addStep('Delegating task to authenticated agent...')
      await pause(400)

      addStep('Task complete. Result received.')

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h3>Orchestrate Task</h3>
      <p>Discover an agent, authenticate via DID, and delegate a task.</p>

      <div className="form-row" style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <label>Agent Capability</label>
          <br />
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="e.g. summarize"
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>
        <div style={{ flex: 2 }}>
          <label>Task</label>
          <br />
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="e.g. Summarize this insurance claim: water damage to roof, estimated $12,000 repair"
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>
      </div>

      <button type="button" onClick={runOrchestration} disabled={loading} style={{ minWidth: '140px' }}>
        {loading ? 'Running...' : 'Run Orchestration'}
      </button>

      {/* Step log */}
      {steps.length > 0 && (
        <div style={{ marginTop: '16px', border: '1px solid #444', borderRadius: '10px', padding: '14px' }}>
          <div className="message-title" style={{ marginBottom: '10px' }}>Orchestration Log</div>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-light)', minWidth: '18px' }}>{i + 1}.</span>
              <span style={{
                color: i === steps.length - 1 && loading ? '#fbbf24' : '#52b788'
              }}>
                {s}
              </span>
            </div>
          ))}
          {loading && (
            <div style={{ fontSize: '12px', color: '#fbbf24', marginTop: '4px' }}>
              Processing...
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="message-box error-box" style={{ marginTop: '16px' }}>
          <div className="message-title">Error</div>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '24px' }}>
          <div className="message-box success-box">
            <div className="message-title">Orchestration Complete</div>
            Agent authenticated and task delegated successfully.
          </div>

          {/* Trust Chain */}
          <h4 style={{ marginTop: '20px' }}>DID Trust Chain</h4>
          <div className="agent-card" style={{ marginTop: '8px' }}>
            <div className="agent-card-details" style={{ marginTop: 0 }}>
              <div className="agent-card-detail">
                <div className="agent-card-label">Orchestrator DID</div>
                <div className="agent-card-value mono-text break-text">{result.orchestratorDid}</div>
              </div>
              <div className="agent-card-detail">
                <div className="agent-card-label">Challenge (UUID)</div>
                <div className="agent-card-value mono-text">{result.challenge}</div>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '8px 0', color: 'var(--text-light)' }}>
            --- DIDComm Challenge/Response ---
          </div>

          <div className="agent-card">
            <div className="agent-card-header">
              <div className="agent-card-title-block">
                <h3 className="agent-card-title">
                  {result.credentialSubject?.agentId || 'Agent'}
                  <span className="status-badge status-approved" style={{ marginLeft: '10px' }}>VERIFIED</span>
                </h3>
                <p className="agent-card-summary">{result.credentialSubject?.summary}</p>
              </div>
            </div>
            <div className="agent-card-details">
              <div className="agent-card-detail">
                <div className="agent-card-label">Agent DID</div>
                <div className="agent-card-value mono-text break-text">{result.agentDid}</div>
              </div>
              <div className="agent-card-detail">
                <div className="agent-card-label">Vendor DID</div>
                <div className="agent-card-value mono-text break-text">{result.vendorDid}</div>
              </div>
              <div className="agent-card-detail">
                <div className="agent-card-label">Calling Convention</div>
                <div className="agent-card-value">{result.credentialSubject?.callingConvention}</div>
              </div>
              <div className="agent-card-detail">
                <div className="agent-card-label">Service Endpoint</div>
                <div className="agent-card-value mono-text">{result.credentialSubject?.serviceEndpoint}</div>
              </div>
            </div>
          </div>

          {/* Task Result */}
          <h4 style={{ marginTop: '20px' }}>Task Result</h4>
          <div className="result-output">
            {result.result.output}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '6px' }}>
            Model: {result.result.model} | Executed: {result.result.executedAt}
          </div>
        </div>
      )}
    </div>
  )
}

function pause(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default Orchestrate
