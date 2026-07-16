# Invoice OCR Pipeline — Design Spec

**Date:** 2026-07-16
**Status:** Approved (brainstorming complete)
**Project:** `watch-file-server`

## Purpose

A local Node.js/TypeScript service that watches one or more directories for incoming invoice files (PDF or image), extracts structured invoice data via OCR and a pluggable parser, then submits the structured data to an external accounting software API.

## Goals & Constraints

- **Primary use case:** Số hóa hóa đơn/chứng từ (invoice digitization) for ~50–500 invoices/day.
- **Output destination:** External accounting software API (HTTP POST).
- **Cost posture:** Zero ongoing infra cost in MVP — Tesseract runs locally, parser is mocked, no Redis/Postgres.
- **Deployment:** Dev local first (native Node.js). Docker later.
- **Source folders:** Configurable list (local, NAS mount, Google Drive sync).
- **OCR language:** English (`eng`) by default. Vietnamese support deferred via config flag.
- **Scale posture:** Single Node.js process, medium throughput.

## Non-Goals (out of scope for MVP)

- Cross-process queue / horizontal scaling
- Persistent queue / dead-letter store
- Email / Slack notifications
- Dashboard / web UI
- Multi-language OCR
- Multi-tenant configuration

## Architecture Overview

### Components

| # | Unit | Responsibility | Depends on |
|---|------|----------------|-----------|
| 1 | **WatchService** | Chokidar watches N directories; emits `FileEvent` when files stabilize | Logger, Config |
| 2 | **Router** (part of WatchService) | Classifies file by extension → `pdf-queue` or `image-queue` | WatchService |
| 3 | **PdfWorker** | Processes `pdf-queue` items: extract text → fallback OCR if scanned → parse → submit API | OCR, Parser, API |
| 4 | **ImageWorker** | Processes `image-queue` items: resize → OCR → parse → submit API | OCR, Parser, API |
| 5 | **OcrService** | Interface for text extraction; `TesseractOcr` impl | Tesseract binary |
| 6 | **InvoiceParser** | Interface for text → structured `InvoiceOutput`; `MockParser` impl (regex/rule) | Logger, Config |
| 7 | **AccountingApiClient** | POSTs `InvoiceOutput` to external API with retry + circuit breaker | HTTP client, Config |
| 8 | **MetricsService** | Pushes Prometheus metrics to pushgateway | HTTP client, Config |
| 9 | **Orchestrator** (`src/index.ts`) | Reads `WORKER_ROLE`, wires services, manages lifecycle | All |

### Data Flow

```
file.{pdf|png|jpg} appears in /inbox
    │
    ▼ [WatchService: chokidar 'add' event + 1.5s stability check]
    │
    ▼ [Router: extension → queue]
    │
    ├─ .pdf  ─→ pdf-queue  ─────→ PdfWorker
    │                                 │ (pdf-parse; if text < 50 chars, fallback OCR)
    │                                 ▼
    │                             InvoiceParser
    │                                 │
    │                                 ▼
    │                             AccountingApiClient
    │
    └─ .png|.jpg|.jpeg → image-queue ─→ ImageWorker
                                              │ (sharp resize to max 2000px)
                                              ▼
                                          OcrService (Tesseract)
                                              ▼
                                          InvoiceParser
                                              ▼
                                          AccountingApiClient
                                              │
                                              ▼
                                       Success → fs.move → /storage/processed
                                       Fail    → fs.move → /storage/failed
                                       Metrics → pushgateway (every 30s)
```

### Design Principles

- **Single responsibility:** Each unit has one clear purpose.
- **Dependency injection:** OCR, Parser, API, Metrics are interfaces with swappable implementations.
- **No shared state across workers:** All cross-cutting state via in-memory Maps (dedup, retry).
- **Idempotency:** Same file processed twice yields the same output; no duplicate API submissions.
- **Fail fast at boot:** Config errors exit before starting watchers.

## Project Structure

```
watch-file-server/
├── src/
│   ├── index.ts                       # Entry point — reads WORKER_ROLE, wires services
│   ├── config/
│   │   ├── env.ts                     # Load + validate env (zod)
│   │   ├── sources.ts                 # Load watched dirs from config.json
│   │   ├── queue.ts                   # Queue names, concurrency, retry config
│   │   └── schema.ts                  # Zod schemas for config.json + env
│   ├── services/
│   │   ├── watcher/
│   │   │   ├── index.ts               # WatchService class
│   │   │   ├── router.ts              # Extension → queue routing
│   │   │   └── debounce.ts            # Stability check (size unchanged for N ms)
│   │   ├── workers/
│   │   │   ├── base.ts                # BaseWorker abstract class
│   │   │   ├── pdf.ts                 # PdfWorker
│   │   │   └── image.ts               # ImageWorker
│   │   ├── ocr/
│   │   │   ├── interface.ts           # OcrService interface
│   │   │   └── tesseract.ts           # TesseractOcr implementation
│   │   ├── parser/
│   │   │   ├── interface.ts           # InvoiceParser interface
│   │   │   └── mock.ts                # MockParser (regex-based)
│   │   ├── pdf-text/
│   │   │   └── extractor.ts           # PDF text extraction (pdf-parse)
│   │   ├── accounting/
│   │   │   ├── client.ts              # HTTP client + retry + circuit breaker
│   │   │   └── schema.ts              # InvoiceOutput zod schema
│   │   └── metrics/
│   │       ├── interface.ts           # MetricsService interface
│   │       └── prometheus.ts          # Push to pushgateway
│   ├── lib/
│   │   ├── logger.ts                  # Pino logger
│   │   ├── hash.ts                    # sha256 file hashing for dedup
│   │   ├── retry.ts                   # withRetry helper (exponential backoff)
│   │   └── errors.ts                  # TransientError, PermanentError, ConfigError
│   └── types/
│       └── index.ts                   # Shared types (FileEvent, InvoiceOutput, ...)
├── tests/
│   ├── unit/                          # Per-service unit tests with mocks
│   ├── integration/                   # Pipeline tests with real files
│   └── fixtures/                      # Sample invoice files (synthetic)
├── config.json                        # Watch paths, queue config, API URL
├── .env.example                       # Template for required env vars
├── package.json
├── tsconfig.json
└── README.md
```

## Component Contracts

### FileEvent

```typescript
interface FileEvent {
  source: string;       // Name from config (e.g. "nas-finance")
  path: string;         // Absolute file path
  filename: string;
  extension: string;    // '.pdf' | '.png' | '.jpg' | '.jpeg'
  sizeBytes: number;
  detectedAt: string;   // ISO timestamp
}
```

### InvoiceOutput

```typescript
interface InvoiceOutput {
  source: string;
  sourceFile: string;
  invoiceNumber: string | null;
  vendorName: string | null;
  issueDate: string | null;       // ISO YYYY-MM-DD
  totalAmount: number | null;
  currency: string | null;        // 'USD' default
  lineItems: Array<{ description: string; amount: number }>;
  rawText: string;                // OCR text for debugging
  confidence: number;             // 0.0–1.0
  processedAt: string;            // ISO timestamp
}
```

### Service Interfaces

```typescript
interface OcrService {
  extractText(input: Buffer | string): Promise<string>;
}

interface InvoiceParser {
  parse(rawText: string, source: FileEvent): Promise<InvoiceOutput>;
}

interface AccountingApiClient {
  submit(invoice: InvoiceOutput): Promise<{ id: string }>;
}

interface MetricsService {
  recordJobComplete(type: 'pdf' | 'image', status: 'success' | 'fail', durationMs: number): Promise<void>;
  flush(): Promise<void>;
}
```

## Configuration

### `config.json` (committed)

```json
{
  "sources": [
    { "name": "local-inbox", "path": "./inbox", "enabled": true },
    { "name": "nas-finance", "path": "Z:/Finance/Invoices", "enabled": true }
  ],
  "watcher": {
    "debounceMs": 1500,
    "ignored": [".DS_Store", "Thumbs.db", "*.tmp", "*.crdownload"]
  },
  "queues": {
    "pdf": { "concurrency": 2, "maxRetries": 3 },
    "image": { "concurrency": 3, "maxRetries": 3 }
  },
  "ocr": { "lang": "eng", "binaryPath": null },
  "parser": { "type": "mock" },
  "accounting": {
    "baseUrl": "https://api.example-accounting.com/v1",
    "authTokenEnv": "ACCOUNTING_API_TOKEN",
    "timeoutMs": 10000,
    "circuitBreaker": { "failureThreshold": 5, "resetMs": 60000 }
  },
  "metrics": {
    "endpoint": "https://pushgateway.example.com/metrics/job/invoice-watcher",
    "authTokenEnv": "METRICS_PUSH_TOKEN",
    "flushIntervalMs": 30000
  },
  "storage": {
    "processedDir": "./storage/processed",
    "failedDir": "./storage/failed"
  }
}
```

### `.env` (gitignored)

```bash
ACCOUNTING_API_TOKEN=sk_live_xxx
METRICS_PUSH_TOKEN=xxx
LOG_LEVEL=info                # trace | debug | info | warn | error
WORKER_ROLE=all               # all | pdf-only | image-only
NODE_ENV=development
```

### NPM Scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "dev:pdf-only": "WORKER_ROLE=pdf-only npm run dev",
    "dev:image-only": "WORKER_ROLE=image-only npm run dev",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:integration": "vitest run tests/integration",
    "lint": "eslint src tests",
    "typecheck": "tsc --noEmit"
  }
}
```

## Error Handling

### Error Classification

```typescript
class TransientError extends Error {}    // Retryable: timeout, 5xx, network
class PermanentError extends Error {}    // Non-retryable: 4xx, parse fail, corrupt file
class ConfigError extends Error {}       // Fail fast at boot
```

### Per-Layer Behavior

| Layer | Error | Classification | Action |
|-------|-------|----------------|--------|
| Watcher | File disappears before processing | Transient | Log warn, skip |
| Watcher | Path inaccessible | Permanent | Disable source, log error |
| PDF extract | Not a PDF | Permanent | Move → `/storage/failed` |
| PDF extract | Corrupt/encrypted PDF | Permanent | Move → `/storage/failed` |
| OCR | Tesseract crash | Transient | Retry up to `maxRetries` |
| OCR | Timeout > 30s | Transient | Retry |
| OCR | Unsupported image format | Permanent | Move → `/storage/failed` |
| Parser | Empty text | Permanent | Move → `/storage/failed` |
| Parser | Regex misses fields | (n/a) | Submit with `null` fields |
| API | 5xx / timeout | Transient | Retry with backoff (1s → 4s → 16s) |
| API | 4xx (auth, validation) | Permanent | Move → `/storage/failed`, log |
| API | Circuit breaker open | Transient | Reject all jobs until reset |
| Metrics | Push fails | Transient | Retry on next flush |

### Retry Strategy

```
attempt 1 → fail → sleep 1s
attempt 2 → fail → sleep 4s
attempt 3 → fail → sleep 16s
attempt 4 (final) → fail
  ├─ Transient: move → /failed, log warn
  └─ Permanent: move → /failed, log error
```

### Circuit Breaker

- **State machine:** `closed` → `open` (5 consecutive failures) → `half-open` (after 60s reset)
- **Behavior:** When `open`, AccountingApiClient rejects all calls immediately with `TransientError`.

### Graceful Shutdown

```
SIGINT / SIGTERM
    │
    ▼
Stop watcher (no new events)
    │
    ▼
Drain queue (wait for in-flight jobs, max 30s)
    │
    ▼
Flush metrics (final batch)
    │
    ▼
Close HTTP clients
    │
    ▼
process.exit(0)
```

### Logging

- **Level `info`:** Job success, file moves, watcher start/stop.
- **Level `warn`:** Retries, transient failures.
- **Level `error`:** Permanent failures, uncaught exceptions.
- **Structured JSON** (pino) for log aggregation.
- **Per-job correlation ID** (uuid v4) for end-to-end tracing.

### Failed File Handling

No persistent queue → no traditional dead-letter store. Files that fail permanently are moved to `/storage/failed/{date}/{filename}`. Operators inspect manually and re-drop into source folder after fixing.

## Testing Strategy

### Tech: Vitest

### Three Layers

**1. Unit tests** — ~75% coverage target
- `tests/unit/lib/`: retry, hash, errors
- `tests/unit/services/ocr/`: mock child_process spawn
- `tests/unit/services/parser/`: regex pattern coverage
- `tests/unit/services/accounting/`: mock axios; verify retry + circuit breaker
- `tests/unit/services/metrics/`: mock fetch
- `tests/unit/services/watcher/`: router + debounce logic
- `tests/unit/workers/`: full DI with mocks

**2. Integration tests** — smoke test the pipeline
- `tests/integration/pdf-happy-path.test.ts`: real PDF → submit success
- `tests/integration/image-happy-path.test.ts`: real PNG → submit success
- `tests/integration/pdf-scan-fallback.test.ts`: scanned PDF → OCR fallback
- `tests/integration/api-failure-retry.test.ts`: API errors → retry → eventual success
- **Fixtures** (`tests/fixtures/`): synthetic invoice files (no real customer data)

**3. Manual verification** (dev)
- Drop fixture into `inbox/`
- Verify logs: detect → process → submit → move
- Verify `/storage/processed/` contains the file
- Verify mock API client received correct payload

### Coverage Targets

| Path | Target |
|------|--------|
| `src/lib/` | 95% |
| `src/services/*/` (excluding workers) | 80% |
| `src/services/workers/` | 70% |
| Overall | 75% |

### Not Tested (YAGNI)

- Tesseract OCR accuracy per language (manual verification when switching `lang`)
- Chokidar event timing on network mounts (flaky, low value)
- Performance benchmarks (no baseline)
- E2E with real accounting API (needs credentials; deferred)

## Bootstrap Sequence

1. Load `.env` (via dotenv) → validate with zod
2. Load `config.json` → validate with zod
3. Initialize logger (pino, level from env)
4. Initialize services: OCR, Parser, API client, Metrics
5. Initialize 2 queues (`pdf`, `image`) + WatchService
6. Wire `WORKER_ROLE` to decide which workers start
7. Register SIGINT/SIGTERM → graceful shutdown

## Dependencies (npm)

| Package | Purpose |
|---------|---------|
| `chokidar` | File system watching |
| `p-queue` | In-process queue with concurrency |
| `tesseract.js` | OCR (calls Tesseract binary) |
| `pdf-parse` | PDF text extraction |
| `sharp` | Image preprocessing (resize/normalize) |
| `axios` | HTTP client for accounting API + metrics |
| `zod` | Runtime config validation |
| `pino` | Structured logging |
| `dotenv` | Load `.env` |
| `uuid` | Correlation IDs |
| Dev: `typescript`, `tsx`, `vitest`, `@types/*`, `eslint` | Toolchain |

## Open Questions

None at design close. Items deferred to post-MVP:
- Vietnamese OCR (`vie` lang pack)
- LLM-backed parser replacing `MockParser`
- Docker packaging
- Cross-process / horizontal scaling
- Dead-letter inspection tooling