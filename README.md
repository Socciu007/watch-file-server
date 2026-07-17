# watch-file-server

Invoice OCR pipeline. Watches directories for invoice files (PDF/image), runs OCR + parser, and submits structured data to an external accounting API.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure
cp .env.example .env
# Edit .env with your ACCOUNTING_API_TOKEN and METRICS_PUSH_TOKEN

# 3. Edit config.json to set your watch paths and API URL

# 4. Create watched directory
mkdir -p inbox

# 5. Drop a PDF or image into inbox/ — it will be processed automatically

# 6. Run dev server
npm run dev
```

## Architecture

```
inbox/  →  WatchService (chokidar)
            ↓
         Router (extension)
            ↓
   ┌────────┴────────┐
   │                 │
pdf-queue      image-queue
   │                 │
PdfWorker      ImageWorker
   │                 │
   │                 ↓
   │             sharp resize
   │                 ↓
   └─────→ OcrService (Tesseract)
            ↓
       MockParser
            ↓
   HttpAccountingClient
            ↓
   /storage/processed  or  /storage/failed
```

See [docs/superpowers/specs/2026-07-16-invoice-ocr-pipeline-design.md](docs/superpowers/specs/2026-07-16-invoice-ocr-pipeline-design.md) for the full design spec.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start full pipeline (watcher + both workers) |
| `npm run dev:pdf-only` | Only PDF worker (useful for debugging) |
| `npm run dev:image-only` | Only image worker |
| `npm test` | Run all unit + integration tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run compiled `dist/index.js` |

## Configuration

- `config.json` — watch paths, queue concurrency, OCR settings, API URL, metrics endpoint, storage dirs
- `.env` — secrets (API tokens, log level, worker role)

See spec for schema details.

## Testing

```bash
npm test                 # All tests
npm run test:integration # Integration only
```

Fixtures in `tests/fixtures/` are synthetic — no real customer data.

## Operational notes

- **Tesseract OCR** runs locally. First run downloads language data (~15MB for `eng`).
- **No persistence layer.** Jobs in flight are lost on restart. Files in `/storage/processed` are already moved, so they won't be re-processed.
- **Failed files** move to `/storage/failed/{date}/`. Inspect and re-drop after fixing.
- **Single process.** No horizontal scaling. For higher throughput, run multiple instances on different watched dirs.

## Windows path note

**If running on Windows**, use uppercase drive letter in your shell:

```bash
cd /E/projectVN/watch-file-server   # NOT cd /e/projectVN/watch-file-server
```

Lowercase cwd (`/e/...`) causes a vitest internal module-loading bug where vite and Node.js resolve module URLs to different cases (`E:/...` vs `e:/...`), causing module instances to mismatch. This is a known Windows-specific vite issue. Using uppercase `/E/...` works around it.
