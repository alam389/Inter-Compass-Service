/**
 * Example usage of InternCompass API
 * 
 * This script demonstrates how to use the InternCompass API endpoints
 * for document upload, ingestion, outline generation, and chat.
 */

const API_BASE = 'http://localhost:3001';
const AUTH_TOKEN = 'mock-token'; // Replace with real JWT token

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API Error: ${response.status} - ${error.error || response.statusText}`);
  }

  return response.json();
}

// Example 1: Upload a document
async function uploadDocument() {
  console.log('📄 Uploading document...');
  
  // In a real application, you would use FormData with an actual file
  const formData = new FormData();
  // formData.append('file', fileInput.files[0]);
  // formData.append('role_tags', JSON.stringify(['software-intern', 'data-analyst']));
  // formData.append('team_ids', JSON.stringify([1, 2]));
  // formData.append('sensitivity_tags', JSON.stringify(['internal']));

  try {
    const result = await fetch(`${API_BASE}/admin/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: formData,
    });

    const data = await result.json();
    console.log('✅ Document uploaded:', data);
    return data.documentId;
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    throw error;
  }
}

// Example 2: Ingest a document
async function ingestDocument(documentId) {
  console.log('🔄 Ingesting document...');
  
  try {
    const result = await apiRequest(`/admin/documents/${documentId}/ingest`, {
      method: 'POST',
      body: JSON.stringify({ reingest: false }),
    });
    
    console.log('✅ Document ingested:', result);
    return result;
  } catch (error) {
    console.error('❌ Ingestion failed:', error.message);
    throw error;
  }
}

// Example 3: Generate an outline
async function generateOutline() {
  console.log('📋 Generating outline...');
  
  try {
    const result = await apiRequest('/outline', {
      method: 'POST',
      body: JSON.stringify({
        role: 'software-intern',
        teamId: 1,
        level: 'intern',
        locale: 'en-US',
        sections: ['dos', 'donts', 'policies', 'timeline', 'acknowledgements'],
      }),
    });
    
    console.log('✅ Outline generated:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Outline generation failed:', error.message);
    throw error;
  }
}

// Example 4: Chat with the system
async function chatWithSystem() {
  console.log('💬 Chatting with system...');
  
  try {
    const result = await apiRequest('/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'How do I get VPN access?',
        maxTokens: 600,
      }),
    });
    
    console.log('✅ Chat response:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Chat failed:', error.message);
    throw error;
  }
}

// Example 5: Get chat history
async function getChatHistory(sessionId) {
  console.log('📜 Getting chat history...');
  
  try {
    const result = await apiRequest(`/chat/sessions/${sessionId}`);
    console.log('✅ Chat history:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Failed to get chat history:', error.message);
    throw error;
  }
}

// Example 6: Health check
async function healthCheck() {
  console.log('🏥 Checking service health...');
  
  try {
    const result = await apiRequest('/health');
    console.log('✅ Service health:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    throw error;
  }
}

// Main example workflow
async function runExample() {
  try {
    console.log('🚀 Starting InternCompass API example...\n');
    
    // 1. Check service health
    await healthCheck();
    console.log('');
    
    // 2. Generate an outline (this will work if there are approved documents)
    const outline = await generateOutline();
    console.log('');
    
    // 3. Chat with the system
    const chatResponse = await chatWithSystem();
    console.log('');
    
    // 4. Get chat history if we have a session
    if (chatResponse.sessionId) {
      await getChatHistory(chatResponse.sessionId);
    }
    
    console.log('🎉 Example completed successfully!');
    
  } catch (error) {
    console.error('💥 Example failed:', error.message);
    process.exit(1);
  }
}

// Run the example if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExample();
}

export {
  uploadDocument,
  ingestDocument,
  generateOutline,
  chatWithSystem,
  getChatHistory,
  healthCheck,
};
