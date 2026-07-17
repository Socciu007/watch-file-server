import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockWatcher, mockChokidar } = vi.hoisted(() => {
  // Plain object that mimics EventEmitter interface — must be defined inside vi.hoisted
  // because vitest's hoisting runs the callback before the class declarations below.
  const listeners: Record<string, Array<(p: string) => void>> = {};

  const w = {
    _listeners: listeners,
    on(event: string, cb: (p: string) => void) {
      (listeners[event] ??= []).push(cb);
      return w;
    },
    emit(event: string, p: string) {
      for (const cb of listeners[event] ?? []) cb(p);
      return true;
    },
    removeAllListeners() {
      for (const k of Object.keys(listeners)) delete listeners[k];
    },
    listenerCount(event: string) {
      return (listeners[event] ?? []).length;
    },
    close: vi.fn(async () => undefined),
  };

  return {
    mockWatcher: w,
    mockChokidar: {
      watch: vi.fn(() => w),
    },
  };
});

vi.mock('chokidar', () => ({
  default: mockChokidar,
}));

vi.mock('axios', () => ({
  default: { post: vi.fn().mockResolvedValue({ status: 201, data: { id: 'srv-1' } }) },
}));

vi.mock('form-data', () => ({
  default: class FormDataMock {
    append = vi.fn();
    getHeaders = vi.fn().mockReturnValue({});
  },
}));

describe('listen-downloads integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWatcher.removeAllListeners();
  });

  it('startDownloadsWatcher returns a chokidar instance', async () => {
    const { startDownloadsWatcher } = await import('../../src/index.js');
    const fakeOcr = {
      processImage: vi.fn().mockResolvedValue('IMG_TEXT'),
      processPdf: vi.fn().mockResolvedValue('PDF_TEXT'),
      processDocx: vi.fn().mockResolvedValue('DOCX_TEXT'),
    };
    const fakeAi = {
      aiExtractFields: vi.fn().mockResolvedValue({ blNo: 'BL-123' }),
    };

    const watcher = startDownloadsWatcher({
      ocr: fakeOcr,
      ai: fakeAi,
      apiUrl: 'http://test/api',
      watchDir: 'C:/fake/downloads',
    });

    expect(watcher).toBeDefined();
    expect(watcher.close).toBeDefined();
    expect(mockChokidar.watch).toHaveBeenCalled();

    await watcher.close();
  });

  it('ignores files with unsupported extensions', async () => {
    const { startDownloadsWatcher } = await import('../../src/index.js');
    const fakeOcr = {
      processImage: vi.fn(),
      processPdf: vi.fn(),
      processDocx: vi.fn(),
    };
    const fakeAi = { aiExtractFields: vi.fn() };

    startDownloadsWatcher({
      ocr: fakeOcr,
      ai: fakeAi,
      apiUrl: 'http://test/api',
      watchDir: 'C:/fake',
    });

    mockWatcher.emit('add', 'C:/fake/notes.txt');
    await new Promise((r) => setTimeout(r, 50));

    expect(fakeOcr.processImage).not.toHaveBeenCalled();
    expect(fakeOcr.processPdf).not.toHaveBeenCalled();
    expect(fakeOcr.processDocx).not.toHaveBeenCalled();
    expect(fakeAi.aiExtractFields).not.toHaveBeenCalled();
  });

  it('processes allowed file: detectKind → ocrByKind → aiExtract → uploadToEb', async () => {
    const { startDownloadsWatcher } = await import('../../src/index.js');
    const fakeOcr = {
      processImage: vi.fn().mockResolvedValue('OCR_TEXT_CONTENT'),
      processPdf: vi.fn(),
      processDocx: vi.fn(),
    };
    const fakeAi = { aiExtractFields: vi.fn().mockResolvedValue({ blNo: 'BL-456' }) };

    startDownloadsWatcher({
      ocr: fakeOcr,
      ai: fakeAi,
      apiUrl: 'http://test/api',
      watchDir: 'C:/fake',
    });

    mockWatcher.emit('add', 'C:/fake/invoice.png');
    await new Promise((r) => setTimeout(r, 200));

    expect(fakeOcr.processImage).toHaveBeenCalledWith('C:/fake/invoice.png');
    expect(fakeAi.aiExtractFields).toHaveBeenCalledWith('OCR_TEXT_CONTENT' + '. Hãy lấy thông tin số B\\L No và trả về dạng {blNo: string}.');
  });
});