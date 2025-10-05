import { db } from '../database';
import { pdfProcessor, PDFProcessingResult } from './pdfProcessor';
import { chunkingService, TextChunk } from './chunkingService';
import { embeddingService } from './embeddingService';
import { geminiConfig } from '../config/gemini';

/**
 * RAG Service
 * Orchestrates PDF processing, chunking, embedding, and retrieval
 */

export interface DocumentMetadata {
  documentId: number;
  title: string;
  author?: string;
  tags?: string[];
  uploadDate: Date;
  pageCount?: number;
  wordCount?: number;
}

export interface RetrievalResult {
  chunkId: number;
  documentId: number;
  documentTitle: string;
  chunkText: string;
  chunkIndex: number;
  relevanceScore: number;
  metadata?: any;
}

export interface RAGResponse {
  answer: string;
  sources: RetrievalResult[];
  confidence: number;
}

export class RAGService {
  private readonly TOP_K = 5; // Number of chunks to retrieve
  private readonly MIN_RELEVANCE_SCORE = 0.3; // Minimum similarity threshold

  /**
   * Process and store a PDF document
   */
  async processDocument(
    buffer: Buffer,
    documentTitle: string,
    tagId?: number,
    filename?: string
  ): Promise<DocumentMetadata> {
    try {
      console.log(`📄 Processing document: ${documentTitle}`);

      // 1. Extract text and metadata from PDF
      const pdfResult: PDFProcessingResult = await pdfProcessor.processPDF(buffer);
      
      // 2. Merge filename metadata with PDF metadata
      const filenameMetadata = filename ? pdfProcessor.extractFilenameMetadata(filename) : {};
      const finalTitle = documentTitle || filenameMetadata.title || 'Untitled Document';
      const author = pdfResult.metadata.author || filenameMetadata.author;
      
      // 3. Enhance metadata with extracted tags
      const enhancedMetadata = {
        ...pdfResult.metadata,
        extractedTags: pdfResult.metadata.extractedTags || [],
        documentType: pdfResult.metadata.documentType || 'general',
        language: pdfResult.metadata.language || 'en',
        sections: pdfResult.sections?.length || 0
      };

      // 4. Store document in database
      const docResult = await db.query(
        `INSERT INTO documents (documenttitle, documentcontent, tagid, author, page_count, word_count, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING documentid, documenttitle, uploadedat`,
        [
          finalTitle,
          pdfResult.text,
          tagId,
          author,
          pdfResult.pageCount,
          pdfResult.wordCount,
          JSON.stringify(enhancedMetadata)
        ]
      );

      const document = docResult.rows[0];
      console.log(`✅ Document stored: ID ${document.documentid}, Title: "${finalTitle}"`);

      // 5. Chunk the text intelligently
      console.log('🔪 Chunking document with semantic awareness...');
      const chunks = chunkingService.chunkText(pdfResult.text, 512, 50);
      console.log(`📦 Created ${chunks.length} chunks`);

      // 6. Generate embeddings for chunks in batches
      console.log('🧮 Generating embeddings...');
      const texts = chunks.map(chunk => chunk.text);
      const embeddings = await embeddingService.generateBatchEmbeddings(texts);
      console.log(`✅ Generated ${embeddings.length} embeddings`);

      // 7. Store chunks and embeddings in database
      console.log('💾 Storing chunks and embeddings in vector database...');
      for (let i = 0; i < chunks.length; i++) {
        await db.query(
          `INSERT INTO document_chunks (documentid, chunk_text, chunk_index, token_count, embedding, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            document.documentid,
            chunks[i].text,
            chunks[i].index,
            chunks[i].tokenCount,
            JSON.stringify(embeddings[i].values), // Store as JSON for now
            JSON.stringify({
              ...chunks[i].metadata,
              documentTitle: finalTitle,
              author: author,
              documentType: enhancedMetadata.documentType
            })
          ]
        );
      }

      console.log(`✅ Document processing complete: ${finalTitle}`);
      console.log(`   📊 Stats: ${chunks.length} chunks, ${pdfResult.wordCount} words, ${pdfResult.pageCount} pages`);

      return {
        documentId: document.documentid,
        title: document.documenttitle,
        author,
        tags: enhancedMetadata.extractedTags,
        uploadDate: document.uploadedat,
        pageCount: pdfResult.pageCount,
        wordCount: pdfResult.wordCount
      };
    } catch (error) {
      console.error('❌ Error processing document:', error);
      throw error;
    }
  }

  /**
   * Retrieve relevant chunks for a query
   */
  async retrieveRelevantChunks(query: string, topK: number = this.TOP_K): Promise<RetrievalResult[]> {
    try {
      console.log(`🔍 Retrieving relevant chunks for query: "${query}"`);

      // 1. Generate embedding for the query
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // 2. Get all chunks with embeddings
      const chunksResult = await db.query(`
        SELECT 
          dc.chunkid,
          dc.documentid,
          dc.chunk_text,
          dc.chunk_index,
          dc.embedding,
          dc.metadata as chunk_metadata,
          d.documenttitle,
          d.author,
          d.metadata as doc_metadata
        FROM document_chunks dc
        JOIN documents d ON dc.documentid = d.documentid
        WHERE dc.embedding IS NOT NULL
      `);

      if (chunksResult.rows.length === 0) {
        console.log('⚠️ No chunks found in database');
        return [];
      }

      // 3. Calculate similarity scores
      const results: RetrievalResult[] = [];
      
      for (const row of chunksResult.rows) {
        const chunkEmbedding = JSON.parse(row.embedding);
        const similarity = embeddingService.cosineSimilarity(
          queryEmbedding.values,
          chunkEmbedding
        );

        if (similarity >= this.MIN_RELEVANCE_SCORE) {
          results.push({
            chunkId: row.chunkid,
            documentId: row.documentid,
            documentTitle: row.documenttitle,
            chunkText: row.chunk_text,
            chunkIndex: row.chunk_index,
            relevanceScore: similarity,
            metadata: {
              author: row.author,
              chunkMetadata: row.chunk_metadata,
              docMetadata: row.doc_metadata
            }
          });
        }
      }

      // 4. Sort by relevance and return top K
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      const topResults = results.slice(0, topK);

      console.log(`✅ Found ${topResults.length} relevant chunks`);
      return topResults;
    } catch (error) {
      console.error('❌ Error retrieving chunks:', error);
      throw error;
    }
  }

  /**
   * Answer a question using RAG
   */
  async answerQuestion(question: string, userId?: number): Promise<RAGResponse> {
    try {
      console.log(`💬 Answering question: "${question}"`);

      // 1. Retrieve relevant chunks
      const relevantChunks = await this.retrieveRelevantChunks(question);

      if (relevantChunks.length === 0) {
        return {
          answer: "I couldn't find any relevant information in the uploaded onboarding documents to answer your question. Please ensure the relevant materials have been uploaded in the Admin section, or try rephrasing your question.",
          sources: [],
          confidence: 0
        };
      }

      // 2. Prepare context from relevant chunks with detailed source information
      const contextParts = relevantChunks.map((chunk, idx) => {
        const sourceNum = idx + 1;
        const docTitle = chunk.documentTitle;
        const author = chunk.metadata?.author ? ` by ${chunk.metadata.author}` : '';
        const documentType = chunk.metadata?.documentType ? ` [${chunk.metadata.documentType}]` : '';
        const sectionInfo = `Section ${chunk.chunkIndex + 1}`;
        const relevanceScore = `(Relevance: ${(chunk.relevanceScore * 100).toFixed(1)}%)`;
        
        return `[SOURCE ${sourceNum}: "${docTitle}"${author}${documentType} - ${sectionInfo} ${relevanceScore}]
${chunk.chunkText}`;
      });
      
      const context = contextParts.join('\n\n---\n\n');

      // 3. Create enhanced prompt for Gemini with strict grounding instructions
      const prompt = `You are an AI assistant helping new interns during their onboarding process at their company. Your role is to answer questions based EXCLUSIVELY on the provided onboarding documents uploaded by administrators.

CRITICAL INSTRUCTIONS - ANSWER GROUNDING:
- Answer using ONLY information explicitly stated in the context below
- DO NOT use external knowledge, make assumptions, or add information not present in the documents
- If the answer is not in the provided context, respond EXACTLY: "This information is not available in the current onboarding materials. Please contact HR or your manager for clarification."
- ALWAYS cite your sources using the format [SOURCE X] when referencing information
- Include multiple source citations when information comes from different documents
- Quote or paraphrase relevant passages accurately
- If multiple sources provide related information, synthesize them coherently while maintaining accuracy
- Maintain a helpful, professional, and friendly tone suitable for new interns

ANSWER QUALITY GUIDELINES:
- Be specific and concrete - avoid vague statements
- Provide actionable information when possible
- If procedures or policies are mentioned, include relevant details
- Structure your answer clearly with bullet points or paragraphs as appropriate
- Keep answers concise but comprehensive (2-4 paragraphs typically)

CONTEXT FROM UPLOADED ONBOARDING DOCUMENTS:
${context}

USER QUESTION: ${question}

Please provide a clear, accurate answer based solely on the above sources. Remember to include [SOURCE X] citations throughout your response.

ANSWER:`;

      // 4. Get response from Gemini
      const model = geminiConfig.getModel();
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2, // Even lower temperature for maximum factual accuracy
          topK: 20,
          topP: 0.85,
          maxOutputTokens: 1024,
        },
      });

      const response = await result.response;
      let answer = response.text();

      // 5. Validate that answer includes source citations
      const hasCitations = /\[SOURCE \d+\]/.test(answer);
      if (!hasCitations && relevantChunks.length > 0) {
        // If no citations found but we have sources, add a note
        answer += '\n\n(Note: This answer is based on the uploaded onboarding documents.)';
      }

      // 6. Calculate confidence based on relevance scores and citation presence
      const avgRelevance = relevantChunks.reduce((sum, chunk) => sum + chunk.relevanceScore, 0) / relevantChunks.length;
      const topRelevance = relevantChunks[0]?.relevanceScore || 0;
      
      // Confidence calculation considers:
      // - Average relevance of all chunks
      // - Top chunk relevance (most important)
      // - Presence of citations (shows grounding)
      let confidence = (avgRelevance * 0.5 + topRelevance * 0.5);
      if (hasCitations) confidence *= 1.1; // Boost if properly cited
      confidence = Math.min(confidence, 1.0); // Cap at 1.0

      console.log(`✅ Question answered with confidence: ${(confidence * 100).toFixed(1)}%`);
      console.log(`   📊 Top relevance: ${(topRelevance * 100).toFixed(1)}%, Avg: ${(avgRelevance * 100).toFixed(1)}%`);
      console.log(`   🔗 Sources used: ${relevantChunks.length}, Citations: ${hasCitations ? 'Yes' : 'No'}`);

      return {
        answer,
        sources: relevantChunks,
        confidence
      };
    } catch (error) {
      console.error('❌ Error answering question:', error);
      throw error;
    }
  }

  /**
   * Delete a document and all its chunks
   */
  async deleteDocument(documentId: number): Promise<void> {
    try {
      // Delete chunks first (due to foreign key constraint)
      await db.query('DELETE FROM document_chunks WHERE documentid = $1', [documentId]);
      
      // Delete document
      await db.query('DELETE FROM documents WHERE documentid = $1', [documentId]);
      
      console.log(`✅ Deleted document ${documentId} and all its chunks`);
    } catch (error) {
      console.error('❌ Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Get statistics about the knowledge base
   */
  async getKnowledgeBaseStats(): Promise<any> {
    try {
      const docCountResult = await db.query('SELECT COUNT(*) as count FROM documents');
      const chunkCountResult = await db.query('SELECT COUNT(*) as count FROM document_chunks');
      const totalWordsResult = await db.query('SELECT SUM(word_count) as total FROM documents');
      
      // Count documents with embeddings
      const docsWithEmbeddingsResult = await db.query(`
        SELECT COUNT(DISTINCT documentid) as count 
        FROM document_chunks 
        WHERE embedding IS NOT NULL
      `);
      
      // Get document type distribution
      const docTypeResult = await db.query(`
        SELECT 
          metadata->>'documentType' as doc_type,
          COUNT(*) as count
        FROM documents
        WHERE metadata->>'documentType' IS NOT NULL
        GROUP BY metadata->>'documentType'
      `);
      
      // Get recent uploads
      const recentUploadsResult = await db.query(`
        SELECT 
          documentid,
          documenttitle,
          uploadedat,
          page_count,
          word_count
        FROM documents
        ORDER BY uploadedat DESC
        LIMIT 5
      `);
      
      return {
        totalDocuments: parseInt(docCountResult.rows[0].count),
        totalChunks: parseInt(chunkCountResult.rows[0].count),
        totalWords: parseInt(totalWordsResult.rows[0].total) || 0,
        documentsWithEmbeddings: parseInt(docsWithEmbeddingsResult.rows[0].count),
        averageChunksPerDocument: Math.round(chunkCountResult.rows[0].count / Math.max(docCountResult.rows[0].count, 1)),
        documentTypeDistribution: docTypeResult.rows.reduce((acc: any, row: any) => {
          acc[row.doc_type] = parseInt(row.count);
          return acc;
        }, {}),
        recentUploads: recentUploadsResult.rows,
        readiness: {
          hasDocuments: parseInt(docCountResult.rows[0].count) > 0,
          hasEmbeddings: parseInt(docsWithEmbeddingsResult.rows[0].count) > 0,
          isReady: parseInt(docsWithEmbeddingsResult.rows[0].count) > 0
        }
      };
    } catch (error) {
      console.error('❌ Error getting knowledge base stats:', error);
      throw error;
    }
  }

  /**
   * Reprocess a document (regenerate chunks and embeddings)
   * Useful for documents uploaded before chunking was implemented
   */
  async reprocessDocument(documentId: number): Promise<void> {
    try {
      console.log(`🔄 Reprocessing document ${documentId}`);

      // Get document content
      const docResult = await db.query(
        'SELECT documentcontent, documenttitle FROM documents WHERE documentid = $1',
        [documentId]
      );

      if (docResult.rows.length === 0) {
        throw new Error(`Document ${documentId} not found`);
      }

      const { documentcontent, documenttitle } = docResult.rows[0];

      // Delete existing chunks
      await db.query('DELETE FROM document_chunks WHERE documentid = $1', [documentId]);
      console.log(`🗑️ Deleted old chunks for document ${documentId}`);

      // Chunk the text
      console.log('🔪 Chunking document...');
      const chunks = chunkingService.chunkText(documentcontent, 512, 50);
      console.log(`📦 Created ${chunks.length} chunks`);

      // Generate embeddings
      console.log('🧮 Generating embeddings...');
      const texts = chunks.map(chunk => chunk.text);
      const embeddings = await embeddingService.generateBatchEmbeddings(texts);
      console.log(`✅ Generated ${embeddings.length} embeddings`);

      // Store chunks and embeddings
      console.log('💾 Storing chunks and embeddings...');
      for (let i = 0; i < chunks.length; i++) {
        await db.query(
          `INSERT INTO document_chunks (documentid, chunk_text, chunk_index, token_count, embedding, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            documentId,
            chunks[i].text,
            chunks[i].index,
            chunks[i].tokenCount,
            JSON.stringify(embeddings[i].values),
            JSON.stringify(chunks[i].metadata)
          ]
        );
      }

      console.log(`✅ Reprocessing complete for document ${documentId}: ${documenttitle}`);
    } catch (error) {
      console.error('❌ Error reprocessing document:', error);
      throw error;
    }
  }

  /**
   * Reprocess all documents without embeddings
   */
  async reprocessAllDocuments(): Promise<{ processed: number; errors: number }> {
    try {
      console.log('🔄 Starting batch reprocessing of all documents...');

      // Get all documents
      const docsResult = await db.query(
        'SELECT documentid, documenttitle FROM documents ORDER BY documentid'
      );

      let processed = 0;
      let errors = 0;

      for (const doc of docsResult.rows) {
        try {
          await this.reprocessDocument(doc.documentid);
          processed++;
        } catch (error) {
          console.error(`❌ Failed to reprocess document ${doc.documentid}: ${doc.documenttitle}`, error);
          errors++;
        }
      }

      console.log(`✅ Batch reprocessing complete. Processed: ${processed}, Errors: ${errors}`);
      return { processed, errors };
    } catch (error) {
      console.error('❌ Error in batch reprocessing:', error);
      throw error;
    }
  }

  /**
   * Search documents by metadata (title, author, tags)
   */
  async searchDocumentsByMetadata(searchTerm: string): Promise<DocumentMetadata[]> {
    try {
      const result = await db.query(`
        SELECT 
          d.documentid,
          d.documenttitle,
          d.author,
          d.uploadedat,
          d.page_count,
          d.word_count,
          d.metadata,
          t.tagtype,
          ARRAY_AGG(t.tagtype) as tags
        FROM documents d
        LEFT JOIN tags t ON d.tagid = t.tagid
        WHERE 
          d.documenttitle ILIKE $1 OR
          d.author ILIKE $1 OR
          t.tagtype ILIKE $1
        GROUP BY d.documentid, d.documenttitle, d.author, d.uploadedat, d.page_count, d.word_count, d.metadata, t.tagtype
        ORDER BY d.uploadedat DESC
      `, [`%${searchTerm}%`]);

      return result.rows.map((row: any) => ({
        documentId: row.documentid,
        title: row.documenttitle,
        author: row.author,
        tags: row.tags.filter((tag: string) => tag !== null),
        uploadDate: row.uploadedat,
        pageCount: row.page_count,
        wordCount: row.word_count
      }));
    } catch (error) {
      console.error('❌ Error searching documents by metadata:', error);
      throw error;
    }
  }
}

export const ragService = new RAGService();
