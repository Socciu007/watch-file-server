import axios from 'axios';

// =============================================================================
//  AI extraction — calls the internal chatAll API to extract fields from text
//  Expected body: { prompt: string | { content: string } }
// =============================================================================

const AI_API_URL =
  process.env.AI_API_URL || 'http://ai.dadaex.cn/backapi/chatGpt/chatAll';
const AI_MODEL_TYPE = process.env.AI_MODEL_TYPE || '2';
const AI_MODE_NAME = process.env.AI_MODE_NAME || 'gemini-3.5-flash';

export interface AiExtractor {
  aiExtractFields(ocrText: string): Promise<Record<string, unknown>>;
}

/**
 * Force model to return valid JSON — find the first JSON block in the string
 * (even if the model includes markdown ```json ... ``` or extra text).
 */
export function extractJson(text: string): Record<string, unknown> {
  if (!text) throw new Error('AI trả về response rỗng');

  // Try to parse directly first
  try {
    return JSON.parse(text);
  } catch {
    /* fall through */
  }

  // Look for a JSON block wrapped in ```json ... ``` (or any ```...```)
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]!.trim());
    } catch {
      /* fall through */
    }
  }

  // Fallback: scan for the first balanced { ... } block
  const start = text.indexOf('{');
  if (start >= 0) {
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(start, i + 1));
          } catch {
            break;
          }
        }
      }
    }
  }

  throw new Error(`Không parse được JSON từ response: ${text.slice(0, 200)}`);
}

/**
 * Extract the text payload from the internal API response. The text can sit
 * at multiple locations depending on the backend version. Walks the object
 * tree depth-first looking for the first non-empty string value.
 */
export function pickAiText(payload: unknown): string {
  if (payload == null) return '';
  if (typeof payload === 'string') return payload.trim() || '';
  if (typeof payload !== 'object') return '';

  for (const value of Object.values(payload as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    if (value && typeof value === 'object') {
      const nested = pickAiText(value);
      if (nested) return nested;
    }
  }
  return '';
}

export interface ChatAllOptions {
  apiUrl?: string;
  modelType?: string;
  modeName?: string;
  /** Override for testing — provide a custom axios instance. */
  axiosOverride?: typeof axios;
}

/**
 * Call the internal chatAll API with the given prompt and return the AI's
 * parsed JSON object as-is (no field-specific extraction — caller decides
 * what to do with the result).
 */
export async function aiExtractFields(
  promptText: string,
  opts: ChatAllOptions = {},
): Promise<Record<string, unknown>> {
  const ax = opts.axiosOverride ?? axios;
  const url = opts.apiUrl ?? AI_API_URL;
  const modelType = opts.modelType ?? AI_MODEL_TYPE;
  const modeName = opts.modeName ?? AI_MODE_NAME;

  const resp = await ax.post(
    url,
    {
      content: promptText,
      modelType,
      modeName,
    },
    {
      timeout: 60_000,
      headers: { 'Content-Type': 'application/json' },
    },
  );

  // Try the known shape (resp.data.data.res1.kwargs.content) first, then
  // fall back to the generic pickAiText walker for other backend versions.
  let text = pickAiText(resp.data?.data?.res1?.kwargs?.content);
  if (!text) {
    text = pickAiText(resp.data);
  }
  return extractJson(text);
}

/**
 * AiExtractor implementation that calls the internal chatAll API.
 * Use this as the default `ai` option in startDownloadsWatcher().
 */
export class ChatAllAiExtractor implements AiExtractor {
  constructor(private readonly opts: ChatAllOptions = {}) {}

  async aiExtractFields(promptText: string): Promise<Record<string, unknown>> {
    return aiExtractFields(promptText, this.opts);
  }
}

// =============================================================================
//  Higher-level helpers used by the watcher pipeline
// =============================================================================

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
