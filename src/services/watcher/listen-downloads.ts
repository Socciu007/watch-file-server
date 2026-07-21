import path from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import { createLogger } from '../../lib/logger.js';
import { isAllowedFile } from '../../lib/allowed-extensions.js';
import { detectKind, ocrByKind } from '../ocr/ocr-by-kind.js';
import { type OcrProcessor, TesseractOcrProcessor } from '../ocr/ocr-processor.js';
import { aiExtractFields } from '../ai/ai-extractor.js';
import { HttpMailService, type MailService } from '../mail/send-mail.js';
import fs from 'node:fs';
import axios from 'axios';
import FormData from 'form-data';

const logger = createLogger('info').child({ component: 'listen-downloads' });
const WATCH_DIR = process.env.WATCH_DIR || '';
const AI_PROMPT = '. Hãy lấy thông tin số B\\L No và trả về dạng {blNo: string}.';
const API_URL = process.env.API_URL || '';
const MAIL_API_URL = process.env.MAIL_API_URL || 'https://vn2.dadaex.cn/api/moneyapi/mail';
const MAIL_TO = process.env.MAIL_TO || 'manhtien310701@gmail.com';
// Upload response schema — kept loose so we can display the full object
// (with all its server-defined fields) in the console without `any`.
export interface UploadResponse {
  id?: string;
  message?: string;
  status?: string | number;
  [key: string]: unknown;
}

// Upload the file to another server
export const uploadToEb = async (
  apiUpload: string,
  filePath: string,
  blNo: string,
): Promise<{ status: number; body: UploadResponse }> => {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('blNo', blNo || '');

  const resp = await axios.post(apiUpload, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 60_000,
  });
  return { status: resp.status, body: resp.data as UploadResponse };
};

/**
 * Serial queue: each enqueued file waits for the previous to settle before running.
 * Errors do not break the chain (they're caught and logged inside the worker function).
 */
let queue: Promise<void> = Promise.resolve();

export interface StartDownloadsOptions {
  ocr?: OcrProcessor; // Override the OCR processor (e.g. wire in a tesseract.js impl in production).
  apiUpload?: string; // Override the API UPLOAD FILE to another server
  watchDir?: string; // Override the watch directory
  /** Provide a custom MailService. If not provided, a default HttpMailService is auto-constructed using `mailApiUrl`. */
  mail?: MailService;
  mailTo?: string; // Optional override for mail recipient.
}

export function startDownloadsWatcher(
  opts: StartDownloadsOptions = {},
): FSWatcher | undefined {
  const ocr: OcrProcessor = opts.ocr ?? new TesseractOcrProcessor();
  const apiUpload = opts.apiUpload ?? API_URL;
  const watchDir = opts.watchDir ?? WATCH_DIR;
  const mailTo = opts.mailTo ?? MAIL_TO;
  const mail: MailService = opts.mail ?? new HttpMailService({ apiUrl: MAIL_API_URL });

  if (!watchDir) return;

  logger.info({ watchDir, apiUpload }, 'Listen file watching:');

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
      const baseName = path.basename(filePath);

      let ocrText = '';
      try {
        ocrText = await ocrByKind(filePath, kind, ocr);
      } catch (ocrErr: unknown) {
        const msg = ocrErr instanceof Error ? ocrErr.message : String(ocrErr);
        logger.error({ file: filePath, message: msg }, 'OCR failed:');
        await mail.send({
          subject: `[FILE] ${baseName}`,
          text: `OCR failed for ${filePath}: ${msg}`,
          to: mailTo,
        });
        return;
      }

      let aiResult: Record<string, unknown> | null = null;
      try {
        aiResult = await aiExtractFields(ocrText + AI_PROMPT);
      } catch (aiErr: unknown) {
        const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
        logger.error({ file: filePath, message: msg }, 'AI extract failed:');
        await mail.send({
          subject: `[FILE] ${baseName}`,
          text: `AI extract failed for ${filePath}: ${msg}\n\nOCR preview:\n${ocrText.slice(0, 500)}`,
          to: mailTo,
        });
        return;
      }

      let upload: { status: number; body: UploadResponse } | null = null;
      let uploadError: string | null = null;
      const blNo = typeof aiResult?.blNo === 'string' ? (aiResult.blNo as string) : '';
      if (blNo) {
        try {
          upload = await uploadToEb(apiUpload, filePath, blNo);
        } catch (upErr: unknown) {
          uploadError = upErr instanceof Error ? upErr.message : String(upErr);
          logger.error({ file: filePath, blNo, message: uploadError }, 'Upload failed:');
          await mail.send({
            subject: `[FILE] ${baseName}`,
            text: `Upload failed for ${filePath} (blNo=${blNo}): ${uploadError}`,
            to: mailTo,
          });
        }
      }

      if (blNo && upload && !uploadError) {
        await mail.send({
          subject: `[FILE] ${baseName}`,
          text: `Upload file ${baseName} with (blNo=${blNo}): ${upload?.body?.message}`,
          to: mailTo,
        });
      }

      logger.info(
        {
          file: baseName,
          fullPath: filePath,
          kind,
          ocrLength: ocrText.length,
          ai: aiResult,
          upload: upload ? upload.body.message : null,
          uploadError,
          durationMs: Date.now() - t0,
        },
        'Listen file action:',
      );
    }).catch(() => {});
  });

  watcher.on('error', (err: unknown) => {
    logger.error({ err }, 'Listen file watcher error:');
  });

  return watcher;
}
