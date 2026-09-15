// Quick model check for Groq
import 'dotenv/config';

async function checkGroqModels() {
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }
  });
  const data = await res.json();
  console.log('Groq Models:');
  data.data?.forEach(m => console.log('  -', m.id));
}

checkGroqModels().catch(console.error);