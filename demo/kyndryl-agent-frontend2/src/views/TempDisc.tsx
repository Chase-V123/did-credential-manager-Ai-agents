import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import registryApi from '../api/registryApi'
import orchestratorApi from '../api/orchestratorApi'
import { AgentCard } from '../components/AgentCard'

function Discovery() {
  const [summary, setSummary] = useState('summarizes')
  const [task, setTask] = useState(
    'Summarize the benefits of DID-based agent trust in 3 bullet points.'
  )
  const [searchValue, setSearchValue] = useState('summarizes')

  const { data: agents = [], refetch, isFetching } = useQuery({
    queryKey: ['discover-agents', searchValue],
    queryFn: () => registryApi.getAgents(searchValue),
    enabled: !!searchValue,
  })

  const orchestrateMutation = useMutation({
    mutationFn: () => orchestratorApi.orchestrate(task, summary),
  })

  return (
    <div className="page-panel">
      <section className="panel-box">
        <h3>Discover Available AI Agents</h3>
        <p>
          Search the registry by capability summary, then optionally run a task
          through the orchestrator.
        </p>

        <div className="form-row">
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Enter capability summary"
            className="text-input"
          />
          <button
            type="button"
            onClick={() => {
              setSearchValue(summary)
              refetch()
            }}
            className="action-button"
          >
            Search
          </button>
        </div>
      </section>

      <section className="panel-box">
        <h3>
          Matching Agents {isFetching ? '(loading...)' : `(${agents.length})`}
        </h3>

        <div className="stack-list">
          {agents.map((agent) => (
            <AgentCard
              key={agent.agentDid}
              agent={agent}
              onSelect={() => setSummary(agent.summary)}
            />
          ))}
        </div>
      </section>

      <section className="panel-box">
        <h3>Run Task Through Orchestrator</h3>

        <div className="form-stack">
          <div>
            <label className="form-label">Requested Summary</label>
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="text-input"
            />
          </div>

          <div>
            <label className="form-label">Task</label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              rows={5}
              className="text-area"
            />
          </div>

          <button
            type="button"
            onClick={() => orchestrateMutation.mutate()}
            disabled={orchestrateMutation.isPending}
            className="action-button"
          >
            {orchestrateMutation.isPending ? 'Running...' : 'Run Orchestration'}
          </button>
        </div>

        {orchestrateMutation.isSuccess && (
          <div className="message-box success-box">
            <div className="message-title">Orchestration successful</div>
            <div>Verified: {String(orchestrateMutation.data.verified)}</div>
            <div className="break-text">
              Agent DID: {orchestrateMutation.data.agentDid}
            </div>
            <div>Model: {orchestrateMutation.data.result.model}</div>
            <pre className="result-output">
              {orchestrateMutation.data.result.output}
            </pre>
          </div>
        )}

        {orchestrateMutation.isError && (
          <div className="message-box error-box">
            {orchestrateMutation.error instanceof Error
              ? orchestrateMutation.error.message
              : 'Orchestration failed'}
          </div>
        )}
      </section>
    </div>
  )
}

export default Discovery