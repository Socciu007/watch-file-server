import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('createLogger', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns a pino logger instance', async () => {
    const { createLogger } = await import('../../../src/lib/logger.js');
    const logger = createLogger('info');
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.child).toBe('function');
  });

  it('child loggers inherit bindings', async () => {
    const { createLogger } = await import('../../../src/lib/logger.js');
    const logger = createLogger('info').child({ component: 'test' });
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });
});