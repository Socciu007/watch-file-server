import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAxiosInstance } = vi.hoisted(() => ({
  mockAxiosInstance: {
    post: vi.fn(),
  },
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

describe('HttpMailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs to apiUrl with subject/text/to', async () => {
    mockAxiosInstance.post.mockResolvedValueOnce({ status: 200, data: { ok: true } });

    const { HttpMailService } = await import(
      '../../../../src/services/mail/send-mail.js'
    );
    const mail = new HttpMailService({ apiUrl: 'https://mail.example.com/api' });
    await mail.send({ subject: 'Hello', text: 'World', to: 'a@b.com' });

    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      'https://mail.example.com/api',
      { subject: 'Hello', text: 'World', to: 'a@b.com' },
    );
  });

  it('swallows errors silently (best-effort: never throws)', async () => {
    mockAxiosInstance.post.mockRejectedValueOnce(new Error('Network error'));

    const { HttpMailService } = await import(
      '../../../../src/services/mail/send-mail.js'
    );
    const mail = new HttpMailService({ apiUrl: 'https://x' });
    // Should not throw — that's the whole point of best-effort
    await expect(
      mail.send({ subject: 's', text: 't', to: 'a' }),
    ).resolves.toBeUndefined();
  });

  it('returns void on success and on failure', async () => {
    const { HttpMailService } = await import(
      '../../../../src/services/mail/send-mail.js'
    );
    const mail = new HttpMailService({ apiUrl: 'https://x' });

    mockAxiosInstance.post.mockResolvedValueOnce({});
    expect(
      await mail.send({ subject: 's', text: 't', to: 'a' }),
    ).toBeUndefined();

    mockAxiosInstance.post.mockRejectedValueOnce(new Error('oops'));
    expect(
      await mail.send({ subject: 's', text: 't', to: 'a' }),
    ).toBeUndefined();
  });
});
