/**
 * Gemini Integration Test Examples
 * 
 * These examples show how to test the Gemini API endpoints
 * Make sure to set your GEMINI_API_KEY in the .env file before running these tests
 */

// Base URL for your API
const BASE_URL = 'http://localhost:3000/api/gemini';

/**
 * Test 1: Check Gemini Status
 */
async function testGeminiStatus() {
  console.log('🧪 Testing Gemini Status...');
  
  try {
    const response = await fetch(`${BASE_URL}/status`);
    const data = await response.json();
    
    console.log('✅ Status Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Status Test Failed:', error);
  }
}

/**
 * Test 2: Test Gemini Connection
 */
async function testGeminiConnection() {
  console.log('🧪 Testing Gemini Connection...');
  
  try {
    const response = await fetch(`${BASE_URL}/test`);
    const data = await response.json();
    
    console.log('✅ Connection Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Connection Test Failed:', error);
  }
}

/**
 * Test 3: Generate Text
 */
async function testTextGeneration() {
  console.log('🧪 Testing Text Generation...');
  
  try {
    const response = await fetch(`${BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'Explain what the Inter-Compass service might be used for in 2-3 sentences.',
        model: 'flash',
        config: {
          temperature: 0.7,
          maxOutputTokens: 200
        }
      })
    });
    
    const data = await response.json();
    console.log('✅ Text Generation Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Text Generation Test Failed:', error);
  }
}

/**
 * Test 4: Chat Message
 */
async function testChatMessage() {
  console.log('🧪 Testing Chat Message...');
  
  try {
    const response = await fetch(`${BASE_URL}/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Hello! Can you help me understand what AI services are available?',
        model: 'flash',
        history: []
      })
    });
    
    const data = await response.json();
    console.log('✅ Chat Message Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Chat Message Test Failed:', error);
  }
}

/**
 * Test 5: Content Analysis
 */
async function testContentAnalysis() {
  console.log('🧪 Testing Content Analysis...');
  
  const sampleContent = `
    The Inter-Compass Service is a backend API that provides various functionality
    including database connectivity, AI integration with Google Gemini, and 
    comprehensive logging and monitoring capabilities. It's built with TypeScript,
    Express.js, and includes features like rate limiting, request validation,
    and error handling middleware.
  `;
  
  try {
    const response = await fetch(`${BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: sampleContent,
        instruction: 'Create a bullet point summary of the key features mentioned',
        model: 'flash'
      })
    });
    
    const data = await response.json();
    console.log('✅ Content Analysis Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Content Analysis Test Failed:', error);
  }
}

/**
 * Run All Tests
 */
async function runAllTests() {
  console.log('🚀 Starting Gemini Integration Tests...\n');
  
  await testGeminiStatus();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testGeminiConnection();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testTextGeneration();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testChatMessage();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testContentAnalysis();
  
  console.log('\n🏁 All tests completed!');
}

// Export functions for individual testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testGeminiStatus,
    testGeminiConnection,
    testTextGeneration,
    testChatMessage,
    testContentAnalysis,
    runAllTests
  };
}

// Run all tests if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  runAllTests().catch(console.error);
}