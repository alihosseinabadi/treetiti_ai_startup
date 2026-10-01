// Test with explicit proxy check
import 'dotenv/config';

async function testWithProxy() {
  console.log('Testing with explicit connection check...\n');
  
  // Test basic connectivity
  console.log('1. Testing basic connectivity to Google...');
  try {
    const res = await fetch('https://www.google.com', { method: 'HEAD' });
    console.log('   Google:', res.ok ? '✅ Connected' : '❌ Failed');
  } catch (e) {
    console.log('   Google:', e.message);
  }

  console.log('\n2. Testing connectivity to api.groq.com...');
  try {
    const res = await fetch('https://api.groq.com', { method: 'HEAD' });
    console.log('   Groq:', res.ok ? '✅ Connected' : '❌ Failed');
  } catch (e) {
    console.log('   Groq:', e.message);
  }

  console.log('\n3. Testing connectivity to openrouter.ai...');
  try {
    const res = await fetch('https://openrouter.ai', { method: 'HEAD' });
    console.log('   OpenRouter:', res.ok ? '✅ Connected' : '❌ Failed');
  } catch (e) {
    console.log('   OpenRouter:', e.message);
  }

  console.log('\n4. Testing Groq with longer timeout...');
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        model: 'groq/compound', 
        messages: [{ role: 'user', content: 'hi' }], 
        max_tokens: 5 
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    console.log('   Groq API:', res.ok ? '✅ Works' : `❌ ${res.status}`);
    if (!res.ok) console.log('   Error:', await res.text());
  } catch (e) {
    console.log('   Groq API:', e.name === 'AbortError' ? '⏱️ Timeout' : e.message);
  }

  console.log('\n5. Testing OpenRouter with longer timeout...');
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
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
        max_tokens: 5 
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    console.log('   OpenRouter API:', res.ok ? '✅ Works' : `❌ ${res.status}`);
    if (!res.ok) console.log('   Error:', await res.text());
  } catch (e) {
    console.log('   OpenRouter API:', e.name === 'AbortError' ? '⏱️ Timeout' : e.message);
  }
}

testWithProxy().catch(console.error);