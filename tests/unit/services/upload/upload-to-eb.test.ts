import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

// Mock axios before importing the module under test
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

// Mock form-data
vi.mock('form-data', () => {
  return {
    default: class FormDataMock {
      append = vi.fn();
      getHeaders = vi.fn().mockReturnValue({ 'content-type': 'multipart/form-data; boundary=xxx' });
    },
  };
});

import axios from 'axios';
import { uploadToEb } from '../../../../src/services/upload/upload-to-eb.js';

const axiosPost = axios.post as unknown as ReturnType<typeof vi.fn>;
const fsCreateReadStream = vi.spyOn(fs, 'createReadStream');

describe('uploadToEb', () => {
  let tmpDir: string;
  let tmpFile: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tmpDir = mkdtempSync(path.join(tmpdir(), 'upload-test-'));
    tmpFile = path.join(tmpDir, 'invoice.pdf');
    writeFileSync(tmpFile, 'fake pdf content');
    fsCreateReadStream.mockReturnValue({} as any);
  });

  it('POSTs to apiUrl with file stream and blNo', async () => {
    axiosPost.mockResolvedValue({ status: 201, data: { id: 'srv-1' } });
    const result = await uploadToEb(tmpFile, 'ABC123', { apiUrl: 'https://api.example.com/upload' });

    expect(axiosPost).toHaveBeenCalledTimes(1);
    const [url, form, opts] = axiosPost.mock.calls[0]!;
    expect(url).toBe('https://api.example.com/upload');
    expect(form).toBeDefined();
    expect(opts).toMatchObject({
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    expect(opts?.headers).toMatchObject({
      'content-type': expect.stringContaining('multipart/form-data'),
    });
    expect(result).toEqual({ status: 201, body: { id: 'srv-1' } });
  });

  it('passes empty string when blNo is empty', async () => {
    axiosPost.mockResolvedValue({ status: 200, data: { ok: true } });
    await uploadToEb(tmpFile, '', { apiUrl: 'https://api.example.com/upload' });

    const [, form] = axiosPost.mock.calls[0]!;
    expect((form as any).append).toHaveBeenCalledWith('blNo', '');
  });

  it('respects custom timeoutMs option', async () => {
    axiosPost.mockResolvedValue({ status: 200, data: {} });
    await uploadToEb(tmpFile, 'ABC', { apiUrl: 'https://x', timeoutMs: 5000 });

    const [, , opts] = axiosPost.mock.calls[0]!;
    expect(opts?.timeout).toBe(5000);
  });

  it('uses default 60s timeout when not specified', async () => {
    axiosPost.mockResolvedValue({ status: 200, data: {} });
    await uploadToEb(tmpFile, 'ABC', { apiUrl: 'https://x' });

    const [, , opts] = axiosPost.mock.calls[0]!;
    expect(opts?.timeout).toBe(60_000);
  });

  it('propagates axios errors', async () => {
    axiosPost.mockRejectedValue(new Error('Network error'));
    await expect(uploadToEb(tmpFile, 'ABC', { apiUrl: 'https://x' })).rejects.toThrow('Network error');
  });
});