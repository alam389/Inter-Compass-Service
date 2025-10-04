import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../lib/config.js';
import { logger } from '../../lib/logger.js';
import { DocumentChunk, Citation, OutlineResponse, ChatResponse, OutlineRequest } from '../types.js';

export class PromptingService {
  private static genAI: GoogleGenerativeAI | null = null;

  /**
   * Initialize the Gemini AI client
   */
  private static initializeClient(): GoogleGenerativeAI {
    if (!this.genAI) {
      this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    }
    return this.genAI;
  }

  /**
   * Generate structured onboarding outline from context
   */
  static async generateOutline(
    context: DocumentChunk[],
    request: OutlineRequest
  ): Promise<OutlineResponse> {
    try {
      const genAI = this.initializeClient();
      const model = genAI.getGenerativeModel({ model: config.GEN_MODEL });

      const systemPrompt = this.buildOutlineSystemPrompt();
      const userPrompt = this.buildOutlineUserPrompt(context, request);

      const result = await model.generateContent([systemPrompt, userPrompt]);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and structure the response
      const outline: OutlineResponse = {
        outline: {
          dos: parsed.dos || [],
          donts: parsed.donts || [],
          policies: parsed.policies || [],
          timeline: parsed.timeline || [],
          acknowledgements: parsed.acknowledgements || []
        },
        citations: this.extractCitationsFromChunks(context)
      };

      logger.info(`Generated outline for role: ${request.role}, team: ${request.teamId}`);
      return outline;
    } catch (error) {
      logger.error({ error }, 'Failed to generate outline');
      throw new Error(`Failed to generate outline: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate chat response from context
   */
  static async generateChatResponse(
    message: string,
    context: DocumentChunk[],
    sessionId: string,
    userRole?: string,
    userTeamId?: number
  ): Promise<ChatResponse> {
    try {
      const genAI = this.initializeClient();
      const model = genAI.getGenerativeModel({ model: config.GEN_MODEL });

      const systemPrompt = this.buildChatSystemPrompt();
      const userPrompt = this.buildChatUserPrompt(message, context, userRole, userTeamId);

      const result = await model.generateContent([systemPrompt, userPrompt]);
      const response = await result.response;
      const text = response.text();

      // Extract answer and citations
      const answer = this.extractAnswerFromResponse(text);
      const citations = this.extractCitationsFromChunks(context);
      const guardrails = this.assessGuardrails(text, context);

      return {
        sessionId,
        answer,
        citations,
        guardrails
      };
    } catch (error) {
      logger.error({ error }, 'Failed to generate chat response');
      throw new Error(`Failed to generate chat response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build system prompt for outline generation
   */
  private static buildOutlineSystemPrompt(): string {
    return `You are InternCompass' onboarding assistant. Your task is to generate structured onboarding outlines based on approved company documents.

IMPORTANT RULES:
1. Answer ONLY using the provided context from approved documents
2. If information is not in the context, say you don't know and suggest who internally can help
3. Always cite the document title and page range for each piece of information
4. Do not reveal sensitive data, secrets, or PII
5. Respect role/team scope and only include relevant information
6. Return ONLY valid JSON in the exact format specified

Return format:
{
  "dos": ["actionable do items"],
  "donts": ["actionable don't items"],
  "policies": [{"title": "Policy Name", "must_acknowledge": true}],
  "timeline": [{"week": 1, "items": ["week 1 tasks"]}],
  "acknowledgements": [{"docId": "uuid", "title": "Document Title"}]
}`;
  }

  /**
   * Build user prompt for outline generation
   */
  private static buildOutlineUserPrompt(context: DocumentChunk[], request: OutlineRequest): string {
    const contextText = context.map(chunk => 
      `[Document: ${chunk.document_id}, Pages: ${chunk.page_from}-${chunk.page_to}]\n${chunk.text}`
    ).join('\n\n');

    return `Generate an onboarding outline for:
- Role: ${request.role}
- Team ID: ${request.teamId}
- Level: ${request.level || 'intern'}
- Locale: ${request.locale || 'en-US'}
- Sections: ${request.sections?.join(', ') || 'all'}

Context from approved documents:
${contextText}

Generate the outline based on the context above. If there's insufficient information for any section, indicate that in the response.`;
  }

  /**
   * Build system prompt for chat
   */
  private static buildChatSystemPrompt(): string {
    return `You are InternCompass' onboarding assistant. Answer questions using ONLY the provided context from approved company documents.

IMPORTANT RULES:
1. Answer ONLY using the provided context
2. If the answer is not in context, say "I don't know from approved materials" and suggest who internally can help
3. Always cite the document title and page range
4. Do not reveal sensitive data, secrets, or PII
5. Keep answers concise and actionable
6. If asked about something not in the context, politely redirect to internal resources`;
  }

  /**
   * Build user prompt for chat
   */
  private static buildChatUserPrompt(
    message: string,
    context: DocumentChunk[],
    userRole?: string,
    userTeamId?: number
  ): string {
    const contextText = context.map(chunk => 
      `[Document: ${chunk.document_id}, Pages: ${chunk.page_from}-${chunk.page_to}]\n${chunk.text}`
    ).join('\n\n');

    return `User question: ${message}

User context: ${userRole ? `Role: ${userRole}` : ''} ${userTeamId ? `Team: ${userTeamId}` : ''}

Context from approved documents:
${contextText}

Answer the question using only the context above. If the answer isn't in the context, say so and suggest internal resources.`;
  }

  /**
   * Extract answer from chat response
   */
  private static extractAnswerFromResponse(text: string): string {
    // Remove any JSON-like structures and return clean text
    return text.replace(/\{[\s\S]*\}/g, '').trim();
  }

  /**
   * Extract citations from chunks
   */
  private static extractCitationsFromChunks(chunks: DocumentChunk[]): Citation[] {
    const citationMap = new Map<string, Citation>();
    
    for (const chunk of chunks) {
      const key = chunk.document_id;
      if (!citationMap.has(key)) {
        citationMap.set(key, {
          documentId: chunk.document_id,
          title: `Document ${chunk.document_id}`, // In production, you'd fetch the actual title
          pages: chunk.page_from && chunk.page_to ? `${chunk.page_from}-${chunk.page_to}` : undefined
        });
      }
    }
    
    return Array.from(citationMap.values());
  }

  /**
   * Assess guardrails for the response
   */
  private static assessGuardrails(text: string, context: DocumentChunk[]): { grounded: boolean; refused: boolean } {
    const grounded = context.length > 0;
    const refused = text.toLowerCase().includes("i don't know") || 
                   text.toLowerCase().includes("not in context") ||
                   text.toLowerCase().includes("not available");
    
    return { grounded, refused };
  }
}
