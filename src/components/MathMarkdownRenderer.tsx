import React, { useState } from 'react';
import katex from 'katex';
import { Copy, Check, Sigma } from 'lucide-react';
import { SvgDiagramCard } from './SvgDiagramCard';

interface MathMarkdownRendererProps {
  content: string;
}

// Safely render math using KaTeX
function renderKatex(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex.trim(), {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
      strict: false,
    });
  } catch {
    return `<span class="text-rose-600 font-mono text-xs">${tex}</span>`;
  }
}

// Render text containing inline math $...$ or embedded $$...$$
const InlineMathText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  // Regex to match either $$display$$ or $inline$
  const mathRegex = /(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = mathRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${key++}`}>
          {text.substring(lastIndex, match.index)}
        </span>
      );
    }

    const token = match[1];
    const isDisplay = token.startsWith('$$') && token.endsWith('$$');
    const rawTex = isDisplay ? token.slice(2, -2) : token.slice(1, -1);
    const html = renderKatex(rawTex, isDisplay);

    if (isDisplay) {
      parts.push(
        <div
          key={`math-disp-${key++}`}
          className="my-2 py-1 overflow-x-auto text-center"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } else {
      parts.push(
        <span
          key={`math-in-${key++}`}
          className="inline-katex font-serif text-slate-900 align-baseline mx-0.5"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    lastIndex = mathRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`text-${key++}`}>{text.substring(lastIndex)}</span>);
  }

  return <>{parts.length > 0 ? parts : text}</>;
};

// Render display / block math $$...$$
const BlockMathCard: React.FC<{ tex: string }> = ({ tex }) => {
  const [copied, setCopied] = useState(false);
  const cleanTex = tex.replace(/^\$\$|\$\$$/g, '').trim();
  const html = renderKatex(cleanTex, true);

  const handleCopyTex = () => {
    navigator.clipboard.writeText(`$$${cleanTex}$$`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 py-1.5 px-3 rounded-lg hover:bg-slate-50 relative group transition-colors flex items-center justify-center">
      <div
        className="overflow-x-auto text-center text-slate-900 scrollbar-thin max-w-full"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <button
        onClick={handleCopyTex}
        className="opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2 py-1 rounded bg-white shadow-xs border border-slate-200 text-slate-500 hover:text-indigo-600 text-[11px] transition cursor-pointer"
        title="Copy LaTeX formula"
      >
        {copied ? (
          <>
            <Check className="w-3 h-3 text-emerald-600" />
            <span className="text-emerald-700 font-medium">Copied</span>
          </>
        ) : (
          <>
            <Copy className="w-3 h-3 text-slate-400" />
            <span>Copy</span>
          </>
        )}
      </button>
    </div>
  );
};

export const MathMarkdownRenderer: React.FC<MathMarkdownRendererProps> = ({ content }) => {
  if (!content || !content.trim()) {
    return <div className="text-slate-400 italic text-sm">No text to display.</div>;
  }

  // Pre-process content into blocks (paragraphs, headers, tables, display math)
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentTable: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockBuffer: string[] = [];
  let inRawSvg = false;
  let rawSvgBuffer: string[] = [];
  let inDisplayMath = false;
  let displayMathBuffer: string[] = [];

  const flushTable = (key: string) => {
    if (currentTable.length === 0) return null;
    const tableLines = [...currentTable];
    currentTable = [];

    // Filter separator lines
    const rows = tableLines.filter((l) => !l.match(/^\|?\s*[-:]+[-| :]*$/));
    if (rows.length === 0) return null;

    return (
      <div key={key} className="overflow-x-auto my-3 rounded-lg border border-slate-200 shadow-xs">
        <table className="min-w-full text-xs text-left text-slate-700">
          <thead className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-200">
            <tr>
              {rows[0]
                .split('|')
                .map((c) => c.trim())
                .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1)
                .map((cell, cIdx) => (
                  <th key={cIdx} className="px-3 py-2">
                    <InlineMathText text={cell} />
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {rows.slice(1).map((r, rIdx) => (
              <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50/60' : ''}>
                {r
                  .split('|')
                  .map((c) => c.trim())
                  .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1)
                  .map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 font-mono text-[11.5px]">
                      <InlineMathText text={cell} />
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  let elementIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check raw SVG outside code block
    if (!inCodeBlock && !inDisplayMath) {
      if (!inRawSvg && trimmed.startsWith('<svg')) {
        const tbl = flushTable(`tbl-${elementIndex++}`);
        if (tbl) elements.push(tbl);
        if (trimmed.includes('</svg>')) {
          elements.push(
            <SvgDiagramCard key={`svg-raw-${elementIndex++}`} svgContent={trimmed} />
          );
          continue;
        } else {
          inRawSvg = true;
          rawSvgBuffer = [line];
          continue;
        }
      }

      if (inRawSvg) {
        rawSvgBuffer.push(line);
        if (trimmed.includes('</svg>')) {
          inRawSvg = false;
          elements.push(
            <SvgDiagramCard key={`svg-raw-${elementIndex++}`} svgContent={rawSvgBuffer.join('\n')} />
          );
          rawSvgBuffer = [];
        }
        continue;
      }
    }

    // Check code fence
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // close code block
        inCodeBlock = false;
        const codeText = codeBlockBuffer.join('\n');
        const isSvgBlock =
          codeBlockLang === 'svg' ||
          codeBlockLang === 'xml' ||
          codeText.includes('<svg') ||
          codeBlockBuffer.some((l) => l.trim().startsWith('<svg'));

        if (isSvgBlock && codeText.includes('<svg')) {
          elements.push(
            <SvgDiagramCard key={`svg-diag-${elementIndex++}`} svgContent={codeText} />
          );
        } else {
          elements.push(
            <pre
              key={`code-${elementIndex++}`}
              className="my-3 p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-xs overflow-x-auto"
            >
              <code>{codeText}</code>
            </pre>
          );
        }
        codeBlockBuffer = [];
        codeBlockLang = '';
        continue;
      } else {
        inCodeBlock = true;
        codeBlockLang = trimmed.replace(/^```/, '').trim().toLowerCase();
        codeBlockBuffer = [];
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    // Check display math $$...$$
    // Single line $$ ... $$
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length >= 4 && trimmed !== '$$') {
      const tbl = flushTable(`tbl-${elementIndex++}`);
      if (tbl) elements.push(tbl);
      elements.push(<BlockMathCard key={`math-${elementIndex++}`} tex={trimmed} />);
      continue;
    }

    // Multi-line $$ start or end
    if (!inDisplayMath && trimmed.startsWith('$$')) {
      const tbl = flushTable(`tbl-${elementIndex++}`);
      if (tbl) elements.push(tbl);
      inDisplayMath = true;
      const initialPart = trimmed.slice(2).trim();
      displayMathBuffer = initialPart ? [initialPart] : [];
      continue;
    }

    if (inDisplayMath) {
      if (trimmed.endsWith('$$')) {
        inDisplayMath = false;
        const finalPart = trimmed.slice(0, -2).trim();
        if (finalPart) displayMathBuffer.push(finalPart);
        elements.push(
          <BlockMathCard key={`math-${elementIndex++}`} tex={displayMathBuffer.join('\n')} />
        );
        displayMathBuffer = [];
      } else {
        displayMathBuffer.push(line);
      }
      continue;
    }

    // Table row detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      currentTable.push(trimmed);
      continue;
    } else if (currentTable.length > 0) {
      const tbl = flushTable(`tbl-${elementIndex++}`);
      if (tbl) elements.push(tbl);
    }

    // Empty line
    if (!trimmed) {
      elements.push(<div key={`space-${elementIndex++}`} className="h-2.5" />);
      continue;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1
          key={`h1-${elementIndex++}`}
          className="text-lg font-bold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-200"
        >
          <InlineMathText text={trimmed.replace(/^#\s+/, '')} />
        </h1>
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2
          key={`h2-${elementIndex++}`}
          className="text-base font-semibold text-slate-800 mt-3 mb-1.5"
        >
          <InlineMathText text={trimmed.replace(/^##\s+/, '')} />
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3
          key={`h3-${elementIndex++}`}
          className="text-sm font-semibold text-slate-800 mt-2.5 mb-1"
        >
          <InlineMathText text={trimmed.replace(/^###\s+/, '')} />
        </h3>
      );
      continue;
    }

    // Bullet / List
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={`li-${elementIndex++}`} className="ml-5 list-disc text-slate-700 my-0.5 text-sm leading-relaxed">
          <InlineMathText text={trimmed.replace(/^[-*]\s+/, '')} />
        </li>
      );
      continue;
    }

    // Numbered List
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={`num-${elementIndex++}`} className="ml-5 flex items-start gap-1.5 text-slate-700 my-0.5 text-sm leading-relaxed">
          <span className="font-semibold text-indigo-600 shrink-0">{numMatch[1]}.</span>
          <div>
            <InlineMathText text={numMatch[2]} />
          </div>
        </div>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${elementIndex++}`}
          className="pl-3 py-1 my-2 border-l-4 border-indigo-400 bg-indigo-50/40 text-slate-700 italic text-sm rounded-r-md"
        >
          <InlineMathText text={trimmed.replace(/^>\s+/, '')} />
        </blockquote>
      );
      continue;
    }

    // Standard Paragraph
    elements.push(
      <p key={`p-${elementIndex++}`} className="my-1.5 text-slate-800 text-sm leading-relaxed">
        <InlineMathText text={line} />
      </p>
    );
  }

  // Final table flush if ending with table
  if (currentTable.length > 0) {
    const tbl = flushTable(`tbl-${elementIndex++}`);
    if (tbl) elements.push(tbl);
  }

  return <div className="space-y-0.5">{elements}</div>;
};
