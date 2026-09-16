import React, { useState } from 'react';
import {
  X,
  Shapes,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';
import { SvgDiagramCard } from './SvgDiagramCard';

interface MathDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertDiagram: (svgCode: string) => void;
}

const PRESET_TEMPLATES = [
  {
    id: 'right-triangle',
    title: '📐 Right Triangle (Pythagoras)',
    desc: 'Triangle ABC with 90° angle at B, sides a, b, c, and angle θ',
    prompt:
      'Right-angled triangle ABC with right angle at B, perpendicular AB = 3 cm, base BC = 4 cm, hypotenuse AC = 5 cm, right angle square marker at B, and angle theta marked at vertex C.',
    category: 'Geometry',
  },
  {
    id: 'circle-tangent',
    title: '⭕ Circle with Tangent & Secant',
    desc: 'Circle center O, tangent PT at T, secant PAB',
    prompt:
      'Circle with center O, radius r = 5 cm, external point P, tangent line PT touching circle at point T with radius OT perpendicular to PT, and secant PAB passing through circle points A and B.',
    category: 'Geometry',
  },
  {
    id: 'parabola-graph',
    title: '📈 Parabola Graph (y = x² - 4)',
    desc: 'Cartesian axes, roots at -2 & 2, vertex (0, -4)',
    prompt:
      'Cartesian coordinate plane with x and y axes with arrows, origin (0,0), showing parabola y = x^2 - 4 with vertex at (0, -4), x-intercepts at (-2, 0) and (2, 0), and y-intercept at (0, -4).',
    category: 'Coordinate Geometry',
  },
  {
    id: 'sine-wave',
    title: '〰️ Sine Wave (0 to 2π)',
    desc: 'y = sin(x) wave from 0 to 2π with key points marked',
    prompt:
      'Graph of trigonometric function y = sin(x) on coordinate axes from x = 0 to 2*pi, amplitude 1, with points marked at (pi/2, 1), (pi, 0), (3pi/2, -1), and (2pi, 0).',
    category: 'Trigonometry',
  },
  {
    id: 'parallel-transversal',
    title: '⚡ Parallel Lines & Transversal',
    desc: 'Two parallel lines L1, L2 cut by transversal line T',
    prompt:
      'Two horizontal parallel lines L1 and L2 intersected by a transversal line T, with alternate interior angles and corresponding angles clearly numbered 1 through 8.',
    category: 'Geometry',
  },
  {
    id: 'venn-diagram',
    title: '🔲 Venn Diagram (2 Sets A & B)',
    desc: 'Universal set U with overlapping sets A and B',
    prompt:
      'Venn diagram with a universal set bounding rectangle U, two overlapping circular sets A and B, with union, intersection A ∩ B, and only-A / only-B regions clearly labeled.',
    category: 'Set Theory',
  },
];

export const MathDiagramModal: React.FC<MathDiagramModalProps> = ({
  isOpen,
  onClose,
  onInsertDiagram,
}) => {
  const [promptText, setPromptText] = useState<string>(PRESET_TEMPLATES[0].prompt);
  const [diagramType, setDiagramType] = useState<string>('Geometric Figure');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedSvg, setGeneratedSvg] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [inserted, setInserted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSelectTemplate = (template: (typeof PRESET_TEMPLATES)[0]) => {
    setPromptText(template.prompt);
    setDiagramType(template.category);
    setGeneratedSvg('');
    setErrorMessage('');
  };

  const handleGenerate = async () => {
    if (!promptText.trim() || isGenerating) return;
    setIsGenerating(true);
    setErrorMessage('');
    setInserted(false);

    try {
      const resp = await fetch('/api/generate-diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemText: promptText.trim(),
          diagramType,
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
        throw new Error(data.error || 'Failed to synthesize diagram. Please try again.');
      }

      setGeneratedSvg(data.svg);
    } catch (err: any) {
      console.error('Diagram generation error:', err);
      setErrorMessage(err.message || 'Error communicating with diagram engine.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsert = () => {
    if (!generatedSvg) return;
    const formattedBlock = `\n\n\`\`\`svg\n${generatedSvg.trim()}\n\`\`\`\n\n`;
    onInsertDiagram(formattedBlock);
    setInserted(true);
    setTimeout(() => {
      setInserted(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 via-slate-50 to-purple-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Shapes className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Accurate Mathematical Diagram Generator
              </h3>
              <p className="text-xs text-slate-500">
                Generate vector SVG diagrams for geometry problems, coordinate graphs & theorems
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Quick Preset Templates */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
              Select a Mathematical Template or Custom Problem:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {PRESET_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl)}
                  className={`text-left p-2.5 rounded-xl border transition cursor-pointer text-xs ${
                    promptText === tmpl.prompt
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-medium ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-semibold text-slate-800 mb-0.5">{tmpl.title}</div>
                  <div className="text-[11px] text-slate-500 leading-snug">{tmpl.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Problem Statement / Diagram Specifications:
              </label>
              <span className="text-[11px] text-indigo-600 font-medium">
                Include points, angles, lengths, or equations
              </span>
            </div>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g. Triangle ABC with angle B = 90 deg, AB = 6 cm, BC = 8 cm. Calculate hypotenuse AC. Mark right angle and lengths."
              rows={3}
              className="w-full px-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono resize-none leading-relaxed"
            />
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !promptText.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Computing Vector Geometry & Drawing SVG...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Accurate Diagram</span>
                </>
              )}
            </button>

            {generatedSvg && (
              <button
                onClick={handleInsert}
                disabled={inserted}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                {inserted ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Inserted into Document!</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    <span>Insert Diagram into Document</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Generated Diagram Preview */}
          {generatedSvg ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                <span>Diagram Preview:</span>
                <span className="text-[11px] font-normal text-slate-500">
                  Ready to insert into your OCR document
                </span>
              </div>
              <SvgDiagramCard svgContent={generatedSvg} title="Generated Mathematical Diagram" />
            </div>
          ) : !isGenerating ? (
            <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Shapes className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600">
                No diagram generated yet
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Click &quot;Generate Accurate Diagram&quot; above to compute and preview the vector figure.
              </p>
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Output: Clean, responsive, scalable SVG 1.1 with labeled vertices & measurements</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
