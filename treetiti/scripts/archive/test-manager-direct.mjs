// ============================================
// TEST MANAGER WITH WORKING PROVIDERS ONLY
// ============================================

import 'dotenv/config';
import { LLMManager } from './src/lib/llm/manager';

async function testManager() {
  console.log('🚀 Testing Manager with working providers...\n');
  
  const manager = new LLMManager({ 
    defaultStrategy: 'tiered',
    logLevel: 'info',
    healthCheckInterval: 10000
  });

  // Wait for health checks
  await new Promise(r => setTimeout(r, 15000));

  console.log('\n📋 STATUS:');
  const status = manager.getProviderStatus();
  status.forEach(s => {
    const icon = s.status === 'healthy' ? '✅' : s.status === 'degraded' ? '⚠️' : '❓';
    console.log(`${icon} ${s.displayName.padEnd(25)} | ${s.tier.padEnd(6)} | ${s.status}`);
  });

  // Test Cohere directly via manager
  console.log('\n💬 Testing Cohere via manager...');
  try {
    const provider = manager.providers.get('cohere');
    if (provider) {
      const start = Date.now();
      const response = await provider.client.chat({ prompt: "Say hello in 5 words" });
      console.log(`✅ Cohere: ${Date.now() - start}ms`);
      console.log(`   "${response.content}"`);
    }
  } catch (e) {
    console.log(`❌ Cohere: ${e.message}`);
  }

  // Test OpenRouter Full via manager
  console.log('\n💬 Testing OpenRouter Full via manager...');
  try {
    const provider = manager.providers.get('openrouter');
    if (provider) {
      const start = Date.now();
      const response = await provider.client.chat({ prompt: "Say hello in 5 words" });
      console.log(`✅ OpenRouter: ${Date.now() - start}ms`);
      console.log(`   "${response.content}"`);
    }
  } catch (e) {
    console.log(`❌ OpenRouter: ${e.message}`);
  }

  // Test auto-selection (should pick Cohere or OpenRouter)
  console.log('\n🎯 Testing auto-selection...');
  try {
    const response = await manager.chat({ prompt: "What is 2+2?" });
    console.log(`✅ Auto: "${response.content}" (via ${response.provider})`);
  } catch (e) {
    console.log(`❌ Auto: ${e.message}`);
  }

  await manager.shutdown();
}

testManager().catch(console.error);