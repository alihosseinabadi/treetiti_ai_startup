// Check Cerebras models
import 'dotenv/config';

async function checkCerebras() {
  const res = await fetch('https://api.cerebras.ai/v1/models', {
    headers: { 'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}` }
  });
  const data = await res.json();
  console.log('Cerebras Models:');
  data.data?.forEach(m => console.log('  -', m.id));
}

checkCerebras().catch(console.error);