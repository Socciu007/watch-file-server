import { startDownloadsWatcher } from './services/watcher/listen-downloads.js';

// Auto-start when run directly (not when imported as a module)
const isMain =
  import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;
if (isMain) {
  const watcher = startDownloadsWatcher();
  const shutdown = (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`[main] Shutting down (${signal})`);
    void watcher.close().then(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}