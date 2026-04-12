import { useState } from 'react'
import { AgentCard } from '../components/AgentCard'

function Discovery() {
  const [task, setTask] = useState('')
  const [agents, setAgents] = useState<any[]>([])
  const [selectedAgentDid, setSelectedAgentDid] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const runDiscovery = async () => {
    try {
      setLoading(true)
      setHasSearched(true)
      setError('')
      setAgents([])
      setSelectedAgentDid('')

      const res = await fetch(
        `http://localhost:5004/agents?summary=${encodeURIComponent(task)}`
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Discovery failed')
      }

      const foundAgents = data.agents || []
      setAgents(foundAgents)

      if (foundAgents.length > 0) {
        setSelectedAgentDid(foundAgents[0].agentDid)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const selectedAgent = agents.find(
    (agent) => agent.agentDid === selectedAgentDid
  )

  return (
    <div>
      <h3>Discover Agents</h3>
      <p>Enter a task or capability phrase to find matching agents.</p>

      <div style={{ marginBottom: '12px' }}>
        <label>Task / Capability</label>
        <br />
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="ex: summarizes"
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />
      </div>

      <button
        type="button"
        onClick={runDiscovery}
        disabled={loading}
        style={{ minWidth: '110px' }}
      >
        {loading ? 'Searching...' : 'Run'}
      </button>

      <div style={{ marginTop: '16px', minHeight: '260px' }}>
        {error && (
          <div>
            <b>Error:</b> {error}
          </div>
        )}

        {!loading && agents.length > 0 && (
          <div>
            <label>Select Matching Agent</label>
            <br />
            <select
              value={selectedAgentDid}
              onChange={(e) => setSelectedAgentDid(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            >
              {agents.map((agent) => (
                <option key={agent.agentDid} value={agent.agentDid}>
                  {agent.agentId} — {agent.summary}
                </option>
              ))}
            </select>
          </div>
        )}

        {hasSearched && !loading && agents.length === 0 && !error && (
          <div>
            <p>No matching agents found.</p>
          </div>
        )}

        {selectedAgent && (
          <div style={{ marginTop: '16px' }}>
            <AgentCard agent={selectedAgent} />
          </div>
        )}

        {/* {selectedAgent && (
          <div style={{ marginTop: '16px' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ marginBottom: '12px' }}>
                <AgentCard agent={selectedAgent} />
              </div>
            ))}
          </div>
        )} */}
      </div>
    </div>
  )
}

export default Discovery