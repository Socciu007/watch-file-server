import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAxiosPost } = vi.hoisted(() => ({
  mockAxiosPost: vi.fn(),
}));

vi.mock('axios', () => ({
  default: { post: mockAxiosPost },
}));

describe('aiExtractFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs to AI_API_URL with content/modelType/modeName', async () => {
    mockAxiosPost.mockResolvedValueOnce({
      data: { res1: { kwargs: { content: '{"blNo":"BL-1"}' } } },
    });
    const { aiExtractFields } = await import('../../../../src/services/ai/ai-extractor.js');
    const result = await aiExtractFields('extract blNo');
    expect(mockAxiosPost).toHaveBeenCalledWith(
      'http://ai.dadaex.cn/backapi/chatGpt/chatAll',
      { content: 'extract blNo', modelType: '2', modeName: 'gemini-2.5-flash-lite' },
      expect.objectContaining({ timeout: 60_000 }),
    );
    expect(result).toEqual({ blNo: 'BL-1' });
  });

  it('falls back to pickAiText walker when res1.kwargs.content is empty', async () => {
    mockAxiosPost.mockResolvedValueOnce({ data: { content: '{"x":1}' } });
    const { aiExtractFields } = await import('../../../../src/services/ai/ai-extractor.js');
    expect(await aiExtractFields('test')).toEqual({ x: 1 });
  });

  it('throws when response JSON cannot be parsed', async () => {
    mockAxiosPost.mockResolvedValueOnce({
      data: { res1: { kwargs: { content: 'not json at all' } } },
    });
    const { aiExtractFields } = await import('../../../../src/services/ai/ai-extractor.js');
    await expect(aiExtractFields('test')).rejects.toThrow(/Cannot parse JSON/);
  });
});

describe('extractJson — repair of common AI malformations', () => {
  it('parses valid JSON as-is', async () => {
    const { extractJson } = await import('../../../../src/services/ai/ai-extractor.js');
    expect(extractJson('{"blNo":"BL-1"}')).toEqual({ blNo: 'BL-1' });
  });

  it('repairs unquoted keys (single field)', async () => {
    const { extractJson } = await import('../../../../src/services/ai/ai-extractor.js');
    // Real-world failure: model returns a JS-object-literal fragment.
    expect(extractJson('{blNo: "ONEYSHAGV6722400"}')).toEqual({
      blNo: 'ONEYSHAGV6722400',
    });
  });

  it('repairs unquoted keys (multiple fields)', async () => {
    const { extractJson } = await import('../../../../src/services/ai/ai-extractor.js');
    expect(extractJson('{blNo: "X", name: "John"}')).toEqual({
      blNo: 'X',
      name: 'John',
    });
  });

  it('repairs trailing commas', async () => {
    const { extractJson } = await import('../../../../src/services/ai/ai-extractor.js');
    expect(extractJson('{"a": 1, "b": 2,}')).toEqual({ a: 1, b: 2 });
  });

  it('repairs unquoted keys + trailing commas together', async () => {
    const { extractJson } = await import('../../../../src/services/ai/ai-extractor.js');
    expect(extractJson('{blNo: "X", name: "John",}')).toEqual({
      blNo: 'X',
      name: 'John',
    });
  });

  it('still extracts from ```json``` fence after sanitizing', async () => {
    const { extractJson } = await import('../../../../src/services/ai/ai-extractor.js');
    const fenced = '```json\n{blNo: "ONEYSHAGV6722400"}\n```';
    expect(extractJson(fenced)).toEqual({ blNo: 'ONEYSHAGV6722400' });
  });

  it('extracts a JSON block embedded in surrounding prose', async () => {
    const { extractJson } = await import('../../../../src/services/ai/ai-extractor.js');
    const prose =
      'Here is the extracted field:\n{blNo: "ONEYSHAGV6722400"}\nLet me know if you need more.';
    expect(extractJson(prose)).toEqual({ blNo: 'ONEYSHAGV6722400' });
  });

  it('skips a stray `{` in prose and parses the next balanced block', async () => {
    const { extractJson } = await import('../../../../src/services/ai/ai-extractor.js');
    // First `{...}` is unparseable garbage; the second one is the real answer.
    const text = '{not valid\n{"blNo": "BL-2"}';
    expect(extractJson(text)).toEqual({ blNo: 'BL-2' });
  });

  it('throws on truly garbage input', async () => {
    const { extractJson } = await import('../../../../src/services/ai/ai-extractor.js');
    expect(() => extractJson('not json at all')).toThrow(/Cannot parse JSON/);
  });
});
