import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Gemini Configuration
 * Handles initialization and configuration of Google's Gemini AI
 */

class GeminiConfig {
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string;
  private defaultModel: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.defaultModel = process.env.GEN_MODEL || 'gemini-1.5-flash';
    
    if (!this.apiKey) {
      console.warn('⚠️  GEMINI_API_KEY not found in environment variables');
      console.warn('   Please set GEMINI_API_KEY in your .env file');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      console.log('✅ Gemini AI initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Gemini AI:', error);
    }
  }

  /**
   * Get a Gemini model instance
   * @param modelName - The model to use (default: from GEN_MODEL env var)
   * @returns The model instance or null if not initialized
   */
  getModel(modelName?: string) {
    if (!this.genAI) {
      throw new Error('Gemini AI not initialized. Please check your GEMINI_API_KEY environment variable.');
    }

    const model = modelName || this.defaultModel;
    return this.genAI.getGenerativeModel({ model });
  }

  /**
   * Check if Gemini is properly configured
   * @returns boolean indicating if Gemini is ready to use
   */
  isConfigured(): boolean {
    return this.genAI !== null && this.apiKey !== '';
  }

  /**
   * Get the default model name from environment variables
   * @returns The default model name
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Get available models (commonly used ones)
   */
  getAvailableModels() {
    return [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro',
      'gemini-pro-vision'
    ];
  }

  /**
   * Test the Gemini connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        return false;
      }

      const model = this.getModel();
      const result = await model.generateContent('what is today\'s date?');
      const response = await result.response;
      const text = response.text();
      
      console.log('🧪 Gemini connection test successful');
      console.log('📝 Test response:', text.substring(0, 100) + '...');
      return true;
    } catch (error) {
      console.error('❌ Gemini connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const geminiConfig = new GeminiConfig();

// Export the class for testing purposes
export { GeminiConfig };