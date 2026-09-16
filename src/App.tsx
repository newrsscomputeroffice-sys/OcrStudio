import React, { useState, useEffect, useRef } from 'react';
import { DocumentItem, OCRSettings, SystemStatus, ImageFilters } from './types';
import { HeaderSettings } from './components/HeaderSettings';
import { BatchUploadPanel } from './components/BatchUploadPanel';
import { DocumentViewer } from './components/DocumentViewer';
import { TextResultEditor } from './components/TextResultEditor';
import { exportToDocx, exportToPdf } from './utils/exportUtils';
import {
  Layers,
  Eye,
  Edit3,
  Sparkles,
  Play,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle,
  RefreshCw,
  UploadCloud,
} from 'lucide-react';

export default function App() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'preview' | 'editor' | 'batch'>('preview');

  const [settings, setSettings] = useState<OCRSettings>({
    engine: 'auto',
    language: 'auto',
    contentType: 'mixed',
    autoLightingCorrection: true,
    customPrompt: '',
  });

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    sarvamConfigured: false,
    geminiConfigured: true,
  });

  // Fetch status on mount
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        setSystemStatus({
          sarvamConfigured: Boolean(data.sarvamConfigured),
          geminiConfigured: Boolean(data.geminiConfigured),
        });
      })
      .catch((err) => console.warn('Status check warning:', err));
  }, []);

  // Determine file type
  const detectFileType = (file: File): 'image' | 'pdf' | 'docx' | 'unknown' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
    if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.toLowerCase().endsWith('.docx')
    ) {
      return 'docx';
    }
    return 'image';
  };

  // Add files to batch
  const handleAddFiles = (files: File[]) => {
    const newItems: DocumentItem[] = files.map((file) => {
      const docType = detectFileType(file);
      const previewUrl = URL.createObjectURL(file);
      const defaultFilters: ImageFilters = {
        brightness: 100,
        contrast: 100,
        invert: false,
        rotation: 0,
        binarize: false,
      };

      return {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        file,
        name: file.name,
        size: file.size,
        type: docType,
        previewUrl,
        status: 'idle',
        progress: 0,
        extractedText: '',
        extractedMarkdown: '',
        engineUsed: '',
        confidence: 'high',
        wordCount: 0,
        characterCount: 0,
        imageFilters: defaultFilters,
      };
    });

    setDocuments((prev) => [...prev, ...newItems]);

    // Automatically select the first file added if none currently selected
    if (!selectedDocId && newItems.length > 0) {
      setSelectedDocId(newItems[0].id);
      // Let user view the uploaded document first and click 'Generate' when ready
    }
  };

  // Remove document
  const handleRemoveDoc = (id: string) => {
    setDocuments((prev) => {
      const item = prev.find((d) => d.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      const filtered = prev.filter((d) => d.id !== id);
      if (selectedDocId === id) {
        setSelectedDocId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

// Optimize large mobile / WhatsApp camera photos before upload
// Keeps crisp 2000px resolution (standard 300 DPI quality) while shrinking 10MB+ files down to ~400KB
async function optimizeImageForOcr(blob: Blob, maxDimension = 2000): Promise<Blob> {
  // If not an image (e.g. PDF or DOCX), send directly
  if (!blob.type.startsWith('image/') && !blob.type.includes('jpeg') && !blob.type.includes('png') && !blob.type.includes('webp')) {
    return blob;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (!width || !height) {
        resolve(blob);
        return;
      }
      // If already within dimensions and under 800KB, pass through
      if (width <= maxDimension && height <= maxDimension && blob.size < 800 * 1024) {
        resolve(blob);
        return;
      }
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(blob);
        return;
      }
      // Fill clean white background so transparent or PNG scans don't turn black
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (newBlob) => {
          if (newBlob && newBlob.size > 0) {
            resolve(newBlob);
          } else {
            resolve(blob);
          }
        },
        'image/jpeg',
        0.88
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    img.src = url;
  });
}

  // Process a single document
  const processSingleDocument = async (
    doc: DocumentItem,
    currentSettings: OCRSettings,
    overrideBlob?: Blob
  ) => {
    let progressInterval: any = null;
    setDocuments((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, status: 'processing', progress: 25, error: undefined } : d))
    );

    // Dynamic progress bar to give instant visual feedback
    progressInterval = setInterval(() => {
      setDocuments((prev) =>
        prev.map((d) => {
          if (d.id === doc.id && d.status === 'processing') {
            const nextProgress = Math.min((d.progress || 25) + 14, 92);
            return { ...d, progress: nextProgress };
          }
          return d;
        })
      );
    }, 400);

    try {
      const rawFile = overrideBlob || doc.file;
      const fileToSend = await optimizeImageForOcr(rawFile);

      const formData = new FormData();
      formData.append('file', fileToSend, doc.name);
      formData.append('engine', currentSettings.engine);
      formData.append('language', currentSettings.language);
      formData.append('contentType', currentSettings.contentType);
      formData.append('userPrompt', currentSettings.customPrompt);

      let resp: Response;
      try {
        resp = await fetch('/api/ocr', {
          method: 'POST',
          body: formData,
        });
      } catch (fetchErr: any) {
        throw new Error(
          `Network issue (${fetchErr.message || 'Failed to reach server'}). Please check connection and try again.`
        );
      }

      // Safely parse response body
      const rawResponseText = await resp.text().catch(() => '');
      let parsedJson: any = null;
      try {
        parsedJson = rawResponseText ? JSON.parse(rawResponseText) : null;
      } catch {
        parsedJson = null;
      }

      if (!resp.ok || !parsedJson?.success) {
        // If server provided a structured error message, use it
        if (parsedJson?.error) {
          throw new Error(parsedJson.error);
        }

        if (rawResponseText.includes('Please wait while your application starts') || resp.status === 503) {
          throw new Error('The OCR service is currently warming up. Please click Generate again in a few seconds.');
        }
        if (resp.status === 504 || resp.status === 502) {
          throw new Error('OCR request timed out. Please retry processing.');
        }
        if (resp.status === 413) {
          throw new Error('Uploaded file is too large. Please use an image or document under 25MB.');
        }

        throw new Error(
          rawResponseText && !rawResponseText.startsWith('<')
            ? rawResponseText.slice(0, 200)
            : `Server responded with status ${resp.status}. Please click Generate to retry.`
        );
      }

      const result = parsedJson;

      setDocuments((prev) =>
        prev.map((d) => {
          if (d.id === doc.id) {
            const raw = result.markdown || result.text || '';
            const words = raw.trim() ? raw.trim().split(/\s+/).length : 0;
            return {
              ...d,
              status: 'completed',
              progress: 100,
              extractedText: result.text || '',
              extractedMarkdown: result.markdown || result.text || '',
              engineUsed: result.engineUsed || 'OCR Engine',
              confidence: result.confidence || 'high',
              wordCount: words,
              characterCount: raw.length,
              notes: result.notes,
              error: undefined,
            };
          }
          return d;
        })
      );

      // On mobile, smoothly switch to Text & Math Preview when result is ready
      setMobileTab('editor');
    } catch (err: any) {
      console.error(`Error processing document ${doc.name}:`, err);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                status: 'error',
                progress: 0,
                error: err.message || 'OCR processing failed',
              }
            : d
        )
      );
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    }
  };

  // Process all idle or failed documents in the batch
  const handleProcessAll = async () => {
    if (isProcessingBatch) return;
    setIsProcessingBatch(true);

    const pendingDocs = documents.filter((d) => d.status === 'idle' || d.status === 'error');
    for (const doc of pendingDocs) {
      await processSingleDocument(doc, settings);
    }

    setIsProcessingBatch(false);
  };

  // Re-run OCR with enhanced canvas lighting adjustments
  const handleReprocessEnhanced = () => {
    const selectedDoc = documents.find((d) => d.id === selectedDocId);
    if (!selectedDoc || selectedDoc.type !== 'image') return;

    // Grab canvas element from DocumentViewer
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (canvas) {
      canvas.toBlob((blob) => {
        if (blob) {
          processSingleDocument(selectedDoc, settings, blob);
        }
      }, 'image/png');
    }
  };

  // Filter change on document
  const handleFilterChange = (newFilters: ImageFilters) => {
    if (!selectedDocId) return;
    setDocuments((prev) =>
      prev.map((d) => (d.id === selectedDocId ? { ...d, imageFilters: newFilters } : d))
    );
  };

  // Text update in editor
  const handleTextChange = (newText: string) => {
    if (!selectedDocId) return;
    const words = newText.trim() ? newText.trim().split(/\s+/).length : 0;
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === selectedDocId
          ? {
              ...d,
              extractedMarkdown: newText,
              extractedText: newText,
              wordCount: words,
              characterCount: newText.length,
            }
          : d
      )
    );
  };

  // Batch Exports
  const handleExportAllDocx = () => {
    const completedDocs = documents.filter((d) => d.status === 'completed');
    if (completedDocs.length === 0) return;

    const mergedContent = completedDocs
      .map((d) => (d.extractedMarkdown || d.extractedText || '').trim())
      .filter(Boolean)
      .join('\n\n\n');

    exportToDocx(mergedContent, '', `Batch_OCR_${Date.now()}.docx`);
  };

  const handleExportAllPdf = () => {
    const completedDocs = documents.filter((d) => d.status === 'completed');
    if (completedDocs.length === 0) return;

    const mergedContent = completedDocs
      .map((d) => (d.extractedMarkdown || d.extractedText || '').trim())
      .filter(Boolean)
      .join('\n\n\n');

    exportToPdf(mergedContent, '', `Batch_OCR_${Date.now()}.pdf`);
  };

  const selectedDocument = documents.find((d) => d.id === selectedDocId) || null;
  const isSelectedProcessing = selectedDocument?.status === 'processing';
  const currentDocIndex = documents.findIndex((d) => d.id === selectedDocId);
  const queuedCount = documents.filter((d) => d.status === 'idle').length;
  const completedCount = documents.filter((d) => d.status === 'completed').length;

  const handleNextDoc = () => {
    if (currentDocIndex < documents.length - 1) {
      setSelectedDocId(documents[currentDocIndex + 1].id);
    }
  };

  const handlePrevDoc = () => {
    if (currentDocIndex > 0) {
      setSelectedDocId(documents[currentDocIndex - 1].id);
    }
  };

  return (
    <div id="ocr-app-root" className="min-h-screen flex flex-col bg-slate-100 text-slate-900 pb-16 md:pb-0">
      {/* Top Navigation & Settings Bar */}
      <HeaderSettings
        settings={settings}
        onUpdateSettings={(newVals) => setSettings((s) => ({ ...s, ...newVals }))}
        systemStatus={systemStatus}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-5 flex flex-col gap-3 sm:gap-4">
        {/* DESKTOP VIEW: Upload Panel on Top */}
        <div className="hidden md:block">
          <BatchUploadPanel
            documents={documents}
            selectedDocId={selectedDocId}
            onSelectDoc={(id) => setSelectedDocId(id)}
            onAddFiles={handleAddFiles}
            onRemoveDoc={handleRemoveDoc}
            onProcessAll={handleProcessAll}
            onProcessSingle={(id) => {
              const item = documents.find((d) => d.id === id);
              if (item) processSingleDocument(item, settings);
            }}
            isProcessingBatch={isProcessingBatch}
            onExportAllDocx={handleExportAllDocx}
            onExportAllPdf={handleExportAllPdf}
          />
        </div>

        {/* MOBILE VIEW: If No Documents Yet, Show Upload Card Directly */}
        {documents.length === 0 && (
          <div className="md:hidden">
            <BatchUploadPanel
              documents={documents}
              selectedDocId={selectedDocId}
              onSelectDoc={(id) => setSelectedDocId(id)}
              onAddFiles={handleAddFiles}
              onRemoveDoc={handleRemoveDoc}
              onProcessAll={handleProcessAll}
              onProcessSingle={(id) => {
                const item = documents.find((d) => d.id === id);
                if (item) processSingleDocument(item, settings);
              }}
              isProcessingBatch={isProcessingBatch}
              onExportAllDocx={handleExportAllDocx}
              onExportAllPdf={handleExportAllPdf}
            />
          </div>
        )}

        {/* MOBILE VIEW: Document Pagination Strip (Only when docs exist) */}
        {documents.length > 0 && (
          <div className="flex md:hidden items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevDoc}
                disabled={currentDocIndex <= 0}
                className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-700 min-h-[34px] min-w-[34px] flex items-center justify-center"
                title="Previous Document"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextDoc}
                disabled={currentDocIndex >= documents.length - 1}
                className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-700 min-h-[34px] min-w-[34px] flex items-center justify-center"
                title="Next Document"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center min-w-0 flex-1 px-2">
              <div className="font-semibold text-slate-800 truncate text-xs">
                {selectedDocument?.name || 'Document'}
              </div>
              <div className="text-[10px] text-slate-500">
                Page {currentDocIndex + 1} of {documents.length}
                {selectedDocument?.status === 'completed' && ' • Completed'}
                {selectedDocument?.status === 'idle' && ' • Ready to scan'}
                {selectedDocument?.status === 'processing' && ' • Transcribing...'}
              </div>
            </div>

            <button
              onClick={() => setMobileTab('batch')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold text-xs border border-indigo-200 min-h-[34px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Page</span>
            </button>
          </div>
        )}

        {/* WORKSPACE CONTENT AREA */}
        {/* DESKTOP: Side-by-side grid */}
        <div className="hidden md:grid flex-1 grid-cols-2 gap-4 min-h-[560px]">
          {/* Left Pane: Document Viewer with Real-Time Preprocessing */}
          <div className="h-full min-h-[560px]">
            <DocumentViewer
              document={selectedDocument}
              onFilterChange={handleFilterChange}
              onReprocessEnhanced={handleReprocessEnhanced}
              isProcessing={isSelectedProcessing}
              onGenerate={() => {
                if (selectedDocument) processSingleDocument(selectedDocument, settings);
              }}
            />
          </div>

          {/* Right Pane: Live Transcription Editor & Formatted Preview */}
          <div className="h-full min-h-[560px]">
            <TextResultEditor
              document={selectedDocument}
              onTextChange={handleTextChange}
              isProcessing={isSelectedProcessing}
              onGenerate={() => {
                if (selectedDocument) processSingleDocument(selectedDocument, settings);
              }}
            />
          </div>
        </div>

        {/* MOBILE: Single-view active tab display */}
        {documents.length > 0 && (
          <div className="flex-1 md:hidden flex flex-col relative min-h-[520px]">
            {/* View 1: Document Viewer */}
            {mobileTab === 'preview' && (
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex-1 min-h-[460px]">
                  <DocumentViewer
                    document={selectedDocument}
                    onFilterChange={handleFilterChange}
                    onReprocessEnhanced={handleReprocessEnhanced}
                    isProcessing={isSelectedProcessing}
                    onGenerate={() => {
                      if (selectedDocument) processSingleDocument(selectedDocument, settings);
                    }}
                  />
                </div>

                {/* Mobile Floating Action Button if Document is Ready to transcribe */}
                {selectedDocument?.status === 'idle' && (
                  <div className="sticky bottom-2 z-20 px-1 pt-1">
                    <button
                      id="mobile-btn-transcribe-now"
                      onClick={() => {
                        if (selectedDocument) processSingleDocument(selectedDocument, settings);
                      }}
                      disabled={isSelectedProcessing}
                      className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Transcribe Document with AI (1-2s)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* View 2: Live Editor & Formatted Preview */}
            {mobileTab === 'editor' && (
              <div className="flex-1 min-h-[460px]">
                <TextResultEditor
                  document={selectedDocument}
                  onTextChange={handleTextChange}
                  isProcessing={isSelectedProcessing}
                  onGenerate={() => {
                    if (selectedDocument) processSingleDocument(selectedDocument, settings);
                  }}
                />
              </div>
            )}

            {/* View 3: Files & Batch Queue */}
            {mobileTab === 'batch' && (
              <div className="flex-1">
                <BatchUploadPanel
                  documents={documents}
                  selectedDocId={selectedDocId}
                  onSelectDoc={(id) => {
                    setSelectedDocId(id);
                    setMobileTab('preview');
                  }}
                  onAddFiles={handleAddFiles}
                  onRemoveDoc={handleRemoveDoc}
                  onProcessAll={handleProcessAll}
                  onProcessSingle={(id) => {
                    const item = documents.find((d) => d.id === id);
                    if (item) processSingleDocument(item, settings);
                  }}
                  isProcessingBatch={isProcessingBatch}
                  onExportAllDocx={handleExportAllDocx}
                  onExportAllPdf={handleExportAllPdf}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* MOBILE STICKY BOTTOM NAVIGATION BAR */}
      {documents.length > 0 && (
        <nav
          id="mobile-bottom-nav"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1 flex items-center justify-around"
        >
          <button
            id="nav-tab-preview"
            onClick={() => setMobileTab('preview')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition min-w-[76px] ${
              mobileTab === 'preview'
                ? 'text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Eye className={`w-5 h-5 mb-0.5 ${mobileTab === 'preview' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px]">Scan / Photo</span>
          </button>

          <button
            id="nav-tab-editor"
            onClick={() => setMobileTab('editor')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition min-w-[76px] relative ${
              mobileTab === 'editor'
                ? 'text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Edit3 className={`w-5 h-5 mb-0.5 ${mobileTab === 'editor' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px]">Text & Math</span>
            {selectedDocument?.status === 'completed' && (
              <span className="absolute top-1 right-4 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
            )}
          </button>

          <button
            id="nav-tab-batch"
            onClick={() => setMobileTab('batch')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition min-w-[76px] relative ${
              mobileTab === 'batch'
                ? 'text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Layers className={`w-5 h-5 mb-0.5 ${mobileTab === 'batch' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px]">Files ({documents.length})</span>
            {queuedCount > 0 && (
              <span className="absolute top-1 right-3 px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[9px] font-bold">
                {queuedCount}
              </span>
            )}
          </button>
        </nav>
      )}
    </div>
  );
}
