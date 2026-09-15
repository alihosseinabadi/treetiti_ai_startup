// ============================================
// SPECIFIC PROVIDER IMPLEMENTATIONS
// ============================================

import { BaseProviderClient } from './base';
import { ProviderConfig, LLMRequest, LLMResponse, StreamingChunk, ProviderHealth } from '../types';

// ============================================
// GROQ
// ============================================
export class GroqClient extends BaseProviderClient {
  async chat(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const data = await this.makeRequest<any>('/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: request.model || this.config.defaultModel,
        messages: this.buildMessages(request),
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature ?? 0.7,
        top_p: request.topP ?? 1,
        stream: false
      })
    });

    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: this.config.name,
      model: data.model || request.model || this.config.defaultModel,
      latency: Date.now() - start,
      tokens: data.usage ? {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens
      } : undefined,
      finishReason: data.choices?.[0]?.finish_reason
    };
  }

  async *streamChat(request: LLMRequest): AsyncGenerator<StreamingChunk> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: request.model || this.config.defaultModel,
        messages: this.buildMessages(request),
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature ?? 0.7,
        stream: true
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            yield { content: '', done: true, provider: this.config.name, model: this.config.defaultModel };
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              yield { content, done: false, provider: this.config.name, model: this.config.defaultModel };
            }
          } catch {}
        }
      }
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    return this.checkHealthEndpoint();
  }

  async listModels(): Promise<string[]> {
    const data = await this.makeRequest<any>('/models', { method: 'GET' });
    return data.data?.map((m: any) => m.id) || [];
  }
}

// ============================================
// COHERE
// ============================================
export class CohereClient extends BaseProviderClient {
  async chat(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const data = await this.makeRequest<any>('/chat', {
      method: 'POST',
      body: JSON.stringify({
        model: request.model || this.config.defaultModel,
        messages: this.buildMessages(request),
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature ?? 0.7
      })
    });

    return {
      content: data.message?.content?.[0]?.text || '',
      provider: this.config.name,
      model: request.model || this.config.defaultModel,
      latency: Date.now() - start,
      tokens: data.meta?.tokens ? {
        prompt: data.meta.tokens.input_tokens,
        completion: data.meta.tokens.output_tokens,
        total: data.meta.tokens.input_tokens + data.meta.tokens.output_tokens
      } : undefined,
      finishReason: data.finish_reason
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return this.checkHealthEndpoint();
  }

  async listModels(): Promise<string[]> {
    const data = await this.makeRequest<any>('/models', { method: 'GET' });
    return data.models?.map((m: any) => m.name) || [];
  }
}

// ============================================
// OPENROUTER (Free & Paid)
// ============================================
export class OpenRouterClient extends BaseProviderClient {
  async chat(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const data = await this.makeRequest<any>('/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: request.model || this.config.defaultModel,
        messages: this.buildMessages(request),
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature ?? 0.7,
        top_p: request.topP ?? 1
      })
    });

    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: this.config.name,
      model: data.model || request.model || this.config.defaultModel,
      latency: Date.now() - start,
      tokens: data.usage ? {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens
      } : undefined,
      finishReason: data.choices?.[0]?.finish_reason
    };
  }

  async *streamChat(request: LLMRequest): AsyncGenerator<StreamingChunk> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://treetiti.com',
        'X-Title': 'Treetiti'
      },
      body: JSON.stringify({
        model: request.model || this.config.defaultModel,
        messages: this.buildMessages(request),
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature ?? 0.7,
        stream: true
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            yield { content: '', done: true, provider: this.config.name, model: this.config.defaultModel };
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              yield { content, done: false, provider: this.config.name, model: this.config.defaultModel };
            }
          } catch {}
        }
      }
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    return this.checkHealthEndpoint();
  }

  async listModels(): Promise<string[]> {
    const data = await this.makeRequest<any>('/models', { method: 'GET' });
    return data.data?.map((m: any) => m.id) || [];
  }
}

// ============================================
// GEMINI
// ============================================
export class GeminiClient extends BaseProviderClient {
  async chat(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const model = request.model || this.config.defaultModel;
    const fullPrompt = this.buildMessages(request).map(m => `${m.role}: ${m.content}`).join('\n\n');

    const data = await this.makeRequest<any>(`/models/${model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          maxOutputTokens: request.maxTokens || 1000,
          temperature: request.temperature ?? 0.7,
          topP: request.topP ?? 1
        }
      })
    });

    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      provider: this.config.name,
      model,
      latency: Date.now() - start,
      tokens: data.usageMetadata ? {
        prompt: data.usageMetadata.promptTokenCount,
        completion: data.usageMetadata.candidatesTokenCount,
        total: data.usageMetadata.totalTokenCount
      } : undefined,
      finishReason: data.candidates?.[0]?.finishReason
    };
  }

  async *streamChat(request: LLMRequest): AsyncGenerator<StreamingChunk> {
    const model = request.model || this.config.defaultModel;
    const fullPrompt = this.buildMessages(request).map(m => `${m.role}: ${m.content}`).join('\n\n');

    const response = await fetch(
      `${this.config.baseUrl}/models/${model}:streamGenerateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            maxOutputTokens: request.maxTokens || 1000,
            temperature: request.temperature ?? 0.7
          }
        })
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader');

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      try {
        const data = JSON.parse(text);
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (content) {
          yield { content, done: false, provider: this.config.name, model };
        }
      } catch {}
    }

    yield { content: '', done: true, provider: this.config.name, model };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return this.checkHealthEndpoint();
  }

  async listModels(): Promise<string[]> {
    const data = await this.makeRequest<any>('/models', { method: 'GET' });
    return data.models?.map((m: any) => m.name.replace('models/', '')) || [];
  }
}

// ============================================
// DEEPSEEK
// ============================================
export class DeepSeekClient extends BaseProviderClient {
  async chat(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const data = await this.makeRequest<any>('/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: request.model || this.config.defaultModel,
        messages: this.buildMessages(request),
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature ?? 0.7,
        top_p: request.topP ?? 1
      })
    });

    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: this.config.name,
      model: data.model || request.model || this.config.defaultModel,
      latency: Date.now() - start,
      tokens: data.usage ? {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens
      } : undefined,
      finishReason: data.choices?.[0]?.finish_reason
    };
  }

  async *streamChat(request: LLMRequest): AsyncGenerator<StreamingChunk> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: request.model || this.config.defaultModel,
        messages: this.buildMessages(request),
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature ?? 0.7,
        stream: true
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            yield { content: '', done: true, provider: this.config.name, model: this.config.defaultModel };
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              yield { content, done: false, provider: this.config.name, model: this.config.defaultModel };
            }
          } catch {}
        }
      }
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    return this.checkHealthEndpoint();
  }

  async listModels(): Promise<string[]> {
    const data = await this.makeRequest<any>('/models', { method: 'GET' });
    return data.data?.map((m: any) => m.id) || [];
  }
}

// ============================================
// MISTRAL
// ============================================
export class MistralClient extends BaseProviderClient {
  async chat(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const data = await this.makeRequest<any>('/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: request.model || this.config.defaultModel,
        messages: this.buildMessages(request),
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature ?? 0.7,
        top_p: request.topP ?? 1
      })
    });

    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: this.config.name,
      model: data.model || request.model || this.config.defaultModel,
      latency: Date.now() - start,
      tokens: data.usage ? {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens
      } : undefined,
      finishReason: data.choices?.[0]?.finish_reason
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return this.checkHealthEndpoint();
  }

  async listModels(): Promise<string[]> {
    const data = await this.makeRequest<any>('/models', { method: 'GET' });
    return data.data?.map((m: any) => m.id) || [];
  }
}

// ============================================
// CEREBRAS
// ============================================
export class CerebrasClient extends BaseProviderClient {
  async chat(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const data = await this.makeRequest<any>('/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: request.model || this.config.defaultModel,
        messages: this.buildMessages(request),
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature ?? 0.7
      })
    });

    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: this.config.name,
      model: data.model || request.model || this.config.defaultModel,
      latency: Date.now() - start,
      tokens: data.usage ? {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens
      } : undefined,
      finishReason: data.choices?.[0]?.finish_reason
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return this.checkHealthEndpoint();
  }

  async listModels(): Promise<string[]> {
    const data = await this.makeRequest<any>('/models', { method: 'GET' });
    return data.data?.map((m: any) => m.id) || [];
  }
}

// ============================================
// POLLINATIONS (Free & New API)
// ============================================
export class PollinationsClient extends BaseProviderClient {
  async chat(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const endpoint = this.config.tier === 'free' ? '/' : '/chat/completions';
    const body = this.config.tier === 'free' 
      ? { prompt: this.buildMessages(request).map(m => `${m.role}: ${m.content}`).join('\n\n'), model: request.model || this.config.defaultModel }
      : { model: request.model || this.config.defaultModel, messages: this.buildMessages(request), max_tokens: request.maxTokens || 1000 };

    const data = await this.makeRequest<any>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });

    // Handle both old and new API formats
    let content = '';
    if (data.text) content = data.text;
    else if (data.choices?.[0]?.message?.content) content = data.choices[0].message.content;
    else if (data.content) content = data.content;

    return {
      content,
      provider: this.config.name,
      model: request.model || this.config.defaultModel,
      latency: Date.now() - start,
      tokens: data.usage ? {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens
      } : undefined
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return this.checkHealthEndpoint();
  }

  async listModels(): Promise<string[]> {
    return this.config.models;
  }
}

// ============================================
// LOCAL PROVIDERS (9Router, Ollama, OpenCode)
// ============================================
export class LocalProviderClient extends BaseProviderClient {
  async chat(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const data = await this.makeRequest<any>('/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: request.model || this.config.defaultModel,
        messages: this.buildMessages(request),
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature ?? 0.7,
        top_p: request.topP ?? 1
      })
    });

    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: this.config.name,
      model: data.model || request.model || this.config.defaultModel,
      latency: Date.now() - start,
      tokens: data.usage ? {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens
      } : undefined,
      finishReason: data.choices?.[0]?.finish_reason
    };
  }

  async *streamChat(request: LLMRequest): AsyncGenerator<StreamingChunk> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model || this.config.defaultModel,
        messages: this.buildMessages(request),
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature ?? 0.7,
        stream: true
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            yield { content: '', done: true, provider: this.config.name, model: this.config.defaultModel };
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              yield { content, done: false, provider: this.config.name, model: this.config.defaultModel };
            }
          } catch {}
        }
      }
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    return this.checkHealthEndpoint();
  }

  async listModels(): Promise<string[]> {
    try {
      const data = await this.makeRequest<any>('/models', { method: 'GET' });
      return data.data?.map((m: any) => m.id) || this.config.models;
    } catch {
      return this.config.models;
    }
  }
}

// ============================================
// REQUESTY, OMNIROUTER, SAMBANOVA, LOCKLLM, BAZALINK
// ============================================
export class OpenAICompatibleClient extends BaseProviderClient {
  async chat(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const data = await this.makeRequest<any>('/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: request.model || this.config.defaultModel,
        messages: this.buildMessages(request),
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature ?? 0.7,
        top_p: request.topP ?? 1
      })
    });

    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: this.config.name,
      model: data.model || request.model || this.config.defaultModel,
      latency: Date.now() - start,
      tokens: data.usage ? {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens
      } : undefined,
      finishReason: data.choices?.[0]?.finish_reason
    };
  }

  async *streamChat(request: LLMRequest): AsyncGenerator<StreamingChunk> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: request.model || this.config.defaultModel,
        messages: this.buildMessages(request),
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature ?? 0.7,
        stream: true
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            yield { content: '', done: true, provider: this.config.name, model: this.config.defaultModel };
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              yield { content, done: false, provider: this.config.name, model: this.config.defaultModel };
            }
          } catch {}
        }
      }
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    return this.checkHealthEndpoint();
  }

  async listModels(): Promise<string[]> {
    try {
      const data = await this.makeRequest<any>('/models', { method: 'GET' });
      return data.data?.map((m: any) => m.id) || this.config.models;
    } catch {
      return this.config.models;
    }
  }
}