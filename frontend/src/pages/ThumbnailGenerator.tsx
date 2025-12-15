import { useState, useRef, useEffect } from 'react';
import {
  Upload, Save, Download, Trash2, X, Sparkles, Send,
  RefreshCw, ImageIcon, Settings2
} from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { useStore } from '../lib/store';
import { IMAGE_GENERATION_MODELS, ASPECT_RATIOS } from '../lib/models';
import * as api from '../lib/api';
import { uploadBlob, base64ToBlob, generateStoragePath, getPublicUrl, isSupabaseConfigured, STORAGE_BUCKET } from '../lib/supabase';
import { useAuth } from '../lib/auth';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: api.GeneratedImage;
  sourceImage?: { base64: string; mimeType: string };
  timestamp: Date;
}

export function ThumbnailGenerator() {
  const { thumbnailState, setThumbnailState, clearThumbnailFromScript } = useStore();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Initialize prompt from store
  const [prompt, setPrompt] = useState(thumbnailState.prompt || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedImages, setSavedImages] = useState<api.SavedImage[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [currentImage, setCurrentImage] = useState<api.GeneratedImage | null>(thumbnailState.generatedImage);

  // Get userId from auth context
  const localUserId = user?.id ?? 'anonymous';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check if we came from script generator
  const fromScript = thumbnailState.fromScript;

  // Sync prompt to store
  useEffect(() => {
    setThumbnailState({ prompt });
  }, [prompt]);

  useEffect(() => {
    loadSavedImages();
  }, []);

  // Handle "from script" trigger
  useEffect(() => {
    if (fromScript && thumbnailState.prompt) {
      setPrompt(thumbnailState.prompt);
      // We don't clear it immediately so it persists if we navigate back
      // clearThumbnailFromScript(); 
    }
  }, [fromScript]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadSavedImages() {
    const result = await api.listImages('thumbnail');
    if (result.data) {
      setSavedImages(result.data);
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsGenerating(true);
    setError(null);
    const currentPrompt = prompt;
    setPrompt('');

    let result: api.ApiResponse<api.ImageGenerationResult>;

    // If we have a current image, use edit mode (provide the image for context)
    if (currentImage) {
      result = await api.editImage({
        prompt: currentPrompt,
        imageBase64: currentImage.dataBase64,
        imageMimeType: currentImage.mimeType,
        model: thumbnailState.model,
        aspectRatio: thumbnailState.aspectRatio,
      });
    } else {
      result = await api.generateImage({
        prompt: currentPrompt,
        model: thumbnailState.model,
        aspectRatio: thumbnailState.aspectRatio,
      });
    }

    setIsGenerating(false);

    if (result.error) {
      setError(result.error.message);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${result.error.message}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } else if (result.data && result.data.images.length > 0) {
      const newImage = result.data.images[0];
      setCurrentImage(newImage);
      setThumbnailState({ generatedImage: newImage });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: currentImage
          ? 'I\'ve edited the image based on your instructions:'
          : 'Here\'s your generated image:',
        image: newImage,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    }
  }

  function handleUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      const image: api.GeneratedImage = {
        dataBase64: base64,
        mimeType: file.type,
      };
      setCurrentImage(image);

      // Add a message showing the uploaded image
      const uploadMessage: ChatMessage = {
        id: `upload-${Date.now()}`,
        role: 'user',
        content: 'Uploaded an image for editing',
        image,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, uploadMessage]);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!currentImage) return;

    setIsSaving(true);
    setError(null);

    let storagePath: string | undefined;
    let storageBucket: string | undefined;

    if (isSupabaseConfigured()) {
      const blob = base64ToBlob(currentImage.dataBase64, currentImage.mimeType);
      const extension = currentImage.mimeType.split('/')[1] || 'png';
      const path = generateStoragePath(localUserId, 'thumbnail', extension);

      const uploadResult = await uploadBlob(path, blob, currentImage.mimeType);

      if (!uploadResult.error) {
        storagePath = uploadResult.path;
        storageBucket = STORAGE_BUCKET;
      }
    }

    const result = await api.saveImage({
      kind: 'thumbnail',
      prompt: messages.find(m => m.role === 'user')?.content,
      model: thumbnailState.model,
      storage_bucket: storageBucket,
      storage_path: storagePath,
      mime_type: currentImage.mimeType,
      metadata: { aspectRatio: thumbnailState.aspectRatio },
    });

    setIsSaving(false);

    if (result.error) {
      setError(result.error.message);
    } else {
      loadSavedImages();
    }
  }

  function handleDownload() {
    if (!currentImage) return;

    const link = document.createElement('a');
    link.href = `data:${currentImage.mimeType};base64,${currentImage.dataBase64}`;
    link.download = `thumbnail-${Date.now()}.${currentImage.mimeType.split('/')[1] || 'png'}`;
    link.click();
  }

  function handleStartNew() {
    setMessages([]);
    setCurrentImage(null);
    setThumbnailState({ generatedImage: null, prompt: '' });
    setPrompt('');
  }

  async function handleDelete(id: string) {
    const result = await api.deleteImage(id);
    if (result.data?.deleted) {
      loadSavedImages();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-[calc(100vh-10rem)] sm:h-[calc(100vh-12rem)]">
      {/* From Script Banner */}
      {fromScript && (
        <div className="lg:hidden bg-gradient-to-r from-pink-900/30 to-violet-900/30 border border-pink-800/50 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span className="text-xs text-pink-200">Auto-generated from script</span>
          </div>
          <button
            onClick={() => clearThumbnailFromScript()}
            className="p-1 text-pink-400 hover:text-pink-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden min-h-0">
        {/* Header */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-pink-500 to-violet-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-50 text-sm sm:text-base truncate">Thumbnail Generator</h2>
              <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">Generate, edit, and refine images</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentImage && (
              <>
                <button
                  onClick={handleDownload}
                  className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  {isSaving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
                  <span className="hidden md:inline">Save</span>
                </button>
              </>
            )}
            <button
              onClick={handleStartNew}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Start New"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              title="Settings"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="px-3 sm:px-6 py-3 border-b border-slate-800 bg-slate-800/50">
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[10px] sm:text-xs font-medium text-slate-400 mb-1">Model</label>
                <select
                  value={thumbnailState.model}
                  onChange={(e) => setThumbnailState({ model: e.target.value })}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {IMAGE_GENERATION_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[100px]">
                <label className="block text-[10px] sm:text-xs font-medium text-slate-400 mb-1">Aspect Ratio</label>
                <select
                  value={thumbnailState.aspectRatio}
                  onChange={(e) => setThumbnailState({ aspectRatio: e.target.value })}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {ASPECT_RATIOS.map((ar) => (
                    <option key={ar.value} value={ar.value}>{ar.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-2 text-[10px] sm:text-xs text-slate-500">
              {IMAGE_GENERATION_MODELS.find(m => m.id === thumbnailState.model)?.description}
            </p>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4">
          {error && (
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          )}

          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-pink-500/20 to-violet-500/20 rounded-2xl flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-pink-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-200 mb-2">
                Generate Your Thumbnail
              </h3>
              <p className="text-sm text-slate-500 max-w-md mb-6">
                Describe the image you want, or upload an existing image to edit. You can keep refining until it's perfect.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setPrompt('A professional YouTube thumbnail with bold text and vibrant colors')}
                  className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors"
                >
                  YouTube thumbnail
                </button>
                <button
                  onClick={() => setPrompt('A minimalist logo design with geometric shapes')}
                  className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors"
                >
                  Logo design
                </button>
                <button
                  onClick={() => setPrompt('A stunning landscape photo of mountains at sunset')}
                  className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors"
                >
                  Landscape
                </button>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] sm:max-w-md ${message.role === 'user' ? 'bg-violet-600' : 'bg-slate-800'} rounded-2xl px-4 py-3`}>
                  <p className="text-sm text-slate-100">{message.content}</p>
                  {message.image && (
                    <img
                      src={`data:${message.image.mimeType};base64,${message.image.dataBase64}`}
                      alt="Generated"
                      className="mt-3 rounded-lg max-w-full"
                    />
                  )}
                </div>
              </div>
            ))
          )}

          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-slate-800 rounded-2xl px-4 py-3 flex items-center gap-3">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-slate-400">
                  {currentImage ? 'Editing image...' : 'Generating image...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-slate-800 bg-slate-900/50">
          {/* Current image indicator */}
          {currentImage && (
            <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg">
              <img
                src={`data:${currentImage.mimeType};base64,${currentImage.dataBase64}`}
                alt="Current"
                className="w-10 h-10 object-cover rounded"
              />
              <span className="text-xs text-slate-400 flex-1">Editing this image</span>
              <button
                onClick={() => setCurrentImage(null)}
                className="p-1 text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadImage}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors flex-shrink-0"
              title="Upload image to edit"
            >
              <Upload className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  currentImage
                    ? "Describe how to edit the image..."
                    : "Describe the image you want to generate..."
                }
                rows={2}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-xl transition-all flex-shrink-0"
            >
              {isGenerating ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500 text-center hidden sm:block">
            Enter to send • Upload an image to switch to edit mode • Change model anytime in settings
          </p>
        </div>
      </div>

      {/* Saved Images Sidebar */}
      <div className="w-full lg:w-72 xl:w-80 flex-shrink-0">
        <div className="bg-slate-900 rounded-xl border border-slate-800 h-full flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800">
            <h3 className="font-semibold text-slate-50 text-sm">
              Saved Thumbnails ({savedImages.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {savedImages.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">
                No saved thumbnails yet
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
                {savedImages.slice(0, 10).map((img) => (
                  <div key={img.id} className="group relative aspect-video">
                    {img.storage_path ? (
                      <img
                        src={getPublicUrl(img.storage_path)}
                        alt={img.prompt || 'Thumbnail'}
                        className="w-full h-full object-cover rounded-lg bg-slate-800"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 rounded-lg flex items-center justify-center">
                        <span className="text-slate-600 text-[10px]">No preview</span>
                      </div>
                    )}
                    <button
                      onClick={() => handleDelete(img.id)}
                      className="absolute top-1 right-1 p-1 bg-slate-900/80 hover:bg-red-600 rounded opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-slate-300" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
