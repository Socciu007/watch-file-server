# watch-file-server

Listens to a downloads directory for new files (PDF/image/docx), runs OCR + AI field extraction, and uploads each file to an external EB server using the extracted B/L number.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure (or edit env vars inline)
cp .env.example .env
# Edit .env to set WATCH_DIR and API_URL

# 3. Run dev server
npm run dev
```

The service watches `WATCH_DIR` (default `C:/Users/Administrator/Downloads`) for any new files matching the allowed extensions (`.png .jpg .jpeg .bmp .tif .tiff .webp .pdf .docx`).

## Architecture

```
DOWNLOADS DIR (chokidar, awaitWriteFinish 2s)
    │ add event
    ▼
isAllowedFile (extension filter)
    │
    ▼
queue (serial Promise chain)
    │
    ▼
detectKind → ocrByKind → [processImage | processPdf | processDocx]
    │
    ▼
aiExtract (with blNo prompt)
    │
    ▼
extractBlNo
    │
    ▼
uploadToEb (POST multipart/form-data to API_URL)
    │
    ▼
log action (file, kind, ocr preview, ai result, upload result, duration)
```

## File flow per event

1. **chokidar `add` event** fires when a new file lands in `WATCH_DIR`
2. **`awaitWriteFinish`** (2s stability threshold) prevents processing half-written files
3. **`isAllowedFile`** filters by extension (`.png .jpg .jpeg .bmp .tif .tiff .webp .pdf .docx`)
4. **Serial queue** (one Promise chain) ensures files are processed one at a time
5. **`detectKind`** classifies the file as `image | pdf | docx`
6. **`ocrByKind`** dispatches to the right `OcrProcessor` method
7. **`aiExtract`** calls `aiExtractFields(ocrText + prompt)` where the prompt asks the AI for `{ blNo: string }`
8. **`extractBlNo`** safely extracts the blNo string from the AI's JSON response
9. **`uploadToEb`** POSTs the file + blNo as `multipart/form-data` to `API_URL`
10. **Action log** captures everything (file, kind, ocr length, ocr preview, AI result, upload status, duration)

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the watcher (auto-starts on `npm run dev`) |
| `npm test` | Run all unit + integration tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:integration` | Integration tests only |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run compiled `dist/index.js` |

## Configuration (env vars)

| Variable | Default | Purpose |
|----------|---------|---------|
| `WATCH_DIR` | `C:/Users/Administrator/Downloads` | Directory to watch |
| `API_URL` | `http://localhost:3001/vn/file` | Upload endpoint |
| `LOG_LEVEL` | `info` | Pino log level (`trace\|debug\|info\|warn\|error\|fatal`) |

The `OcrProcessor` and `AiExtractor` interfaces are pluggable — the default `DefaultOcrProcessor` and `DefaultAiExtractor` throw "not implemented". In production, wire in real implementations (e.g. tesseract.js for OCR, a real LLM HTTP client for AI) by passing them to `startDownloadsWatcher({ ocr, ai })`.

## Testing

```bash
npm test                # All tests (unit + integration)
npm run test:integration # Integration only
```

Tests use mocks for chokidar, axios, form-data — no real network I/O or file system polling.

## Operational notes

- **chokidar `awaitWriteFinish`** with 2s stability threshold prevents reading files that are still being written
- **Serial queue** means files are processed one at a time. Concurrent processing would require redesigning the queue.
- **Default OCR/AI implementations throw** — must inject real implementations for production.
- **Upload errors are logged but don't break the queue** — the next file is still processed.

## Windows path note

**If running on Windows**, use uppercase drive letter in your shell:

```bash
cd /E/projectVN/watch-file-server   # NOT cd /e/projectVN/watch-file-server
```

Lowercase cwd (`/e/...`) causes a vitest internal module-loading bug where vite and Node.js resolve module URLs to different cases (`E:/...` vs `e:/...`), causing module instances to mismatch. This is a known Windows-specific vite issue. Using uppercase `/E/...` works around it.