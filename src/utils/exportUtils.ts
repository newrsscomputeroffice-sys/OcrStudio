import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import katex from 'katex';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ImageRun,
  AlignmentType,
} from 'docx';

/**
 * Converts any LaTeX mathematical string or snippet into clean,
 * natural, human-readable Unicode mathematical text.
 */
export function latexToReadableMath(tex: string): string {
  if (!tex) return '';
  let s = tex.trim();

  // Strip wrapping $$ or $
  s = s.replace(/^\$\$([\s\S]*?)\$\$$/, '$1').replace(/^\$([\s\S]*?)\$$/, '$1').trim();

  // Replace text macros: \text{...}, \mathrm{...}, \mathbf{...}, \mathit{...}, \operatorname{...}
  s = s.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\s*\{([^}]*)\}/g, '$1');

  // Spacing commands
  s = s.replace(/\\(?:qquad)/g, '    ');
  s = s.replace(/\\(?:quad)/g, '  ');
  s = s.replace(/\\(?:,|;|:)/g, ' ');
  s = s.replace(/\\ /g, ' ');

  // Fractions: recursively or repeatedly handle \frac{num}{den}
  for (let i = 0; i < 4; i++) {
    s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_, n, d) => {
      const num = n.trim();
      const den = d.trim();
      const needsParenNum = /[+\-=]/.test(num) && !num.startsWith('(') && !num.endsWith(')');
      const needsParenDen = /[+\-*/=]/.test(den) && !den.startsWith('(') && !den.endsWith(')');
      return `${needsParenNum ? `(${num})` : num} / ${needsParenDen ? `(${den})` : den}`;
    });
  }

  // Roots: \sqrt[n]{x} or \sqrt{x}
  s = s.replace(/\\sqrt\s*\[([^{}]*)\]\s*\{([^{}]*)\}/g, '$1√($2)');
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)');

  // Common math symbols & operators
  const symbols: [RegExp, string][] = [
    [/\\(?:implies|Rightarrow)/g, '⇒'],
    [/\\(?:impliedby|Leftarrow)/g, '⇐'],
    [/\\(?:iff|Leftrightarrow)/g, '⇔'],
    [/\\(?:rightarrow|to)/g, '→'],
    [/\\(?:leftarrow)/g, '←'],
    [/\\therefore/g, '∴'],
    [/\\because/g, '∵'],
    [/\\pm/g, '±'],
    [/\\mp/g, '∓'],
    [/\\times/g, '×'],
    [/\\div/g, '÷'],
    [/\\cdot/g, '·'],
    [/\\approx/g, '≈'],
    [/\\sim/g, '~'],
    [/\\cong/g, '≅'],
    [/\\(?:neq|ne)/g, '≠'],
    [/\\(?:leq|le)/g, '≤'],
    [/\\(?:geq|ge)/g, '≥'],
    [/\\infty/g, '∞'],
    [/\\triangle\s*/g, '△'],
    [/\\angle/g, '∠'],
    [/\\perp/g, '⊥'],
    [/\\parallel/g, '∥'],
    [/\\degree/g, '°'],
    [/\^\\circ/g, '°'],
    [/\\circ/g, '°'],
    [/\\forall/g, '∀'],
    [/\\exists/g, '∃'],
    [/\\in/g, '∈'],
    [/\\notin/g, '∉'],
    [/\\subset/g, '⊂'],
    [/\\subseteq/g, '⊆'],
    [/\\cup/g, '∪'],
    [/\\cap/g, '∩'],
    // Greek letters
    [/\\alpha/g, 'α'],
    [/\\beta/g, 'β'],
    [/\\gamma/g, 'γ'],
    [/\\Gamma/g, 'Γ'],
    [/\\delta/g, 'δ'],
    [/\\Delta/g, 'Δ'],
    [/\\epsilon/g, 'ε'],
    [/\\theta/g, 'θ'],
    [/\\Theta/g, 'Θ'],
    [/\\lambda/g, 'λ'],
    [/\\Lambda/g, 'Λ'],
    [/\\mu/g, 'μ'],
    [/\\pi/g, 'π'],
    [/\\Pi/g, 'Π'],
    [/\\sigma/g, 'σ'],
    [/\\Sigma/g, 'Σ'],
    [/\\tau/g, 'τ'],
    [/\\phi/g, 'φ'],
    [/\\Phi/g, 'Φ'],
    [/\\omega/g, 'ω'],
    [/\\Omega/g, 'Ω'],
    [/\\eta/g, 'η'],
    [/\\zeta/g, 'ζ'],
    [/\\rho/g, 'ρ'],
  ];

  for (const [regex, rep] of symbols) {
    s = s.replace(regex, rep);
  }

  // Superscripts ^2 -> ², etc.
  const supers: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', 'n': 'ⁿ', 'x': 'ˣ',
  };
  s = s.replace(/\^\{([0-9+\-nx]+)\}/g, (_, p) =>
    p.split('').map((c: string) => supers[c] || c).join('')
  );
  s = s.replace(/\^([0-9+\-nx])/g, (_, p) => supers[p] || p);

  // Subscripts _0 -> ₀, etc.
  const subs: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    'a': 'ₐ', 'e': 'ₑ', 'n': 'ₙ', 'x': 'ₓ',
  };
  s = s.replace(/_\{([0-9aenx]+)\}/g, (_, p) =>
    p.split('').map((c: string) => subs[c] || c).join('')
  );
  s = s.replace(/_([0-9aenx])/g, (_, p) => subs[p] || p);

  // Parentheses & brackets
  s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  s = s.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');
  s = s.replace(/\\left\\\{/g, '{').replace(/\\right\\\}/g, '}');
  s = s.replace(/\\\{/g, '{').replace(/\\\}/g, '}');

  // Remove leftover backslashes and redundant double spaces
  s = s.replace(/\\+/g, '').replace(/[ \t]{2,}/g, ' ').trim();
  return s;
}

/**
 * Sanitizes and extracts clean transcribed text for export,
 * removing any leaked JSON code blocks, metadata wrappers, or boilerplate watermarks.
 */
export function cleanTextForExport(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();

  // Strip code fences: ```markdown ... ``` or ```text ... ```
  // (Do NOT strip ```svg if it contains real SVG graphic markup)
  const codeBlockMatch = cleaned.match(/^```(?:markdown|md|text)?\s*\n([\s\S]*?)\n```$/i);
  if (codeBlockMatch && !codeBlockMatch[1].trim().startsWith('<svg')) {
    cleaned = codeBlockMatch[1].trim();
  }

  // If someone passed raw JSON string like {"job_id":"...", "text":"..."}, extract actual text
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (typeof parsed.markdown === 'string' && parsed.markdown.trim()) {
        return cleanTextForExport(parsed.markdown);
      }
      if (typeof parsed.text === 'string' && parsed.text.trim()) {
        return cleanTextForExport(parsed.text);
      }
      if (typeof parsed.content === 'string' && parsed.content.trim()) {
        return cleanTextForExport(parsed.content);
      }
      if (Array.isArray(parsed.documents)) {
        const parts = parsed.documents
          .map((d: any) => d.markdown || d.text || d.content || '')
          .filter(Boolean);
        if (parts.length > 0) return cleanTextForExport(parts.join('\n\n'));
      }
    } catch {
      // not JSON, keep as text
    }
  }

  // Filter out any artificial boilerplate or leaked placeholder lines
  const lines = cleaned.split('\n');
  const filteredLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip unwanted metadata / watermark / placeholder lines
    if (/^#?\s*Transcription:\s*.+/i.test(trimmed)) continue;
    if (/^Generated on\s+.*\|\s*High-Accuracy Document OCR/i.test(trimmed)) continue;
    if (/^Extracted on\s+.*using High-Accuracy OCR Studio/i.test(trimmed)) continue;
    if (/^=?[Ü\u00dc]?[D\s]*\[Mathematical Diagram\s*\/\s*Geometric Vector Graphic\]/i.test(trimmed)) continue;
    if (/^\[Mathematical Diagram\s*\/\s*Geometric Vector Graphic\]/i.test(trimmed)) continue;
    if (/^\(High-fidelity scalable vector diagram generated for math problem\)/i.test(trimmed)) continue;
    if (/^\(High-accuracy vector geometric SVG generated for math problem.*\)/i.test(trimmed)) continue;
    filteredLines.push(line);
  }

  cleaned = filteredLines.join('\n').trim();
  return cleaned;
}

/**
 * Downloads a Blob as a file with the given name
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Converts an SVG XML string into a clean, high-resolution PNG Data URL via Canvas
 */
export function svgToPngDataUrl(svgString: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      let cleanSvg = svgString.trim();
      // Ensure SVG root has xmlns
      if (!cleanSvg.includes('xmlns="http://www.w3.org/2000/svg"')) {
        cleanSvg = cleanSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      // Extract width & height or viewBox
      let width = 600;
      let height = 380;
      const viewBoxMatch = cleanSvg.match(/viewBox\s*=\s*["']\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*["']/i);
      if (viewBoxMatch) {
        const vbW = parseFloat(viewBoxMatch[3]);
        const vbH = parseFloat(viewBoxMatch[4]);
        if (vbW > 0 && vbH > 0) {
          width = Math.round(vbW * 1.5);
          height = Math.round(vbH * 1.5);
        }
      }

      const blob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          URL.revokeObjectURL(url);
          resolve(dataUrl);
        } else {
          URL.revokeObjectURL(url);
          resolve('');
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('');
      };

      img.src = url;
    } catch {
      resolve('');
    }
  });
}

/**
 * Converts a base64 or DataURL to Uint8Array for docx ImageRun
 */
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(',');
  const base64 = parts.length > 1 ? parts[1] : parts[0];
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Safely renders LaTeX math to HTML string using KaTeX
 */
function renderKatexHtml(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex.trim(), {
      displayMode,
      throwOnError: false,
      output: 'html',
    });
  } catch {
    const readable = latexToReadableMath(tex);
    return `<span style="font-family: 'Cambria Math', serif; color: #0f172a;">${escapeHtml(readable)}</span>`;
  }
}

/**
 * Escapes HTML characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parses inline formatting ($math$, **bold**, *italic*) to HTML string
 */
function renderInlineToHtml(text: string): string {
  if (!text) return '';

  const mathRegex = /(\$[^\$\n]+?\$|\*\*[^*]+?\*\*|\*[^*]+?\*)/g;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result += escapeHtml(text.substring(lastIndex, match.index));
    }

    const token = match[1];
    if (token.startsWith('$') && token.endsWith('$')) {
      const tex = token.slice(1, -1);
      result += renderKatexHtml(tex, false);
    } else if (token.startsWith('**') && token.endsWith('**')) {
      const inner = token.slice(2, -2);
      result += `<strong style="font-weight: 700; color: #0f172a;">${renderInlineToHtml(inner)}</strong>`;
    } else if (token.startsWith('*') && token.endsWith('*')) {
      const inner = token.slice(1, -1);
      result += `<em style="font-style: italic;">${renderInlineToHtml(inner)}</em>`;
    }

    lastIndex = mathRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    result += escapeHtml(text.substring(lastIndex));
  }

  return result;
}

/**
 * Builds clean HTML representation of markdown text with rendered KaTeX formulas & SVGs for PDF export
 */
export function buildHtmlForPdfExport(cleanMarkdown: string): string {
  const lines = cleanMarkdown.split('\n');
  const htmlParts: string[] = [];

  // Mathematical and fraction layout styling overrides for clean PDF export
  htmlParts.push(`
    <style>
      .katex { font-size: 1.05em; line-height: 1.25; text-rendering: geometricPrecision; }
      .katex-display { margin: 0.7em 0 !important; }
      table.pdf-rendered-fraction {
        display: inline-table !important;
        vertical-align: middle !important;
        border-collapse: collapse !important;
        border-spacing: 0 !important;
        margin: 0 0.35em !important;
        padding: 0 !important;
        border: none !important;
        font-size: 0.95em !important;
        line-height: normal !important;
      }
      table.pdf-rendered-fraction tbody,
      table.pdf-rendered-fraction tr {
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      table.pdf-rendered-fraction td.pdf-frac-num {
        border: none !important;
        border-bottom: 2px solid #0f172a !important;
        padding: 2px 6px 7px 6px !important;
        margin: 0 !important;
        text-align: center !important;
        vertical-align: bottom !important;
        line-height: 1.25 !important;
      }
      table.pdf-rendered-fraction td.pdf-frac-den {
        border: none !important;
        padding: 7px 6px 2px 6px !important;
        margin: 0 !important;
        text-align: center !important;
        vertical-align: top !important;
        line-height: 1.25 !important;
      }
    </style>
  `);

  let inSvg = false;
  let svgBuffer: string[] = [];
  let inDisplayMath = false;
  let mathBuffer: string[] = [];
  let inTable = false;
  let tableBuffer: string[] = [];

  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    const contentLines = tableBuffer.filter((l) => !l.match(/^\|?\s*[-:]+[-| :]*$/));
    if (contentLines.length > 0) {
      let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13px; page-break-inside: avoid; break-inside: avoid;">';
      for (let r = 0; r < contentLines.length; r++) {
        const isHeader = r === 0;
        const cells = contentLines[r]
          .split('|')
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1);

        tableHtml += `<tr style="${isHeader ? 'background-color: #f1f5f9; font-weight: 600;' : ''}">`;
        for (const cell of cells) {
          const tag = isHeader ? 'th' : 'td';
          tableHtml += `<${tag} style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left;">${renderInlineToHtml(cell)}</${tag}>`;
        }
        tableHtml += '</tr>';
      }
      tableHtml += '</table>';
      htmlParts.push(tableHtml);
    }
    tableBuffer = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Check SVG block
    if (line.startsWith('```svg') || line.startsWith('```xml') || line.startsWith('<svg')) {
      inSvg = true;
      svgBuffer = [line.replace(/^```(?:svg|xml)?/i, '')];
      if (line.includes('</svg>') || (line.startsWith('```') && line.endsWith('```') && line.length > 6)) {
        inSvg = false;
        const fullSvg = svgBuffer.join('\n').replace(/```/g, '').trim();
        htmlParts.push(
          `<div class="pdf-svg-diagram" style="margin: 18px auto; text-align: center; max-width: 520px; page-break-inside: avoid; break-inside: avoid;">${fullSvg}</div>`
        );
        svgBuffer = [];
      }
      continue;
    }

    if (inSvg) {
      svgBuffer.push(line);
      if (line.includes('</svg>') || line.startsWith('```')) {
        inSvg = false;
        const fullSvg = svgBuffer.join('\n').replace(/```/g, '').trim();
        htmlParts.push(
          `<div class="pdf-svg-diagram" style="margin: 18px auto; text-align: center; max-width: 520px; page-break-inside: avoid; break-inside: avoid;">${fullSvg}</div>`
        );
        svgBuffer = [];
      }
      continue;
    }

    // Check Display Math block ($$...$$)
    if (line.startsWith('$$') && line.endsWith('$$') && line.length > 4) {
      const tex = line.slice(2, -2).trim();
      htmlParts.push(
        `<div style="margin: 10px 0; text-align: center; overflow-x: visible; page-break-inside: avoid; break-inside: avoid;">${renderKatexHtml(tex, true)}</div>`
      );
      continue;
    }

    if (line.startsWith('$$')) {
      inDisplayMath = true;
      mathBuffer = [line.slice(2)];
      continue;
    }

    if (inDisplayMath) {
      if (line.endsWith('$$')) {
        inDisplayMath = false;
        mathBuffer.push(line.slice(0, -2));
        const fullTex = mathBuffer.join('\n').trim();
        htmlParts.push(
          `<div style="margin: 10px 0; text-align: center; overflow-x: visible; page-break-inside: avoid; break-inside: avoid;">${renderKatexHtml(fullTex, true)}</div>`
        );
        mathBuffer = [];
      } else {
        mathBuffer.push(line);
      }
      continue;
    }

    // Check Table
    if (line.startsWith('|') && line.endsWith('|')) {
      inTable = true;
      tableBuffer.push(line);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Headings
    if (line.startsWith('# ')) {
      htmlParts.push(
        `<h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 18px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; page-break-inside: avoid; break-inside: avoid;">${renderInlineToHtml(line.slice(2))}</h1>`
      );
      continue;
    }

    if (line.startsWith('## ')) {
      htmlParts.push(
        `<h2 style="font-size: 16px; font-weight: 700; color: #1e293b; margin: 14px 0 6px; page-break-inside: avoid; break-inside: avoid;">${renderInlineToHtml(line.slice(3))}</h2>`
      );
      continue;
    }

    if (line.startsWith('### ')) {
      htmlParts.push(
        `<h3 style="font-size: 14.5px; font-weight: 600; color: #334155; margin: 10px 0 4px; page-break-inside: avoid; break-inside: avoid;">${renderInlineToHtml(line.slice(4))}</h3>`
      );
      continue;
    }

    // Bullet points
    if (line.startsWith('- ') || line.startsWith('* ')) {
      htmlParts.push(
        `<div style="margin: 4px 0 4px 16px; display: flex; align-items: baseline;"><span style="margin-right: 8px; font-size: 15px; color: #64748b;">•</span><div>${renderInlineToHtml(line.slice(2))}</div></div>`
      );
      continue;
    }

    // Numbered lists
    const numMatch = line.match(/^(\d+\.)\s+(.+)$/);
    if (numMatch) {
      htmlParts.push(
        `<div style="margin: 4px 0 4px 16px; display: flex; align-items: baseline;"><span style="margin-right: 8px; font-weight: 600; color: #0f172a;">${numMatch[1]}</span><div>${renderInlineToHtml(numMatch[2])}</div></div>`
      );
      continue;
    }

    // Blank line
    if (!line) {
      htmlParts.push('<div style="height: 8px;"></div>');
      continue;
    }

    // If line has standalone LaTeX commands (like \Rightarrow, \frac, \text{}), render as clean math
    if (
      /\\(?:frac|sqrt|Rightarrow|implies|therefore|because|triangle|quad|alpha|beta|theta|pi|pm)/.test(line) &&
      !line.includes('$')
    ) {
      const rendered = renderKatexHtml(line, true);
      htmlParts.push(
        `<div style="margin: 8px 0; text-align: center; page-break-inside: avoid; break-inside: avoid;">${rendered}</div>`
      );
      continue;
    }

    // Standard paragraph
    htmlParts.push(
      `<p style="margin: 5px 0; font-size: 14px; line-height: 1.65; color: #1e293b;">${renderInlineToHtml(line)}</p>`
    );
  }

  if (inTable && tableBuffer.length > 0) {
    flushTable();
  }

  return htmlParts.join('\n');
}

/**
 * Post-processes KaTeX HTML inside the PDF render container to normalize all fractions.
 * KaTeX's default .mfrac structure uses complex inline-table/vlist structures with negative em offsets
 * and zero-height spans that html2canvas misinterprets, causing the fraction dividing line to overlap
 * or intersect the numerator.
 *
 * This function replaces every .mfrac with an inline-table structure containing:
 * - Row 1: Numerator cell (centered, with 7px bottom padding and crisp 2px solid bottom border)
 * - Row 2: Denominator cell (centered, with 7px top padding)
 *
 * This guarantees the dividing line is drawn precisely by the browser & html2canvas layout engine
 * with ample breathing space, completely eliminating any overlap or misalignment in PDF downloads.
 */
export function fixFractionsForPdf(container: HTMLElement) {
  // Find all .frac-line elements in reverse order so inner/nested fractions are resolved first
  const fracLines = Array.from(container.querySelectorAll<HTMLElement>('.frac-line')).reverse();

  for (const fracLine of fracLines) {
    const lineSpan = fracLine.parentElement;
    if (!lineSpan) continue;

    const denSpan = lineSpan.previousElementSibling as HTMLElement | null;
    const numSpan = lineSpan.nextElementSibling as HTMLElement | null;

    if (!denSpan || !numSpan) continue;

    const mfrac = fracLine.closest('.mfrac') as HTMLElement | null;
    if (!mfrac) continue;

    // Clone numerator and denominator
    const numClone = numSpan.cloneNode(true) as HTMLElement;
    const denClone = denSpan.cloneNode(true) as HTMLElement;

    // Remove any pstrut spacer elements
    numClone.querySelectorAll('.pstrut').forEach((el) => el.remove());
    denClone.querySelectorAll('.pstrut').forEach((el) => el.remove());

    // Reset layout styles on cloned top-level containers
    numClone.removeAttribute('style');
    denClone.removeAttribute('style');

    // Create a robust, high-fidelity table fraction
    const cleanFrac = document.createElement('table');
    cleanFrac.className = 'pdf-rendered-fraction';
    cleanFrac.style.display = 'inline-table';
    cleanFrac.style.verticalAlign = 'middle';
    cleanFrac.style.borderCollapse = 'collapse';
    cleanFrac.style.borderSpacing = '0';
    cleanFrac.style.margin = '0 0.35em';
    cleanFrac.style.padding = '0';
    cleanFrac.style.border = 'none';
    cleanFrac.style.fontSize = '0.95em';
    cleanFrac.style.textAlign = 'center';
    cleanFrac.style.lineHeight = 'normal';

    const tbody = document.createElement('tbody');
    tbody.style.border = 'none';
    tbody.style.padding = '0';
    tbody.style.margin = '0';

    // Row 1: Numerator with clear border-bottom division line
    const trNum = document.createElement('tr');
    trNum.style.border = 'none';
    trNum.style.padding = '0';
    trNum.style.margin = '0';

    const tdNum = document.createElement('td');
    tdNum.className = 'pdf-frac-num';
    tdNum.style.border = 'none';
    tdNum.style.borderBottom = '2px solid #0f172a';
    tdNum.style.padding = '2px 6px 7px 6px'; // 7px bottom padding guarantees dividing line NEVER touches text
    tdNum.style.margin = '0';
    tdNum.style.textAlign = 'center';
    tdNum.style.verticalAlign = 'bottom';
    tdNum.style.lineHeight = '1.25';
    tdNum.innerHTML = numClone.innerHTML;

    // Row 2: Denominator
    const trDen = document.createElement('tr');
    trDen.style.border = 'none';
    trDen.style.padding = '0';
    trDen.style.margin = '0';

    const tdDen = document.createElement('td');
    tdDen.className = 'pdf-frac-den';
    tdDen.style.border = 'none';
    tdDen.style.padding = '7px 6px 2px 6px'; // 7px top padding guarantees dividing line NEVER touches text
    tdDen.style.margin = '0';
    tdDen.style.textAlign = 'center';
    tdDen.style.verticalAlign = 'top';
    tdDen.style.lineHeight = '1.25';
    tdDen.innerHTML = denClone.innerHTML;

    trNum.appendChild(tdNum);
    trDen.appendChild(tdDen);
    tbody.appendChild(trNum);
    tbody.appendChild(trDen);
    cleanFrac.appendChild(tbody);

    // Replace the problematic KaTeX mfrac with the clean table fraction
    mfrac.replaceWith(cleanFrac);
  }
}

/**
 * Exports transcribed content to PDF with 100% clean formatting,
 * rendering math formulas via KaTeX and geometric figures via SVG without raw code or boilerplate.
 */
export async function exportToPdf(markdownText: string, _title = '', filename = 'document.pdf') {
  const cleanMarkdown = cleanTextForExport(markdownText);
  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  if (!cleanMarkdown) {
    const emptyDoc = new jsPDF();
    emptyDoc.save(cleanFilename);
    return;
  }

  // 1. Initial measurement container in the DOM to parse HTML and render KaTeX & fractions
  const measureContainer = document.createElement('div');
  measureContainer.id = 'pdf-export-measure-container';
  measureContainer.style.position = 'fixed';
  measureContainer.style.left = '0';
  measureContainer.style.top = '0';
  measureContainer.style.zIndex = '-9999';
  measureContainer.style.pointerEvents = 'none';
  measureContainer.style.width = '794px'; // A4 width at 96 DPI
  measureContainer.style.boxSizing = 'border-box';
  measureContainer.style.padding = '44px 44px 50px 44px';
  measureContainer.style.backgroundColor = '#ffffff';
  measureContainer.style.color = '#0f172a';
  measureContainer.style.fontFamily =
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  measureContainer.style.fontSize = '14px';
  measureContainer.style.lineHeight = '1.7';
  measureContainer.style.wordBreak = 'break-word';

  measureContainer.innerHTML = buildHtmlForPdfExport(cleanMarkdown);
  document.body.appendChild(measureContainer);

  // Extract <style> block so all pages share styles
  const styleEl = measureContainer.querySelector('style');
  const styleHtml = styleEl ? styleEl.outerHTML : '';
  if (styleEl) {
    styleEl.remove();
  }

  // Normalize all KaTeX fractions for 100% precision in PDF
  fixFractionsForPdf(measureContainer);

  // Wait for all web fonts & KaTeX fonts to be fully rendered
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // continue
    }
  }
  // Brief layout settlement pause
  await new Promise((resolve) => setTimeout(resolve, 80));

  let pageRenderContainer: HTMLElement | null = null;
  let testPage: HTMLElement | null = null;

  try {
    // 2. Intelligent Page Segmentation: Measure content blocks and split into discrete A4 pages
    // Printable height = 1123px (A4) - 44px (top) - 50px (bottom) = 1029px.
    // We cap content height at 1085px to guarantee clean whitespace above footer page numbers and zero cut-off.
    const MAX_PAGE_CONTENT_HEIGHT = 1085;

    testPage = document.createElement('div');
    testPage.id = 'pdf-test-page';
    testPage.style.position = 'fixed';
    testPage.style.left = '0';
    testPage.style.top = '0';
    testPage.style.zIndex = '-9999';
    testPage.style.pointerEvents = 'none';
    testPage.style.width = '794px';
    testPage.style.boxSizing = 'border-box';
    testPage.style.padding = '44px 44px 50px 44px';
    testPage.style.fontFamily =
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    testPage.style.fontSize = '14px';
    testPage.style.lineHeight = '1.7';
    document.body.appendChild(testPage);

    const rawChildren = Array.from(measureContainer.children) as HTMLElement[];
    const pagesBlocks: HTMLElement[][] = [];
    let currentBlocks: HTMLElement[] = [];

    for (let i = 0; i < rawChildren.length; i++) {
      const el = rawChildren[i];
      testPage.appendChild(el);

      if (testPage.offsetHeight > MAX_PAGE_CONTENT_HEIGHT && currentBlocks.length > 0) {
        // Check if current block is an options list / sub-part of the immediately preceding question
        const isOptions = /^\s*(\([a-di-iv1-4]\)|\[[a-di-iv1-4]\])/i.test(el.innerText || '');
        const prevBlock = currentBlocks[currentBlocks.length - 1];
        const prevIsQuestion = prevBlock && /^\s*(\([क-हa-z0-9]+\)|\d+\.)/i.test(prevBlock.innerText || '');
        const prevIsHeading = prevBlock && /^H[1-6]$/i.test(prevBlock.tagName);

        if ((isOptions && prevIsQuestion || prevIsHeading) && currentBlocks.length > 1) {
          // Move both the previous item and current item to the next page to prevent orphan questions/headings
          testPage.removeChild(el);
          testPage.removeChild(prevBlock);
          currentBlocks.pop();

          pagesBlocks.push(currentBlocks);

          currentBlocks = [prevBlock, el];
          testPage.innerHTML = '';
          testPage.appendChild(prevBlock);
          testPage.appendChild(el);
        } else {
          // Standard overflow: move this block to next page
          testPage.removeChild(el);
          pagesBlocks.push(currentBlocks);

          currentBlocks = [el];
          testPage.innerHTML = '';
          testPage.appendChild(el);
        }
      } else {
        currentBlocks.push(el);
      }
    }

    if (currentBlocks.length > 0) {
      pagesBlocks.push(currentBlocks);
    }

    // Clean up temporary measurement DOM
    if (document.body.contains(testPage)) {
      document.body.removeChild(testPage);
      testPage = null;
    }
    if (document.body.contains(measureContainer)) {
      document.body.removeChild(measureContainer);
    }

    // 3. Render Each A4 Page Individually with 100% Crispness & Zero Text Slicing
    const totalPages = pagesBlocks.length;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    const pdfWidth = 210;
    const pdfHeight = 297;

    pageRenderContainer = document.createElement('div');
    pageRenderContainer.id = 'pdf-page-render-container';
    pageRenderContainer.style.position = 'fixed';
    pageRenderContainer.style.left = '0';
    pageRenderContainer.style.top = '0';
    pageRenderContainer.style.zIndex = '-9999';
    pageRenderContainer.style.pointerEvents = 'none';
    pageRenderContainer.style.width = '794px';
    pageRenderContainer.style.height = '1123px';
    pageRenderContainer.style.boxSizing = 'border-box';
    pageRenderContainer.style.padding = '44px 44px 50px 44px';
    pageRenderContainer.style.backgroundColor = '#ffffff';
    pageRenderContainer.style.color = '#0f172a';
    pageRenderContainer.style.fontFamily =
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    pageRenderContainer.style.fontSize = '14px';
    pageRenderContainer.style.lineHeight = '1.7';
    pageRenderContainer.style.wordBreak = 'break-word';
    pageRenderContainer.style.overflow = 'hidden';
    document.body.appendChild(pageRenderContainer);

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      pageRenderContainer.innerHTML = styleHtml;

      const blocks = pagesBlocks[pageIdx];
      for (const block of blocks) {
        pageRenderContainer.appendChild(block);
      }

      // Add clean page number footer
      const footer = document.createElement('div');
      footer.style.position = 'absolute';
      footer.style.bottom = '18px';
      footer.style.right = '44px';
      footer.style.fontSize = '10px';
      footer.style.color = '#94a3b8';
      footer.style.fontFamily =
        'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      footer.innerText = `Page ${pageIdx + 1} of ${totalPages}`;
      pageRenderContainer.appendChild(footer);

      // Layout settlement before rasterization
      await new Promise((resolve) => setTimeout(resolve, 50));

      const pageCanvas = await html2canvas(pageRenderContainer, {
        scale: 2, // 2x high resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123,
        windowWidth: 794,
        scrollX: 0,
        scrollY: 0,
      });

      if (pageIdx > 0) {
        doc.addPage();
      }

      const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
      doc.addImage(pageImgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }

    doc.save(cleanFilename);
  } catch (err) {
    console.error('HTML-based PDF generation error; falling back to direct text PDF:', err);
    // Robust text-based fallback
    fallbackTextPdf(cleanMarkdown, cleanFilename);
  } finally {
    if (document.body.contains(measureContainer)) {
      document.body.removeChild(measureContainer);
    }
    if (testPage && document.body.contains(testPage)) {
      document.body.removeChild(testPage);
    }
    if (pageRenderContainer && document.body.contains(pageRenderContainer)) {
      document.body.removeChild(pageRenderContainer);
    }
  }
}

/**
 * Fallback PDF generator using standard text & clean math symbols
 */
function fallbackTextPdf(cleanMarkdown: string, filename: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const maxLineWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const lines = cleanMarkdown.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      cursorY += 4;
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      cursorY += 4;
      if (cursorY > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      const heading = latexToReadableMath(line.replace(/^#\s+/, ''));
      const wrapped = doc.splitTextToSize(heading, maxLineWidth);
      doc.text(wrapped, margin, cursorY);
      cursorY += wrapped.length * 6 + 2;
      continue;
    }

    // Formulas
    if (line.startsWith('$$') || line.endsWith('$$')) {
      cursorY += 2;
      if (cursorY > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
      const formulaClean = latexToReadableMath(line);
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(formulaClean, margin + 6, cursorY + 4);
      cursorY += 8;
      continue;
    }

    // Standard wrapped lines
    const readable = latexToReadableMath(line).replace(/\*\*/g, '');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    const wrapped = doc.splitTextToSize(readable, maxLineWidth);
    for (const wLine of wrapped) {
      if (cursorY > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
      doc.text(wLine, margin, cursorY);
      cursorY += 5.2;
    }
  }

  doc.save(filename);
}

/**
 * Parses inline string into docx TextRun array with math, bold, and normal styles
 */
function parseInlineToDocxRuns(text: string): TextRun[] {
  if (!text) return [];
  const runs: TextRun[] = [];

  const tokenRegex = /(\$[^\$\n]+?\$|\*\*[^*]+?\*\*|\*[^*]+?\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(
        new TextRun({
          text: text.substring(lastIndex, match.index),
          size: 22, // 11pt
          font: 'Calibri',
        })
      );
    }

    const token = match[1];
    if (token.startsWith('$') && token.endsWith('$')) {
      const formula = token.slice(1, -1);
      const readable = latexToReadableMath(formula);
      runs.push(
        new TextRun({
          text: readable,
          font: 'Cambria Math',
          size: 22,
          color: '0F172A',
        })
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      runs.push(
        new TextRun({
          text: token.slice(2, -2),
          bold: true,
          size: 22,
          font: 'Calibri',
          color: '0F172A',
        })
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      runs.push(
        new TextRun({
          text: token.slice(1, -1),
          italics: true,
          size: 22,
          font: 'Calibri',
        })
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    runs.push(
      new TextRun({
        text: text.substring(lastIndex),
        size: 22,
        font: 'Calibri',
      })
    );
  }

  return runs;
}

/**
 * Parses markdown tables into docx Table with inline math and bold styling
 */
function parseMarkdownTableToDocx(tableLines: string[]): Table | null {
  try {
    const rows: TableRow[] = [];
    const contentLines = tableLines.filter((l) => !l.match(/^\|?\s*[-:]+[-| :]*$/));

    for (let rowIndex = 0; rowIndex < contentLines.length; rowIndex++) {
      const line = contentLines[rowIndex];
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter((c, idx, arr) => {
          if (idx === 0 && c === '') return false;
          if (idx === arr.length - 1 && c === '') return false;
          return true;
        });

      if (cells.length === 0) continue;

      const isHeader = rowIndex === 0;
      const tableCells = cells.map((cellText) => {
        const runs = parseInlineToDocxRuns(cellText);
        if (isHeader) {
          for (const r of runs) {
            (r as any).bold = true;
          }
        }
        return new TableCell({
          children: [
            new Paragraph({
              children: runs.length > 0 ? runs : [new TextRun({ text: cellText, bold: isHeader })],
            }),
          ],
          shading: isHeader ? { fill: 'F1F5F9' } : undefined,
        });
      });

      rows.push(new TableRow({ children: tableCells }));
    }

    if (rows.length === 0) return null;

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows,
    });
  } catch (err) {
    console.warn('Could not parse table for docx:', err);
    return null;
  }
}

/**
 * Export text to Microsoft Word (.docx) format with authentic Microsoft Office Math
 * formulas (OMML), real vector diagram images, and zero raw code or artificial metadata headers.
 */
export async function exportToDocx(
  markdownText: string,
  title = '',
  filename = 'document.docx'
) {
  const cleanMarkdown = cleanTextForExport(markdownText);
  const cleanFilename = filename.endsWith('.docx') ? filename : `${filename}.docx`;

  // 1. Try server-side native OMML Word equation generation
  try {
    const diagramImages: Record<string, string> = {};
    const svgMatches = cleanMarkdown.match(/```(?:svg|xml)?[\s\S]*?```|<svg[\s\S]*?<\/svg>/gi) || [];
    for (let i = 0; i < svgMatches.length; i++) {
      const rawSvg = svgMatches[i].replace(/^```(?:svg|xml)?/i, '').replace(/```$/i, '').trim();
      const pngData = await svgToPngDataUrl(rawSvg);
      if (pngData) {
        diagramImages[`svg_${i}`] = pngData;
        diagramImages[String(i)] = pngData;
      }
    }

    const response = await fetch('/api/export-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        markdown: cleanMarkdown,
        title,
        filename: cleanFilename,
        diagramImages,
      }),
    });

    if (response.ok) {
      const blob = await response.blob();
      downloadBlob(blob, cleanFilename);
      return;
    }
  } catch (serverErr) {
    console.warn('Server-side OMML DOCX export unavailable; using client fallback:', serverErr);
  }

  // 2. Client-side fallback
  const children: (Paragraph | Table)[] = [];

  const lines = cleanMarkdown.split('\n');
  let inTable = false;
  let tableBuffer: string[] = [];
  let inDocxSvg = false;
  let svgBuffer: string[] = [];
  let inDocxMath = false;
  let mathBuffer: string[] = [];

  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    const table = parseMarkdownTableToDocx(tableBuffer);
    if (table) children.push(table);
    tableBuffer = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Check SVG block
    if (line.startsWith('```svg') || line.startsWith('```xml') || line.startsWith('<svg')) {
      inDocxSvg = true;
      svgBuffer = [line.replace(/^```(?:svg|xml)?/i, '')];
      if (line.includes('</svg>') || (line.startsWith('```') && line.endsWith('```') && line.length > 6)) {
        inDocxSvg = false;
        const fullSvg = svgBuffer.join('\n').replace(/```/g, '').trim();
        const pngDataUrl = await svgToPngDataUrl(fullSvg);
        if (pngDataUrl) {
          const imageBytes = dataUrlToUint8Array(pngDataUrl);
          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageBytes,
                  transformation: { width: 440, height: 280 },
                  type: 'png',
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 },
            })
          );
        }
        svgBuffer = [];
      }
      continue;
    }

    if (inDocxSvg) {
      svgBuffer.push(line);
      if (line.includes('</svg>') || line.startsWith('```')) {
        inDocxSvg = false;
        const fullSvg = svgBuffer.join('\n').replace(/```/g, '').trim();
        const pngDataUrl = await svgToPngDataUrl(fullSvg);
        if (pngDataUrl) {
          const imageBytes = dataUrlToUint8Array(pngDataUrl);
          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageBytes,
                  transformation: { width: 440, height: 280 },
                  type: 'png',
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 },
            })
          );
        }
        svgBuffer = [];
      }
      continue;
    }

    // Display Math block ($$...$$)
    if (line.startsWith('$$') && line.endsWith('$$') && line.length > 4) {
      const tex = line.slice(2, -2).trim();
      const readable = latexToReadableMath(tex);
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: readable,
              font: 'Cambria Math',
              size: 24, // 12pt
              color: '0F172A',
            }),
          ],
          indent: { left: 400 },
          spacing: { before: 120, after: 120 },
        })
      );
      continue;
    }

    if (line.startsWith('$$')) {
      inDocxMath = true;
      mathBuffer = [line.slice(2)];
      continue;
    }

    if (inDocxMath) {
      if (line.endsWith('$$')) {
        inDocxMath = false;
        mathBuffer.push(line.slice(0, -2));
        const fullTex = mathBuffer.join('\n').trim();
        const readable = latexToReadableMath(fullTex);
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: readable,
                font: 'Cambria Math',
                size: 24,
                color: '0F172A',
              }),
            ],
            indent: { left: 400 },
            spacing: { before: 120, after: 120 },
          })
        );
        mathBuffer = [];
      } else {
        mathBuffer.push(line);
      }
      continue;
    }

    // Table detection
    if (line.startsWith('|') && line.endsWith('|')) {
      inTable = true;
      tableBuffer.push(line);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Headings
    if (line.startsWith('# ')) {
      const headingRuns = parseInlineToDocxRuns(line.replace(/^#\s+/, ''));
      children.push(
        new Paragraph({
          children: headingRuns,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        })
      );
      continue;
    }

    if (line.startsWith('## ')) {
      const headingRuns = parseInlineToDocxRuns(line.replace(/^##\s+/, ''));
      children.push(
        new Paragraph({
          children: headingRuns,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      continue;
    }

    if (line.startsWith('### ')) {
      const headingRuns = parseInlineToDocxRuns(line.replace(/^###\s+/, ''));
      children.push(
        new Paragraph({
          children: headingRuns,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
        })
      );
      continue;
    }

    // Bullet points
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const runs = parseInlineToDocxRuns(line.replace(/^[-*]\s+/, ''));
      children.push(
        new Paragraph({
          children: runs,
          bullet: { level: 0 },
          spacing: { after: 80 },
        })
      );
      continue;
    }

    // Numbered list
    const numMatch = line.match(/^(\d+\.)\s+(.+)$/);
    if (numMatch) {
      const runs = parseInlineToDocxRuns(numMatch[2]);
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${numMatch[1]} `, bold: true, size: 22, font: 'Calibri' }),
            ...runs,
          ],
          spacing: { after: 100 },
        })
      );
      continue;
    }

    // Empty line
    if (!line) {
      children.push(new Paragraph({ text: '', spacing: { after: 80 } }));
      continue;
    }

    // If line has standalone math commands without $, convert to readable math run
    if (
      /\\(?:frac|sqrt|Rightarrow|implies|therefore|because|triangle|quad|alpha|beta|theta|pi|pm)/.test(line) &&
      !line.includes('$')
    ) {
      const readable = latexToReadableMath(line);
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: readable,
              font: 'Cambria Math',
              size: 24,
              color: '0F172A',
            }),
          ],
          indent: { left: 400 },
          spacing: { before: 80, after: 80 },
        })
      );
      continue;
    }

    // Standard paragraph with parsed inline math & bold
    const runs = parseInlineToDocxRuns(line);
    children.push(
      new Paragraph({
        children: runs,
        spacing: { after: 120 },
      })
    );
  }

  if (inTable && tableBuffer.length > 0) {
    flushTable();
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, cleanFilename);
}

/**
 * Export text to plain text file (.txt) with clean readable mathematical symbols
 */
export function exportToTxt(text: string, filename: string) {
  const clean = cleanTextForExport(text);
  // Convert any LaTeX to clean readable math text
  const readable = clean
    .split('\n')
    .map((l) => latexToReadableMath(l).replace(/\*\*/g, '').replace(/#+\s*/g, ''))
    .join('\n');
  const blob = new Blob([readable], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, filename.endsWith('.txt') ? filename : `${filename}.txt`);
}

/**
 * Export text to Markdown file (.md)
 */
export function exportToMarkdown(markdown: string, filename: string) {
  const clean = cleanTextForExport(markdown);
  const blob = new Blob([clean], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, filename.endsWith('.md') ? filename : `${filename}.md`);
}

