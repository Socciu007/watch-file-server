import type { InvoiceParser } from './interface.js';
import type { FileEvent, InvoiceOutput, InvoiceLineItem } from '../../types/index.js';

const INVOICE_NUMBER_RE = /\bINV[-_]?(\d\w*)\b/i;
const TOTAL_RE = /\bTotal\b[:\s]+\$?([\d,]+\.?\d*)/i;
const DATE_RE = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/;
const VENDOR_RE = /^([A-Z][A-Za-z\s&,.]{2,40})$/m;

function parseUsDate(month: string, day: string, year: string): string | null {
  const m = Number(month);
  const d = Number(day);
  const y = Number(year);
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return null;
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export class MockParser implements InvoiceParser {
  async parse(rawText: string, source: FileEvent): Promise<InvoiceOutput> {
    const invMatch = rawText.match(INVOICE_NUMBER_RE);
    const totalMatch = rawText.match(TOTAL_RE);
    const dateMatch = rawText.match(DATE_RE);

    let vendorName: string | null = null;
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const m = line.match(VENDOR_RE);
      if (m && m[1]) {
        vendorName = m[1].trim();
        break;
      }
    }

    const fieldsFound = [invMatch, totalMatch, dateMatch, vendorName].filter(Boolean).length;
    const confidence = fieldsFound === 0 ? 0 : Math.min(1, fieldsFound / 4);

    const lineItems: InvoiceLineItem[] = [];

    return {
      source: source.source,
      sourceFile: source.path,
      invoiceNumber: invMatch ? `INV-${invMatch[1]}` : null,
      vendorName,
      issueDate: dateMatch ? parseUsDate(dateMatch[1]!, dateMatch[2]!, dateMatch[3]!) : null,
      totalAmount: totalMatch ? parseAmount(totalMatch[1]!) : null,
      currency: totalMatch ? 'USD' : null,
      lineItems,
      rawText,
      confidence,
      processedAt: new Date().toISOString(),
    };
  }
}
