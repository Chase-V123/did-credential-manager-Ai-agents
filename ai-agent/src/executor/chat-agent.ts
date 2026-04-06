export interface ChatAgentConfig {
  systemPrompt: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  provider?: 'ollama' | 'openai';
}

export interface ChatAgentResponse {
  output: string;
  model: string;
}

function getProvider(config: ChatAgentConfig): 'ollama' | 'openai' {
  if (config.provider) return config.provider;

  const provider = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (provider === 'ollama' || provider === 'openai') {
    return provider;
  }

  if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL) {
    return 'ollama';
  }

  return 'openai';
}

export class ChatAgent {
  private readonly config: ChatAgentConfig;

  constructor(config: ChatAgentConfig) {
    this.config = config;
  }

  async run(task: string): Promise<ChatAgentResponse> {
    const provider = getProvider(this.config);
    return provider === 'ollama' ? this.runWithOllama(task) : this.runWithOpenAI(task);
  }

  private async runWithOllama(task: string): Promise<ChatAgentResponse> {
    const model = this.config.model || process.env.OLLAMA_MODEL || 'llama3.1:8b';
    const baseUrl = (this.config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          messages: [
            { role: 'system', content: this.config.systemPrompt },
            { role: 'user', content: task },
          ],
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Ollama request failed (${response.status}): ${text}`);
      }

      const payload = await response.json() as {
        message?: { content?: string };
        model?: string;
      };
      const output = payload.message?.content?.trim();

      if (!output) {
        throw new Error('Ollama response did not include any message content');
      }

      return {
        output,
        model: payload.model || model,
      };
    } catch (error) {
      if (this.shouldMock(error)) {
        return {
          output: `[Mock Ollama Agent] ${task.substring(0, 240)}${task.length > 240 ? '...' : ''}`,
          model: 'mock-ollama-agent',
        };
      }
      throw error;
    }
  }

  private async runWithOpenAI(task: string): Promise<ChatAgentResponse> {
    const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY;
    const model = this.config.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (!apiKey) {
      return {
        output: `[Mock ChatAgent] ${task.substring(0, 240)}${task.length > 240 ? '...' : ''}`,
        model: 'mock-chat-agent',
      };
    }

    const baseUrl = (this.config.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: this.config.systemPrompt },
          { role: 'user', content: task },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${text}`);
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
    };
    const output = payload.choices?.[0]?.message?.content?.trim();

    if (!output) {
      throw new Error('OpenAI response did not include any message content');
    }

    return {
      output,
      model: payload.model || model,
    };
  }

  private shouldMock(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return /fetch failed|ECONNREFUSED|ENOTFOUND|Failed to fetch/i.test(error.message);
  }
}
