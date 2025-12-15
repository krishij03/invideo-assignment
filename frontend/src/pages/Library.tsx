import { useState, useEffect } from 'react';
import { FileText, Image, Trash2, ExternalLink, Filter, ChevronLeft, X } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import * as api from '../lib/api';
import { getPublicUrl, isSupabaseConfigured } from '../lib/supabase';

type Tab = 'scripts' | 'images';

export function Library() {
  const [activeTab, setActiveTab] = useState<Tab>('scripts');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scripts, setScripts] = useState<api.SavedScript[]>([]);
  const [images, setImages] = useState<api.SavedImage[]>([]);
  const [selectedScript, setSelectedScript] = useState<api.SavedScript | null>(null);
  const [imageKindFilter, setImageKindFilter] = useState<string>('all');
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError(null);

    const [scriptsResult, imagesResult] = await Promise.all([
      api.listScripts(),
      api.listImages(),
    ]);

    if (scriptsResult.error) {
      setError(scriptsResult.error.message);
    } else if (scriptsResult.data) {
      setScripts(scriptsResult.data);
    }

    if (imagesResult.error && !scriptsResult.error) {
      setError(imagesResult.error.message);
    } else if (imagesResult.data) {
      setImages(imagesResult.data);
    }

    setIsLoading(false);
  }

  async function handleDeleteScript(id: string) {
    const result = await api.deleteScript(id);
    if (result.data?.deleted) {
      setScripts(scripts.filter(s => s.id !== id));
      if (selectedScript?.id === id) {
        setSelectedScript(null);
        setShowMobileDetail(false);
      }
    }
  }

  async function handleDeleteImage(id: string) {
    const result = await api.deleteImage(id);
    if (result.data?.deleted) {
      setImages(images.filter(i => i.id !== id));
    }
  }

  function handleSelectScript(script: api.SavedScript) {
    setSelectedScript(script);
    if (window.innerWidth < 1024) {
      setShowMobileDetail(true);
    }
  }

  const filteredImages = imageKindFilter === 'all' 
    ? images 
    : images.filter(i => i.kind === imageKindFilter);

  const imageKinds = [...new Set(images.map(i => i.kind))];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-50">Library</h1>
        <p className="mt-1 text-sm text-slate-400">
          Browse and manage your saved content
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg w-full sm:w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab('scripts')}
          className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-none whitespace-nowrap ${
            activeTab === 'scripts' ? 'bg-slate-700 text-slate-50' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Scripts ({scripts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('images')}
          className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-none whitespace-nowrap ${
            activeTab === 'images' ? 'bg-slate-700 text-slate-50' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Image className="w-4 h-4" />
          <span>Images ({images.length})</span>
        </button>
      </div>

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Scripts tab */}
          {activeTab === 'scripts' && (
            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Scripts list */}
              <div className={`bg-slate-900 rounded-xl border border-slate-800 overflow-hidden ${showMobileDetail ? 'hidden lg:block' : ''}`}>
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800">
                  <h2 className="font-semibold text-slate-50 text-sm sm:text-base">All Scripts</h2>
                </div>
                {scripts.length === 0 ? (
                  <p className="px-4 sm:px-6 py-12 text-center text-slate-500 text-sm">
                    No scripts saved yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-800 max-h-[400px] sm:max-h-[600px] overflow-y-auto">
                    {scripts.map((script) => (
                      <div
                        key={script.id}
                        onClick={() => handleSelectScript(script)}
                        className={`px-4 sm:px-6 py-3 sm:py-4 cursor-pointer transition-colors ${
                          selectedScript?.id === script.id
                            ? 'bg-slate-800/50'
                            : 'hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-200 truncate">{script.prompt}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(script.created_at).toLocaleDateString()} •{' '}
                              {script.script.length} sections
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteScript(script.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Script detail */}
              <div className={`bg-slate-900 rounded-xl border border-slate-800 overflow-hidden ${!showMobileDetail && !selectedScript ? 'hidden lg:block' : ''} ${showMobileDetail ? 'fixed inset-0 z-50 rounded-none lg:relative lg:rounded-xl' : ''}`}>
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 flex items-center gap-3">
                  {showMobileDetail && (
                    <button
                      onClick={() => setShowMobileDetail(false)}
                      className="lg:hidden p-1.5 text-slate-400 hover:text-slate-200 -ml-1"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  <h2 className="font-semibold text-slate-50 text-sm sm:text-base flex-1">Script Details</h2>
                  {showMobileDetail && (
                    <button
                      onClick={() => setShowMobileDetail(false)}
                      className="lg:hidden p-1.5 text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                {selectedScript ? (
                  <div className="p-4 sm:p-6 max-h-[calc(100vh-8rem)] sm:max-h-[600px] overflow-y-auto">
                    <div className="mb-4 sm:mb-6">
                      <label className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Prompt
                      </label>
                      <p className="mt-1 text-sm text-slate-300">{selectedScript.prompt}</p>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                      {selectedScript.script.map((section, index) => (
                        <div key={index} className="p-3 sm:p-4 bg-slate-800/50 rounded-lg">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-violet-600/20 text-violet-400 text-xs font-mono rounded">
                              {section.timestamp}
                            </span>
                            <span className="text-xs text-slate-500">
                              {section.duration}s
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs text-slate-500">Visual:</span>
                              <p className="text-xs sm:text-sm text-slate-300">{section.visual_cue}</p>
                            </div>
                            <div>
                              <span className="text-xs text-slate-500">Audio:</span>
                              <p className="text-xs sm:text-sm text-slate-300">{section.audio_script}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="px-4 sm:px-6 py-12 text-center text-slate-500 text-sm">
                    Select a script to view details.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Images tab */}
          {activeTab === 'images' && (
            <div>
              {/* Filter */}
              {imageKinds.length > 1 && (
                <div className="mb-4 sm:mb-6 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={imageKindFilter}
                    onChange={(e) => setImageKindFilter(e.target.value)}
                    className="px-2 sm:px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="all">All Types</option>
                    {imageKinds.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind.charAt(0).toUpperCase() + kind.slice(1).replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {filteredImages.length === 0 ? (
                <div className="bg-slate-900 rounded-xl border border-slate-800 px-4 sm:px-6 py-12 text-center">
                  <Image className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-slate-600" />
                  <p className="text-slate-500 text-sm">No images saved yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {filteredImages.map((image) => (
                    <div
                      key={image.id}
                      className="group bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
                    >
                      <div className="relative aspect-video bg-slate-800">
                        {image.storage_path && isSupabaseConfigured() ? (
                          <img
                            src={getPublicUrl(image.storage_path)}
                            alt={image.prompt || 'Image'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-6 h-6 sm:w-8 sm:h-8 text-slate-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2 sm:p-3">
                          {image.storage_path && (
                            <a
                              href={getPublicUrl(image.storage_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-slate-900/80 hover:bg-slate-800 rounded-lg text-slate-300"
                            >
                              <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteImage(image.id)}
                            className="p-1.5 bg-slate-900/80 hover:bg-red-600 rounded-lg text-slate-300"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="p-2 sm:p-3">
                        <span className="inline-block px-1.5 sm:px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] sm:text-xs rounded mb-1 sm:mb-2">
                          {image.kind}
                        </span>
                        {image.prompt && (
                          <p className="text-xs sm:text-sm text-slate-300 truncate">{image.prompt}</p>
                        )}
                        <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
                          {new Date(image.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
