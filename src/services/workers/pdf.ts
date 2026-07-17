import type { FileEvent } from '../../types/index.js';
import { BaseWorker, type BaseWorkerDeps } from './base.js';
import type { PdfTextExtractor } from '../pdf-text/extractor.js';

export interface PdfWorkerDeps extends BaseWorkerDeps {
  pdfExtractor: PdfTextExtractor;
}

const OCR_FALLBACK_THRESHOLD = 50;

export class PdfWorker extends BaseWorker<PdfWorkerDeps> {
  constructor(deps: PdfWorkerDeps) {
    super(deps, 'pdf-worker');
  }

  protected queueType(): 'pdf' | 'image' {
    return 'pdf';
  }

  protected async extractText(event: FileEvent): Promise<string> {
    const text = await this.deps.pdfExtractor.extract(event.path);
    if (text.length >= OCR_FALLBACK_THRESHOLD) return text;

    this.logger.warn({ event: event.path, textLen: text.length }, 'PDF text too short, falling back to OCR');
    const ocrText = await this.deps.ocrService.extractText(event.path);
    return ocrText;
  }
}
