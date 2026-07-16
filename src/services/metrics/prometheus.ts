import type { MetricsService } from './interface.js';
import { createLogger } from '../../lib/logger.js';

interface JobKey {
  type: 'pdf' | 'image';
  status: 'success' | 'fail';
}

interface Counters {
  count: number;
  totalDurationMs: number;
}

export interface PrometheusMetricsOptions {
  endpoint: string;
  token: string;
}

export class PrometheusMetrics implements MetricsService {
  private readonly counters = new Map<string, Counters>();
  private readonly endpoint: string;
  private readonly token: string;
  private readonly logger = createLogger('info').child({ component: 'metrics' });

  constructor(opts: PrometheusMetricsOptions) {
    this.endpoint = opts.endpoint;
    this.token = opts.token;
  }

  async recordJobComplete(type: 'pdf' | 'image', status: 'success' | 'fail', durationMs: number): Promise<void> {
    const key = this.keyFor({ type, status });
    const existing = this.counters.get(key) ?? { count: 0, totalDurationMs: 0 };
    existing.count += 1;
    existing.totalDurationMs += durationMs;
    this.counters.set(key, existing);
  }

  async flush(): Promise<void> {
    if (this.counters.size === 0) return;

    const lines: string[] = [];
    lines.push('# HELP invoice_watcher_jobs_total Total invoice processing jobs');
    lines.push('# TYPE invoice_watcher_jobs_total counter');

    for (const [key, c] of this.counters) {
      const { type, status } = this.parseKey(key);
      lines.push(`invoice_watcher_jobs_total{type="${type}",status="${status}"} ${c.count}`);
    }

    lines.push('# HELP invoice_watcher_job_duration_ms Job processing duration in ms');
    lines.push('# TYPE invoice_watcher_job_duration_ms summary');
    for (const [key, c] of this.counters) {
      const { type, status } = this.parseKey(key);
      const avg = c.count > 0 ? Math.round(c.totalDurationMs / c.count) : 0;
      lines.push(`invoice_watcher_job_duration_ms{type="${type}",status="${status}"} ${avg}`);
    }

    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          Authorization: `Bearer ${this.token}`,
        },
        body: lines.join('\n'),
      });
      if (!res.ok) {
        throw new Error(`Metrics push failed: HTTP ${res.status}`);
      }
      this.counters.clear();
    } catch (err) {
      this.logger.warn({ err }, 'Metrics push failed; will retry on next flush');
    }
  }

  private keyFor(k: JobKey): string {
    return `${k.type}|${k.status}`;
  }

  private parseKey(key: string): JobKey {
    const [type, status] = key.split('|') as ['pdf' | 'image', 'success' | 'fail'];
    return { type, status };
  }
}
