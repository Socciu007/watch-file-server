export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  shouldRetry?: (err: unknown, attempt: number) => boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions
): Promise<T> {
  let lastErr: unknown;
  const totalAttempts = opts.maxRetries + 1;

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isLast = attempt === totalAttempts - 1;
      const shouldStop = opts.shouldRetry && !opts.shouldRetry(err, attempt);
      if (isLast || shouldStop) throw err;
      const delay = opts.baseDelayMs * Math.pow(4, attempt);
      await sleep(delay);
    }
  }

  throw lastErr;
}
