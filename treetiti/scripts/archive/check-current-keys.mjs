import 'dotenv/config';

console.log('=== CURRENT KEYS IN .ENV ===');
console.log('REQUESTY_API_KEY:', process.env.REQUESTY_API_KEY?.substring(0, 30));
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY?.substring(0, 30));
console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY?.substring(0, 30));
console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY?.substring(0, 30));
console.log('');
console.log('=== KEY FORMATS ===');
console.log('Requesty: Should be sk-xxx (not llmgtwy_)');
console.log('Gemini: Should be AIzaSy... (not AQ.Ab8...)');
console.log('OpenRouter: Should be sk-or-v1-xxx (not placeholder)');
console.log('DeepSeek: sk-... (has key, needs credits)');