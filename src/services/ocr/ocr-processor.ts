/**
 * OCR processor interface.
 *
 * The default implementation is `DefaultOcrProcessor` which throws "not implemented".
 * Production deployments should inject a real implementation (e.g. wrapping tesseract.js,
 * google-vision, or an existing in-house OCR module like moneyOcr from a parent app).
 *
 * Tests can pass a mock implementation to `startDownloadsWatcher` to avoid loading real OCR binaries.
 */
export interface OcrProcessor {
  processImage(filePath: string): Promise<string>;
  processPdf(filePath: string): Promise<string>;
  processDocx(filePath: string): Promise<string>;
}

export class DefaultOcrProcessor implements OcrProcessor {
  async processImage(filePath: string): Promise<string> {
    throw new Error(`DefaultOcrProcessor.processImage not implemented: ${filePath}`);
  }
  async processPdf(filePath: string): Promise<string> {
    throw new Error(`DefaultOcrProcessor.processPdf not implemented: ${filePath}`);
  }
  async processDocx(filePath: string): Promise<string> {
    throw new Error(`DefaultOcrProcessor.processDocx not implemented: ${filePath}`);
  }
}