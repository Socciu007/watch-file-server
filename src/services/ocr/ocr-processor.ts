import path from 'node:path';
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
//  tesseract.js, pdf-to-img, and mammoth are all ESM; we import lazily where
//  we need them so the test suite can swap them via vi.mock().
// ─────────────────────────────────────────────────────────────────────────────
type TesseractModule = typeof import('tesseract.js');
type PdfToImgModule = typeof import('pdf-to-img');
type MammothModule = typeof import('mammoth');

let _tesseract: TesseractModule | undefined;
let _pdfToImg: PdfToImgModule | undefined;
let _mammoth: MammothModule | undefined;

async function loadTesseract(): Promise<TesseractModule> {
  if (!_tesseract) _tesseract = await import('tesseract.js');
  return _tesseract;
}
async function loadPdfToImg(): Promise<PdfToImgModule> {
  if (!_pdfToImg) _pdfToImg = await import('pdf-to-img');
  return _pdfToImg;
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
  setMammoth(m: MammothModule | undefined) {
    _mammoth = m;
  },
};

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
}

export class TesseractOcrProcessor implements OcrProcessor {
  private readonly lang: string;
  private readonly tesseractOverride: TesseractModule | undefined;

  constructor(opts: TesseractOcrProcessorOptions = {}) {
    this.lang = opts.lang ?? 'eng';
    this.tesseractOverride = opts.tesseract;
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
    // pdf-to-img is pure ESM; load it dynamically.
    const { pdf: pdfToImg } = await loadPdfToImg();

    // scale 2.0 ~ 144 DPI; bump it up if better quality is needed.
    const doc = await pdfToImg(filePath, { scale: 2.0 });

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
