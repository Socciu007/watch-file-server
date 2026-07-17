import path from 'node:path';

/**
 * File extensions accepted by the watcher.
 * Each maps to a kind: image (raster), pdf, or docx (other).
 */
export const ALLOWED_EXT = [
  '.png', '.jpg', '.jpeg', '.bmp', '.tif', '.tiff', '.webp',  // images
  '.pdf',                                                    // pdf
  '.docx',                                                   // docx
] as const;

export type AllowedExt = (typeof ALLOWED_EXT)[number];

export function isAllowedFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return (ALLOWED_EXT as readonly string[]).includes(ext);
}