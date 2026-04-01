import type { RegisteredAgent } from '../types';

interface AgentCardProps {
  agent: RegisteredAgent;
  onSelect?: () => void;
}

export function AgentCard({ agent, onSelect }: AgentCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{agent.agentId}</h3>
          <p className="text-sm text-gray-600 mt-1">{agent.summary}</p>
        </div>

        {onSelect && (
          <button
            onClick={onSelect}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm font-medium hover:opacity-90"
          >
            Use Agent
          </button>
        )}
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-gray-500">Agent DID</div>
          <div className="font-mono break-all text-gray-900">{agent.agentDid}</div>
        </div>

        <div>
          <div className="text-gray-500">Vendor DID</div>
          <div className="font-mono break-all text-gray-900">{agent.vendorDid}</div>
        </div>

        <div>
          <div className="text-gray-500">Calling Convention</div>
          <div className="text-gray-900">{agent.callingConvention}</div>
        </div>

        <div>
          <div className="text-gray-500">Service Endpoint</div>
          <div className="font-mono break-all text-gray-900">{agent.serviceEndpoint}</div>
        </div>
      </div>
    </div>
  );
}