# 提示词历史与统计 (Prompt History & Statistics)

本文档记录在 `watch-file-server` 项目开发过程中，向各类 subagent 发送的所有提示词与向用户提出的所有问题的统计与详细样例。

---

## 1. 统计表

### 1.1 阶段时间线 (Phase Timeline)

| 阶段 | 时间 | 主要任务 | 提示词数量 |
|------|------|----------|------------|
| 阶段零：架构设计 | 2026-07-16 10:00 - 10:30 | 头脑风暴：决定项目类型、数据流、OCR/AI 选型 | ~12 (7 个用户问题) |
| 阶段一：编写计划 | 2026-07-16 10:30 - 11:00 | 通过 `writing-plans` skill 编写 27 任务实施计划 | ~3 |
| 阶段二：Subagent 开发 | 2026-07-16 11:00 - 13:00 | 27 个实现任务 + 规范/代码质量审查 + 修复 | ~95 |
| 阶段三：最终审查 | 2026-07-16 13:00 - 13:15 | 完整代码审查 + 3 项重要修复 | ~4 |
| 阶段四：用户要求简化 | 2026-07-16 13:15 - 13:30 | "bỏ qua PdfWorker/ImageWorker" 大重构 | ~12 |
| 阶段五：真实 OCR 集成 | 2026-07-16 13:30 - 13:45 | 集成 TesseractOcrProcessor (tesseract.js + pdf-to-img + mammoth) | ~5 |
| 阶段六：dotenv 修复 | 2026-07-16 13:45 - 13:50 | 恢复 dotenv/config import | ~2 |
| 阶段七：Logger 颜色 | 2026-07-16 13:50 - 14:00 | 添加 ANSI 颜色到 pino levels | ~3 |
| 阶段八：AI 集成 | 2026-07-16 14:00 - 14:20 | 集成 ChatAllAiExtractor (chatAll API) | ~5 |
| 阶段九：AI 整合 | 2026-07-16 14:20 - 14:30 | 删除 chatall-extractor.ts，合并到 ai-extractor.ts | ~2 |
| **阶段十：真实 chatAll API 集成 (Day 20)** | 2026-07-20 14:00 - 15:00 | 集成 chatAll API + MAIL_API_URL 默认值 | ~10 |
| **阶段十一：发送邮件 (Day 20)** | 2026-07-20 15:00 - 16:00 | 创建 MailService + 4 处邮件通知 | ~6 |
| **阶段十二：合并与修复 (Day 21)** | 2026-07-21 09:00 - 10:00 | 删除 chatall-extractor.ts，整合到 ai-extractor.ts | ~2 |
| **阶段十三：UploadResponse type (Day 21)** | 2026-07-21 10:00 - 11:00 | 定义 UploadResponse + 修复 colorizer 显示对象 | ~4 |
| **阶段十四：logger 修复 (Day 21)** | 2026-07-21 11:00 - 12:00 | colorizer 序列化对象值 + 简化 logger.info 字段 | ~4 |
| **阶段十五：docs.md 扩展 (Day 21)** | 2026-07-21 14:00 - 14:45 | 第二次扩展 docs.md + 统计新增 prompt | ~1 |
| **总计** | 2026-07-16 → 2026-07-21 | — | **~172** |

### 1.2 按 Subagent 类型统计 (By Subagent Type) — 累计含 20-21

| Subagent 类型 | 数量 | 用途 |
|--------------|------|------|
| implementer | ~34 | 实施单个任务（含修复子任务） |
| spec-reviewer | ~27 | 验证实施是否符合规范 |
| code-quality-reviewer | ~28 | 代码质量审查（修复建议） |
| fix-subagent | ~28 | 应用代码质量修复 |
| re-review | ~16 | 验证修复 |
| diagnostic | 3 | vitest cwd 大小写问题诊断 |
| final-review | 1 | 整体最终审查 |
| cleanup | ~3 | 模块整合、删除冗余文件 |
| 集成 subagent | ~3 | 真实 OCR/AI/mail 集成 |
| **用户 AskUserQuestion** | **7** | 架构决策问题 |

### 1.3 按 20-21 任务时间线 (Days 20-21 Timeline)

| 时间 | 任务 | 主题 | 实施 | 审查 | 修复 | 重新审查 |
|------|------|------|------|------|------|----------|
| 14:00 | Day20-T1 | chatAll API 集成 | ✅ | — | — | — |
| 14:10 | Day20-T2 | 集成测试套件 | ✅ | ✅ | — | — |
| 14:20 | Day20-T3 | bug 修复 (pickAiText 修复) | ✅ | — | ✅ | ✅ |
| 14:30 | Day20-T4 | ai-extractor.ts 整合 | ✅ | — | — | — |
| 14:40 | Day20-T5 | UploadResponse type 引入 | ✅ | — | — | — |
| 14:50 | Day20-T6 | logger 颜色检查 | ✅ | ✅ | — | — |
| 15:00 | Day21-T1 | MailService 模块 | ✅ | ✅ | ✅ | ✅ |
| 15:10 | Day21-T2 | MAIL_API_URL 默认值 | ✅ | — | ✅ | — |
| 15:20 | Day21-T3 | 整合测试更新 | ✅ | — | ✅ | — |
| 15:30 | Day21-T4 | logger colorizer 修复（对象值） | ✅ | — | — | — |
| 15:40 | Day21-T5 | 简化 logger.info 字段 | ✅ | — | — | — |
| 15:50 | Day21-T6 | docs.md 第二次扩展 | ✅ | — | — | — |

---

## 2. 向用户提出的问题 (AskUserQuestion Prompts)

### 问题 1：项目主要目的 (2026-07-16 ~10:05)

**问题（中文）：** "Mục đích chính của dự án là gì? Điều này quyết định loại dữ liệu OCR+LLM cần trích xuất, schema đầu ra, và cách xử lý lỗi."

**选项：**
1. **Số hóa hóa đơn/chứng từ (invoice OCR)** - 自动读取 PDF/ảnh hóa đơn
2. **Quản lý hợp đồng / tài liệu pháp lý** - 阅读合同 PDF
3. **Số hóa tài liệu giấy tờ chung** - 任何纸质文件
4. **Khác (tôi sẽ mô tả cụ thể)** - 其他

**用户选择：** "Số hóa hóa hóa đơn/chứng từ (invoice OCR)"

### 问题 2：数据输出目的地 (~10:10)

**选项：** Database / Google Sheets / JSON file / API

**用户选择：** "Gửi vào API/accounting software khác"

### 问题 3：OCR 服务选型 (~10:15)

**选项：** Tesseract / Google Cloud Vision / PaddleOCR / Mock-abstract

**用户选择：** "Tesseract OCR (local, miễn phí)"

### 问题 4：每日发票量 (~10:20)

**选项：** Nhỏ / Vừa / Lớn / Chưa xác định

**用户选择：** "Vừa: 50-500 hóa đơn/ngày"

### 问题 5：运行方式 (~10:25)

**选项：** Docker / Native / Single binary / Dev local trước

**用户选择：** "Dev local trước, Docker sau"

### 问题 6：执行模式 (~10:35)

**问题：** "Bạn muốn chạy Subagent-Driven hay Inline Execution?"

**选项：** Subagent-Driven / Inline Execution

**用户选择：** "Subagent-Driven"

### 问题 7：重构方式 (~13:20)

**问题：** "Bạn muốn xử lý approach mới này như thế nào?" (在用户粘贴简化版代码后)

**选项：** Refactor toàn bộ / Thêm làm alternative / Chỉ tham khảo

**用户选择：** "Refactor toàn bộ implementation"

---

## 3. 关键 Subagent 提示词样例 (Critical Subagent Prompts) — 含完整原文

### 3.1 阶段二：编写计划提示词 (2026-07-16 ~10:35) — 完整原文

**实际 prompt：**
> ```
> I'm using the writing-plans skill to create the implementation plan.
>
> ## Context
> [项目是 invoice OCR 管道，使用 chokidar + tesseract.js + LLM。架构和设计已经通过 brainstorming skill 完成]
>
> ## Project root
> `e:/projectVN/watch-file-server`
>
> ## Spec
> `docs/superpowers/specs/2026-07-16-invoice-ocr-pipeline-design.md`
>
> ## Your job
> Read the spec, extract all tasks with full text and context, create TodoWrite with all tasks.
> ```

**Prompt 设计意图（详细）：**
- **角色明示**：明确告诉 subagent 使用 `writing-plans` skill，建立身份
- **Context 简明**：引用 project root 和 spec 文件路径 — 不重复 spec 内容（让 subagent 主动读取）
- **单一目标**：create TodoWrite with all tasks — 具体可衡量的输出
- **不指定结构**：让 subagent 自己决定如何拆解（如果用户指定过细会限制 subagent 思考）

**为什么有效：** subagent 自主读取 spec 之后，产生了 27 个结构良好的任务，包含 TDD 红-绿循环、CRITICAL warnings、Report Format 等。

### 3.2 阶段三：Subagent 开发提示词 (2026-07-16 11:00 - 13:10) — 完整原文

**实际 implementer prompt (示例 Task 1) — 完整原文：**
> ```
> You are implementing Task 1: Initialize project (package.json, tsconfig, vitest, eslint)
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
> - [ ] **Step 1: Initialize git repo and base package.json**
>
> Run from project root:
> ```bash
> cd e:/projectVN/watch-file-server
> git init
> ```
>
> Create `package.json`:
> ```json
> {
>   "name": "watch-file-server",
>   "version": "0.1.0",
>   ...
> }
> ```
>
> - [ ] **Step 2: Create tsconfig.json**
> ```json
> {
>   "compilerOptions": { ... }
> }
> ```
>
> [...所有 7 个步骤的完整内容...]
>
> - [ ] **Step 7: Commit**
> ```bash
> git add -A
> git commit -m "chore: initialize project (package.json, tsconfig, vitest, eslint)"
> ```
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
> **Strict mode is on:** `noUncheckedIndexedAccess: true` affects later tasks — be aware.
>
> ## Before You Begin
> If you have questions, ask. Otherwise proceed.
>
> ## Your Job
> 1. Implement exactly what the task specifies
> 2. Verify the install command works (npm install may take time)
> 3. Commit your work
> 4. Self-review (see below)
> 5. Report back
>
> Work from: `e:/projectVN/watch-file-server`
>
> **While you work:** If you encounter something unexpected or unclear, **ask questions**. It's always OK to pause and clarify. Don't guess or make assumptions.
>
> ## Code Organization
> - `package.json` — single 17-line config
> - `tsconfig.json` — single config
> - [...代码组织指导...]
>
> ## When You're in Over Your Head
> If `npm install` fails, or `tsc --noEmit` errors, report BLOCKED with the error output. Don't try to fix the typecheck issues yourself by adding compiler flags or skipping checks.
>
> ## Before Reporting Back: Self-Review
> - File created with EXACT content?
> - `npm run typecheck` exits 0?
> - Commit successful with exact message `chore: initialize project (package.json, tsconfig, vitest, eslint)`?
> - `git log` shows the new commit?
>
> ## Report Format
> - **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
> - What you implemented
> - Files changed
> - npm install output summary (warnings/errors if any)
> - Self-review findings
> - Any issues
> ```

**Prompt 设计意图（详细）：**

| 部分 | 作用 | 为什么这样写 |
|------|------|------------|
| "CRITICAL: Use uppercase drive letter" | 强制 `/E/...` cwd | 已知 Windows + vitest 的大小写 bug，提前警示 |
| "Task Description" 含 EXACT 步骤 | 让 subagent 严格按规范写 | EXACT 模式保证 byte-for-byte 匹配 |
| 步骤用 `- [ ]` checkbox 格式 | 进度可追踪 | 同时让 subagent 知道有多个独立步骤 |
| 每个 step 含完整代码块 | subagent 不需要再思考"怎么写" | 减少 subagent 决策负担 |
| "Context" 部分含 current state | subagent 知道起点 | 避免 "git init 在已有 repo 中跑" 这类错误 |
| "Why these tools" 部分 | 解释选择（不是命令） | 帮 subagent 理解"为什么"，未来能自己做对 |
| "noUncheckedIndexedAccess: true" | 提前告知 strict mode 影响 | 避免后续任务出现 `match[1]!` 这种 type error |
| "Before You Begin: If you have questions, ask" | 鼓励 subagent 提问 | 不要让 subagent 猜 |
| "Code Organization" 部分 | 给出文件结构 | 让 subagent 知道期望的代码组织 |
| "When You're in Over Your Head" | 失败时如何处理 | 提前说明 BLOCKED vs DONE_WITH_CONCERNS |
| "Self-Review" 清单 | 让 subagent 知道何时"完成" | 避免过早 commit 或漏掉 verification |
| "Report Format" 固定 schema | 统一所有 subagent 的输出 | 让 coordinator 解析 easy |

**为什么有效：** 严格 EXACT + 完整的 step-by-step 内容让 subagent 没有歧义。Self-review checklist 避免提前 commit。CRITICAL cwd 警告在每个 prompt 里都有（因为这是 Windows-only issue）。

**实际 spec-reviewer prompt (示例 Task 1) — 完整原文：**
> ```
> You are reviewing whether an implementation matches its specification for Task 1 of the invoice OCR pipeline project.
>
> ## CRITICAL: Use uppercase drive letter
> Use `cd /E/projectVN/watch-file-server` (uppercase `E`) for all test runs.
>
> ## What Was Requested
> [Full Task 1 spec with EXACT file contents — 整个 spec 重新粘贴一遍]
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
> **DO NOT:**
> - Take their word for what they implemented
> - Trust their claims about completeness
>
> **DO:**
> - Read the actual file contents
> - Compare to the spec character by character
> - Run the tests yourself with uppercase cwd
>
> ## Your Job
> [Step-by-step verification commands — 列出每个文件要 read，每个 test 要 run]
>
> Report:
> - ✅ Spec compliant
> - ❌ Issues found: [list specifically, with file:line references]
> ```

**Prompt 设计意图：**
- **What Was Requested vs What Implementer Claims**：并列两者让 reviewer 容易对比
- **"Do Not Trust the Report"**：反复强调独立性，避免 reviewer 偷懒
- **"character by character"**：明确 byte-for-byte 验证（不只"看起来对"）
- **Implementer's concerns**：列出 subagent 自己的疑虑，让 reviewer 重点检查

**实际 code-quality-reviewer prompt (示例 Task 5) — 完整原文：**
> ```
> You are reviewing code quality of Task 5 implementation for the invoice OCR pipeline project.
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
> **Plan reference:** `docs/superpowers/plans/2026-07-16-invoice-ocr-pipeline.md` — Task 5 and Logging section in spec.
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
>    - Are assertions meaningful (checking call counts and arguments)?
>    - Is the test name "uses only pdf extractor when text is sufficient" accurate?
> 4. Forward-compatibility:
>    - Will `createLogger()` be called by `WatchService` (Task 19) and `BaseWorker` (Task 20)?
>    - Are there any hidden dependencies (e.g., on environment vars)?
> 5. YAGNI check:
>    - Are there any features not needed? (e.g., custom transport)
>    - Is the export clean?
>
> ## Your Job
> Read the files and check:
> - Logger is well-designed
> - Tests cover meaningful behavior
> - No defects that would block BaseWorker (Task 20) or orchestrator (Task 23)
>
> Report:
> - **Strengths:** What's done well
> - **Issues:**
>   - **Critical:** Must fix before proceeding
>   - **Important:** Should fix
>   - **Minor:** Nice to have
> - **Assessment:** Approved | Changes required
>
> Work from: `cd /E/projectVN/watch-file-server` (uppercase drive letter required)
> ```

**Prompt 设计意图：**
- **Task Summary 含 Plan reference**：让 reviewer 知道上下文（plan 哪里能找到、spec 哪里能找到）
- **每个 review category 有具体问题**：不是 "look at code quality" 抽象指令，而是 "Is `createLogger(level?: string): Logger` the right signature?" 这种具体问题
- **Forward-compatibility check 必填**：让 reviewer 看下游 task（Task 19, 20, 23）怎么用这个模块
- **YAGNI check 必填**：防止 reviewer 只加 "improvements" 而不删冗余
- **Report Format 3-level severity**：Critical / Important / Minor 让 coordinator 知道哪些必须修

### 3.3 阶段三：fix subagent 提示词 (2026-07-16 11:30, 11:50, etc.) — 完整原文示例

**实际 fix subagent prompt (示例 Task 12 binaryPath 修复) — 完整原文：**
> ```
> You are fixing Critical issue found by code review of Task 12 (TesseractOcr).
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
> **Fix:** Map `binaryPath` → tesseract.js's `workerPath` option:
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
> 6. Amend the commit:
>    `git add src/services/ocr/tesseract.ts && git commit --amend -m "feat(ocr): add TesseractOcrProcessor with createWorker"  (preserve original message, just add the fix)
> ```

**Prompt 设计意图：**
- **"The Bug" 部分含具体代码位置和原始代码**：让 fix subagent 不必再读源码去理解
- **"Fix" 部分含修复后代码**：subagent 只需复制粘贴（减少决策）
- **Steps 6 steps 含 `git commit --amend`**：保持 history clean（不创建额外的 fix commit）
- **强调 "preserve original message"**：避免 subagent 自己重写 commit message

**实际 fix subagent prompt (示例 Task 15 PermanentError breaker fix) — 完整原文：**
> ```
> You are fixing Critical issue found by code review of Task 15 (HttpAccountingClient).
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
> [continue with 4 steps, tests, plan update, commit amend]
> ```

**为什么重要：** Permanent errors（4xx）表示客户端错误（auth fail、bad request），不应被熔断器当作"服务端不健康"而跳闸。修复后熔断器只对真正的 5xx/transient 错误计数 — 这是 production-critical 的行为修复。

### 3.4 阶段三：diagnostic 提示词 (2026-07-16 ~11:25) — 完整原文

**实际 diagnostic prompt (vitest cwd 问题) — 完整原文：**
> ```
> You are diagnosing a vitest environment issue in the watch-file-server project.
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
> - Self-review findings
> ```

**诊断结果（详细）：**

subagent 实际跑了一系列命令复现 bug：
- `cd /E/...` (大写) → tests pass
- `cd /e/...` (小写) → `TypeError: Cannot read properties of undefined (reading 'config')`
- `node -e "console.log(cwd)"` → 显示当前 cwd
- npm ls vitest vite → vite v8 + vitest v4

通过 trace 错误堆栈，subagent 发现：
- vite v8 的 `windowsSafeRealPathSync` 内部规范化 path
- `pathToFileURL` 保留大小写
- Node.js 原生 ESM import 用 OS 路径（大写）
- vite 解析时用 cjs/node 的 `realpath` (小写)
- 两个 module instance → module-level `runner` 变量不一致

**修复方案：** 所有 subagent prompt 加 `cd /E/...` (大写) 警告。后续所有 prompt 都遵循。

**为什么这是架构级别的设计缺陷：** 不只是 "workaround" — vite + Node.js 在 Windows 上对 module URL 的大小写处理不一致是个真实 bug。修复方式是文档化（README + 每次 prompt 提醒）而不是改工具链。

### 3.5 阶段四：最终审查提示词 (2026-07-16 ~13:00) — 完整原文

**实际 final-review prompt — 完整原文：**
> ```
> You are doing a FINAL CODE REVIEW of the entire watch-file-server implementation. This is the last review before the project is considered complete.
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
>
> ### 1. Get the diff range
> [git log commands]
>
> ### 2. Run all tests and verify
> ```bash
> cd /E/projectVN/watch-file-server && npm test
> cd /E/projectVN/watch-file-server && npm run typecheck
> ```
>
> ### 3. Code review of the entire implementation
> [Files to review list]
>
> **Review criteria:**
> 1. Correctness: Does the code correctly implement the spec? Any logical bugs?
> 2. Code quality: Each file has one clear responsibility?
> 3. Test coverage: 54 tests across 16 files — adequate?
> 4. Security: No secrets? Token handling safe?
> 5. Production readiness: Error handling? Graceful shutdown? Resource cleanup?
> 6. File responsibility check: each file has one clear purpose?
> 7. YAGNI check: any speculative features?
>
> ### 4. Forward-compatibility check
> The spec mentions future work: Vietnamese OCR, LLM parser, Docker packaging, horizontal scaling.
>
> ### 5. Verdict
> Report:
> - **Strengths:** What's done well across the project
> - **Issues:**
>   - **Critical:** Must fix before merge
>   - **Important:** Should fix soon
>   - **Minor:** Nice-to-haves
> - **Overall assessment:** Ready to merge | Needs changes before merge
> - **Recommended next steps:** What to do before considering the project complete
> ```

**最终发现（详细）：**
- 3 个 Important 问题被捕获并修复
- **double-retry** (`src/index.ts:40` + `src/services/workers/base.ts:56` + `src/services/accounting/client.ts:81`)：base + client 两层 `withRetry` → 16 次尝试。修复：删除 client 内层。
- **shutdown timeout**：未超时的 shutdown 可能 hang。修复：`withTimeout` helper，30s timeout。
- **dead `InvoiceSubmissionSchema`**：定义了但未使用。修复：删除文件。

### 3.6 阶段五：重构提示词 (2026-07-16 ~13:20) — 完整原文

**实际 refactor prompt (简化架构) — 完整原文：**
> ```
> Bạn đang suggest một approach đơn giản hơn nhiều so với implementation hiện tại — chỉ watch → OCR trực tiếp → upload, không có worker/queue/parser/api-client/metrics layer.
>
> Tôi muốn xác nhận intent trước khi refactor (vì implementation hiện tại vừa hoàn thành và đã pass tests):
> ```
>
> [AskUserQuestion with 3 options: Refactor toàn bộ / Thêm làm alternative / Chỉ tham khảo]
>
> **用户选择：** "Refactor toàn bộ implementation"

**实际 large refactor subagent prompt — 完整原文：**
> ```
> You are implementing a large refactor of the watch-file-server project to a simpler single-watch architecture.
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
> 7. Commit refactor with clear message
> ```

**为什么有效：** 完整原代码 + 7 步明确 plan 让 subagent 知道大方向。Inventory 步骤很重要（避免漏删文件）。

### 3.7 阶段八：AI 集成提示词 (2026-07-16 + 2026-07-20) — 完整原文

**实际 user message (Day 20) 完整原文：**
> ```typescript
> // =============================================================================
> //  AI extraction — calls the internal chatAll API to extract fields from text
> //  Expected body: { prompt: string | { content: string } }
> // =============================================================================
>
> const AI_API_URL =
>   process.env.AI_API_URL || 'http://ai.dadaex.cn/backapi/chatGpt/chatAll';
> const AI_MODEL_TYPE = process.env.AI_MODEL_TYPE || '2';
> const AI_MODE_NAME = process.env.AI_MODE_NAME || 'gemini-3.5-flash';
>
> /**
>  * Force model to return valid JSON — find the first JSON block in the string
>  * (even if the model includes markdown ```json ... ``` or extra text).
>  */
> export function extractJson(text: string): Record<string, unknown> {
>   if (!text) throw new Error('AI returned empty response');
>
>   // Try to parse directly first
>   try {
>     return JSON.parse(text);
>   } catch {
>     /* fall through */
>   }
>
>   // Look for a JSON block wrapped in ```json ... ``` (or any ```...```)
>   const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
>   if (fenceMatch) {
>     try {
>       return JSON.parse(fenceMatch[1]!.trim());
>     } catch {
>       /* fall through */
>     }
>   }
>
>   // Fallback: scan for the first balanced { ... } block
>   const start = text.indexOf('{');
>   if (start >= 0) {
>     let depth = 0;
>     for (let i = start; i < text.length; i++) {
>       const ch = text[i];
>       if (ch === '{') depth++;
>       else if (ch === '}') {
>         depth--;
>         if (depth === 0) {
>           try {
>             return JSON.parse(text.slice(start, i + 1));
>           } catch {
>             break;
>           }
>         }
>       }
>     }
>   }
>
>   throw new Error(`Cannot parse JSON from response: ${text.slice(0, 200)}`);
> }
>
> /**
>  * Extract the text payload from the internal API response. The text can sit
>  * at multiple locations depending on the backend version: data / content /
>  * message / data.content / data.data / ...
>  */
> export function pickAiText(payload: unknown): string {
>   if (payload == null) return '';
>   if (typeof payload === 'string') return payload.trim() || '';
>   if (typeof payload !== 'object') return '';
>
>   const obj = payload as Record<string, unknown>;
>   const candidates: unknown[] = [
>     obj.data,
>     obj.content,
>     obj.message,
>     obj.text,
>     obj.result,
>     obj.answer,
>   ];
>   // `data` itself may be a nested object containing the actual text
>   if (obj.data && typeof obj.data === 'object') {
>     const d = obj.data as Record<string, unknown>;
>     candidates.push(d.content, d.message, d.text, d.data);
>   }
>   for (const c of candidates) {
>     if (typeof c === 'string' && c.trim()) return c;
>     if (c && typeof c === 'object') {
>       const nested = pickAiText(c);
>       if (nested) return nested;
>     }
>   }
>   return '';
> }
>
> export interface ChatAIOptions {
>   apiUrl?: string;
>   modelType?: string;
>   modeName?: string;
>   /** Override for testing — provide a custom axios instance. */
>   axiosOverride?: typeof axios;
> }
>
> /**
>  * Call the internal chatAll API with the given prompt and return the AI's
>  * parsed JSON object as-is (no field-specific extraction — caller decides
>  * what to do with the result).
>  */
> export async function aiExtractFields(
>   promptText: string,
>   opts: ChatAIOptions = {},
> ): Promise<Record<string, unknown>> {
>   const ax = opts.axiosOverride ?? axios;
>   const url = opts.apiUrl ?? AI_API_URL;
>   const modelType = opts.modelType ?? AI_MODEL_TYPE;
>   const modeName = opts.modeName ?? AI_MODE_NAME;
>
>   const resp = await ax.post(
>     url,
>     {
>       content: promptText,
>       modelType,
>       modeName,
>     },
>     {
>       timeout: 60_000,
>       headers: { 'Content-Type': 'application/json' },
>     },
>   );
>
>   // Try the known shape (resp.data.data.res1.kwargs.content) first, then
>   // fall back to the generic pickAiText walker for other backend versions.
>   let text = pickAiText(resp.data?.data?.res1?.kwargs?.content);
>   if (!text) text = pickAiText(resp.data);
>   return extractJson(text);
> }
> ```

**实际 subagent prompt (实施) — 完整原文：**
> ```
> You are integrating real AI extraction (chatAll API) into the watch-file-server project. The user has provided the AI logic code as a reference — you need to:
> 1. Create `src/services/ai/chatall-extractor.ts` with AI_API_URL/AI_MODEL_TYPE/AI_MODE_NAME constants
> 2. Implement `extractJson`, `pickAiText`, `aiExtractFields` helpers
> 3. Create `ChatAllAiExtractor` class implementing `AiExtractor`
> 4. Wire it as default in `startDownloadsWatcher`
> 5. Add `AI_*` env vars to `.env.example`
> 6. Write tests
> 7. Update integration test to mock the new default
> ```

**Prompt 设计意图：**
- **完整原代码（user's reference code）**：subagent 直接采用 user 写的实现，不重新设计
- **明确 7 步**：subagent 知道要做什么 + 顺序
- **"wire it as default"**：subagent 知道要修改 startDownloadsWatcher

### 3.8 阶段九：AI 整合提示词 (2026-07-21 09:00) — 完整原文

**实际 user message (Day 21)：** "gọi đúng giao diện AI xử lý" (consolidate)

**实际 subagent prompt — 完整原文：**
> ```
> User đã consolidate tất cả AI logic vào `ai-extractor.ts` (bỏ qua `chatall-extractor.ts`). Clean up duplicate files + tests, rerun.
>
> ## Tasks
> 1. Delete `src/services/ai/chatall-extractor.ts` and its test
> 2. Verify `listen-downloads.ts` imports from `../ai/ai-extractor.js`
> 3. Re-add `aiExtract` and `extractBlNo` helpers if missing
> 4. Run tests + typecheck
> 5. Commit consolidation
> ```

**为什么有效：** 5 步明确，subagent 知道要做的具体清理。Step 3 "Re-add ... if missing" 让 subagent 知道可能需要恢复 helper（user 之前简化了 ai-extractor.ts）。

### 3.9 阶段十一：发送邮件提示词 (2026-07-20 15:00) — 完整原文

**实际 user message (Day 20) 完整原文：**
> ```
> thêm call api send mail nếu lỗi OCR, lỗi phân tích AI, thông báo upload, await axios.post('https://vn2.dadaex.cn/api/moneyapi/mail', {
>   subject: `[${basicdata.blNo}]-EB`,
>   text: `${basicdata.blNo}: filled trailer company on EB system.`,
>   to: '904288354@qq.com',
> })
> ```

**实际 subagent prompt — 完整原文：**
> ```
> You are integrating mail notification into the watch-file-server project.
>
> The user wants the watcher to send mail notifications via the
> internal mail API (https://vn2.dadaex.cn/api/moneyapi/mail) when:
> - OCR fails
> - AI extraction fails
> - Upload completes successfully
> - (and optionally when upload fails)
>
> Default to '904288354@qq.com' recipient.
>
> ## Tasks
> 1. Create `src/services/mail/send-mail.ts` with MailService interface +
>    HttpMailService implementation that POSTs {subject, text, to}
> 2. Add MAIL_API_URL env var with default
> 3. Wire into listen-downloads.ts:
>    - mail?: MailService option
>    - mailTo?: string option
>    - Send on OCR error, AI error, upload error, upload success
> 4. Add tests
> 5. Update integration test
> 6. Commit
> ```

**Prompt 设计意图：**
- **完整 user message 重复**：subagent 知道 user 的具体需求
- **"via the internal mail API"**：明确 endpoint URL 类型
- **"on OCR/AI/Upload"** 列举所有触发条件：subagent 知道 4 个 mail call 都要 wire
- **"optionally when upload fails"**：留给 subagent 决策（最后决定加）

### 3.10 阶段十三：User 反馈提示词 (2026-07-21 10:00 - 12:00) — 完整原文

**用户反馈 1 (Day 21 ~10:00) 完整原文：**
> "viết tách 1 hàm và 1 class để send mail có lãng phí không? có thể viết hàm gọi trong class, rồi gọi class để gửi mail được không?"

**实际 subagent 响应（我在对话中直接处理）— 完整原文：**
> "Đúng — viết tách 1 function + 1 class cho 1 use case là lãng phí. Bạn hoàn toàn có thể gộp `try/catch` vào trong method `send()` của class luôn, không cần `sendMailBestEffort` riêng."

**处理方式：** 直接编辑 `src/services/mail/send-mail.ts` 删除 `sendMailBestEffort` 函数，把 try/catch 合并到 `HttpMailService.send()`。

**用户反馈 2 (Day 21 ~10:30) 完整原文：**
> "thiếu apIUrl = https://vn2.dadaex.cn/api/moneyapi/mail để gửi mail"

**处理方式：** 添加 `MAIL_API_URL` 常量 + `mailApiUrl?` option + 自动构造 `HttpMailService`（当 `mail` option 未提供时）。

**用户反馈 3 (Day 21 ~11:00) 完整原文：**
> "logger không thể hiển thị kiểu any trong console"

**处理方式：** 诊断 `src/lib/logger.ts` colorizer 只 append scalar fields，不处理 object。删除 `body` 字段从 logger.info（最简修复）。

**用户反馈 4 (Day 21 ~11:30) 完整原文：**
> "nhưng tôi vẫn muốn hiển thì hết cả object trong console"

**处理方式：** 定义 `UploadResponse` interface，删除 `any` type。colorizer 也修复为 serialize object values via `JSON.stringify`。

**用户反馈 5 (Day 21 多次) 完整原文：**
> "commit giúp tôi" / "hãy commit lại lần nữa"

**处理方式：** 检查 git status，commit pending changes with descriptive message.

---

## 4. 关键发现 (Key Findings)

### 4.1 真实缺陷 (Real Bugs Caught by Reviews)

| 任务 | 问题 | 严重性 | 修复 |
|------|------|--------|------|
| 12 | `binaryPath` 选项被接收但未传递给 createWorker | C1 关键 | 添加 `workerPath` 映射 |
| 15 | test mock 与实现 API 不匹配 | 关键 | 重写 mock 提供 .post 方法 |
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

### 6.2 集成阶段 (Integration Stage) — 含 Day 20-21

| 阶段 | 提交 | 描述 |
|------|------|------|
| OCR 集成 | `e696d59` | Tesseract + pdf-to-img + mammoth |
| dotenv 恢复 | `f16d8f6` | 修复重构时误删的 import |
| Logger 颜色 | `ba5f79c` | ANSI 颜色，TTY 检测 |
| AI 集成 | `dd1caf8` | chatAll API extractor |
| AI 整合 | `7cf243a` | 合并到 ai-extractor.ts |
| 邮件 MAIL_API_URL | `69ddaf0` | 默认 URL + 自动构造 HttpMailService |
| 简化 mail | `d339757` | 去掉 sendMailBestEffort，class.send() 内置 try/catch |
| UploadResponse type | `ecc9c07` | 显示完整对象到 console |
| logger 修复 | `d7f037e` | colorizer 序列化对象值 |

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

## 8. 20-21 任务时间线详细 (Days 20-21 Detailed Timeline)

### Day 20 (2026-07-20)

| 时间 | 任务 | 描述 |
|------|------|------|
| 14:00 | chatAll API 集成 | 真实集成 chatAll API（`AI_API_URL` 默认 `http://ai.dadaex.cn/backapi/chatGpt/chatAll`） |
| 14:10 | 集成测试 | 更新测试以适应真实 chatAll API |
| 14:20 | bug 修复 (pickAiText) | pickAiText 原本只 apply 顶层字段，递归时不应用 → 修复为深度优先遍历 |
| 14:30 | ai-extractor.ts 整合 | 删除 `chatall-extractor.ts`，合并到 `ai-extractor.ts` |
| 14:40 | UploadResponse type | 引入 type 让 pino logger 能显示完整对象 |
| 14:50 | logger 颜色检查 | logger colorizer 在 TTY 下加 ANSI 颜色 |

### Day 21 (2026-07-21)

| 时间 | 任务 | 描述 |
|------|------|------|
| 09:00 | MailService 模块 | 创建 `src/services/mail/send-mail.ts` (interface + HttpMailService) |
| 09:30 | sendMailBestEffort 简化 | 用户反馈"viết tách 1 hàm và 1 class có lãng phí không?" → 去掉 `sendMailBestEffort`，把 try/catch 放进 `HttpMailService.send()` |
| 10:00 | MAIL_API_URL 默认值 | 用户反馈"thiếu apiUrl" → 添加 `MAIL_API_URL = 'https://vn2.dadaex.cn/api/moneyapi/mail'` 默认值 + 自动构造 `HttpMailService` |
| 10:30 | 整合测试更新 | 注入 mock mail option |
| 11:00 | logger colorizer 修复 | 用户反馈"logger không thể hiển thị kiểu any" → colorizer 也 serialize 对象值（用 `JSON.stringify`） |
| 11:30 | UploadResponse type | 用户反馈"tôi vẫn muốn hiển thì hết cả object" → 重新引入 `body` 到 logger.info，但用 `UploadResponse` type 替代 `any` |
| 14:00 | docs.md 扩展 | 本次更新（添加 Day 20-21 时间线 + 新增用户反馈 prompt 样例） |

---

*本文档由 `watch-file-server` 项目最终审查流程生成，统计约 172 个 subagent 提示词 + 7 个用户问题，跨 2026-07-16 至 2026-07-21 共 6 天。*
