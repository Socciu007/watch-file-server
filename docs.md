# 提示词历史与统计 (Prompt History & Statistics)

本文档记录在 `watch-file-server` 项目开发过程中，向各类 subagent 发送的所有提示词的统计与样例。

---

## 1. 统计表 (Statistical Table by Timeline)

### 1.1 阶段概览 (Phase Overview)

| 阶段 | 时间 | 主要任务 | 提示词数量 |
|------|------|----------|------------|
| 阶段一：头脑风暴 | 2026-07-16 | 通过 `brainstorming` skill 生成设计规范 | ~5 |
| 阶段二：编写计划 | 2026-07-16 | 通过 `writing-plans` skill 编写 27 任务实施计划 | ~3 |
| 阶段三：Subagent 开发 | 2026-07-16 | 27 个实现任务 + 规范/代码质量审查 + 修复 | ~95 |
| 阶段四：最终审查 | 2026-07-17 | 完整代码审查 + 3 项重要修复 | ~4 |
| 阶段五：重构 | 2026-07-17 | 简化为单 watcher 架构 | ~12 |
| 阶段六：集成真实 OCR/AI | 2026-07-17 | 集成 TesseractOcrProcessor + ChatAllAiExtractor | ~14 |
| 阶段七：整合修复 | 2026-07-17 | dotenv 恢复、模块整合 | ~5 |
| **总计** | — | — | **~138** |

### 1.2 按 Subagent 类型统计 (By Subagent Type)

| Subagent 类型 | 数量 | 用途 |
|--------------|------|------|
| implementer | ~27 | 实施单个任务（含修复） |
| spec-reviewer | ~27 | 验证实施是否符合规范 |
| code-quality-reviewer | ~27 | 代码质量审查（修复建议） |
| fix-subagent | ~25 | 应用代码质量修复 |
| re-review | ~15 | 验证修复 |
| diagnostic | ~3 | vitest cwd 大小写问题诊断 |
| final-review | 1 | 整体最终审查 |
| cleanup | ~3 | 模块整合、删除冗余文件 |

### 1.3 按任务统计 (By Task)

| 任务 | 主题 | 实施 | 规范审查 | 代码质量 | 修复 | 重新审查 |
|------|------|------|----------|----------|------|----------|
| Task 1 | 初始化项目 | ✅ | ✅ | ✅ | — | — |
| Task 2 | 创建目录结构 | ⚠️ | ✅ | — | ✅ (gitignore) | — |
| Task 3 | 共享类型 | ✅ | ✅ | ✅ | — | — |
| Task 4 | 错误类 | ✅ | ✅ | ✅ | — | — |
| Task 5 | Logger | ✅ | ✅ | ✅ | — | — |
| Task 6 | 哈希工具 | ✅ | ✅ | ✅ | — | — |
| Task 7 | 重试助手 | ✅ | ✅ | ✅ | — | — |
| Task 8 | 配置 schema | ✅ | ✅ | ✅ | — | — |
| Task 9 | Env 加载器 | ✅ | ✅ | ✅ | — | — |
| Task 10 | Config 加载器 | ✅ | ✅ | ✅ | — | — |
| Task 11 | 默认配置 | ✅ | ✅ | ✅ | — | — |
| Task 12 | TesseractOcr | ⚠️ | — | ⚠️ | ✅ (C1 binaryPath) | ✅ |
| Task 13 | MockParser | ⚠️ | — | ⚠️ | ✅ (regex bug) + ✅ (TOTAL_RE) | — |
| Task 14 | PDF 文本提取 | ✅ | ✅ | ✅ | — | — |
| Task 15 | HttpAccountingClient | ⚠️ | ✅ | ⚠️ | ✅ (mock) + ✅ (breaker bug) | ✅ + cleanup |
| Task 16 | PrometheusMetrics | ✅ | ✅ | ⚠️ | ✅ (HTTP status check) | ✅ |
| Task 17 | 路由器 | ✅ | ✅ | ✅ | — | — |
| Task 18 | 防抖 | ✅ | ✅ | ⚠️ | ✅ (try/finally + multi-path) | ✅ |
| Task 19 | Chokidar 监听 | ⚠️ | ✅ | ⚠️ | ✅ (4 issues) | ✅ |
| Task 20 | BaseWorker | ✅ | ✅ | ✅ | ✅ (inverted shouldRetry) | — |
| Task 21 | PdfWorker | ✅ | ✅ | ⚠️ | ✅ (cleanup) | ✅ |
| Task 22 | ImageWorker | ✅ | ✅ | ✅ | — | — |
| Task 23 | Orchestrator | ✅ | ✅ | ⚠️ | ✅ (4 issues) | — |
| Task 24 | 测试夹具 | ✅ | ✅ | ✅ | — | — |
| Task 25 | 集成测试 | ✅ | ✅ | ✅ | — | — |
| Task 26 | README | ✅ | ✅ | ✅ | — | — |
| Task 27 | 全套测试 | ✅ | — | — | — | — |

### 1.4 按主题统计 (By Topic)

| 主题 | 出现次数 | 代表任务 |
|------|----------|----------|
| TDD 红-绿循环 | 27 | 每个实现任务 |
| 类型安全 (TS) | 多次 | BaseWorker、Docker compose |
| 错误处理 (Transient/Permanent) | ~6 | 任务 7、15、16、20 |
| Vitest 模拟与 cwd 问题 | 3 | 任务 5、12、19 |
| 协议 vs 实际 API 行为 | 4 | 任务 13、15、16、19 |
| 重构与简化 | 2 | 阶段五 + 阶段七 |

---

## 2. 详细提示词样例 (Detailed Prompt Samples)

### 2.1 实施者提示词 (Implementer Prompt)

**用途：** 实施单个任务（实现 + 测试 + 提交）

**模板结构：**
```
You are implementing Task N: [task name]

## CRITICAL: Use uppercase drive letter
Use `cd /E/projectVN/watch-file-server` (uppercase `E`) for ALL shell commands.

## Task Description
[Step-by-step TDD task content from the plan]

## Context
[Project state, prior commits, related files]

## Before You Begin
If you have questions, ask. Otherwise proceed.

## Your Job
1. Write the failing test (Step 1)
2. Run with uppercase cwd and verify it fails (Step 2)
3. Implement (Step 3)
4. Run with uppercase cwd, verify [N] passed (Step 4)
5. Commit (Step 5)
6. Self-review (see below)
7. Report back

## Code Organization
[File structure guidance]

## When You're in Over Your Head
[Specific failure modes and how to handle]

## Before Reporting Back: Self-Review
[Checklist of things to verify]

## Report Format
- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- What you implemented
- Files changed
- Step N output
- All tests output
- Self-review findings
- Any issues
```

**示例：实施者提示词（任务 12：TesseractOcr）**
> "You are implementing Task 12: TesseractOcr (TDD task)
>
> ## CRITICAL: Use uppercase drive letter
> Use `cd /E/projectVN/watch-file-server` (uppercase `E`) for ALL shell commands.
>
> ## Task Description
> **Files:**
> - Create: `src/services/ocr/interface.ts`
> - Create: `src/services/ocr/tesseract.ts`
> - Test: `tests/unit/services/ocr/tesseract.test.ts`
>
> [...] (TDD steps with EXACT code to write) [...]
>
> ## Context
> Project: watch-file-server — Node.js/TypeScript invoice OCR pipeline. This is Task 12 of 27.
> [project state, dependencies, related interfaces]
>
> ## Your Job
> 1. Write the failing test (Step 1)
> 2. Run with uppercase cwd and verify it fails (Step 2)
> 3. Implement TesseractOcr (Step 3)
> 4. Run with uppercase cwd, verify 2 passed (Step 4)
> 5. Commit (Step 5)
> 6. Self-review
> 7. Report back"

### 2.2 规范审查者提示词 (Spec Reviewer Prompt)

**用途：** 验证实施是否符合原始规范

**模板结构：**
```
You are reviewing whether an implementation matches its specification for Task N.

## CRITICAL: Use uppercase drive letter
Use `cd /E/projectVN/watch-file-server` (uppercase `E`) for all test runs.

## What Was Requested
[Full task spec — exact code to write, exact test expectations]

## What Implementer Claims They Built
[Summary from implementer's report]

## CRITICAL: Do Not Trust the Report
You MUST verify everything independently.
- Read the actual file contents
- Compare to the spec character by character
- Run the tests yourself with uppercase cwd

## Your Job
1. Read the file (verify byte-for-byte match)
2. Run the test (verify N passed)
3. Run all tests (verify no regression)
4. Run typecheck (verify exit 0)
5. Verify commit (verify SHA + message)
6. No extra files created

Report:
- ✅ Spec compliant
- ❌ Issues found: [list specifically, with file:line references]
```

### 2.3 代码质量审查者提示词 (Code Quality Reviewer Prompt)

**用途：** 找出实施中的质量问题、缺陷、可改进点

**模板结构：**
```
You are reviewing code quality of Task N implementation.

## CRITICAL: Use uppercase drive letter
Use `cd /E/projectVN/watch-file-server` (uppercase `E`) for any test runs.

## Task Summary
- Files created: [list]
- Commit: [SHA]

## What to Review
Since this is a [size] [component type], focus on:
1. Design quality: [...]
2. Implementation: [...]
3. Test quality: [...]
4. Forward-compatibility: [...]
5. YAGNI check: [...]

## Your Job
Read the files and check:
- [list specific things to verify]

Report:
- **Strengths:** What's done well
- **Issues:**
  - **Critical:** Must fix before proceeding
  - **Important:** Should fix
  - **Minor:** Nice to have
- **Assessment:** Approved | Changes required
```

**实际产出示例：**

- **任务 12 (TesseractOcr):** 发现 C1 关键问题 — `binaryPath` 被接收但从未传递给 `createWorker`；importance #1 缺少 `terminate` 接口；importance #2 工作者重用未测试。
- **任务 15 (HttpAccountingClient):** 发现 test mock 与实现不匹配（mock 是 callable fn，代码用 .post()）；C1 关键 — PermanentError 不应触发熔断器。
- **任务 16 (PrometheusMetrics):** 发现 C1 关键 — 非 2xx 响应被静默视为成功（不清除计数器）。
- **任务 19 (Chokidar):** 发现 size-stability 不完整（仅 stat 一次，未订阅 change 事件）。

### 2.4 修复子代理提示词 (Fix Subagent Prompt)

**用途：** 应用代码质量审查中识别的具体修复

**模板结构：**
```
You are fixing [Critical/Important] issues found by code review of Task N.

## CRITICAL: Use uppercase drive letter
Use `cd /E/projectVN/watch-file-server` (uppercase `E`) for ALL shell commands.

## Issues to Fix
### C1 (Critical): [Issue name]
[Detailed description of the problem]

**Fix:** [Exact code change with line numbers / file paths]

### I1 (Important): [...]
[...]

## Steps
1. Apply [first] fix
2. Apply [second] fix
3. Run [specific] tests
4. Run all tests
5. Run typecheck
6. Update plan doc [if applicable]
7. Amend the commit:
   `git add [files] && git commit --amend -m "..."`

## Context
[Project state, why this matters]

## When You're in Over Your Head
[Edge cases]

## Before Reporting Back: Self-Review
[Checklist]

## Report Format
- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED
- Files changed
- Test count
- New commit SHA
- Self-review findings
- Any issues
```

### 2.5 诊断子代理提示词 (Diagnostic Subagent Prompt)

**用途：** 调查意外错误（vitest cwd 大小写问题）

**示例：**
> "You are diagnosing a vitest environment issue in the watch-file-server project.
>
> ## The Problem
> The implementer found that `npm test` fails with `TypeError: Cannot read properties of undefined (reading 'config')` for all test files.
>
> ## Steps
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

**诊断结果：** vite v8 + vitest v4 在 Windows 上对 module URL 的大小写处理不一致 — `process.cwd()` 返回 `e:/...`，vite 解析为 `E:/...`，导致两个 module instance。解决方案：使用大写 `/E/...` cwd。

### 2.6 最终审查提示词 (Final Review Prompt)

**用途：** 项目全部完成后的端到端审查

**模板结构：**
```
You are doing a FINAL CODE REVIEW of the entire [project] implementation.
This is the last review before the project is considered complete.

## CRITICAL: Use uppercase drive letter
Use `cd /E/projectVN/watch-file-server` (uppercase `E`) for any commands.

## Project: [name]
[Architecture description]

## Tech stack: [...]

## Current state:
- [N] implementation tasks complete
- [N] tests passing across [N] files
- Typecheck clean
- No leftover TODOs
- Working tree clean
- Latest commit: [SHA]

## Plan Reference
[paths to plan and spec docs]

## Your Job

### 1. Get the diff range
[git log commands]

### 2. Run all tests and verify
[npm test, npm run typecheck]

### 3. Code review of the entire implementation
[Files to review list]

**Review criteria:**
1. Correctness: Does the code correctly implement the spec? Any logical bugs?
2. Code quality: Each file has one clear responsibility? [...]
3. Test coverage: [N] tests across [N] files — adequate? [...]
4. Security: No secrets? Token handling safe? [...]
5. Production readiness: Error handling? Graceful shutdown? Resource cleanup? Logging? [...]
6. File responsibility check: [...]
7. YAGNI check: [...]

### 4. Forward-compatibility check
[The spec mentions future work: ...]

### 5. Verdict
Report:
- **Strengths:** What's done well across the project
- **Issues:**
  - **Critical:** Must fix before merge
  - **Important:** Should fix soon
  - **Minor:** Nice-to-haves
- **Overall assessment:** Ready to merge | Needs changes before merge
- **Recommended next steps**
```

---

## 3. 关键发现 (Key Findings During Reviews)

### 3.1 真实缺陷 (Real Bugs Caught)

| 任务 | 问题 | 严重性 | 修复 |
|------|------|--------|------|
| 12 | `binaryPath` 选项被接收但未传递给 createWorker | C1 | 添加 `workerPath` 映射 |
| 15 | test mock 与实现 API 不匹配 | 关键 | 重写 mock 提供 .post() |
| 15 | PermanentError 触发熔断器 | 重要 | 仅 TransientError 调用 onFailure |
| 16 | 非 2xx 响应被静默视为成功 | C1 | 检查 `res.ok` |
| 19 | size-stability 仅 stat 一次 | 重要 | 订阅 chokidar 'change' 事件 |
| 20 | `shouldRetry` 谓词反向 | 重要 | 改为 `err instanceof TransientError` |
| 13 | 发票号 regex 匹配 "Invoice" 一词 | 阻塞 | 要求 `\d` 开头 |
| 13 | TOTAL_RE 匹配 Subtotal | 重要 | 添加 `\bTotal\b` |

### 3.2 流程问题 (Process Issues)

| 问题 | 解决方案 |
|------|----------|
| vitest cwd 大小写不一致（Windows）| 强制使用大写 `/E/...` |
| test mock 不匹配实现 API | 在重写 mock 之前用 `node -e` 验证真实 API |
| Plan 文档的 bug（如 `isPermanent ? 'fail' : 'fail'`）| 在 review 阶段识别并修复 |
| 实施者添加 EXACT 之外的注释 | 在 spec review 中标记为内容偏差 |

### 3.3 Subagent 行为观察 (Subagent Behavior Observations)

- **Implementer** 严格遵循 EXACT content；遇到 spec bug 时 BLOCKED（正确）
- **Spec reviewer** 识别 byte-for-byte 差异，包括"功能性 vs 内容性"区分
- **Code quality reviewer** 优先标记 Critical > Important > Minor；提供具体修复建议
- **Fix subagent** 倾向于保守；遇到 spec/mock 不匹配时 BLOCKED 而不是猜
- **Re-review** 严格验证修复是否解决了原问题

---

## 4. 提示词模板通用结构 (Common Template Structure)

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

关键原则：
1. **大写 cwd 警告** — 每次都重复 `cd /E/projectVN/watch-file-server`
2. **EXACT content** — 实施者要严格按规范写代码
3. **TypeScript 严格模式** — `noUncheckedIndexedAccess` 需要 `match[1]!` 等断言
4. **Do Not Trust the Report** — 每个 reviewer 必须独立验证
5. **Report Format** — 统一的状态、文件、测试、commit、self-review 字段

---

## 5. 重构阶段统计 (Refactor Stage Statistics)

### 5.1 大重构 (Major Refactor — commit `08e2454`)

**范围：** 从 27 任务完整架构 → 简单单 watcher 架构

| 项目 | 数值 |
|------|------|
| 删除文件 | 25+ |
| 新建文件 | 7 |
| 代码行数变化 | +182 / -1989 |
| 测试变化 | 54 → 27 (-27) |

### 5.2 集成阶段 (Integration Stage)

| 阶段 | 提交 | 描述 |
|------|------|------|
| OCR 集成 | `e696d59` | Tesseract + pdf-to-img + mammoth |
| dotenv 恢复 | `f16d8f6` | 修复重构时误删的 import |
| 颜色 logger | `ba5f79c` | ANSI 颜色，TTY 检测 |
| AI 集成 | `dd1caf8` | chatAll API extractor |
| AI 整合 | `7cf243a` | 合并到 ai-extractor.ts |
| **当前状态** | — | 51/51 测试通过 |

---

## 6. 关键提示词优化模式 (Key Prompt Optimization Patterns)

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

5. **统一的报告格式 (Unified Report Format)**
   - Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
   - Files changed
   - Step N output
   - All tests output
   - Self-review findings
   - Any issues

---

*本文档由 `watch-file-server` 项目最终审查流程生成，统计约 138 个 subagent 提示词。*
