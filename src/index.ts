import 'dotenv/config';
import { loadEnv } from './config/env.js';
import { loadConfig } from './config/sources.js';
import { createLogger } from './lib/logger.js';
import { hashContent } from './lib/hash.js';
import { TesseractOcr } from './services/ocr/tesseract.js';
import { MockParser } from './services/parser/mock.js';
import { PdfTextExtractor } from './services/pdf-text/extractor.js';
import { HttpAccountingClient } from './services/accounting/client.js';
import { PrometheusMetrics } from './services/metrics/prometheus.js';
import { ChokidarWatchService } from './services/watcher/index.js';
import { PdfWorker } from './services/workers/pdf.js';
import { ImageWorker } from './services/workers/image.js';
import type { WorkerRole } from './types/index.js';

async function main() {
  const env = loadEnv();
  const configPath = process.env.CONFIG_PATH ?? './config.json';
  const config = loadConfig(configPath);
  const logger = createLogger(env.LOG_LEVEL).child({ component: 'main' });

  // Cap in-memory dedup Set to prevent unbounded growth on long-running bursts.
  const MAX_INFLIGHT_DEDUP = 1000;

  logger.info('Starting watch-file-server');

  // Init services
  const ocrService = new TesseractOcr({ lang: config.ocr.lang, binaryPath: config.ocr.binaryPath ?? undefined });
  const parser = new MockParser();
  const pdfExtractor = new PdfTextExtractor();
  const apiToken = process.env[config.accounting.authTokenEnv];
  const metricsToken = process.env[config.metrics.authTokenEnv];
  if (!apiToken) throw new Error(`Missing env ${config.accounting.authTokenEnv}`);
  if (!metricsToken) throw new Error(`Missing env ${config.metrics.authTokenEnv}`);

  const apiClient = new HttpAccountingClient({
    baseUrl: config.accounting.baseUrl,
    token: apiToken,
    timeoutMs: config.accounting.timeoutMs,
    maxRetries: Math.max(config.queues.pdf.maxRetries, config.queues.image.maxRetries),
    circuitBreaker: config.accounting.circuitBreaker,
  });

  const metrics = new PrometheusMetrics({
    endpoint: config.metrics.endpoint,
    token: metricsToken,
  });

  // In-memory dedup
  const inflight = new Set<string>();

  // Worker setup
  const role: WorkerRole = env.WORKER_ROLE;
  let pdfWorker: PdfWorker | undefined;
  let imageWorker: ImageWorker | undefined;

  const baseDeps = {
    ocrService,
    parser,
    apiClient,
    metrics,
    storage: config.storage,
    queueConfig: config.queues.pdf,
    logger,
  };

  if (role === 'all' || role === 'pdf-only') {
    pdfWorker = new PdfWorker({ ...baseDeps, queueConfig: config.queues.pdf, pdfExtractor });
    logger.info('PdfWorker started');
  }
  if (role === 'all' || role === 'image-only') {
    imageWorker = new ImageWorker({ ...baseDeps, queueConfig: config.queues.image });
    logger.info('ImageWorker started');
  }

  // Metrics flush interval
  const flushTimer = setInterval(() => void metrics.flush(), config.metrics.flushIntervalMs);

  // Graceful shutdown handler (registered early so signals during startup are caught)
  const SHUTDOWN_TIMEOUT_MS = 30_000;

  const withTimeout = async <T>(promise: Promise<T>, label: string): Promise<T | void> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<void>((resolve) => {
          timer = setTimeout(() => {
            logger.warn({ label, timeoutMs: SHUTDOWN_TIMEOUT_MS }, 'Shutdown step timed out');
            resolve();
          }, SHUTDOWN_TIMEOUT_MS);
        }),
      ]);
    } catch (err) {
      logger.error({ err, label }, 'Shutdown step failed');
    } finally {
      if (timer) clearTimeout(timer);
    }
    return;
  };

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    clearInterval(flushTimer);
    if (watcher) await withTimeout(watcher.stop(), 'watcher.stop');
    if (pdfWorker) await withTimeout(pdfWorker.drain(), 'pdfWorker.drain');
    if (imageWorker) await withTimeout(imageWorker.drain(), 'imageWorker.drain');
    await withTimeout(metrics.flush(), 'metrics.flush');
    await withTimeout(Promise.resolve(ocrService.terminate?.()), 'ocrService.terminate');
    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  // Watcher (only if at least one worker present)
  let watcher: ChokidarWatchService | undefined;
  if (pdfWorker || imageWorker) {
    watcher = new ChokidarWatchService({
      sources: config.sources,
      debounceMs: config.watcher.debounceMs,
      ignored: config.watcher.ignored,
      logger,
    });

    watcher.onFileReady(async (event) => {
      const dedupKey = hashContent(`${event.path}:${event.sizeBytes}`);
      if (inflight.has(dedupKey)) {
        logger.warn({ path: event.path }, 'Duplicate event skipped');
        return;
      }
      inflight.add(dedupKey);
      // FIFO eviction if Set grows beyond cap (Sets preserve insertion order)
      if (inflight.size > MAX_INFLIGHT_DEDUP) {
        const oldest = inflight.values().next().value;
        if (oldest !== undefined) inflight.delete(oldest);
      }

      try {
        if (event.extension === '.pdf' && pdfWorker) {
          pdfWorker.enqueue(event);
        } else if ((event.extension === '.png' || event.extension === '.jpg' || event.extension === '.jpeg') && imageWorker) {
          imageWorker.enqueue(event);
        }
      } finally {
        // Allow same file again if it appears again later (e.g., retry)
        setTimeout(() => inflight.delete(dedupKey), 5000);
      }
    });

    await watcher.start();
  } else {
    logger.warn('No workers started — running idle');
  }
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});