import 'dotenv/config';

// ============================================
// SMART LLM CLIENT WITH AUTOMATIC FALLBACK
// ============================================
// Automatically tries providers in order until one works

interface LLMProvider {
  name: string;
  priority: number;
  available: boolean;
  call: (prompt: string, options?: LLMOptions) => Promise<LLMResponse>;
}

interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  latency: number;
  tokens?: { prompt: number; completion: number };
}

class SmartLLMClient {
  private providers: LLMProvider[] = [];
  private currentProviderIndex = 0;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Priority 1: Working free providers (tested)
    this.addProvider('cohere', 1, !!process.env.COHERE_API_KEY, this.callCohere.bind(this));
    this.addProvider('groq', 2, !!process.env.GROQ_API_KEY, this.callGroq.bind(this));

    // Priority 2: Need account fixes (keys valid, need credits/billing)
    this.addProvider('deepseek', 3, !!process.env.DEEPSEEK_API_KEY, this.callDeepSeek.bind(this));
    this.addProvider('mistral', 4, !!process.env.MISTRAL_API_KEY, this.callMistral.bind(this));
    this.addProvider('cerebras', 5, !!process.env.CEREBRAS_API_KEY, this.callCerebras.bind(this));
    this.addProvider('sambanova', 6, !!process.env.SAMBANOVA_API_KEY, this.callSambaNova.bind(this));

    // Priority 3: Wrong key format (need new keys)
    this.addProvider('requesty', 7, !!process.env.REQUESTY_API_KEY, this.callRequesty.bind(this));
    this.addProvider('gemini', 8, !!process.env.GEMINI_API_KEY, this.callGemini.bind(this));

    // Priority 4: Service issues
    this.addProvider('lockllm', 9, !!process.env.LOCKLLM_API_KEY, this.callLockLLM.bind(this));
    this.addProvider('pollinations', 10, !!process.env.POLLINATIONS_API_KEY, this.callPollinations.bind(this));
    this.addProvider('omnirouter', 11, !!process.env.OMNIROUTER_API_KEY, this.callOmniRouter.bind(this));

    // Priority 5: Free gateways (no key needed)
    this.addProvider('openrouter-free', 12, true, this.callOpenRouterFree.bind(this));
    this.addProvider('pollinations-free', 13, true, this.callPollinationsFree.bind(this));

    // Sort by priority
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  private addProvider(name: string, priority: number, available: boolean, call: LLMProvider['call']) {
    this.providers.push({ name, priority, available, call });
  }

  // ============================================
  // PROVIDER IMPLEMENTATIONS
  // ============================================

  private async callCohere(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const start = Date.now();
    const res = await fetch('https://api.cohere.ai/v2/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'command-r-plus-08-2024',
        messages: [
          ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7
      })
    });
    
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      throw new Error(`Non-JSON response (${res.status}): ${text.substring(0, 200)}`);
    }
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return {
      content: data.message?.content?.[0]?.text || '',
      provider: 'cohere',
      model: 'command-r-plus-08-2024',
      latency: Date.now() - start,
      tokens: data.meta?.tokens || data.usage
    };
  }

  private async callGroq(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const start = Date.now();
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'groq/compound',
        messages: [
          ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: 'groq',
      model: 'groq/compound',
      latency: Date.now() - start,
      tokens: data.usage
    };
  }

  private async callDeepSeek(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const start = Date.now();
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'deepseek-chat',
        messages: [
          ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: 'deepseek',
      model: 'deepseek-chat',
      latency: Date.now() - start,
      tokens: data.usage
    };
  }

  private async callMistral(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const start = Date.now();
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'mistral-small-latest',
        messages: [
          ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: 'mistral',
      model: 'mistral-small-latest',
      latency: Date.now() - start,
      tokens: data.usage
    };
  }

  private async callCerebras(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const start = Date.now();
    const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'gpt-oss-120b',
        messages: [
          ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: 'cerebras',
      model: 'gpt-oss-120b',
      latency: Date.now() - start,
      tokens: data.usage
    };
  }

  private async callSambaNova(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const start = Date.now();
    const res = await fetch('https://api.sambanova.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SAMBANOVA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'Meta-Llama-3.1-8B-Instruct',
        messages: [
          ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: 'sambanova',
      model: 'Meta-Llama-3.1-8B-Instruct',
      latency: Date.now() - start,
      tokens: data.usage
    };
  }

  private async callRequesty(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const start = Date.now();
    const res = await fetch('https://router.requesty.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REQUESTY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'openai/gpt-4o-mini',
        messages: [
          ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: 'requesty',
      model: 'openai/gpt-4o-mini',
      latency: Date.now() - start,
      tokens: data.usage
    };
  }

  private async callGemini(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const start = Date.now();
    const fullPrompt = `${options.systemPrompt ? options.systemPrompt + '\n\n' : ''}${prompt}`;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          maxOutputTokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7
        }
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      latency: Date.now() - start,
      tokens: data.usageMetadata
    };
  }

  private async callLockLLM(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const start = Date.now();
    const res = await fetch('https://api.lockllm.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LOCKLLM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4o-mini',
        messages: [
          ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: 'lockllm',
      model: 'gpt-4o-mini',
      latency: Date.now() - start,
      tokens: data.usage
    };
  }

  private async callPollinations(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const start = Date.now();
    const res = await fetch('https://text.pollinations.ai/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.POLLINATIONS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4o',
        messages: [
          ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: 'pollinations',
      model: 'gpt-4o',
      latency: Date.now() - start,
      tokens: data.usage
    };
  }

  private async callOmniRouter(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const start = Date.now();
    const res = await fetch('https://api.omnirouter.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OMNIROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'openai/gpt-4o-mini',
        messages: [
          ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: 'omnirouter',
      model: 'openai/gpt-4o-mini',
      latency: Date.now() - start,
      tokens: data.usage
    };
  }

  // ============================================
  // FREE GATEWAYS (No API key needed)
  // ============================================

  private async callOpenRouterFree(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const start = Date.now();
    const freeModels = [
      'nex-agi/nex-n2.5-pro:free',
      'nex-agi/nex-n2.5-mini:free',
      'inclusionai/ling-3.0-flash-vl:free',
      'inclusionai/ling-3.0-flash-sante:free'
    ];

    for (const model of freeModels) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://treetiti.com',
            'X-Title': 'Treetiti'
          },
          body: JSON.stringify({
            model,
            messages: [
              ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
              { role: 'user', content: prompt }
            ],
            max_tokens: options.maxTokens || 1000,
            temperature: options.temperature || 0.7
          })
        });
        const data = await res.json();
        if (res.ok) {
          return {
            content: data.choices?.[0]?.message?.content || '',
            provider: 'openrouter-free',
            model,
            latency: Date.now() - start,
            tokens: data.usage
          };
        }
      } catch (e) {
        // Try next model
      }
    }
    throw new Error('All free OpenRouter models failed');
  }

  private async callPollinationsFree(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const start = Date.now();
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `${options.systemPrompt ? options.systemPrompt + '\n\n' : ''}${prompt}`,
        model: 'gpt-4o',
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return {
      content: data.text || data?.choices?.[0]?.message?.content || '',
      provider: 'pollinations-free',
      model: 'gpt-4o',
      latency: Date.now() - start
    };
  }

  // ============================================
  // PUBLIC API
  // ============================================

  async chat(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const availableProviders = this.providers.filter(p => p.available);
    
    for (const provider of availableProviders) {
      try {
        console.log(`🔄 Trying ${provider.name}...`);
        const result = await provider.call(prompt, options);
        console.log(`✅ ${provider.name} succeeded (${result.latency}ms)`);
        return result;
      } catch (error) {
        console.log(`❌ ${provider.name} failed: ${error.message}`);
        // Continue to next provider
      }
    }
    
    throw new Error('All LLM providers failed');
  }

  // Get status of all providers
  getProviderStatus() {
    return this.providers.map(p => ({
      name: p.name,
      priority: p.priority,
      available: p.available,
      configured: !!process.env[`${p.name.toUpperCase()}_API_KEY`] || p.name.includes('free')
    }));
  }
}

// Export singleton
export const llm = new SmartLLMClient();

// Convenience function
export async function askLLM(prompt: string, options?: LLMOptions) {
  return llm.chat(prompt, options);
}