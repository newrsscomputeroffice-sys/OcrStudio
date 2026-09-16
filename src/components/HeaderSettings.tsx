import React, { useState } from 'react';
import {
  FileSearch,
  Cpu,
  Globe,
  PenTool,
  Info,
  KeyRound,
  CheckCircle,
  AlertTriangle,
  Settings2,
  X,
  ChevronDown,
} from 'lucide-react';
import { OCRSettings, SystemStatus } from '../types';

interface HeaderSettingsProps {
  settings: OCRSettings;
  onUpdateSettings: (newSettings: Partial<OCRSettings>) => void;
  systemStatus: SystemStatus;
}

export const HeaderSettings: React.FC<HeaderSettingsProps> = ({
  settings,
  onUpdateSettings,
  systemStatus,
}) => {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);

  const languages = [
    { code: 'auto', label: 'Auto-Detect Language' },
    { code: 'en-IN', label: 'English (India)' },
    { code: 'hi-IN', label: 'Hindi (हिंदी)' },
    { code: 'mr-IN', label: 'Marathi (मराठी)' },
    { code: 'bn-IN', label: 'Bengali (বাংলা)' },
    { code: 'ta-IN', label: 'Tamil (தமிழ்)' },
    { code: 'te-IN', label: 'Telugu (తెలుగు)' },
    { code: 'gu-IN', label: 'Gujarati (ગુજરાતી)' },
    { code: 'pa-IN', label: 'Punjabi (ਪੰਜਾਬੀ)' },
    { code: 'ur-IN', label: 'Urdu (اردو)' },
  ];

  const currentEngineLabel =
    settings.engine === 'gemini'
      ? 'Gemini'
      : settings.engine === 'sarvam'
      ? 'Sarvam'
      : 'Auto';

  const currentContentLabel =
    settings.contentType === 'handwritten'
      ? 'Handwriting'
      : settings.contentType === 'printed'
      ? 'Printed'
      : 'Mixed';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  OCR Studio
                </h1>
                <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                  AI Vision
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-500">
                Handwriting, Math Formulas (KaTeX), & Diagram Generation
              </p>
            </div>
          </div>

          {/* Mobile Quick Config Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              id="mobile-settings-toggle-btn"
              onClick={() => setShowMobileSettings(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition active:scale-95"
            >
              <Settings2 className="w-4 h-4 text-indigo-600" />
              <span className="max-w-[120px] truncate">
                {currentEngineLabel} • {currentContentLabel}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* OCR Config & Status Bar (Desktop) */}
          <div className="hidden md:flex flex-wrap items-center gap-2 text-xs">
            {/* Engine Selector */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
              <Cpu className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1" />
              <select
                id="ocr-engine-select"
                value={settings.engine}
                onChange={(e) => onUpdateSettings({ engine: e.target.value as any })}
                className="bg-transparent text-slate-800 font-medium py-1 px-1.5 rounded focus:outline-none cursor-pointer"
              >
                <option value="auto">
                  Auto Engine (Fastest & Most Accurate)
                </option>
                <option value="gemini">Gemini Turbo Vision (1-3s Ultra-Fast)</option>
                <option value="sarvam">Sarvam AI Document AI</option>
              </select>
            </div>

            {/* Content Type (Handwritten / Printed / Mixed) */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
              <PenTool className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1" />
              <select
                id="ocr-content-type-select"
                value={settings.contentType}
                onChange={(e) => onUpdateSettings({ contentType: e.target.value as any })}
                className="bg-transparent text-slate-800 font-medium py-1 px-1.5 rounded focus:outline-none cursor-pointer"
              >
                <option value="mixed">Mixed (Handwritten + Printed)</option>
                <option value="handwritten">Messy Handwriting Priority</option>
                <option value="printed">Printed / Typeset / Invoice</option>
              </select>
            </div>

            {/* Language Selector */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
              <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1" />
              <select
                id="ocr-language-select"
                value={settings.language}
                onChange={(e) => onUpdateSettings({ language: e.target.value })}
                className="bg-transparent text-slate-800 font-medium py-1 px-1.5 rounded focus:outline-none cursor-pointer"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sarvam AI Key & Status Badge */}
            <button
              onClick={() => setShowInfoModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-xs"
              title="View API Engine Status & Sarvam AI setup"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              <span className="font-medium">
                {systemStatus.sarvamConfigured ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    Sarvam AI Ready
                  </span>
                ) : (
                  <span className="text-slate-600 flex items-center gap-1">
                    Gemini Turbo Active
                  </span>
                )}
              </span>
              <Info className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Settings Bottom Sheet */}
      {showMobileSettings && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom-6 duration-200 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">OCR & Scan Settings</h3>
              </div>
              <button
                onClick={() => setShowMobileSettings(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Engine */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Transcription Engine
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => onUpdateSettings({ engine: 'auto' })}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                      settings.engine === 'auto'
                        ? 'border-indigo-600 bg-indigo-50/70 font-semibold text-indigo-900 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold">Auto Engine (Recommended)</div>
                      <div className="text-xs text-slate-500">Fastest (1-2s) & highly accurate</div>
                    </div>
                    {settings.engine === 'auto' && <CheckCircle className="w-5 h-5 text-indigo-600" />}
                  </button>

                  <button
                    onClick={() => onUpdateSettings({ engine: 'gemini' })}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                      settings.engine === 'gemini'
                        ? 'border-indigo-600 bg-indigo-50/70 font-semibold text-indigo-900 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold">Gemini Turbo Vision</div>
                      <div className="text-xs text-slate-500">1-3s ultra-fast multimodal transcription</div>
                    </div>
                    {settings.engine === 'gemini' && <CheckCircle className="w-5 h-5 text-indigo-600" />}
                  </button>

                  <button
                    onClick={() => onUpdateSettings({ engine: 'sarvam' })}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                      settings.engine === 'sarvam'
                        ? 'border-indigo-600 bg-indigo-50/70 font-semibold text-indigo-900 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold">Sarvam AI Document AI</div>
                      <div className="text-xs text-slate-500">Indian languages specialized model</div>
                    </div>
                    {settings.engine === 'sarvam' && <CheckCircle className="w-5 h-5 text-indigo-600" />}
                  </button>
                </div>
              </div>

              {/* Content Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Content Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'mixed', label: 'Mixed', desc: 'Notes + print' },
                    { id: 'handwritten', label: 'Handwriting', desc: 'Messy notes' },
                    { id: 'printed', label: 'Printed', desc: 'Invoices, docs' },
                  ].map((ct) => (
                    <button
                      key={ct.id}
                      onClick={() => onUpdateSettings({ contentType: ct.id as any })}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        settings.contentType === ct.id
                          ? 'border-indigo-600 bg-indigo-50/80 font-semibold text-indigo-900 ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">{ct.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{ct.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Document Language
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => onUpdateSettings({ language: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Info Button */}
              <button
                onClick={() => {
                  setShowMobileSettings(false);
                  setShowInfoModal(true);
                }}
                className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
              >
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  API Status & Engine Setup
                </span>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Apply / Close button */}
              <button
                onClick={() => setShowMobileSettings(false)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md transition active:scale-98"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info & Setup Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Sarvam AI & Engine Configuration
                  </h3>
                  <p className="text-xs text-slate-500">
                    Optical Character Recognition (OCR) Engine Architecture
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100">
                <p className="font-semibold text-indigo-900 mb-1">
                  Sarvam AI Subscription Key Integration:
                </p>
                <p>
                  Jab aap <strong>Settings &gt; Secrets</strong> me{' '}
                  <code className="bg-indigo-100 text-indigo-800 px-1 py-0.5 rounded font-mono">
                    SARVAM_API_KEY
                  </code>{' '}
                  provide karenge, to server automatically Sarvam AI ke{' '}
                  <strong>Document AI (/doc-ai/v1/job/digitise)</strong> endpoint se full-document OCR run karega.
                </p>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
                <p className="font-semibold text-emerald-900 mb-1">
                  Gemini Vision Dual Engine (High-Accuracy Fallback):
                </p>
                <p>
                  Messy cursive handwriting, complex tables, uneven camera lighting, aur shadows ko decode karne ke liye
                  Gemini 3.8 Flash Vision powered backend bhi seamlessly configured hai.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-700 font-medium">
                    {systemStatus.sarvamConfigured
                      ? 'Sarvam AI Key Detected & Connected'
                      : 'Gemini Vision active (Sarvam key optional)'}
                  </span>
                </div>
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
