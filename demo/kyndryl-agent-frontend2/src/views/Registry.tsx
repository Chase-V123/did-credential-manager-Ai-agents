import { useEffect, useState } from 'react'
import { AgentCard } from '../components/AgentCard'

function Registry() {
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadAgents = async () => {
      try {
        setLoading(true)
        setError('')

        const res = await fetch('https://nest.projectnanda.org/api/agents')
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch agents')
        }

        setAgents(data.agents || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading agents')
      } finally {
        setLoading(false)
      }
    }

    loadAgents()
  }, [])

  return (
    <div>
      <h3>NANDA Registered Agents</h3>

      {loading && <p>Loading agents...</p>}

      {error && (
        <div>
          <b>Error:</b> {error}
        </div>
      )}

      {!loading && agents.length === 0 && <p>No agents found</p>}

      {!loading &&
        agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
    </div>
  )
}

export default Registry
