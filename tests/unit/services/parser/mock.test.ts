import { describe, it, expect } from 'vitest';
import { MockParser } from '../../../../src/services/parser/mock.js';
import type { FileEvent } from '../../../../src/types/index.js';

const event: FileEvent = {
  source: 'local-inbox',
  path: '/inbox/inv1.pdf',
  filename: 'inv1.pdf',
  extension: '.pdf',
  sizeBytes: 12345,
  detectedAt: '2026-07-16T10:00:00.000Z',
};

describe('MockParser', () => {
  it('extracts invoiceNumber (INV-N format)', async () => {
    const parser = new MockParser();
    const out = await parser.parse('Invoice Number: INV-12345\nTotal: $100', event);
    expect(out.invoiceNumber).toBe('INV-12345');
    expect(out.totalAmount).toBe(100);
    expect(out.currency).toBe('USD');
    expect(out.source).toBe('local-inbox');
    expect(out.sourceFile).toBe('/inbox/inv1.pdf');
    expect(out.rawText).toContain('INV-12345');
  });

  it('extracts date in MM/DD/YYYY format', async () => {
    const parser = new MockParser();
    const out = await parser.parse('Date: 07/15/2026\nVendor: Acme', event);
    expect(out.issueDate).toBe('2026-07-15');
  });

  it('returns null fields when regex does not match', async () => {
    const parser = new MockParser();
    const out = await parser.parse('garbled text', event);
    expect(out.invoiceNumber).toBeNull();
    expect(out.totalAmount).toBeNull();
    expect(out.issueDate).toBeNull();
    expect(out.vendorName).toBeNull();
  });

  it('confidence is between 0 and 1', async () => {
    const parser = new MockParser();
    const out = await parser.parse('Invoice INV-1 Total $50', event);
    expect(out.confidence).toBeGreaterThanOrEqual(0);
    expect(out.confidence).toBeLessThanOrEqual(1);
  });

  it('extracts correct total even when Subtotal appears first', async () => {
    const parser = new MockParser();
    const out = await parser.parse('Subtotal: $50\nTotal: $100', event);
    expect(out.totalAmount).toBe(100);
  });
});
