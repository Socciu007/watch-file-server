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
      { content: 'extract blNo', modelType: '2', modeName: 'gemini-3.5-flash' },
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
