import { useQuery } from '@tanstack/react-query'
import registryApi from '../api/registryApi'
import orchestratorApi from '../api/orchestratorApi'
import { config } from '../config'

function Settings() {
  const { data: registryDid } = useQuery({
    queryKey: ['settings-registry-did'],
    queryFn: registryApi.getDid,
  })

  const { data: orchestratorDid } = useQuery({
    queryKey: ['settings-orchestrator-did'],
    queryFn: orchestratorApi.getDid,
  })

  return (
    <div className="page-panel">
      <section className="panel-box">
        <h3>System Settings</h3>

        <div className="settings-grid">
          <div className="settings-card">
            <div className="settings-label">Registry URL</div>
            <div className="settings-value mono-text break-text">
              {config.registryUrl}
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-label">Orchestrator URL</div>
            <div className="settings-value mono-text break-text">
              {config.orchestratorUrl}
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-label">Registry DID</div>
            <div className="settings-value mono-text break-text">
              {registryDid || 'Loading...'}
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-label">Orchestrator DID</div>
            <div className="settings-value mono-text break-text">
              {orchestratorDid || 'Loading...'}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Settings