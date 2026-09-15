// ============================================
// BASE PROVIDER CLIENT - Abstract Implementation
// ============================================

import { ProviderConfig, ProviderClient, LLMRequest, LLMResponse, StreamingChunk, ProviderHealth, ProviderStatus } from '../types';

export abstract class BaseProviderClient implements ProviderClient {
  protected config: ProviderConfig;
  protected apiKey: string;
  protected consecutiveFailures = 0;

  constructor(config: ProviderConfig, apiKey: string) {
    this.config = config;
    this.apiKey = apiKey;
  }

  abstract chat(request: LLMRequest): Promise<LLMResponse>;
  abstract streamChat?(request: LLMRequest): AsyncGenerator<StreamingChunk>;
  abstract healthCheck(): Promise<ProviderHealth>;
  abstract listModels(): Promise<string[]>;

  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit,
    timeout = 30000
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const url = `${this.config.baseUrl}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        ...this.config.headers,
        ...options.headers
      };

      if (this.config.requiresAuth && this.apiKey) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Non-JSON response (${response.status}): ${text.substring(0, 200)}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  protected buildMessages(request: LLMRequest): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];
    
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    
    messages.push({ role: 'user', content: request.prompt });
    return messages;
  }

  protected async checkHealthEndpoint(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      if (this.config.healthCheckEndpoint) {
        await this.makeRequest(this.config.healthCheckEndpoint, { method: 'GET' }, 5000);
      } else {
        // Default: try to list models
        await this.listModels();
      }
      return {
        provider: this.config.name,
        status: 'healthy',
        latency: Date.now() - start,
        lastCheck: new Date(),
        consecutiveFailures: 0
      };
    } catch (error) {
      this.consecutiveFailures++;
      return {
        provider: this.config.name,
        status: this.consecutiveFailures >= 3 ? 'unhealthy' : 'degraded',
        latency: Date.now() - start,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        consecutiveFailures: this.consecutiveFailures
      };
    }
  }

  getConfig(): ProviderConfig {
    return this.config;
  }

  isHealthy(): boolean {
    return this.consecutiveFailures < 3;
  }
}