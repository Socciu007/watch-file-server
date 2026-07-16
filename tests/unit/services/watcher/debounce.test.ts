import { describe, it, expect, vi } from 'vitest';
import { debounceByStability } from '../../../../src/services/watcher/debounce.js';

describe('debounceByStability', () => {
  it('emits once after size unchanged for debounceMs', async () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const check = debounceByStability(handler, 1000);

    const sizes = [100, 200, 200, 200];
    let now = 0;
    check('/a.pdf', () => sizes[Math.min(0, 0)]!, () => now);
    now = 100;
    check('/a.pdf', () => sizes[1]!, () => now);
    now = 500;
    check('/a.pdf', () => sizes[2]!, () => now);
    now = 1500;
    vi.advanceTimersByTime(1000);

    expect(handler).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('emits immediately when only one observation', async () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const check = debounceByStability(handler, 1000);

    check('/a.pdf', () => 100, () => 0);
    vi.advanceTimersByTime(1000);

    expect(handler).toHaveBeenCalledWith('/a.pdf', 100);
    vi.useRealTimers();
  });

  it('resets timer when size changes', async () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const check = debounceByStability(handler, 1000);

    check('/a.pdf', () => 100, () => 0);
    vi.advanceTimersByTime(500);
    check('/a.pdf', () => 200, () => 500); // size changed → reset
    vi.advanceTimersByTime(500); // not enough yet
    expect(handler).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500); // total 1000ms since size stabilized
    expect(handler).toHaveBeenCalledWith('/a.pdf', 200);
    vi.useRealTimers();
  });

  it('debounces different paths independently', async () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const check = debounceByStability(handler, 1000);

    // Observe both files with stable sizes
    check('/a.pdf', () => 100, () => 0);
    check('/b.pdf', () => 200, () => 0);

    // Advance time — both should fire
    vi.advanceTimersByTime(1000);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith('/a.pdf', 100);
    expect(handler).toHaveBeenCalledWith('/b.pdf', 200);
    vi.useRealTimers();
  });
});