import { Request, Response } from 'express';
import { geminiService, geminiProService } from '../services/geminiService';
import { geminiConfig } from '../config/gemini';

/**
 * Gemini Controller
 * Handles API endpoints for Gemini AI operations
 */

/**
 * Helper function to get the actual model name being used
 */
function getActualModelName(model: string): string {
  return model === 'pro' ? 'gemini-1.5-pro' : geminiConfig.getDefaultModel();
}

export class GeminiController {
  /**
   * Get Gemini service status and configuration
   */
  static async getStatus(req: Request, res: Response) {
    try {
      const status = {
        configured: geminiConfig.isConfigured(),
        ready: geminiService.isReady(),
        availableModels: geminiConfig.getAvailableModels(),
        defaultModel: geminiConfig.getDefaultModel(),
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting Gemini status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Gemini status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test Gemini connection
   */
  static async testConnection(req: Request, res: Response) {
    try {
      const isConnected = await geminiConfig.testConnection();
      
      res.json({
        success: true,
        data: {
          connected: isConnected,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error testing Gemini connection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test Gemini connection',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate text from a prompt
   */
  static async generateText(req: Request, res: Response) {
    try {
      const { prompt, config, model = 'flash' } = req.body;

      if (!prompt) {
        return res.status(400).json({
          success: false,
          error: 'Prompt is required'
        });
      }

      // Choose service based on model preference
      const service = model === 'pro' ? geminiProService : geminiService;

      if (!service.isReady()) {
        return res.status(503).json({
          success: false,
          error: 'Gemini service not available',
          message: 'Please check your GEMINI_API_KEY configuration'
        });
      }

      const result = await service.generateText(prompt, config);

      res.json({
        success: true,
        data: {
          prompt,
          response: result,
          model: getActualModelName(model),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error generating text:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate text',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Start a chat session
   */
  static async startChat(req: Request, res: Response) {
    try {
      const { history = [], config, model = 'flash' } = req.body;

      // Choose service based on model preference
      const service = model === 'pro' ? geminiProService : geminiService;

      if (!service.isReady()) {
        return res.status(503).json({
          success: false,
          error: 'Gemini service not available',
          message: 'Please check your GEMINI_API_KEY configuration'
        });
      }

      // For now, we'll return a chat session ID that could be used to maintain state
      // In a production environment, you'd want to store chat sessions in a database or cache
      const chatSessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      res.json({
        success: true,
        data: {
          chatSessionId,
          model: getActualModelName(model),
          message: 'Chat session started. Use /chat/send-message endpoint to continue the conversation.',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error starting chat:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start chat',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send a message in a chat (simplified version without session persistence)
   */
  static async sendMessage(req: Request, res: Response) {
    try {
      const { message, history = [], config, model = 'flash' } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }

      // Choose service based on model preference
      const service = model === 'pro' ? geminiProService : geminiService;

      if (!service.isReady()) {
        return res.status(503).json({
          success: false,
          error: 'Gemini service not available',
          message: 'Please check your GEMINI_API_KEY configuration'
        });
      }

      const chat = await service.startChat(history, config);
      const response = await chat.sendMessage(message);

      res.json({
        success: true,
        data: {
          message,
          response,
          model: getActualModelName(model),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send message',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Analyze content with specific instructions
   */
  static async analyzeContent(req: Request, res: Response) {
    try {
      const { content, instruction, config, model = 'flash' } = req.body;

      if (!content || !instruction) {
        return res.status(400).json({
          success: false,
          error: 'Both content and instruction are required'
        });
      }

      // Choose service based on model preference
      const service = model === 'pro' ? geminiProService : geminiService;

      if (!service.isReady()) {
        return res.status(503).json({
          success: false,
          error: 'Gemini service not available',
          message: 'Please check your GEMINI_API_KEY configuration'
        });
      }

      const result = await service.analyzeContent(content, instruction, config);

      res.json({
        success: true,
        data: {
          instruction,
          analysis: result,
          contentLength: content.length,
          model: getActualModelName(model),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error analyzing content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze content',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}