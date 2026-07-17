import PQueue from 'p-queue';
import { rename } from 'node:fs/promises';
import { join } from 'node:path';
import type { Logger } from 'pino';
import type { FileEvent, InvoiceOutput } from '../../types/index.js';
import type { OcrService } from '../ocr/interface.js';
import type { InvoiceParser } from '../parser/interface.js';
import type { AccountingApiClient } from '../accounting/client.js';
import type { MetricsService } from '../metrics/interface.js';
import type { QueueConfig, StorageConfig } from '../../config/schema.js';
import { TransientError, PermanentError } from '../../lib/errors.js';
import { withRetry } from '../../lib/retry.js';

export interface BaseWorkerDeps {
  ocrService: OcrService;
  parser: InvoiceParser;
  apiClient: AccountingApiClient;
  metrics: MetricsService;
  storage: StorageConfig;
  queueConfig: QueueConfig;
  logger: Logger;
}

export abstract class BaseWorker<D extends BaseWorkerDeps = BaseWorkerDeps> {
  protected readonly queue: PQueue;
  protected readonly logger: Logger;

  constructor(protected readonly deps: D, loggerSuffix: string) {
    this.queue = new PQueue({ concurrency: deps.queueConfig.concurrency });
    this.logger = deps.logger.child({ component: loggerSuffix });
  }

  enqueue(event: FileEvent): void {
    void this.queue.add(() => this.handle(event));
  }

  async drain(): Promise<void> {
    await this.queue.onIdle();
  }

  size(): number {
    return this.queue.size;
  }

  protected abstract extractText(event: FileEvent): Promise<string>;

  private async handle(event: FileEvent): Promise<void> {
    const start = Date.now();
    const type = this.queueType();
    try {
      this.logger.info({ event: event.path }, 'Job started');

      const text = await this.extractText(event);
      const parsed = await this.deps.parser.parse(text, event);

      await withRetry(() => this.deps.apiClient.submit(parsed), {
        maxRetries: this.deps.queueConfig.maxRetries,
        baseDelayMs: 1000,
        shouldRetry: (err) => err instanceof TransientError,
      });

      await this.moveToProcessed(event);
      await this.deps.metrics.recordJobComplete(type, 'success', Date.now() - start);
      this.logger.info({ event: event.path, durationMs: Date.now() - start }, 'Job success');
    } catch (err) {
      await this.deps.metrics.recordJobComplete(type, 'fail', Date.now() - start);
      this.logger.error({ err, event: event.path }, 'Job failed');
      try {
        await this.moveToFailed(event);
      } catch (moveErr) {
        this.logger.error({ err: moveErr, event: event.path }, 'Failed to move to failed dir');
      }
    }
  }

  private async moveToProcessed(event: FileEvent): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const dir = join(this.deps.storage.processedDir, today);
    const target = join(dir, event.filename);
    await rename(event.path, target).catch(async (err) => {
      // Cross-device rename fails on Windows when source/dest on different drives
      // Fall back to copy + unlink is not ideal — just log and keep source
      this.logger.warn({ err, event: event.path, target }, 'Cannot rename processed file');
      throw new PermanentError(`Cannot move to processed: ${(err as Error).message}`);
    });
  }

  private async moveToFailed(event: FileEvent): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const dir = join(this.deps.storage.failedDir, today);
    const target = join(dir, event.filename);
    await rename(event.path, target).catch((err) => {
      this.logger.warn({ err, event: event.path, target }, 'Cannot rename failed file');
    });
  }

  protected abstract queueType(): 'pdf' | 'image';
}
