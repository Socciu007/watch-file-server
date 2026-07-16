import { describe, it, expect } from 'vitest';
import { loadEnv } from '../../../src/config/env.js';

describe('loadEnv', () => {
  it('returns parsed env with required fields', () => {
    process.env.ACCOUNTING_API_TOKEN = 'test-token';
    process.env.METRICS_PUSH_TOKEN = 'metrics-token';
    const env = loadEnv();
    expect(env.ACCOUNTING_API_TOKEN).toBe('test-token');
    expect(env.METRICS_PUSH_TOKEN).toBe('metrics-token');
    expect(env.WORKER_ROLE).toBe('all');
    expect(env.LOG_LEVEL).toBe('info');
    delete process.env.ACCOUNTING_API_TOKEN;
    delete process.env.METRICS_PUSH_TOKEN;
  });

  it('throws ConfigError when required field missing', () => {
    const saved = process.env.ACCOUNTING_API_TOKEN;
    delete process.env.ACCOUNTING_API_TOKEN;
    expect(() => loadEnv()).toThrow(/ACCOUNTING_API_TOKEN/);
    if (saved) process.env.ACCOUNTING_API_TOKEN = saved;
  });
});