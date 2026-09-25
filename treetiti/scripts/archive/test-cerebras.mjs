// Test Cerebras with available model
import 'dotenv/config';

async function testCerebras() {
  const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-oss-120b', messages: [{ role: 'user', content: "Say hello in 5 words" }], max_tokens: 50 })
  });
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', data.choices?.[0]?.message?.content || data.error);
}

testCerebras().catch(console.error);