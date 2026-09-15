// Test Cohere v2 with correct model
import 'dotenv/config';

async function testCohereFixed() {
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
  
  console.log('v2 Status:', res.status);
  console.log('Content-Type:', res.headers.get('content-type'));
  const text = await res.text();
  console.log('v2 Response:', text.substring(0, 500));
  
  try {
    const data = JSON.parse(text);
    console.log('v2 Parsed:', data.message?.content?.[0]?.text || data);
  } catch (e) {
    console.log('v2 Not JSON');
  }
}

testCohereFixed().catch(console.error);