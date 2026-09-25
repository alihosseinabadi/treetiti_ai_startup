import 'dotenv/config';

async function testDirect() {
  console.log('=== DIRECT FETCH TESTS ===\n');
  
  // Test Groq
  console.log('1. Testing Groq...');
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        model: 'groq/compound', 
        messages: [{ role: 'user', content: 'hi' }], 
        max_tokens: 10 
      })
    });
    console.log('   Status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('   Response:', data.choices?.[0]?.message?.content);
    } else {
      const err = await res.json();
      console.log('   Error:', err);
    }
  } catch (e) {
    console.log('   Fetch Error:', e.message);
  }

  // Test Cohere
  console.log('\n2. Testing Cohere...');
  try {
    const res = await fetch('https://api.cohere.ai/v2/chat', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${process.env.COHERE_API_KEY}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        model: 'command-r-plus-08-2024', 
        messages: [{ role: 'user', content: 'hi' }], 
        max_tokens: 10 
      })
    });
    console.log('   Status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('   Response:', data.message?.content?.[0]?.text);
    } else {
      const err = await res.json();
      console.log('   Error:', err);
    }
  } catch (e) {
    console.log('   Fetch Error:', e.message);
  }

  // Test OpenRouter Full (with auth)
  console.log('\n3. Testing OpenRouter Full (with auth)...');
  try {
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
        messages: [{ role: 'user', content: 'hi' }], 
        max_tokens: 10 
      })
    });
    console.log('   Status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('   Response:', data.choices?.[0]?.message?.content);
    } else {
      const err = await res.json();
      console.log('   Error:', err);
    }
  } catch (e) {
    console.log('   Fetch Error:', e.message);
  }

  // Test OpenRouter Free (no auth)
  console.log('\n4. Testing OpenRouter Free (no auth)...');
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://treetiti.com',
        'X-Title': 'Treetiti'
      },
      body: JSON.stringify({ 
        model: 'nex-agi/nex-n2.5-pro:free', 
        messages: [{ role: 'user', content: 'hi' }], 
        max_tokens: 10 
      })
    });
    console.log('   Status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('   Response:', data.choices?.[0]?.message?.content);
    } else {
      const err = await res.json();
      console.log('   Error:', err);
    }
  } catch (e) {
    console.log('   Fetch Error:', e.message);
  }
}

testDirect().catch(console.error);