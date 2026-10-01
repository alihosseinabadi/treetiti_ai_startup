// Test OpenRouter free models
import 'dotenv/config';

async function testOpenRouterFree() {
  const freeModels = [
    'nex-agi/nex-n2.5-pro:free',
    'nex-agi/nex-n2.5-mini:free',
    'inclusionai/ling-3.0-flash-vl:free',
    'inclusionai/ling-3.0-flash-sante:free'
  ];

  for (const model of freeModels) {
    console.log(`\nTesting ${model}...`);
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'HTTP-Referer': 'https://treetiti.com', 'X-Title': 'Treetiti' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: "Say hello in 5 words" }], max_tokens: 50 })
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    if (res.status === 200) {
      console.log(`Response: ${data.choices?.[0]?.message?.content}`);
      break;
    } else {
      console.log(`Error: ${data.error?.message}`);
    }
  }
}

testOpenRouterFree().catch(console.error);