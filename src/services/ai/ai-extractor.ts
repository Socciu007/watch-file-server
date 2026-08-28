import axios from 'axios';

// =============================================================================
//  AI extraction — calls the internal chatAll API to extract fields from text
//  Expected body: { prompt: string | { content: string } }
// =============================================================================

const AI_API_URL = 'http://ai.dadaex.cn/backapi/chatGpt/chatAll';
const AI_MODEL_TYPE = '2'; // 1: gpt-4o, 2: gemini-3.5-flash
const AI_MODE_NAME = 'gemini-2.5-flash-lite'; // gemini-3.5-flash, gpt-4o

export interface AiExtractor {
  aiExtractFields(ocrText: string): Promise<Record<string, unknown>>;
}

/**
 * Repair common JSON malformations that AI models tend to produce. Only safe
 * transformations are applied — anything ambiguous (e.g. apostrophes inside
 * strings, JS-style comments, non-identifier keys) is left alone, because a
 * false repair is worse than a clean error.
 *
 *   Unquoted keys   : {key: "v"}        → {"key": "v"}
 *   Trailing commas : {"a": 1,}         → {"a": 1}
 */
function sanitizeJson(text: string): string {
  return text
    // Quote identifier-like keys that follow `{` or `,` and end at `:`.
    .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g, '$1"$2"$3')
    // Drop trailing commas before `}` or `]`.
    .replace(/,(\s*[}\]])/g, '$1');
}

/**
 * Try to parse a candidate, falling back to the sanitized form. Returns null
 * if both attempts fail so the caller can try the next candidate.
 */
function tryParseJson(candidate: string): Record<string, unknown> | null {
  try {
    return JSON.parse(candidate);
  } catch {
    const sanitized = sanitizeJson(candidate);
    if (sanitized !== candidate) {
      try {
        return JSON.parse(sanitized);
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

/**
 * Force model to return valid JSON — find a JSON block in the string (even
 * if the model includes markdown ```json ... ``` or extra text around it)
 * and parse it. Falls back to a sanitizer for common AI malformations
 * (unquoted keys, trailing commas). Throws if nothing parses.
 */
export function extractJson(text: string): Record<string, unknown> {
  if (!text) throw new Error('AI returned empty response');

  // Strategy 1: parse the whole text as-is.
  let parsed = tryParseJson(text);
  if (parsed) return parsed;

  // Strategy 2: extract from a ```json ... ``` (or any ```...```) fence.
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    parsed = tryParseJson(fenceMatch[1]!.trim());
    if (parsed) return parsed;
  }

  // Strategy 3: walk the text, trying each balanced `{ ... }` block. If the
  // first block doesn't parse we move on to the next — the model sometimes
  // emits a stray `{` in prose before the real answer.
  let cursor = 0;
  while (cursor < text.length) {
    const start = text.indexOf('{', cursor);
    if (start < 0) break;

    let depth = 0;
    let end = -1;
    for (let j = start; j < text.length; j++) {
      const ch = text[j];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }
    if (end < 0) {
      // No closing brace balances this `{` — could be a stray `{` in prose.
      // Skip it and try the next one rather than giving up entirely.
      cursor = start + 1;
      continue;
    }

    parsed = tryParseJson(text.slice(start, end + 1));
    if (parsed) return parsed;
    cursor = end + 1; // Move past this block and try the next one.
  }

  throw new Error(`Cannot parse JSON from response: ${text.slice(0, 200)}`);
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

export interface ChatAIOptions {
  apiUrl?: string;
  modelType?: string;
  modeName?: string;
  axiosOverride?: typeof axios;
}

/**
 * Call the internal chatAll API with the given prompt and return the AI's
 * parsed JSON object as-is (no field-specific extraction — caller decides
 * what to do with the result).
 */
export async function aiExtractFields(
  promptText: string,
  opts: ChatAIOptions = {},
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
  if (!text) text = pickAiText(resp.data);
  return extractJson(text);
}
