import { createWorker, type Worker as TesseractWorker } from 'tesseract.js';
import type { OcrService } from './interface.js';

export interface TesseractOcrOptions {
  lang: string;
  binaryPath?: string | null;
}

export class TesseractOcr implements OcrService {
  private workerPromise: Promise<TesseractWorker> | null = null;
  private readonly lang: string;
  private readonly binaryPath: string | null | undefined;

  constructor(opts: TesseractOcrOptions) {
    this.lang = opts.lang;
    this.binaryPath = opts.binaryPath;
  }

  private async getWorker(): Promise<TesseractWorker> {
    if (!this.workerPromise) {
      const workerOptions = this.binaryPath ? { workerPath: this.binaryPath } : undefined;
      this.workerPromise = createWorker(this.lang, undefined, workerOptions);
    }
    return this.workerPromise;
  }

  async extractText(input: Buffer | string): Promise<string> {
    const worker = await this.getWorker();
    const { data } = await worker.recognize(input);
    return data.text;
  }

  async terminate(): Promise<void> {
    if (this.workerPromise) {
      const worker = await this.workerPromise;
      await worker.terminate();
      this.workerPromise = null;
    }
  }
}