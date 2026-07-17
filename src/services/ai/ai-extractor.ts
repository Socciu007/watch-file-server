/**
 * AI extractor interface.
 *
 * The default implementation throws "not implemented". Production deployments inject a real
 * implementation (e.g. wrapping an LLM HTTP client). Tests pass a mock.
 *
 * `aiExtractFields(ocrText)` is meant to take raw OCR text and return a structured JSON object
 * of fields. The exact contract (prompt, JSON shape) is implementation-defined — this
 * interface just returns `Record<string, unknown>` to stay loose.
 */
export interface AiExtractor {
  aiExtractFields(ocrText: string): Promise<Record<string, unknown>>;
}

export class DefaultAiExtractor implements AiExtractor {
  async aiExtractFields(_ocrText: string): Promise<Record<string, unknown>> {
    throw new Error('DefaultAiExtractor.aiExtractFields not implemented');
  }
}

/**
 * Prompt suffix appended to OCR text before sending to the AI.
 * Asks the AI to extract the B/L number and return `{ blNo: string }`.
 */
export const AI_PROMPT =
  '. Hãy lấy thông tin số B\\L No và trả về dạng {blNo: string}.';

/**
 * High-level helper: run AI extraction with the standard blNo prompt.
 * Returns the parsed object (whatever the AI extractor returned).
 */
export async function aiExtract(
  ocrText: string,
  ai: AiExtractor,
): Promise<Record<string, unknown>> {
  return ai.aiExtractFields(ocrText + AI_PROMPT);
}

/**
 * Type-safe accessor for the blNo field the AI extractor is expected to return.
 * Returns '' if missing or wrong type.
 */
export function extractBlNo(ai: Record<string, unknown>): string {
  const v = ai.blNo;
  return typeof v === 'string' ? v.trim() : '';
}