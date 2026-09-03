import { describe, it, expect, vi, beforeEach } from 'vitest';

type FakeWorker = {
  recognize: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
};

const { fakeTesseract, fakePdfToImg, fakePdfParse, fakeMammoth } = vi.hoisted(() => {
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
    fakePdfParse: {
      PDFParse: vi.fn(),
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
vi.mock('pdf-parse', () => ({ ...fakePdfParse, default: fakePdfParse }));
vi.mock('mammoth', () => ({ ...fakeMammoth, default: fakeMammoth }));

// processPdf reads the PDF with fs.readFile before handing it to pdf-parse.
// Stub it so tests don't need real PDF fixtures on disk.
vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    default: actual,
    readFile: vi.fn(async () => Buffer.from('mock-pdf-bytes')),
  };
});

describe('TesseractOcrProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processImage: calls createWorker, recognize, then terminate', async () => {
    const { TesseractOcrProcessor } = await import(
      '../../../../src/services/ocr/ocr-processor.js'
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
      '../../../../src/services/ocr/ocr-processor.js'
    );
    const proc = new TesseractOcrProcessor();

    await expect(proc.processImage('/x/bad.png')).rejects.toThrow('OCR failed');
    // terminate was called even though recognize failed (verified by the throw)
  });

  it('processPdf: uses pdf-parse fast path when text layer is present', async () => {
    // Mock pdf-parse to return a real text layer — should NOT fall through
    // to Tesseract / pdf-to-img.
    // Use `function` form (not arrow) so `new fn()` works as a constructor.
    fakePdfParse.PDFParse.mockImplementationOnce(function (this: any) {
      this.getText = vi.fn().mockResolvedValue({
        text: 'B/L No. SITGSHCBZR0048\nSITC CONTAINER LINES CO., LTD.',
      });
      this.destroy = vi.fn().mockResolvedValue(undefined);
    });

    const { TesseractOcrProcessor } = await import(
      '../../../../src/services/ocr/ocr-processor.js'
    );
    const proc = new TesseractOcrProcessor();
    const result = await proc.processPdf('/x/bl-text.pdf');

    expect(result).toBe('B/L No. SITGSHCBZR0048\nSITC CONTAINER LINES CO., LTD.');
    expect(fakePdfToImg.pdf).not.toHaveBeenCalled(); // OCR not needed
    expect(fakeTesseract.createWorker).not.toHaveBeenCalled();
  });

  it('processPdf: falls back to Tesseract when pdf-parse returns too little text', async () => {
    // Scanned PDF → pdf-parse returns < MIN_PDF_PARSE_TEXT_LENGTH chars.
    fakePdfParse.PDFParse.mockImplementationOnce(function (this: any) {
      this.getText = vi.fn().mockResolvedValue({ text: '' });
      this.destroy = vi.fn().mockResolvedValue(undefined);
    });
    fakePdfToImg.pdf.mockReturnValueOnce(
      (async function* () {
        yield Buffer.from('scanned-page');
      })() as unknown as ReturnType<typeof fakePdfToImg.pdf>,
    );

    const { TesseractOcrProcessor } = await import(
      '../../../../src/services/ocr/ocr-processor.js'
    );
    const proc = new TesseractOcrProcessor();
    const result = await proc.processPdf('/x/bl-scanned.pdf');

    expect(result).toContain('--- Trang 1 ---');
    expect(result).toContain('OCR:buffer');
    expect(fakePdfToImg.pdf).toHaveBeenCalledTimes(1);
  });

  it('processPdf: falls back to Tesseract when pdf-parse throws', async () => {
    fakePdfParse.PDFParse.mockImplementationOnce(function (this: any) {
      this.getText = vi.fn().mockRejectedValue(new Error('corrupt PDF'));
      this.destroy = vi.fn().mockResolvedValue(undefined);
    });
    fakePdfToImg.pdf.mockReturnValueOnce(
      (async function* () {
        yield Buffer.from('page-1');
      })() as unknown as ReturnType<typeof fakePdfToImg.pdf>,
    );

    const { TesseractOcrProcessor } = await import(
      '../../../../src/services/ocr/ocr-processor.js'
    );
    const proc = new TesseractOcrProcessor();
    const result = await proc.processPdf('/x/broken.pdf');

    expect(result).toContain('OCR:buffer');
    expect(fakePdfToImg.pdf).toHaveBeenCalledTimes(1);
  });

  it('processPdf: pdf-parse override via constructor is used', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customParser: any = {
      PDFParse: vi.fn().mockImplementation(function (this: any) {
        this.getText = vi.fn().mockResolvedValue({ text: 'CUSTOM TEXT LAYER FROM OVERRIDE' });
        this.destroy = vi.fn().mockResolvedValue(undefined);
      }),
    };

    const { TesseractOcrProcessor } = await import(
      '../../../../src/services/ocr/ocr-processor.js'
    );
    const proc = new TesseractOcrProcessor({ pdfParse: customParser });
    const result = await proc.processPdf('/x/x.pdf');

    expect(result).toBe('CUSTOM TEXT LAYER FROM OVERRIDE');
    expect(customParser.PDFParse).toHaveBeenCalled();
    expect(fakePdfParse.PDFParse).not.toHaveBeenCalled(); // didn't fall through to default
  });

  it('processPdf: iterates pages and joins text (OCR fallback path)', async () => {
    // Force pdf-parse to throw so we exercise the OCR fallback.
    fakePdfParse.PDFParse.mockImplementation(function (this: any) {
      this.getText = vi.fn().mockRejectedValue(new Error('pdf-parse down'));
      this.destroy = vi.fn().mockResolvedValue(undefined);
    });
    // Mock pdf-to-img to return an async iterable of 2 page buffers
    fakePdfToImg.pdf.mockReturnValueOnce(
      (async function* () {
        yield Buffer.from('page-1');
        yield Buffer.from('page-2');
      })() as unknown as ReturnType<typeof fakePdfToImg.pdf>,
    );

    const { TesseractOcrProcessor } = await import(
      '../../../../src/services/ocr/ocr-processor.js'
    );
    const proc = new TesseractOcrProcessor();
    const result = await proc.processPdf('/x/invoice.pdf');

    expect(fakePdfToImg.pdf).toHaveBeenCalledWith('/x/invoice.pdf', { scale: 2.5 });
    expect(result).toContain('--- Trang 1 ---');
    expect(result).toContain('--- Trang 2 ---');
    expect(result).toContain('OCR:buffer'); // both pages OCR'd as Buffer
  });

  it('processPdf: throws if PDF has zero pages (after pdf-parse fallback)', async () => {
    fakePdfParse.PDFParse.mockImplementation(function (this: any) {
      this.getText = vi.fn().mockResolvedValue({ text: '' });
      this.destroy = vi.fn().mockResolvedValue(undefined);
    });
    fakePdfToImg.pdf.mockReturnValueOnce(
      (async function* () {
        // empty
      })() as unknown as ReturnType<typeof fakePdfToImg.pdf>,
    );

    const { TesseractOcrProcessor } = await import(
      '../../../../src/services/ocr/ocr-processor.js'
    );
    const proc = new TesseractOcrProcessor();

    await expect(proc.processPdf('/x/empty.pdf')).rejects.toThrow(/PDF không có trang/);
  });

  it('processDocx: returns trimmed raw text', async () => {
    fakeMammoth.extractRawText.mockResolvedValueOnce({ value: '  Hello DOCX  \n' });

    const { TesseractOcrProcessor } = await import(
      '../../../../src/services/ocr/ocr-processor.js'
    );
    const proc = new TesseractOcrProcessor();
    const result = await proc.processDocx('/x/doc.docx');

    expect(fakeMammoth.extractRawText).toHaveBeenCalledWith({ path: '/x/doc.docx' });
    expect(result).toBe('Hello DOCX');
  });

  it('uses custom lang option', async () => {
    const { TesseractOcrProcessor } = await import(
      '../../../../src/services/ocr/ocr-processor.js'
    );
    const proc = new TesseractOcrProcessor({ lang: 'fra' });
    await proc.processImage('/x/invoice.png');

    expect(fakeTesseract.createWorker).toHaveBeenCalledWith('fra', 1, { gzip: true });
  });
});