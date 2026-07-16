export interface FileEvent {
  source: string;
  path: string;
  filename: string;
  extension: '.pdf' | '.png' | '.jpg' | '.jpeg';
  sizeBytes: number;
  detectedAt: string;
}

export interface InvoiceLineItem {
  description: string;
  amount: number;
}

export interface InvoiceOutput {
  source: string;
  sourceFile: string;
  invoiceNumber: string | null;
  vendorName: string | null;
  issueDate: string | null;
  totalAmount: number | null;
  currency: string | null;
  lineItems: InvoiceLineItem[];
  rawText: string;
  confidence: number;
  processedAt: string;
}

export type WorkerRole = 'all' | 'pdf-only' | 'image-only';