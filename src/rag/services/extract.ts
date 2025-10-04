import pdf from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { config } from '../../lib/config.js';
import { logger } from '../../lib/logger.js';
import { ExtractedPage } from '../types.js';

export class PDFExtractionService {
  private static worker: any = null;

  /**
   * Extract text from PDF using pdf-parse first, then OCR if needed
   */
  static async extractText(pdfBuffer: Buffer): Promise<ExtractedPage[]> {
    try {
      // First try pdf-parse for text-based PDFs
      const pdfData = await pdf(pdfBuffer);
      
      if (pdfData.text && pdfData.text.trim().length > 100) {
        logger.info(`Extracted ${pdfData.text.length} characters using pdf-parse`);
        return this.splitTextIntoPages(pdfData.text, pdfData.numpages);
      }

      // If pdf-parse didn't work well, try OCR
      logger.info('PDF text extraction yielded low results, trying OCR...');
      return await this.extractWithOCR(pdfBuffer);
    } catch (error) {
      logger.error('PDF extraction failed:', error);
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Split extracted text into pages (simplified approach)
   */
  private static splitTextIntoPages(text: string, numPages: number): ExtractedPage[] {
    const pages: ExtractedPage[] = [];
    const lines = text.split('\n');
    const linesPerPage = Math.ceil(lines.length / numPages);

    for (let i = 0; i < numPages; i++) {
      const startLine = i * linesPerPage;
      const endLine = Math.min((i + 1) * linesPerPage, lines.length);
      const pageText = lines.slice(startLine, endLine).join('\n').trim();
      
      pages.push({
        pageNumber: i + 1,
        text: pageText
      });
    }

    return pages;
  }

  /**
   * Extract text using Tesseract OCR
   */
  private static async extractWithOCR(pdfBuffer: Buffer): Promise<ExtractedPage[]> {
    try {
      // Initialize Tesseract worker if not already done
      if (!this.worker) {
        this.worker = await createWorker('eng');
      }

      // For now, we'll use a simplified approach
      // In production, you might want to convert PDF to images first
      // using pdf2pic or similar library
      
      logger.warn('OCR extraction not fully implemented - using fallback text extraction');
      
      // Fallback: return the PDF as a single page
      const pdfData = await pdf(pdfBuffer);
      return [{
        pageNumber: 1,
        text: pdfData.text || 'No text could be extracted from this PDF'
      }];
    } catch (error) {
      logger.error('OCR extraction failed:', error);
      throw new Error(`OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleanup Tesseract worker
   */
  static async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
