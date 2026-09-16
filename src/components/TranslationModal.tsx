import React, { useState, useMemo } from 'react';
import {
  X,
  Languages,
  Search,
  Check,
  Sparkles,
  Loader2,
  Globe,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

export interface TranslationLanguage {
  id: string;
  name: string;
  nativeName: string;
  region: 'Indian' | 'Global';
  flag: string;
}

export const SUPPORTED_LANGUAGES: TranslationLanguage[] = [
  // Indian Languages
  { id: 'Hindi', name: 'Hindi', nativeName: 'हिन्दी', region: 'Indian', flag: '🇮🇳' },
  { id: 'Hinglish', name: 'Hinglish', nativeName: 'Hinglish (Hindi in Latin)', region: 'Indian', flag: '🇮🇳' },
  { id: 'English', name: 'English', nativeName: 'English', region: 'Indian', flag: '🇮🇳' },
  { id: 'Sanskrit', name: 'Sanskrit', nativeName: 'संस्कृतम्', region: 'Indian', flag: '🇮🇳' },
  { id: 'Marathi', name: 'Marathi', nativeName: 'मराठी', region: 'Indian', flag: '🇮🇳' },
  { id: 'Gujarati', name: 'Gujarati', nativeName: 'ગુજરાતી', region: 'Indian', flag: '🇮🇳' },
  { id: 'Bengali', name: 'Bengali', nativeName: 'বাংলা', region: 'Indian', flag: '🇮🇳' },
  { id: 'Punjabi', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', region: 'Indian', flag: '🇮🇳' },
  { id: 'Tamil', name: 'Tamil', nativeName: 'தமிழ்', region: 'Indian', flag: '🇮🇳' },
  { id: 'Telugu', name: 'Telugu', nativeName: 'తెలుగు', region: 'Indian', flag: '🇮🇳' },
  { id: 'Kannada', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'Indian', flag: '🇮🇳' },
  { id: 'Malayalam', name: 'Malayalam', nativeName: 'മലയാളം', region: 'Indian', flag: '🇮🇳' },
  { id: 'Urdu', name: 'Urdu', nativeName: 'اردو', region: 'Indian', flag: '🇮🇳' },
  { id: 'Odia', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', region: 'Indian', flag: '🇮🇳' },
  { id: 'Assamese', name: 'Assamese', nativeName: 'অসমীয়া', region: 'Indian', flag: '🇮🇳' },
  // Global Languages
  { id: 'Spanish', name: 'Spanish', nativeName: 'Español', region: 'Global', flag: '🇪🇸' },
  { id: 'French', name: 'French', nativeName: 'Français', region: 'Global', flag: '🇫🇷' },
  { id: 'German', name: 'German', nativeName: 'Deutsch', region: 'Global', flag: '🇩🇪' },
  { id: 'Arabic', name: 'Arabic', nativeName: 'العربية', region: 'Global', flag: '🇸🇦' },
  { id: 'Russian', name: 'Russian', nativeName: 'Русский', region: 'Global', flag: '🇷🇺' },
  { id: 'Japanese', name: 'Japanese', nativeName: '日本語', region: 'Global', flag: '🇯🇵' },
  { id: 'Korean', name: 'Korean', nativeName: '한국어', region: 'Global', flag: '🇰🇷' },
  { id: 'Chinese', name: 'Chinese (Simplified)', nativeName: '中文 (简体)', region: 'Global', flag: '🇨🇳' },
  { id: 'Portuguese', name: 'Portuguese', nativeName: 'Português', region: 'Global', flag: '🇵🇹' },
  { id: 'Italian', name: 'Italian', nativeName: 'Italiano', region: 'Global', flag: '🇮🇹' },
];

const POPULAR_QUICK_PICKS = [
  'Hindi',
  'English',
  'Hinglish',
  'Marathi',
  'Gujarati',
  'Bengali',
  'Tamil',
  'Telugu',
  'Punjabi',
  'Sanskrit',
  'Urdu',
];

interface TranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
  onTranslate: (lang: string) => void;
  isTranslating: boolean;
  hasOriginalText?: boolean;
  onRevertOriginal?: () => void;
}

export const TranslationModal: React.FC<TranslationModalProps> = ({
  isOpen,
  onClose,
  selectedLanguage,
  onSelectLanguage,
  onTranslate,
  isTranslating,
  hasOriginalText,
  onRevertOriginal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'Indian' | 'Global'>('all');

  const filteredLanguages = useMemo(() => {
    return SUPPORTED_LANGUAGES.filter((lang) => {
      const matchesSearch =
        lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'all' || lang.region === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilter]);

  if (!isOpen) return null;

  return (
    <div
      id="translation-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isTranslating) onClose();
      }}
    >
      <div
        id="translation-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm sm:text-base flex items-center gap-1.5">
                Translate Document
                <span className="text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  {SUPPORTED_LANGUAGES.length} Languages
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Preserves all LaTeX math formulas ($...$), tables, and diagrams
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isTranslating}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Picks */}
        <div className="px-5 pt-3.5 pb-2 border-b border-slate-100 bg-white">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2">
            Popular Languages
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-xs">
            {POPULAR_QUICK_PICKS.map((pickId) => {
              const lang = SUPPORTED_LANGUAGES.find((l) => l.id === pickId);
              if (!lang) return null;
              const isSelected = selectedLanguage === lang.id;
              return (
                <button
                  key={pickId}
                  onClick={() => onSelectLanguage(lang.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1 border shrink-0 ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                  {isSelected && <Check className="w-3 h-3 text-emerald-600" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search language (e.g. Marathi, Tamil, Spanish)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex rounded-xl bg-slate-200/70 p-0.5 text-xs font-medium self-start sm:self-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition ${
                activeFilter === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('Indian')}
              className={`px-2.5 py-1 rounded-lg transition ${
                activeFilter === 'Indian' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              🇮🇳 Indian
            </button>
            <button
              onClick={() => setActiveFilter('Global')}
              className={`px-2.5 py-1 rounded-lg transition ${
                activeFilter === 'Global' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              🌐 Global
            </button>
          </div>
        </div>

        {/* Language Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 sm:space-y-1.5 max-h-72 sm:max-h-80">
          {filteredLanguages.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No languages matching "{searchQuery}"
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {filteredLanguages.map((lang) => {
                const isSelected = selectedLanguage === lang.id;
                return (
                  <button
                    key={lang.id}
                    onClick={() => onSelectLanguage(lang.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition min-h-[44px] active:scale-[0.98] ${
                      isSelected
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium ring-1 ring-emerald-400'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base">{lang.flag}</span>
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                          {lang.name}
                          {lang.region === 'Indian' && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({lang.nativeName})
                            </span>
                          )}
                        </div>
                        {lang.region === 'Global' && (
                          <div className="text-[10px] text-slate-400 truncate">
                            {lang.nativeName}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 self-start sm:self-auto">
            <span>Target:</span>
            <span className="font-semibold text-slate-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-emerald-800">
              {SUPPORTED_LANGUAGES.find((l) => l.id === selectedLanguage)?.name || selectedLanguage}
            </span>
            {hasOriginalText && onRevertOriginal && (
              <button
                onClick={() => {
                  onRevertOriginal();
                  onClose();
                }}
                disabled={isTranslating}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 underline ml-2"
                title="Revert back to original scanned text"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Revert to original</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={isTranslating}
              className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-xl transition min-h-[42px]"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-translate"
              onClick={() => onTranslate(selectedLanguage)}
              disabled={isTranslating}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2 min-h-[42px] disabled:opacity-50 cursor-pointer"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Translating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>Translate to {selectedLanguage}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
