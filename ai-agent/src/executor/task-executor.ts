/**
 * Task Executor
 *
 * Executes a delegated task using an OpenAI-compatible chat agent.
 * Falls back to a mock response when no API key is configured.
 *
 * @module executor/task-executor
 */

import { ChatAgent } from './chat-agent.js';

export interface TaskResult {
  output: string;
  model: string;
  executedAt: string;
}

const chatAgent = new ChatAgent({
  systemPrompt:
    'You are a DID-backed AI agent. Fulfill the delegated task directly and return only the task result.',
});

/**
 * Execute a task and return the result.
 *
 * @param task - The task string to execute (e.g. "Summarize: The quick brown fox")
 * @returns TaskResult with the generated output
 */
export async function executeTask(task: string): Promise<TaskResult> {
  const response = await chatAgent.run(task);

  return {
    output: response.output,
    model: response.model,
    executedAt: new Date().toISOString(),
  };
}
