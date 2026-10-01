// Test Cohere v1 API
import 'dotenv/config';

async function testCohereV1() {
  const res = await fetch('https://api.cohere.ai/v1/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'command-r-plus',
      message: "Say hello in 5 words",
      max_tokens: 50
    })
  });
  
  console.log('v1 Status:', res.status);
  const text = await res.text();
  console.log('v1 Response:', text.substring(0, 500));
  
  try {
    const data = JSON.parse(text);
    console.log('v1 Parsed:', data.text || data);
  } catch (e) {
    console.log('v1 Not JSON');
  }
}

testCohereV1().catch(console.error);