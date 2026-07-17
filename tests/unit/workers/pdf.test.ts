import { describe, it, expect, vi } from 'vitest';

describe('PdfWorker', () => {
  it('extracts text via pdf extractor, falls back to OCR when text < 50 chars, parses and submits', async () => {
    const pdfExtractor = { extract: vi.fn().mockResolvedValue('short') };
    const ocrService = { extractText: vi.fn().mockResolvedValue('OCR FALLBACK TEXT long enough to exceed threshold') };
    const parser = { parse: vi.fn().mockResolvedValue({ source: 's', sourceFile: 'p', invoiceNumber: 'INV-1', vendorName: null, issueDate: null, totalAmount: null, currency: null, lineItems: [], rawText: 'r', confidence: 1, processedAt: 'now' }) };
    const apiClient = { submit: vi.fn().mockResolvedValue({ id: 'a' }) };
    const metrics = { recordJobComplete: vi.fn(), flush: vi.fn() };

    vi.doMock('node:fs/promises', () => ({ rename: vi.fn().mockResolvedValue(undefined) }));

    const { PdfWorker } = await import('../../../src/services/workers/pdf.js');
    const worker = new PdfWorker({
      ocrService,
      parser,
      apiClient,
      metrics,
      storage: { processedDir: './p', failedDir: './f' },
      queueConfig: { concurrency: 1, maxRetries: 0 },
      pdfExtractor,
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })) } as any,
    });

    worker.enqueue({ source: 's', path: '/x.pdf', filename: 'x.pdf', extension: '.pdf', sizeBytes: 1, detectedAt: 'now' });
    await worker.drain();

    expect(pdfExtractor.extract).toHaveBeenCalledWith('/x.pdf');
    expect(ocrService.extractText).toHaveBeenCalledWith('/x.pdf');
    expect(parser.parse).toHaveBeenCalled();
    expect(apiClient.submit).toHaveBeenCalled();
    expect(metrics.recordJobComplete).toHaveBeenCalledWith('pdf', 'success', expect.any(Number));
  });

  it('uses only pdf extractor when text is sufficient (no OCR)', async () => {
    const longText = 'x'.repeat(100);
    const pdfExtractor = { extract: vi.fn().mockResolvedValue(longText) };
    const ocrService = { extractText: vi.fn() };
    const parser = { parse: vi.fn().mockResolvedValue({ source: 's', sourceFile: 'p', invoiceNumber: null, vendorName: null, issueDate: null, totalAmount: null, currency: null, lineItems: [], rawText: longText, confidence: 1, processedAt: 'now' }) };
    const apiClient = { submit: vi.fn().mockResolvedValue({ id: 'a' }) };
    const metrics = { recordJobComplete: vi.fn(), flush: vi.fn() };

    vi.doMock('node:fs/promises', () => ({ rename: vi.fn().mockResolvedValue(undefined) }));

    const { PdfWorker } = await import('../../../src/services/workers/pdf.js');
    const worker = new PdfWorker({
      ocrService,
      parser,
      apiClient,
      metrics,
      storage: { processedDir: './p', failedDir: './f' },
      queueConfig: { concurrency: 1, maxRetries: 0 },
      pdfExtractor,
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })) } as any,
    });

    worker.enqueue({ source: 's', path: '/y.pdf', filename: 'y.pdf', extension: '.pdf', sizeBytes: 1, detectedAt: 'now' });
    await worker.drain();

    expect(pdfExtractor.extract).toHaveBeenCalled();
    expect(ocrService.extractText).not.toHaveBeenCalled();
    expect(metrics.recordJobComplete).toHaveBeenCalledWith('pdf', 'success', expect.any(Number));
  });
});