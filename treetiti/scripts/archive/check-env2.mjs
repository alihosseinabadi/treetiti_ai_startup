import 'dotenv/config';
const keys = Object.keys(process.env).filter(k => 
  k.includes('CEREBRAS') || k.includes('LOCKLLM') || 
  k.includes('POLLINATIONS') || k.includes('BFL_') || 
  k.includes('OMNIROUTER') || k.includes('SAMBA') || 
  k.includes('DEEPSEEK') || k.includes('REQUESTY') ||
  k.includes('GEMINI') || k.includes('GROQ') || k.includes('MISTRAL')
);
keys.forEach(k => console.log(k, ':', process.env[k]?.substring(0, 30)));