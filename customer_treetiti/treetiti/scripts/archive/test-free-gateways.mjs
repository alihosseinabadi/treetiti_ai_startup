// Test free gateways
import 'dotenv/config';

async function testPollinations() {
  console.log('\n--- Testing Pollinations (free) ---');
  // Method 1: OpenAI-compatible
  let res = await fetch('https://text.pollinations.ai/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: "Say hello in 5 words" }], max_tokens: 50 })
  });
  let data = await res.json();
  console.log('Method 1 (OpenAI compat):', res.status, data.choices?.[0]?.message?.content || data.error);

  // Method 2: Direct
  res = await fetch('https://text.pollinations.ai/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: "Say hello in 5 words", model: 'gpt-4o', max_tokens: 50 })
  });
  data = await res.json();
  console.log('Method 2 (Direct):', res.status, data.text || data);
}

async function testOpenRouter() {
  console.log('\n--- Testing OpenRouter (free) ---');
  // Try free models
  const freeModels = [
    'meta-llama/llama-3.1-8b-instruct:free',
    'microsoft/phi-3-mini-128k-instruct:free',
    'google/gemma-2-9b-it:free',
    'qwen/qwen-2.5-7b-instruct:free'
  ];

  for (const model of freeModels) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'HTTP-Referer': 'https://treetiti.com', 'X-Title': 'Treetiti' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: "Say hello in 5 words" }], max_tokens: 50 })
    });
    const data = await res.json();
    console.log(`Model: ${model} - Status: ${res.status} - ${data.choices?.[0]?.message?.content || data.error?.message || 'OK'}`);
    if (res.status === 200) break;
  }
}

async function testGemini() {
  console.log('\n--- Testing Gemini ---');
  const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'];
  for (const model of models) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Say hello in 5 words" }] }], generationConfig: { maxOutputTokens: 50 } })
    });
    const data = await res.json();
    console.log(`Model: ${model} - Status: ${res.status} - ${data.candidates?.[0]?.content?.parts?.[0]?.text || data.error?.message || 'OK'}`);
    if (res.status === 200) break;
  }
}

testPollinations().then(() => testOpenRouter()).then(() => testGemini()).catch(console.error);