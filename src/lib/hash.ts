import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export function hashContent(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

export function hashFile(path: string): string {
  const buf = readFileSync(path);
  return hashContent(buf);
}