// ============================================
// PROVIDER FACTORY - Creates Provider Clients
// ============================================

import { ProviderConfig, ProviderClient } from '../types';
import { 
  GroqClient, CohereClient, OpenRouterClient, GeminiClient, DeepSeekClient,
  MistralClient, CerebrasClient, PollinationsClient, LocalProviderClient,
  OpenAICompatibleClient
} from './clients';

export class ProviderFactory {
  private static clientMap: Map<string, new (config: ProviderConfig, apiKey: string) => ProviderClient> = new Map([
    ['groq', GroqClient],
    ['cohere', CohereClient],
    ['openrouter', OpenRouterClient],
    ['openrouter_free', OpenRouterClient],
    ['gemini', GeminiClient],
    ['deepseek', DeepSeekClient],
    ['mistral', MistralClient],
    ['cerebras', CerebrasClient],
    ['pollinations', PollinationsClient],
    ['pollinations_free', PollinationsClient],
    ['nine_router', LocalProviderClient],
    ['ollama', LocalProviderClient],
    ['opencode', LocalProviderClient],
    ['requesty', OpenAICompatibleClient],
    ['omnirouter', OpenAICompatibleClient],
    ['sambanova', OpenAICompatibleClient],
    ['lockllm', OpenAICompatibleClient],
    ['bazalink', OpenAICompatibleClient]
  ]);

  static createClient(config: ProviderConfig, apiKey: string): ProviderClient {
    const ClientClass = this.clientMap.get(config.name);
    if (!ClientClass) {
      // Fallback to OpenAI compatible
      console.warn(`No specific client for ${config.name}, using OpenAI compatible fallback`);
      return new OpenAICompatibleClient(config, apiKey);
    }
    return new ClientClass(config, apiKey);
  }

  static registerClient(name: string, ClientClass: new (config: ProviderConfig, apiKey: string) => ProviderClient) {
    this.clientMap.set(name, ClientClass);
  }

  static getSupportedProviders(): string[] {
    return Array.from(this.clientMap.keys());
  }
}