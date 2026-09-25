import 'dotenv/config';

async function testOpenRouter() {
  console.log('\n=== TESTING OPENROUTER (NEW KEY) ===');
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
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

async function testOpenRouterPaid() {
  console.log('\n=== TESTING OPENROUTER PAID (NEW KEY) ===');
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
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

testOpenRouter().then(() => testOpenRouterPaid()).catch(console.error);