// Quick model check for Groq - test compound
import 'dotenv/config';

async function testGroq() {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'groq/compound', messages: [{ role: 'user', content: "Say hello in 5 words" }], max_tokens: 50 })
  });
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', data.choices?.[0]?.message?.content || data.error);
}

testGroq().catch(console.error);