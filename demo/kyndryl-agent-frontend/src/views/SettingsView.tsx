import { useQuery } from '@tanstack/react-query';
import registryApi from '../api/registryApi';
import orchestratorApi from '../api/orchestratorApi';
import { config } from '../config';

export function SettingsView() {
  const { data: registryDid } = useQuery({
    queryKey: ['settings-registry-did'],
    queryFn: registryApi.getDid,
  });

  const { data: orchestratorDid } = useQuery({
    queryKey: ['settings-orchestrator-did'],
    queryFn: orchestratorApi.getDid,
  });

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>

        <div className="mt-5 grid gap-4">
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="text-sm text-gray-500">Registry URL</div>
            <div className="font-mono text-sm text-gray-900 break-all">{config.registryUrl}</div>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <div className="text-sm text-gray-500">Orchestrator URL</div>
            <div className="font-mono text-sm text-gray-900 break-all">{config.orchestratorUrl}</div>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <div className="text-sm text-gray-500">Registry DID</div>
            <div className="font-mono text-sm text-gray-900 break-all">{registryDid || 'Loading...'}</div>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <div className="text-sm text-gray-500">Orchestrator DID</div>
            <div className="font-mono text-sm text-gray-900 break-all">{orchestratorDid || 'Loading...'}</div>
          </div>
        </div>
      </section>
    </div>
  );
}