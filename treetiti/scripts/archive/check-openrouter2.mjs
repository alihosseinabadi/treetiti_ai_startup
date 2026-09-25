// Check OpenRouter all models
import 'dotenv/config';

async function checkOpenRouter() {
  const res = await fetch('https://openrouter.ai/api/v1/models');
  const data = await res.json();
  console.log('Total models:', data.data?.length);
  data.data?.slice(0, 20).forEach(m => console.log('  -', m.id, '| pricing:', m.pricing));
}

checkOpenRouter().catch(console.error);