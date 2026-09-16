import React, { useState, useRef } from 'react';
import {
  Shapes,
  Download,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  FileImage,
} from 'lucide-react';

interface SvgDiagramCardProps {
  svgContent: string;
  title?: string;
  className?: string;
}

export const SvgDiagramCard: React.FC<SvgDiagramCardProps> = ({
  svgContent,
  title,
  className = '',
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clean and extract SVG
  const cleanSvg = React.useMemo(() => {
    let raw = svgContent.trim();
    // If wrapped in markdown code fence, remove it
    raw = raw.replace(/^```(?:svg|xml)?\n?/i, '').replace(/\n?```$/i, '').trim();

    const startIdx = raw.indexOf('<svg');
    if (startIdx === -1) return '';
    let endIdx = raw.lastIndexOf('</svg>');
    if (endIdx === -1) {
      raw += '\n</svg>';
      endIdx = raw.length;
    } else {
      endIdx += 6;
    }

    let extracted = raw.substring(startIdx, endIdx);

    // Ensure it has basic responsive attributes if viewBox exists
    if (!extracted.includes('viewBox=') && extracted.includes('width=') && extracted.includes('height=')) {
      const widthMatch = extracted.match(/width=["'](\d+)["']/);
      const heightMatch = extracted.match(/height=["'](\d+)["']/);
      if (widthMatch && heightMatch) {
        extracted = extracted.replace(
          '<svg',
          `<svg viewBox="0 0 ${widthMatch[1]} ${heightMatch[1]}"`
        );
      }
    }

    return extracted;
  }, [svgContent]);

  // Extract title from SVG <title> if not provided
  const diagramTitle = React.useMemo(() => {
    if (title) return title;
    const match = cleanSvg.match(/<title>([^<]+)<\/title>/i);
    if (match && match[1]) return match[1].trim();
    return 'Geometric / Mathematical Diagram';
  }, [title, cleanSvg]);

  const handleCopySvg = () => {
    navigator.clipboard.writeText(cleanSvg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `math-diagram-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = () => {
    const svgEl = containerRef.current?.querySelector('svg');
    if (!svgEl) return;

    try {
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2; // 2x high resolution
        const width = (svgEl.viewBox?.baseVal?.width || svgEl.clientWidth || 600) * scale;
        const height = (svgEl.viewBox?.baseVal?.height || svgEl.clientHeight || 450) * scale;

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const pngUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = pngUrl;
          a.download = `math-diagram-${Date.now()}.png`;
          a.click();
        }
        URL.revokeObjectURL(url);
      };

      img.src = url;
    } catch (e) {
      console.error('Error generating PNG from SVG:', e);
      handleDownloadSvg();
    }
  };

  if (!cleanSvg) return null;

  return (
    <div
      className={`my-4 rounded-xl border border-indigo-200/80 bg-white shadow-sm overflow-hidden transition-all ${
        isExpanded ? 'fixed inset-4 z-50 flex flex-col shadow-2xl bg-white m-0' : ''
      } ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-indigo-50/90 via-slate-50 to-purple-50/70 border-b border-indigo-100 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-600 text-white shadow-2xs shrink-0">
            <Shapes className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-800 truncate block">
              {diagramTitle}
            </span>
            <span className="text-[10px] text-indigo-700 font-medium">
              Accurate Vector SVG Geometry
            </span>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center bg-white rounded-md border border-slate-200 px-1 py-0.5 mr-1 text-slate-600">
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
              className="p-1 hover:text-indigo-600 rounded transition cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono px-1.5 text-slate-500 min-w-[36px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))}
              className="p-1 hover:text-indigo-600 rounded transition cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            {zoom !== 1 && (
              <button
                onClick={() => setZoom(1)}
                className="p-1 hover:text-indigo-600 rounded transition cursor-pointer ml-0.5 border-l border-slate-100"
                title="Reset zoom"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* Copy SVG */}
          <button
            onClick={handleCopySvg}
            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-xs font-medium transition cursor-pointer"
            title="Copy raw SVG code"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-700 text-[11px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-500" />
                <span className="hidden sm:inline text-[11px]">Copy SVG</span>
              </>
            )}
          </button>

          {/* Download PNG */}
          <button
            onClick={handleDownloadPng}
            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-xs font-medium transition cursor-pointer"
            title="Download crisp PNG image"
          >
            <FileImage className="w-3 h-3 text-indigo-600" />
            <span className="text-[11px]">PNG</span>
          </button>

          {/* Download SVG */}
          <button
            onClick={handleDownloadSvg}
            className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium transition cursor-pointer"
            title="Download SVG vector file"
          >
            <Download className="w-3 h-3" />
            <span className="text-[11px]">SVG</span>
          </button>

          {/* Expand toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-md transition cursor-pointer ml-0.5"
            title={isExpanded ? 'Minimize' : 'Full Screen'}
          >
            {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* SVG Container with math paper grid background */}
      <div
        className={`relative overflow-auto p-4 flex items-center justify-center min-h-[220px] max-h-[500px] ${
          isExpanded ? 'flex-1 max-h-none' : ''
        }`}
        style={{
          backgroundImage:
            'radial-gradient(#e2e8f0 1px, transparent 1px), radial-gradient(#f1f5f9 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px',
          backgroundColor: '#fafbfc',
        }}
        ref={containerRef}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out',
            maxWidth: '100%',
          }}
          className="w-full max-w-xl flex items-center justify-center [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:drop-shadow-xs"
          dangerouslySetInnerHTML={{ __html: cleanSvg }}
        />
      </div>

      {/* Footer Info */}
      <div className="px-3.5 py-1.5 bg-slate-50 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Scalable Vector Geometry • Precise Dimensions</span>
        </span>
        <span className="font-mono text-[10px] text-slate-400">SVG 1.1 Vector</span>
      </div>
    </div>
  );
};
