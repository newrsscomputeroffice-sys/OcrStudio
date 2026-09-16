export type DocumentType = 'image' | 'pdf' | 'docx' | 'unknown';

export type OCREngine = 'auto' | 'sarvam' | 'gemini';

export type ContentType = 'handwritten' | 'printed' | 'mixed';

export interface ImageFilters {
  brightness: number; // 50 to 150 (default 100)
  contrast: number; // 50 to 200 (default 100)
  invert: boolean;
  rotation: number; // 0, 90, 180, 270
  binarize: boolean; // Black & White threshold
}

export interface DocumentItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: DocumentType;
  previewUrl: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  extractedText: string;
  extractedMarkdown: string;
  engineUsed: string;
  confidence: 'high' | 'medium' | 'low';
  wordCount: number;
  characterCount: number;
  error?: string;
  notes?: string;
  imageFilters: ImageFilters;
  enhancedBlob?: Blob;
}

export interface OCRSettings {
  engine: OCREngine;
  language: string;
  contentType: ContentType;
  autoLightingCorrection: boolean;
  customPrompt: string;
}

export interface SystemStatus {
  sarvamConfigured: boolean;
  geminiConfigured: boolean;
}
