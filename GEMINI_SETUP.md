# Gemini AI Integration Guide

This document explains how to use the Google Gemini AI integration in the Inter-Compass Service.

## Setup

1. **Get your Gemini API Key**:
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the key

2. **Configure Environment Variables**:
   - Copy `.env.example` to `.env`
   - Set your `GEMINI_API_KEY` in the `.env` file:
   ```bash
   GEMINI_API_KEY=your_actual_api_key_here
   ```

3. **Start the Server**:
   ```bash
   npm run build
   npm start
   ```

## Available Models

- **gemini-1.5-flash**: Faster, more cost-effective for most tasks
- **gemini-1.5-pro**: More capable for complex reasoning tasks

## API Endpoints

### Check Status
```http
GET /api/gemini/status
```
Returns the current status and configuration of the Gemini service.

### Test Connection
```http
GET /api/gemini/test
```
Tests the connection to Gemini API.

### Generate Text
```http
POST /api/gemini/generate
Content-Type: application/json

{
  "prompt": "Explain quantum computing in simple terms",
  "model": "flash",
  "config": {
    "temperature": 0.7,
    "maxOutputTokens": 1024
  }
}
```

### Start Chat Session
```http
POST /api/gemini/chat/start
Content-Type: application/json

{
  "model": "flash",
  "history": []
}
```

### Send Chat Message
```http
POST /api/gemini/chat/message
Content-Type: application/json

{
  "message": "Hello, how are you?",
  "model": "flash",
  "history": [
    {
      "role": "user",
      "parts": "Previous message"
    },
    {
      "role": "model", 
      "parts": "Previous response"
    }
  ]
}
```

### Analyze Content
```http
POST /api/gemini/analyze
Content-Type: application/json

{
  "content": "The content you want to analyze...",
  "instruction": "Summarize this text in bullet points",
  "model": "pro"
}
```

## Configuration Options

### Generation Config
```typescript
{
  temperature: number;     // 0.0 to 1.0, controls randomness
  topK: number;           // Top-k sampling
  topP: number;           // 0.0 to 1.0, nucleus sampling
  maxOutputTokens: number; // Maximum tokens to generate
}
```

## Error Handling

The API returns standardized error responses:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common error scenarios:
- Missing API key: Service returns 503 status
- Invalid request: 400 status with validation error
- API quota exceeded: 429 status
- Network issues: 500 status with error details

## Example Usage

### Basic Text Generation
```javascript
const response = await fetch('/api/gemini/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'Write a haiku about programming',
    model: 'flash'
  })
});

const data = await response.json();
console.log(data.data.response);
```

### Document Analysis
```javascript
const analysisResponse = await fetch('/api/gemini/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: documentText,
    instruction: 'Extract key insights and create a summary',
    model: 'pro'
  })
});
```

## Security Notes

- Never commit your actual API key to version control
- Use environment variables for all sensitive configuration
- Consider implementing rate limiting for production use
- Monitor API usage and costs

## Troubleshooting

1. **"Gemini service not available"**: Check that `GEMINI_API_KEY` is set correctly
2. **Connection timeouts**: Verify network connectivity and API key validity
3. **Quota exceeded**: Check your Google Cloud billing and quotas
4. **Model not found**: Ensure you're using supported model names

For more information, see the [Google AI documentation](https://ai.google.dev/docs).