// Test the smart LLM client
import 'dotenv/config';

async function testClient() {
  // Dynamic import of the TypeScript client
  const { llm, askLLM } = await import('./src/lib/llm-client.ts');
  
  console.log('🚀 Testing Smart LLM Client\n');
  
  // Show provider status
  console.log('📋 Provider Status:');
  llm.getProviderStatus().forEach(p => {
    console.log(`  ${p.available ? '✅' : '❌'} ${p.name} (priority: ${p.priority}) - configured: ${p.configured}`);
  });
  
  console.log('\n💬 Testing chat...\n');
  
  try {
    const result = await askLLM("Say 'Hello from Treetiti' in exactly 5 words.");
    console.log('\n✅ SUCCESS!');
    console.log(`   Provider: ${result.provider}`);
    console.log(`   Model: ${result.model}`);
    console.log(`   Latency: ${result.latency}ms`);
    console.log(`   Response: "${result.content}"`);
  } catch (error) {
    console.log('\n❌ ALL PROVIDERS FAILED:', error.message);
  }
}

testClient().catch(console.error);