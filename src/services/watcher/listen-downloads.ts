import path from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import { createLogger } from '../../lib/logger.js';
import { isAllowedFile } from '../../lib/allowed-extensions.js';
import { detectKind, ocrByKind } from '../ocr/ocr-by-kind.js';
import { type OcrProcessor, TesseractOcrProcessor } from '../ocr/ocr-processor.js';
import { aiExtractFields } from '../ai/ai-extractor.js';
import fs from 'node:fs';
import axios from 'axios';
import FormData from 'form-data';

const logger = createLogger('info').child({ component: 'listen-downloads' });
const WATCH_DIR = process.env.WATCH_DIR || '';
const AI_PROMPT = '. Hãy lấy thông tin số B\\L No và trả về dạng {blNo: string}.';
const API_URL = process.env.API_URL || '';
const UPLOAD_TIMEOUT_MS = 60_000;

// Upload the file to another server
export const uploadToEb = async (
  filePath: string,
  blNo: string,
): Promise<{ status: number; body: unknown }> => {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('blNo', blNo || '');

  const resp = await axios.post(API_URL, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 60_000,
  });
  return { status: resp.status, body: resp.data };
};

/**
 * Serial queue: each enqueued file waits for the previous to settle before running.
 * Errors do not break the chain (they're caught and logged inside the worker function).
 */
let queue: Promise<void> = Promise.resolve();

export interface StartDownloadsOptions {
  ocr?: OcrProcessor; // Override the OCR processor (e.g. wire in a tesseract.js impl in production).
  apiUrl?: string; // Override the API UPLOAD FILE to another server
  watchDir?: string; // Override the watch directory
}

// Handler the watcher for the file in the watch directory
export function startDownloadsWatcher(
  opts: StartDownloadsOptions = {},
): FSWatcher | undefined {
  const ocr: OcrProcessor = opts.ocr ?? new TesseractOcrProcessor();
  const apiUrl = opts.apiUrl ?? API_URL;
  const watchDir = opts.watchDir ?? WATCH_DIR;

  if (!watchDir) return;

  logger.info({ watchDir, apiUrl }, 'Listen file watching:');

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
        const aiResult = await aiExtractFields(ocrText + AI_PROMPT);
        console.log('aiResult', aiResult);

        let upload: { status: number; body: unknown } | null = null;
        let uploadError: string | null = null;
        if (aiResult && aiResult?.blNo) {
          try {
            upload = await uploadToEb(filePath, aiResult?.blNo as string);
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
          'Listen file action:',
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(
          { file: filePath, kind, message },
          'Listen file error action:',
        );
      }
    }).catch(() => {});
  });

  watcher.on('error', (err: unknown) => {
    logger.error({ err }, 'Listen file watcher error:');
  });

  return watcher;
}