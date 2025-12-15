import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Download, Save, Undo, Redo, RotateCcw, Sliders, Split, ChevronsLeftRight } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
// @ts-ignore
import init, * as wasm from 'hello_world';
import * as api from '../lib/api';
import { uploadBlob, generateStoragePath, isSupabaseConfigured, STORAGE_BUCKET } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useStore, type ImageEditorHistoryState } from '../lib/store';

interface FilterConfig {
  name: string;
  label: string;
  hasIntensity: boolean;
  defaultIntensity: number;
  minIntensity: number;
  maxIntensity: number;
}

const FILTERS: FilterConfig[] = [
  { name: 'grayscale', label: 'Grayscale', hasIntensity: false, defaultIntensity: 100, minIntensity: 0, maxIntensity: 100 },
  { name: 'invert', label: 'Invert', hasIntensity: false, defaultIntensity: 100, minIntensity: 0, maxIntensity: 100 },
  { name: 'sepia', label: 'Sepia', hasIntensity: true, defaultIntensity: 80, minIntensity: 0, maxIntensity: 100 },
  { name: 'brightness', label: 'Brightness', hasIntensity: true, defaultIntensity: 0, minIntensity: -100, maxIntensity: 100 },
  { name: 'contrast', label: 'Contrast', hasIntensity: true, defaultIntensity: 100, minIntensity: 50, maxIntensity: 200 },
  { name: 'blur', label: 'Blur', hasIntensity: true, defaultIntensity: 1, minIntensity: 1, maxIntensity: 10 },
  { name: 'saturation', label: 'Saturation', hasIntensity: true, defaultIntensity: 100, minIntensity: 0, maxIntensity: 200 },
  { name: 'hue', label: 'Hue Rotate', hasIntensity: true, defaultIntensity: 0, minIntensity: 0, maxIntensity: 360 },
  { name: 'posterize', label: 'Posterize', hasIntensity: true, defaultIntensity: 8, minIntensity: 2, maxIntensity: 16 },
  { name: 'threshold', label: 'Threshold', hasIntensity: true, defaultIntensity: 128, minIntensity: 0, maxIntensity: 255 },
];

const MAX_HISTORY = 20;

// Type for WASM memory
interface WasmMemory {
  buffer: ArrayBuffer;
}

export function ImageEditor() {
  const { user } = useAuth();
  const { imageEditorState, setImageEditorState } = useStore();
  const [wasmReady, setWasmReady] = useState(false);
  const [wasmMemory, setWasmMemory] = useState<WasmMemory | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('brightness');
  const [intensity, setIntensity] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  // Get userId from auth context
  const userId = user?.id ?? 'anonymous';

  // History for smart undo/redo
  const [history, setHistory] = useState<ImageEditorHistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // For real-time preview
  const [isApplying, setIsApplying] = useState(false);
  const [previewTimeout, setPreviewTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const lastAppliedRef = useRef<{ filter: string; intensity: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalImageRef = useRef<ImageData | null>(null);
  const workingImageRef = useRef<ImageData | null>(null);

  // Comparison Slider State
  const [compareMode, setCompareMode] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const beforeCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    init().then((wasmModule: any) => {
      setWasmReady(true);
      if (wasmModule && 'memory' in wasmModule) {
        setWasmMemory(wasmModule.memory as WasmMemory);
      }
      console.log('WASM initialized successfully');
    }).catch((err: Error) => {
      console.error('Failed to initialize WASM:', err);
      setError('Failed to load WebAssembly module');
    });
  }, []);

  // Restore state from store
  useEffect(() => {
    if (!imageLoaded && imageEditorState.history.length > 0 && canvasRef.current && imageEditorState.historyIndex >= 0) {
      const state = imageEditorState.history[imageEditorState.historyIndex];
      const canvas = canvasRef.current;
      canvas.width = state.imageData.width;
      canvas.height = state.imageData.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.putImageData(state.imageData, 0, 0);

        // Restore refs
        originalImageRef.current = imageEditorState.history[0].imageData;
        workingImageRef.current = state.imageData;

        // Restore local state
        setHistory(imageEditorState.history);
        setHistoryIndex(imageEditorState.historyIndex);
        setSelectedFilter(imageEditorState.currentFilter);
        setIntensity(imageEditorState.filterIntensity);
        setImageLoaded(true);
      }
    }
  }, [imageLoaded, imageEditorState, canvasRef.current]);

  // Sync state to store whenever it changes
  useEffect(() => {
    if (imageLoaded) {
      setImageEditorState({
        history,
        historyIndex,
        currentFilter: selectedFilter,
        filterIntensity: intensity,
      });
    }
  }, [history, historyIndex, selectedFilter, intensity, imageLoaded, setImageEditorState]);

  // Sync intensity when changing filters or undoing/redoing
  useEffect(() => {
    const currentHistory = history[historyIndex];
    if (currentHistory && currentHistory.filterName === selectedFilter) {
      // If we are revisiting the current active filter, restore its intensity
      setIntensity(currentHistory.intensity);
    } else {
      // Otherwise set to default
      const filter = FILTERS.find(f => f.name === selectedFilter);
      if (filter) {
        setIntensity(filter.defaultIntensity);
      }
    }
  }, [selectedFilter, historyIndex, history]);

  // Sync "Before" canvas when comparison mode is toggled
  useEffect(() => {
    if (compareMode && beforeCanvasRef.current && originalImageRef.current) {
      const canvas = beforeCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Match dimensions
        if (canvasRef.current) {
          canvas.width = canvasRef.current.width;
          canvas.height = canvasRef.current.height;
        } else {
          canvas.width = originalImageRef.current.width;
          canvas.height = originalImageRef.current.height;
        }

        ctx.putImageData(originalImageRef.current, 0, 0);
      }
    }
  }, [compareMode, imageLoaded]);

  // Comparison Slider Interaction
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDraggingSlider(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDraggingSlider(false);
  }, []);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingSlider || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;

    // Calculate percentage (0 to 100)
    let pos = ((clientX - rect.left) / rect.width) * 100;
    pos = Math.max(0, Math.min(100, pos));

    setSliderPosition(pos);
  }, [isDraggingSlider]);

  useEffect(() => {
    if (isDraggingSlider) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);

      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDraggingSlider, handleDragMove, handleDragEnd]);

  // Read-only helper to get the correct source image for operations
  const getSourceImageForOperation = useCallback((targetFilter: string) => {
    // If we have no history, fallback to original or working
    if (historyIndex < 0 || history.length === 0) return workingImageRef.current;

    const currentHistory = history[historyIndex];

    // If the top of history is the SAME filter we are trying to apply,
    // we must use the PREVIOUS history item as source to avoid double-application.
    if (currentHistory.filterName === targetFilter) {
      // Return the image from the step BEFORE this one
      // (If this is the first step, return original)
      const prevIndex = historyIndex - 1;
      if (prevIndex >= 0) {
        return history[prevIndex].imageData;
      } else {
        // This shouldn't theoretically happen if index 0 is always "original", 
        // but as a fallback use the original ref
        return originalImageRef.current;
      }
    }

    // Otherwise (applying a NEW filter on top), use the current top of history
    return currentHistory.imageData;
  }, [history, historyIndex]);

  // Real-time preview effect
  useEffect(() => {
    if (!imageLoaded || !wasmReady) return;

    // Clear previous timeout
    if (previewTimeout) {
      clearTimeout(previewTimeout);
    }

    // Debounce the preview
    const timeout = setTimeout(() => {
      applyFilterPreview();
    }, 50); // 50ms debounce for smooth real-time updates

    setPreviewTimeout(timeout);

    return () => {
      if (previewTimeout) {
        clearTimeout(previewTimeout);
      }
    };
  }, [intensity, selectedFilter, imageLoaded, wasmReady]);


  function cloneImageData(imageData: ImageData): ImageData {
    return new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Calculate dimensions (max 800px on desktop, 600px on mobile)
      const maxSize = window.innerWidth < 640 ? 600 : 800;
      let width = img.width;
      let height = img.height;

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else {
          width = (width / height) * maxSize;
          height = maxSize;
        }
      }

      canvas.width = Math.floor(width);
      canvas.height = Math.floor(height);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      originalImageRef.current = cloneImageData(imageData);
      workingImageRef.current = cloneImageData(imageData);

      // Reset history with original image
      setHistory([{
        imageData: cloneImageData(imageData),
        filterName: 'original',
        description: 'Original Image',
        intensity: 0
      }]);
      setHistoryIndex(0);
      setImageLoaded(true);
      lastAppliedRef.current = null;
    };

    img.src = URL.createObjectURL(file);
  }

  function applyFilterToData(imageData: ImageData, filterName: string, filterIntensity: number): ImageData | null {
    if (!wasmMemory) return null;

    const data = imageData.data;
    const len = data.length;
    const width = imageData.width;
    const height = imageData.height;

    try {
      const ptr = wasm.alloc_buffer(len);

      if (!ptr) {
        throw new Error('Failed to allocate WASM memory');
      }

      const wasmArray = new Uint8Array(wasmMemory.buffer, ptr, len);
      wasmArray.set(data);

      switch (filterName) {
        case 'grayscale':
          wasm.apply_grayscale(ptr, len);
          break;
        case 'invert':
          wasm.apply_invert(ptr, len);
          break;
        case 'sepia':
          wasm.apply_sepia(ptr, len, Math.max(0, Math.min(100, filterIntensity)));
          break;
        case 'brightness':
          wasm.apply_brightness(ptr, len, filterIntensity);
          break;
        case 'contrast':
          wasm.apply_contrast(ptr, len, Math.max(0, Math.min(200, filterIntensity)));
          break;
        case 'blur':
          wasm.apply_blur(ptr, len, width, height, Math.max(1, Math.min(10, filterIntensity)));
          break;
        case 'saturation':
          wasm.apply_saturation(ptr, len, Math.max(0, Math.min(200, filterIntensity)));
          break;
        case 'hue':
          wasm.apply_hue_rotate(ptr, len, filterIntensity);
          break;
        case 'posterize':
          wasm.apply_posterize(ptr, len, Math.max(2, Math.min(16, filterIntensity)));
          break;
        case 'threshold':
          wasm.apply_threshold(ptr, len, Math.max(0, Math.min(255, filterIntensity)));
          break;
        default:
          wasm.free_buffer(ptr, len);
          return null;
      }

      const resultArray = new Uint8Array(wasmMemory.buffer, ptr, len);
      const resultData = new Uint8ClampedArray(resultArray);

      wasm.free_buffer(ptr, len);

      return new ImageData(resultData, width, height);
    } catch (err) {
      console.error('Filter error:', err);
      return null;
    }
  }

  function applyFilterPreview() {
    if (!canvasRef.current || !wasmReady) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsApplying(true);

    // Determine correct source image
    const sourceImage = getSourceImageForOperation(selectedFilter);
    if (!sourceImage) return;

    // Apply filter to calculate preview
    const filteredData = applyFilterToData(sourceImage, selectedFilter, intensity);

    if (filteredData) {
      ctx.putImageData(filteredData, 0, 0);
    }

    setIsApplying(false);
  }

  // Commit the current state to history (called when user releases slider or changes filter)
  const commitToHistory = useCallback((filterName: string, filterIntensity: number) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Determine correct source image for calculation
    const sourceImage = getSourceImageForOperation(filterName);
    if (!sourceImage) return;

    // Apply the filter to obtain the new state
    const filteredData = applyFilterToData(sourceImage, filterName, filterIntensity);
    if (!filteredData) return;

    // Update working image ref to match what's on screen
    workingImageRef.current = cloneImageData(filteredData);

    // Ensure canvas matches (it should already from preview, but to be safe)
    ctx.putImageData(filteredData, 0, 0);

    // Get the filter config for description
    const filter = FILTERS.find(f => f.name === filterName);
    const description = filter?.hasIntensity
      ? `${filter.label}: ${filterIntensity}`
      : filter?.label || filterName;

    // Calculate new history state
    // Create new history entry
    const newEntry: ImageEditorHistoryState = {
      imageData: cloneImageData(filteredData),
      filterName,
      description,
      intensity: filterIntensity
    };

    setHistory(prev => {
      // Slice history to current index (remove redo stack)
      const currentHistory = prev.slice(0, historyIndex + 1);
      const lastEntry = currentHistory[currentHistory.length - 1];

      // Smart grouping: should we replace the last entry?
      const shouldReplace = lastEntry && lastEntry.filterName === filterName && currentHistory.length > 1;

      let newHistory: ImageEditorHistoryState[];
      if (shouldReplace) {
        // Replace last entry
        newHistory = [...currentHistory];
        newHistory[newHistory.length - 1] = newEntry;
      } else {
        // Append new entry
        newHistory = [...currentHistory, newEntry];
      }

      // Limit history size
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }

      return newHistory;
    });

    // Update index
    setHistoryIndex(prevIndex => {
      const lastEntry = history[prevIndex];
      const shouldReplace = lastEntry && lastEntry.filterName === filterName && prevIndex > 0;

      if (shouldReplace) {
        // If we replaced, index stays the same
        return prevIndex;
      } else {
        // If we appended, index increments (clamped)
        return Math.min(prevIndex + 1, MAX_HISTORY - 1);
      }
    });

    lastAppliedRef.current = { filter: filterName, intensity: filterIntensity };
  }, [historyIndex, history, getSourceImageForOperation]);

  // Called when slider is released
  function handleSliderRelease() {
    const filter = FILTERS.find(f => f.name === selectedFilter);
    if (!filter) return;

    // Only commit if the filter actually changes something
    const isNeutral =
      (selectedFilter === 'brightness' && intensity === 0) ||
      (selectedFilter === 'contrast' && intensity === 100) ||
      (selectedFilter === 'saturation' && intensity === 100) ||
      (selectedFilter === 'hue' && intensity === 0);

    if (!isNeutral) {
      commitToHistory(selectedFilter, intensity);
      // Removed the reset line: setIntensity(filter.defaultIntensity);
    }
  }

  // Apply filter immediately for non-intensity filters
  function handleFilterClick(filterName: string) {
    setSelectedFilter(filterName);

    const filter = FILTERS.find(f => f.name === filterName);
    if (filter && !filter.hasIntensity) {
      // For non-intensity filters, apply immediately
      setTimeout(() => {
        commitToHistory(filterName, filter.defaultIntensity);
      }, 100);
    }
  }

  function undo() {
    if (historyIndex <= 0 || !canvasRef.current) return;

    const newIndex = historyIndex - 1;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const prevState = history[newIndex];
    ctx.putImageData(cloneImageData(prevState.imageData), 0, 0);
    workingImageRef.current = cloneImageData(prevState.imageData);
    setHistoryIndex(newIndex);

    // Restore intensity if it's the selected filter
    if (prevState.filterName === selectedFilter) {
      setIntensity(prevState.intensity);
    }
  }

  function redo() {
    if (historyIndex >= history.length - 1 || !canvasRef.current) return;

    const newIndex = historyIndex + 1;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const nextState = history[newIndex];
    ctx.putImageData(cloneImageData(nextState.imageData), 0, 0);
    workingImageRef.current = cloneImageData(nextState.imageData);
    setHistoryIndex(newIndex);

    // Restore intensity if it's the selected filter
    if (nextState.filterName === selectedFilter) {
      setIntensity(nextState.intensity);
    }
  }

  function reset() {
    if (!originalImageRef.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.putImageData(cloneImageData(originalImageRef.current), 0, 0);
    workingImageRef.current = cloneImageData(originalImageRef.current);
    setHistory([{
      imageData: cloneImageData(originalImageRef.current),
      filterName: 'original',
      description: 'Original Image',
      intensity: 0
    }]);
    setHistoryIndex(0);
    lastAppliedRef.current = null;

    // Reset filter to default
    const filter = FILTERS.find(f => f.name === selectedFilter);
    if (filter) {
      setIntensity(filter.defaultIntensity);
    }
  }

  function download() {
    if (!canvasRef.current) return;

    const link = document.createElement('a');
    link.download = `edited-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  }

  async function save() {
    if (!canvasRef.current) return;

    setIsSaving(true);
    setError(null);

    canvasRef.current.toBlob(async (blob) => {
      if (!blob) {
        setError('Failed to export canvas');
        setIsSaving(false);
        return;
      }

      let storagePath: string | undefined;
      let storageBucket: string | undefined;

      if (isSupabaseConfigured()) {
        const path = generateStoragePath(userId, 'wasm_edit', 'png');
        const uploadResult = await uploadBlob(path, blob, 'image/png');

        if (!uploadResult.error) {
          storagePath = uploadResult.path;
          storageBucket = STORAGE_BUCKET;
        }
      }

      const result = await api.saveImage({
        kind: 'wasm_edit',
        storage_bucket: storageBucket,
        storage_path: storagePath,
        mime_type: 'image/png',
        width: canvasRef.current!.width,
        height: canvasRef.current!.height,
      });

      setIsSaving(false);

      if (result.error) {
        setError(result.error.message);
      }
    }, 'image/png');
  }

  const currentFilter = FILTERS.find(f => f.name === selectedFilter);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-50">Image Filter Editor</h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time WASM-powered filters
          </p>
        </div>

        {/* WASM status */}
        <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${wasmReady ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/50' : 'bg-amber-950/30 text-amber-400 border border-amber-900/50'}`}>
          {wasmReady ? '✓ WASM Ready' : 'Loading...'}
        </div>
      </div>

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Canvas area */}
        <div className="flex-1 order-2 lg:order-1">
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            {imageLoaded && (
              <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-slate-400">
                  {canvasRef.current?.width} × {canvasRef.current?.height}
                  {isApplying && ' • Applying...'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={download}
                    className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                  <button
                    onClick={save}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-lg transition-colors"
                  >
                    {isSaving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              </div>
            )}
            <div className="p-3 sm:p-6 flex items-center justify-center min-h-[300px] sm:min-h-[400px] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMWUyOTNiIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiMxZTI5M2IiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]">
              <div
                ref={containerRef}
                className="relative inline-block max-w-full"
                onMouseUp={handleDragEnd}
                onTouchEnd={handleDragEnd}
                onMouseLeave={handleDragEnd}
              >
                {!imageLoaded ? (
                  <div className="text-center text-slate-500 py-12 px-4">
                    <Upload className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Upload an image to start editing</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Choose Image
                    </button>
                  </div>
                ) : null}

                {/* Before Canvas (Reference) */}
                <canvas
                  ref={beforeCanvasRef}
                  className={`absolute inset-0 w-full h-full rounded-lg shadow-xl ${!imageLoaded || !compareMode ? 'hidden' : ''}`}
                />

                {/* Main Canvas (Active Work) */}
                <canvas
                  ref={canvasRef}
                  className={`max-w-full rounded-lg shadow-xl ${!imageLoaded ? 'hidden' : ''} ${compareMode ? 'relative z-10' : ''}`}
                  style={compareMode ? { clipPath: `inset(0 0 0 ${sliderPosition}%)` } : undefined}
                />

                {/* Comparison Slider Handle */}
                {imageLoaded && compareMode && (
                  <div
                    className="absolute inset-y-0 z-20 w-1 bg-white cursor-ew-resize flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.5)] touch-none"
                    style={{ left: `${sliderPosition}%` }}
                    onMouseDown={handleDragStart}
                    onTouchStart={handleDragStart}
                  >
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full shadow-lg flex items-center justify-center -ml-[3px] sm:-ml-[4px]">
                      <ChevronsLeftRight className="w-3 h-3 sm:w-4 sm:h-4 text-violet-600" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* History controls - below canvas on mobile */}
          {imageLoaded && (
            <div className="mt-4 bg-slate-900 rounded-xl border border-slate-800 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 rounded-lg transition-colors"
                  >
                    <Undo className="w-4 h-4" />
                    <span className="text-sm hidden sm:inline">Undo</span>
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 rounded-lg transition-colors"
                  >
                    <Redo className="w-4 h-4" />
                    <span className="text-sm hidden sm:inline">Redo</span>
                  </button>
                  <button
                    onClick={reset}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="text-sm hidden sm:inline">Reset</span>
                  </button>
                  <div className="w-px h-6 bg-slate-700 mx-1" />
                  <button
                    onClick={() => setCompareMode(!compareMode)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${compareMode
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                  >
                    <Split className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm">Compare</span>
                  </button>
                </div>
                <div className="text-xs text-slate-500">
                  {history[historyIndex]?.description || 'Original'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 order-1 lg:order-2 space-y-4">
          {/* Upload - only show when no image */}
          {!imageLoaded && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 sm:p-6">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Upload Image
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-700 hover:border-slate-600 rounded-lg text-slate-400 hover:text-slate-300 transition-colors"
              >
                <Upload className="w-5 h-5" />
                Choose Image
              </button>
            </div>
          )}

          {/* Filters */}
          {imageLoaded && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-full px-4 py-3 flex items-center justify-between text-slate-300 hover:bg-slate-800/50 transition-colors lg:cursor-default"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  <span className="text-sm font-medium">Filters</span>
                </div>
                <span className="lg:hidden text-xs text-slate-500">
                  {showFilters ? 'Hide' : 'Show'}
                </span>
              </button>

              <div className={`${showFilters ? 'block' : 'hidden lg:block'} p-4 border-t border-slate-800`}>
                {/* Filter buttons */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {FILTERS.map((filter) => (
                    <button
                      key={filter.name}
                      onClick={() => handleFilterClick(filter.name)}
                      className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${selectedFilter === filter.name
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* Intensity slider */}
                {currentFilter?.hasIntensity && (
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-400">
                        {currentFilter.name === 'hue' ? 'Degrees' : 'Intensity'}
                      </label>
                      <span className="text-xs text-violet-400 font-mono">
                        {intensity}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={currentFilter.minIntensity}
                      max={currentFilter.maxIntensity}
                      value={intensity}
                      onChange={(e) => setIntensity(Number(e.target.value))}
                      onMouseUp={handleSliderRelease}
                      onTouchEnd={handleSliderRelease}
                      className="w-full accent-violet-500"
                    />
                    <p className="mt-2 text-[10px] text-slate-500">
                      Drag slider for preview, release to apply
                    </p>
                  </div>
                )}

                {/* Change image button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-slate-400 hover:text-slate-300 text-sm transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Change Image
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
