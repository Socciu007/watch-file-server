interface Observation {
  size: number;
  timer: ReturnType<typeof setTimeout> | null;
}

export function debounceByStability(
  handler: (path: string, size: number) => void,
  debounceMs: number
): (path: string, getSize: () => number, getNow: () => number) => void {
  const obs = new Map<string, Observation>();

  return (path: string, getSize: () => number, _getNow: () => number) => {
    const size = getSize();
    const existing = obs.get(path);

    if (existing && existing.timer) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
      try {
        handler(path, size);
      } finally {
        obs.delete(path);
      }
    }, debounceMs);

    obs.set(path, { size, timer });
  };
}