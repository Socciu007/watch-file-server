import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockWatcher, watchMock } = vi.hoisted(() => {
  const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
  const mockWatcher = {
    on(event: string, fn: (...args: unknown[]) => void) {
      (handlers[event] ||= []).push(fn);
      return this;
    },
    emit(event: string, ...args: unknown[]) {
      for (const fn of handlers[event] ?? []) fn(...args);
      return true;
    },
    listenerCount(event: string) {
      return (handlers[event] ?? []).length;
    },
    removeAllListeners() {
      for (const key of Object.keys(handlers)) delete handlers[key];
    },
    close: vi.fn(async () => undefined),
  };
  const watchMock = vi.fn(() => mockWatcher);
  return { mockWatcher, watchMock };
});

vi.mock('chokidar', () => ({
  default: {
    watch: watchMock,
  },
}));

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    stat: vi.fn(async () => ({ size: 1234 })),
  };
});

describe('WatchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWatcher.removeAllListeners();
  });

  it('emits FileEvent for .pdf add events after stability', async () => {
    const { WatchService } = await import('../../../../src/services/watcher/index.js');
    const chokidar = (await import('chokidar')).default;

    const svc = new WatchService({
      sources: [{ name: 'test', path: '/inbox', enabled: true }],
      debounceMs: 50,
      ignored: [],
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() } as any,
    });

    const handler = vi.fn();
    svc.onFileReady(handler);

    await svc.start();
    expect(chokidar.watch).toHaveBeenCalled();

    mockWatcher.emit('add', '/inbox/inv1.pdf');
    await new Promise((r) => setTimeout(r, 200));

    expect(handler).toHaveBeenCalledTimes(1);
    const evt = handler.mock.calls[0]![0];
    expect(evt.extension).toBe('.pdf');
    expect(evt.filename).toBe('inv1.pdf');
    expect(evt.source).toBe('test');
    expect(evt.sizeBytes).toBe(1234);

    await svc.stop();
  });

  it('ignores files with unsupported extension', async () => {
    const { WatchService } = await import('../../../../src/services/watcher/index.js');

    const svc = new WatchService({
      sources: [{ name: 'test', path: '/inbox', enabled: true }],
      debounceMs: 10,
      ignored: [],
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() } as any,
    });

    const handler = vi.fn();
    svc.onFileReady(handler);

    await svc.start();
    mockWatcher.emit('add', '/inbox/readme.txt');
    await new Promise((r) => setTimeout(r, 50));

    expect(handler).not.toHaveBeenCalled();
    await svc.stop();
  });

  it('subscribes to change events for size stability', async () => {
    const chokidar = (await import('chokidar')).default as any;
    const { WatchService } = await import('../../../../src/services/watcher/index.js');
    const svc = new WatchService({
      sources: [{ name: 'test', path: '/inbox', enabled: true }],
      debounceMs: 50,
      ignored: [],
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() } as any,
    });

    const handler = vi.fn();
    svc.onFileReady(handler);

    await svc.start();
    expect(chokidar.watch).toHaveBeenCalled();
    expect(mockWatcher.listenerCount('change')).toBeGreaterThan(0);

    await svc.stop();
  });

  it('attributes nested paths to longest matching source', async () => {
    const { WatchService } = await import('../../../../src/services/watcher/index.js');
    const svc = new WatchService({
      sources: [
        { name: 'inbox', path: '/inbox', enabled: true },
        { name: 'inbox-sub', path: '/inbox/sub', enabled: true },
      ],
      debounceMs: 10,
      ignored: [],
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() } as any,
    });

    const handler = vi.fn();
    svc.onFileReady(handler);
    await svc.start();

    mockWatcher.emit('add', '/inbox/sub/file.pdf');
    await new Promise((r) => setTimeout(r, 100));

    expect(handler).toHaveBeenCalledTimes(1);
    const evt = handler.mock.calls[0]![0];
    expect(evt.source).toBe('inbox-sub');

    await svc.stop();
  });
});