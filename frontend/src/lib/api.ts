/**
 * API client for communicating with the Phoenix backend
 */

import { getAccessToken } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// Usage stats returned by auth endpoints
export interface UsageStats {
  scripts: {
    used: number;
    limit: number | null;
    remaining: number | 'unlimited';
  };
  images: {
    used: number;
    limit: number | null;
    remaining: number | 'unlimited';
  };
  is_admin: boolean;
}

async function fetchJson<T>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth: boolean = true
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth token if available
  if (requireAuth) {
    try {
      // Add a timeout for getting the access token
      const tokenPromise = getAccessToken();
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          // Quietly proceed without token if it takes too long
          console.debug('[API] Token retrieval timed out - proceeding without token');
          resolve(null);
        }, 5000);
      });

      const token = await Promise.race([tokenPromise, timeoutPromise]);

      if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('[API] Error getting access token:', e);
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return {};
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Handle non-JSON responses (like 401/403 from backend proxies)
      if (!response.ok) {
        return { error: { message: `HTTP Error ${response.status}` } };
      }
      return {}; // Fallback for success without JSON
    }

    const json = await response.json();

    if (!response.ok) {
      return {
        error: json.error || { message: `HTTP ${response.status}` },
      };
    }

    return { data: json.data };
  } catch (err) {
    console.error('[API] Network error:', err);
    return {
      error: {
        message: err instanceof Error ? err.message : 'Network error',
      },
    };
  }
}

// =====================
// Auth endpoints
// =====================

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  is_admin: boolean;
}

export interface CurrentUserResponse {
  user: AuthUser;
  usage: UsageStats;
}

export async function getCurrentUser() {
  return fetchJson<CurrentUserResponse>('/api/auth/me');
}

export async function getUsage() {
  return fetchJson<UsageStats>('/api/auth/usage');
}

// =====================
// Script endpoints
// =====================

export interface ScriptSection {
  timestamp: string;
  visual_cue: string;
  audio_script: string;
  duration: number;
}

export interface GeneratedScript {
  model: string;
  script: ScriptSection[];
  usage?: UsageStats;
}

export interface SavedScript {
  id: string;
  prompt: string;
  model: string;
  script: ScriptSection[];
  created_at: string;
}

export interface HistoryTurn {
  role: 'user' | 'model';
  content: string;
  script?: ScriptSection[];
}

export async function generateScript(prompt: string, model?: string, history?: HistoryTurn[]) {
  return fetchJson<GeneratedScript>('/api/script/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt, model, history }),
  });
}

export async function saveScript(prompt: string, model: string, script: ScriptSection[]) {
  return fetchJson<SavedScript>('/api/scripts', {
    method: 'POST',
    body: JSON.stringify({ prompt, model, script }),
  });
}

export async function listScripts() {
  return fetchJson<SavedScript[]>('/api/scripts');
}

export async function getScript(id: string) {
  return fetchJson<SavedScript>(`/api/scripts/${id}`);
}

export async function deleteScript(id: string) {
  return fetchJson<{ deleted: boolean }>(`/api/scripts/${id}`, {
    method: 'DELETE',
  });
}

// =====================
// Image generation endpoints
// =====================

export interface GeneratedImage {
  mimeType: string;
  dataBase64: string;
}

export interface ImageGenerationResult {
  model: string;
  texts: string[];
  images: GeneratedImage[];
  usage?: UsageStats;
}

export interface GenerateImageParams {
  prompt: string;
  model?: string;
  aspectRatio?: string;
  imageSize?: string;
}

export async function generateImage(params: GenerateImageParams) {
  return fetchJson<ImageGenerationResult>('/api/images/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface EditImageParams {
  prompt: string;
  imageBase64: string;
  imageMimeType: string;
  model?: string;
  aspectRatio?: string;
}

export async function editImage(params: EditImageParams) {
  return fetchJson<ImageGenerationResult>('/api/images/edit', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface ComposeImagesParams {
  prompt: string;
  images: { base64: string; mimeType: string }[];
  model?: string;
  aspectRatio?: string;
}

export async function composeImages(params: ComposeImagesParams) {
  return fetchJson<ImageGenerationResult>('/api/images/compose', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// =====================
// Saved images CRUD
// =====================

export interface SavedImage {
  id: string;
  kind: string;
  prompt: string | null;
  model: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SaveImageParams {
  kind: string;
  prompt?: string;
  model?: string;
  storage_bucket?: string;
  storage_path?: string;
  mime_type?: string;
  width?: number;
  height?: number;
  metadata?: Record<string, unknown>;
}

export async function saveImage(params: SaveImageParams) {
  return fetchJson<SavedImage>('/api/images', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function listImages(kind?: string) {
  const query = kind ? `?kind=${encodeURIComponent(kind)}` : '';
  return fetchJson<SavedImage[]>(`/api/images${query}`);
}

export async function getImage(id: string) {
  return fetchJson<SavedImage>(`/api/images/${id}`);
}

export async function deleteImage(id: string) {
  return fetchJson<{ deleted: boolean }>(`/api/images/${id}`, {
    method: 'DELETE',
  });
}

// =====================
// Refinement sessions (multi-turn)
// =====================

export interface RefineSession {
  id: string;
  model: string;
  title: string | null;
  created_at: string;
}

export interface RefineTurn {
  id: string;
  role: 'user' | 'model';
  parts: unknown[];
  created_at: string;
}

export interface TurnResult {
  turn_id: string;
  texts: string[];
  images: GeneratedImage[];
  model: string;
  usage?: UsageStats;
}

export async function createRefineSession(model?: string, title?: string) {
  return fetchJson<RefineSession>('/api/refine/sessions', {
    method: 'POST',
    body: JSON.stringify({ model, title }),
  });
}

export async function listRefineSessions() {
  return fetchJson<RefineSession[]>('/api/refine/sessions');
}

export async function getRefineSession(id: string) {
  return fetchJson<RefineSession>(`/api/refine/sessions/${id}`);
}

export async function createRefineTurn(
  sessionId: string,
  message: string,
  images?: { base64: string; mimeType: string }[]
) {
  return fetchJson<TurnResult>(`/api/refine/sessions/${sessionId}/turns`, {
    method: 'POST',
    body: JSON.stringify({ message, images }),
  });
}

export async function listRefineTurns(sessionId: string) {
  return fetchJson<RefineTurn[]>(`/api/refine/sessions/${sessionId}/turns`);
}

// =====================
// Health check (public)
// =====================

export async function healthCheck() {
  return fetchJson<{ ok: boolean }>('/api/health', {}, false);
}
