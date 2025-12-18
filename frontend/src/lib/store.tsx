/**
 * Global state store for persisting data across page navigation
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import * as api from './api';

// =====================
// Types
// =====================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  script?: api.ScriptSection[];
  timestamp: Date;
}

export interface ScriptThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  prompt: string;
  model: string;
  generatedScript: api.GeneratedScript | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThumbnailState {
  prompt: string;
  model: string;
  aspectRatio: string;
  generatedImage: api.GeneratedImage | null;
  sourceImage: { base64: string; mimeType: string } | null;
  fromScript?: {
    prompt: string;
    scriptId?: string;
  };
}

export interface ImageEditorHistoryState {
  imageData: ImageData;
  filterName: string;
  description: string;
  intensity: number;
}

export interface ImageEditorState {
  imageSrc: string | null;
  history: ImageEditorHistoryState[];
  historyIndex: number;
  currentFilter: string;
  filterIntensity: number;
}

interface StoreState {
  // Script Generator
  scriptThreads: ScriptThread[];
  activeThreadId: string | null;

  // Thumbnail Generator  
  thumbnailState: ThumbnailState;

  // Image Editor
  imageEditorState: ImageEditorState;

  // User
  userId: string;
}

interface StoreActions {
  // Script threads
  createThread: () => ScriptThread;
  deleteThread: (id: string) => void;
  setActiveThread: (id: string | null) => void;
  updateThread: (id: string, updates: Partial<ScriptThread>) => void;
  addMessageToThread: (threadId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;

  // Thumbnail
  setThumbnailState: (updates: Partial<ThumbnailState>) => void;
  triggerThumbnailFromScript: (prompt: string, scriptId?: string) => void;
  clearThumbnailFromScript: () => void;

  // Image Editor
  setImageEditorState: (updates: Partial<ImageEditorState>) => void;

  // User
  setUserId: (id: string) => void;
}

type Store = StoreState & StoreActions;

// =====================
// Context
// =====================

const StoreContext = createContext<Store | null>(null);

// =====================
// Initial State
// =====================

const createInitialThread = (): ScriptThread => ({
  id: crypto.randomUUID(),
  title: 'New Script',
  messages: [],
  prompt: '',
  model: 'claude-sonnet-4-20250514',
  generatedScript: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const initialThumbnailState: ThumbnailState = {
  prompt: '',
  model: 'gemini-2.5-flash-image',
  aspectRatio: '16:9',
  generatedImage: null,
  sourceImage: null,
};

const initialImageEditorState: ImageEditorState = {
  imageSrc: null,
  history: [],
  historyIndex: -1,
  currentFilter: 'none',
  filterIntensity: 50,
};

// =====================
// Provider
// =====================

import { useAuth } from './auth';

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [scriptThreads, setScriptThreads] = useState<ScriptThread[]>(() => [createInitialThread()]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => scriptThreads[0]?.id || null);
  const [thumbnailState, setThumbnailStateInternal] = useState<ThumbnailState>(initialThumbnailState);
  const [imageEditorState, setImageEditorStateInternal] = useState<ImageEditorState>(initialImageEditorState);

  // Sync with backend on user change
  useEffect(() => {
    if (user) {
      // Fetch saved scripts and convert to threads
      const loadUserScripts = async () => {
        const { data } = await api.listScripts();
        if (data) {
          const loadedThreads: ScriptThread[] = data.map(script => ({
            id: script.id, // Use persistent DB ID
            title: script.prompt.slice(0, 50) + (script.prompt.length > 50 ? '...' : ''),
            prompt: script.prompt,
            model: script.model,
            generatedScript: {
              model: script.model,
              script: script.script
            },
            // Reconstruct a message history so it looks like a chat
            messages: [
              {
                id: crypto.randomUUID(),
                role: 'user',
                content: script.prompt,
                timestamp: new Date(script.created_at)
              },
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: 'Here is your generated script:',
                script: script.script,
                timestamp: new Date(script.created_at)
              }
            ],
            createdAt: new Date(script.created_at),
            updatedAt: new Date(script.created_at),
          }));

          // Always add a "New Script" thread at the top
          const newThread = createInitialThread();
          setScriptThreads([newThread, ...loadedThreads]);
          setActiveThreadId(newThread.id);
        }
      };
      loadUserScripts();
    } else {
      // Reset to public/demo state (empty)
      const newThread = createInitialThread();
      setScriptThreads([newThread]);
      setActiveThreadId(newThread.id);
      setThumbnailStateInternal(initialThumbnailState);
      setImageEditorStateInternal(initialImageEditorState);
    }
  }, [user?.id]);

  // Script thread actions
  const createThread = useCallback(() => {
    const newThread = createInitialThread();
    setScriptThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    return newThread;
  }, []);

  const deleteThread = useCallback((id: string) => {
    // If it's a persisted script (from DB), we should probably delete it from DB too?
    // For now, let's just remove from local store. The User can delete from Library for permanent delete.
    setScriptThreads(prev => {
      const filtered = prev.filter(t => t.id !== id);
      if (filtered.length === 0) {
        const newThread = createInitialThread();
        setActiveThreadId(newThread.id);
        return [newThread];
      }
      if (activeThreadId === id) {
        setActiveThreadId(filtered[0].id);
      }
      return filtered;
    });
  }, [activeThreadId]);

  const setActiveThread = useCallback((id: string | null) => {
    setActiveThreadId(id);
  }, []);

  const updateThread = useCallback((id: string, updates: Partial<ScriptThread>) => {
    setScriptThreads(prev => prev.map(t =>
      t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
    ));
  }, []);

  const addMessageToThread = useCallback((threadId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setScriptThreads(prev => prev.map(t =>
      t.id === threadId
        ? { ...t, messages: [...t.messages, newMessage], updatedAt: new Date() }
        : t
    ));
  }, []);

  // Thumbnail actions
  const setThumbnailState = useCallback((updates: Partial<ThumbnailState>) => {
    setThumbnailStateInternal(prev => ({ ...prev, ...updates }));
  }, []);

  const triggerThumbnailFromScript = useCallback((prompt: string, scriptId?: string) => {
    setThumbnailStateInternal(prev => ({
      ...prev,
      prompt,
      fromScript: { prompt, scriptId },
    }));
  }, []);

  const clearThumbnailFromScript = useCallback(() => {
    setThumbnailStateInternal(prev => ({
      ...prev,
      fromScript: undefined,
    }));
  }, []);

  // Image editor actions
  const setImageEditorState = useCallback((updates: Partial<ImageEditorState>) => {
    setImageEditorStateInternal(prev => ({ ...prev, ...updates }));
  }, []);

  const store: Store = {
    // State
    scriptThreads,
    activeThreadId,
    thumbnailState,
    imageEditorState,
    userId: user?.id || 'demo',

    // Actions
    createThread,
    deleteThread,
    setActiveThread,
    updateThread,
    addMessageToThread,
    setThumbnailState,
    triggerThumbnailFromScript,
    clearThumbnailFromScript,
    setImageEditorState,
    setUserId: () => { }, // No-op as we use AuthContext
  };

  return (
    <StoreContext.Provider value={store}>
      {children}
    </StoreContext.Provider>
  );
}

// =====================
// Hook
// =====================

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return store;
}

// Helper to get active thread
export function useActiveThread() {
  const store = useStore();
  return store.scriptThreads.find(t => t.id === store.activeThreadId) || null;
}

