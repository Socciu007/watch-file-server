# 更新到 2026-10-01 (Day 26)

## Day 26 是 Firecrawl PDF 解析器日 — 0 个 subagent 派遣，全部为直接功能开发。

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

## Day 26 用户反馈 prompt 样例 (User Feedback Prompts Day 26)

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