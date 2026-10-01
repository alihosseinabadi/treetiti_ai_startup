require('dotenv').config();
console.log('CEREBRAS:', process.env.CEREBRAS_API_KEY?.substring(0,20));
console.log('LOCKLLM:', process.env.LOCKLLM_API_KEY?.substring(0,20));
console.log('POLLINATIONS:', process.env.POLLINATIONS_API_KEY?.substring(0,20));
console.log('BFL:', process.env.BFL_API_KEY?.substring(0,20));
console.log('OMNIROUTER:', process.env.OMNIROUTER_API_KEY?.substring(0,20));