// ============================================
// QUICK TEST - Wait for health checks
// ============================================

import 'dotenv/config';
import { getLLMManager, askLLM } from './src/lib/llm';

async function quickTest() {
  console.log('🚀 Quick test - waiting for health checks...\n');
  
  const manager = getLLMManager({ 
    defaultStrategy: 'tiered',
    logLevel: 'info',
    healthCheckInterval: 10000
  });

  // Wait for health checks to complete
  await new Promise(r => setTimeout(r, 15000));

  console.log('\n📋 PROVIDER STATUS AFTER HEALTH CHECKS:');
  const status = await (await import('./src/lib/llm')).getLLMStatus();
  status.forEach(s => {
    const icon = s.status === 'healthy' ? '✅' : s.status === 'degraded' ? '⚠️' : s.status === 'unknown' ? '❓' : '❌';
    console.log(`${icon} ${s.displayName.padEnd(25)} | ${s.tier.padEnd(6)} | P${s.priority} | ${s.status}`);
  });

  // Test the working providers directly
  console.log('\n💬 TESTING WORKING PROVIDERS:');
  
  const workingProviders = ['groq', 'cohere', 'openrouter'];
  for (const provider of workingProviders) {
    try {
      console.log(`\nTesting ${provider}...`);
      const start = Date.now();
      const response = await manager.askWithProvider("Say hello in 5 words", provider);
      console.log(`  ✅ ${provider}: ${Date.now() - start}ms`);
      console.log(`     "${response.substring(0, 60)}"`);
    } catch (error) {
      console.log(`  ❌ ${provider}: ${error.message}`);
    }
  }

  // Test auto-selection
  console.log('\n🎯 AUTO-SELECTION TEST:');
  try {
    const response = await askLLM("What is 2+2?");
    console.log(`✅ Auto-selected: "${response}"`);
  } catch (error) {
    console.log(`❌ Auto: ${error.message}`);
  }

  await manager.shutdown();
}

quickTest().catch(console.error);