import { readFileSync } from 'node:fs';
// @ts-expect-error - pdf-parse has no bundled types but ships its own runtime types
import pdfParse from 'pdf-parse';

export class PdfTextExtractor {
  async extract(input: Buffer | string): Promise<string> {
    const buffer = typeof input === 'string' ? readFileSync(input) : input;
    const result = await pdfParse(buffer);
    return result.text;
  }
}