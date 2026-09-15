@echo off
REM ============================================
REM FIX ALL FREE PROVIDERS - Run from Windows with VPN
REM ============================================

cd /d "C:\Users\ali hosseinabadi\our_company\treetiti"

echo.
echo ============================================
echo TESTING ALL FREE PROVIDERS FROM WINDOWS (VPN)
echo ============================================
echo.

REM Test each provider directly with corrected keys
echo 1. Testing GROQ (free)...
node -e "
const fetch = require('fetch');
const apiKey = process.env.GROQ_KEY; // SECURITY: key removed from source - read from env
fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'groq/compound', messages: [{ role: 'user', content: 'hi' }], max_tokens: 10 })
}).then(r => r.json()).then(d => console.log('GROQ:', d.choices?.[0]?.message?.content || d.error)).catch(e => console.log('GROQ ERROR:', e.message));
"

echo.
echo 2. Testing COHERE (free)...
node -e "
const apiKey = process.env.COHERE_KEY; // SECURITY: key removed from source - read from env
fetch('https://api.cohere.ai/v2/chat', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'command-r-plus-08-2024', messages: [{ role: 'user', content: 'hi' }], max_tokens: 10 })
}).then(r => r.json()).then(d => console.log('COHERE:', d.message?.content?.[0]?.text || d.error)).catch(e => console.log('COHERE ERROR:', e.message));
"

echo.
echo 3. Testing OPENROUTER FREE (no key needed)...
node -e "
fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'HTTP-Referer': 'https://treetiti.com', 'X-Title': 'Treetiti' },
  body: JSON.stringify({ model: 'nex-agi/nex-n2.5-pro:free', messages: [{ role: 'user', content: 'hi' }], max_tokens: 10 })
}).then(r => r.json()).then(d => console.log('OPENROUTER FREE:', d.choices?.[0]?.message?.content || d.error)).catch(e => console.log('OPENROUTER FREE ERROR:', e.message));
"

echo.
echo 4. Testing OPENROUTER PAID (with your new key)...
node -e "
const apiKey = process.env.OPENROUTER_KEY; // SECURITY: key removed from source - read from env
fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://treetiti.com', 'X-Title': 'Treetiti' },
  body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }], max_tokens: 10 })
}).then(r => r.json()).then(d => console.log('OPENROUTER PAID:', d.choices?.[0]?.message?.content || d.error)).catch(e => console.log('OPENROUTER PAID ERROR:', e.message));
"

echo.
echo ============================================
echo FIXING KEY FORMATS IN .ENV
echo ============================================

echo.
echo Current broken keys:
echo REQUESTY: llmgtwy_... (needs sk-...)
echo GEMINI: AQ.Ab8... (needs AIzaSy...)
echo.
echo Please provide corrected keys or I'll mark as needing fix.

pause