import { describe, it, expect, vi } from 'vitest';

describe('ImageWorker', () => {
  it('resizes image then OCRs then parses and submits', async () => {
    const sharpMock = vi.fn(() => ({
      resize: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue(Buffer.from('resized')),
    }));
    vi.doMock('sharp', () => ({ default: sharpMock }));

    const ocrService = { extractText: vi.fn().mockResolvedValue('OCR TEXT') };
    const parser = { parse: vi.fn().mockResolvedValue({ source: 's', sourceFile: 'p', invoiceNumber: null, vendorName: null, issueDate: null, totalAmount: null, currency: null, lineItems: [], rawText: 'OCR TEXT', confidence: 1, processedAt: 'now' }) };
    const apiClient = { submit: vi.fn().mockResolvedValue({ id: 'a' }) };
    const metrics = { recordJobComplete: vi.fn(), flush: vi.fn() };

    vi.doMock('node:fs/promises', () => ({ rename: vi.fn().mockResolvedValue(undefined), mkdir: vi.fn().mockResolvedValue(undefined) }));

    const { ImageWorker } = await import('../../../src/services/workers/image.js');
    const worker = new ImageWorker({
      ocrService,
      parser,
      apiClient,
      metrics,
      storage: { processedDir: './p', failedDir: './f' },
      queueConfig: { concurrency: 1, maxRetries: 0 },
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })) } as any,
    });

    worker.enqueue({ source: 's', path: '/x.png', filename: 'x.png', extension: '.png', sizeBytes: 1, detectedAt: 'now' });
    await worker.drain();

    expect(sharpMock).toHaveBeenCalledWith('/x.png');
    expect(ocrService.extractText).toHaveBeenCalledWith(expect.any(Buffer));
    expect(parser.parse).toHaveBeenCalled();
    expect(apiClient.submit).toHaveBeenCalled();
    expect(metrics.recordJobComplete).toHaveBeenCalledWith('image', 'success', expect.any(Number));
  });
});