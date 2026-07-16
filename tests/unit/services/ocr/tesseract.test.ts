import { describe, it, expect, vi, beforeEach } from 'vitest';

// Single shared worker instance to verify reuse
const { workerInstance } = vi.hoisted(() => ({
  workerInstance: {
    recognize: vi.fn(async (input: Buffer | string) => ({
      data: { text: `OCR:${typeof input === 'string' ? input : input.toString()}` },
    })),
    terminate: vi.fn(async () => undefined),
  },
}));

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(async () => workerInstance),
}));

describe('TesseractOcr', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workerInstance.recognize.mockClear();
    workerInstance.terminate.mockClear();
  });

  it('extracts text from a Buffer', async () => {
    const { TesseractOcr } = await import('../../../../src/services/ocr/tesseract.js');
    const ocr = new TesseractOcr({ lang: 'eng' });
    const text = await ocr.extractText(Buffer.from('hello'));
    expect(text).toBe('OCR:hello');
    await ocr.terminate();
  });

  it('extracts text from a string path', async () => {
    const { TesseractOcr } = await import('../../../../src/services/ocr/tesseract.js');
    const ocr = new TesseractOcr({ lang: 'eng' });
    const text = await ocr.extractText('/tmp/sample.png');
    expect(text).toBe('OCR:/tmp/sample.png');
    await ocr.terminate();
  });

  it('reuses the same worker across multiple extractText calls', async () => {
    const tesseract = await import('tesseract.js');
    const { TesseractOcr } = await import('../../../../src/services/ocr/tesseract.js');
    const ocr = new TesseractOcr({ lang: 'eng' });
    await ocr.extractText(Buffer.from('a'));
    await ocr.extractText(Buffer.from('b'));
    await ocr.extractText('/path/c.png');
    expect(tesseract.createWorker).toHaveBeenCalledTimes(1);
    expect(workerInstance.recognize).toHaveBeenCalledTimes(3);
    await ocr.terminate();
  });

  it('creates a new worker after terminate', async () => {
    const tesseract = await import('tesseract.js');
    const { TesseractOcr } = await import('../../../../src/services/ocr/tesseract.js');
    const ocr = new TesseractOcr({ lang: 'eng' });
    await ocr.extractText(Buffer.from('a'));
    await ocr.terminate();
    await ocr.extractText(Buffer.from('b'));
    expect(tesseract.createWorker).toHaveBeenCalledTimes(2);
    await ocr.terminate();
  });

  it('terminate is safe when no worker exists', async () => {
    const { TesseractOcr } = await import('../../../../src/services/ocr/tesseract.js');
    const ocr = new TesseractOcr({ lang: 'eng' });
    await expect(ocr.terminate()).resolves.not.toThrow();
  });
});