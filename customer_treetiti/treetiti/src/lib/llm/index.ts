// ============================================
// MAIN EXPORTS - LLM System Entry Point
// ============================================

// Types
export * from './types';

// Provider Registry & Configs
export { 
  PROVIDER_REGISTRY, 
  getProvidersByTier, 
  getFreeProviders, 
  getLocalProviders,
  getGatewayProviders,
  getPaidProviders,
  getAllProvidersSorted,
  getProvider
} from './providers/registry';

// Provider Factory & Clients
export { ProviderFactory } from './providers/factory';
export { BaseProviderClient } from './providers/base';
export { 
  GroqClient, CohereClient, OpenRouterClient, GeminiClient, DeepSeekClient,
  MistralClient, CerebrasClient, PollinationsClient, LocalProviderClient,
  OpenAICompatibleClient
} from './providers/clients';

// Routing Strategies
export { 
  TieredRoutingStrategy, CostOptimizedStrategy, SpeedOptimizedStrategy,
  QualityOptimizedStrategy, SpecializedRoutingStrategy, FallbackChainStrategy,
  getStrategy, listStrategies, ROUTING_STRATEGIES
} from './strategies/routing';

// Manager
export { LLMManager, getLLMManager, resetLLMManager } from './manager';
export type { LLMManagerConfig } from './manager';

// Convenience functions for agents
let _managerInstance: any = null;

async function getManager() {
  if (!_managerInstance) {
    const { getLLMManager } = await import('./manager');
    _managerInstance = getLLMManager();
  }
  return _managerInstance;
}

export async function askLLM(prompt: string, options?: Partial<import('./types').LLMRequest>): Promise<string> {
  const manager = await getManager();
  return manager.ask(prompt, options);
}

export async function askLLMWithModel(prompt: string, model: string): Promise<string> {
  const manager = await getManager();
  return manager.askWithModel(prompt, model);
}

export async function askLLMWithProvider(prompt: string, provider: string): Promise<string> {
  const manager = await getManager();
  return manager.askWithProvider(prompt, provider);
}

export async function askLLMWithCapabilities(
  prompt: string, 
  capabilities: Partial<import('./types').ProviderCapabilities>
): Promise<string> {
  const manager = await getManager();
  return manager.askWithCapabilities(prompt, capabilities);
}

export async function streamLLM(
  prompt: string, 
  options?: Partial<import('./types').LLMRequest>
): AsyncGenerator<import('./types').StreamingChunk> {
  const manager = await getManager();
  return manager.streamChat({ prompt, ...options });
}

// Quick status check
export async function getLLMStatus() {
  const manager = await getManager();
  return manager.getProviderStatus();
}

export async function getLLMStats() {
  const manager = await getManager();
  return manager.getStats();
}