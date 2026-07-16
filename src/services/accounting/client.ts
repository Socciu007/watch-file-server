import axios, { AxiosError } from 'axios';
import { TransientError, PermanentError } from '../../lib/errors.js';
import { withRetry } from '../../lib/retry.js';
import type { InvoiceOutput } from '../../types/index.js';

export interface HttpAccountingClientOptions {
  baseUrl: string;
  token: string;
  timeoutMs: number;
  maxRetries: number;
  circuitBreaker: { failureThreshold: number; resetMs: number };
}

export interface AccountingApiClient {
  submit(invoice: InvoiceOutput): Promise<{ id: string }>;
}

type CircuitState = 'closed' | 'open' | 'half-open';

class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private openedAt = 0;

  constructor(
    private readonly failureThreshold: number,
    private readonly resetMs: number
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed < this.resetMs) {
        throw new TransientError('Circuit breaker is open');
      }
      this.state = 'half-open';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      if (err instanceof TransientError) {
        this.onFailure();
      }
      throw err;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      this.openedAt = Date.now();
    }
  }
}

export class HttpAccountingClient implements AccountingApiClient {
  private readonly http;
  private readonly breaker: CircuitBreaker;
  private readonly maxRetries: number;

  constructor(opts: HttpAccountingClientOptions) {
    this.http = axios.create({
      baseURL: opts.baseUrl,
      timeout: opts.timeoutMs,
      headers: { Authorization: `Bearer ${opts.token}` },
    });
    this.breaker = new CircuitBreaker(opts.circuitBreaker.failureThreshold, opts.circuitBreaker.resetMs);
    this.maxRetries = opts.maxRetries;
  }

  async submit(invoice: InvoiceOutput): Promise<{ id: string }> {
    return this.breaker.call(() =>
      withRetry(() => this.postOnce(invoice), {
        maxRetries: this.maxRetries,
        baseDelayMs: 1000,
        shouldRetry: (err) => err instanceof TransientError,
      })
    );
  }

  private async postOnce(invoice: InvoiceOutput): Promise<{ id: string }> {
    try {
      const res = await this.http.post('/invoices', invoice);
      const id = res.data?.id;
      if (typeof id !== 'string') {
        throw new PermanentError(`Accounting API returned no id: ${JSON.stringify(res.data)}`);
      }
      return { id };
    } catch (err) {
      throw classifyAxiosError(err);
    }
  }
}

function classifyAxiosError(err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError;
    const status = ax.response?.status;
    if (status === undefined) {
      return new TransientError(`Network error: ${ax.message}`, err);
    }
    if (status >= 500) {
      return new TransientError(`Server error ${status}: ${ax.message}`, err);
    }
    if (status >= 400) {
      return new PermanentError(`Client error ${status}: ${ax.message}`, err);
    }
  }
  return new PermanentError(`Unknown error: ${(err as Error).message}`, err);
}