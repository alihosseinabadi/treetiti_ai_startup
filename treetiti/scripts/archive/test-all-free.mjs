// ============================================
// TEST ALL FREE PROVIDERS FROM WINDOWS (VPN)
// ============================================

import 'dotenv/config';

async function testProvider(name, testFn) {
  console.log(`\n🔍 Testing ${name}...`);
  try {
    const start = Date.now();
    const result = await testFn();
    console.log(`✅ ${name}: ${Date.now() - start}ms`);
    console.log(`   "${result.substring(0, 80)}"`);
    return { name, status: 'WORKS', latency: Date.now() - start };
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return { name, status: 'FAILED', error: error.message };
  }
}

async function runAllTests() {
  console.log('============================================');
  console.log('TESTING ALL FREE PROVIDERS FROM WINDOWS (VPN)');
  console.log('============================================\n');

  const results = [];

  // 1. GROQ - Free tier
  results.push(await testProvider('GROQ (free)', async () => {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        model: 'groq/compound', 
        messages: [{ role: 'user', content: 'Say hi in 3 words' }], 
        max_tokens: 20 
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No content';
  }));

  // 2. COHERE - Free tier
  results.push(await testProvider('COHERE (free)', async () => {
    const res = await fetch('https://api.cohere.ai/v2/chat', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${process.env.COHERE_API_KEY}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        model: 'command-r-plus-08-2024', 
        messages: [{ role: 'user', content: 'Say hi in 3 words' }], 
        max_tokens: 20 
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.message?.content?.[0]?.text || 'No content';
  }));

  // 3. OPENROUTER FREE (no key)
  results.push(await testProvider('OPENROUTER FREE (no key)', async () => {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://treetiti.com',
        'X-Title': 'Treetiti'
      },
      body: JSON.stringify({ 
        model: 'nex-agi/nex-n2.5-pro:free', 
        messages: [{ role: 'user', content: 'Say hi in 3 words' }], 
        max_tokens: 20 
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No content';
  }));

  // 4. OPENROUTER PAID (with key)
  results.push(await testProvider('OPENROUTER PAID (with key)', async () => {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://treetiti.com',
        'X-Title': 'Treetiti'
      },
      body: JSON.stringify({ 
        model: 'openai/gpt-4o-mini', 
        messages: [{ role: 'user', content: 'Say hi in 3 words' }], 
        max_tokens: 20 
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No content';
  }));

  // 5. POLLINATIONS FREE
  results.push(await testProvider('POLLINATIONS FREE', async () => {
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: 'Say hi in 3 words',
        model: 'gpt-4o',
        max_tokens: 20
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.text || data.choices?.[0]?.message?.content || 'No content';
  }));

  // 6. GEMINI (if key format fixed)
  if (process.env.GEMINI_API_KEY?.startsWith('AIzaSy')) {
    results.push(await testProvider('GEMINI (fixed key)', async () => {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: 'Say hi in 3 words' }] }], 
          generationConfig: { maxOutputTokens: 20 } 
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No content';
    }));
  } else {
    console.log('\n⚠️  GEMINI: Key needs AIzaSy... format (current: OAuth AQ.Ab8...)');
    results.push({ name: 'GEMINI', status: 'NEEDS_FIX', error: 'Wrong key format' });
  }

  // 7. REQUESTY (if key format fixed)
  if (process.env.REQUESTY_API_KEY?.startsWith('sk-')) {
    results.push(await testProvider('REQUESTY (fixed key)', async () => {
      const res = await fetch('https://router.requesty.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${process.env.REQUESTY_API_KEY}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          model: 'openai/gpt-4o-mini', 
          messages: [{ role: 'user', content: 'Say hi in 3 words' }], 
          max_tokens: 20 
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content || 'No content';
    }));
  } else {
    console.log('\n⚠️  REQUESTY: Key needs sk-... format (current: llmgtwy_...)');
    results.push({ name: 'REQUESTY', status: 'NEEDS_FIX', error: 'Wrong key format' });
  }

  // 8. DEEPSEEK (needs credits)
  results.push(await testProvider('DEEPSEEK (needs credits)', async () => {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        model: 'deepseek-chat', 
        messages: [{ role: 'user', content: 'Say hi in 3 words' }], 
        max_tokens: 20 
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No content';
  }));

  // 9. MISTRAL (rate limited)
  results.push(await testProvider('MISTRAL (rate limited)', async () => {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        model: 'mistral-small-latest', 
        messages: [{ role: 'user', content: 'Say hi in 3 words' }], 
        max_tokens: 20 
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No content';
  }));

  // Summary
  console.log('\n============================================');
  console.log('SUMMARY: FREE PROVIDERS STATUS');
  console.log('============================================');
  
  const working = results.filter(r => r.status === 'WORKS');
  const failed = results.filter(r => r.status === 'FAILED');
  const needsFix = results.filter(r => r.status === 'NEEDS_FIX');
  
  console.log(`\n✅ WORKING (${working.length}):`);
  working.forEach(r => console.log(`   ${r.name} (${r.latency}ms)`));
  
  console.log(`\n❌ FAILED (${failed.length}):`);
  failed.forEach(r => console.log(`   ${r.name}: ${r.error}`));
  
  console.log(`\n🔧 NEEDS KEY FIX (${needsFix.length}):`);
  needsFix.forEach(r => console.log(`   ${r.name}: ${r.error}`));

  console.log('\n============================================');
  console.log('ACTION REQUIRED:');
  console.log('============================================');
  console.log('1. REQUESTY: Get sk-... key from https://requesty.ai/dashboard');
  console.log('2. GEMINI: Get AIzaSy... key from https://aistudio.google.com/apikey');
  console.log('3. DEEPSEEK: Add $10+ credits at https://platform.deepseek.com/');
  console.log('4. MISTRAL: Wait for rate limit or upgrade at https://console.mistral.ai/');
  console.log('5. GROQ: Network issue from this environment');
}

runAllTests().catch(console.error);