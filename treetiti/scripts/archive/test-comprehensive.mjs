// ============================================
// COMPREHENSIVE TEST - All Providers & Strategies
// ============================================

import 'dotenv/config';
import { getLLMManager, getLLMStatus, getLLMStats, askLLM, askLLMWithCapabilities, streamLLM } from './src/lib/llm';

async function runComprehensiveTest() {
  console.log('🚀 TREETITI LLM SYSTEM - COMPREHENSIVE TEST\n');
  console.log('='.repeat(60));

  const manager = getLLMManager({ 
    defaultStrategy: 'tiered',
    logLevel: 'info',
    healthCheckInterval: 30000
  });

  // Wait for initial health checks
  await new Promise(r => setTimeout(r, 3000));

  // 1. Show Provider Status
  console.log('\n📋 PROVIDER STATUS:');
  console.log('-'.repeat(60));
  const status = await getLLMStatus();
  status.forEach(s => {
    const icon = s.status === 'healthy' ? '✅' : s.status === 'degraded' ? '⚠️' : s.status === 'needs_config' ? '🔧' : '❌';
    const keyIcon = s.hasKey ? '🔑' : '🆓';
    console.log(`${icon} ${keyIcon} ${s.displayName.padEnd(25)} | ${s.tier.padEnd(6)} | P${s.priority} | ${s.latency}ms | ${s.status}`);
  });

  // 2. Test Basic Chat
  console.log('\n💬 BASIC CHAT TEST:');
  console.log('-'.repeat(60));
  
  try {
    const response = await askLLM("Say 'Hello from Treetiti' in exactly 5 words.");
    console.log(`✅ Response: "${response}"`);
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  // 3. Test Different Strategies
  console.log('\n🎯 STRATEGY TESTS:');
  console.log('-'.repeat(60));
  
  const strategies = ['tiered', 'cost', 'speed', 'quality', 'specialized', 'fallback'];
  for (const strategy of strategies) {
    manager.setStrategy(strategy);
    try {
      const start = Date.now();
      const response = await askLLM("What is 2+2? Answer in 3 words.");
      console.log(`${strategy.padEnd(14)} | ${Date.now() - start}ms | "${response.substring(0, 40)}"`);
    } catch (error) {
      console.log(`${strategy.padEnd(14)} | FAILED: ${error.message}`);
    }
  }

  // 4. Test Capabilities Routing
  console.log('\n🔧 CAPABILITIES ROUTING:');
  console.log('-'.repeat(60));
  
  const capabilityTests = [
    { name: 'Function Calling', caps: { functionCalling: true } },
    { name: 'Vision', caps: { vision: true } },
    { name: 'Reasoning', caps: { reasoning: true } },
    { name: 'Streaming', caps: { streaming: true } },
    { name: 'All Capabilities', caps: { functionCalling: true, vision: true, reasoning: true, streaming: true } }
  ];

  for (const test of capabilityTests) {
    try {
      const start = Date.now();
      const response = await askLLMWithCapabilities("Test", test.caps);
      console.log(`${test.name.padEnd(20)} | ${Date.now() - start}ms | Provider selected successfully`);
    } catch (error) {
      console.log(`${test.name.padEnd(20)} | FAILED: ${error.message}`);
    }
  }

  // 5. Test Specific Provider Override
  console.log('\n🎯 PROVIDER OVERRIDE TESTS:');
  console.log('-'.repeat(60));
  
  const providers = ['groq', 'cohere', 'openrouter_free'];
  for (const provider of providers) {
    try {
      const start = Date.now();
      const response = await manager.askWithProvider("Quick test", provider);
      console.log(`${provider.padEnd(18)} | ${Date.now() - start}ms | ✅`);
    } catch (error) {
      console.log(`${provider.padEnd(18)} | FAILED: ${error.message}`);
    }
  }

  // 6. Streaming Test
  console.log('\n🌊 STREAMING TEST:');
  console.log('-'.repeat(60));
  
  try {
    let fullContent = '';
    for await (const chunk of streamLLM("Count from 1 to 5 slowly")) {
      if (chunk.content) {
        process.stdout.write(chunk.content);
        fullContent += chunk.content;
      }
      if (chunk.done) {
        console.log('\n✅ Streaming complete');
        break;
      }
    }
  } catch (error) {
    console.log(`❌ Streaming failed: ${error.message}`);
  }

  // 7. Stats
  console.log('\n📊 STATISTICS:');
  console.log('-'.repeat(60));
  const stats = await getLLMStats();
  console.log(`Total Requests: ${stats.totalRequests}`);
  console.log(`Avg Latency: ${stats.avgLatency.toFixed(0)}ms`);
  console.log('Provider Usage:', stats.providerUsage);

  // 8. Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ COMPREHENSIVE TEST COMPLETE');
  console.log('='.repeat(60));
  
  const healthy = status.filter(s => s.status === 'healthy').length;
  const total = status.length;
  console.log(`Healthy Providers: ${healthy}/${total}`);
  console.log(`Strategies Available: ${manager.getAvailableStrategies().join(', ')}`);
  console.log(`Current Strategy: ${manager.getStrategy()}`);

  await manager.shutdown();
}

runComprehensiveTest().catch(console.error);