import { useQuery } from '@tanstack/react-query'
import registryApi from '../api/registryApi'
import { AgentCard } from '../components/AgentCard'
import { VendorCard } from '../components/VendorCard'

function Registry() {
  const { data: registryDid } = useQuery({
    queryKey: ['registry-did'],
    queryFn: registryApi.getDid,
  })

  const { data: health } = useQuery({
    queryKey: ['registry-health'],
    queryFn: registryApi.getHealth,
  })

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: registryApi.getVendors,
  })

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => registryApi.getAgents(),
  })

  return (
    <div className="page-panel">
      <section className="panel-box">
        <h3>Registry Overview</h3>

        <div className="overview-grid">
          <div className="overview-card">
            <div className="overview-label">Registry DID</div>
            <div className="overview-value mono-text break-text">
              {registryDid || 'Loading...'}
            </div>
          </div>

          <div className="overview-card">
            <div className="overview-label">Service Status</div>
            <div className="overview-value">
              {health?.status || 'Loading...'}
            </div>
          </div>

          <div className="overview-card">
            <div className="overview-label">Registered Agents</div>
            <div className="overview-value">{agents.length}</div>
          </div>
        </div>
      </section>

      <section className="panel-box">
        <h3>Trusted Vendors</h3>

        {vendorsLoading ? (
          <div>Loading vendors...</div>
        ) : (
          <div className="vendor-grid">
            {vendors.map((vendor) => (
              <VendorCard key={vendor.vendorDid} vendor={vendor} />
            ))}
          </div>
        )}
      </section>

      <section className="panel-box">
        <h3>Registered AI Agents</h3>

        {agentsLoading ? (
          <div>Loading agents...</div>
        ) : (
          <div className="stack-list">
            {agents.map((agent) => (
              <AgentCard key={agent.agentDid} agent={agent} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Registry