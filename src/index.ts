import 'dotenv/config';
import { startDownloadsWatcher } from './services/watcher/listen-downloads.js';

// PM2 sets a handful of env vars on every child it forks. Detect them so we
// can adapt behaviour to whichever runtime we're under.
const isUnderPm2 =
  process.env.PM2_HOME !== undefined ||
  process.env.pm_id !== undefined ||
  process.env.pm2_env !== undefined;

// Auto-start when run directly OR when started by PM2.
// Why PM2 is special: PM2 doesn't `node dist/index.js` our script directly.
// It runs `node pm2/lib/ProcessContainerFork.js`, which dynamically imports
// our file. So `process.argv[1]` is the wrapper's path, not ours — meaning
// the standard `import.meta.url === argv[1]` check returns false and we'd
// skip main() even though PM2 expects us to run. Treating PM2 as "main"
// fixes this without affecting tests (which import this module normally).
const isMain =
  isUnderPm2 ||
  import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;

if (isMain) {
  const watcher = startDownloadsWatcher();

  // PM2 7.x on Windows sends SIGINT as a "readiness probe" a few seconds
  // after start. Our graceful-exit handler would turn that probe into a
  // clean exit + restart loop, leaving chokidar no time to fire any 'add'
  // events. PM2 has its own signal handling, so we skip our handlers
  // entirely when running under PM2 and let it kill us directly when we
  // need to stop. Direct runs keep the graceful shutdown handlers.
  if (!isUnderPm2) {
    const shutdown = (signal: string) => {
      console.log(`[main] Shutting down (${signal})`);
      void watcher?.close().then(() => process.exit(0));
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }
}