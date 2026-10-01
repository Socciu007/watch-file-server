import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('info').child({ component: 'firecrawl' });

// =============================================================================
//  Firecrawl — wraps the Firecrawl SDK's `parse()` to turn a local file into
//  markdown. We use it as a high-quality text-layer extractor for PDFs: when a
//  PDF has selectable text, Firecrawl returns clean markdown in one call; only
//  the OCR fallback (Tesseract on rasterized pages) is needed for scanned PDFs.
// =============================================================================

/**
 * API key. Default is the example key from the Firecrawl quickstart; production
 * deployments should set FIRECRAWL_API_KEY in the environment.
 */
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || 'fc-key';

// ─────────────────────────────────────────────────────────────────────────────
//  Module-level ref to the SDK — isolated so tests can mock it.
// ─────────────────────────────────────────────────────────────────────────────
type FirecrawlModule = typeof import('firecrawl');
type FirecrawlClient = InstanceType<FirecrawlModule['Firecrawl']>;
type ParseDocument = Awaited<ReturnType<FirecrawlClient['parse']>>;

let _client: FirecrawlClient | undefined;

async function loadClient(
  override?: FirecrawlModule,
): Promise<FirecrawlClient> {
  if (override) return new override.Firecrawl({ apiKey: FIRECRAWL_API_KEY });
  if (!_client) {
    const mod = await import('firecrawl');
    _client = new mod.Firecrawl({ apiKey: FIRECRAWL_API_KEY });
  }
  return _client;
}

// Re-export so tests can call: _deps.setClient(mockInstance)
export const _deps = {
  setClient(c: FirecrawlClient | undefined) {
    _client = c;
  },
};

/**
 * Minimal shape of the Firecrawl parse result that we use. The full SDK type
 * is large and pulls in Zod; this keeps our surface narrow and easy to mock.
 */
export interface FirecrawlParseResult {
  markdown?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Options for parsePdf.
 */
export interface FirecrawlServiceOptions {
  /** Override the Firecrawl SDK module (used in tests to inject a mock). */
  firecrawl?: FirecrawlModule;
  /** When true, strip chrome (nav, footers, sidebars) — good for forms/B/L docs. */
  onlyMainContent?: boolean;
  /** Pass-through formats; defaults to `['markdown']`. */
  formats?: ('markdown' | 'html' | 'summary')[];
}

/**
 * Parse a local file (PDF, DOCX, image, …) via Firecrawl and return its
 * markdown text. Returns an empty string if the server response has no
 * markdown field; throws on network/SDK errors so the caller can fall back.
 */
export async function parsePdf(
  filePath: string,
  opts: FirecrawlServiceOptions = {},
): Promise<string> {
  const client = await loadClient(opts.firecrawl);

  // Firecrawl accepts Buffer/Uint8Array for `data`; node:fs/promises.readFile
  // returns a Buffer that satisfies that contract.
  const buffer = await readFile(filePath);

  const formats = opts.formats ?? ['markdown'];
  const onlyMainContent = opts.onlyMainContent ?? true;

  const result = (await client.parse(
    {
      data: buffer,
      filename: basename(filePath),
      contentType: 'application/pdf',
    },
    {
      formats,
      onlyMainContent,
    },
  )) as ParseDocument;

  // Firecrawl v4 returns either a Document directly or (with schema) a
  // Document + inferred `json`. We don't use `json`, just `markdown`.
  const doc = result as FirecrawlParseResult;
  const markdown = (doc.markdown ?? '').toString();
  logger.debug(
    { file: filePath, length: markdown.length, hasMetadata: !!doc.metadata },
    'Firecrawl parse complete:',
  );
  return markdown;
}