import path from 'node:path';
import type { OcrProcessor } from './ocr-processor.js';

export type Kind = 'image' | 'pdf' | 'docx';

export function detectKind(filePath: string): Kind {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (ext === '.docx') return 'docx';
  return 'image';
}

export async function ocrByKind(filePath: string, kind: Kind, ocr: OcrProcessor): Promise<string> {
  if (kind === 'pdf') return ocr.processPdf(filePath);
  if (kind === 'docx') return ocr.processDocx(filePath);
  return ocr.processImage(filePath);
}