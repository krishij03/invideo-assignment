/**
 * AI Model configurations
 * Claude models for text/script generation
 * Gemini models for image generation
 */

export interface AIModel {
  id: string;
  name: string;
  description: string;
  supportsImages: boolean;
  supportsImageGeneration: boolean;
  maxInputTokens: number;
  maxOutputTokens: number;
  category: 'latest' | 'stable' | 'preview' | 'experimental';
  provider: 'anthropic' | 'google';
}

// For backward compatibility
export type GeminiModel = AIModel;

// Text generation models (Claude for scripts)
export const TEXT_MODELS: AIModel[] = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    description: 'Best balance of intelligence and speed (recommended)',
    supportsImages: false,
    supportsImageGeneration: false,
    maxInputTokens: 200000,
    maxOutputTokens: 64000,
    category: 'latest',
    provider: 'anthropic',
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    description: 'Previous gen Sonnet, excellent performance',
    supportsImages: false,
    supportsImageGeneration: false,
    maxInputTokens: 200000,
    maxOutputTokens: 8192,
    category: 'stable',
    provider: 'anthropic',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    description: 'Fast and cost-efficient for simple tasks',
    supportsImages: false,
    supportsImageGeneration: false,
    maxInputTokens: 200000,
    maxOutputTokens: 8192,
    category: 'stable',
    provider: 'anthropic',
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    description: 'Most intelligent model for complex reasoning',
    supportsImages: false,
    supportsImageGeneration: false,
    maxInputTokens: 200000,
    maxOutputTokens: 32000,
    category: 'latest',
    provider: 'anthropic',
  },
];

// Image generation models (Gemini for thumbnails)
export const IMAGE_GENERATION_MODELS: AIModel[] = [
  {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image',
    description: 'Best image generation model (recommended)',
    supportsImages: true,
    supportsImageGeneration: true,
    maxInputTokens: 65536,
    maxOutputTokens: 32768,
    category: 'stable',
    provider: 'google',
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
    provider: 'google',
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
    provider: 'google',
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
export function getModelById(id: string): AIModel | undefined {
  return ALL_MODELS.find(m => m.id === id);
}

// Helper to get category badge color
export function getCategoryColor(category: AIModel['category']): string {
  switch (category) {
    case 'stable': return 'bg-emerald-600';
    case 'latest': return 'bg-blue-600';
    case 'preview': return 'bg-amber-600';
    case 'experimental': return 'bg-purple-600';
    default: return 'bg-slate-600';
  }
}

// Helper to get provider badge color
export function getProviderColor(provider: AIModel['provider']): string {
  switch (provider) {
    case 'anthropic': return 'bg-orange-600';
    case 'google': return 'bg-blue-500';
    default: return 'bg-slate-600';
  }
}

