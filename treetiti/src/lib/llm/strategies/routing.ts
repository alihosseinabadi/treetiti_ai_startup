// ============================================
// ROUTING STRATEGIES - Smart Provider Selection
// ============================================

import { ProviderInstance, LLMRequest, RoutingStrategy } from '../types';

export class TieredRoutingStrategy implements RoutingStrategy {
  name = 'tiered';
  
  selectProvider(providers: ProviderInstance[], request: LLMRequest): ProviderInstance | null {
    // Group by tier
    const free = providers.filter(p => p.config.tier === 'free' && p.health.status === 'healthy');
    const local = providers.filter(p => p.config.tier === 'local' && p.health.status === 'healthy');
    const gateway = providers.filter(p => p.config.tier === 'gateway' && p.health.status === 'healthy');
    const paid = providers.filter(p => p.config.tier === 'paid' && p.health.status === 'healthy');

    // Priority: Free -> Local -> Gateway -> Paid
    for (const tier of [free, local, gateway, paid]) {
      if (tier.length === 0) continue;
      
      // Within tier, pick by priority then lowest latency
      tier.sort((a, b) => {
        if (a.config.priority !== b.config.priority) {
          return a.config.priority - b.config.priority;
        }
        return a.health.latency - b.health.latency;
      });
      
      return tier[0];
    }

    // Fallback: any healthy provider
    const healthy = providers.filter(p => p.health.status === 'healthy');
    if (healthy.length > 0) {
      return healthy.sort((a, b) => a.config.priority - b.config.priority)[0];
    }

    // Last resort: any provider
    return providers[0] || null;
  }
}

export class CostOptimizedStrategy implements RoutingStrategy {
  name = 'cost-optimized';
  
  selectProvider(providers: ProviderInstance[], request: LLMRequest): ProviderInstance | null {
    const healthy = providers.filter(p => p.health.status === 'healthy');
    if (healthy.length === 0) return providers[0] || null;

    // Sort by cost (free first), then by capability match
    healthy.sort((a, b) => {
      const costA = a.config.costPer1kTokens?.input || 0;
      const costB = b.config.costPer1kTokens?.input || 0;
      
      if (costA !== costB) return costA - costB;
      
      // Prefer providers with required capabilities
      const hasFunctionCalling = request.functions && request.functions.length > 0;
      const hasVision = request.metadata?.vision === true;
      
      let scoreA = 0, scoreB = 0;
      if (hasFunctionCalling) {
        if (a.config.capabilities.functionCalling) scoreA += 10;
        if (b.config.capabilities.functionCalling) scoreB += 10;
      }
      if (hasVision) {
        if (a.config.capabilities.vision) scoreA += 10;
        if (b.config.capabilities.vision) scoreB += 10;
      }
      
      return scoreB - scoreA;
    });

    return healthy[0];
  }
}

export class SpeedOptimizedStrategy implements RoutingStrategy {
  name = 'speed-optimized';
  
  selectProvider(providers: ProviderInstance[], request: LLMRequest): ProviderInstance | null {
    const healthy = providers.filter(p => p.health.status === 'healthy');
    if (healthy.length === 0) return providers[0] || null;

    // Sort by latency
    healthy.sort((a, b) => a.health.latency - b.health.latency);
    return healthy[0];
  }
}

export class QualityOptimizedStrategy implements RoutingStrategy {
  name = 'quality-optimized';
  
  selectProvider(providers: ProviderInstance[], request: LLMRequest): ProviderInstance | null {
    const healthy = providers.filter(p => p.health.status === 'healthy');
    if (healthy.length === 0) return providers[0] || null;

    // Score by capabilities and model quality
    healthy.sort((a, b) => {
      let scoreA = 0, scoreB = 0;
      
      // Reasoning capability
      if (a.config.capabilities.reasoning) scoreA += 20;
      if (b.config.capabilities.reasoning) scoreB += 20;
      
      // Context window
      scoreA += Math.min(a.config.capabilities.maxContextWindow / 10000, 10);
      scoreB += Math.min(b.config.capabilities.maxContextWindow / 10000, 10);
      
      // Function calling
      if (a.config.capabilities.functionCalling) scoreA += 10;
      if (b.config.capabilities.functionCalling) scoreB += 10;
      
      // Vision
      if (a.config.capabilities.vision) scoreA += 5;
      if (b.config.capabilities.vision) scoreB += 5;
      
      // Prefer lower latency as tiebreaker
      scoreA -= a.health.latency / 1000;
      scoreB -= b.health.latency / 1000;
      
      return scoreB - scoreA;
    });

    return healthy[0];
  }
}

export class SpecializedRoutingStrategy implements RoutingStrategy {
  name = 'specialized';
  
  selectProvider(providers: ProviderInstance[], request: LLMRequest): ProviderInstance | null {
    const healthy = providers.filter(p => p.health.status === 'healthy');
    if (healthy.length === 0) return providers[0] || null;

    // Check for specific model request
    if (request.model) {
      const exactMatch = healthy.find(p => p.config.models.includes(request.model!));
      if (exactMatch) return exactMatch;
    }

    // Check for capability requirements
    const hasFunctions = request.functions && request.functions.length > 0;
    const needsVision = request.metadata?.vision === true;
    const needsReasoning = request.metadata?.reasoning === true;
    const needsStreaming = request.stream === true;

    let candidates = healthy;

    if (needsVision) {
      candidates = candidates.filter(p => p.config.capabilities.vision);
    }
    if (needsReasoning) {
      candidates = candidates.filter(p => p.config.capabilities.reasoning);
    }
    if (hasFunctions) {
      candidates = candidates.filter(p => p.config.capabilities.functionCalling);
    }
    if (needsStreaming) {
      candidates = candidates.filter(p => p.config.capabilities.streaming);
    }

    if (candidates.length === 0) {
      candidates = healthy; // Fallback
    }

    // Sort by priority
    candidates.sort((a, b) => a.config.priority - b.config.priority);
    return candidates[0];
  }
}

export class FallbackChainStrategy implements RoutingStrategy {
  name = 'fallback-chain';
  
  selectProvider(providers: ProviderInstance[], request: LLMRequest): ProviderInstance | null {
    // Simple priority-based fallback chain
    const healthy = providers.filter(p => p.health.status !== 'unhealthy');
    if (healthy.length === 0) return providers[0] || null;
    
    healthy.sort((a, b) => a.config.priority - b.config.priority);
    return healthy[0];
  }
}

// Strategy registry
export const ROUTING_STRATEGIES: Record<string, RoutingStrategy> = {
  'tiered': new TieredRoutingStrategy(),
  'cost': new CostOptimizedStrategy(),
  'speed': new SpeedOptimizedStrategy(),
  'quality': new QualityOptimizedStrategy(),
  'specialized': new SpecializedRoutingStrategy(),
  'fallback': new FallbackChainStrategy()
};

export function getStrategy(name: string): RoutingStrategy {
  return ROUTING_STRATEGIES[name] || ROUTING_STRATEGIES['tiered'];
}

export function listStrategies(): string[] {
  return Object.keys(ROUTING_STRATEGIES);
}