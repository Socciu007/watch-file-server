# 提示词历史与统计 (Prompt History & Statistics)

本文档记录在 `watch-file-server` 项目开发过程中，向各类 subagent 发送的所有提示词与向用户提出的所有问题的统计与详细样例。

---

## 1. 统计表 (Statistical Table by Timeline with HH:MM)

### 1.1 阶段时间线 (Phase Timeline)

| 阶段 | 时间 | 主要任务 | 提示词数量 |
|------|------|----------|------------|
| 阶段零：架构设计 | 10:00 - 10:30 | 头脑风暴：决定项目类型、数据流、OCR/AI 选型 | ~12 (7 个用户问题) |
| 阶段一：编写计划 | 10:30 - 11:00 | 通过 `writing-plans` skill 编写 27 任务实施计划 | ~3 |
| 阶段二：Subagent 开发 | 11:00 - 13:00 | 27 个实现任务 + 规范/代码质量审查 + 修复 | ~95 |
| 阶段三：最终审查 | 13:00 - 13:15 | 完整代码审查 + 3 项重要修复 | ~4 |
| 阶段四：用户要求简化 | 13:15 - 13:30 | "bỏ qua PdfWorker/ImageWorker" 大重构 | ~12 |
| 阶段五：真实 OCR 集成 | 13:30 - 13:45 | 集成 TesseractOcrProcessor (tesseract.js + pdf-to-img + mammoth) | ~5 |
| 阶段六：dotenv 修复 | 13:45 - 13:50 | 恢复 dotenv/config import | ~2 |
| 阶段七：Logger 颜色 | 13:50 - 14:00 | 添加 ANSI 颜色到 pino levels | ~3 |
| 阶段八：AI 集成 | 14:00 - 14:20 | 集成 ChatAllAiExtractor (chatAll API) | ~5 |
| 阶段九：AI 整合 | 14:20 - 14:30 | 删除 chatall-extractor.ts，合并到 ai-extractor.ts | ~2 |
| 阶段十：文档 | 14:30 - 14:45 | 创建 docs.md（提示词统计） | ~1 |
| **总计** | 10:00 - 14:45 | — | **~144** |

### 1.2 按 Subagent 类型统计 (By Subagent Type)

| Subagent 类型 | 数量 | 用途 |
|--------------|------|------|
| implementer | ~30 | 实施单个任务（含修复子任务） |
| spec-reviewer | ~27 | 验证实施是否符合规范 |
| code-quality-reviewer | ~27 | 代码质量审查（修复建议） |
| fix-subagent | ~25 | 应用代码质量修复 |
| re-review | ~15 | 验证修复 |
| diagnostic | 3 | vitest cwd 大小写问题诊断 |
| final-review | 1 | 整体最终审查 |
| cleanup | ~3 | 模块整合、删除冗余文件 |
| **用户 AskUserQuestion** | **7** | 架构决策问题 |

### 1.3 按任务时间线统计 (By Task with HH:MM Approx)

| 时间 | 任务 | 主题 | 实施 | 规范审查 | 代码质量 | 修复 | 重新审查 |
|------|------|------|------|----------|----------|------|----------|
| 11:00 | Task 1 | 初始化项目 | ✅ | ✅ | ✅ | — | — |
| 11:05 | Task 2 | 创建目录结构 | ⚠️ | ✅ | — | ✅ (gitignore) | — |
| 11:10 | Task 3 | 共享类型 | ✅ | ✅ | ✅ | — | — |
| 11:15 | Task 4 | 错误类 | ✅ | ✅ | ✅ | — | — |
| 11:20 | Task 5 | Logger | ⚠️ | ✅ | ✅ | — | — |
| 11:25 | Task 6 | 哈希工具 | ✅ | ✅ | ✅ | — | — |
| 11:30 | Task 7 | 重试助手 | ✅ | ✅ | ✅ | — | — |
| 11:35 | Task 8 | 配置 schema | ✅ | ✅ | ✅ | — | — |
| 11:40 | Task 9 | Env 加载器 | ✅ | ✅ | ✅ | — | — |
| 11:45 | Task 10 | Config 加载器 | ✅ | ✅ | ✅ | — | — |
| 11:50 | Task 11 | 默认配置 | ✅ | ✅ | ✅ | — | — |
| 11:55 | Task 12 | TesseractOcr | ⚠️ | — | ⚠️ | ✅ (C1 binaryPath) | ✅ |
| 12:00 | Task 13 | MockParser | ⚠️ | — | ⚠️ | ✅ (regex bug + TOTAL_RE) | — |
| 12:05 | Task 14 | PDF 文本提取 | ✅ | ✅ | ✅ | — | — |
| 12:10 | Task 15 | HttpAccountingClient | ⚠️ | ✅ | ⚠️ | ✅ (mock) + ✅ (breaker) | ✅ + cleanup |
| 12:15 | Task 16 | PrometheusMetrics | ✅ | ✅ | ⚠️ | ✅ (HTTP status check) | ✅ |
| 12:20 | Task 17 | 路由器 | ✅ | ✅ | ✅ | — | — |
| 12:25 | Task 18 | 防抖 | ✅ | ✅ | ⚠️ | ✅ (try/finally + multi-path) | ✅ |
| 12:30 | Task 19 | Chokidar 监听 | ⚠️ | ✅ | ⚠️ | ✅ (4 issues) | ✅ |
| 12:35 | Task 20 | BaseWorker | ✅ | ✅ | ✅ | ✅ (inverted shouldRetry) | — |
| 12:40 | Task 21 | PdfWorker | ✅ | ✅ | ⚠️ | ✅ (cleanup) | ✅ |
| 12:45 | Task 22 | ImageWorker | ✅ | ✅ | ✅ | — | — |
| 12:50 | Task 23 | Orchestrator | ✅ | ✅ | ⚠️ | ✅ (4 issues) | — |
| 12:55 | Task 24 | 测试夹具 | ✅ | ✅ | ✅ | — | — |
| 13:00 | Task 25 | 集成测试 | ✅ | ✅ | ✅ | — | — |
| 13:05 | Task 26 | README | ✅ | ✅ | ✅ | — | — |
| 13:10 | Task 27 | 全套测试 | ✅ | — | — | — | — |

### 1.4 按主题统计 (By Topic)

| 主题 | 出现次数 | 代表任务 |
|------|----------|----------|
| TDD 红-绿循环 | 27 | 每个实现任务 |
| 类型安全 (TS) | 多次 | BaseWorker、Docker compose |
| 错误处理 (Transient/Permanent) | ~6 | 任务 7、15、16、20 |
| Vitest 模拟与 cwd 问题 | 3 | 任务 5、12、19 |
| 协议 vs 实际 API 行为 | 4 | 任务 13、15、16、19 |
| 重构与简化 | 2 | 阶段四 + 阶段九 |
| 文件模块整合 | 2 | 阶段四、阶段九 |

---

## 2. 向用户提出的问题 (AskUserQuestion Prompts)

### 问题 1：项目主要目的 (HH:MM ~10:05)

**问题（中文）：** "Mục đích chính của dự án là gì? Điều này quyết định loại dữ liệu OCR+LLM cần trích xuất, schema đầu ra, và cách xử lý lỗi."

**选项：**
1. **Số hóa hóa đơn/chứng từ (invoice OCR)** - 自动读取 PDF/ảnh hóa đơn，提取供应商、日期、金额、税号... 然后存入会计软件表格
2. **Quản lý hợp đồng / tài liệu pháp lý** - 阅读合同 PDF，摘要条款，提取 A/B 双方、生效日期、合同金额
3. **Số hóa tài liệu giấy tờ chung** - 任何纸质文件 → 有结构的文本，可搜索存档
4. **Khác (tôi sẽ mô tả cụ thể)** - 其他（用户会具体描述）

**用户选择：** "Số hóa hóa đơn/chứng từ (invoice OCR)"

### 问题 2：数据输出目的地 (HH:MM ~10:10)

**问题：** "Sau khi OCR+LLM trích xuất dữ liệu hóa đơn, kết quả sẽ được lưu/xuất ra đâu?"

**选项：**
1. **Database (Postgres/MySQL/SQLite)** - 关系数据库用于查询报告、搜索、审计
2. **Google Sheets / Excel** - 每个发票成1行在电子表格中
3. **JSON file + bản gốc PDF/ảnh** - 每个发票成1个 JSON 文件加上原始文件目录
4. **Gửi vào API/accounting software khác** - POST 到会计软件 API（少用但生产级）

**用户选择：** "Gửi vào API/accounting software khác"

### 问题 3：OCR 服务选型 (HH:MM ~10:15)

**问题：** "OCR Service dùng cái nào? Điều này quyết định chi phí vận hành, độ chính xác, và việc có cần API key/external dependency hay không."

**选项：**
1. **Tesseract OCR (local, miễn phí)** - 开源，本地运行，免费。准确度一般
2. **Google Cloud Vision / AWS Textract (cloud, trả phí)** - 云 API，多语言，准确高
3. **PaddleOCR / VietOCR (chuyên tiếng Việt)** - 开源，针对越南语和越南文件
4. **Mock/abstract — dễ swap sau** - 设计抽象层，之后切换

**用户选择：** "Tesseract OCR (local, miễn phí)"

### 问题 4：每日发票量 (HH:MM ~10:20)

**问题：** "Quy mô dự kiến bao nhiêu hóa đơn mỗi ngày? Điều này ảnh hưởng đến việc cần bao nhiêu worker process, có cần scale horizontal hay không, và chiến lược retry/backoff."

**选项：**
1. **Nhỏ: dưới 50 hóa đơn/ngày** - 1 worker process
2. **Vừa: 50-500 hóa đơn/ngày** - 并发控制
3. **Lớn: trên 500 hóa đơn/ngày** - scale horizontal
4. **Chưa xác định, thiết kế linh hoạt** - 配置可调

**用户选择：** "Vừa: 50-500 hóa đơn/ngày"

### 问题 5：运行方式 (HH:MM ~10:25)

**问题：** "Bạn muốn chạy service này như thế nào? Điều này ảnh hưởng đến việc có ship Docker compose không, cách cấu hình entry point, cách restart khi crash."

**选项：**
1. **Docker Compose (Node + Redis)** - 一切都容器化
2. **Native (Node + Redis local)** - 本地原生运行
3. **Single binary / system service** - 打包成单一二进制或系统服务
4. **Dev local trước, Docker sau** - 重点放在代码

**用户选择：** "Dev local trước, Docker sau"

### 问题 6：执行模式 (HH:MM ~10:35)

**问题：** "Bạn muốn chạy Subagent-Driven hay Inline Execution?" (在 Subagent-Driven Development skill 启动时)

**选项：**
1. **Subagent-Driven (khuyến nghị)** - 为每个任务派遣 subagent，两个阶段审查（spec + code quality）
2. **Inline Execution** - 在当前会话中按计划执行任务

**用户选择：** "Subagent-Driven"

### 问题 7：重构方式 (HH:MM ~13:20)

**问题：** "Bạn muốn xử lý approach mới này như thế nào?" (在用户粘贴简化版代码后)

**选项：**
1. **Refactor toàn bộ implementation** - 替换 src/index.ts 为新模式，删除 PdfWorker/ImageWorker/BaseWorker 等
2. **Thêm làm alternative mode** - 创建新文件作为备选
3. **Chỉ tham khảo, không thay đổi code** - 仅作参考

**用户选择：** "Refactor toàn bộ implementation"

---

## 3. 关键 Subagent 提示词样例 (Critical Subagent Prompts)

### 3.1 阶段二：编写计划提示词 (HH:MM ~10:35)

**实际 prompt：**
> "I'm using the writing-plans skill to create the implementation plan.
>
> ## Context
> [项目是 invoice OCR 管道，使用 chokidar + tesseract.js + LLM。架构和设计已经通过 brainstorming skill 完成]
>
> ## Project root
> `e:/projectVN/watch-file-server`
>
> ## Spec
> `docs/superpowers/specs/2026-07-16-invoice-ocr-pipeline-design.md` (设计规范)
>
> ## Your job
> Read the spec, extract all tasks with full text and context, create TodoWrite with all tasks."

### 3.2 阶段三：Subagent 开发提示词 (HH:MM ~11:00 - 13:10)

**实际 implementer prompt (示例 Task 1)：**
> "You are implementing Task 1: Initialize project (package.json, tsconfig, vitest, eslint)
>
> ## CRITICAL: Use uppercase drive letter
> Use `cd /E/projectVN/watch-file-server` (uppercase `E`) for ALL shell commands.
>
> ## Task Description
> **Files:**
> - Create: `package.json`
> - Create: `tsconfig.json`
> - Create: `vitest.config.ts`
> - Create: `.gitignore`
> - Create: `.eslintrc.cjs`
>
> [Step-by-step TDD content with exact file contents to write]
>
> ## Context
> **Project:** watch-file-server — Node.js/TypeScript invoice OCR pipeline. This is Task 1 of 27.
>
> **Project root:** `e:/projectVN/watch-file-server`
>
> **Current state:** The directory contains only an empty `app.ts` file. There is NO git repo yet (Step 1 inits git).
>
> **Why these tools:**
> - TypeScript + ESM modules (`"type": "module"`)
> - Vitest for testing (faster than Jest, ESM-native)
> - tsx for dev (no separate compile step)
> - pino for structured logging
> - zod for runtime config validation
>
> [More context...]
>
> ## Your Job
> 1. Implement exactly what the task specifies
> 2. Verify the install command works (npm install may take time)
> 3. Commit your work
> 4. Self-review (see below)
> 5. Report back
>
> **REMINDER:** Always use `cd /E/projectVN/watch-file-server` (uppercase `E`).
>
> ## Report Format
> - **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
> - What you implemented
> - Files changed
> - npm install output summary (warnings/errors if any)
> - Self-review findings
> - Any issues"

**实际 spec-reviewer prompt (示例 Task 1)：**
> "You are reviewing whether an implementation matches its specification for Task 1 of the invoice OCR pipeline project.
>
> ## CRITICAL: Use uppercase drive letter
> Use `cd /E/projectVN/watch-file-server` (uppercase `E`) for all test runs.
>
> ## What Was Requested
> [Full Task 1 spec with EXACT file contents]
>
> ## What Implementer Claims They Built
> - Initialized git repo at `e:/projectVN/watch-file-server`
> - Created all 5 config files with exact specified content
> - Installed runtime + dev dependencies
> - Committed all changes
> - Commit `1d2b383` with exact message
>
> **Implementer's concerns:**
> - TS 6.0.3 + eslint plugin peer-dep mismatch (not blocking)
> - Pre-existing `app.ts` and `docs/` planning files were swept into the commit
> - `.gitignore` does not exclude `docs/` folder
>
> ## CRITICAL: Do Not Trust the Report
> You MUST verify everything independently.
>
> ## Your Job
> [Step-by-step verification commands...]
>
> Report:
> - ✅ Spec compliant
> - ❌ Issues found: [list specifically, with file:line references]"

**实际 code-quality-reviewer prompt (示例 Task 5)：**
> "You are reviewing code quality of Task 5 implementation for the invoice OCR pipeline project.
>
> ## CRITICAL: Use uppercase drive letter
> Use `cd /E/projectVN/watch-file-server` (uppercase `E`) for any test runs.
>
> ## Task Summary
> **Task 5: Logger (TDD)** — pino logger factory with level validation and service binding.
>
> **Files created:**
> - `E:/projectVN/watch-file-server/src/lib/logger.ts` (4 lines, actually 10 lines)
> - `E:/projectVN/watch-file-server/tests/unit/lib/logger.test.ts` (~25 lines)
>
> **Commit:** `ac512d4` feat(logger): add pino logger factory
>
> ## What to Review
> Since this is a small utility, focus on:
> 1. Design quality:
>    - Is `createLogger(level?: string): Logger` the right signature?
>    - Why pass `level: string` and validate vs `level: LevelWithSilent`?
> 2. Implementation:
>    - Is the `validLevels` array and validation correct?
>    - Is `base: { service: 'watch-file-server' }` binding useful?
> 3. Test quality:
>    - Do the 2 tests cover the meaningful behaviors?
>    - Is `vi.useFakeTimers()` + dynamic import pattern correct?
> [etc...]
>
> Report:
> - **Strengths:** What's done well
> - **Issues:**
>   - **Critical:** Must fix before proceeding
>   - **Important:** Should fix
>   - **Minor:** Nice to have
> - **Assessment:** Approved | Changes required"

### 3.3 阶段三：fix subagent 提示词 (HH:MM ~11:30, 11:50, etc.)

**实际 fix subagent prompt (示例 Task 2 gitignore fix)：**
> "You are fixing a small .gitignore issue found during Task 2 review.
>
> ## CRITICAL: Use uppercase drive letter
> Use `cd /E/projectVN/watch-file-server` (uppercase `E`) for ALL shell commands.
>
> ## The Problem
> The `.gitignore` at `e:/projectVN/watch-file-server/.gitignore` contains:
> ```
> storage/processed/
> storage/failed/
> ```
> These patterns (with trailing slash) cause git to ignore the entire directory AND its contents — including the `.gitkeep` files we need to track.
>
> ## The Fix
> Change the patterns to use `*` instead of trailing slash:
> ```
> storage/processed/*
> !storage/processed/.gitkeep
> storage/failed/*
> !storage/failed/.gitkeep
> ```
>
> ## Steps
> 1. Read current `.gitignore` first
> 2. Edit `.gitignore`
> 3. Verify with `git check-ignore -v storage/processed/.gitkeep`
> 4. Amend the Task 2 commit
> 5. Report back"

**实际 fix subagent prompt (示例 Task 12 binaryPath 修复)：**
> "You are fixing Critical issue found by code review of Task 12 (TesseractOcr).
>
> ## CRITICAL: Use uppercase drive letter
> Use `cd /E/projectVN/watch-file-server` (uppercase `E`) for ALL shell commands.
>
> ## The Bug
> In `src/services/ocr/tesseract.ts`, the `binaryPath` option is accepted but never passed to `createWorker`:
> ```typescript
> constructor(opts: TesseractOcrProcessorOptions) {
>   this.lang = opts.lang ?? 'eng';
>   this.binaryPath = opts.binaryPath;  // stored but unused
> }
>
> private async getWorker(): Promise<TesseractWorker> {
>   if (!this.workerPromise) {
>     this.workerPromise = createWorker(this.lang);  // binaryPath never used!
>   }
>   return this.workerPromise;
> }
> ```
>
> ## The Fix
> Map `binaryPath` → tesseract.js's `workerPath` option:
> ```typescript
> private async getWorker(): Promise<TesseractWorker> {
>   if (!this.workerPromise) {
>     const workerOptions = this.binaryPath ? { workerPath: this.binaryPath } : undefined;
>     this.workerPromise = createWorker(this.lang, undefined, workerOptions);
>   }
>   return this.workerPromise;
> }
> ```
> Also add `terminate(): Promise<void>` to `OcrProcessor` interface since it's missing.
>
> ## Steps
> 1. Read both files
> 2. Apply the fix
> 3. Run tests
> 4. Run typecheck
> 5. Update plan doc
> 6. Amend the commit"

**实际 fix subagent prompt (示例 Task 15 PermanentError breaker fix)：**
> "You are fixing Critical issue found by code review of Task 15 (HttpAccountingClient).
>
> ## CRITICAL: Use uppercase drive letter
> Use `cd /E/projectVN/watch-file-server` (uppercase `E`) for ALL shell commands.
>
> ## The Bug
> In `src/services/accounting/client.ts`, the `CircuitBreaker.call` method increments `failureCount` for ALL errors, including `PermanentError`. This means a 401 (auth failure) — which signals that the API is healthy but our auth is bad — incorrectly trips the circuit breaker after enough failures.
>
> **Fix:** Only count failures (increment circuit breaker state) for `TransientError`. `PermanentError` should pass through without affecting the breaker.
>
> ```typescript
> } catch (err) {
>   if (err instanceof TransientError) {
>     this.onFailure();
>   }
>   throw err;
> }
> ```
> [continue with 4 steps, tests, plan update, commit amend]"

### 3.4 阶段三：diagnostic 提示词 (HH:MM ~11:25)

**实际 diagnostic prompt (vitest cwd 问题)：**
> "You are diagnosing a vitest environment issue in the watch-file-server project.
>
> ## The Problem
> The implementer found that `npm test` fails with `TypeError: Cannot read properties of undefined (reading 'config')` for all test files.
>
> ## Tasks
> 1. Verify Task 4 tests still pass from project root
> 2. Verify Task 5 tests pass from project root
> 3. Check installed vitest + vite versions
> 4. Reproduce the failure (try different cwds)
> 5. Verify chokidar's real API
> 6. Propose a fix (Options A: improve mock + revert impl, B: accept deviations, C: hybrid)
>
> ## When You're in Over Your Head
> If `vi.hoisted()` doesn't work, try other approaches.
>
> ## Report Format
> - Status
> - Tasks 4 + 5 test results
> - Versions
> - Cwd at time of failure
> - Proposed fix
> - Real chokidar API verification
> - Self-review findings"

**诊断结果：** vite v8 + vitest v4 在 Windows 上 module URL 大小写不一致 — `process.cwd()` 返回 `e:/...`，vite 解析为 `E:/...`。解决方案：所有 subagent 必须用大写 `/E/...` cwd。

### 3.5 阶段四：最终审查提示词 (HH:MM ~13:00)

**实际 final-review prompt：**
> "You are doing a FINAL CODE REVIEW of the entire watch-file-server implementation. This is the last review before the project is considered complete.
>
> ## CRITICAL: Use uppercase drive letter
> Use `cd /E/projectVN/watch-file-server` (uppercase `E`) for any commands.
>
> ## Project: watch-file-server
> A Node.js/TypeScript service that watches directories for invoice files (PDF/image), runs OCR + AI field extraction, and uploads each file to an external EB server using the extracted B/L number.
>
> ## Tech stack: TypeScript, Node.js 20+, chokidar, p-queue, tesseract.js, pdf-parse, sharp, axios, zod, pino, vitest
>
> ## Current state:
> - 27 implementation tasks complete (Tasks 1-27)
> - 54 tests passing across 16 files
> - Typecheck clean
> - No leftover TODOs
> - Working tree clean
> - Latest commit: `766edd4` (README)
>
> ## Your Job
> [3-step review: get diff, run tests, review files]
> [7 review criteria]
> [4 forward-compat checks]
> [Verdict format]"

**最终发现：** 3 个 Important 问题（double-retry、shutdown timeout、dead schema），已修复。

### 3.6 阶段五：重构提示词 (HH:MM ~13:20)

**实际 refactor prompt (简化架构)：**
> "Bạn đang suggest một approach đơn giản hơn nhiều so với implementation hiện tại — chỉ watch → OCR trực tiếp → upload, không có worker/queue/parser/api-client/metrics layer.
>
> Tôi muốn xác nhận intent trước khi refactor (vì implementation hiện tại vừa hoàn thành và đã pass tests):"
>
> [AskUserQuestion with 3 options: Refactor entire / Add as alternative / Just reference]
>
> **用户选择：** "Refactor toàn bộ implementation"

**实际 large refactor subagent prompt：**
> "You are implementing a large refactor of the watch-file-server project to a simpler single-watch architecture.
>
> ## CRITICAL: Use uppercase drive letter
> Use `cd /E/projectVN/watch-file-server` (uppercase `E`) for ALL shell commands.
>
> ## Current state
> - 27 tasks complete
> - 54 tests passing
> - Working tree clean on `master`
>
> ## New architecture (from user)
> ```typescript
> // src/index.ts (simplified)
> chokidar.watch(WATCH_DIR, { awaitWriteFinish: ... })
>   .on('add', (filePath) => {
>     if (!isAllowedFile(filePath)) return;
>     queue = queue.then(async () => {
>       const ocrText = await ocrByKind(filePath, kind, ocr);
>       const ai = await aiExtract(ocrText, ai);
>       uploadToEb(filePath, extractBlNo(ai));
>     });
>   });
> ```
>
> ## Plan
> 1. Inventory current files
> 2. Delete obsolete files (workers, accounting, metrics, parser, pdf-text, old tests)
> 3. Create new files (allowed-extensions, ocr stubs, ai-extractor, upload-to-eb, simple index)
> 4. Update tests
> 5. Update config + README
> 6. Run tests + typecheck
> 7. Commit refactor with clear message"

### 3.7 阶段八：AI 集成提示词 (HH:MM ~14:00)

**实际 user message：** 粘贴完整 chatAll API 代码
> "// =============================================================================
> //  AI extraction — calls the internal chatAll API to extract fields from text
> //  Expected body: { prompt: string | { content: string } }
> // =============================================================================
>
> const AI_API_URL = process.env.AI_API_URL || 'http://ai.dadaex.cn/backapi/chatGpt/chatAll';
> const AI_MODEL_TYPE = process.env.AI_MODEL_TYPE || '2';
> const AI_MODE_NAME = process.env.AI_MODE_NAME || 'gemini-3.5-flash';
> [extractJson / pickAiText / aiExtractFields functions...]
> export async function aiExtractFields(promptText: string) { ... }"

**实际 response prompt (subagent 实施)：**
> "You are integrating real AI extraction (chatAll API) into the watch-file-server project. The user has provided the AI logic code as a reference — you need to:
> 1. Create `src/services/ai/chatall-extractor.ts` with AI_API_URL/AI_MODEL_TYPE/AI_MODE_NAME constants
> 2. Implement `extractJson`, `pickAiText`, `aiExtractFields` helpers
> 3. Create `ChatAllAiExtractor` class implementing `AiExtractor`
> 4. Wire it as default in `startDownloadsWatcher`
> 5. Add `AI_*` env vars to `.env.example`
> 6. Write tests
> 7. Update integration test to mock the new default"

### 3.8 阶段九：AI 整合提示词 (HH:MM ~14:20)

**实际 user message：** "gọi đúng giao diện AI xử lý" (consolidate)

**实际 response subagent prompt：**
> "User đã consolidate tất cả AI logic vào `ai-extractor.ts` (bỏ qua `chatall-extractor.ts`). Clean up duplicate files + tests, rerun.
>
> ## Tasks
> 1. Delete `src/services/ai/chatall-extractor.ts` and its test
> 2. Verify `listen-downloads.ts` imports from `../ai/ai-extractor.js`
> 3. Re-add `aiExtract` and `extractBlNo` helpers if missing
> 4. Run tests + typecheck
> 5. Commit consolidation"

---

## 4. 关键发现 (Key Findings)

### 4.1 真实缺陷 (Real Bugs Caught by Reviews)

| 任务 | 问题 | 严重性 | 修复 |
|------|------|--------|------|
| 12 | `binaryPath` 选项被接收但未传递给 createWorker | C1 关键 | 添加 `workerPath` 映射 |
| 15 | test mock 与实现 API 不匹配（callable vs .post） | 关键 | 重写 mock 提供 .post 方法 |
| 15 | PermanentError 触发熔断器 | 重要 | 仅 TransientError 调用 onFailure |
| 16 | 非 2xx 响应被静默视为成功 | C1 关键 | 检查 `res.ok` 抛错 |
| 19 | size-stability 仅 stat 一次 | 重要 | 订阅 chokidar 'change' 事件 |
| 20 | `shouldRetry` 谓词反向 | 重要 | 改为 `err instanceof TransientError` |
| 13 | 发票号 regex 匹配 "Invoice" 一词 | 阻塞 | 要求 `\d` 开头 |
| 13 | TOTAL_RE 匹配 Subtotal | 重要 | 添加 `\bTotal\b` 边界 |

### 4.2 流程问题 (Process Issues)

| 问题 | 解决方案 |
|------|----------|
| vitest cwd 大小写不一致（Windows）| 强制使用大写 `/E/...` |
| test mock 不匹配实现 API | 在重写 mock 之前用 `node -e` 验证真实 API |
| Plan 文档的 bug（如 `isPermanent ? 'fail' : 'fail'`）| 在 review 阶段识别并修复 |
| 实施者添加 EXACT 之外的注释 | 在 spec review 中标记为内容偏差 |

### 4.3 Subagent 行为观察 (Subagent Behavior Observations)

- **Implementer** 严格遵循 EXACT content；遇到 spec bug 时 BLOCKED（正确行为）
- **Spec reviewer** 识别 byte-for-byte 差异，包括"功能性 vs 内容性"区分
- **Code quality reviewer** 优先标记 Critical > Important > Minor；提供具体修复建议
- **Fix subagent** 倾向于保守；遇到 spec/mock 不匹配时 BLOCKED 而不是猜
- **Re-review** 严格验证修复是否解决了原问题

---

## 5. 提示词模板通用结构 (Common Template Structure)

所有提示词遵循以下结构：

```
[角色] + [上下文] + [明确任务] + [约束条件] + [成功标准]
```

| 组件 | 作用 |
|------|------|
| 角色 (Role) | 明确 subagent 的职责与权限 |
| 上下文 (Context) | 项目状态、相关文件、依赖关系 |
| 任务 (Task) | 明确目标，避免歧义 |
| 约束 (Constraints) | 边界条件、不可触碰的范围 |
| 成功标准 (Success) | 如何判定完成；自检清单 |

**关键原则：**
1. **大写 cwd 警告** — 每次都重复 `cd /E/projectVN/watch-file-server`
2. **EXACT content** — 实施者要严格按规范写代码
3. **TypeScript 严格模式** — `noUncheckedIndexedAccess` 需要 `match[1]!` 等断言
4. **Do Not Trust the Report** — 每个 reviewer 必须独立验证
5. **Unified Report Format** — Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT

---

## 6. Refactor 阶段统计 (Refactor Stage Statistics)

### 6.1 大重构 (Major Refactor — commit `08e2454`)

**范围：** 从 27 任务完整架构 → 简单单 watcher 架构

| 项目 | 数值 |
|------|------|
| 删除文件 | 25+ |
| 新建文件 | 7 |
| 代码行数变化 | +182 / -1989 |
| 测试变化 | 54 → 27 (-27) |

### 6.2 集成阶段 (Integration Stage)

| 阶段 | 提交 | 描述 |
|------|------|------|
| OCR 集成 | `e696d59` | Tesseract + pdf-to-img + mammoth |
| dotenv 恢复 | `f16d8f6` | 修复重构时误删的 import |
| Logger 颜色 | `ba5f79c` | ANSI 颜色，TTY 检测 |
| AI 集成 | `dd1caf8` | chatAll API extractor |
| AI 整合 | `7cf243a` | 合并到 ai-extractor.ts |
| **当前状态** | — | 51/51 测试通过 |

---

## 7. 关键提示词优化模式 (Key Prompt Optimization Patterns)

1. **明确化 (Explicitness)**
   - 列出具体文件路径、具体测试命令、具体 commit message
   - 不要说"做正确的事"，要说"运行 `cd /E/... && npm test`，期望 27 passed"

2. **自检清单 (Self-Review Checklist)**
   - 每个任务都列出明确的 self-review 项目
   - 让 subagent 知道何时"完成"

3. **失败模式 (Failure Modes)**
   - 提前说明 "When You're in Over Your Head" — 失败时如何处理
   - 提供 BLOCKED vs DONE_WITH_CONCERNS 的明确区分

4. **EXACT 模式 (EXACT Pattern)**
   - 实施者要严格按 EXACT content 写代码
   - spec reviewer 要识别 byte-for-byte 偏差

5. **统一报告格式 (Unified Report Format)**
   - Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
   - Files changed
   - Step N output
   - All tests output
   - Self-review findings
   - Any issues

---

*本文档由 `watch-file-server` 项目最终审查流程生成，统计约 144 个 subagent 提示词 + 7 个用户问题。*
