import { useEffect, useState } from 'react'
import { AgentCard } from '../components/AgentCard'

function Registry() {
  const [agents, setAgents] = useState<any[]>([])

  useEffect(() => {
    fetch('http://localhost:5004/agents')
      .then(res => res.json())
      .then(data => {
        setAgents(data.agents || [])
      })
      .catch(err => console.error(err))
  }, [])

  return (
    <div>
      <h3>Registered Agents</h3>

      {agents.length === 0 ? (
        <p>No agents yet</p>
      ) : (
        // agents.map((agent, i) => (
        //   <div key={i} style={{ marginBottom: '12px' }}>
        //     <b>{agent.agentId}</b>
        //     <div>{agent.summary}</div>
        //   </div>
        // ))
        agents.map((agent) => (
            <AgentCard key={agent.agentDid} agent={agent} />
        ))
      )}
    </div>
  )
}

export default Registry