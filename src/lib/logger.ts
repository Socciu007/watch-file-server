import pino, { type Logger, type LevelWithSilent } from 'pino';
import { Writable } from 'node:stream';

// ─────────────────────────────────────────────────────────────────────────────
//  ANSI color helpers (no-op when stdout is not a TTY)
// ─────────────────────────────────────────────────────────────────────────────

const ESC = '\x1b';
const RESET = `${ESC}[0m`;
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;

// Pino numeric levels → name
function levelName(level: number): string {
  if (level >= 60) return 'fatal';
  if (level >= 50) return 'error';
  if (level >= 40) return 'warn';
  if (level >= 30) return 'info';
  if (level >= 20) return 'debug';
  if (level >= 10) return 'trace';
  return 'silent';
}

const LEVEL_COLORS: Record<string, string> = {
  fatal: `${ESC}[1;35m`, // bold magenta
  error: `${ESC}[1;31m`, // bold red
  warn:  `${ESC}[1;33m`, // bold yellow
  info:  `${ESC}[1;32m`, // bold green
  debug: `${ESC}[36m`,   // cyan
  trace: `${ESC}[90m`,   // gray
  silent: `${ESC}[90m`,
};

const TIMESTAMP_COLOR = DIM;
const COMPONENT_COLOR = `${ESC}[36m`; // cyan
const PID_COLOR = DIM;

/**
 * Parse a single JSON pino log line and emit a colored, human-friendly version.
 * Falls back to the raw line if parsing fails.
 */
function colorizeLine(line: string): string {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(line);
  } catch {
    return line;
  }

  const lvlNum = typeof obj.level === 'number' ? obj.level : 30;
  const name = levelName(lvlNum);
  const color = LEVEL_COLORS[name] ?? '';
  const padded = name.toUpperCase().padEnd(5);
  const lvlText = `${color}${BOLD}${padded}${RESET}`;

  const parts: string[] = [];
  if (typeof obj.time === 'string') {
    parts.push(`${TIMESTAMP_COLOR}${new Date(obj.time).toLocaleTimeString()}${RESET}`);
  }
  parts.push(lvlText);
  if (typeof obj.component === 'string') {
    parts.push(`${COMPONENT_COLOR}[${obj.component}]${RESET}`);
  }
  if (typeof obj.pid === 'number') {
    parts.push(`${PID_COLOR}[${obj.pid}]${RESET}`);
  }
  if (typeof obj.msg === 'string') {
    parts.push(obj.msg);
  }

  let out = parts.join(' ');
  if (typeof obj.msg === 'string' && obj.msg.length < 60) {
    // Append scalar fields only for short messages; long ones are usually
    // already-formatted multi-field lines that shouldn't be appended to.
    const extras: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      if (['level', 'time', 'pid', 'component', 'msg', 'service'].includes(k)) continue;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        extras.push(`${TIMESTAMP_COLOR}${k}${RESET}=${v}`);
      }
    }
    if (extras.length > 0) {
      out += `  ${extras.join(' ')}`;
    }
  }
  return out;
}

/**
 * Wrap stdout with a Writable that colorizes pino JSON lines. Only colors
 * when stdout is a TTY (otherwise JSON passes through unchanged — preserves
 * log aggregation, grep-ability, and avoids escape codes in CI output).
 */
function makeColoredDestination(): Writable {
  const shouldColor = process.stdout.isTTY === true && process.env.NO_COLOR !== '1';
  return new Writable({
    write(chunk: Buffer, _enc, callback): void {
      const text = chunk.toString('utf8');
      const out = shouldColor
        ? text
            .split('\n')
            .map((line: string) => (line.length > 0 ? colorizeLine(line) : ''))
            .join('\n')
        : text;
      process.stdout.write(out);
      callback();
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createLogger(level: string = 'info'): Logger {
  const validLevels: LevelWithSilent[] = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];
  const lvl = (validLevels as string[]).includes(level) ? (level as LevelWithSilent) : 'info';

  return pino(
    {
      level: lvl,
      base: { service: 'watch-file-server' },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    makeColoredDestination(),
  );
}