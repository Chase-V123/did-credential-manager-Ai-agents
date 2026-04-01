import { useQuery } from '@tanstack/react-query';
import registryApi from '../api/registryApi';
import { AgentCard } from '../components/AgentCard';
import { VendorCard } from '../components/VendorCard';

export function RegistryView() {
  const { data: registryDid } = useQuery({
    queryKey: ['registry-did'],
    queryFn: registryApi.getDid,
  });

  const { data: health } = useQuery({
    queryKey: ['registry-health'],
    queryFn: registryApi.getHealth,
  });

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: registryApi.getVendors,
  });

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => registryApi.getAgents(),
  });

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">Registry Overview</h2>
        <div className="mt-4 grid md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="text-sm text-gray-500">Registry DID</div>
            <div className="mt-1 font-mono text-sm break-all text-gray-900">{registryDid || 'Loading...'}</div>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <div className="text-sm text-gray-500">Service Status</div>
            <div className="mt-1 text-gray-900">{health?.status || 'Loading...'}</div>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <div className="text-sm text-gray-500">Registered Agents</div>
            <div className="mt-1 text-gray-900">{agents.length}</div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Trusted Vendors</h3>
        {vendorsLoading ? (
          <div className="text-gray-500">Loading vendors...</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {vendors.map((vendor) => (
              <VendorCard key={vendor.vendorDid} vendor={vendor} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Registered AI Agents</h3>
        {agentsLoading ? (
          <div className="text-gray-500">Loading agents...</div>
        ) : (
          <div className="space-y-4">
            {agents.map((agent) => (
              <AgentCard key={agent.agentDid} agent={agent} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}