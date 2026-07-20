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

  it('propagates axios errors', async () => {
    mockAxiosInstance.post.mockRejectedValueOnce(new Error('Network error'));

    const { HttpMailService } = await import(
      '../../../../src/services/mail/send-mail.js'
    );
    const mail = new HttpMailService({ apiUrl: 'https://x' });
    await expect(
      mail.send({ subject: 's', text: 't', to: 'a' }),
    ).rejects.toThrow('Network error');
  });
});

describe('sendMailBestEffort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns silently if mail is undefined (disabled)', async () => {
    const { sendMailBestEffort } = await import(
      '../../../../src/services/mail/send-mail.js'
    );
    await expect(
      sendMailBestEffort(undefined, { subject: 's', text: 't', to: 'a' }),
    ).resolves.toBeUndefined();
    expect(mockAxiosInstance.post).not.toHaveBeenCalled();
  });

  it('swallows mail.send errors (does not throw)', async () => {
    const send = vi.fn().mockRejectedValue(new Error('mail failed'));
    const { sendMailBestEffort } = await import(
      '../../../../src/services/mail/send-mail.js'
    );
    await expect(
      sendMailBestEffort({ send }, { subject: 's', text: 't', to: 'a' }),
    ).resolves.toBeUndefined();
  });

  it('calls mail.send with the given options on success', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const { sendMailBestEffort } = await import(
      '../../../../src/services/mail/send-mail.js'
    );
    await sendMailBestEffort({ send }, { subject: 'S', text: 'T', to: 'x' });
    expect(send).toHaveBeenCalledWith({ subject: 'S', text: 'T', to: 'x' });
  });
});