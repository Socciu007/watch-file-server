import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAxiosPost } = vi.hoisted(() => ({
  mockAxiosPost: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    post: mockAxiosPost,
  },
}));

describe('extractJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses plain JSON', async () => {
    const { extractJson } = await import('../../../../src/services/ai/chatall-extractor.js');
    expect(extractJson('{"blNo":"ABC"}')).toEqual({ blNo: 'ABC' });
  });

  it('parses JSON inside markdown fence', async () => {
    const { extractJson } = await import('../../../../src/services/ai/chatall-extractor.js');
    const md = 'Here is the JSON:\n```json\n{"blNo":"X-1"}\n```\nDone.';
    expect(extractJson(md)).toEqual({ blNo: 'X-1' });
  });

  it('parses JSON inside non-language fence', async () => {
    const { extractJson } = await import('../../../../src/services/ai/chatall-extractor.js');
    const md = '```\n{"a":1,"b":[2,3]}\n```';
    expect(extractJson(md)).toEqual({ a: 1, b: [2, 3] });
  });

  it('extracts first balanced JSON block from surrounding text', async () => {
    const { extractJson } = await import('../../../../src/services/ai/chatall-extractor.js');
    const messy = 'Some preamble text {"k":"v","n":42} trailing text';
    expect(extractJson(messy)).toEqual({ k: 'v', n: 42 });
  });

  it('throws on empty input', async () => {
    const { extractJson } = await import('../../../../src/services/ai/chatall-extractor.js');
    expect(() => extractJson('')).toThrow(/rỗng/);
  });

  it('throws when no JSON can be found', async () => {
    const { extractJson } = await import('../../../../src/services/ai/chatall-extractor.js');
    expect(() => extractJson('just plain text no braces')).toThrow(/Không parse được/);
  });
});

describe('pickAiText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns string as-is', async () => {
    const { pickAiText } = await import('../../../../src/services/ai/chatall-extractor.js');
    expect(pickAiText('hello')).toBe('hello');
  });

  it('extracts from data field', async () => {
    const { pickAiText } = await import('../../../../src/services/ai/chatall-extractor.js');
    expect(pickAiText({ data: 'd' })).toBe('d');
  });

  it('extracts from nested res1.kwargs.content', async () => {
    const { pickAiText } = await import('../../../../src/services/ai/chatall-extractor.js');
    const payload = { data: { res1: { kwargs: { content: 'extracted' } } } };
    expect(pickAiText(payload)).toBe('extracted');
  });

  it('extracts from content/message/text/result/answer fields', async () => {
    const { pickAiText } = await import('../../../../src/services/ai/chatall-extractor.js');
    expect(pickAiText({ content: 'c' })).toBe('c');
    expect(pickAiText({ message: 'm' })).toBe('m');
    expect(pickAiText({ text: 't' })).toBe('t');
    expect(pickAiText({ result: 'r' })).toBe('r');
    expect(pickAiText({ answer: 'a' })).toBe('a');
  });

  it('returns empty string for null/undefined', async () => {
    const { pickAiText } = await import('../../../../src/services/ai/chatall-extractor.js');
    expect(pickAiText(null)).toBe('');
    expect(pickAiText(undefined)).toBe('');
  });

  it('skips empty strings and finds next non-empty', async () => {
    const { pickAiText } = await import('../../../../src/services/ai/chatall-extractor.js');
    expect(pickAiText({ data: '', content: 'real' })).toBe('real');
    expect(pickAiText({ data: '   ', content: 'real' })).toBe('real');
  });
});

describe('aiExtractFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs to AI_API_URL with content/modelType/modeName and parses JSON response', async () => {
    const apiResponse = {
      data: {
        res1: { kwargs: { content: '{"blNo":"BL-123"}' } },
      },
    };
    mockAxiosPost.mockResolvedValueOnce({ data: apiResponse });

    const { aiExtractFields } = await import('../../../../src/services/ai/chatall-extractor.js');
    const result = await aiExtractFields('extract the B/L number');

    expect(mockAxiosPost).toHaveBeenCalledWith(
      'http://ai.dadaex.cn/backapi/chatGpt/chatAll',
      { content: 'extract the B/L number', modelType: '2', modeName: 'gemini-3.5-flash' },
      expect.objectContaining({ timeout: 60_000, headers: { 'Content-Type': 'application/json' } }),
    );
    expect(result).toEqual({ blNo: 'BL-123' });
  });

  it('uses custom apiUrl/modelType/modeName from options', async () => {
    mockAxiosPost.mockResolvedValueOnce({ data: { res1: { kwargs: { content: '{}' } } } });

    const { aiExtractFields } = await import('../../../../src/services/ai/chatall-extractor.js');
    await aiExtractFields('test', {
      apiUrl: 'https://custom/api',
      modelType: '3',
      modeName: 'gpt-4',
    });

    expect(mockAxiosPost).toHaveBeenCalledWith(
      'https://custom/api',
      { content: 'test', modelType: '3', modeName: 'gpt-4' },
      expect.any(Object),
    );
  });

  it('falls back to pickAiText walker when res1.kwargs.content is empty', async () => {
    mockAxiosPost.mockResolvedValueOnce({
      data: { content: '{"x":1}' }, // direct content field
    });

    const { aiExtractFields } = await import('../../../../src/services/ai/chatall-extractor.js');
    const result = await aiExtractFields('test');
    expect(result).toEqual({ x: 1 });
  });

  it('propagates axios errors', async () => {
    mockAxiosPost.mockRejectedValueOnce(new Error('Network error'));

    const { aiExtractFields } = await import('../../../../src/services/ai/chatall-extractor.js');
    await expect(aiExtractFields('test')).rejects.toThrow('Network error');
  });

  it('throws when response JSON cannot be parsed', async () => {
    mockAxiosPost.mockResolvedValueOnce({
      data: { res1: { kwargs: { content: 'not json at all' } } },
    });

    const { aiExtractFields } = await import('../../../../src/services/ai/chatall-extractor.js');
    await expect(aiExtractFields('test')).rejects.toThrow(/Không parse được/);
  });
});

describe('ChatAllAiExtractor class', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('implements AiExtractor.aiExtractFields by delegating to function', async () => {
    mockAxiosPost.mockResolvedValueOnce({
      data: { res1: { kwargs: { content: '{"blNo":"X"}' } } },
    });

    const { ChatAllAiExtractor } = await import('../../../../src/services/ai/chatall-extractor.js');
    const ext = new ChatAllAiExtractor();
    const result = await ext.aiExtractFields('hello');
    expect(result).toEqual({ blNo: 'X' });
  });
});