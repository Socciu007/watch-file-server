import path from 'node:path';
import type { OcrProcessor } from './ocr-processor.js';
import { parsePdf } from '../firecrawl/firecrawl-service.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('info').child({ component: 'ocr-by-kind' });

export type Kind = 'image' | 'pdf' | 'docx';

export function detectKind(filePath: string): Kind {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (ext === '.docx') return 'docx';
  return 'image';
}

/**
 * PDFs that come back from Firecrawl below this many chars almost certainly
 * had no selectable text (scanned image PDF) — fall through to Tesseract OCR.
 * A clean text-layer B/L form is hundreds of chars; the threshold only needs
 * to be above "empty / one stray whitespace character".
 */
const MIN_FIRECRAWL_TEXT_LENGTH = 20;

export type FirecrawlParser = (filePath: string) => Promise<string>;

export interface OcrByKindOptions {
  /**
   * Firecrawl fast-path for PDFs. When provided, PDFs are first sent to
   * Firecrawl; only when the response is too short (no text layer) or the
   * call errors do we fall back to `ocr.processPdf()`.
   *
   * Pass `null` to force-disable even when a default would otherwise apply.
   * Leave `undefined` to skip the fast-path entirely.
   */
  firecrawl?: FirecrawlParser | null;
}

/**
 * Resolve which Firecrawl parser to use based on opts. Allows callers to:
 *   - inject a mock (tests)
 *   - force-disable (ops override)
 *   - opt-in via env at the caller (default)
 */
function resolveFirecrawl(opts: OcrByKindOptions): FirecrawlParser | null {
  if (opts.firecrawl === null) return null;
  if (typeof opts.firecrawl === 'function') return opts.firecrawl;
  return null;
}

export async function ocrByKind(
  filePath: string,
  kind: Kind,
  ocr: OcrProcessor,
  opts: OcrByKindOptions = {},
): Promise<string> {
  if (kind === 'pdf') {
    const firecrawl = resolveFirecrawl(opts);
    if (firecrawl) {
      try {
        const md = await firecrawl(filePath);
        if (md.length >= MIN_FIRECRAWL_TEXT_LENGTH) {
          logger.debug(
            { file: filePath, length: md.length },
            'Firecrawl fast-path hit:',
          );
          return md;
        }
        logger.debug(
          { file: filePath, length: md.length },
          'Firecrawl returned short text, falling back to OCR:',
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.debug(
          { file: filePath, message: msg },
          'Firecrawl failed, falling back to OCR:',
        );
      }
    }
    return ocr.processPdf(filePath);
  }
  if (kind === 'docx') return ocr.processDocx(filePath);
  return ocr.processImage(filePath);
}