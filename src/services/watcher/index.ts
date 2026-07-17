import chokidar, { type FSWatcher } from 'chokidar';
import { stat } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import type { Logger } from 'pino';
import type { SourceConfig } from '../../config/schema.js';
import type { FileEvent } from '../../types/index.js';
import { debounceByStability } from './debounce.js';
import { routeFile } from './router.js';
import { PermanentError } from '../../lib/errors.js';

export interface WatchServiceOptions {
  sources: SourceConfig[];
  debounceMs: number;
  ignored: string[];
  logger: Logger;
}

interface WatchService {
  start(): Promise<void>;
  stop(): Promise<void>;
  onFileReady(handler: (event: FileEvent) => void | Promise<void>): void;
}

export class ChokidarWatchService implements WatchService {
  private watcher: FSWatcher | null = null;
  private handler: ((event: FileEvent) => void | Promise<void>) | null = null;
  private readonly debouncedObserve: (path: string, getSize: () => number, getNow: () => number) => void;

  constructor(private readonly opts: WatchServiceOptions) {
    this.debouncedObserve = debounceByStability(
      (path, size) => void this.emitEvent(path, size),
      opts.debounceMs
    );
  }

  onFileReady(handler: (event: FileEvent) => void | Promise<void>): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    const enabledSources = this.opts.sources.filter((s) => s.enabled);
    if (enabledSources.length === 0) {
      throw new PermanentError('No enabled sources to watch');
    }

    const paths = enabledSources.map((s) => s.path);
    const watcher = chokidar.watch(paths, {
      ignored: this.opts.ignored,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: false,
    });
    this.watcher = watcher;

    watcher.on('add', (filePath: string) => {
      this.observeSize(filePath);
    });

    watcher.on('change', (filePath: string) => {
      this.observeSize(filePath);
    });

    watcher.on('error', (err: unknown) => {
      this.opts.logger.error({ err }, 'Watcher error');
    });
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  private observeSize(filePath: string) {
    const poll = async () => {
      try {
        const s = await stat(filePath);
        this.debouncedObserve(filePath, () => s.size, () => Date.now());
      } catch (err) {
        this.opts.logger.error({ err, path: filePath }, 'Stat failed; will not emit');
      }
    };
    void poll();
  }

  private async emitEvent(path: string, size: number): Promise<void> {
    if (!this.handler) return;

    const route = routeFile(path);
    if (!route) {
      this.opts.logger.debug({ path }, 'Ignoring unsupported file');
      return;
    }

    const extension = extname(path).toLowerCase() as FileEvent['extension'];
    const source = [...this.opts.sources]
      .sort((a, b) => b.path.length - a.path.length)
      .find((s) => path.startsWith(s.path))?.name ?? 'unknown';

    const event: FileEvent = {
      source,
      path,
      filename: basename(path),
      extension,
      sizeBytes: size,
      detectedAt: new Date().toISOString(),
    };

    this.opts.logger.info({ event }, 'File ready');
    await this.handler(event);
  }
}

// Re-export for convenience (the test imports `{ WatchService }`)
export { ChokidarWatchService as WatchService };