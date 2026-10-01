import { describe, it, expect, vi, beforeEach } from 'vitest';

const { fakeParse, fakeReadFile, fakeFirecrawlCtor } = vi.hoisted(() => ({
  fakeParse: vi.fn(),
  fakeReadFile: vi.fn(),
  // We need a constructor mock that returns an object exposing `.parse`.
  // vi.fn() defaults work for `new fn()` only when the implementation uses
  // the `function` form (not arrow) so `new` can bind `this`. We achieve that
  // by having the mock *return* the client object instead of assigning to
  // `this` — callers then call `client.parse(...)` which we capture.
  fakeFirecrawlCtor: vi.fn(),
}));

vi.mock('firecrawl', () => ({
  // Each `new Firecrawl(...)` call returns the shared fake client object.
  Firecrawl: function FakeFirecrawlCtor() {
    return { parse: fakeParse };
  },
  // default export (some bundlers resolve this)
  default: { Firecrawl: function FakeFirecrawlCtor() { return { parse: fakeParse }; } },
}));

vi.mock('node:fs/promises', () => ({
  readFile: fakeReadFile,
}));

describe('parsePdf (Firecrawl)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads the file and returns markdown from a successful parse', async () => {
    const buffer = Buffer.from('fake-pdf-bytes');
    fakeReadFile.mockResolvedValueOnce(buffer);
    fakeParse.mockResolvedValueOnce({
      markdown: '# B/L No\nSITGSHCBZR0048',
      metadata: { title: 'Bill of Lading' },
    });

    const { parsePdf } = await import(
      '../../../../src/services/firecrawl/firecrawl-service.js'
    );

    const result = await parsePdf('C:/tmp/SXHRC26080193正本提单 (3).pdf');

    expect(fakeReadFile).toHaveBeenCalledWith('C:/tmp/SXHRC26080193正本提单 (3).pdf');
    expect(fakeParse).toHaveBeenCalledWith(
      {
        data: buffer,
        filename: 'SXHRC26080193正本提单 (3).pdf',
        contentType: 'application/pdf',
      },
      {
        formats: ['markdown'],
        onlyMainContent: true,
      },
    );
    expect(result).toBe('# B/L No\nSITGSHCBZR0048');
  });

  it('returns empty string when the server response has no markdown', async () => {
    fakeReadFile.mockResolvedValueOnce(Buffer.from('x'));
    fakeParse.mockResolvedValueOnce({ metadata: { title: 'empty' } });

    const { parsePdf } = await import(
      '../../../../src/services/firecrawl/firecrawl-service.js'
    );
    const result = await parsePdf('/empty.pdf');
    expect(result).toBe('');
  });

  it('treats a null markdown as empty string', async () => {
    fakeReadFile.mockResolvedValueOnce(Buffer.from('x'));
    fakeParse.mockResolvedValueOnce({ markdown: null });

    const { parsePdf } = await import(
      '../../../../src/services/firecrawl/firecrawl-service.js'
    );
    const result = await parsePdf('/null.pdf');
    expect(result).toBe('');
  });

  it('propagates errors from the SDK so callers can fall back', async () => {
    fakeReadFile.mockResolvedValueOnce(Buffer.from('x'));
    fakeParse.mockRejectedValueOnce(new Error('Firecrawl API 500'));

    const { parsePdf } = await import(
      '../../../../src/services/firecrawl/firecrawl-service.js'
    );
    await expect(parsePdf('/bad.pdf')).rejects.toThrow('Firecrawl API 500');
  });

  it('passes through custom formats and onlyMainContent=false when caller asks', async () => {
    fakeReadFile.mockResolvedValueOnce(Buffer.from('x'));
    fakeParse.mockResolvedValueOnce({ markdown: 'md' });

    const { parsePdf } = await import(
      '../../../../src/services/firecrawl/firecrawl-service.js'
    );
    await parsePdf('/x.pdf', {
      formats: ['markdown', 'html'],
      onlyMainContent: false,
    });

    expect(fakeParse).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        formats: ['markdown', 'html'],
        onlyMainContent: false,
      }),
    );
  });
});