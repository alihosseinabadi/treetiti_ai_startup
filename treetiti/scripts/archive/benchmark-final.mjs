// FINAL WORKING BENCHMARK - with correct models
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

  // ✅ WORKING - Groq (new key, correct model)
  {
    name: 'Groq',
    key: process.env.GROQ_API_KEY,
    test: async () => {
      const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'groq/compound', messages: [{ role: 'user', content: TEST_PROMPT.replace('[PROVIDER]', 'Groq') }], max_tokens: 50 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.choices?.[0]?.message?.content || '', score: 10 };
    }
  },

  // ⚠️ Cerebras - payment required (402)
  {
    name: 'Cerebras',
    key: process.env.CEREBRAS_API_KEY,
    test: async () => {
      const res = await fetchWithTimeout('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-oss-120b', messages: [{ role: 'user', content: TEST_PROMPT.replace('[PROVIDER]', 'Cerebras') }], max_tokens: 50 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.choices?.[0]?.message?.content || '', score: 10 };
    }
  },

  // ⚠️ DeepSeek - needs credits
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

  // ❌ Requesty - wrong key format (llmgtwy_ not sk_)
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

  // ❌ Google Gemini - wrong key (OAuth token not API key)
  {
    name: 'Google Gemini',
    key: process.env.GEMINI_API_KEY,
    test: async () => {
      const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: TEST_PROMPT.replace('[PROVIDER]', 'Gemini') }] }], generationConfig: { maxOutputTokens: 50 } })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.candidates?.[0]?.content?.parts?.[0]?.text || '', score: 10 };
    }
  },

  // ❌ LockLLM - 404
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

  // ❌ Pollinations - now paid (402)
  {
    name: 'Pollinations',
    key: process.env.POLLINATIONS_API_KEY,
    test: async () => {
      const res = await fetchWithTimeout('https://text.pollinations.ai/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.POLLINATIONS_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'user', content: TEST_PROMPT.replace('[PROVIDER]', 'Pollinations') }], max_tokens: 50 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.choices?.[0]?.message?.content || '', score: 10 };
    }
  },

  // 🆓 FREE: OpenRouter (needs API key)
  {
    name: 'OpenRouter (free tier)',
    key: process.env.OPENROUTER_API_KEY,
    test: async () => {
      const res = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://treetiti.com' },
        body: JSON.stringify({ model: 'nex-agi/nex-n2.5-pro:free', messages: [{ role: 'user', content: TEST_PROMPT.replace('[PROVIDER]', 'OpenRouter') }], max_tokens: 50 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      return { status: 'OK', response: data.choices?.[0]?.message?.content || '', score: 10 };
    }
  },

  // ❌ BFL.ai - image gen only
  // ❌ Omni Router - network fail
];

function calcScore(result) {
  if (result.status !== 'OK') return 1;
  let score = 10;
  if (result.latency > 2000) score -= Math.min(5, Math.floor((result.latency - 2000) / 2000));
  return Math.max(1, Math.min(10, score));
}

async function testProvider(provider) {
  if (!provider.key) return { name: provider.name, status: 'NO_KEY', score: 0, latency: 0 };
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
  console.log('🚀 FINAL FREE-TIER BENCHMARK\n');
  const results = [];

  for (const provider of providers) {
    process.stdout.write(`Testing ${provider.name.padEnd(24)} `);
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
  console.log('📊 FINAL FREE-TIER RANKING (1-10)');
  console.log('='.repeat(70));

  results.forEach((r, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    const status = r.status === 'OK' ? '✅' : r.status === 'NO_KEY' ? '⏭️' : '❌';
    console.log(`${medal} #${String(i+1).padStart(2)} ${status} ${r.name.padEnd(24)} | ${r.score}/10 | ${String(r.latency).padStart(5)}ms`);
  });

  const working = results.filter(r => r.status === 'OK');
  console.log('\n📈 SUMMARY:');
  console.log(`   ✅ Working: ${working.length}/${results.length}`);
  working.forEach((w, i) => console.log(`   ${i+1}. ${w.name} - ${w.score}/10 - ${w.latency}ms`));
  
  const needFix = results.filter(r => r.status === 'FAILED');
  console.log(`\n   ⚠️  Need fixes:`);
  needFix.forEach(f => console.log(`   - ${f.name}: ${f.error}`));

  const noKey = results.filter(r => r.status === 'NO_KEY');
  if (noKey.length) console.log(`   ⏭️  Need keys: ${noKey.map(r => r.name).join(', ')}`);
}

runBenchmark().catch(console.error);