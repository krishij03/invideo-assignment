/**
 * Gemini model configurations
 * Based on: https://ai.google.dev/gemini-api/docs/models
 */

export interface GeminiModel {
  id: string;
  name: string;
  description: string;
  supportsImages: boolean;
  supportsImageGeneration: boolean;
  maxInputTokens: number;
  maxOutputTokens: number;
  category: 'latest' | 'stable' | 'preview' | 'experimental';
}

// Text generation models (for scripts)
export const TEXT_MODELS: GeminiModel[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Fast & intelligent, best for large scale processing',
    supportsImages: true,
    supportsImageGeneration: false,
    maxInputTokens: 1048576,
    maxOutputTokens: 65536,
    category: 'stable',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Advanced thinking model for complex problems',
    supportsImages: true,
    supportsImageGeneration: false,
    maxInputTokens: 1048576,
    maxOutputTokens: 65536,
    category: 'stable',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    description: 'Ultra fast, cost-efficient',
    supportsImages: true,
    supportsImageGeneration: false,
    maxInputTokens: 1048576,
    maxOutputTokens: 65536,
    category: 'stable',
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro (Preview)',
    description: 'Most intelligent model, best reasoning',
    supportsImages: true,
    supportsImageGeneration: false,
    maxInputTokens: 1048576,
    maxOutputTokens: 65536,
    category: 'preview',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Second gen workhorse, 1M context',
    supportsImages: true,
    supportsImageGeneration: false,
    maxInputTokens: 1048576,
    maxOutputTokens: 8192,
    category: 'latest',
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash-Lite',
    description: 'Fast and cost-efficient',
    supportsImages: true,
    supportsImageGeneration: false,
    maxInputTokens: 1048576,
    maxOutputTokens: 8192,
    category: 'stable',
  },
];

// Image generation models (for thumbnails)
export const IMAGE_GENERATION_MODELS: GeminiModel[] = [
  {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image',
    description: 'Best image generation model (recommended)',
    supportsImages: true,
    supportsImageGeneration: true,
    maxInputTokens: 65536,
    maxOutputTokens: 32768,
    category: 'stable',
  },
  {
    id: 'gemini-3-pro-image-preview',
    name: 'Gemini 3 Pro Image (Preview)',
    description: 'Most advanced image generation with thinking',
    supportsImages: true,
    supportsImageGeneration: true,
    maxInputTokens: 65536,
    maxOutputTokens: 32768,
    category: 'preview',
  },
  {
    id: 'gemini-2.0-flash-preview-image-generation',
    name: 'Gemini 2.0 Flash Image',
    description: 'Second gen image generation',
    supportsImages: true,
    supportsImageGeneration: true,
    maxInputTokens: 32768,
    maxOutputTokens: 8192,
    category: 'preview',
  },
];

// All models combined
export const ALL_MODELS = [...TEXT_MODELS, ...IMAGE_GENERATION_MODELS];

// Aspect ratios for image generation
export const ASPECT_RATIOS = [
  { value: '16:9', label: '16:9 (Landscape)', icon: '🖼️' },
  { value: '1:1', label: '1:1 (Square)', icon: '⬜' },
  { value: '9:16', label: '9:16 (Portrait)', icon: '📱' },
  { value: '4:3', label: '4:3 (Standard)', icon: '🖥️' },
  { value: '3:4', label: '3:4 (Portrait Standard)', icon: '📷' },
];

// Helper to get model by ID
export function getModelById(id: string): GeminiModel | undefined {
  return ALL_MODELS.find(m => m.id === id);
}

// Helper to get category badge color
export function getCategoryColor(category: GeminiModel['category']): string {
  switch (category) {
    case 'stable': return 'bg-emerald-600';
    case 'latest': return 'bg-blue-600';
    case 'preview': return 'bg-amber-600';
    case 'experimental': return 'bg-purple-600';
    default: return 'bg-slate-600';
  }
}

