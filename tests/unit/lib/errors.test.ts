import { describe, it, expect } from 'vitest';
import { TransientError, PermanentError, ConfigError } from '../../../src/lib/errors.js';

describe('errors', () => {
  it('TransientError extends Error and stores cause', () => {
    const cause = new Error('network');
    const err = new TransientError('timeout', cause);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('timeout');
    expect(err.cause).toBe(cause);
  });

  it('PermanentError extends Error', () => {
    const err = new PermanentError('bad pdf');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('bad pdf');
  });

  it('ConfigError extends Error', () => {
    const err = new ConfigError('missing ACCOUNTING_API_TOKEN');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('missing ACCOUNTING_API_TOKEN');
  });
});
