import { describe, it, expect } from 'vitest';
import { routeFile } from '../../../../src/services/watcher/router.js';

describe('routeFile', () => {
  it('routes .pdf to pdf', () => {
    expect(routeFile('INV-001.pdf')).toBe('pdf');
  });

  it('routes .png to image', () => {
    expect(routeFile('scan.png')).toBe('image');
  });

  it('routes .jpg to image', () => {
    expect(routeFile('photo.jpg')).toBe('image');
  });

  it('routes .jpeg to image', () => {
    expect(routeFile('photo.jpeg')).toBe('image');
  });

  it('returns null for unsupported extension', () => {
    expect(routeFile('readme.txt')).toBeNull();
    expect(routeFile('archive.zip')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(routeFile('SCAN.PNG')).toBe('image');
    expect(routeFile('INV.PDF')).toBe('pdf');
  });
});
