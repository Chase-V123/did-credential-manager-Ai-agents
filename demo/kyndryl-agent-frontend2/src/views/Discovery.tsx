import { useState } from 'react'
import { AgentCard } from '../components/AgentCard'

function Discovery() {
  const [task, setTask] = useState('')
  const [agents, setAgents] = useState<any[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const runDiscovery = async () => {
    try {
      setLoading(true)
      setHasSearched(true)
      setError('')
      setAgents([])
      setSelectedAgentId('')

      // Fetch all agents from NANDA and filter client-side by search term
      const res = await fetch('https://nest.projectnanda.org/api/agents')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Discovery failed')
      }

      const allAgents = data.agents || []
      const query = task.toLowerCase()
      const foundAgents = allAgents.filter((agent: any) =>
        agent.name?.toLowerCase().includes(query) ||
        agent.description?.toLowerCase().includes(query) ||
        agent.specialties?.some((s: string) => s.toLowerCase().includes(query))
      )

      setAgents(foundAgents)

      if (foundAgents.length > 0) {
        setSelectedAgentId(foundAgents[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const selectedAgent = agents.find(
    (agent) => agent.id === selectedAgentId
  )

  return (
    <div>
      <h3>Discover Agents</h3>
      <p>Search NANDA registry for agents by name, description, or specialty.</p>

      <div style={{ marginBottom: '12px' }}>
        <label>Task / Capability</label>
        <br />
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="e.g. orchestration, summarization, fraud"
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />
      </div>

      <button
        type="button"
        onClick={runDiscovery}
        disabled={loading}
        style={{ minWidth: '110px' }}
      >
        {loading ? 'Searching...' : 'Search'}
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
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} — {agent.description}
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
      </div>
    </div>
  )
}

export default Discovery
