import React, { useRef, useEffect, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sun,
  Sliders,
  Sparkles,
  RefreshCw,
  Eye,
  FileText,
  FileCode,
  CheckCircle2,
  Play,
} from 'lucide-react';
import { DocumentItem, ImageFilters } from '../types';

interface DocumentViewerProps {
  document: DocumentItem | null;
  onFilterChange: (filters: ImageFilters) => void;
  onReprocessEnhanced: () => void;
  isProcessing: boolean;
  onGenerate?: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  onFilterChange,
  onReprocessEnhanced,
  isProcessing,
  onGenerate,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  // Reset zoom when document changes
  useEffect(() => {
    setZoom(1);
  }, [document?.id]);

  // Render canvas whenever document or filters change
  useEffect(() => {
    if (!document || document.type !== 'image') return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = document.previewUrl;
    img.onload = () => {
      imageObjRef.current = img;
      renderFilteredCanvas();
    };
  }, [document?.previewUrl, document?.imageFilters]);

  const renderFilteredCanvas = () => {
    if (!document || !canvasRef.current || !imageObjRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageObjRef.current;
    const { rotation, brightness, contrast, invert, binarize } = document.imageFilters;

    // Handle rotation dimensions
    const isRotated90or270 = rotation === 90 || rotation === 270;
    canvas.width = isRotated90or270 ? img.height : img.width;
    canvas.height = isRotated90or270 ? img.width : img.height;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply rotation
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    // Pixel manipulation for Brightness, Contrast, Invert, Binarize
    if (brightness !== 100 || contrast !== 100 || invert || binarize) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      const brightnessOffset = (brightness - 100) * 1.5;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Invert
        if (invert) {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
        }

        // Contrast & Brightness
        r = contrastFactor * (r - 128) + 128 + brightnessOffset;
        g = contrastFactor * (g - 128) + 128 + brightnessOffset;
        b = contrastFactor * (b - 128) + 128 + brightnessOffset;

        // Clamp
        r = Math.min(255, Math.max(0, r));
        g = Math.min(255, Math.max(0, g));
        b = Math.min(255, Math.max(0, b));

        // Binarize (adaptive high-contrast threshold for handwriting)
        if (binarize) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const val = gray < 135 ? 0 : 255;
          r = val;
          g = val;
          b = val;
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }

      ctx.putImageData(imgData, 0, 0);
    }
  };

  const handleRotate = () => {
    if (!document) return;
    const nextRot = ((document.imageFilters.rotation + 90) % 360) as 0 | 90 | 180 | 270;
    onFilterChange({ ...document.imageFilters, rotation: nextRot });
  };

  const handleAutoEnhance = () => {
    if (!document) return;
    // Auto preset for uneven lighting & handwriting: boost contrast, slight brightness lift
    onFilterChange({
      ...document.imageFilters,
      brightness: 110,
      contrast: 135,
      binarize: false,
    });
  };

  const handleResetFilters = () => {
    if (!document) return;
    onFilterChange({
      brightness: 100,
      contrast: 100,
      invert: false,
      rotation: 0,
      binarize: false,
    });
  };

  if (!document) {
    return (
      <div
        id="document-viewer-empty"
        className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-50/60 rounded-xl border border-dashed border-slate-200"
      >
        <FileText className="w-14 h-14 text-slate-300 mb-3" />
        <p className="text-base font-medium text-slate-700">No document selected</p>
        <p className="text-sm text-slate-500 max-w-sm mt-1">
          Upload an image, PDF, or DOCX document from the upload area to inspect and transcribe.
        </p>
      </div>
    );
  }

  const { brightness, contrast, invert, binarize, rotation } = document.imageFilters;
  const isCustomized = brightness !== 100 || contrast !== 100 || invert || binarize || rotation !== 0;

  return (
    <div id="document-viewer-container" className="h-full flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Viewer Header / Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 border-b border-slate-200 gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <Eye className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-xs font-semibold text-slate-800 truncate max-w-[150px] sm:max-w-[200px]" title={document.name}>
            {document.name}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/80 font-semibold text-slate-600 uppercase">
            {document.type}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1 sm:space-x-1.5">
          {/* Main Generate / Re-generate Button */}
          {document.status === 'idle' && (
            <button
              id="btn-viewer-generate"
              onClick={onGenerate}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition transform active:scale-95 cursor-pointer min-h-[34px]"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Transcribe</span>
            </button>
          )}

          {document.status === 'processing' && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 sm:px-3 py-1.5 rounded-lg font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 min-h-[34px]">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>Scanning...</span>
            </span>
          )}

          {document.status === 'completed' && (
            <button
              id="btn-viewer-regenerate"
              onClick={onGenerate}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 text-xs px-2 sm:px-2.5 py-1.5 rounded-lg font-medium bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition cursor-pointer min-h-[34px]"
              title="Re-run transcription"
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Re-scan</span>
            </button>
          )}

          {document.type === 'image' && (
            <>
              {/* Rotate 90deg - very important for phone photos */}
              <button
                id="btn-rotate"
                onClick={handleRotate}
                className="p-1.5 text-slate-700 hover:bg-slate-200/80 bg-white border border-slate-200 rounded-lg transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center active:scale-95"
                title="Rotate 90° Clockwise"
              >
                <RotateCw className="w-4 h-4 text-slate-600" />
              </button>

              {/* Auto Enhance */}
              <button
                id="btn-auto-enhance"
                onClick={handleAutoEnhance}
                className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg font-medium bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 transition-colors min-h-[34px] active:scale-95"
                title="Auto-optimize lighting and contrast for handwriting"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Enhance</span>
              </button>

              {/* Sliders toggle */}
              <button
                id="btn-toggle-filters"
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1.5 rounded-lg font-medium transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center ${
                  showFilters || isCustomized
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-300 font-semibold'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
                title="Adjust Lighting & Handwriting Contrast"
              >
                <Sliders className="w-4 h-4" />
              </button>
            </>
          )}

          <div className="h-4 w-px bg-slate-300 mx-0.5 hidden sm:block"></div>

          <button
            id="btn-zoom-out"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-[11px] font-mono text-slate-600 w-8 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>

          <button
            id="btn-zoom-in"
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Image Lighting & Contrast Controls */}
      {showFilters && document.type === 'image' && (
        <div id="image-enhancement-panel" className="px-3 sm:px-4 py-2.5 bg-indigo-50/80 border-b border-indigo-100 flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-700 font-medium">Brightness:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="50"
                max="160"
                value={brightness}
                onChange={(e) => onFilterChange({ ...document.imageFilters, brightness: Number(e.target.value) })}
                className="w-28 sm:w-24 accent-indigo-600 cursor-pointer"
              />
              <span className="text-slate-500 font-mono w-7 text-right">{brightness}%</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-slate-700 font-medium">Contrast:</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="60"
                max="200"
                value={contrast}
                onChange={(e) => onFilterChange({ ...document.imageFilters, contrast: Number(e.target.value) })}
                className="w-28 sm:w-24 accent-indigo-600 cursor-pointer"
              />
              <span className="text-slate-500 font-mono w-7 text-right">{contrast}%</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full pt-1.5 sm:pt-0 border-t sm:border-t-0 border-indigo-100 justify-between">
            <label className="flex items-center space-x-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={binarize}
                onChange={(e) => onFilterChange({ ...document.imageFilters, binarize: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-700 font-medium">Ink Sharpener</span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={invert}
                onChange={(e) => onFilterChange({ ...document.imageFilters, invert: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-700 font-medium">Invert Color</span>
            </label>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleResetFilters}
                className="text-xs text-indigo-700 hover:text-indigo-900 font-medium underline cursor-pointer"
              >
                Reset
              </button>

              <button
                onClick={onReprocessEnhanced}
                disabled={isProcessing}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50 min-h-[32px]"
              >
                <RefreshCw className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>Apply & Re-scan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 overflow-auto bg-slate-100/70 p-4 flex items-center justify-center relative select-none">
        {document.type === 'image' && (
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out',
            }}
            className="flex items-center justify-center max-w-full max-h-full"
          >
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[70vh] object-contain shadow-md rounded-md bg-white"
            />
          </div>
        )}

        {document.type === 'pdf' && (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <iframe
              src={document.previewUrl}
              title="PDF Preview"
              className="w-full h-full min-h-[500px] rounded-md border border-slate-200 shadow-sm bg-white"
            />
          </div>
        )}

        {document.type === 'docx' && (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <FileCode className="w-8 h-8" />
            </div>
            <h4 className="text-base font-semibold text-slate-800">{document.name}</h4>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Microsoft Word Document ({(document.size / 1024).toFixed(1)} KB)
            </p>
            <div className="p-3 bg-slate-50 rounded-lg text-left text-xs text-slate-600 w-full border border-slate-200">
              <p className="font-medium text-slate-700 mb-1">DOCX Content Handler:</p>
              <p>Text, paragraphs, and tables are directly extracted natively with layout preservation.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 bg-white border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span>Size: {(document.size / 1024).toFixed(1)} KB</span>
          {document.confidence && (
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              {document.confidence.toUpperCase()} Confidence
            </span>
          )}
        </div>
        <div>
          {document.engineUsed && (
            <span className="text-slate-600">
              Engine: <strong className="text-slate-800">{document.engineUsed}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
