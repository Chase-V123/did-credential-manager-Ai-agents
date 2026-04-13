interface AgentCardProps {
  agent: any
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <div className="agent-card">
      <div className="agent-card-header">
        <div className="agent-card-title-block">
          <h3 className="agent-card-title">{agent.name}</h3>
          <p className="agent-card-summary">{agent.description}</p>
        </div>
      </div>

      <div className="agent-card-details">
        <div className="agent-card-detail">
          <div className="agent-card-label">ID</div>
          <div className="agent-card-value mono-text">{agent.id}</div>
        </div>

        <div className="agent-card-detail">
          <div className="agent-card-label">Endpoint</div>
          <div className="agent-card-value mono-text">{agent.endpoint}</div>
        </div>

        <div className="agent-card-detail">
          <div className="agent-card-label">Status</div>
          <div className="agent-card-value">{agent.status}</div>
        </div>

        <div className="agent-card-detail">
          <div className="agent-card-label">Category</div>
          <div className="agent-card-value">{agent.category}</div>
        </div>

        <div className="agent-card-detail">
          <div className="agent-card-label">Specialties</div>
          <div className="agent-card-value">
            {agent.specialties?.join(', ') || 'None'}
          </div>
        </div>

        <div className="agent-card-detail">
          <div className="agent-card-label">Last Seen</div>
          <div className="agent-card-value">{agent.lastSeen}</div>
        </div>
      </div>
    </div>
  )
}