import path from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import { createLogger } from '../../lib/logger.js';
import { isAllowedFile } from '../../lib/allowed-extensions.js';
import { detectKind, ocrByKind } from '../ocr/ocr-by-kind.js';
import {
  DefaultOcrProcessor,
  type OcrProcessor,
} from '../ocr/ocr-processor.js';
import {
  aiExtract,
  extractBlNo,
  DefaultAiExtractor,
  type AiExtractor,
} from '../ai/ai-extractor.js';
import { uploadToEb } from '../upload/upload-to-eb.js';

const logger = createLogger('info').child({ component: 'listen-downloads' });

const WATCH_DIR = process.env.WATCH_DIR ?? 'C:/Users/Administrator/Downloads';
const API_URL = process.env.API_URL ?? 'http://localhost:3001/vn/file';
const UPLOAD_TIMEOUT_MS = 60_000;

/**
 * Serial queue: each enqueued file waits for the previous to settle before running.
 * Errors do not break the chain (they're caught and logged inside the worker function).
 */
let queue: Promise<void> = Promise.resolve();

export interface StartDownloadsOptions {
  /** Override the OCR processor (e.g. wire in a tesseract.js impl in production). */
  ocr?: OcrProcessor;
  /** Override the AI extractor (e.g. wire in a real LLM client). */
  ai?: AiExtractor;
  /** Override the API URL. */
  apiUrl?: string;
  /** Override the watch directory. */
  watchDir?: string;
}

/**
 * Start the downloads watcher. Returns the chokidar FSWatcher so callers can close it on shutdown.
 */
export function startDownloadsWatcher(
  opts: StartDownloadsOptions = {},
): FSWatcher {
  const ocr: OcrProcessor = opts.ocr ?? new DefaultOcrProcessor();
  const ai: AiExtractor = opts.ai ?? new DefaultAiExtractor();
  const apiUrl = opts.apiUrl ?? API_URL;
  const watchDir = opts.watchDir ?? WATCH_DIR;

  logger.info({ watchDir, apiUrl }, '[Listen file] watching');

  const watcher = chokidar.watch(watchDir, {
    ignored: /(^|[\\/])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    depth: 0,
    awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 },
  });

  watcher.on('add', (filePath: string) => {
    if (!isAllowedFile(filePath)) return;

    queue = queue.then(async () => {
      const t0 = Date.now();
      const kind = detectKind(filePath);
      try {
        const ocrText = await ocrByKind(filePath, kind, ocr);
        const aiResult = await aiExtract(ocrText, ai);
        const blNo = extractBlNo(aiResult);

        let upload: { status: number; body: unknown } | null = null;
        let uploadError: string | null = null;
        if (blNo) {
          try {
            upload = await uploadToEb(filePath, blNo, {
              apiUrl,
              timeoutMs: UPLOAD_TIMEOUT_MS,
            });
            logger.info({ upload }, 'Upload');
          } catch (upErr: unknown) {
            uploadError = upErr instanceof Error ? upErr.message : String(upErr);
          }
        }

        logger.info(
          {
            file: path.basename(filePath),
            fullPath: filePath,
            kind,
            ocrLength: ocrText.length,
            ocrText: ocrText.slice(0, 500),
            ai: aiResult,
            upload: upload ? { status: upload.status, body: upload.body } : null,
            uploadError,
            durationMs: Date.now() - t0,
          },
          '[Listen file] action',
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(
          { file: filePath, kind, message },
          '[Listen file] error action',
        );
      }
    }).catch(() => {
      /* swallow — error already logged above */
    });
  });

  watcher.on('error', (err: unknown) => {
    logger.error({ err }, '[Listen file] watcher error');
  });

  return watcher;
}