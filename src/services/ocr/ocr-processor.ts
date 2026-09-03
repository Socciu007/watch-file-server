import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('info').child({ component: 'tesseract-processor' });

/**
 * OCR processor interface.
 */
export interface OcrProcessor {
  processImage(filePath: string): Promise<string>;
  processPdf(filePath: string): Promise<string>;
  processDocx(filePath: string): Promise<string>;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Module-level refs to native deps — isolated so tests can mock them.
//  tesseract.js, pdf-to-img, pdf-parse, and mammoth are all ESM; we import
//  lazily where we need them so the test suite can swap them via vi.mock().
// ─────────────────────────────────────────────────────────────────────────────
type TesseractModule = typeof import('tesseract.js');
type PdfToImgModule = typeof import('pdf-to-img');
type PdfParseModule = typeof import('pdf-parse');
type MammothModule = typeof import('mammoth');

let _tesseract: TesseractModule | undefined;
let _pdfToImg: PdfToImgModule | undefined;
let _pdfParse: PdfParseModule | undefined;
let _mammoth: MammothModule | undefined;

async function loadTesseract(): Promise<TesseractModule> {
  if (!_tesseract) _tesseract = await import('tesseract.js');
  return _tesseract;
}
async function loadPdfToImg(): Promise<PdfToImgModule> {
  if (!_pdfToImg) _pdfToImg = await import('pdf-to-img');
  return _pdfToImg;
}
async function loadPdfParse(): Promise<PdfParseModule> {
  if (!_pdfParse) _pdfParse = await import('pdf-parse');
  return _pdfParse;
}
async function loadMammoth(): Promise<MammothModule> {
  if (!_mammoth) _mammoth = await import('mammoth');
  return _mammoth;
}

// Re-export so tests can call: tesseractModule.set(mocks) before invoking
export const _deps = {
  setTesseract(m: TesseractModule | undefined) {
    _tesseract = m;
  },
  setPdfToImg(m: PdfToImgModule | undefined) {
    _pdfToImg = m;
  },
  setPdfParse(m: PdfParseModule | undefined) {
    _pdfParse = m;
  },
  setMammoth(m: MammothModule | undefined) {
    _mammoth = m;
  },
};

// Short text from pdf-parse usually means "the PDF has no text layer" —
// i.e. it's a scanned image rendered as PDF. Below this threshold we fall
// back to Tesseract. 20 chars is conservative: even a single-line label
// PDF has ≥ 5 chars of real text, and any "valid" PDF carrier form (B/L,
// invoice, packing list) has hundreds.
const MIN_PDF_PARSE_TEXT_LENGTH = 20;

// ─────────────────────────────────────────────────────────────────────────────
//  Worker factory
// ─────────────────────────────────────────────────────────────────────────────

type TesseractWorker = Awaited<ReturnType<TesseractModule['createWorker']>>;

/**
 * Create a Tesseract worker. Reuse in the same request to save time
 * when processing multiple pages of PDF.
 */
export async function createWorker(
  lang: string = 'eng',
  tesseractOverride?: TesseractModule,
): Promise<TesseractWorker> {
  const tesseract = tesseractOverride ?? (await loadTesseract());

  // For now: always download language data (no local pack).
  // The "gzip: true" option compresses downloads over the wire.
  const options: Record<string, unknown> = {
    gzip: true,
  };

  // oem 1 = LSTM only (Tesseract 5 default; works well for Latin scripts)
  return tesseract.createWorker(lang, 1, options);
}

// ─────────────────────────────────────────────────────────────────────────────
//  OcrProcessor implementation
// ─────────────────────────────────────────────────────────────────────────────

export interface TesseractOcrProcessorOptions {
  lang?: string;
  /** Override for testing — provide a custom tesseract module (e.g. mock). */
  tesseract?: TesseractModule;
  /** Override for testing — provide a custom pdf-parse module (e.g. mock). */
  pdfParse?: PdfParseModule;
}

export class TesseractOcrProcessor implements OcrProcessor {
  private readonly lang: string;
  private readonly tesseractOverride: TesseractModule | undefined;
  private readonly pdfParseOverride: PdfParseModule | undefined;

  constructor(opts: TesseractOcrProcessorOptions = {}) {
    this.lang = opts.lang ?? 'eng';
    this.tesseractOverride = opts.tesseract;
    this.pdfParseOverride = opts.pdfParse;
  }

  async processImage(filePath: string): Promise<string> {
    const worker = await createWorker(this.lang, this.tesseractOverride);
    try {
      const { data } = await worker.recognize(filePath);
      return (data.text ?? '').trim();
    } finally {
      await worker.terminate();
    }
  }

  async processPdf(filePath: string): Promise<string> {
    // 1. Try pdf-parse first — extracts the embedded text layer directly.
    //    Much faster + perfectly accurate for text-based PDFs (which is
    //    most carrier B/L forms: they're generated from a template and
    //    have real text behind the visual layout). If this returns
    //    meaningful text we skip Tesseract entirely.
    const pdfParse = this.pdfParseOverride ?? (await loadPdfParse());
    try {
      const buffer = await readFile(filePath);
      const parser = new pdfParse.PDFParse({ data: buffer });
      let parsedText = '';
      try {
        const result = await parser.getText();
        parsedText = (result.text ?? '').trim();
      } finally {
        await parser.destroy();
      }
      if (parsedText.length >= MIN_PDF_PARSE_TEXT_LENGTH) {
        return parsedText;
      }
      // text too short → likely a scanned PDF with no text layer;
      // fall through to Tesseract OCR.
    } catch {
      // pdf-parse threw (corrupt PDF, unsupported encoding, etc.) —
      // fall through to Tesseract rather than failing the whole upload.
    }

    // 2. Fallback: render each page to an image and OCR with Tesseract.
    //    Required for scanned PDFs and image-only PDFs.
    const { pdf: pdfToImg } = await loadPdfToImg();
    const doc = await pdfToImg(filePath, { scale: 2.5 });

    const worker = await createWorker(this.lang, this.tesseractOverride);
    try {
      const texts: string[] = [];
      let pageNum = 0;
      // pdf-to-img returns an AsyncIterable<Buffer> — one PNG per page.
      for await (const pageBuffer of doc as unknown as AsyncIterable<Buffer>) {
        pageNum++;
        const { data } = await worker.recognize(pageBuffer);
        texts.push(`--- Trang ${pageNum} ---\n${(data.text ?? '').trim()}`);
      }
      if (pageNum === 0) {
        throw new Error('PDF không có trang nào hoặc không thể đọc được');
      }
      return texts.join('\n\n').trim();
    } finally {
      await worker.terminate();
      try {
        await doc.destroy();
      } catch {
        /* ignore */
      }
    }
  }

  async processDocx(filePath: string): Promise<string> {
    const mammoth = await loadMammoth();
    const { value } = await mammoth.extractRawText({ path: filePath });
    return (value ?? '').trim();
  }
}
