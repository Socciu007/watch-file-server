import { describe, it, expect, vi } from 'vitest';
import { detectKind, ocrByKind } from '../../../../src/services/ocr/ocr-by-kind.js';
import type { OcrProcessor } from '../../../../src/services/ocr/ocr-processor.js';

describe('detectKind', () => {
  it('classifies pdf files', () => {
    expect(detectKind('/x.pdf')).toBe('pdf');
    expect(detectKind('/x.PDF')).toBe('pdf');
  });

  it('classifies docx files', () => {
    expect(detectKind('/x.docx')).toBe('docx');
    expect(detectKind('/x.DOCX')).toBe('docx');
  });

  it('classifies everything else as image', () => {
    for (const ext of ['.png', '.jpg', '.jpeg', '.bmp', '.tif', '.tiff', '.webp']) {
      expect(detectKind(`/x${ext}`)).toBe('image');
    }
    expect(detectKind('/x.txt')).toBe('image'); // unknown defaults to image
  });
});

describe('ocrByKind', () => {
  it('dispatches pdf to processPdf', async () => {
    const ocr = { processImage: vi.fn(), processPdf: vi.fn().mockResolvedValue('PDF_TEXT'), processDocx: vi.fn() } as unknown as OcrProcessor;
    const result = await ocrByKind('/x.pdf', 'pdf', ocr);
    expect(result).toBe('PDF_TEXT');
    expect((ocr as any).processPdf).toHaveBeenCalledWith('/x.pdf');
  });

  it('dispatches docx to processDocx', async () => {
    const ocr = { processImage: vi.fn(), processPdf: vi.fn(), processDocx: vi.fn().mockResolvedValue('DOCX_TEXT') } as unknown as OcrProcessor;
    const result = await ocrByKind('/x.docx', 'docx', ocr);
    expect(result).toBe('DOCX_TEXT');
    expect((ocr as any).processDocx).toHaveBeenCalledWith('/x.docx');
  });

  it('dispatches image to processImage', async () => {
    const ocr = { processImage: vi.fn().mockResolvedValue('IMAGE_TEXT'), processPdf: vi.fn(), processDocx: vi.fn() } as unknown as OcrProcessor;
    const result = await ocrByKind('/x.png', 'image', ocr);
    expect(result).toBe('IMAGE_TEXT');
    expect((ocr as any).processImage).toHaveBeenCalledWith('/x.png');
  });

  it('propagates errors from the underlying processor', async () => {
    const ocr = {
      processImage: vi.fn().mockRejectedValue(new Error('OCR crashed')),
      processPdf: vi.fn(),
      processDocx: vi.fn(),
    } as unknown as OcrProcessor;
    await expect(ocrByKind('/x.png', 'image', ocr)).rejects.toThrow('OCR crashed');
  });

  // ── Firecrawl fast-path ─────────────────────────────────────────────────
  it('PDF: Firecrawl fast-path returns markdown when long enough', async () => {
    const ocr = { processImage: vi.fn(), processPdf: vi.fn(), processDocx: vi.fn() } as unknown as OcrProcessor;
    const firecrawl = vi.fn().mockResolvedValue(
      '# Bill of Lading\nSITGSHCBZR0048\nContainer: ABCD1234567',
    );
    const result = await ocrByKind('/x.pdf', 'pdf', ocr, { firecrawl });
    expect(result).toContain('SITGSHCBZR0048');
    expect(firecrawl).toHaveBeenCalledWith('/x.pdf');
    expect((ocr as any).processPdf).not.toHaveBeenCalled();
  });

  it('PDF: falls back to OCR when Firecrawl returns < 20 chars', async () => {
    const ocr = { processImage: vi.fn(), processPdf: vi.fn().mockResolvedValue('OCR_PDF'), processDocx: vi.fn() } as unknown as OcrProcessor;
    const firecrawl = vi.fn().mockResolvedValue(''); // scanned PDF
    const result = await ocrByKind('/x.pdf', 'pdf', ocr, { firecrawl });
    expect(result).toBe('OCR_PDF');
    expect(firecrawl).toHaveBeenCalled();
    expect((ocr as any).processPdf).toHaveBeenCalledWith('/x.pdf');
  });

  it('PDF: falls back to OCR when Firecrawl throws', async () => {
    const ocr = { processImage: vi.fn(), processPdf: vi.fn().mockResolvedValue('OCR_PDF'), processDocx: vi.fn() } as unknown as OcrProcessor;
    const firecrawl = vi.fn().mockRejectedValue(new Error('Firecrawl 500'));
    const result = await ocrByKind('/x.pdf', 'pdf', ocr, { firecrawl });
    expect(result).toBe('OCR_PDF');
    expect((ocr as any).processPdf).toHaveBeenCalledWith('/x.pdf');
  });

  it('PDF: force-disabled when firecrawl: null', async () => {
    const ocr = { processImage: vi.fn(), processPdf: vi.fn().mockResolvedValue('OCR_PDF'), processDocx: vi.fn() } as unknown as OcrProcessor;
    const result = await ocrByKind('/x.pdf', 'pdf', ocr, { firecrawl: null });
    expect(result).toBe('OCR_PDF');
    expect((ocr as any).processPdf).toHaveBeenCalledWith('/x.pdf');
  });

  it('non-PDF kinds ignore the firecrawl option entirely', async () => {
    const ocr = { processImage: vi.fn().mockResolvedValue('IMG'), processPdf: vi.fn(), processDocx: vi.fn().mockResolvedValue('DOCX') } as unknown as OcrProcessor;
    const firecrawl = vi.fn();
    await ocrByKind('/x.png', 'image', ocr, { firecrawl });
    await ocrByKind('/x.docx', 'docx', ocr, { firecrawl });
    expect(firecrawl).not.toHaveBeenCalled();
  });
});