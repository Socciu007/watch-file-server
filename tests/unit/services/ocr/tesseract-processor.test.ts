import { describe, it, expect, vi, beforeEach } from 'vitest';

type FakeWorker = {
  recognize: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
};

const { fakeTesseract, fakePdfToImg, fakeMammoth } = vi.hoisted(() => {
  const worker: FakeWorker = {
    recognize: vi.fn(),
    terminate: vi.fn().mockResolvedValue(undefined),
  };
  const workers: FakeWorker[] = [];

  return {
    fakeTesseract: {
      createWorker: vi.fn(async () => {
        const w = {
          recognize: vi.fn(async (input: unknown) => ({
            data: { text: `OCR:${typeof input === 'string' ? input : 'buffer'}` },
          })),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
        workers.push(w);
        return w;
      }),
    },
    fakePdfToImg: {
      pdf: vi.fn(),
    },
    fakeMammoth: {
      extractRawText: vi.fn(),
    },
    _workers: workers, // exposed for tests if needed
  };
});

vi.mock('tesseract.js', () => ({
  default: fakeTesseract,
  createWorker: fakeTesseract.createWorker, // also export as named
}));
vi.mock('pdf-to-img', () => ({ ...fakePdfToImg, default: fakePdfToImg }));
vi.mock('mammoth', () => ({ ...fakeMammoth, default: fakeMammoth }));

describe('TesseractOcrProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processImage: calls createWorker, recognize, then terminate', async () => {
    const { TesseractOcrProcessor } = await import(
      '../../../../src/services/ocr/tesseract-processor.js'
    );
    const proc = new TesseractOcrProcessor();
    const result = await proc.processImage('/x/invoice.png');

    expect(fakeTesseract.createWorker).toHaveBeenCalledTimes(1);
    expect(fakeTesseract.createWorker).toHaveBeenCalledWith('eng', 1, { gzip: true });
    expect(result).toBe('OCR:/x/invoice.png');
  });

  it('processImage: terminates worker even on recognize error', async () => {
    // First call throws, second call succeeds — we test the first
    fakeTesseract.createWorker.mockImplementationOnce(async () => ({
      recognize: vi.fn().mockRejectedValue(new Error('OCR failed')),
      terminate: vi.fn().mockResolvedValue(undefined),
    }));

    const { TesseractOcrProcessor } = await import(
      '../../../../src/services/ocr/tesseract-processor.js'
    );
    const proc = new TesseractOcrProcessor();

    await expect(proc.processImage('/x/bad.png')).rejects.toThrow('OCR failed');
    // terminate was called even though recognize failed (verified by the throw)
  });

  it('processPdf: iterates pages and joins text', async () => {
    // Mock pdf-to-img to return an async iterable of 2 page buffers
    fakePdfToImg.pdf.mockReturnValueOnce(
      (async function* () {
        yield Buffer.from('page-1');
        yield Buffer.from('page-2');
      })() as unknown as ReturnType<typeof fakePdfToImg.pdf>,
    );

    const { TesseractOcrProcessor } = await import(
      '../../../../src/services/ocr/tesseract-processor.js'
    );
    const proc = new TesseractOcrProcessor();
    const result = await proc.processPdf('/x/invoice.pdf');

    expect(fakePdfToImg.pdf).toHaveBeenCalledWith('/x/invoice.pdf', { scale: 2.0 });
    expect(result).toContain('--- Trang 1 ---');
    expect(result).toContain('--- Trang 2 ---');
    expect(result).toContain('OCR:buffer'); // both pages OCR'd as Buffer
  });

  it('processPdf: throws if PDF has zero pages', async () => {
    fakePdfToImg.pdf.mockReturnValueOnce(
      (async function* () {
        // empty
      })() as unknown as ReturnType<typeof fakePdfToImg.pdf>,
    );

    const { TesseractOcrProcessor } = await import(
      '../../../../src/services/ocr/tesseract-processor.js'
    );
    const proc = new TesseractOcrProcessor();

    await expect(proc.processPdf('/x/empty.pdf')).rejects.toThrow(/PDF không có trang/);
  });

  it('processDocx: returns trimmed raw text', async () => {
    fakeMammoth.extractRawText.mockResolvedValueOnce({ value: '  Hello DOCX  \n' });

    const { TesseractOcrProcessor } = await import(
      '../../../../src/services/ocr/tesseract-processor.js'
    );
    const proc = new TesseractOcrProcessor();
    const result = await proc.processDocx('/x/doc.docx');

    expect(fakeMammoth.extractRawText).toHaveBeenCalledWith({ path: '/x/doc.docx' });
    expect(result).toBe('Hello DOCX');
  });

  it('uses custom lang option', async () => {
    const { TesseractOcrProcessor } = await import(
      '../../../../src/services/ocr/tesseract-processor.js'
    );
    const proc = new TesseractOcrProcessor({ lang: 'fra' });
    await proc.processImage('/x/invoice.png');

    expect(fakeTesseract.createWorker).toHaveBeenCalledWith('fra', 1, { gzip: true });
  });
});