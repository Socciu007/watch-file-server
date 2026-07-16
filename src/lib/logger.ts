import pino, { type Logger, type LevelWithSilent } from 'pino';

export function createLogger(level: string = 'info'): Logger {
  const validLevels: LevelWithSilent[] = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];
  const lvl = (validLevels as string[]).includes(level) ? (level as LevelWithSilent) : 'info';

  return pino({
    level: lvl,
    base: { service: 'watch-file-server' },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}