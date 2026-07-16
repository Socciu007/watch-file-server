export interface OcrService {
  extractText(input: Buffer | string): Promise<string>;
  terminate(): Promise<void>;
}