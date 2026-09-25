// Test the EXACT keys user provided to prove format issues
import 'dotenv/config';

async function testRequesty() {
  console.log('\n=== TESTING REQUESTY (llmgtwy_ format) ===');
  const res = await fetch('https://router.requesty.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.REQUESTY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }], max_tokens: 10 })
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

async function testGemini() {
  console.log('\n=== TESTING GEMINI (AQ.Ab8 format) ===');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 10 } })
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

async function testOpenRouter() {
  console.log('\n=== TESTING OPENROUTER (placeholder) ===');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'HTTP-Referer': 'https://treetiti.com' },
    body: JSON.stringify({ model: 'nex-agi/nex-n2.5-pro:free', messages: [{ role: 'user', content: 'hi' }], max_tokens: 10 })
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

async function testDeepSeek() {
  console.log('\n=== TESTING DEEPSEEK (sk- format) ===');
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: 'hi' }], max_tokens: 10 })
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

testRequesty().then(() => testGemini()).then(() => testOpenRouter()).then(() => testDeepSeek()).catch(console.error);