import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import registryApi from '../api/registryApi';
import orchestratorApi from '../api/orchestratorApi';
import { AgentCard } from '../components/AgentCard';

export function DiscoveryView() {
  const [summary, setSummary] = useState('summarizes');
  const [task, setTask] = useState('Summarize the benefits of DID-based agent trust in 3 bullet points.');
  const [searchValue, setSearchValue] = useState('summarizes');

  const { data: agents = [], refetch, isFetching } = useQuery({
    queryKey: ['discover-agents', searchValue],
    queryFn: () => registryApi.getAgents(searchValue),
    enabled: !!searchValue,
  });

  const orchestrateMutation = useMutation({
    mutationFn: () => orchestratorApi.orchestrate(task, summary),
  });

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">Discover Available AI Agents</h2>
        <p className="mt-2 text-gray-600">
          Search the registry by capability summary, then optionally run a task through the orchestrator.
        </p>

        <div className="mt-5 grid md:grid-cols-[1fr_auto] gap-3">
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Enter capability summary"
            className="w-full border border-gray-300 rounded-xl px-4 py-3"
          />
          <button
            onClick={() => {
              setSearchValue(summary);
              refetch();
            }}
            className="px-5 py-3 rounded-xl bg-black text-white font-medium"
          >
            Search
          </button>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Matching Agents {isFetching ? '(loading...)' : `(${agents.length})`}
        </h3>

        <div className="space-y-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.agentDid}
              agent={agent}
              onSelect={() => setSummary(agent.summary)}
            />
          ))}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900">Run Task Through Orchestrator</h3>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Requested Summary</label>
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Task</label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              rows={5}
              className="w-full border border-gray-300 rounded-xl px-4 py-3"
            />
          </div>

          <button
            onClick={() => orchestrateMutation.mutate()}
            disabled={orchestrateMutation.isPending}
            className="px-5 py-3 rounded-xl bg-black text-white font-medium disabled:opacity-50"
          >
            {orchestrateMutation.isPending ? 'Running...' : 'Run Orchestration'}
          </button>
        </div>

        {orchestrateMutation.isSuccess && (
          <div className="mt-6 rounded-xl bg-green-50 border border-green-200 p-4">
            <div className="font-semibold text-green-900">Orchestration successful</div>
            <div className="mt-2 text-sm text-green-800">
              Verified: {String(orchestrateMutation.data.verified)}
            </div>
            <div className="mt-1 text-sm text-green-800 break-all">
              Agent DID: {orchestrateMutation.data.agentDid}
            </div>
            <div className="mt-1 text-sm text-green-800">
              Model: {orchestrateMutation.data.result.model}
            </div>
            <pre className="mt-3 whitespace-pre-wrap text-sm text-gray-900 bg-white rounded-lg p-3 border border-green-200">
              {orchestrateMutation.data.result.output}
            </pre>
          </div>
        )}

        {orchestrateMutation.isError && (
          <div className="mt-6 rounded-xl bg-red-50 border border-red-200 p-4 text-red-800">
            {orchestrateMutation.error instanceof Error
              ? orchestrateMutation.error.message
              : 'Orchestration failed'}
          </div>
        )}
      </section>
    </div>
  );
}