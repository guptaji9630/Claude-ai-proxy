#!/usr/bin/env node
/**
 * Test proxy with Kimi K2.6 model (extended thinking support)
 */

const http = require('http');

const requestData = {
  model: "moonshotai/kimi-k2.6",
  messages: [
    {
      role: "user",
      content: "What is 15 + 27? Think step by step."
    }
  ],
  max_tokens: 2048,
  temperature: 1.0,
  top_p: 1.0,
  chat_template_kwargs: {
    thinking: true
  }
};

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/v1/messages',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(JSON.stringify(requestData))
  }
};

console.log('🚀 Testing Kimi K2.6 with extended thinking...\n');
console.log('📤 Request:');
console.log(JSON.stringify(requestData, null, 2));
console.log('\n⏳ Waiting for response...\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('📥 Response received!\n');
      console.log('Status:', res.statusCode);
      console.log('\n🤖 Model Response:');
      
      if (response.content && response.content[0]) {
        console.log(response.content[0].text);
      } else if (response.message) {
        console.log(response.message);
      } else {
        console.log(JSON.stringify(response, null, 2));
      }
      
      console.log('\n✅ Kimi K2.6 is working through the proxy!');
    } catch (e) {
      console.log('Response data:');
      console.log(data);
      console.error('❌ Error parsing response:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error:', e.message);
  console.error('\n💡 Make sure proxy is running: npm run dev');
});

req.write(JSON.stringify(requestData));
req.end();
