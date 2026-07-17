import { describe, it, expect, vi } from 'vitest';
import {
  aiExtract,
  extractBlNo,
  AI_PROMPT,
  ChatAllAiExtractor,
  type AiExtractor,
} from '../../../../src/services/ai/ai-extractor.js';

describe('extractBlNo', () => {
  it('returns trimmed string when blNo is a string', () => {
    expect(extractBlNo({ blNo: '  ABC123  ' })).toBe('ABC123');
    expect(extractBlNo({ blNo: 'XYZ' })).toBe('XYZ');
  });

  it('returns empty string when blNo is missing or wrong type', () => {
    expect(extractBlNo({})).toBe('');
    expect(extractBlNo({ blNo: null })).toBe('');
    expect(extractBlNo({ blNo: 123 })).toBe('');
    expect(extractBlNo({ blNo: { nested: true } })).toBe('');
  });
});

describe('aiExtract', () => {
  it('appends AI_PROMPT to OCR text and calls extractor', async () => {
    const aiExtractFields = vi.fn().mockResolvedValue({ blNo: 'ABC123' });
    const extractor: AiExtractor = { aiExtractFields };
    const result = await aiExtract('raw OCR', extractor);
    expect(result).toEqual({ blNo: 'ABC123' });
    expect(aiExtractFields).toHaveBeenCalledWith('raw OCR' + AI_PROMPT);
  });

  it('propagates extractor errors', async () => {
    const aiExtractFields = vi.fn().mockRejectedValue(new Error('AI failed'));
    const extractor: AiExtractor = { aiExtractFields };
    await expect(aiExtract('text', extractor)).rejects.toThrow('AI failed');
  });
});

describe('ChatAllAiExtractor class', () => {
  it('can be constructed with no options (uses env defaults)', () => {
    const ext = new ChatAllAiExtractor();
    expect(ext).toBeInstanceOf(ChatAllAiExtractor);
  });
});