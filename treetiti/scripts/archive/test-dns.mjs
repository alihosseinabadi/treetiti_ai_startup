// Check DNS and proxy
import 'dotenv/config';
import { execSync } from 'child_process';

async function checkNetwork() {
  console.log('=== NETWORK DIAGNOSTICS ===\n');
  
  // Check DNS resolution
  console.log('1. DNS Resolution:');
  try {
    const { lookup } = await import('dns/promises');
    const groq = await lookup('api.groq.com');
    console.log(`   api.groq.com -> ${groq.address}`);
    const or = await lookup('openrouter.ai');
    console.log(`   openrouter.ai -> ${or.address}`);
  } catch (e) {
    console.log('   DNS Error:', e.message);
  }

  // Check Windows proxy
  console.log('\n2. Windows Proxy Settings:');
  try {
    const proxy = execSync('netsh winhttp show proxy', { encoding: 'utf8', stdio: 'pipe' });
    console.log(proxy);
  } catch (e) {
    console.log('   Could not get proxy:', e.message);
  }

  // Check environment proxy
  console.log('\n3. Environment Proxy Variables:');
  console.log('   HTTP_PROXY:', process.env.HTTP_PROXY || 'not set');
  console.log('   HTTPS_PROXY:', process.env.HTTPS_PROXY || 'not set');
  console.log('   http_proxy:', process.env.http_proxy || 'not set');
  console.log('   https_proxy:', process.env.https_proxy || 'not set');

  // Test with proxy if available
  console.log('\n4. Testing with common VPN ports...');
  const vpnPorts = [7890, 1080, 8080, 3128, 8888];
  for (const port of vpnPorts) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`http://127.0.0.1:${port}`, { 
        method: 'HEAD',
        signal: controller.signal 
      });
      clearTimeout(timeout);
      console.log(`   Port ${port}: ${res.ok ? '✅ Open' : 'Closed'}`);
    } catch (e) {
      // Port closed or no proxy
    }
  }

  // Test with explicit proxy if found
  console.log('\n5. Testing fetch with Windows proxy...');
  // Node 18+ should use system proxy automatically
  console.log('   Node should use system proxy automatically');
}

checkNetwork().catch(console.error);