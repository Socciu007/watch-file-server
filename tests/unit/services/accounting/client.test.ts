import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransientError, PermanentError } from '../../../../src/lib/errors.js';

vi.mock('axios', () => {
  const mockAxios: any = vi.fn();
  mockAxios.create = vi.fn(() => mockAxios);
  mockAxios.post = vi.fn();
  mockAxios.isAxiosError = vi.fn((err: any) => err?.isAxiosError === true);
  return { default: mockAxios };
});

describe('HttpAccountingClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts invoice and returns id on success', async () => {
    const axios = (await import('axios')).default as any;
    axios.post.mockResolvedValueOnce({ status: 201, data: { id: 'srv-123' } });

    const { HttpAccountingClient } = await import('../../../../src/services/accounting/client.js');
    const client = new HttpAccountingClient({
      baseUrl: 'https://api.example.com',
      token: 'test-token',
      timeoutMs: 1000,
      maxRetries: 1,
      circuitBreaker: { failureThreshold: 5, resetMs: 60000 },
    });

    const result = await client.submit({
      source: 'local',
      sourceFile: '/inbox/a.pdf',
      invoiceNumber: 'INV-1',
      vendorName: 'Acme',
      issueDate: '2026-07-16',
      totalAmount: 100,
      currency: 'USD',
      lineItems: [],
      processedAt: '2026-07-16T10:00:00Z',
    });

    expect(result).toEqual({ id: 'srv-123' });
  });

  it('throws TransientError on 5xx (will retry)', async () => {
    const axios = (await import('axios')).default as any;
    axios.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500 },
      message: 'server error',
    });

    const { HttpAccountingClient } = await import('../../../../src/services/accounting/client.js');
    const client = new HttpAccountingClient({
      baseUrl: 'https://api.example.com',
      token: 't',
      timeoutMs: 100,
      maxRetries: 0,
      circuitBreaker: { failureThreshold: 5, resetMs: 60000 },
    });

    await expect(client.submit({
      source: 's', sourceFile: 'p', invoiceNumber: null, vendorName: null,
      issueDate: null, totalAmount: null, currency: null, lineItems: [],
      processedAt: '2026-07-16T10:00:00Z',
    })).rejects.toBeInstanceOf(TransientError);
  });

  it('throws PermanentError on 4xx (no retry)', async () => {
    const axios = (await import('axios')).default as any;
    axios.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401 },
      message: 'unauthorized',
    });

    const { HttpAccountingClient } = await import('../../../../src/services/accounting/client.js');
    const client = new HttpAccountingClient({
      baseUrl: 'https://api.example.com',
      token: 't',
      timeoutMs: 100,
      maxRetries: 3,
      circuitBreaker: { failureThreshold: 5, resetMs: 60000 },
    });

    await expect(client.submit({
      source: 's', sourceFile: 'p', invoiceNumber: null, vendorName: null,
      issueDate: null, totalAmount: null, currency: null, lineItems: [],
      processedAt: '2026-07-16T10:00:00Z',
    })).rejects.toBeInstanceOf(PermanentError);
  });

  it('opens circuit after threshold failures', async () => {
    const axios = (await import('axios')).default as any;
    axios.post.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500 },
      message: 'fail',
    });

    const { HttpAccountingClient } = await import('../../../../src/services/accounting/client.js');
    const client = new HttpAccountingClient({
      baseUrl: 'https://api.example.com',
      token: 't',
      timeoutMs: 100,
      maxRetries: 0,
      circuitBreaker: { failureThreshold: 3, resetMs: 60000 },
    });

    const invoice = {
      source: 's', sourceFile: 'p', invoiceNumber: null, vendorName: null,
      issueDate: null, totalAmount: null, currency: null, lineItems: [],
      processedAt: '2026-07-16T10:00:00Z',
    };

    for (let i = 0; i < 3; i++) {
      await expect(client.submit(invoice)).rejects.toBeInstanceOf(TransientError);
    }

    await expect(client.submit(invoice)).rejects.toThrow(/Circuit/);
  });

  it('does not trip circuit breaker on PermanentError (auth failure)', async () => {
    const axios = (await import('axios')).default as any;
    axios.post.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
      message: 'unauthorized',
    });

    const { HttpAccountingClient } = await import('../../../../src/services/accounting/client.js');
    const { TransientError, PermanentError } = await import('../../../../src/lib/errors.js');
    const client = new HttpAccountingClient({
      baseUrl: 'https://api.example.com',
      token: 'bad-token',
      timeoutMs: 100,
      maxRetries: 0,
      circuitBreaker: { failureThreshold: 3, resetMs: 60000 },
    });

    const invoice = {
      source: 's', sourceFile: 'p', invoiceNumber: null, vendorName: null,
      issueDate: null, totalAmount: null, currency: null, lineItems: [],
      processedAt: '2026-07-16T10:00:00Z',
    };

    // Make more than threshold PermanentError calls
    for (let i = 0; i < 5; i++) {
      await expect(client.submit(invoice)).rejects.toBeInstanceOf(PermanentError);
    }

    // Circuit breaker should NOT be open — the next call should still attempt
    axios.post.mockResolvedValueOnce({ status: 201, data: { id: 'srv-1' } });
    await expect(client.submit(invoice)).resolves.toEqual({ id: 'srv-1' });
  });
});