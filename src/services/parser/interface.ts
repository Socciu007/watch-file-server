import type { FileEvent, InvoiceOutput } from '../../types/index.js';

export interface InvoiceParser {
  parse(rawText: string, source: FileEvent): Promise<InvoiceOutput>;
}
