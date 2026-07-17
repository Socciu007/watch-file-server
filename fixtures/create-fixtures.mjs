// Generates synthetic invoice fixtures for testing.
// Run: node fixtures/create-fixtures.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, '..', 'tests', 'fixtures');
mkdirSync(FIXTURE_DIR, { recursive: true });

// Plaintext invoice (valid PDF magic bytes, no real PDF — pdf-parse will be mocked in unit tests)
const pdfHeader = Buffer.from('%PDF-1.4\n');
const pdfContent = Buffer.from(`
Invoice Number: INV-100001
Date: 07/15/2026
Vendor: Acme Corporation

Item A    $50.00
Item B    $50.00
Total:    $100.00
`);
writeFileSync(join(FIXTURE_DIR, 'invoice-text.pdf'), Buffer.concat([pdfHeader, pdfContent]));

// Scanned PDF (no text, OCR fallback path)
writeFileSync(join(FIXTURE_DIR, 'invoice-scan.pdf'), pdfHeader);

// Minimal PNG (1x1 transparent)
const pngBytes = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);
writeFileSync(join(FIXTURE_DIR, 'invoice.png'), pngBytes);

console.log(`Created fixtures in ${FIXTURE_DIR}`);