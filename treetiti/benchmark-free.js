#!/usr/bin/env node
// Free-tier focused benchmark - correct models & endpoints

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
  // ✅ WORKING - Cohere (free tier)
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

  // ✅ FIXED: Groq - correct free model
  {
    name: 'Groq',
    key: process.env.GROQ_API_KEY,
    test: async () => {
      const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: TEST_PROMPT.replace('[PROVIDER]', 'Groq') }], max_tokens: 50 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.choices?.[0]?.message?.content || '', score: 10 };
    }
  },

  // ✅ FIXED: Cerebras - correct model
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

  // ⚠️ DeepSeek - needs credits (user says works)
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

  // ❌ Requesty - wrong key format
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

  // ✅ FIXED: Google Gemini - correct model
  {
    name: 'Google Gemini',
    key: process.env.GEMINI_API_KEY,
    test: async () => {
      // Try with flash model
      const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: TEST_PROMPT.replace('[PROVIDER]', 'Gemini') }] }], generationConfig: { maxOutputTokens: 50 } })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.candidates?.[0]?.content?.parts?.[0]?.text || '', score: 10 };
    }
  },

  // ❌ LockLLM - endpoint issue
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

  // ⚠️ SambaNova - needs billing
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

  // ✅ FIXED: Pollinations - no auth needed for free tier
  {
    name: 'Pollinations (Free)',
    key: null, // No key needed
    test: async () => {
      const res = await fetchWithTimeout('https://text.pollinations.ai/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: TEST_PROMPT.replace('[PROVIDER]', 'Pollinations') }], max_tokens: 50 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.choices?.[0]?.message?.content || '', score: 10 };
    }
  },

  // ❌ BazaLink - skip (not compatible)

  // ❌ BFL.ai - image gen only
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

  // ❌ Omni Router - network fail
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
  },

  // 🆕 FREE GATEWAYS (no key needed)
  {
    name: 'OpenRouter (Free)',
    key: null,
    test: async () => {
      const res = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'HTTP-Referer': 'https://treetiti.com', 'X-Title': 'Treetiti' },
        body: JSON.stringify({ model: 'meta-llama/llama-3.1-8b-instruct:free', messages: [{ role: 'user', content: TEST_PROMPT.replace('[PROVIDER]', 'OpenRouter') }], max_tokens: 50 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.choices?.[0]?.message?.content || '', score: 10 };
    }
  },

  {
    name: 'Pollinations Alt',
    key: null,
    test: async () => {
      const res = await fetchWithTimeout('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: TEST_PROMPT.replace('[PROVIDER]', 'Pollinations'), model: 'gpt-4o', max_tokens: 50 })
      });
      const data = await res.json();
      return { status: 'OK', response: data.text || data, score: 8 };
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
  if (!provider.key && provider.key !== null) {
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
  console.log('🚀 FREE-TIER LLM PROVIDER BENCHMARK\n');

  const results = [];
  for (const provider of providers) {
    process.stdout.write(`Testing ${provider.name.padEnd(22)} `);
    const result = await testProvider(provider);
    result.name = provider.name;
    result.score = calcScore(result);
    results.push(result);

    const icon = result.status === 'OK' ? '✅' : result.status === 'NO_KEY' ? '⏭️' : '❌';
    console.log(`${icon} ${result.latency.toString().padStart(5)}ms | ${result.score}/10`);
    if (result.error) console.log(`   └─ ${result.error}`);
    if (result.response) console.log(`   └─ "${String(result.response).substring(0, 80)}"`);
  }

  results.sort((a, b) => b.score - a.score);

  console.log('\n' + '='.repeat(70));
  console.log('📊 FREE-TIER RANKING (1-10)');
  console.log('='.repeat(70));

  results.forEach((r, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    const status = r.status === 'OK' ? '✅' : r.status === 'NO_KEY' ? '⏭️' : '❌';
    console.log(`${medal} #${String(i+1).padStart(2)} ${status} ${r.name.padEnd(22)} | ${r.score}/10 | ${String(r.latency).padStart(5)}ms`);
  });

  const working = results.filter(r => r.status === 'OK');
  console.log('\n📈 SUMMARY:');
  console.log(`   Working: ${working.length}/${results.length}`);
  if (working.length) {
    console.log(`   🏆 Winner: ${working[0].name} (${working[0].score}/10, ${working[0].latency}ms)`);
    const fastest = working.reduce((a,b) => a.latency < b.latency ? a : b);
    console.log(`   ⚡ Fastest: ${fastest.name} (${fastest.latency}ms)`);
  }
  const freeTier = results.filter(r => r.key === null && r.status === 'OK');
  if (freeTier.length) console.log(`   🆓 Free (no key): ${freeTier.map(r => r.name).join(', ')}`);

  const fs = await import('fs');
  fs.writeFileSync('benchmark-free-results.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Results saved to benchmark-free-results.json');
}

runBenchmark().catch(console.error);