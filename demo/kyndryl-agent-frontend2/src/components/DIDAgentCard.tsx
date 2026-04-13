import type { RegisteredAgent } from '../types'

interface DIDAgentCardProps {
  agent: RegisteredAgent
}

export function DIDAgentCard({ agent }: DIDAgentCardProps) {
  return (
    <div className="agent-card">
      <div className="agent-card-header">
        <div className="agent-card-title-block">
          <h3 className="agent-card-title">{agent.agentId}</h3>
          <p className="agent-card-summary">{agent.summary}</p>
        </div>
      </div>

      <div className="agent-card-details">
        <div className="agent-card-detail">
          <div className="agent-card-label">Agent DID</div>
          <div className="agent-card-value mono-text">{agent.agentDid}</div>
        </div>

        <div className="agent-card-detail">
          <div className="agent-card-label">Vendor DID</div>
          <div className="agent-card-value mono-text">{agent.vendorDid}</div>
        </div>

        <div className="agent-card-detail">
          <div className="agent-card-label">Calling Convention</div>
          <div className="agent-card-value">{agent.callingConvention}</div>
        </div>

        <div className="agent-card-detail">
          <div className="agent-card-label">Service Endpoint</div>
          <div className="agent-card-value mono-text">{agent.serviceEndpoint}</div>
        </div>
      </div>
    </div>
  )
}
