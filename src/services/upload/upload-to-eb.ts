import fs from 'node:fs';
import axios, { type AxiosResponse } from 'axios';
import FormData from 'form-data';

export interface UploadResult {
  status: number;
  body: unknown;
}

export interface UploadOptions {
  apiUrl: string;
  timeoutMs?: number;
}

/**
 * Upload a file to the EB server as multipart/form-data.
 *
 * POST {apiUrl}
 *   field 'file' : the file stream
 *   field 'blNo' : the B/L number (used by server to route to destination folder)
 *
 * The remote endpoint (per the existing /vn/file handler pattern) stores the file at:
 *   ../../html/www.dadaex.cn/assets/upload/fyeb/{YYYY}/{MM}/{ebNo}-{code}-{oid}/
 *
 * `code` and `oid` are not provided here because the watcher has no req.body context;
 * the existing handler is expected to use defaults or derive them from the file/headers.
 */
export async function uploadToEb(
  filePath: string,
  blNo: string,
  opts: UploadOptions,
): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('blNo', blNo || '');

  const resp: AxiosResponse = await axios.post(opts.apiUrl, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: opts.timeoutMs ?? 60_000,
  });
  return { status: resp.status, body: resp.data };
}