import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  FileText,
  FileCode,
  Volume2,
  VolumeX,
  Search,
  Wand2,
  Sparkles,
  Table as TableIcon,
  Languages,
  RotateCcw,
  Edit3,
  Play,
  Sigma,
  Shapes,
  AlertCircle,
  RotateCw,
  ChevronDown,
} from 'lucide-react';
import { DocumentItem } from '../types';
import { exportToPdf, exportToDocx, exportToMarkdown, exportToTxt, latexToReadableMath } from '../utils/exportUtils';
import { MathMarkdownRenderer } from './MathMarkdownRenderer';
import { MathDiagramModal } from './MathDiagramModal';
import { TranslationModal } from './TranslationModal';

interface TextResultEditorProps {
  document: DocumentItem | null;
  onTextChange: (text: string) => void;
  isProcessing: boolean;
  onGenerate?: () => void;
}

export const TextResultEditor: React.FC<TextResultEditorProps> = ({
  document,
  onTextChange,
  isProcessing,
  onGenerate,
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [enhanceMessage, setEnhanceMessage] = useState<string>('');
  const [enhanceError, setEnhanceError] = useState<string>('');
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState<boolean>(false);
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState<boolean>(false);
  const [selectedTranslateLang, setSelectedTranslateLang] = useState<string>('Hindi');
  const [originalScannedText, setOriginalScannedText] = useState<string | null>(null);

  const currentText = document?.extractedMarkdown || document?.extractedText || '';

  // Copy to clipboard
  const handleCopy = async () => {
    if (!currentText) return;
    try {
      await navigator.clipboard.writeText(currentText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Text-To-Speech (Read Aloud)
  const handleToggleSpeech = () => {
    if (!window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!currentText) return;

    // Clean markdown hashes/dashes before speaking
    const cleanSpeech = currentText.replace(/[#*`_~[\]|]/g, ' ').substring(0, 3000);
    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // AI Text Enhancement Action with Multi-Language Support
  const handleEnhanceAction = async (
    action: 'fix-errors' | 'format-math' | 'generate-diagrams' | 'extract-tables' | 'translate' | 'summarize',
    customTargetLang?: string
  ) => {
    if (!currentText || isEnhancing) return;
    const targetLang = customTargetLang || selectedTranslateLang;
    setIsEnhancing(true);
    setEnhanceError('');
    setEnhanceMessage(
      action === 'format-math'
        ? 'Converting & formatting LaTeX mathematical formulas...'
        : action === 'generate-diagrams'
        ? 'Generating accurate vector SVG diagrams for math questions...'
        : action === 'translate'
        ? `Translating document into ${targetLang}...`
        : `Running ${action}...`
    );

    try {
      const resp = await fetch('/api/enhance-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentText,
          action,
          targetLanguage: targetLang,
        }),
      });

      const contentType = resp.headers.get('content-type') || '';
      if (!resp.ok) {
        if (contentType.includes('application/json')) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.error || `Request failed with status ${resp.status}`);
        }
        throw new Error(`Server returned error (${resp.status}). Please retry.`);
      }

      if (!contentType.includes('application/json')) {
        throw new Error('Unexpected response format from server.');
      }

      const data = await resp.json();
      if (!data.success) {
        throw new Error(data.error || 'Enhancement request failed. Please try again.');
      }

      if (data.result) {
        if (action === 'translate') {
          if (!originalScannedText) {
            setOriginalScannedText(currentText);
          }
        }
        onTextChange(data.result);
        if (action === 'generate-diagrams' || action === 'format-math') {
          setActiveTab('preview');
        }
      }
    } catch (err: any) {
      console.error('Enhance action error:', err);
      setEnhanceError(err.message || 'Model is temporarily busy. Please retry in a moment.');
      setTimeout(() => setEnhanceError(''), 6000);
    } finally {
      setIsEnhancing(false);
      setEnhanceMessage('');
    }
  };

  const handleTranslateToLanguage = async (lang: string) => {
    setSelectedTranslateLang(lang);
    await handleEnhanceAction('translate', lang);
    setIsTranslationModalOpen(false);
  };

  const handleRevertToOriginal = () => {
    if (originalScannedText) {
      onTextChange(originalScannedText);
      setOriginalScannedText(null);
    }
  };

  // Convert math formulas in the text to readable plain text
  const handleConvertToReadableMath = () => {
    if (!currentText) return;
    const readable = currentText
      .split('\n')
      .map((line) => {
        return line
          .replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => latexToReadableMath(tex))
          .replace(/\$([^\$\n]+?)\$/g, (_, tex) => latexToReadableMath(tex));
      })
      .join('\n');
    onTextChange(readable);
  };

  const handleExportPdf = () => {
    if (!currentText || !document) return;
    const baseName = document.name.replace(/\.[^/.]+$/, '');
    exportToPdf(currentText, '', `${baseName}.pdf`);
  };

  const handleExportDocx = () => {
    if (!currentText || !document) return;
    const baseName = document.name.replace(/\.[^/.]+$/, '');
    exportToDocx(currentText, '', `${baseName}.docx`);
  };

  const handleExportMarkdown = () => {
    if (!currentText || !document) return;
    const baseName = document.name.replace(/\.[^/.]+$/, '');
    exportToMarkdown(currentText, `${baseName}.md`);
  };

  const handleExportTxt = () => {
    if (!currentText || !document) return;
    const baseName = document.name.replace(/\.[^/.]+$/, '');
    exportToTxt(currentText, `${baseName}.txt`);
  };

  if (!document) {
    return (
      <div
        id="editor-empty"
        className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200"
      >
        <Edit3 className="w-12 h-12 text-slate-300 mb-3" />
        <h3 className="text-base font-semibold text-slate-700">Real-Time Transcription Editor</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-1">
          Digitized text will automatically stream here. You can edit in real-time, format tables, and export to PDF or DOCX.
        </p>
      </div>
    );
  }

  // Reading calculations
  const wordCount = currentText.trim() ? currentText.trim().split(/\s+/).length : 0;
  const charCount = currentText.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div id="text-result-editor-container" className="h-full flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Editor Header */}
      <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 border-b border-slate-200 gap-2">
        {/* Tab switcher */}
        <div className="flex items-center space-x-1 bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium">
          <button
            id="tab-editor"
            onClick={() => setActiveTab('editor')}
            className={`px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-md transition-all ${
              activeTab === 'editor'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Editor
          </button>
          <button
            id="tab-preview"
            onClick={() => setActiveTab('preview')}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-md transition-all ${
              activeTab === 'preview'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Preview</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-purple-100 text-purple-700 font-mono font-semibold">
              KaTeX
            </span>
          </button>
        </div>

        {/* Action Controls & Exports */}
        <div className="flex items-center space-x-1 sm:space-x-1.5">
          {/* Generate Button in Editor Toolbar if idle */}
          {document?.status === 'idle' && (
            <button
              id="btn-editor-top-generate"
              onClick={onGenerate}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 text-xs px-2.5 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition transform active:scale-95 cursor-pointer min-h-[34px]"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Transcribe</span>
            </button>
          )}

          {/* Copy Button - high priority for mobile users */}
          <button
            id="btn-copy-text"
            onClick={handleCopy}
            disabled={!currentText}
            className="inline-flex items-center gap-1 text-xs px-2.5 sm:px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 rounded-lg font-semibold shadow-2xs transition-colors min-h-[34px] active:scale-95 disabled:opacity-40"
            title="Copy Text to Clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-600" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Read aloud */}
          <button
            id="btn-read-aloud"
            onClick={handleToggleSpeech}
            disabled={!currentText}
            className={`p-2 rounded-lg border text-xs flex items-center justify-center transition-colors min-h-[34px] min-w-[34px] disabled:opacity-40 ${
              isSpeaking
                ? 'bg-amber-100 border-amber-300 text-amber-800 animate-pulse'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title={isSpeaking ? 'Stop Reading' : 'Read Aloud (TTS)'}
          >
            {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Export PDF Button */}
          <button
            id="btn-export-pdf"
            onClick={handleExportPdf}
            disabled={!currentText}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg font-semibold transition-colors disabled:opacity-40 min-h-[34px]"
            title="Export to PDF document"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>

          {/* Export DOCX Button */}
          <button
            id="btn-export-docx"
            onClick={handleExportDocx}
            disabled={!currentText}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg font-semibold transition-colors disabled:opacity-40 min-h-[34px]"
            title="Export to Microsoft Word (.docx)"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>DOCX</span>
          </button>

          {/* Other exports dropdown */}
          <div className="relative group">
            <button
              id="btn-more-exports"
              disabled={!currentText}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center disabled:opacity-40"
              title="More Export Formats"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 hidden group-hover:block group-focus-within:block z-30">
              <button
                onClick={handleExportMarkdown}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 font-medium"
              >
                Markdown (.md)
              </button>
              <button
                onClick={handleExportTxt}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 font-medium"
              >
                Plain Text (.txt)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Handwriting & Format Enhancement Toolbar */}
      <div id="ai-enhancement-bar" className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
          <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1 shrink-0 mr-0.5">
            <Wand2 className="w-3 h-3 text-indigo-500" />
            AI:
          </span>

          <button
            id="btn-enhance-math"
            onClick={() => handleEnhanceAction('format-math')}
            disabled={isEnhancing || !currentText}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-2xs shrink-0 active:scale-95"
            title="Convert equations, fractions, roots & math expressions to clean LaTeX"
          >
            <Sigma className="w-3.5 h-3.5 text-purple-600" />
            <span>Format Math (LaTeX)</span>
          </button>

          <button
            id="btn-clean-math-text"
            onClick={handleConvertToReadableMath}
            disabled={!currentText}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-2xs shrink-0 active:scale-95"
            title="Convert LaTeX codes into clean readable text math (e.g. x², √x, ±, a/b, ⇒)"
          >
            <Sigma className="w-3.5 h-3.5 text-emerald-600" />
            <span>Clean Math Text</span>
          </button>

          <button
            id="btn-generate-diagrams"
            onClick={() => handleEnhanceAction('generate-diagrams')}
            disabled={isEnhancing || !currentText}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-2xs shrink-0 active:scale-95"
            title="Automatically detect geometry & graph problems and synthesize accurate vector SVG diagrams"
          >
            <Shapes className="w-3.5 h-3.5 text-indigo-600" />
            <span>Diagrams</span>
          </button>

          <button
            id="btn-custom-diagram-modal"
            onClick={() => setIsDiagramModalOpen(true)}
            disabled={isEnhancing}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-lg text-xs font-medium transition cursor-pointer shadow-2xs shrink-0 active:scale-95"
            title="Create or customize a math diagram (Triangles, Circles, Graphs, Waves, Venn)"
          >
            <Shapes className="w-3.5 h-3.5 text-slate-500" />
            <span>+ Custom</span>
          </button>

          <button
            id="btn-enhance-typos"
            onClick={() => handleEnhanceAction('fix-errors')}
            disabled={isEnhancing || !currentText}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-lg text-xs font-medium text-slate-700 transition disabled:opacity-50 shrink-0 active:scale-95"
            title="Clean handwriting misreads & OCR spacing errors"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Fix Typos</span>
          </button>

          <button
            id="btn-enhance-tables"
            onClick={() => handleEnhanceAction('extract-tables')}
            disabled={isEnhancing || !currentText}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-lg text-xs font-medium text-slate-700 transition disabled:opacity-50 shrink-0 active:scale-95"
            title="Format all columns and numeric figures into Markdown tables"
          >
            <TableIcon className="w-3 h-3 text-blue-500" />
            <span>Tables</span>
          </button>

          {/* Multi-Language Translation Trigger */}
          <div className="relative inline-flex items-center gap-1">
            <button
              id="btn-enhance-translate"
              onClick={() => setIsTranslationModalOpen(true)}
              disabled={isEnhancing || !currentText}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 rounded-lg text-xs font-medium text-slate-700 transition disabled:opacity-50 shrink-0 active:scale-95 shadow-2xs"
              title="Translate document into multiple Indian & international languages"
            >
              <Languages className="w-3.5 h-3.5 text-emerald-600" />
              <span>Translate ({selectedTranslateLang})</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {originalScannedText && originalScannedText !== currentText && (
              <button
                id="btn-revert-original-translation"
                onClick={handleRevertToOriginal}
                disabled={isEnhancing}
                className="inline-flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition shrink-0 active:scale-95"
                title="Revert back to original scanned text"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                <span className="hidden sm:inline">Original</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Search */}
        <div className="flex items-center relative self-end sm:self-auto w-full sm:w-auto">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
          <input
            type="text"
            placeholder="Search in text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 w-full sm:w-36 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Enhancement in-progress banner */}
      {isEnhancing && (
        <div className="px-4 py-1.5 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-700 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 animate-spin text-indigo-600" />
          <span>{enhanceMessage || 'Enhancing transcription with AI...'}</span>
        </div>
      )}

      {/* Enhancement error banner */}
      {enhanceError && (
        <div className="px-4 py-1.5 bg-rose-50 border-b border-rose-200 text-xs text-rose-700 flex items-center justify-between gap-2">
          <span>{enhanceError}</span>
          <button
            onClick={() => setEnhanceError('')}
            className="text-rose-500 hover:text-rose-800 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="flex-1 overflow-auto p-4 relative">
        {isProcessing && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center z-20">
            <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-semibold text-slate-800">Processing Document OCR...</p>
            <p className="text-xs text-slate-500 mt-1">
              Decoding handwriting strokes, lighting, and table structures.
            </p>
          </div>
        )}

        {document && document.status === 'error' && !currentText ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[360px] p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-3 text-rose-600 shadow-xs">
              <AlertCircle className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">
              Transcription Interrupted
            </h3>
            <p className="text-xs text-rose-600 bg-rose-50/80 border border-rose-200 rounded-lg p-3 max-w-md mb-4 leading-relaxed text-left">
              {document.error || 'A temporary issue occurred while communicating with the AI service.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                id="btn-editor-retry-generate"
                onClick={onGenerate}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-md transition transform active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Retry OCR Transcription</span>
              </button>
            </div>
          </div>
        ) : document && document.status === 'idle' && !currentText ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[360px] p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3 text-indigo-600 shadow-xs">
              <Sparkles className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">
              Document Uploaded & Ready
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
              "{document.name}" is loaded. Click the button below to transcribe text, messy handwriting, and tables.
            </p>
            <button
              id="btn-editor-main-generate"
              onClick={onGenerate}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md transition transform active:scale-95 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Generate / Extract Text</span>
            </button>
          </div>
        ) : activeTab === 'editor' ? (
          <div className="flex flex-col h-full">
            {/* Quick Math Symbols Inserter Toolbar */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 mb-2 bg-slate-50 border border-slate-200 rounded-lg text-xs overflow-x-auto">
              <span className="text-[11px] font-semibold text-purple-700 flex items-center gap-1 shrink-0">
                <Sigma className="w-3 h-3 text-purple-600" />
                Math Insert:
              </span>
              {[
                { label: '$x^2$', snippet: '$x^2$' },
                { label: '$$\\frac{a}{b}$$', snippet: '$$\\frac{a}{b}$$' },
                { label: '$\\sqrt{x}$', snippet: '$\\sqrt{x}$' },
                { label: '$$\\int f(x)dx$$', snippet: '$$\\int_{a}^{b} f(x) \\, dx$$' },
                { label: '$$\\sum x_i$$', snippet: '$$\\sum_{i=1}^{n} x_i$$' },
                { label: '$\\pm$', snippet: '$\\pm$' },
                { label: '$\\approx$', snippet: '$\\approx$' },
                { label: '$\\pi$', snippet: '$\\pi$' },
                { label: '$$\\begin{matrix}$$', snippet: '$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$' },
              ].map((sym, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onTextChange(currentText + (currentText.endsWith('\n') ? '' : '\n') + sym.snippet);
                  }}
                  className="px-2 py-0.5 rounded bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 text-[11px] font-mono shrink-0 transition cursor-pointer"
                  title={`Insert ${sym.snippet}`}
                >
                  {sym.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsDiagramModalOpen(true)}
                className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-semibold shrink-0 transition cursor-pointer flex items-center gap-1 ml-auto"
                title="Create or insert a vector geometric diagram"
              >
                <Shapes className="w-3 h-3 text-indigo-600" />
                + Insert Diagram
              </button>
            </div>

            <textarea
              id="ocr-text-editor"
              value={currentText}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Extracted transcription with LaTeX math ($formula$ and $$equation$$) will appear here. You can type or edit directly."
              className="w-full flex-1 min-h-[380px] resize-none font-mono text-sm leading-relaxed text-slate-800 focus:outline-none bg-transparent"
              spellCheck={false}
            />
          </div>
        ) : (
          <div id="ocr-markdown-preview" className="h-full overflow-y-auto pr-1">
            <MathMarkdownRenderer content={currentText} />
          </div>
        )}
      </div>

      {/* Footer Metrics */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <span>
            Words: <strong className="text-slate-800 font-semibold">{wordCount}</strong>
          </span>
          <span>
            Characters: <strong className="text-slate-800 font-semibold">{charCount}</strong>
          </span>
          <span>
            Reading Time: <strong className="text-slate-800 font-semibold">{readingTime} min</strong>
          </span>
        </div>

        <div className="text-[11px] text-slate-400">
          Real-time editable & sync enabled
        </div>
      </div>

      <MathDiagramModal
        isOpen={isDiagramModalOpen}
        onClose={() => setIsDiagramModalOpen(false)}
        onInsertDiagram={(svgBlock) => {
          onTextChange(currentText + (currentText.endsWith('\n') ? '' : '\n') + svgBlock);
          setActiveTab('preview');
        }}
      />

      <TranslationModal
        isOpen={isTranslationModalOpen}
        onClose={() => setIsTranslationModalOpen(false)}
        selectedLanguage={selectedTranslateLang}
        onSelectLanguage={(lang) => setSelectedTranslateLang(lang)}
        onTranslate={handleTranslateToLanguage}
        isTranslating={isEnhancing && enhanceMessage.includes('Translating')}
        hasOriginalText={Boolean(originalScannedText && originalScannedText !== currentText)}
        onRevertOriginal={handleRevertToOriginal}
      />
    </div>
  );
};
