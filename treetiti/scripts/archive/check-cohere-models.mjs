// Check available Cohere models
import 'dotenv/config';

async function checkCohereModels() {
  const res = await fetch('https://api.cohere.ai/v1/models', {
    headers: { 'Authorization': `Bearer ${process.env.COHERE_API_KEY}` }
  });
  const data = await res.json();
  console.log('Cohere Models:');
  data.models?.forEach((m) => console.log('  -', m.name, '|', m.endpoints?.join(', ')));
}

checkCohereModels().catch(console.error);