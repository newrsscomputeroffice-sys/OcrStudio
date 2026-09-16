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
  ImportedXmlComponent,
  PageBreak,
} from 'docx';
import { latexToOMML } from 'latex-to-omml';

/**
 * Fallback converter: converts LaTeX snippets to clean Unicode mathematical text
 * in case a particular equation is malformed or cannot be parsed by OMML.
 */
function latexToReadableUnicode(tex: string): string {
  if (!tex) return '';
  let s = tex.trim();
  s = s.replace(/^\$\$([\s\S]*?)\$\$$/, '$1').replace(/^\$([\s\S]*?)\$$/, '$1').trim();
  s = s.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\s*\{([^}]*)\}/g, '$1');
  s = s.replace(/\\(?:qquad)/g, '    ').replace(/\\(?:quad)/g, '  ').replace(/\\(?:,|;|:)/g, ' ').replace(/\\ /g, ' ');

  for (let i = 0; i < 4; i++) {
    s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_, n, d) => {
      const num = n.trim();
      const den = d.trim();
      const needsParenNum = /[+\-=]/.test(num) && !num.startsWith('(') && !num.endsWith(')');
      const needsParenDen = /[+\-*/=]/.test(den) && !den.startsWith('(') && !den.endsWith(')');
      return `${needsParenNum ? `(${num})` : num} / ${needsParenDen ? `(${den})` : den}`;
    });
  }

  s = s.replace(/\\sqrt\s*\[([^{}]*)\]\s*\{([^{}]*)\}/g, '$1√($2)');
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)');

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
    [/\\cong/g, '≅'],
    [/\\(?:neq|ne)/g, '≠'],
    [/\\(?:leq|le)/g, '≤'],
    [/\\(?:geq|ge)/g, '≥'],
    [/\\infty/g, '∞'],
    [/\\triangle\s*/g, '△'],
    [/\\angle/g, '∠'],
    [/\\alpha/g, 'α'],
    [/\\beta/g, 'β'],
    [/\\gamma/g, 'γ'],
    [/\\delta/g, 'δ'],
    [/\\theta/g, 'θ'],
    [/\\lambda/g, 'λ'],
    [/\\mu/g, 'μ'],
    [/\\pi/g, 'π'],
    [/\\sigma/g, 'σ'],
    [/\\tau/g, 'τ'],
    [/\\phi/g, 'φ'],
    [/\\omega/g, 'ω'],
  ];

  for (const [regex, rep] of symbols) {
    s = s.replace(regex, rep);
  }

  const supers: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', 'n': 'ⁿ', 'x': 'ˣ',
  };
  s = s.replace(/\^\{([0-9+\-nx]+)\}/g, (_, p) =>
    p.split('').map((c: string) => supers[c] || c).join('')
  );
  s = s.replace(/\^([0-9+\-nx])/g, (_, p) => supers[p] || p);

  const subs: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    'a': 'ₐ', 'e': 'ₑ', 'n': 'ₙ', 'x': 'ₓ',
  };
  s = s.replace(/_\{([0-9aenx]+)\}/g, (_, p) =>
    p.split('').map((c: string) => subs[c] || c).join('')
  );
  s = s.replace(/_([0-9aenx])/g, (_, p) => subs[p] || p);

  s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  s = s.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');
  s = s.replace(/\\+/g, '').replace(/[ \t]{2,}/g, ' ').trim();
  return s;
}

/**
 * Converts a LaTeX formula into an authentic Word OMML (Office Math) XML component.
 */
async function latexToDocxMathComponent(latex: string, displayMode = false): Promise<any> {
  const cleanLatex = latex.trim();
  if (!cleanLatex) return null;

  try {
    const ommlString = await latexToOMML(cleanLatex, { displayMode });
    if (ommlString && ommlString.includes('<m:oMath')) {
      const comp = ImportedXmlComponent.fromXmlString(ommlString);
      return (comp as any).root?.[0] || comp;
    }
  } catch (err: any) {
    console.warn(`[OMML Converter] LaTeX conversion error for "${cleanLatex}":`, err?.message || err);
  }

  // Graceful fallback to clean Unicode mathematical text
  const unicodeMath = latexToReadableUnicode(cleanLatex);
  return new TextRun({
    text: unicodeMath,
    font: 'Cambria Math',
    size: 24, // 12pt
    italics: true,
  });
}

/**
 * Parses inline text for LaTeX math ($...$ or $$...$$), bold (**...**), and italics (*...*).
 * Converts LaTeX formulas to native Microsoft Word OMML equations.
 */
async function processInlineForDocx(text: string): Promise<any[]> {
  if (!text) return [];

  // Match both block math ($$...$$), inline math ($...$), bold (**...**), and italics (*...*)
  const pattern = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$|\*\*[^*]+?\*\*|\*[^*]+?\*)/g;
  const children: any[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const preText = text.substring(lastIndex, match.index);
      if (preText) {
        children.push(
          new TextRun({
            text: preText,
            size: 24, // 12pt in Word
            font: 'Calibri',
          })
        );
      }
    }

    const token = match[1];

    if (token.startsWith('$') && token.endsWith('$')) {
      let latex = token;
      let isDisplay = false;
      if (latex.startsWith('$$') && latex.endsWith('$$')) {
        latex = latex.substring(2, latex.length - 2);
        isDisplay = true;
      } else {
        latex = latex.substring(1, latex.length - 1);
      }

      const mathComponent = await latexToDocxMathComponent(latex, isDisplay);
      if (mathComponent) {
        children.push(mathComponent);
      }
    } else if (token.startsWith('**') && token.endsWith('**')) {
      children.push(
        new TextRun({
          text: token.slice(2, -2),
          bold: true,
          size: 24,
          font: 'Calibri',
        })
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      children.push(
        new TextRun({
          text: token.slice(1, -1),
          italics: true,
          size: 24,
          font: 'Calibri',
        })
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    const postText = text.substring(lastIndex);
    if (postText) {
      children.push(
        new TextRun({
          text: postText,
          size: 24,
          font: 'Calibri',
        })
      );
    }
  }

  return children;
}

/**
 * Parses markdown table lines into a Word Table component with inline math support.
 */
async function parseMarkdownTableToDocx(tableLines: string[]): Promise<Table | null> {
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
      const tableCells: TableCell[] = [];

      for (const cellText of cells) {
        const runs = await processInlineForDocx(cellText);
        if (isHeader) {
          for (const r of runs) {
            if (r instanceof TextRun) {
              (r as any).bold = true;
            }
          }
        }

        tableCells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: runs.length > 0 ? runs : [new TextRun({ text: cellText, bold: isHeader, size: 22 })],
                spacing: { before: 80, after: 80 },
              }),
            ],
            shading: isHeader ? { fill: 'F1F5F9' } : undefined,
          })
        );
      }

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
 * Converts a base64 or DataURL string to a Buffer for ImageRun.
 */
function dataUrlToBuffer(dataUrl: string): Buffer {
  const parts = dataUrl.split(',');
  const base64 = parts.length > 1 ? parts[1] : parts[0];
  return Buffer.from(base64, 'base64');
}

/**
 * Main function: Generates a high-quality Microsoft Word (.docx) file buffer
 * from OCR text, transforming all LaTeX mathematical formulas into native Word equation objects (OMML).
 */
export async function generateDocxFromOCR(
  content: string,
  options?: {
    title?: string;
    diagramImages?: Record<string, string>; // base64 or data URLs for SVG diagrams
  }
): Promise<Buffer> {
  const lines = content.split('\n');
  const docChildren: (Paragraph | Table)[] = [];

  let inTable = false;
  let tableBuffer: string[] = [];
  let inDisplayMath = false;
  let mathBuffer: string[] = [];
  let inSvg = false;
  let svgIndex = 0;

  const flushTable = async () => {
    if (tableBuffer.length === 0) return;
    const table = await parseMarkdownTableToDocx(tableBuffer);
    if (table) docChildren.push(table);
    tableBuffer = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check SVG block
    if (trimmed.startsWith('```svg') || trimmed.startsWith('```xml') || trimmed.startsWith('<svg')) {
      inSvg = true;
      if (trimmed.includes('</svg>') || (trimmed.startsWith('```') && trimmed.endsWith('```') && trimmed.length > 6)) {
        inSvg = false;
        // Check if pre-rendered diagram image was supplied
        const diagramKey = `svg_${svgIndex++}`;
        const imgData = options?.diagramImages?.[diagramKey] || options?.diagramImages?.[String(svgIndex - 1)];
        if (imgData) {
          try {
            const buf = dataUrlToBuffer(imgData);
            docChildren.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: buf,
                    transformation: { width: 440, height: 280 },
                    type: 'png',
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 200 },
              })
            );
          } catch (e) {
            console.warn('Failed to embed diagram image in docx:', e);
          }
        }
      }
      continue;
    }

    if (inSvg) {
      if (trimmed.includes('</svg>') || trimmed.startsWith('```')) {
        inSvg = false;
        const diagramKey = `svg_${svgIndex++}`;
        const imgData = options?.diagramImages?.[diagramKey] || options?.diagramImages?.[String(svgIndex - 1)];
        if (imgData) {
          try {
            const buf = dataUrlToBuffer(imgData);
            docChildren.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: buf,
                    transformation: { width: 440, height: 280 },
                    type: 'png',
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 200 },
              })
            );
          } catch (e) {
            console.warn('Failed to embed diagram image in docx:', e);
          }
        }
      }
      continue;
    }

    // Display Math block ($$...$$)
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
      if (inTable) await flushTable();
      const latex = trimmed.slice(2, -2).trim();
      const mathComp = await latexToDocxMathComponent(latex, true);
      if (mathComp) {
        docChildren.push(
          new Paragraph({
            children: [mathComp],
            alignment: AlignmentType.CENTER,
            spacing: { before: 140, after: 140 },
          })
        );
      }
      continue;
    }

    if (trimmed.startsWith('$$')) {
      if (inTable) await flushTable();
      inDisplayMath = true;
      mathBuffer = [trimmed.slice(2)];
      continue;
    }

    if (inDisplayMath) {
      if (trimmed.endsWith('$$')) {
        inDisplayMath = false;
        mathBuffer.push(trimmed.slice(0, -2));
        const fullTex = mathBuffer.join('\n').trim();
        const mathComp = await latexToDocxMathComponent(fullTex, true);
        if (mathComp) {
          docChildren.push(
            new Paragraph({
              children: [mathComp],
              alignment: AlignmentType.CENTER,
              spacing: { before: 140, after: 140 },
            })
          );
        }
        mathBuffer = [];
      } else {
        mathBuffer.push(trimmed);
      }
      continue;
    }

    // Table detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      tableBuffer.push(trimmed);
      continue;
    } else if (inTable) {
      await flushTable();
    }

    // Skip empty lines
    if (!trimmed) {
      docChildren.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      continue;
    }

    // Check Question / Heading (Q1., Q., Question 1:, #, ##, ###)
    const isQuestionOrHeading =
      trimmed.startsWith('Q.') ||
      trimmed.startsWith('#') ||
      /^Q\d+\.?\s/i.test(trimmed) ||
      /^Question\s*\d+[:.]/i.test(trimmed);

    if (isQuestionOrHeading) {
      const cleanHeading = trimmed.replace(/^#+\s*/, '');
      const children = await processInlineForDocx(cleanHeading);
      docChildren.push(
        new Paragraph({
          children,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );
      continue;
    }

    // Solution line
    if (trimmed.startsWith('Solution:') || trimmed.startsWith('**Solution:**')) {
      const remainder = trimmed.replace(/^\*\*?Solution:\*\*?\s*/i, '');
      const solutionChildren: any[] = [
        new TextRun({
          text: 'Solution:',
          bold: true,
          size: 24,
          font: 'Calibri',
          color: '1E293B',
        }),
      ];

      if (remainder.trim()) {
        const restRuns = await processInlineForDocx(` ${remainder.trim()}`);
        solutionChildren.push(...restRuns);
      }

      docChildren.push(
        new Paragraph({
          children: solutionChildren,
          spacing: { before: 140, after: 100 },
        })
      );
      continue;
    }

    // Bullet list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.replace(/^[-*]\s+/, '');
      const children = await processInlineForDocx(content);
      docChildren.push(
        new Paragraph({
          children,
          bullet: { level: 0 },
          spacing: { after: 80 },
        })
      );
      continue;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+\.)\s+(.+)$/);
    if (numMatch) {
      const children = await processInlineForDocx(numMatch[2]);
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${numMatch[1]} `, bold: true, size: 24, font: 'Calibri' }),
            ...children,
          ],
          spacing: { after: 100 },
        })
      );
      continue;
    }

    // Standalone LaTeX equation without wrapping dollar signs
    // (e.g. \Rightarrow \frac{-b}{a} = 1)
    if (
      /\\(?:frac|sqrt|Rightarrow|implies|therefore|because|alpha|beta|theta|pi|pm)/.test(trimmed) &&
      !trimmed.includes('$')
    ) {
      const mathComp = await latexToDocxMathComponent(trimmed, true);
      if (mathComp) {
        docChildren.push(
          new Paragraph({
            children: [mathComp],
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 120 },
          })
        );
        continue;
      }
    }

    // Standard paragraph with inline math formulas & bold/italics
    const children = await processInlineForDocx(trimmed);
    docChildren.push(
      new Paragraph({
        children,
        spacing: { after: 120 },
      })
    );
  }

  if (inTable && tableBuffer.length > 0) {
    await flushTable();
  }

  // Create Document with standard 1-inch margins
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
