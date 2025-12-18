import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save, Trash2, Copy, Plus, MessageSquare,
  Send, Image as ImageIcon, Sparkles, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { useStore, useActiveThread } from '../lib/store';
import { TEXT_MODELS } from '../lib/models';
import * as api from '../lib/api';
import { useAuth } from '../lib/auth';

export function ScriptGenerator() {
  const navigate = useNavigate();
  useAuth(); // Ensure auth context is available
  const {
    scriptThreads,
    activeThreadId,
    createThread,
    deleteThread,
    setActiveThread,
    updateThread,
    addMessageToThread,
    triggerThumbnailFromScript,
  } = useStore();

  const activeThread = useActiveThread();

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState('claude-sonnet-4-20250514');
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default closed on mobile

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync local state with active thread
  useEffect(() => {
    if (activeThread) {
      setModel(activeThread.model);
    }
  }, [activeThread?.id]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages]);

  // Close sidebar on mobile when selecting a thread
  const handleSelectThread = (threadId: string) => {
    setActiveThread(threadId);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  async function handleGenerate() {
    console.log('[ScriptGenerator] handleGenerate called', { prompt, activeThreadId: activeThread?.id });
    if (!prompt.trim() || !activeThread) {
      console.log('[ScriptGenerator] Returning early: invalid prompt or no active thread');
      return;
    }

    try {
      // Add user message
      addMessageToThread(activeThread.id, {
        role: 'user',
        content: prompt,
      });

      // Update thread title if first message
      if (activeThread.messages.length === 0) {
        const title = prompt.slice(0, 50) + (prompt.length > 50 ? '...' : '');
        updateThread(activeThread.id, { title, prompt });
      }

      setIsGenerating(true);
      setError(null);
      const currentPrompt = prompt;
      setPrompt('');

      // Build conversation history for multi-turn context
      // Include both user messages and model responses with their scripts
      const history: api.HistoryTurn[] = activeThread.messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.content,
        script: m.script, // Include the generated script for model responses
      }));

      console.log('[ScriptGenerator] Calling api.generateScript', { prompt: currentPrompt, model, historyLength: history.length });
      const result = await api.generateScript(currentPrompt, model, history);
      console.log('[ScriptGenerator] Result received', result);

      setIsGenerating(false);

      if (result.error) {
        setError(result.error.message);
        addMessageToThread(activeThread.id, {
          role: 'assistant',
          content: `Error: ${result.error.message}`,
        });
      } else if (result.data) {
        // Add assistant message with script
        addMessageToThread(activeThread.id, {
          role: 'assistant',
          content: 'Here\'s your generated script:',
          script: result.data.script,
        });

        // Update thread with generated script
        updateThread(activeThread.id, {
          generatedScript: result.data,
          model: result.data.model,
        });
      }
    } catch (e) {
      console.error('[ScriptGenerator] Error in handleGenerate:', e);
      setIsGenerating(false);
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }

  async function handleSave() {
    if (!activeThread?.generatedScript) return;

    setIsSaving(true);

    const result = await api.saveScript(
      activeThread.prompt || activeThread.title,
      activeThread.generatedScript.model,
      activeThread.generatedScript.script
    );

    setIsSaving(false);

    if (result.error) {
      setError(result.error.message);
    } else {
      // Show success message
      alert('Script saved successfully to Library!');
    }
  }

  function handleCreateThumbnail() {
    if (!activeThread?.generatedScript) return;

    // Generate a thumbnail prompt from the script
    const script = activeThread.generatedScript.script;
    const visualCues = script.map(s => s.visual_cue).join('. ');
    // Increase limit to prevent cutoff
    const thumbnailPrompt = `Create a compelling YouTube thumbnail for a video about: ${activeThread.prompt || activeThread.title}. Key visuals: ${visualCues.slice(0, 3000)}`;

    triggerThumbnailFromScript(thumbnailPrompt, activeThread.id);
    navigate('/thumbnail');
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)] -mx-3 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Chat Threads */}
      <div className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
        fixed md:relative left-0 top-0 h-full z-40 md:z-auto
        w-72 flex-shrink-0 bg-slate-950 border-r border-slate-800 
        transition-transform duration-300 md:transition-none
      `}>
        <div className="w-72 h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between gap-2">
            <button
              onClick={() => createThread()}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              New Script
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto">
            {scriptThreads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => handleSelectThread(thread.id)}
                className={`w-full px-3 sm:px-4 py-3 flex items-start gap-3 hover:bg-slate-900 transition-colors text-left cursor-pointer ${thread.id === activeThreadId ? 'bg-slate-900 border-l-2 border-violet-500' : ''
                  }`}
              >
                <MessageSquare className="w-4 h-4 mt-1 text-slate-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {thread.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {thread.messages.length} messages
                  </p>
                </div>
                {thread.id === activeThreadId && scriptThreads.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteThread(thread.id);
                    }}
                    className="p-1 text-slate-500 hover:text-red-400 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-3 sm:px-6 lg:px-8 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Toggle Sidebar Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
            >
              <PanelLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-slate-50 truncate">
                {activeThread?.title || 'Script Generator'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">
                Generate and refine video scripts with AI
              </p>
            </div>
          </div>

          {/* Model Selector */}
          <select
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              if (activeThread) {
                updateThread(activeThread.id, { model: e.target.value });
              }
            }}
            className="px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 max-w-[120px] sm:max-w-none"
          >
            {TEXT_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {error && (
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          )}

          {activeThread?.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-violet-600/20 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-violet-400" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-200 mb-2">
                Start a New Script
              </h2>
              <p className="text-sm text-slate-500 max-w-md">
                Describe your video idea below and I'll generate a structured script with timestamps, visual cues, and audio scripts.
              </p>
            </div>
          ) : (
            activeThread?.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-full sm:max-w-3xl ${message.role === 'user' ? 'bg-violet-600' : 'bg-slate-800'} rounded-2xl px-4 sm:px-5 py-3 sm:py-4`}>
                  <p className="text-sm sm:text-base text-slate-100">{message.content}</p>

                  {/* Script Display */}
                  {message.script && (
                    <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 border-t border-slate-700 pt-3 sm:pt-4">
                      {message.script.map((section, index) => (
                        <div key={index} className="bg-slate-900/50 rounded-lg p-3 sm:p-4">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-violet-600/30 text-violet-300 text-xs font-mono rounded">
                              {section.timestamp}
                            </span>
                            <span className="text-xs text-slate-500">
                              {section.duration}s
                            </span>
                          </div>
                          <div className="grid gap-2">
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
                  )}
                </div>
              </div>
            ))
          )}

          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-slate-800 rounded-2xl px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-slate-400">Generating script...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Action Buttons (when script exists) */}
        {activeThread?.generatedScript && (
          <div className="px-3 sm:px-6 lg:px-8 py-2 sm:py-3 border-t border-slate-800 flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => copyToClipboard(JSON.stringify(activeThread.generatedScript?.script, null, 2))}
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Copy JSON</span>
              <span className="sm:hidden">Copy</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-lg transition-colors"
            >
              {isSaving ? <LoadingSpinner size="sm" /> : <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              Save
            </button>
            <div className="flex-1" />
            <button
              onClick={handleCreateThumbnail}
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white rounded-lg transition-colors font-medium"
            >
              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Create Thumbnail</span>
              <span className="sm:hidden">Thumbnail</span>
            </button>
          </div>
        )}

        {/* Input Area */}
        <div className="px-3 sm:px-6 lg:px-8 py-3 sm:py-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-end gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeThread?.messages.length
                    ? "Continue refining..."
                    : "Describe your video idea..."
                }
                rows={2}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex-shrink-0"
            >
              {isGenerating ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </div>
          <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-slate-500 hidden sm:block">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
