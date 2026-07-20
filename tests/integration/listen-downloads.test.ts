import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockWatcher, mockChokidar, mockAxiosPost } = vi.hoisted(() => {
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
    mockAxiosPost: vi.fn(),
  };
});

vi.mock('chokidar', () => ({
  default: mockChokidar,
}));

vi.mock('axios', () => ({
  default: { post: mockAxiosPost },
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
    const { startDownloadsWatcher } = await import('../../src/services/watcher/listen-downloads.js');
    const fakeOcr = {
      processImage: vi.fn().mockResolvedValue('IMG_TEXT'),
      processPdf: vi.fn().mockResolvedValue('PDF_TEXT'),
      processDocx: vi.fn().mockResolvedValue('DOCX_TEXT'),
    };

    const watcher = startDownloadsWatcher({
      ocr: fakeOcr,
      apiUrl: 'http://test/api',
      watchDir: 'C:/fake/downloads',
    });

    expect(watcher).toBeDefined();
    expect(watcher.close).toBeDefined();
    expect(mockChokidar.watch).toHaveBeenCalled();

    await watcher.close();
  });

  it('ignores files with unsupported extensions', async () => {
    const { startDownloadsWatcher } = await import('../../src/services/watcher/listen-downloads.js');
    const fakeOcr = {
      processImage: vi.fn(),
      processPdf: vi.fn(),
      processDocx: vi.fn(),
    };

    startDownloadsWatcher({
      ocr: fakeOcr,
      apiUrl: 'http://test/api',
      watchDir: 'C:/fake',
    });

    mockWatcher.emit('add', 'C:/fake/notes.txt');
    await new Promise((r) => setTimeout(r, 50));

    expect(fakeOcr.processImage).not.toHaveBeenCalled();
    expect(fakeOcr.processPdf).not.toHaveBeenCalled();
    expect(fakeOcr.processDocx).not.toHaveBeenCalled();
  });

  it('processes allowed file: detectKind → ocrByKind → aiExtractFields → uploadToEb', async () => {
    // Mock the AI API call: returns { blNo: 'BL-456' }
    mockAxiosPost.mockResolvedValueOnce({
      data: { res1: { kwargs: { content: '{"blNo":"BL-456"}' } } },
    });

    const { startDownloadsWatcher } = await import('../../src/services/watcher/listen-downloads.js');
    const fakeOcr = {
      processImage: vi.fn().mockResolvedValue('OCR_TEXT_CONTENT'),
      processPdf: vi.fn(),
      processDocx: vi.fn(),
    };

    startDownloadsWatcher({
      ocr: fakeOcr,
      apiUrl: 'http://test/api',
      watchDir: 'C:/fake',
    });

    mockWatcher.emit('add', 'C:/fake/invoice.png');
    await new Promise((r) => setTimeout(r, 200));

    expect(fakeOcr.processImage).toHaveBeenCalledWith('C:/fake/invoice.png');
    expect(mockAxiosPost).toHaveBeenCalledWith(
      'http://test/api',
      expect.objectContaining({}),
      expect.objectContaining({}),
    );
  });
});