// ============================================
// PROVIDER REGISTRY - All Providers Configuration
// ============================================

import { ProviderConfig, ProviderTier, ProviderCapabilities } from './types';

export const PROVIDER_REGISTRY: Record<string, ProviderConfig> = {
  // ============================================
  // TIER 1: FREE PROVIDERS (Primary)
  // ============================================

  groq: {
    name: 'groq',
    displayName: 'Groq',
    tier: 'free',
    priority: 1,
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    defaultModel: 'groq/compound',
    models: [
      'groq/compound',
      'groq/compound-mini',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
      'whisper-large-v3',
      'whisper-large-v3-turbo'
    ],
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: false,
      reasoning: true,
      maxTokens: 8192,
      maxContextWindow: 131072,
      supportedModels: []
    },
    requiresAuth: true,
    costPer1kTokens: { input: 0, output: 0 },
    rateLimits: { requestsPerMinute: 30, tokensPerMinute: 6000 },
    metadata: { notes: 'Best free tier - compound model has reasoning' }
  },

  cohere: {
    name: 'cohere',
    displayName: 'Cohere',
    tier: 'free',
    priority: 2,
    baseUrl: 'https://api.cohere.ai/v2',
    apiKeyEnv: 'COHERE_API_KEY',
    defaultModel: 'command-r-plus-08-2024',
    models: [
      'command-r-plus-08-2024',
      'command-r-08-2024',
      'command-r7b-12-2024',
      'command-a-03-2025',
      'command-a-plus-05-2026'
    ],
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: false,
      reasoning: false,
      maxTokens: 4096,
      maxContextWindow: 128000,
      supportedModels: []
    },
    requiresAuth: true,
    costPer1kTokens: { input: 0, output: 0 },
    rateLimits: { requestsPerMinute: 1000, tokensPerMinute: 100000 },
    metadata: { notes: 'Excellent free tier, 1000 req/min' }
  },

  openrouter_free: {
    name: 'openrouter_free',
    displayName: 'OpenRouter (Free Models)',
    tier: 'free',
    priority: 3,
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    defaultModel: 'nex-agi/nex-n2.5-pro:free',
    models: [
      'nex-agi/nex-n2.5-pro:free',
      'nex-agi/nex-n2.5-mini:free',
      'inclusionai/ling-3.0-flash-vl:free',
      'inclusionai/ling-3.0-flash-sante:free',
      'meta-llama/llama-3.1-8b-instruct:free',
      'microsoft/phi-3-mini-128k-instruct:free',
      'google/gemma-2-9b-it:free',
      'qwen/qwen-2.5-7b-instruct:free'
    ],
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: true,
      reasoning: true,
      maxTokens: 8192,
      maxContextWindow: 128000,
      supportedModels: []
    },
    headers: { 'HTTP-Referer': 'https://treetiti.com', 'X-Title': 'Treetiti' },
    requiresAuth: false,
    costPer1kTokens: { input: 0, output: 0 },
    rateLimits: { requestsPerMinute: 20, tokensPerMinute: 20000 },
    metadata: { notes: 'Gateway to 100+ free models, no key required for some' }
  },

  pollinations_free: {
    name: 'pollinations_free',
    displayName: 'Pollinations (Free)',
    tier: 'free',
    priority: 4,
    baseUrl: 'https://text.pollinations.ai',
    apiKeyEnv: '',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'mistral', 'llama-3.1-8b'],
    capabilities: {
      chat: true,
      streaming: false,
      functionCalling: false,
      vision: false,
      reasoning: false,
      maxTokens: 4096,
      maxContextWindow: 8192,
      supportedModels: []
    },
    requiresAuth: false,
    costPer1kTokens: { input: 0, output: 0 },
    rateLimits: { requestsPerMinute: 30, tokensPerMinute: 30000 },
    metadata: { notes: 'Legacy API, may be deprecated' }
  },

  // ============================================
  // TIER 2: LOCAL PROVIDERS
  // ============================================

  nine_router: {
    name: 'nine_router',
    displayName: '9Router (Local)',
    tier: 'local',
    priority: 5,
    baseUrl: 'http://localhost:4000/v1',
    apiKeyEnv: '',
    defaultModel: 'auto',
    models: ['auto', 'llama-3.1-70b', 'llama-3.1-8b', 'mixtral-8x7b', 'qwen-2.5-72b'],
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: false,
      reasoning: true,
      maxTokens: 8192,
      maxContextWindow: 131072,
      supportedModels: []
    },
    requiresAuth: false,
    costPer1kTokens: { input: 0, output: 0 },
    rateLimits: { requestsPerMinute: 1000, tokensPerMinute: 1000000 },
    metadata: { notes: 'Runs locally on laptop - zero cost, full privacy' }
  },

  ollama: {
    name: 'ollama',
    displayName: 'Ollama (Local)',
    tier: 'local',
    priority: 6,
    baseUrl: 'http://localhost:11434/v1',
    apiKeyEnv: '',
    defaultModel: 'llama3.1',
    models: ['llama3.1', 'llama3.1:70b', 'mistral', 'codellama', 'phi3', 'gemma2', 'qwen2.5'],
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: false,
      vision: false,
      reasoning: false,
      maxTokens: 4096,
      maxContextWindow: 131072,
      supportedModels: []
    },
    requiresAuth: false,
    costPer1kTokens: { input: 0, output: 0 },
    rateLimits: { requestsPerMinute: 1000, tokensPerMinute: 1000000 },
    metadata: { notes: 'Fully local, runs on your hardware' }
  },

  opencode: {
    name: 'opencode',
    displayName: 'OpenCode (Local)',
    tier: 'local',
    priority: 7,
    baseUrl: 'http://localhost:8080/v1',
    apiKeyEnv: '',
    defaultModel: 'auto',
    models: ['auto'],
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: false,
      reasoning: true,
      maxTokens: 8192,
      maxContextWindow: 200000,
      supportedModels: []
    },
    requiresAuth: false,
    costPer1kTokens: { input: 0, output: 0 },
    rateLimits: { requestsPerMinute: 1000, tokensPerMinute: 1000000 },
    metadata: { notes: 'OpenCode local inference server' }
  },

  // ============================================
  // TIER 3: GATEWAY PROVIDERS (Need API keys)
  // ============================================

  openrouter: {
    name: 'openrouter',
    displayName: 'OpenRouter (Full)',
    tier: 'gateway',
    priority: 8,
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    models: [
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-opus',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'meta-llama/llama-3.1-405b-instruct',
      'meta-llama/llama-3.1-70b-instruct',
      'google/gemini-pro-1.5',
      'mistralai/mistral-large',
      'cohere/command-r-plus',
      'perplexity/sonar-large'
    ],
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: true,
      reasoning: true,
      maxTokens: 8192,
      maxContextWindow: 200000,
      supportedModels: []
    },
    headers: { 'HTTP-Referer': 'https://treetiti.com', 'X-Title': 'Treetiti' },
    requiresAuth: true,
    costPer1kTokens: { input: 0.003, output: 0.015 },
    rateLimits: { requestsPerMinute: 100, tokensPerMinute: 100000 },
    metadata: { notes: 'Unified gateway to 300+ models' }
  },

  requesty: {
    name: 'requesty',
    displayName: 'Requesty',
    tier: 'gateway',
    priority: 9,
    baseUrl: 'https://router.requesty.ai/v1',
    apiKeyEnv: 'REQUESTY_API_KEY',
    defaultModel: 'openai/gpt-4o-mini',
    models: [
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet',
      'meta-llama/llama-3.1-70b-instruct',
      'google/gemini-1.5-pro'
    ],
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: true,
      reasoning: true,
      maxTokens: 8192,
      maxContextWindow: 128000,
      supportedModels: []
    },
    requiresAuth: true,
    costPer1kTokens: { input: 0.001, output: 0.003 },
    rateLimits: { requestsPerMinute: 60, tokensPerMinute: 50000 },
    metadata: { notes: 'Smart routing gateway, cheaper than direct' }
  },

  // ============================================
  // TIER 4: PAID PROVIDERS (Direct APIs)
  // ============================================

  gemini: {
    name: 'gemini',
    displayName: 'Google Gemini',
    tier: 'paid',
    priority: 10,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyEnv: 'GEMINI_API_KEY',
    defaultModel: 'gemini-1.5-flash',
    models: [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-2.0-flash-exp',
      'gemini-1.0-pro'
    ],
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: true,
      reasoning: true,
      maxTokens: 8192,
      maxContextWindow: 2000000,
      supportedModels: []
    },
    requiresAuth: true,
    costPer1kTokens: { input: 0.075, output: 0.30 },
    rateLimits: { requestsPerMinute: 60, tokensPerMinute: 1000000 },
    metadata: { notes: 'Huge context window, great for long docs' }
  },

  deepseek: {
    name: 'deepseek',
    displayName: 'DeepSeek',
    tier: 'paid',
    priority: 11,
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: false,
      reasoning: true,
      maxTokens: 8192,
      maxContextWindow: 128000,
      supportedModels: []
    },
    requiresAuth: true,
    costPer1kTokens: { input: 0.14, output: 0.28 },
    rateLimits: { requestsPerMinute: 60, tokensPerMinute: 100000 },
    metadata: { notes: 'Excellent coding & reasoning, needs credits' }
  },

  mistral: {
    name: 'mistral',
    displayName: 'Mistral AI',
    tier: 'paid',
    priority: 12,
    baseUrl: 'https://api.mistral.ai/v1',
    apiKeyEnv: 'MISTRAL_API_KEY',
    defaultModel: 'mistral-small-latest',
    models: [
      'mistral-small-latest',
      'mistral-large-latest',
      'pixtral-12b',
      'codestral-latest'
    ],
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: true,
      reasoning: false,
      maxTokens: 8192,
      maxContextWindow: 128000,
      supportedModels: []
    },
    requiresAuth: true,
    costPer1kTokens: { input: 0.2, output: 0.6 },
    rateLimits: { requestsPerMinute: 60, tokensPerMinute: 100000 },
    metadata: { notes: 'Great European provider, multilingual' }
  },

  cerebras: {
    name: 'cerebras',
    displayName: 'Cerebras',
    tier: 'paid',
    priority: 13,
    baseUrl: 'https://api.cerebras.ai/v1',
    apiKeyEnv: 'CEREBRAS_API_KEY',
    defaultModel: 'gpt-oss-120b',
    models: ['gpt-oss-120b', 'llama3.1-70b', 'llama3.1-8b'],
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: false,
      vision: false,
      reasoning: false,
      maxTokens: 8192,
      maxContextWindow: 131072,
      supportedModels: []
    },
    requiresAuth: true,
    costPer1kTokens: { input: 0.1, output: 0.1 },
    rateLimits: { requestsPerMinute: 30, tokensPerMinute: 50000 },
    metadata: { notes: 'Fastest inference hardware, needs billing' }
  },

  sambanova: {
    name: 'sambanova',
    displayName: 'SambaNova',
    tier: 'paid',
    priority: 14,
    baseUrl: 'https://api.sambanova.ai/v1',
    apiKeyEnv: 'SAMBANOVA_API_KEY',
    defaultModel: 'Meta-Llama-3.1-8B-Instruct',
    models: [
      'Meta-Llama-3.1-8B-Instruct',
      'Meta-Llama-3.1-70B-Instruct',
      'Meta-Llama-3.1-405B-Instruct'
    ],
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: false,
      vision: false,
      reasoning: false,
      maxTokens: 4096,
      maxContextWindow: 131072,
      supportedModels: []
    },
    requiresAuth: true,
    costPer1kTokens: { input: 0.05, output: 0.15 },
    rateLimits: { requestsPerMinute: 30, tokensPerMinute: 50000 },
    metadata: { notes: 'Enterprise hardware, needs billing setup' }
  },

  omnirouter: {
    name: 'omnirouter',
    displayName: 'OmniRouter',
    tier: 'paid',
    priority: 15,
    baseUrl: 'https://api.omnirouter.ai/v1',
    apiKeyEnv: 'OMNIROUTER_API_KEY',
    defaultModel: 'openai/gpt-4o-mini',
    models: [
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet',
      'meta-llama/llama-3.1-70b-instruct'
    ],
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: true,
      reasoning: true,
      maxTokens: 8192,
      maxContextWindow: 128000,
      supportedModels: []
    },
    requiresAuth: true,
    costPer1kTokens: { input: 0.002, output: 0.006 },
    rateLimits: { requestsPerMinute: 60, tokensPerMinute: 50000 },
    metadata: { notes: 'Another smart routing gateway' }
  },

  // ============================================
  // TIER 5: SPECIALIZED PROVIDERS
  // ============================================

  pollinations: {
    name: 'pollinations',
    displayName: 'Pollinations (New API)',
    tier: 'paid',
    priority: 16,
    baseUrl: 'https://enter.pollinations.ai/api/v1',
    apiKeyEnv: 'POLLINATIONS_API_KEY',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'dall-e-3', 'flux', 'stable-diffusion'],
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: false,
      vision: true,
      reasoning: false,
      maxTokens: 4096,
      maxContextWindow: 8192,
      supportedModels: []
    },
    requiresAuth: true,
    costPer1kTokens: { input: 0.01, output: 0.03 },
    rateLimits: { requestsPerMinute: 30, tokensPerMinute: 30000 },
    metadata: { notes: 'New API at enter.pollinations.ai, supports image gen' }
  },

  lockllm: {
    name: 'lockllm',
    displayName: 'LockLLM',
    tier: 'paid',
    priority: 17,
    baseUrl: 'https://api.lockllm.com/v1',
    apiKeyEnv: 'LOCKLLM_API_KEY',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'claude-3.5-sonnet'],
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: true,
      reasoning: true,
      maxTokens: 8192,
      maxContextWindow: 128000,
      supportedModels: []
    },
    requiresAuth: true,
    costPer1kTokens: { input: 0.005, output: 0.015 },
    rateLimits: { requestsPerMinute: 60, tokensPerMinute: 50000 },
    metadata: { notes: 'Check docs for current endpoint' }
  },

  bazalink: {
    name: 'bazalink',
    displayName: 'BazaLink',
    tier: 'paid',
    priority: 18,
    baseUrl: 'https://api.bazalink.com/v1',
    apiKeyEnv: 'BAZALINK_API_KEY',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'claude-3.5-sonnet'],
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: true,
      reasoning: true,
      maxTokens: 8192,
      maxContextWindow: 128000,
      supportedModels: []
    },
    requiresAuth: true,
    costPer1kTokens: { input: 0.005, output: 0.015 },
    rateLimits: { requestsPerMinute: 60, tokensPerMinute: 50000 },
    metadata: { notes: 'Custom gateway, not OpenAI compatible' }
  }
};

// Helper functions
export function getProvidersByTier(tier: ProviderTier): ProviderConfig[] {
  return Object.values(PROVIDER_REGISTRY)
    .filter(p => p.tier === tier)
    .sort((a, b) => a.priority - b.priority);
}

export function getFreeProviders(): ProviderConfig[] {
  return getProvidersByTier('free');
}

export function getLocalProviders(): ProviderConfig[] {
  return getProvidersByTier('local');
}

export function getGatewayProviders(): ProviderConfig[] {
  return getProvidersByTier('gateway');
}

export function getPaidProviders(): ProviderConfig[] {
  return getProvidersByTier('paid');
}

export function getAllProvidersSorted(): ProviderConfig[] {
  return Object.values(PROVIDER_REGISTRY).sort((a, b) => a.priority - b.priority);
}

export function getProvider(name: string): ProviderConfig | undefined {
  return PROVIDER_REGISTRY[name];
}