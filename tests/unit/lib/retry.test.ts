import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../../../src/lib/retry.js';

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries up to maxRetries then throws', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 1 })).rejects.toThrow('boom');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('returns on success after failures', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockRejectedValueOnce(new Error('second'))
      .mockResolvedValueOnce('third-ok');
    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 1 });
    expect(result).toBe('third-ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('respects shouldRetry predicate (returns false → stop retrying)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('permanent'));
    await expect(
      withRetry(fn, { maxRetries: 5, baseDelayMs: 1, shouldRetry: () => false })
    ).rejects.toThrow('permanent');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
