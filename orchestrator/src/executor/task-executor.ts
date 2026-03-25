import { ChatAgent } from './chat-agent.js';

export interface TaskResult {
  output: string;
  model: string;
  executedAt: string;
}

const chatAgent = new ChatAgent({
  systemPrompt:
    'You are the orchestrator fallback agent. Complete the task directly when inline execution is requested.',
});

export async function executeTask(task: string): Promise<TaskResult> {
  const response = await chatAgent.run(task);

  return {
    output: response.output,
    model: response.model,
    executedAt: new Date().toISOString(),
  };
}
