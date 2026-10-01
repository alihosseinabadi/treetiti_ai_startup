// ============================================
// LLM MANAGER - Central Orchestrator for Agents
// ============================================

import { 
  ProviderConfig, ProviderInstance, LLMRequest, LLMResponse, 
  StreamingChunk, ProviderHealth, ProviderStatus, RoutingStrategy 
} from '../types';
import { 
  PROVIDER_REGISTRY, getAllProvidersSorted, getProvider 
} from './providers/registry';
import { ProviderFactory } from './providers/factory';
import { 
  TieredRoutingStrategy, CostOptimizedStrategy, SpeedOptimizedStrategy,
  QualityOptimizedStrategy, SpecializedRoutingStrategy, FallbackChainStrategy,
  getStrategy, listStrategies 
} from './strategies/routing';

export interface LLMManagerConfig {
  defaultStrategy?: string;
  healthCheckInterval?: number;
  maxRetries?: number;
  timeout?: number;
  enableFallback?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export class LLMManager {
  private providers: Map<string, ProviderInstance> = new Map();
  private strategy: RoutingStrategy;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private config: Required<LLMManagerConfig>;
  private requestLog: Array<{ request: LLMRequest; response: LLMResponse; timestamp: Date }> = [];

  constructor(config: LLMManagerConfig = {}) {
    this.config = {
      defaultStrategy: config.defaultStrategy || 'tiered',
      healthCheckInterval: config.healthCheckInterval || 60000,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30000,
      enableFallback: config.enableFallback !== false,
      logLevel: config.logLevel || 'info'
    };

    this.strategy = getStrategy(this.config.defaultStrategy);
    this.initializeProviders();
    this.startHealthChecks();
  }

  private initializeProviders() {
    const allProviders = getAllProvidersSorted();
    
    for (const providerConfig of allProviders) {
      const apiKey = this.getApiKey(providerConfig.apiKeyEnv);
      
      // Create provider instance even without key (for local/free)
      const client = ProviderFactory.createClient(providerConfig, apiKey || '');
      
      const instance: ProviderInstance = {
        config: providerConfig,
        health: {
          provider: providerConfig.name,
          status: apiKey || !providerConfig.requiresAuth ? 'unknown' : 'needs_config',
          latency: 0,
          lastCheck: new Date(),
          consecutiveFailures: 0
        },
        client
      };

      this.providers.set(providerConfig.name, instance);
      
      this.log('info', `Initialized provider: ${providerConfig.displayName} (${providerConfig.tier})`, {
        hasKey: !!apiKey,
        requiresAuth: providerConfig.requiresAuth
      });
    }

    // Initial health check
    this.runHealthChecks();
  }

  private getApiKey(envName: string): string | undefined {
    if (!envName) return undefined;
    return process.env[envName];
  }

  private startHealthChecks() {
    this.healthCheckTimer = setInterval(() => {
      this.runHealthChecks();
    }, this.config.healthCheckInterval);
  }

  private async runHealthChecks() {
    const promises = Array.from(this.providers.values()).map(async (instance) => {
      try {
        const health = await instance.client.healthCheck();
        instance.health = health;
        
        this.log('debug', `Health check: ${instance.config.displayName}`, {
          status: health.status,
          latency: health.latency
        });
      } catch (error) {
        instance.health = {
          provider: instance.config.name,
          status: 'unhealthy',
          latency: 0,
          lastCheck: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
          consecutiveFailures: instance.health.consecutiveFailures + 1
        };
        
        this.log('warn', `Health check failed: ${instance.config.displayName}`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    await Promise.allSettled(promises);
  }

  // ============================================
  // PUBLIC API
  // ============================================

  async chat(request: LLMRequest, strategyName?: string): Promise<LLMResponse> {
    const strategy = strategyName ? getStrategy(strategyName) : this.strategy;
    const availableProviders = this.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      throw new Error('No providers available');
    }

    let selectedProvider = strategy.selectProvider(availableProviders, request);
    let lastError: Error | null = null;
    let attempt = 0;

    while (selectedProvider && attempt < this.config.maxRetries) {
      try {
        this.log('info', `Request to ${selectedProvider.config.displayName}`, {
          model: request.model || selectedProvider.config.defaultModel,
          strategy: this.strategy.name,
          attempt: attempt + 1
        });

        const response = await selectedProvider.client.chat(request);
        
        // Log success
        this.requestLog.push({ request, response, timestamp: new Date() });
        
        this.log('info', `Success from ${selectedProvider.config.displayName}`, {
          latency: response.latency,
          tokens: response.tokens
        });

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;
        
        this.log('warn', `Attempt ${attempt} failed for ${selectedProvider.config.displayName}`, {
          error: lastError.message
        });

        // Update health
        selectedProvider.health.consecutiveFailures++;
        if (selectedProvider.health.consecutiveFailures >= 3) {
          selectedProvider.health.status = 'unhealthy';
        }

        if (!this.config.enableFallback || attempt >= this.config.maxRetries) {
          break;
        }

        // Try next provider
        const remaining = availableProviders.filter(p => p !== selectedProvider);
        selectedProvider = strategy.selectProvider(remaining, request);
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }

  async *streamChat(request: LLMRequest, strategyName?: string): AsyncGenerator<StreamingChunk> {
    const strategy = strategyName ? getStrategy(strategyName) : this.strategy;
    const availableProviders = this.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      throw new Error('No providers available');
    }

    let selectedProvider = strategy.selectProvider(availableProviders, request);
    
    if (!selectedProvider.client.streamChat) {
      // Fallback to non-streaming
      const response = await this.chat(request, strategyName);
      yield { content: response.content, done: true, provider: response.provider, model: response.model };
      return;
    }

    let attempt = 0;
    
    while (selectedProvider && attempt < this.config.maxRetries) {
      try {
        this.log('info', `Streaming from ${selectedProvider.config.displayName}`);
        
        for await (const chunk of selectedProvider.client.streamChat!(request)) {
          yield chunk;
        }
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;
        
        this.log('warn', `Streaming attempt ${attempt} failed`, {
          error: lastError.message
        });

        if (attempt >= this.config.maxRetries) break;
        
        const remaining = availableProviders.filter(p => p !== selectedProvider);
        selectedProvider = strategy.selectProvider(remaining, request);
      }
    }

    throw new Error(`All streaming providers failed. Last error: ${lastError?.message}`);
  }

  private getAvailableProviders(): ProviderInstance[] {
    return Array.from(this.providers.values()).filter(p => {
      // Must have key if required, or be free/local
      if (p.config.requiresAuth && !this.getApiKey(p.config.apiKeyEnv)) {
        return false;
      }
      return p.health.status !== 'unhealthy';
    });
  }

  // ============================================
  // AGENT-FRIENDLY METHODS
  // ============================================

  async ask(prompt: string, options: Partial<LLMRequest> = {}): Promise<string> {
    const response = await this.chat({ prompt, ...options });
    return response.content;
  }

  async askWithModel(prompt: string, model: string): Promise<string> {
    const response = await this.chat({ prompt, model });
    return response.content;
  }

  async askWithProvider(prompt: string, providerName: string): Promise<string> {
    const provider = this.providers.get(providerName);
    if (!provider) throw new Error(`Provider ${providerName} not found`);
    
    const response = await provider.client.chat({ prompt });
    return response.content;
  }

  // For agents that need specific capabilities
  async askWithCapabilities(prompt: string, capabilities: Partial<ProviderConfig['capabilities']>): Promise<string> {
    const providers = this.getAvailableProviders().filter(p => {
      if (capabilities.functionCalling && !p.config.capabilities.functionCalling) return false;
      if (capabilities.vision && !p.config.capabilities.vision) return false;
      if (capabilities.reasoning && !p.config.capabilities.reasoning) return false;
      if (capabilities.streaming && !p.config.capabilities.streaming) return false;
      return true;
    });

    if (providers.length === 0) {
      throw new Error('No providers match required capabilities');
    }

    providers.sort((a, b) => a.config.priority - b.config.priority);
    const response = await providers[0].client.chat({ prompt });
    return response.content;
  }

  // ============================================
  // STATUS & MONITORING
  // ============================================

  getProviderStatus(): Array<{ name: string; displayName: string; tier: string; status: ProviderStatus; latency: number; priority: number; hasKey: boolean }> {
    return Array.from(this.providers.values()).map(p => ({
      name: p.config.name,
      displayName: p.config.displayName,
      tier: p.config.tier,
      status: p.health.status,
      latency: p.health.latency,
      priority: p.config.priority,
      hasKey: !!this.getApiKey(p.config.apiKeyEnv) || !p.config.requiresAuth
    }));
  }

  getHealthyProviders(): string[] {
    return Array.from(this.providers.values())
      .filter(p => p.health.status === 'healthy')
      .map(p => p.config.name);
  }

  getProvidersByTier(tier: string): string[] {
    return Array.from(this.providers.values())
      .filter(p => p.config.tier === tier && p.health.status !== 'unhealthy')
      .map(p => p.config.name);
  }

  getStrategy(): string {
    return this.strategy.name;
  }

  setStrategy(name: string): boolean {
    const strategy = getStrategy(name);
    if (!strategy) return false;
    this.strategy = strategy;
    this.log('info', `Strategy changed to: ${name}`);
    return true;
  }

  getAvailableStrategies(): string[] {
    return listStrategies();
  }

  getRequestHistory(limit = 10): Array<{ request: LLMRequest; response: LLMResponse; timestamp: Date }> {
    return this.requestLog.slice(-limit);
  }

  getStats(): { totalRequests: number; avgLatency: number; providerUsage: Record<string, number> } {
    const totalRequests = this.requestLog.length;
    const avgLatency = totalRequests > 0 
      ? this.requestLog.reduce((sum, r) => sum + r.response.latency, 0) / totalRequests 
      : 0;
    
    const providerUsage: Record<string, number> = {};
    for (const log of this.requestLog) {
      providerUsage[log.response.provider] = (providerUsage[log.response.provider] || 0) + 1;
    }

    return { totalRequests, avgLatency, providerUsage };
  }

  // ============================================
  // UTILITIES
  // ============================================

  private log(level: string, message: string, meta?: Record<string, unknown>) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levels[level as keyof typeof levels] >= levels[this.config.logLevel]) {
      console.log(`[LLMManager] ${level.toUpperCase()}: ${message}`, meta || '');
    }
  }

  async shutdown() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    this.log('info', 'LLM Manager shut down');
  }
}

// Singleton instance
let managerInstance: LLMManager | null = null;

export function getLLMManager(config?: LLMManagerConfig): LLMManager {
  if (!managerInstance) {
    managerInstance = new LLMManager(config);
  }
  return managerInstance;
}

export function resetLLMManager() {
  if (managerInstance) {
    managerInstance.shutdown();
    managerInstance = null;
  }
}