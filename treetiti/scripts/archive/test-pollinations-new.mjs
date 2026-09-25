// Test Pollinations new API
import 'dotenv/config';

async function testPollinations() {
  // New API format from enter.pollinations.ai
  console.log('--- Testing Pollinations new API ---');
  
  // Try the new API
  let res = await fetch('https://api.pollinations.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: "Say hello in 5 words" }], max_tokens: 50 })
  });
  let data = await res.json();
  console.log('Method 1 (api.pollinations.ai):', res.status, data.choices?.[0]?.message?.content || data.error);

  // Try text.pollinations.ai with different model
  res = await fetch('https://text.pollinations.ai/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'user', content: "Say hello in 5 words" }], max_tokens: 50 })
  });
  data = await res.json();
  console.log('Method 2 (text.pollinations.ai gpt-4o):', res.status, data.choices?.[0]?.message?.content || data.error);

  // Try with mistral
  res = await fetch('https://text.pollinations.ai/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'mistral', messages: [{ role: 'user', content: "Say hello in 5 words" }], max_tokens: 50 })
  });
  data = await res.json();
  console.log('Method 3 (text.pollinations.ai mistral):', res.status, data.choices?.[0]?.message?.content || data.error);
}

testPollinations().catch(console.error);