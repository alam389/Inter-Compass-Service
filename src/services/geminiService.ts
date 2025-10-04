import { geminiConfig } from '../config/gemini';
import { GenerativeModel } from '@google/generative-ai';

/**
 * Gemini Service
 * Provides high-level methods for interacting with Gemini AI
 */

export interface ChatMessage {
  role: 'user' | 'model';
  parts: string;
}

export interface GenerationConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}

class GeminiService {
  private model: GenerativeModel | null = null;

  constructor(modelName?: string) {
    try {
      if (geminiConfig.isConfigured()) {
        this.model = geminiConfig.getModel(modelName);
      }
    } catch (error) {
      console.error('Failed to initialize Gemini service:', error);
    }
  }

  /**
   * Generate text from a prompt
   * @param prompt - The input prompt
   * @param config - Optional generation configuration
   * @returns Generated text response
   */
  async generateText(prompt: string, config?: GenerationConfig): Promise<string> {
    if (!this.model) {
      throw new Error('Gemini service not properly initialized');
    }

    try {
      const generationConfig = {
        temperature: config?.temperature ?? 0.7,
        topK: config?.topK ?? 40,
        topP: config?.topP ?? 0.95,
        maxOutputTokens: config?.maxOutputTokens ?? 1024,
      };

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      });

      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating text with Gemini:', error);
      throw new Error(`Failed to generate text: ${error}`);
    }
  }

  /**
   * Start a chat session
   * @param history - Optional chat history
   * @param config - Optional generation configuration
   * @returns Chat session object
   */
  async startChat(history: ChatMessage[] = [], config?: GenerationConfig) {
    if (!this.model) {
      throw new Error('Gemini service not properly initialized');
    }

    try {
      const generationConfig = {
        temperature: config?.temperature ?? 0.7,
        topK: config?.topK ?? 40,
        topP: config?.topP ?? 0.95,
        maxOutputTokens: config?.maxOutputTokens ?? 1024,
      };

      const chatHistory = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.parts }]
      }));

      const chat = this.model.startChat({
        history: chatHistory,
        generationConfig,
      });

      return {
        sendMessage: async (message: string) => {
          const result = await chat.sendMessage(message);
          const response = await result.response;
          return response.text();
        },
        getHistory: () => chat.getHistory()
      };
    } catch (error) {
      console.error('Error starting chat with Gemini:', error);
      throw new Error(`Failed to start chat: ${error}`);
    }
  }

  /**
   * Analyze and process content (useful for document analysis, summarization, etc.)
   * @param content - The content to analyze
   * @param instruction - Specific instruction for analysis
   * @param config - Optional generation configuration
   * @returns Analysis result
   */
  async analyzeContent(content: string, instruction: string, config?: GenerationConfig): Promise<string> {
    const prompt = `${instruction}\n\nContent to analyze:\n${content}`;
    return this.generateText(prompt, config);
  }

  /**
   * Generate embeddings (if supported by the model)
   * Note: This is a placeholder - Gemini's embedding capabilities may vary
   */
  async generateEmbeddings(text: string): Promise<number[]> {
    // This would need to be implemented based on Gemini's embedding API
    // Currently returning empty array as placeholder
    console.warn('Embedding generation not yet implemented for Gemini');
    return [];
  }

  /**
   * Check if the service is ready to use
   */
  isReady(): boolean {
    return this.model !== null && geminiConfig.isConfigured();
  }

  /**
   * Get model information
   */
  getModelInfo() {
    return {
      isConfigured: geminiConfig.isConfigured(),
      availableModels: geminiConfig.getAvailableModels(),
      defaultModel: geminiConfig.getDefaultModel(),
      isReady: this.isReady()
    };
  }
}

// Export singleton instances - using default model from env and specific models
export const geminiService = new GeminiService(); // Uses GEN_MODEL from env
export const geminiProService = new GeminiService('gemini-1.5-pro'); // Explicit pro model

// Export the class for custom instances
export { GeminiService };