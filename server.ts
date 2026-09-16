import express from 'express';
import path from 'path';
import multer from 'multer';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { createServer as createViteServer } from 'vite';
import { generateDocxFromOCR } from './server/docxGenerator';

dotenv.config();

const app = express();
const PORT = 3000;

// Multer in-memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy Google GenAI Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Check configuration status
app.get('/api/status', (req, res) => {
  const sarvamKey = process.env.SARVAM_API_KEY || '';
  const geminiKey = process.env.GEMINI_API_KEY || '';
  res.json({
    sarvamConfigured: Boolean(sarvamKey && sarvamKey.trim().length > 5),
    geminiConfigured: Boolean(geminiKey && geminiKey.trim().length > 5),
  });
});

// Clean raw OCR output to prevent markdown code fence wrapping or JSON code leakage
function cleanOcrOutput(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();

  // Strip wrapping markdown code blocks if the entire response is enclosed in ```markdown ... ``` or ```text ... ```
  const codeBlockMatch = cleaned.match(/^```(?:markdown|md|text)?\s*\n?([\s\S]*?)\n?```$/i);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // If the output begins with JSON syntax (e.g. {"job_id": ...}), extract actual text fields
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (typeof parsed.markdown === 'string' && parsed.markdown.trim()) {
        return cleanOcrOutput(parsed.markdown);
      }
      if (typeof parsed.text === 'string' && parsed.text.trim()) {
        return cleanOcrOutput(parsed.text);
      }
      if (typeof parsed.content === 'string' && parsed.content.trim()) {
        return cleanOcrOutput(parsed.content);
      }
      if (Array.isArray(parsed.documents)) {
        const docTexts = parsed.documents
          .map((d: any) => d.markdown || d.text || d.content || '')
          .filter(Boolean);
        if (docTexts.length > 0) return docTexts.join('\n\n---\n\n');
      }
      // If it has no text, don't return raw JSON metadata as transcription text!
      return '';
    } catch {
      // not valid JSON, treat as text
    }
  }

  return cleaned;
}

// Helper to poll Sarvam AI Job with fast timeout to avoid reverse-proxy 504 drops
async function pollSarvamJob(jobId: string, apiKey: string, maxAttempts = 12): Promise<any> {
  const statusUrl = `https://api.sarvam.ai/doc-ai/v1/job/${jobId}/status`;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    try {
      const resp = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'api-subscription-key': apiKey,
        },
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.warn(`Sarvam status check attempt ${attempt + 1} failed:`, errorText);
        continue;
      }

      const data = (await resp.json()) as any;
      const status = (data?.status || data?.job_status || '').toLowerCase();

      if (status === 'completed' || status === 'success' || status === 'partially_completed') {
        return { success: true, status: data.status, raw: data };
      }

      if (status === 'failed' || status === 'rejected') {
        throw new Error(data?.error_message || data?.error || 'Sarvam AI OCR job failed on server');
      }
    } catch (err: any) {
      if (attempt === maxAttempts - 1) throw err;
    }
  }
  throw new Error('Sarvam AI OCR job timed out while processing; falling back to Gemini Vision.');
}

// Sarvam AI OCR processor
async function processWithSarvam(
  fileBuffer: Buffer,
  filename: string,
  mimetype: string,
  language = 'en-IN',
  contentType = 'mixed',
  outputFormat = 'md'
) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    throw new Error('Sarvam API Key is not configured in environment (SARVAM_API_KEY).');
  }

  const formData = new FormData();
  const fileBlob = new Blob([fileBuffer], { type: mimetype });
  formData.append('file', fileBlob, filename);
  formData.append('language', language);
  formData.append('content_type', contentType); // 'printed' | 'handwritten' | 'mixed'
  formData.append('output_format', outputFormat || 'md'); // Request clean markdown output

  const response = await fetch('https://api.sarvam.ai/doc-ai/v1/job/digitise', {
    method: 'POST',
    headers: {
      'api-subscription-key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Sarvam AI API error (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as any;
  const jobId = data?.job_id || data?.id;

  if (!jobId) {
    if (data?.content || data?.text || data?.markdown) {
      const direct = cleanOcrOutput(data.markdown || data.text || data.content || '');
      if (direct) {
        return { text: direct, markdown: direct, confidence: 'high', notes: 'Sarvam AI Direct OCR' };
      }
    }
    throw new Error('No job_id returned by Sarvam Document AI API');
  }

  await pollSarvamJob(jobId, apiKey);

  let extractedText = '';

  // 1. Try download-url endpoint (Sarvam presigned URL)
  try {
    const dlResp = await fetch(`https://api.sarvam.ai/doc-ai/v1/job/${jobId}/download-url`, {
      headers: { 'api-subscription-key': apiKey },
    });
    if (dlResp.ok) {
      const dlData = (await dlResp.json()) as any;
      const downloadUrl = dlData?.url;
      if (downloadUrl) {
        const fileResp = await fetch(downloadUrl);
        if (fileResp.ok) {
          const arrayBuffer = await fileResp.arrayBuffer();
          const buf = Buffer.from(arrayBuffer);

          // If ZIP file (PK header)
          if (buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b) {
            const zip = await JSZip.loadAsync(buf);
            const textParts: string[] = [];
            for (const [filePath, fileObj] of Object.entries(zip.files)) {
              if (
                !fileObj.dir &&
                (filePath.endsWith('.md') || filePath.endsWith('.txt') || filePath.endsWith('.html'))
              ) {
                const text = await fileObj.async('string');
                if (text && text.trim()) {
                  textParts.push(text.trim());
                }
              }
            }
            if (textParts.length > 0) {
              extractedText = textParts.join('\n\n---\n\n');
            }
          } else {
            extractedText = buf.toString('utf-8');
          }
        }
      }
    }
  } catch (dlErr: any) {
    console.warn('Sarvam download-url fetch attempt note:', dlErr?.message);
  }

  // 2. If download-url was not available or empty, check results endpoint
  if (!extractedText || !extractedText.trim()) {
    try {
      const resResp = await fetch(`https://api.sarvam.ai/doc-ai/v1/job/${jobId}/results`, {
        headers: { 'api-subscription-key': apiKey },
      });
      if (resResp.ok) {
        const resData = (await resResp.json()) as any;
        if (Array.isArray(resData?.documents)) {
          const docParts = resData.documents
            .map((d: any) => d.markdown || d.text || d.content || '')
            .filter(Boolean);
          if (docParts.length > 0) {
            extractedText = docParts.join('\n\n---\n\n');
          }
        } else if (resData?.markdown) {
          extractedText = resData.markdown;
        } else if (resData?.text) {
          extractedText = resData.text;
        }
      }
    } catch (resErr: any) {
      console.warn('Sarvam results fetch note:', resErr?.message);
    }
  }

  const cleaned = cleanOcrOutput(extractedText);

  // If Sarvam didn't return text (e.g. empty, or just JSON metadata code),
  // DO NOT return raw code to the user! Throw so it falls back to Gemini Vision immediately!
  if (!cleaned || cleaned.length < 5 || cleaned.startsWith('{')) {
    throw new Error('Sarvam AI job completed without readable text; falling back to Gemini Vision OCR.');
  }

  return {
    text: cleaned,
    markdown: cleaned,
    confidence: 'high',
    notes: 'Transcribed using Sarvam Document Intelligence',
  };
}

// High-speed, responsive vision models optimized for rapid OCR transcription (<3s latency)
const GEMINI_VISION_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
];

/**
 * Inspect magic bytes of the buffer to accurately detect the true MIME type.
 * Prevents Gemini '400 Unable to process input image' errors when files (like WhatsApp photos)
 * have mismatched extensions or misleading client-supplied MIME types.
 */
function detectMimeTypeFromBuffer(buffer: Buffer, fallbackMime: string, filename: string): string {
  if (buffer && buffer.length >= 4) {
    // Check PNG: 89 50 4E 47 (\x89PNG)
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return 'image/png';
    }
    // Check JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'image/jpeg';
    }
    // Check GIF: GIF8
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
      return 'image/gif';
    }
    // Check PDF: %PDF (25 50 44 46)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return 'application/pdf';
    }
    // Check WebP: RIFF....WEBP
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    ) {
      return 'image/webp';
    }
  }

  const lowerName = (filename || '').toLowerCase();
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  if (lowerName.endsWith('.gif')) return 'image/gif';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';

  if (fallbackMime && fallbackMime.startsWith('image/')) return fallbackMime;
  if (fallbackMime === 'application/pdf') return 'application/pdf';

  return 'image/jpeg';
}

interface GeminiGenerateParams {
  contents: any;
  config?: any;
}

async function generateWithGeminiFallback(
  params: GeminiGenerateParams
): Promise<{ text: string; modelUsed: string }> {
  const ai = getGeminiClient();
  let lastError: any = null;

  for (const modelName of GEMINI_VISION_MODELS) {
    try {
      // 18-second timeout ensures requests never hang or take minutes
      const response = await Promise.race([
        ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: {
            ...params.config,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.MINIMAL,
            },
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Model ${modelName} timed out after 18s`)), 18000)
        ),
      ]);

      if (response && response.text !== undefined) {
        return {
          text: response.text || '',
          modelUsed: modelName,
        };
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(
        `[Gemini Auto-Fallback] Model ${modelName} encountered issue: ${errMsg.substring(0, 120)}`
      );
      // Immediately try next fast model in the list
      continue;
    }
  }

  const finalMsg = lastError?.message || String(lastError || 'Gemini processing failed');
  if (finalMsg.includes('503') || finalMsg.includes('UNAVAILABLE') || finalMsg.includes('high demand')) {
    throw new Error('Gemini AI is currently under high global demand. Please retry in a few moments.');
  }
  if (finalMsg.includes('Unable to process input image')) {
    throw new Error('The vision AI could not decode this image format. Please check the image or re-run.');
  }
  throw new Error(finalMsg);
}

// Gemini Vision OCR processor (for messy handwriting, low light, varied layouts)
async function processWithGemini(
  fileBuffer: Buffer,
  filename: string,
  mimetype: string,
  contentType = 'mixed',
  userPrompt = '',
  targetLang = 'auto'
) {
  const lowerName = (filename || '').toLowerCase();

  // If MIME type is DOCX, extract text first
  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx')
  ) {
    const docResult = await mammoth.extractRawText({ buffer: fileBuffer });
    return {
      text: docResult.value,
      markdown: docResult.value,
      confidence: 'high',
      notes: 'Extracted natively from DOCX format',
    };
  }

  // Determine standard inline MIME type with robust magic-byte inspection
  const inlineMime = detectMimeTypeFromBuffer(fileBuffer, mimetype, filename);

  const base64Data = fileBuffer.toString('base64');

  const systemInstruction = `You are a world-class Optical Character Recognition (OCR), document digitizer, and mathematical formula recognition system.
Your mission is to read and transcribe ANY document without errors, with flawless handling of:
1. Mathematical & Scientific Formulas:
   - Recognize all mathematical formulas, physics equations, chemistry equations, calculus notation, and statistics symbols with 100% precision.
   - ALWAYS format inline math expressions using single dollar signs: $...$ (e.g. $E = mc^2$, $a^2 + b^2 = c^2$, $f(x) = 2x + 1$, $\alpha + \beta = 90^\\circ$).
   - ALWAYS format standalone, multi-line, or complex equations in display LaTeX blocks using double dollar signs:
     $$
     x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
     $$
     $$
     \\int_{a}^{b} f(x) \\, dx = F(b) - F(a)
     $$
     $$
     \\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
     $$
   - Correctly preserve all fractions (\\frac{num}{den}), square roots (\\sqrt{x}, \\sqrt[n]{x}), superscripts (x^2, e^{i\\pi}), subscripts (a_n, H_2O), matrices, integrals, summations, limits, Greek letters (\\alpha, \\beta, \\gamma, \\theta, \\lambda, \\pi, \\sigma, \\omega), and operators (\\pm, \\times, \\div, \\neq, \\approx, \\le, \\ge, \\infty).
   - Accurately disambiguate handwritten math symbols: 'x' variable vs '\\times' multiplication sign, '1' vs 'l' vs '|', '0' vs 'O' vs '\\theta', 'z' vs '2', 't' vs '+', 'v' vs '\\nu'.
2. Mathematical & Scientific Diagrams & Geometric Figures:
   - If the document contains any geometric figures (triangles, circles, tangents, secants, angles, quadrilaterals, coordinate geometry graphs, parabolas, physics diagrams, Venn diagrams), accurately digitize and RECONSTRUCT them as self-contained, clean SVG vector diagrams wrapped in \`\`\`svg ... \`\`\` code blocks.
   - SVG Specifications:
     * Valid XML SVG with proper viewBox (e.g. viewBox="0 0 420 300") and width="100%" height="auto".
     * Exact geometry: vertices accurately plotted, right-angle markers where applicable, circles with center O and radii, coordinate axes with arrows and tick marks.
     * Clear labels: vertices A, B, C, side lengths (e.g. "5 cm", "x"), angle values (e.g. "60°", "\theta"), with legible font-size="13" font-family="sans-serif, Cambria Math" fill="#0f172a".
     * High-contrast styling: strokes in #1e293b or #4338ca (stroke-width="2"), subtle translucent fills, rounded line caps.
   - If a math problem in the paper references a figure ("Refer to figure", "In the diagram below", or describes a geometry problem with lengths and angles), generate the accurate corresponding SVG diagram directly underneath that question.
3. Messy, cursive, slanted, hurried, or faded handwriting (including doctor notes, signatures, annotations, margins).
4. Poor lighting conditions: heavy shadows, glare, low contrast, underexposed or overexposed camera photos, wrinkled/creased paper.
5. Complex layouts: multi-column newspapers, receipts, invoices, forms with filled boxes, tables, stamps, official headers, watermarks.
6. Multilingual text: English, Hindi (Devanagari script), Hinglish, and all Indian languages (Tamil, Telugu, Marathi, Gujarati, Bengali, Urdu, Punjabi, etc.).
7. Tables: Always transcribe tabular data into clean, valid GitHub-Flavored Markdown tables.
8. Preserve paragraph breaks, bullet points, numbered lists, section headings, and formatting precisely.
9. If handwritten words or symbols are partially erased or ambiguous, use mathematical and linguistic context to decode them accurately.

Output only the digitized transcript formatted in clean Markdown with LaTeX math syntax and SVG diagrams for geometric/graphical problems. Maintain original reading order and layout structure.`;

  const promptText = `Please perform comprehensive, 100% accurate OCR transcription of this document.
Document Type Specification: ${contentType} (Handle messy handwriting, mathematical formulas, and lighting variations carefully).
Target/Source Language: ${targetLang}
Math Formula Handling: Transcribe every equation, fraction, exponent, root, calculus term, and symbol into standard LaTeX ($...$ for inline, $$...$$ for display formulas).
Diagrams & Figures: Reconstruct any visible geometric diagrams, coordinate graphs, and figures into clean, accurate vector SVG code inside \`\`\`svg ... \`\`\` blocks right below the question.
Additional context or instructions from user: ${userPrompt || 'Extract all visible text, mathematical formulas, diagrams, tables, numbers, and handwritten notes accurately.'}

Output the transcription in rich, organized Markdown format.`;

  const generated = await generateWithGeminiFallback({
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: inlineMime,
            data: base64Data,
          },
        },
        {
          text: promptText,
        },
      ],
    },
    config: {
      systemInstruction,
      temperature: 0.1, // Low temperature for high OCR precision
    },
  });

  const rawText = cleanOcrOutput(generated.text || '');
  return {
    text: rawText,
    markdown: rawText,
    confidence: 'high',
    notes: `Transcribed using Gemini Vision (${generated.modelUsed}) Document OCR`,
  };
}

// OCR Processing API endpoint with custom multer error handling
app.post(
  '/api/ocr',
  (req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    upload.single('file')(req, res, (err: any) => {
      if (err) {
        console.error('Multer file upload error:', err);
        return res.status(400).json({
          success: false,
          error:
            err.code === 'LIMIT_FILE_SIZE'
              ? 'File size is too large (maximum limit is 50MB).'
              : err.message || 'Failed to upload document file.',
        });
      }
      next();
    });
  },
  async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No document file uploaded. Please select an image, PDF, or Word document.',
        });
      }

      if (!req.file.buffer || req.file.buffer.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Uploaded file is empty (0 bytes). Please upload a valid document or photo.',
        });
      }

      const {
        engine = 'auto', // 'auto' | 'sarvam' | 'gemini'
        language = 'en-IN',
        contentType = 'mixed', // 'printed' | 'handwritten' | 'mixed'
        userPrompt = '',
      } = req.body;

      const file = req.file;
      const sarvamApiKey = process.env.SARVAM_API_KEY;
      const hasSarvamKey = Boolean(sarvamApiKey && sarvamApiKey.trim().length > 5);

      // Default to Gemini Vision: it is fast, accurately reconstructs
      // LaTeX math equations and vector SVG diagrams, handles messy handwriting, and avoids proxy timeouts.
      let engineToUse = engine;
      if (engine === 'auto') {
        engineToUse = 'gemini';
      }

      let result: any = null;
      let actualEngine = engineToUse;

      // Handle DOCX files natively or via Gemini
      const isDocx =
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.originalname.toLowerCase().endsWith('.docx');

      if (isDocx) {
        try {
          const mammothResult = await mammoth.convertToHtml({ buffer: file.buffer });
          const rawText = await mammoth.extractRawText({ buffer: file.buffer });
          return res.json({
            success: true,
            engineUsed: 'native-docx',
            text: rawText.value,
            markdown: rawText.value,
            html: mammothResult.value,
            filename: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            confidence: 'high',
          });
        } catch (err) {
          console.warn('Direct DOCX parse failed, trying AI model fallback:', err);
        }
      }

      if (engineToUse === 'sarvam') {
        if (!hasSarvamKey) {
          // Fallback to Gemini if Sarvam key is not available
          console.info('Sarvam API key not set in environment, falling back to Gemini Vision');
          result = await processWithGemini(
            file.buffer,
            file.originalname,
            file.mimetype,
            contentType,
            userPrompt,
            language
          );
          actualEngine = 'gemini (fallback)';
        } else {
          try {
            result = await processWithSarvam(
              file.buffer,
              file.originalname,
              file.mimetype,
              language,
              contentType,
              'md'
            );
          } catch (sarvamError: any) {
            console.warn('Sarvam AI OCR issue, falling back to Gemini Vision:', sarvamError.message);
            result = await processWithGemini(
              file.buffer,
              file.originalname,
              file.mimetype,
              contentType,
              userPrompt,
              language
            );
            actualEngine = 'gemini (fallback)';
          }
        }
      } else {
        // Use Gemini
        result = await processWithGemini(
          file.buffer,
          file.originalname,
          file.mimetype,
          contentType,
          userPrompt,
          language
        );
        actualEngine = 'gemini';
      }

      const textContent = result.markdown || result.text || '';
      const words = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
      const characters = textContent.length;

      return res.json({
        success: true,
        engineUsed: actualEngine,
        text: result.text,
        markdown: result.markdown,
        confidence: result.confidence || 'high',
        notes: result.notes || '',
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        metadata: {
          wordCount: words,
          characterCount: characters,
          contentType,
          language,
        },
      });
    } catch (err: any) {
      console.error('OCR processing endpoint error:', err);
      const isOverloaded =
        err?.message?.includes('high demand') ||
        err?.message?.includes('503') ||
        err?.message?.includes('UNAVAILABLE') ||
        err?.message?.includes('RESOURCE_EXHAUSTED');

      const isInvalidImage =
        err?.message?.includes('could not decode this image') ||
        err?.message?.includes('Unable to process input image') ||
        err?.message?.includes('invalid image');

      const statusCode = isOverloaded ? 503 : isInvalidImage ? 422 : 500;

      return res.status(statusCode).json({
        success: false,
        error: isOverloaded
          ? 'The AI OCR service is temporarily experiencing high traffic. Please retry in a few moments.'
          : isInvalidImage
          ? 'The vision model could not decode this image format. Try re-capturing or adjusting contrast.'
          : err.message || 'An error occurred while processing document OCR.',
      });
    }
  }
);

// Text enhancement / translation / cleanup endpoint
app.post('/api/enhance-text', async (req, res) => {
  try {
    const { text, action, targetLanguage } = req.body;
    if (!text) {
      res.status(400).json({ error: 'Text is required for enhancement.' });
      return;
    }

    const ai = getGeminiClient();
    let prompt = '';

    if (action === 'fix-errors') {
      prompt = `Review this OCR extracted text from a messy or handwritten document. Correct any clear OCR typos, spacing errors, punctuation errors, or misread characters while strictly preserving all original names, figures, and factual content. Do not add commentary. Output only the corrected text:\n\n${text}`;
    } else if (action === 'format-math') {
      prompt = `You are an expert mathematical typesetter and OCR specialist.
Review the following extracted document text. Detect all mathematical formulas, physics equations, scientific expressions, and chemical notations (whether they are in broken plain text, raw ascii, or misformatted) and convert them into clean, 100% correct standard LaTeX notation.
Rules:
- Format inline math expressions as $...$ (e.g. $E = mc^2$, $a^2 + b^2 = c^2$, $\\alpha + \\beta = 90^\\circ$).
- Format standalone or multi-line equations in display blocks:
  $$
  x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
  $$
- Fix any broken square roots, fractions (\\frac{}{}), superscripts/subscripts, integrals, summations, limits, Greek letters, and operators.
- Strictly keep all non-mathematical surrounding text, questions, and explanations intact without adding conversational remarks or commentary.
Output only the formatted text:\n\n${text}`;
    } else if (action === 'generate-diagrams') {
      prompt = `You are a world-class mathematical illustrator, geometer, and SVG graphics specialist.
Carefully review the following math document transcript.
Identify any geometry problems, trigonometry problems, coordinate geometry/graphing problems, circle theorems, triangle properties, physics setups, or calculus area questions that describe, mention, or would benefit from a visual diagram.

For EACH relevant question or problem:
Synthesize an accurate, mathematically scaled, self-contained SVG vector diagram enclosed in a \`\`\`svg ... \`\`\` code block, and insert it directly below that question.

SVG Rules:
1. Valid XML with xmlns="http://www.w3.org/2000/svg", viewBox="0 0 440 300" (or suitable aspect ratio), width="100%", and height="auto".
2. Precise Geometry:
   - For triangles: vertices positioned accurately to scale (e.g. 3-4-5 right triangle with a clear 90° right-angle square marker at the right angle).
   - For circles: center O clearly marked with a dot, radius r, chords, tangents meeting radius at 90°.
   - For coordinate graphs: clean x and y axes with arrowheads, origin (0,0), tick marks, grid lines, and smooth function curves (<path>).
   - For angles: arc marks with labels (\theta, 60°, etc.).
3. Styling:
   - Strokes: #1e293b (slate-800) or #4338ca (indigo-700), stroke-width="2.5", stroke-linecap="round".
   - Fills: subtle soft tints like rgba(99, 102, 241, 0.08) or #eff6ff.
   - Text labels: font-family="system-ui, -apple-system, sans-serif", font-size="14", font-weight="600", fill="#0f172a", text-anchor="middle". Position text so it never collides with lines.
   - Include a <title> tag inside the <svg> summarizing the diagram.
4. Keep all original document text, question numbering, and LaTeX math equations 100% intact. Do not delete or summarize anything.

Output the complete text with the generated SVG diagrams inserted:\n\n${text}`;
    } else if (action === 'translate') {
      prompt = `You are a professional multilingual translator and scientific document digitizer.
Translate the following document text accurately into ${targetLanguage || 'Hindi'}.

Critical Translation Guidelines:
1. Translate all natural human language, problem statements, questions, explanations, headings, and notes into fluent, natural ${targetLanguage || 'Hindi'}.
2. Mathematical & Scientific Formulas: Strictly preserve ALL LaTeX mathematical formulas ($...$ for inline, $$...$$ for display blocks), equations, fractions (\\frac{}{}), roots (\\sqrt{}), exponents, subscripts, Greek symbols (\\alpha, \\beta, \\theta, \\pi, etc.), and mathematical variables. DO NOT translate, modify, or strip mathematical notation.
3. SVG Diagrams: If there are any \`\`\`svg ... \`\`\` diagram code blocks or figures, preserve them 100% intact without alteration.
4. Structure: Preserve all Markdown formatting, headings (#, ##, ###), bold (**...**), bullet points, tables, and question markers (e.g. Q1., Solution:).
5. Output ONLY the translated document content. Do not include conversational remarks, preamble, or notes.

Content to translate:
${text}`;
    } else if (action === 'summarize') {
      prompt = `Provide a clear, structured summary with key takeaways from this document text:\n\n${text}`;
    } else if (action === 'extract-tables') {
      prompt = `Extract all tabular information, numbers, dates, and line items from this document text into clean GitHub Markdown tables:\n\n${text}`;
    } else {
      prompt = `Format and organize this text into clean, structured Markdown:\n\n${text}`;
    }

    const generated = await generateWithGeminiFallback({
      contents: prompt,
    });

    res.json({
      success: true,
      result: generated.text || '',
      modelUsed: generated.modelUsed,
    });
  } catch (err: any) {
    console.error('Enhance text error:', err);
    res.status(500).json({
      error:
        err.message ||
        'The AI enhancement model is currently experiencing high demand. Please try again shortly.',
    });
  }
});

// Dedicated Math Diagram Generator endpoint
app.post('/api/generate-diagram', async (req, res) => {
  try {
    const { problemText, diagramType } = req.body;
    if (!problemText || typeof problemText !== 'string') {
      res.status(400).json({ error: 'Problem description or prompt is required.' });
      return;
    }

    const prompt = `You are a master mathematical illustrator and SVG developer.
Create an accurate, visually stunning, self-contained vector SVG diagram for this mathematical or scientific problem/concept:
"${problemText}"

Diagram Type / Context: ${diagramType || 'Geometric Figure / Mathematical Graph'}

Requirements:
1. Output ONLY the raw <svg ...>...</svg> element. Do NOT wrap in markdown code fences (\`\`\`), and do NOT include any conversational preamble or markdown text.
2. SVG Attributes: viewBox="0 0 450 320" xmlns="http://www.w3.org/2000/svg" width="100%" height="auto".
3. Geometric Precision:
   - Mathematically exact coordinate placement for all vertices and curves.
   - For right triangles: right-angle marker (square corner) at the 90° angle.
   - For circles: center O marked with a small circle/dot, radius/diameter lines, tangents, chords.
   - For coordinate graphs: horizontal x-axis and vertical y-axis with arrows, origin (0,0), tick marks, grid lines, and clearly labeled plotted curves.
   - Dimension arrows, measurement lines (e.g. "5 cm", "12 m"), angle arcs with degrees or theta.
   - Labels for vertices (A, B, C, D) positioned slightly offset so they never overlap lines.
4. Clean, Professional Styling:
   - Primary strokes: #1e293b (slate-800) or #4338ca (indigo-700), stroke-width="2.5", stroke-linecap="round", stroke-linejoin="round".
   - Subtle geometric fill: rgba(99, 102, 241, 0.08) or #f0fdf4.
   - Text elements: font-family="system-ui, -apple-system, sans-serif", font-size="14", font-weight="600", fill="#0f172a".
   - Add a descriptive <title> tag inside the <svg>.`;

    const generated = await generateWithGeminiFallback({
      contents: prompt,
      config: {
        temperature: 0.1,
      },
    });

    let rawSvg = (generated.text || '').trim();
    // Strip any markdown code fences if model accidentally included them
    rawSvg = rawSvg.replace(/^```(?:svg|xml)?\n?/i, '').replace(/\n?```$/i, '').trim();

    // Ensure it contains <svg and </svg>
    if (!rawSvg.includes('<svg')) {
      throw new Error('Model did not return a valid SVG element.');
    }

    res.json({
      success: true,
      svg: rawSvg,
      modelUsed: generated.modelUsed,
    });
  } catch (err: any) {
    console.error('Generate diagram error:', err);
    res.status(500).json({
      error: err.message || 'Failed to generate math diagram.',
    });
  }
});

// Dedicated DOCX Export endpoint with authentic OMML formula conversion
app.post('/api/export-docx', async (req, res) => {
  try {
    const { markdown = '', title = '', filename = 'document.docx', diagramImages } = req.body;
    if (!markdown || typeof markdown !== 'string') {
      res.status(400).json({ error: 'Markdown content is required for DOCX export.' });
      return;
    }

    const docxBuffer = await generateDocxFromOCR(markdown, {
      title,
      diagramImages,
    });

    const cleanFilename = filename.endsWith('.docx') ? filename : `${filename}.docx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cleanFilename)}"`);
    res.send(docxBuffer);
  } catch (err: any) {
    console.error('Export DOCX error:', err);
    res.status(500).json({
      error: err.message || 'Failed to generate DOCX document with mathematical formulas.',
    });
  }
});

// Explicit 404 handler for API routes - ensures API NEVER returns HTML index.html
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Explicit Express error handler for API errors (prevents Express default HTML error page)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || err.statusCode || 500).json({
    error: err.message || 'An unexpected error occurred.',
  });
});

// Serve frontend in dev or prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OCR Studio Server running on port ${PORT}`);
  });
}

startServer();
