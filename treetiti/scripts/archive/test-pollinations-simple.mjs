// Test Pollinations - check what works
import 'dotenv/config';

async function testPollinations() {
  // Try different endpoints
  const endpoints = [
    'https://text.pollinations.ai/',
    'https://text.pollinations.ai/openai/v1/chat/completions',
    'https://api.pollinations.ai/v1/chat/completions',
    'https://pollinations.ai/api/chat/completions'
  ];

  for (const url of endpoints) {
    try {
      console.log(`\nTrying ${url}...`);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: "Say hello in 5 words", max_tokens: 50 })
      });
      const text = await res.text();
      console.log(`Status: ${res.status}`);
      console.log(`Response (first 200): ${text.substring(0, 200)}`);
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
}

testPollinations().catch(console.error);