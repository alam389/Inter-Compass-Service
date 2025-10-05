import * as pdf from 'pdf-parse';
import { db } from '../database';

/**
 * PDF Processor Service
 * Handles PDF parsing, text extraction, and metadata extraction
 */

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modDate?: Date;
  pages?: number;
  extractedTags?: string[];
  language?: string;
  documentType?: string;
}

export interface PDFProcessingResult {
  text: string;
  metadata: PDFMetadata;
  pageCount: number;
  wordCount: number;
  sections?: Section[];
}

export interface Section {
  title?: string;
  content: string;
  startPage?: number;
  endPage?: number;
  level?: number;
}

export class PDFProcessor {
  /**
   * Extract text and metadata from PDF buffer
   */
  async processPDF(buffer: Buffer): Promise<PDFProcessingResult> {
    try {
      const data = await (pdf as any)(buffer);
      
      // Extract metadata
      const metadata: PDFMetadata = {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
        keywords: data.info?.Keywords,
        creator: data.info?.Creator,
        producer: data.info?.Producer,
        creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
        modDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
        pages: data.numpages,
        extractedTags: this.extractTags(data.info),
        language: this.detectLanguage(data.text),
        documentType: this.detectDocumentType(data.text, data.info)
      };

      // Extract text and clean it
      const text = this.cleanText(data.text);
      const wordCount = this.countWords(text);
      
      // Extract sections for better structure
      const sections = this.extractSections(text);

      return {
        text,
        metadata,
        pageCount: data.numpages,
        wordCount,
        sections
      };
    } catch (error) {
      console.error('Error processing PDF:', error);
      throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean extracted text (remove extra whitespace, fix encoding issues)
   */
  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')  // Remove excessive newlines
      .replace(/[ \t]+/g, ' ')  // Normalize spaces
      .replace(/\u0000/g, '')  // Remove null characters
      .trim();
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Extract metadata from filename if available
   */
  extractFilenameMetadata(filename: string): Partial<PDFMetadata> {
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.pdf$/i, '');
    
    // Try to extract title from filename
    const title = nameWithoutExt
      .replace(/[-_]/g, ' ')  // Replace separators with spaces
      .replace(/\b\w/g, l => l.toUpperCase());  // Title case
    
    return { title };
  }

  /**
   * Extract tags from PDF metadata
   */
  private extractTags(info: any): string[] {
    const tags: string[] = [];
    
    if (info?.Keywords) {
      // Split keywords by common separators
      const keywords = info.Keywords.split(/[,;|]+/).map((k: string) => k.trim());
      tags.push(...keywords.filter((k: string) => k.length > 0));
    }
    
    if (info?.Subject) {
      tags.push(info.Subject.trim());
    }
    
    return tags;
  }

  /**
   * Detect language from text content
   */
  private detectLanguage(text: string): string {
    // Simple heuristic-based language detection
    const sample = text.substring(0, 1000).toLowerCase();
    
    // Check for common English words
    const englishWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'for'];
    const englishCount = englishWords.filter(word => sample.includes(` ${word} `)).length;
    
    if (englishCount >= 4) {
      return 'en';
    }
    
    // Default to unknown
    return 'unknown';
  }

  /**
   * Detect document type from content and metadata
   */
  private detectDocumentType(text: string, info: any): string {
    const lowerText = text.toLowerCase().substring(0, 2000);
    const title = (info?.Title || '').toLowerCase();
    
    // Check for common document types
    if (lowerText.includes('onboarding') || title.includes('onboarding')) {
      return 'onboarding';
    } else if (lowerText.includes('policy') || lowerText.includes('policies')) {
      return 'policy';
    } else if (lowerText.includes('training') || lowerText.includes('tutorial')) {
      return 'training';
    } else if (lowerText.includes('handbook') || lowerText.includes('manual')) {
      return 'handbook';
    } else if (lowerText.includes('guide')) {
      return 'guide';
    } else if (lowerText.includes('procedure') || lowerText.includes('process')) {
      return 'procedure';
    }
    
    return 'general';
  }

  /**
   * Extract sections from text
   */
  private extractSections(text: string): Section[] {
    const sections: Section[] = [];
    
    // Split by common heading patterns
    const lines = text.split('\n');
    let currentSection: Section = { content: '', level: 0 };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line is a heading (all caps, short, or starts with number/bullet)
      const isHeading = (
        (line.length > 0 && line.length < 100 && line === line.toUpperCase() && line.split(' ').length <= 10) ||
        /^(\d+\.|\d+\))\s+[A-Z]/.test(line) ||
        /^[A-Z][^.!?]*$/.test(line) && line.length < 80
      );
      
      if (isHeading && currentSection.content.length > 0) {
        // Save previous section
        sections.push({ ...currentSection });
        // Start new section
        currentSection = {
          title: line,
          content: '',
          level: this.detectHeadingLevel(line)
        };
      } else {
        currentSection.content += line + '\n';
      }
    }
    
    // Add last section
    if (currentSection.content.length > 0) {
      sections.push(currentSection);
    }
    
    return sections.length > 0 ? sections : [{ content: text, level: 0 }];
  }

  /**
   * Detect heading level
   */
  private detectHeadingLevel(line: string): number {
    if (/^\d+\.\s/.test(line)) return 1;
    if (/^\d+\.\d+\s/.test(line)) return 2;
    if (/^\d+\.\d+\.\d+\s/.test(line)) return 3;
    if (line === line.toUpperCase()) return 1;
    return 2;
  }
}

export const pdfProcessor = new PDFProcessor();
