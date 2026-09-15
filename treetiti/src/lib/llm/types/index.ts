// ============================================
// LLM PROVIDER TYPES - Core Architecture
// ============================================

export type ProviderTier = 'free' | 'paid' | 'local' | 'gateway';
export type ProviderStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | 'needs_config';

export interface ProviderCapabilities {
  chat: boolean;
  streaming: boolean;
  functionCalling: boolean;
  vision: boolean;
  reasoning: boolean;
  maxTokens: number;
  maxContextWindow: number;
  supportedModels: string[];
}

export interface ProviderConfig {
  name: string;
  displayName: string;
  tier: ProviderTier;
  priority: number;
  baseUrl: string;
  apiKeyEnv: string;
  defaultModel: string;
  models: string[];
  capabilities: ProviderCapabilities;
  headers?: Record<string, string>;
  requiresAuth: boolean;
  costPer1kTokens?: { input: number; output: number };
  rateLimits?: { requestsPerMinute: number; tokensPerMinute: number };
  healthCheckEndpoint?: string;
  metadata?: Record<string, unknown>;
}

export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
  functions?: FunctionDefinition[];
  functionCall?: 'auto' | 'none' | { name: string };
  metadata?: Record<string, unknown>;
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  latency: number;
  tokens?: { prompt: number; completion: number; total: number };
  finishReason?: string;
  functionCall?: { name: string; arguments: string };
  metadata?: Record<string, unknown>;
}

export interface StreamingChunk {
  content: string;
  done: boolean;
  provider: string;
  model: string;
}

export interface ProviderHealth {
  provider: string;
  status: ProviderStatus;
  latency: number;
  lastCheck: Date;
  error?: string;
  consecutiveFailures: number;
}

export interface RoutingStrategy {
  name: string;
  selectProvider(providers: ProviderInstance[], request: LLMRequest): ProviderInstance | null;
}

export interface ProviderInstance {
  config: ProviderConfig;
  health: ProviderHealth;
  client: ProviderClient;
}

export interface ProviderClient {
  chat(request: LLMRequest): Promise<LLMResponse>;
  streamChat?(request: LLMRequest): AsyncGenerator<StreamingChunk>;
  healthCheck(): Promise<ProviderHealth>;
  listModels(): Promise<string[]>;
}