import { describe, it, expect, vi } from 'vitest';

vi.mock('pdf-parse', () => ({
  default: vi.fn(async (buf: Buffer) => ({
    text: `parsed:${buf.toString()}`,
  })),
}));

describe('PdfTextExtractor', () => {
  it('extracts text from a buffer', async () => {
    const { PdfTextExtractor } = await import('../../../../src/services/pdf-text/extractor.js');
    const extractor = new PdfTextExtractor();
    const text = await extractor.extract(Buffer.from('fake-pdf-bytes'));
    expect(text).toBe('parsed:fake-pdf-bytes');
  });

  it('extracts text from a file path', async () => {
    const { readFileSync, writeFileSync, mkdtempSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');

    const dir = mkdtempSync(join(tmpdir(), 'pdf-test-'));
    const file = join(dir, 'sample.pdf');
    writeFileSync(file, 'bytes-here');
    const { PdfTextExtractor } = await import('../../../../src/services/pdf-text/extractor.js');
    const extractor = new PdfTextExtractor();
    const text = await extractor.extract(file);
    expect(text).toBe('parsed:bytes-here');
    rmSync(dir, { recursive: true });
  });
});