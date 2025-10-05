/**
 * Test the admin documents endpoint
 */

const http = require('http');

function testEndpoint() {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/admin/documents',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log('\n✅ Response:', JSON.stringify(parsed, null, 2));
        process.exit(0);
      } catch (error) {
        console.log('\n📄 Response:', data);
        process.exit(0);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure the backend server is running (npm run dev)');
    process.exit(1);
  });

  req.end();
}

console.log('🧪 Testing GET /api/admin/documents...\n');
testEndpoint();
