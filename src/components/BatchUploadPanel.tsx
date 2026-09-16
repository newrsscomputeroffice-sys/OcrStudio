import React, { useRef } from 'react';
import {
  UploadCloud,
  FileImage,
  FileText,
  FileCode,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Camera,
  Play,
  Download,
  FolderArchive,
  RotateCw,
} from 'lucide-react';
import { DocumentItem } from '../types';
import { createSampleDocument } from '../utils/sampleDocuments';

interface BatchUploadPanelProps {
  documents: DocumentItem[];
  selectedDocId: string | null;
  onSelectDoc: (id: string) => void;
  onAddFiles: (files: File[]) => void;
  onRemoveDoc: (id: string) => void;
  onProcessAll: () => void;
  onProcessSingle: (id: string) => void;
  isProcessingBatch: boolean;
  onExportAllDocx: () => void;
  onExportAllPdf: () => void;
}

export const BatchUploadPanel: React.FC<BatchUploadPanelProps> = ({
  documents,
  selectedDocId,
  onSelectDoc,
  onAddFiles,
  onRemoveDoc,
  onProcessAll,
  onProcessSingle,
  isProcessingBatch,
  onExportAllDocx,
  onExportAllPdf,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      onAddFiles(droppedFiles);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      onAddFiles(selectedFiles);
      e.target.value = '';
    }
  };

  const handleLoadSample = async (
    type: 'handwriting' | 'poor-lighting' | 'invoice-table' | 'math-formulas'
  ) => {
    const file = await createSampleDocument(type);
    onAddFiles([file]);
  };

  const completedCount = documents.filter((d) => d.status === 'completed').length;
  const queuedCount = documents.filter((d) => d.status === 'idle').length;
  const errorCount = documents.filter((d) => d.status === 'error').length;

  return (
    <div id="batch-upload-panel" className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col gap-4">
      {/* Upload Action Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:hidden gap-2.5">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-md transition active:scale-98 min-h-[48px]"
        >
          <Camera className="w-5 h-5" />
          <span>Capture Photo (Camera)</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 rounded-xl font-semibold text-sm shadow-xs transition active:scale-98 min-h-[48px]"
        >
          <UploadCloud className="w-5 h-5 text-indigo-600" />
          <span>Browse Files / Gallery</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* Desktop Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="hidden md:flex border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-5 text-center cursor-pointer transition-colors bg-slate-50/70 hover:bg-indigo-50/30 flex-col items-center justify-center relative group"
      >
        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
          <UploadCloud className="w-5 h-5" />
        </div>

        <h3 className="text-sm font-semibold text-slate-800">
          Click to upload or drag & drop documents
        </h3>
        <p className="text-xs text-slate-500 mt-0.5 max-w-md">
          Supports <strong>Handwritten & Printed Images</strong> (PNG, JPG, WEBP), <strong>PDFs</strong>, and <strong>DOCX Word files</strong>.
        </p>

        {/* Camera Quick Action for desktop with webcam */}
        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cameraInputRef.current?.click();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 rounded-md text-xs font-medium text-slate-700 shadow-xs transition"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-500" />
            Capture with Camera
          </button>
        </div>
      </div>

      {/* Pre-Loaded Quick Samples */}
      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">
          Try Realistic Test Samples:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <button
            id="sample-math-formulas"
            onClick={() => handleLoadSample('math-formulas')}
            className="shrink-0 px-2.5 py-1.5 text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200 rounded-lg hover:bg-purple-100 transition shadow-2xs active:scale-95"
            title="Math & physics exam notes with calculus, quadratic equations, and matrices"
          >
            📐 Math & Formulas
          </button>
          <button
            id="sample-doctor-note"
            onClick={() => handleLoadSample('handwriting')}
            className="shrink-0 px-2.5 py-1.5 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 rounded-lg hover:bg-amber-100 transition shadow-2xs active:scale-95"
            title="Doctor prescription with cursive handwriting and Hindi dosage notes"
          >
            ✍️ Doctor Prescription
          </button>
          <button
            id="sample-poor-lighting"
            onClick={() => handleLoadSample('poor-lighting')}
            className="shrink-0 px-2.5 py-1.5 text-xs font-medium bg-stone-100 text-stone-800 border border-stone-300 rounded-lg hover:bg-stone-200 transition shadow-2xs active:scale-95"
            title="Heavy shadow, low-light document inspection sheet"
          >
            🌓 Low Light / Shadow
          </button>
          <button
            id="sample-invoice-table"
            onClick={() => handleLoadSample('invoice-table')}
            className="shrink-0 px-2.5 py-1.5 text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-100 transition shadow-2xs active:scale-95"
            title="Official GST invoice with multi-column item table"
          >
            📊 Invoice Table
          </button>
        </div>
      </div>

      {/* Queued / Retry Action Banner */}
      {(queuedCount > 0 || errorCount > 0) && (
        <div
          className={`border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 ${
            errorCount > 0 && queuedCount === 0
              ? 'bg-rose-50/90 border-rose-200'
              : 'bg-indigo-50/80 border-indigo-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`flex h-2 w-2 rounded-full animate-pulse ${
                errorCount > 0 && queuedCount === 0 ? 'bg-rose-600' : 'bg-indigo-600'
              }`}
            ></span>
            <span
              className={`text-xs font-medium ${
                errorCount > 0 && queuedCount === 0 ? 'text-rose-950' : 'text-indigo-950'
              }`}
            >
              {errorCount > 0 && queuedCount === 0
                ? `${errorCount} document${errorCount > 1 ? 's' : ''} had a temporary issue. Click Retry to process again.`
                : `${queuedCount} document${queuedCount > 1 ? 's' : ''} ready${
                    errorCount > 0 ? ` (${errorCount} failed)` : ''
                  }. Click Generate to transcribe.`}
            </span>
          </div>
          <button
            id="btn-banner-generate-all"
            onClick={onProcessAll}
            disabled={isProcessingBatch}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-white rounded-lg text-xs font-semibold shadow-xs transition transform active:scale-95 cursor-pointer disabled:opacity-50 ${
              errorCount > 0 && queuedCount === 0
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {errorCount > 0 && queuedCount === 0 ? (
              <>
                <RotateCw className="w-3.5 h-3.5" />
                <span>Retry {errorCount > 1 ? `Failed (${errorCount})` : 'OCR'}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  Generate {queuedCount + errorCount > 1 ? `All (${queuedCount + errorCount})` : 'Transcription'}
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Batch Queue & Actions */}
      {documents.length > 0 && (
        <div className="border-t border-slate-200 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800">
                Documents in Batch ({documents.length})
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                {completedCount} Done{queuedCount > 0 ? ` / ${queuedCount} Queued` : ''}
                {errorCount > 0 ? ` / ${errorCount} Failed` : ''}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {(queuedCount > 0 || errorCount > 0) && (
                <button
                  id="btn-process-all"
                  onClick={onProcessAll}
                  disabled={isProcessingBatch}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white rounded-md text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer ${
                    errorCount > 0 && queuedCount === 0
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {errorCount > 0 && queuedCount === 0 ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5" />
                      Retry All ({errorCount})
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Generate All ({queuedCount + errorCount})
                    </>
                  )}
                </button>
              )}

              {completedCount > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={onExportAllDocx}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-md text-xs font-medium transition"
                    title="Export All to merged DOCX"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    All DOCX
                  </button>
                  <button
                    onClick={onExportAllPdf}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-md text-xs font-medium transition"
                    title="Export All to merged PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    All PDF
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* List of queued files */}
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
            {documents.map((doc) => {
              const isSelected = doc.id === selectedDocId;

              return (
                <div
                  key={doc.id}
                  onClick={() => onSelectDoc(doc.id)}
                  className={`flex items-center justify-between p-2.5 sm:p-2 rounded-xl border text-xs cursor-pointer transition-all min-h-[50px] ${
                    isSelected
                      ? 'bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-200 shadow-2xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    {/* File Icon / Thumbnail */}
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                      {doc.type === 'image' && <FileImage className="w-4.5 h-4.5 text-emerald-600" />}
                      {doc.type === 'pdf' && <FileText className="w-4.5 h-4.5 text-rose-600" />}
                      {doc.type === 'docx' && <FileCode className="w-4.5 h-4.5 text-blue-600" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate text-xs sm:text-sm" title={doc.name}>
                        {doc.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {(doc.size / 1024).toFixed(1)} KB • {doc.type.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator & Action */}
                  <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0 ml-2">
                    {doc.status === 'processing' && (
                      <span className="flex items-center gap-1 text-indigo-600 font-semibold text-xs">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span className="hidden sm:inline">Transcribing...</span>
                      </span>
                    )}
                    {doc.status === 'completed' && (
                      <span className="flex items-center gap-1 text-emerald-700 font-semibold text-xs bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{doc.wordCount} words</span>
                      </span>
                    )}
                    {doc.status === 'error' && (
                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1 text-rose-600 font-medium" title={doc.error}>
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Failed</span>
                        </span>
                        <button
                          id={`btn-item-retry-${doc.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onProcessSingle(doc.id);
                          }}
                          disabled={isProcessingBatch}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs shadow-2xs flex items-center gap-1 transition cursor-pointer disabled:opacity-50 min-h-[36px]"
                          title={`Click to retry: ${doc.error || 'Failed'}`}
                        >
                          <RotateCw className="w-3 h-3" />
                          Retry
                        </button>
                      </div>
                    )}
                    {doc.status === 'idle' && (
                      <button
                        id={`btn-item-generate-${doc.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onProcessSingle(doc.id);
                        }}
                        disabled={isProcessingBatch}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 min-h-[36px] active:scale-95"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>Generate</span>
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveDoc(doc.id);
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
