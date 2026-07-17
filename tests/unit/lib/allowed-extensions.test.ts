import { describe, it, expect } from 'vitest';
import { isAllowedFile, ALLOWED_EXT } from '../../../src/lib/allowed-extensions.js';

describe('isAllowedFile', () => {
  it('accepts supported image extensions', () => {
    for (const ext of ['.png', '.jpg', '.jpeg', '.bmp', '.tif', '.tiff', '.webp']) {
      expect(isAllowedFile(`/some/file${ext}`)).toBe(true);
      expect(isAllowedFile(`/some/file${ext.toUpperCase()}`)).toBe(true);
    }
  });

  it('accepts supported document extensions', () => {
    expect(isAllowedFile('/x.pdf')).toBe(true);
    expect(isAllowedFile('/x.docx')).toBe(true);
  });

  it('rejects unsupported extensions', () => {
    expect(isAllowedFile('/x.txt')).toBe(false);
    expect(isAllowedFile('/x.zip')).toBe(false);
    expect(isAllowedFile('/x.exe')).toBe(false);
    expect(isAllowedFile('/x')).toBe(false); // no extension
  });

  it('rejects dotfiles', () => {
    expect(isAllowedFile('/x/.DS_Store')).toBe(false);
    expect(isAllowedFile('/x/.gitignore')).toBe(false);
  });

  it('exposes ALLOWED_EXT as a readonly array', () => {
    expect(ALLOWED_EXT.length).toBeGreaterThan(0);
    expect(ALLOWED_EXT).toContain('.pdf');
    expect(ALLOWED_EXT).toContain('.docx');
    expect(ALLOWED_EXT).toContain('.png');
  });
});