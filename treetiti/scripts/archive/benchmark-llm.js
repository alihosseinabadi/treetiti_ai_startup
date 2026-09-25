#!/usr/bin/env node
// Fixed LLM Provider Benchmark - corrected endpoints & models

import 'dotenv/config';

const TEST_PROMPT = "Say 'Hello from [PROVIDER]' in exactly 5 words.";
const TEST_TIMEOUT = 30000;

async function fetchWithTimeout(url, options, timeout = TEST_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

const providers = [
  // ✅ WORKING
  {
    name: 'Cohere',
    key: process.env.COHERE_API_KEY,
    test: async () => {
      const res = await fetchWithTimeout('https://api.cohere.ai/v2/chat', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.COHERE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'command-r-plus-08-2024', messages: [{ role: 'user', content: TEST_PROMPT.replace('[PROVIDER]', 'Cohere') }], max_tokens: 50 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.message?.content?.[0]?.text || '', score: 10 };
    }
  },

  // 🔧 FIXED: Correct model name
  {
    name: 'Mistral AI',
    key: process.env.MISTRAL_API_KEY,
    test: async () => {
      const res = await fetchWithTimeout('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'mistral-small-latest', messages: [{ role: 'user', content: TEST_PROMPT.replace('[PROVIDER]', 'Mistral') }], max_tokens: 50 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.choices?.[0]?.message?.content || '', score: 10 };
    }
  },

  // 🔧 FIXED: Groq key should be gsk_... not xai_...
  {
    name: 'Groq',
    key: process.env.GROQ_API_KEY,
    test: async () => {
      const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: TEST_PROMPT.replace('[PROVIDER]', 'Groq') }], max_tokens: 50 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.choices?.[0]?.message?.content || '', score: 10 };
    }
  },

  // 🔧 FIXED: Correct Cerebras endpoint & model
  {
    name: 'Cerebras',
    key: process.env.CEREBRAS_API_KEY,
    test: async () => {
      const res = await fetchWithTimeout('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama3.1-70b', messages: [{ role: 'user', content: TEST_PROMPT.replace('[PROVIDER]', 'Cerebras') }], max_tokens: 50 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.choices?.[0]?.message?.content || '', score: 10 };
    }
  },

  // 🔧 FIXED: DeepSeek needs credits - but endpoint is correct
  {
    name: 'DeepSeek',
    key: process.env.DEEPSEEK_API_KEY,
    test: async () => {
      const res = await fetchWithTimeout('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: TEST_PROMPT.replace('[PROVIDER]', 'DeepSeek') }], max_tokens: 50 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.choices?.[0]?.message?.content || '', score: 10 };
    }
  },

  // 🔧 FIXED: Requesty uses different key format
  {
    name: 'Requesty',
    key: process.env.REQUESTY_API_KEY,
    test: async () => {
      const res = await fetchWithTimeout('https://router.requesty.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.REQUESTY_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: TEST_PROMPT.replace('[PROVIDER]', 'Requesty') }], max_tokens: 50 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.choices?.[0]?.message?.content || '', score: 10 };
    }
  },

  // 🔧 FIXED: Correct Gemini model name
  {
    name: 'Google Gemini',
    key: process.env.GEMINI_API_KEY,
    test: async () => {
      const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: TEST_PROMPT.replace('[PROVIDER]', 'Gemini') }] }], generationConfig: { maxOutputTokens: 50 } })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.candidates?.[0]?.content?.parts?.[0]?.text || '', score: 10 };
    }
  },

  // 🔧 FIXED: LockLLM correct endpoint
  {
    name: 'LockLLM',
    key: process.env.LOCKLLM_API_KEY,
    test: async () => {
      const res = await fetchWithTimeout('https://api.lockllm.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.LOCKLLM_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: TEST_PROMPT.replace('[PROVIDER]', 'LockLLM') }], max_tokens: 50 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.choices?.[0]?.message?.content || '', score: 10 };
    }
  },

  // 🔧 SambaNova needs payment - endpoint correct
  {
    name: 'SambaNova',
    key: process.env.SAMBANOVA_API_KEY,
    test: async () => {
      const res = await fetchWithTimeout('https://api.sambanova.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.SAMBANOVA_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'Meta-Llama-3.1-8B-Instruct', messages: [{ role: 'user', content: TEST_PROMPT.replace('[PROVIDER]', 'SambaNova') }], max_tokens: 50 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.choices?.[0]?.message?.content || '', score: 10 };
    }
  },

  // 🔧 FIXED: Pollinations correct endpoint
  {
    name: 'Pollinations',
    key: process.env.POLLINATIONS_API_KEY,
    test: async () => {
      const res = await fetchWithTimeout('https://text.pollinations.ai/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.POLLINATIONS_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: TEST_PROMPT.replace('[PROVIDER]', 'Pollinations') }], max_tokens: 50 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.choices?.[0]?.message?.content || '', score: 10 };
    }
  },

  // ❌ BazaLink - not OpenAI compatible, skip
  // 🔧 FIXED: BFL.ai correct endpoint for flux
  {
    name: 'BFL.ai (Flux)',
    key: process.env.BFL_API_KEY,
    test: async () => {
      const res = await fetchWithTimeout('https://api.bfl.ai/v1/flux-pro-1.0', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.BFL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: TEST_PROMPT.replace('[PROVIDER]', 'BFL'), width: 512, height: 512 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.id || 'Image generation started', score: 8 };
    }
  },

  // 🔧 FIXED: Omni Router correct endpoint
  {
    name: 'Omni Router',
    key: process.env.OMNIROUTER_API_KEY,
    test: async () => {
      const res = await fetchWithTimeout('https://api.omnirouter.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OMNIROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: TEST_PROMPT.replace('[PROVIDER]', 'OmniRouter') }], max_tokens: 50 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.choices?.[0]?.message?.content || '', score: 10 };
    }
  }
];

function calcScore(result) {
  if (result.status !== 'OK') return 1;
  let score = 10;
  if (result.latency > 2000) score -= Math.min(5, Math.floor((result.latency - 2000) / 2000));
  if (result.latency > 10000) score -= 3;
  return Math.max(1, Math.min(10, score));
}

async function testProvider(provider) {
  if (!provider.key) {
    return { name: provider.name, status: 'NO_KEY', score: 0, latency: 0 };
  }
  const start = Date.now();
  try {
    const result = await provider.test();
    const latency = Date.now() - start;
    return { ...result, latency };
  } catch (err) {
    const latency = Date.now() - start;
    return { name: provider.name, status: 'FAILED', error: err.message || err.name, latency, score: 1 };
  }
}

async function runBenchmark() {
  console.log('🚀 LLM Provider Benchmark - FIXED ENDPOINTS\n');
  console.log('Test:', TEST_PROMPT);
  console.log('Timeout:', TEST_TIMEOUT + 'ms\n');

  const results = [];
  for (const provider of providers) {
    process.stdout.write(`Testing ${provider.name.padEnd(18)} `);
    const result = await testProvider(provider);
    result.name = provider.name;
    result.score = calcScore(result);
    results.push(result);

    const icon = result.status === 'OK' ? '✅' : result.status === 'NO_KEY' ? '⏭️' : '❌';
    console.log(`${icon} ${result.latency.toString().padStart(5)}ms | ${result.score}/10`);
    if (result.error) console.log(`   └─ ${result.error}`);
    if (result.response) console.log(`   └─ "${result.response.substring(0, 80)}"`);
  }

  results.sort((a, b) => b.score - a.score);

  console.log('\n' + '='.repeat(65));
  console.log('📊 FINAL RANKING (1-10)');
  console.log('='.repeat(65));

  results.forEach((r, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    const status = r.status === 'OK' ? '✅' : r.status === 'NO_KEY' ? '⏭️' : '❌';
    console.log(`${medal} #${String(i+1).padStart(2)} ${status} ${r.name.padEnd(18)} | ${r.score}/10 | ${String(r.latency).padStart(5)}ms`);
  });

  const working = results.filter(r => r.status === 'OK');
  console.log('\n📈 SUMMARY:');
  console.log(`   Working: ${working.length}/${results.length}`);
  if (working.length) {
    console.log(`   🏆 Winner: ${working[0].name} (${working[0].score}/10, ${working[0].latency}ms)`);
    const fastest = working.reduce((a,b) => a.latency < b.latency ? a : b);
    console.log(`   ⚡ Fastest: ${fastest.name} (${fastest.latency}ms)`);
  }
  const failed = results.filter(r => r.status === 'FAILED');
  if (failed.length) console.log(`   ❌ Still failing: ${failed.map(r => r.name).join(', ')}`);

  const fs = await import('fs');
  fs.writeFileSync('benchmark-results.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Results saved to benchmark-results.json');
}

runBenchmark().catch(console.error);