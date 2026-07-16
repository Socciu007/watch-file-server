const PDF_EXT = new Set(['.pdf']);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg']);

export type RouteTarget = 'pdf' | 'image';

export function routeFile(filename: string): RouteTarget | null {
  const lower = filename.toLowerCase();
  const dotIndex = lower.lastIndexOf('.');
  if (dotIndex === -1) return null;
  const ext = lower.slice(dotIndex);
  if (PDF_EXT.has(ext)) return 'pdf';
  if (IMAGE_EXT.has(ext)) return 'image';
  return null;
}
