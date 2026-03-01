export interface ImagePrompt {
  id: number;
  prompt: string;
  style: string;
}

export interface GeneratedImage {
  id: number;
  filename: string;
  success: boolean;
  error?: string;
}

export interface PipelineResult {
  totalPrompts: number;
  successfulImages: number;
  failedImages: number;
  results: GeneratedImage[];
}

export type ImageSize = '1024x1024' | '1536x1024' | '1024x1536';
export type ImageQuality = 'low' | 'medium' | 'high' | 'auto';
export type OutputFormat = 'png' | 'jpeg' | 'webp';
export type ImageProvider = 'openai' | 'gemini';
export type GeminiAspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
