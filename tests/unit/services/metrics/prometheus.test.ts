import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('PrometheusMetrics', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('records jobs and flushes to endpoint', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    const { PrometheusMetrics } = await import('../../../../src/services/metrics/prometheus.js');
    const m = new PrometheusMetrics({
      endpoint: 'https://push.example.com/metrics',
      token: 'tok',
    });

    await m.recordJobComplete('pdf', 'success', 1500);
    await m.recordJobComplete('image', 'fail', 800);
    await m.flush();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe('https://push.example.com/metrics');
    const body = String(init.body);
    expect(body).toContain('invoice_watcher_jobs_total');
    expect(body).toContain('type="pdf"');
    expect(body).toContain('status="success"');
    expect(body).toContain('status="fail"');
    expect(body).toContain('invoice_watcher_job_duration_ms');
  });

  it('flush is a no-op when no jobs recorded', async () => {
    const { PrometheusMetrics } = await import('../../../../src/services/metrics/prometheus.js');
    const m = new PrometheusMetrics({
      endpoint: 'https://push.example.com/metrics',
      token: 'tok',
    });
    await m.flush();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not throw on push failure (logs and continues)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));

    const { PrometheusMetrics } = await import('../../../../src/services/metrics/prometheus.js');
    const m = new PrometheusMetrics({
      endpoint: 'https://push.example.com/metrics',
      token: 'tok',
    });

    await m.recordJobComplete('pdf', 'success', 100);
    await expect(m.flush()).resolves.not.toThrow();
  });

  it('preserves counters on push failure for retry', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    const { PrometheusMetrics } = await import('../../../../src/services/metrics/prometheus.js');
    const m = new PrometheusMetrics({
      endpoint: 'https://push.example.com/metrics',
      token: 'tok',
    });

    await m.recordJobComplete('pdf', 'success', 100);
    await m.flush(); // fails
    expect(mockFetch).toHaveBeenCalledTimes(1);

    await m.recordJobComplete('pdf', 'fail', 50);
    await m.flush(); // succeeds, should retry with combined counters

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const body = String(mockFetch.mock.calls[1]![1].body);
    expect(body).toContain('type="pdf"');
    expect(body).toContain('status="success"');
    expect(body).toContain('status="fail"');
    expect(body).toMatch(/invoice_watcher_jobs_total\{type="pdf",status="success"\} 1/);
    expect(body).toMatch(/invoice_watcher_jobs_total\{type="pdf",status="fail"\} 1/);
  });
});
