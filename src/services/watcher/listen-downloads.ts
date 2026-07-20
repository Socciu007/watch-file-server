import path from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import { createLogger } from '../../lib/logger.js';
import { isAllowedFile } from '../../lib/allowed-extensions.js';
import { detectKind, ocrByKind } from '../ocr/ocr-by-kind.js';
import { type OcrProcessor, TesseractOcrProcessor } from '../ocr/ocr-processor.js';
import { aiExtractFields } from '../ai/ai-extractor.js';
import {
  sendMailBestEffort,
  type MailService,
} from '../mail/send-mail.js';
import fs from 'node:fs';
import axios from 'axios';
import FormData from 'form-data';

const logger = createLogger('info').child({ component: 'listen-downloads' });
const WATCH_DIR = process.env.WATCH_DIR || '';
const AI_PROMPT = '. Hãy lấy thông tin số B\\L No và trả về dạng {blNo: string}.';
const API_URL = process.env.API_URL || '';
const MAIL_TO = process.env.MAIL_TO || '904288354@qq.com';

// Upload the file to another server
export const uploadToEb = async (
  apiUrl: string,
  filePath: string,
  blNo: string,
): Promise<{ status: number; body: unknown }> => {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('blNo', blNo || '');

  const resp = await axios.post(apiUrl, form, {
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
  mail?: MailService; // Optional — if provided, sends notifications on errors and on successful upload.
  mailTo?: string; // Optional override for mail recipient.
}

export function startDownloadsWatcher(
  opts: StartDownloadsOptions = {},
): FSWatcher | undefined {
  const ocr: OcrProcessor = opts.ocr ?? new TesseractOcrProcessor();
  const apiUrl = opts.apiUrl ?? API_URL;
  const watchDir = opts.watchDir ?? WATCH_DIR;
  const mail = opts.mail;
  const mailTo = opts.mailTo ?? MAIL_TO;

  if (!watchDir) return;

  logger.info({ watchDir, apiUrl, mailTo: mail ? mailTo : '(disabled)' }, 'Listen file watching:');

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

      // ---------- Step 1: OCR ----------
      let ocrText = '';
      try {
        ocrText = await ocrByKind(filePath, kind, ocr);
      } catch (ocrErr: unknown) {
        const msg = ocrErr instanceof Error ? ocrErr.message : String(ocrErr);
        logger.error({ file: filePath, kind, message: msg }, 'OCR failed:');
        await sendMailBestEffort(mail, {
          subject: `[OCR FAIL] ${baseName}`,
          text: `OCR failed for ${filePath} (${kind}): ${msg}`,
          to: mailTo,
        });
        return;
      }

      // ---------- Step 2: AI ----------
      let aiResult: Record<string, unknown> | null = null;
      try {
        aiResult = await aiExtractFields(ocrText + AI_PROMPT);
      } catch (aiErr: unknown) {
        const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
        logger.error({ file: filePath, message: msg }, 'AI extract failed:');
        await sendMailBestEffort(mail, {
          subject: `[AI FAIL] ${baseName}`,
          text: `AI extract failed for ${filePath}: ${msg}\n\nOCR preview:\n${ocrText.slice(0, 500)}`,
          to: mailTo,
        });
        return;
      }

      console.log('aiResult', aiResult);

      // ---------- Step 3: Upload ----------
      let upload: { status: number; body: unknown } | null = null;
      let uploadError: string | null = null;
      const blNo = typeof aiResult?.blNo === 'string' ? (aiResult.blNo as string) : '';

      if (blNo) {
        try {
          upload = await uploadToEb(apiUrl, filePath, blNo);
          console.log('uploadToEb', upload);
        } catch (upErr: unknown) {
          uploadError = upErr instanceof Error ? upErr.message : String(upErr);
          logger.error({ file: filePath, blNo, message: uploadError }, 'Upload failed:');
          await sendMailBestEffort(mail, {
            subject: `[UPLOAD FAIL] [${blNo}]-${baseName}`,
            text: `Upload failed for ${filePath} (blNo=${blNo}): ${uploadError}`,
            to: mailTo,
          });
        }
      }

      // ---------- Step 4: Success notification ----------
      if (blNo && upload && !uploadError) {
        await sendMailBestEffort(mail, {
          subject: `[${blNo}]-EB`,
          text: `${blNo}: filled trailer company on EB system.`,
          to: mailTo,
        });
      }

      logger.info(
        {
          file: baseName,
          fullPath: filePath,
          kind,
          ocrLength: ocrText.length,
          ai: aiResult?.blNo,
          upload: upload ? { status: upload.status, body: upload.body } : null,
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
