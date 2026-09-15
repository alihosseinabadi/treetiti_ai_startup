// Check OpenRouter free models without auth
import 'dotenv/config';

async function checkOpenRouter() {
  const res = await fetch('https://openrouter.ai/api/v1/models');
  const data = await res.json();
  const freeModels = data.data?.filter(m => m.pricing?.prompt === 0 && m.pricing?.completion === 0) || [];
  console.log('Free models on OpenRouter:');
  freeModels.slice(0, 10).forEach(m => console.log('  -', m.id));
}

checkOpenRouter().catch(console.error);