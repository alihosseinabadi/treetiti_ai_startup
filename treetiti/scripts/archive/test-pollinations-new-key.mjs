// Test Pollinations with new key
import 'dotenv/config';

async function testPollinations() {
  console.log('=== TESTING POLLINATIONS WITH NEW KEY ===\n');
  
  const key = process.env.POLLINATIONS_API_KEY;
  console.log('Key:', key?.substring(0, 20) + '...');
  
  // Test 1: Legacy API with auth
  console.log('\n1. Legacy API with auth header...');
  try {
    const res = await fetch('https://text.pollinations.ai/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        model: 'gpt-4o', 
        messages: [{ role: 'user', content: 'Say hi in 3 words' }], 
        max_tokens: 20 
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', data.choices?.[0]?.message?.content || data.error);
  } catch (e) {
    console.log('Error:', e.message);
  }

  // Test 2: New API at enter.pollinations.ai
  console.log('\n2. New API (enter.pollinations.ai)...');
  try {
    const res = await fetch('https://enter.pollinations.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        model: 'gpt-4o', 
        messages: [{ role: 'user', content: 'Say hi in 3 words' }], 
        max_tokens: 20 
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', data.choices?.[0]?.message?.content || data.error);
  } catch (e) {
    console.log('Error:', e.message);
  }

  // Test 3: Without auth (free tier)
  console.log('\n3. Without auth (free tier)...');
  try {
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: 'Say hi in 3 words',
        model: 'gpt-4o',
        max_tokens: 20
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', data.text || data.choices?.[0]?.message?.content || data.error);
  } catch (e) {
    console.log('Error:', e.message);
  }
}

testPollinations().catch(console.error);