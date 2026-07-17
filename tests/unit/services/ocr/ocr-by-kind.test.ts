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
});