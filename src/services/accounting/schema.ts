import { z } from 'zod';

export const InvoiceSubmissionSchema = z.object({
  source: z.string(),
  sourceFile: z.string(),
  invoiceNumber: z.string().nullable(),
  vendorName: z.string().nullable(),
  issueDate: z.string().nullable(),
  totalAmount: z.number().nullable(),
  currency: z.string().nullable(),
  lineItems: z.array(z.object({ description: z.string(), amount: z.number() })),
  processedAt: z.string(),
});

export type InvoiceSubmission = z.infer<typeof InvoiceSubmissionSchema>;
