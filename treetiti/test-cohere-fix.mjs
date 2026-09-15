// Quick fix for Cohere - test with correct endpoint
import 'dotenv/config';

async function testCohere() {
  const res = await fetch('https://api.cohere.ai/v2/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'command-r-plus-08-2024',
      messages: [{ role: 'user', content: "Say hello in 5 words" }],
      max_tokens: 50
    })
  });
  
  console.log('Status:', res.status);
  console.log('Content-Type:', res.headers.get('content-type'));
  
  const text = await res.text();
  console.log('Raw response (first 500):', text.substring(0, 500));
  
  try {
    const data = JSON.parse(text);
    console.log('Parsed:', data.message?.content?.[0]?.text || data);
  } catch (e) {
    console.log('Not JSON - likely rate limit HTML page');
  }
}

testCohere().catch(console.error);