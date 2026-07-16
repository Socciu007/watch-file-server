import { describe, it, expect } from 'vitest';
import { hashFile, hashContent } from '../../../src/lib/hash.js';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('hash', () => {
  it('hashContent is deterministic for same input', () => {
    const a = hashContent('hello world');
    const b = hashContent('hello world');
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it('hashContent differs for different input', () => {
    expect(hashContent('a')).not.toBe(hashContent('b'));
  });

  it('hashFile reads and hashes a real file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hash-test-'));
    const file = join(dir, 'sample.txt');
    writeFileSync(file, 'hello world');
    expect(hashFile(file)).toBe(hashContent('hello world'));
    rmSync(dir, { recursive: true });
  });

  it('hashFile throws on missing file', () => {
    expect(() => hashFile('/nonexistent/path/abc.txt')).toThrow();
  });
});