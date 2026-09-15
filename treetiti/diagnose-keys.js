#!/usr/bin/env node
// Diagnostic: What exactly needs fixing for each provider

import 'dotenv/config';

console.log('🔍 LLM PROVIDER KEY DIAGNOSTIC\n');
console.log('='.repeat(60));

const diagnostics = [
  {
    name: 'Cohere',
    status: '✅ WORKING',
    key: process.env.COHERE_API_KEY,
    format: 'cohere_...',
    issue: 'None - works perfectly',
    action: 'Use as primary provider'
  },
  {
    name: 'Mistral AI',
    status: '⚠️ RATE LIMITED',
    key: process.env.MISTRAL_API_KEY,
    format: 'fEW9zWkh...',
    issue: 'HTTP 429 - hit rate limit',
    action: 'Wait 1hr or upgrade plan at console.mistral.ai'
  },
  {
    name: 'Groq',
    status: '❌ WRONG KEY FORMAT',
    key: process.env.GROQ_API_KEY,
    format: 'xai-DFyp... (xAI/Grok key)',
    issue: 'This is an xAI key, not Groq. Groq keys start with gsk_',
    action: 'Get key from console.groq.com/keys (format: gsk_xxx)'
  },
  {
    name: 'Cerebras',
    status: '❌ HTTP 404',
    key: process.env.CEREBRAS_API_KEY,
    format: 'csk-r3xw...',
    issue: 'Endpoint/model may be wrong. Try llama3.1-70b',
    action: 'Check docs at cerebras.ai/docs'
  },
  {
    name: 'DeepSeek',
    status: '⚠️ NO CREDITS',
    key: process.env.DEEPSEEK_API_KEY,
    format: 'sk-1772e7...',
    issue: 'Key valid but insufficient balance',
    action: 'Add credits at platform.deepseek.com'
  },
  {
    name: 'Requesty',
    status: '❌ WRONG KEY FORMAT',
    key: process.env.REQUESTY_API_KEY,
    format: 'llmgtwy_Zr2l... (gateway format)',
    issue: 'Requesty API keys start with sk-, not llmgtwy_',
    action: 'Get key from requesty.ai/dashboard (format: sk_xxx)'
  },
  {
    name: 'Google Gemini',
    status: '❌ WRONG KEY FORMAT',
    key: process.env.GEMINI_API_KEY,
    format: 'AQ.Ab8RN... (OAuth token)',
    issue: 'This is an OAuth token, not an API key. API keys look like: AIzaSy...',
    action: 'Get key from aistudio.google.com/apikey'
  },
  {
    name: 'LockLLM',
    status: '❌ HTTP 404',
    key: process.env.LOCKLLM_API_KEY,
    format: 'ak_956TX...',
    issue: 'Wrong endpoint or service changed',
    action: 'Check lockllm.com/docs for current API'
  },
  {
    name: 'SambaNova',
    status: '⚠️ NEEDS BILLING',
    key: process.env.SAMBANOVA_API_KEY,
    format: 'be786dad... (UUID)',
    issue: 'Key valid but requires payment method',
    action: 'Add billing at cloud.sambanova.ai'
  },
  {
    name: 'Pollinations',
    status: '❌ HTTP 404',
    key: process.env.POLLINATIONS_API_KEY,
    format: 'sk_OedOF...',
    issue: 'Free tier may not need key. Try without auth header',
    action: 'Try: https://text.pollinations.ai/ without key'
  },
  {
    name: 'BFL.ai (Flux)',
    status: '❌ WRONG USE CASE',
    key: process.env.BFL_API_KEY,
    format: 'bfl_XqoS...',
    issue: 'This is for IMAGE generation, not chat',
    action: 'Use for image gen only, different API'
  },
  {
    name: 'Omni Router',
    status: '❌ NETWORK FAIL',
    key: process.env.OMNIROUTER_API_KEY,
    format: 'ci_live_f1...',
    issue: 'Service may be down or endpoint changed',
    action: 'Check omnirouter.ai status'
  }
];

diagnostics.forEach((d, i) => {
  console.log(`\n${i+1}. ${d.name} - ${d.status}`);
  console.log(`   Key: ${d.key ? d.key.substring(0, 20) + '...' : 'MISSING'}`);
  console.log(`   Expected format: ${d.format}`);
  console.log(`   Issue: ${d.issue}`);
  console.log(`   Action: ${d.action}`);
});

console.log('\n' + '='.repeat(60));
console.log('🎯 PRIORITY FIXES:');
console.log('1. Groq:     Get gsk_ key from console.groq.com');
console.log('2. Requesty: Get sk_ key from requesty.ai/dashboard');
console.log('3. Gemini:   Get AIzaSy key from aistudio.google.com/apikey');
console.log('4. DeepSeek: Add credits at platform.deepseek.com');
console.log('5. SambaNova: Add billing at cloud.sambanova.ai');
console.log('\n💡 QUICK WIN: Add OpenAI, Anthropic, OpenRouter keys for best reliability');