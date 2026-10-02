# 2026-10-01 ~ 2026-10-02 问答记录

## 一、汇总表 (按时间排序)

| 时间  | 任务                      | 描述                                                                                                                                |
| ----- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 10:00 | 发现过时测试              | 添加 firecrawl-service 后跑 `npm test` → 1 个失败：`ocr-processor.test.ts` 仍断言 `scale: 4.0`，但已提交的源码为 `scale: 6.0`（在 0950e06 中升级，测试未同步） |
| 10:05 | 修正测试对齐              | 修改 1 行 `scale: 4.0` → `scale: 6.0`                                                                                                |
| 10:10 | **提交 `2878189`**        | `test(ocr): align scale expectation with committed 4.0 → 6.0 bump`（1 个文件，+1/-1）                                               |
| 10:15 | 用户要求添加 Firecrawl 服务 | 「viết thêm dịch vụ firecrawl để parse a file」+ 代码片段使用 `new Firecrawl({apiKey:"fc-key"}).parse({data, filename, contentType}, {formats:["markdown"]})` |
| 10:20 | 检查 Firecrawl SDK        | `npm view firecrawl version` → 4.42.1；验证类名（`Firecrawl` 别名仍导出）                                                            |
| 10:25 | 安装 SDK                  | `npm install firecrawl@4.42.1 --save`（4 个文件：package.json + lock + 2 个新源文件）                                                |
| 10:30 | 编写 `firecrawl-service.ts` | 100 行模块：`parsePdf(filePath, opts)` 通过 `node:fs/promises` 读取文件，调用 `Firecrawl.parse()`，返回 markdown。默认 `formats:['markdown']` + `onlyMainContent:true`。懒加载 SDK 以便测试可 mock |
| 10:35 | 5 个单元测试              | Mock `Firecrawl`（构造函数返回 `{parse: ...}`）+ `node:fs/promises.readFile`。覆盖：成功 / 空 / null markdown / 错误传播 / 自定义 formats |
| 10:40 | 类型检查 + 测试           | 通过 + 43/43 通过（38 个旧 + 5 个新）                                                                                              |
| 10:50 | 用户要求集成              | 「thêm parse bằng dịch vụ firecrawl nếu là file pdf」                                                                                |
| 10:55 | 更新 `ocr-by-kind.ts`    | 添加 `OcrByKindOptions.firecrawl`。阈值 `MIN_FIRECRAWL_TEXT_LENGTH = 20`（扫描型 PDF 无文本层返回 `""`）。逻辑 — 文本过短或出错 → 回退 `ocr.processPdf()` |
| 11:00 | 更新 `listen-downloads.ts` | 读取 `process.env.FIRECRAWL_API_KEY`。默认 `opts.firecrawl === null ? null : opts.firecrawl ?? (key ? parsePdf : null)`。接入 `ocrByKind(...)` 调用 |
| 11:05 | 为 ocr-by-kind 添加 5 个测试 | fast-path 命中（markdown ≥ 20 字符）、文本过短回退（< 20）、错误回退、null 覆盖、非 PDF 类型忽略选项                              |
| 11:08 | 类型检查 + 测试           | 通过 + 48/48 通过                                                                                                                  |
| 11:09 | **提交 `a872056`**        | `feat(pdf): route PDFs through Firecrawl fast-path, fall back to Tesseract`（3 个文件，+132/-3）                                    |
| 11:10 | 用户手动编辑 `src/index.ts` | 用户编辑以强制启用 Firecrawl：`startDownloadsWatcher({ firecrawl: parsePdf })`，绕过环境变量判定                                                                 |
| 11:12 | 用户提交 `f0af5aa`       | `add(firecrawl): add firecrawl-parse-file` — 删除 `.env`，添加 `.env.example`（规范的卫生处理）                                       |
| 11:14 | **提交 `9eb382b`**        | `feat(watcher): force-enable Firecrawl fast-path in src/index.ts`（2 个文件，+2/-3）                                               |
| 11:15 | 用户要求推送              | 「git push」 → `f0af5aa..9eb382b master -> master`，工作树干净                                                                       |
| 11:20 | 用户要求统计              | 「thống kê các prompt ngày 01-10-2026」 → 本 Day 26 章节                                                                            |

## 二、详细问答

### 用户反馈 1（HH:MM ~10:00）：过时测试失败

**完整原文：**
> （无用户消息；由 `npm test` 在添加无关代码后触发）
> expected "vi.fn()" to be called with arguments: [ '/x/invoice.pdf', { scale: 4 } ]
> Received: 1st vi.fn() call: [ '/x/invoice.pdf', { scale: 6 } ]

**处理方式：** 测试中的过时断言（断言与已提交源码在 0950e06 后已不同步）。修复：将断言从 `4.0` 调整为 `6.0` 以匹配已提交的源码行为。无需修改源码 — 源码已正确，测试过期。

**关键学习：** 添加无关代码后测试失败通常是过时断言，而非逻辑错误。在更改行为前先检查已提交的源码。

### 用户反馈 2（HH:MM ~10:15）：编写 firecrawl 服务以解析文件

**完整原文：**
> "viết thêm dịch vụ firecrawl để parse a file"
> ```js
> import { Firecrawl } from "firecrawl";
> import fs from "fs";
> const app = new Firecrawl({ apiKey: "fc-key" });
> const doc = await app.parse(
>   { data: fs.readFileSync("./SXHRC26080193正本提单 (3).pdf"),
>     filename: "SXHRC26080193正本提单 (3).pdf",
>     contentType: "application/pdf" },
>   { onlyMainContent: true, formats: ["markdown"] }
> );
> console.log(doc.markdown);
> ```

**处理方式：** 验证 Firecrawl SDK API（v4.42.1，类 `Firecrawl` 是 `FirecrawlClient` 的别名）。包装为 `parsePdf(filePath, opts?)` 函数，包含：
- 懒加载 `await import('firecrawl')` 以便测试可 mock
- `node:fs/promises.readFile`（Buffer 满足 `ParseFileData` 联合类型）
- 默认 `onlyMainContent:true`（适合 B/L 表单）
- 错误传播（调用方可回退到 OCR）
- API 密钥来自 `FIRECRAWL_API_KEY` 环境变量，回退到 `'fc-key'`

**关键学习：** 用户粘贴完整的代码片段是最好的 — 在编写包装器之前先验证 SDK 版本和 API 接口。懒加载模式（已存在于 `ocr-processor.ts`）允许编写包装器的同时仍能注入 mock。

### 用户反馈 3（HH:MM ~10:50）：为 PDF 文件添加 firecrawl 解析

**完整原文：**
> "thêm parse bằng dịch vụ firecrawl nếu là file pdf"

**处理方式：** 在 PDF 流水线中将 Firecrawl 接入为快速路径：
- `OcrByKindOptions.firecrawl`（函数 | null）— 由调用方决定是否使用
- 默认行为：调用方未传递选项 → 跳过 Firecrawl（已有测试无需 mock Firecrawl）
- 启用 Firecrawl 时：先尝试调用；若 markdown ≥ 20 字符 → 使用，否则 → 回退 Tesseract
- 出错时（网络、响应格式错误）→ 回退 Tesseract，记录调试日志
- `listen-downloads.ts` 读取 `FIRECRAWL_API_KEY` 环境变量，若有密钥则传入 `parsePdf`

**关键学习：** 「快速路径 + 回退」模式允许生产环境运行 Firecrawl（快速）而测试无需 mock 额外的依赖。20 字符阈值是足够好的启发式 — 嵌入文本层的 PDF 通常有数百+字符，未嵌入的扫描型 PDF 返回 `""`。当快速路径小失败时，OCR 是下一步的回退。

### 用户反馈 4（HH:MM ~11:14）：commit code

**完整原文：**
> "commit code"

**处理方式：** 暂存 `src/index.ts` + `listen-downloads.ts`（用户已手动编辑）+ 提交。用户在 `listen-downloads.ts` 中移除了辅助注释（用户的意图）。

**关键学习：** 「commit code」提示通常在用户编辑了额外更改后出现（此处为：显式传入 parsePdf 强制启用 + 移除辅助注释）。提交前用户编辑是正常的 — 尊重用户的编辑，不要回退。

### 用户反馈 5（HH:MM ~11:15）：git push

**完整原文：**
> "git push"

**处理方式：** `git push` → `f0af5aa..9eb382b master -> master`。分支与 origin/master 同步，工作树干净。

**关键学习：** 单字操作提示（「commit」、「push」）通常是独立命令，无需澄清。运行命令、报告结果、完毕。

---

## 三、Day 27（2026-10-02）汇总表

| 时间  | 任务                          | 描述                                                                                                                                |
| ----- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 14:00 | 用户要求添加 Day 26 统计      | 「thống kê các prompt ngày 01-10-2026 vào docs.md」                                                                                  |
| 14:05 | 检查 docs.md 当前状态         | HEAD 为 449 行（含 Day 25），工作树为 215 行（用户已手动 trim 移除 Day 23、Day 24、Cross-day、Overall，仅保留 Day 26）                  |
| 14:10 | 编写 Day 26 章节             | 添加 `## Day 26 是 Firecrawl PDF 解析器日` 时间线 + 5 个用户反馈详细 + 总统计；调整 Cross-day + Overall；新增 Day 26 计数（4 commits, 48/48 tests） |
| 14:15 | **提交 `38ba27b`**            | `docs: add Day 26 (2026-10-01) prompt stats to docs.md`（1 个文件，+117/-242）                                                       |
| 14:30 | 用户要求调整 + 翻译为中文     | 「điều chỉnh nội dung các mục trong docs.md và chuyển các nội dung sang tiếng trung nếu có thể」                                       |
| 14:35 | 重写 docs.md                  | 全部重写为 Chinese：标题、汇总表行描述、用户反馈章节、处理方式、关键学习。保留技术术语（file paths, env vars, hashes）、保留用户 verbatim quotes 「...」 |
| 14:40 | **提交 `095238f`**            | `docs: Day 26 — translate Vietnamese content to Chinese, normalize structure`（1 个文件，+52/-280）                              |
| 14:45 | 用户手动重命名 docs.md 标题与章节 | `# 2026-10-01 问答记录` / `## 一、汇总表 (按时间排序)` / `## 二、详细问答` — 简化结构名称                                                                          |
| 14:50 | 用户要求 commit               | 「commit code」                                                                                                                     |
| 14:55 | **提交 `699b8e4`**            | `chore(watcher): tighten AI_PROMPT, blank line, and SO/blNo selection logic`（2 个文件，+5/-6，含 docs.md 重命名 + listen-downloads.ts 3 处编辑） |
| 15:00 | 用户要求推送                  | 「push code」                                                                                                                       |
| 15:05 | git push                      | `9eb382b..699b8e4 master -> master`，分支与 origin/master 同步                                                                       |
| 15:10 | 用户要求 Day 27 统计          | 「thống kê các prompt ngày 02-10-2026 vào docs.md」 → 本章节                                                                          |

## 四、Day 27（2026-10-02）详细问答

### 用户反馈 1（HH:MM ~14:00）：添加 Day 26 统计到 docs.md

**完整原文：**
> "thống kê các prompt ngày 01-10-2026 vào docs.md"

**处理方式：** 检查 HEAD vs 工作树差异 — 用户已手动删除 Day 23、Day 24、Cross-day Observations、Overall Project Statistics 四个章节，仅保留 Day 26。尊重用户的 trim：在 Day 24 总统计之后插入 Day 26 章节（标题、时间线、5 个用户反馈、总统计），并补充 Cross-day 与 Overall 让 Day 26 数字进入跨日统计。

**关键学习：** 用户已经在工作树中做结构性 trim（删除 234 行）— 先尊重再补充，不要「恢复」做事后丢失的章节。先 `git diff --stat` 看清楚用户改了哪些行，再决定增量内容。

### 用户反馈 2（HH:MM ~14:30）：调整并翻译为中文

**完整原文：**
> "điều chỉnh nội dung các mục trong docs.md và chuyển các nội dung sang tiếng trung nếu có thể"

**处理方式：** 用 `Write` 工具完全重写 docs.md（96 行）。翻译原则：
- 标题、列头、章节标题、User feedback 标题 → 中文
- 时间线行描述、处理方式、关键学习 → 中文 narrative
- 技术术语保留（file paths, env vars, commit hashes, npm 命令）
- 用户 verbatim prompt 用 「...」 引起来 — 不能翻译为中文需要忠实原文

**关键学习：** "越南语 → 中文"翻译需要保留 verbatim quotes（用户原文）。Mixed-language docs 是 OK 的 — 不必 100% 单语。逐行重写比多次 Edit 更清晰。

### 用户反馈 3（HH:MM ~14:50）：commit code

**完整原文：**
> "commit code"

**处理方式：** 同时暂存 docs.md（用户手动重命名标题与章节头）+ listen-downloads.ts（之前未提交的 3 处编辑：AI_PROMPT 加 "đã loại bỏ khoảng trắng"、删除空行、SO 检查 `slice(0,2) === 'SX'`）。在 commit message 中详细解释 3 处编辑的语义。

**关键学习：** "commit code" 可能涵盖多个文件 — 始终先 `git status` 看清楚所有改动，再批量 commit。Commit message 中解释每个 hunk 的语义比仅列文件名更有用。

### 用户反馈 4（HH:MM ~15:00）：push code

**完整原文：**
> "push code"

**处理方式：** `git push` → `9eb382b..699b8e4 master -> master`。3 个新 commits 全部推送，分支与 origin/master 同步，工作树干净。

**关键学习：** 同一会话内多次 commit + push 是 OK 的 — 不必「合并 commit」做事后顺序调优。每次 commit 都是独立可回滚的单元。Push 频率取决于用户，不取决于 commit 数量。

### 用户反馈 5（HH:MM ~15:10）：添加 Day 27 统计

**完整原文：**
> "thống kê các prompt ngày 02-10-2026 vào docs.md"

**处理方式：** 新增「三、Day 27（2026-10-02）汇总表」+「四、Day 27（2026-10-02）详细问答」两个章节。标题更新为 `# 2026-10-01 ~ 2026-10-02 问答记录`。5 个用户反馈 prompt 全部记录。

**关键学习：** docs.md 现在是连续的 multi-day 文档（Day 26 + Day 27）。后续 Day 可继续追加「五、Day 28（...）汇总表」等。章节风格沿用"汇总表 + 详细问答"结构，方便 grep 检索。