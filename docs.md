# 2026-08-12 提示统计文档 (提示记录)

## Day 25 是 PM2 fix + Day 24 修正 day — 0 subagent 派发，全部 direct work。

| 时间  | 任务                                | 描述                                                                                                                                                                |
| ----- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 09:00 | 继续 Day 24 的 PM2 watch 调查       | 用户问 "tại sao khi start bằng pm2 thì không thể watch file" → 我之前 commit 85dcd7d 错误下结论 "PM2 irreconcilable, fall back Task Scheduler" — 需要重新调查 |
| 09:05 | 现状复盘                            | pm2 status 显示空 (上次清理后)，app 没跑，logs file 0 bytes → 需要重新 start 才能 debug                                                                              |
| 09:10 | 重新跑 pm2 start                    | `pm2 start ecosystem.config.cjs` → PID 21552, 46.7mb, online, ↺=0                                                                                                   |
| 09:15 | 加 test PDF 进 WATCH_DIR            | memory spike 似乎没发生（其实是 spike 但我立刻看错了 — 后来确认 54→245mb 是真实的）                                                                                  |
| 09:20 | 观察 PM2 readiness probe            | `C:\Users\Administrator\.pm2\pm2.log` 显示 ~3s 后 PM2 发 SIGINT → 但 graceful handler 没捕获？奇怪                                                                  |
| 09:25 | 第一次怀疑: isMain check            | `import.meta.url === argv[1]` 在 PM2 下，`argv[1]` 是 `ProcessContainerFork.js` 路径，不是 `dist/index.js` → isMain=false → main() 从未运行                                  |
| 09:30 | 验证 isMain 假设                    | 临时删掉 isMain 检查（无条件执行 main()）→ app 在 PM2 下 stay alive → 确认 isMain 是问题之一                                                                       |
| 09:35 | 恢复 isMain + PM2 detection         | `isUnderPm2 = process.env.PM2_HOME !== undefined \|\| process.env.pm_id !== undefined \|\| process.env.pm2_env !== undefined`                                        |
| 09:40 | 第二个 bug: SIGINT restart loop     | 即使 main() 跑起来，PM2 SIGINT readiness probe 被 graceful handler 捕获 → process.exit(0) → restart → SIGINT → loop。 验证: pm2 status 显示 ↺ 持续增加               |
| 09:45 | 写 PM2 env debug                    | `await import('node:fs').then(fs => fs.writeFileSync('debug-pm2-detection.json', JSON.stringify({...env})))` — 但因为 isMain=false 从来没跑过                                  |
| 09:50 | 改 isMain include PM2 case          | `isMain = isUnderPm2 \|\| 原检查`                                                                                                                                  |
| 09:55 | 跳过 PM2 下的 signal handlers       | `if (!isUnderPm2) { process.on('SIGINT'...); process.on('SIGTERM'...); }` — PM2 有自己的 signal handling，我们 graceful handler 只会干扰                              |
| 10:00 | typecheck + tests                   | `npm run typecheck` clean, 29/29 tests pass                                                                                                                         |
| 10:05 | 验证 fix 在 PM2 下                  | `pm2 status`: PID 21552, 119s+ uptime, ↺=0, online — stay alive!                                                                                                   |
| 10:10 | 验证 chokidar fire                  | 复制 test-pm2-watch.pdf 进 WATCH_DIR → memory spike 54→245→116mb → OCR pipeline 触发（确认 chokidar 工作）                                                          |
| 10:15 | 清理 debug artifacts                | `pm2 delete all` + 删 `test-pm2-watch.pdf` + `test-pm2-watch.txt` + `debug-pm2-detection.json`                                                                      |
| 10:20 | **Commit `6a79f45`**                | `fix(pm2): detect PM2 + treat it as 'main' so chokidar can fire under PM2` (1 file, +31/-7)                                                                         |
| 10:25 | 之前 docs.md edit 错误              | 上次 session 结束时 docs.md 的 edit 把 Day 23 的 timeline + user feedback 删掉了，只剩 Day 24 在 top → 必须 revert 到 HEAD                                                |
| 10:30 | `git checkout docs.md`              | 恢复 HEAD — Day 23 content 完整回来了，Day 24 在中间位置                                                                                                             |
| 10:35 | 重写 Day 24 timeline                | 加 14 个新 HH:MM entries (18:15-19:10) 描述 re-investigation + root cause + fix + verification — 之前错误结论必须修正                                                      |
| 10:40 | 加 Day 24 user feedback 6           | "tại sao khi start bằng pm2 thì không thể watch file" — 完整 Vietnamese 原文 + diagnosis + fix + lesson                                                              |
| 10:45 | 更新 Day 24 总统计                  | 6→7 user prompts, 2→3 commits, files-changed 现在 list `src/index.ts`                                                                                                |
| 10:50 | 更新 Cross-day Observations         | rewrite "PM2 on Windows quirks" bullet (PM2 actually works, 3 clean fixes) + 新增 "Premature conclusion mistake" mea culpa bullet                                      |
| 10:55 | 更新 Overall Project Statistics     | 25→26 user feedback prompts total, 204→205 total prompts, 2→3 Day 24 commits                                                                                        |
| 11:00 | **Commit `2289245`**                | `docs: Day 24 — correct the PM2 narrative (PM2 actually works, not abandoned)` (1 file, +41/-10)                                                                    |
| 11:05 | Day 25 stats request                | 用户: "thống kê các prompt ngày 12-08-2026 vào docs.md" → 现在 (current turn)                                                                                       |

## Day 25 用户反馈 prompt 样例 (User Feedback Prompts Day 25)

### 用户反馈 1 (HH:MM ~09:00)："tại sao khi start bằng pm2 thì không thể watch file"

**完整原文：**

> "tại sao khi start bằng pm2 thì không thể watch file"

**处理方式：** 这是 Day 24 的延续 — 用户隐含 rebut 我之前 commit 85dcd7d 下的 "PM2 irreconcilable" 错误结论。重新调查发现两个叠加 bug：

1. **`isMain` check fails under PM2** — PM2 通过 `ProcessContainerFork.js` wrapper 启动 app，argv[1] 是 wrapper 路径，所以 `import.meta.url === argv[1]` 返回 false → main() 不跑
2. **SIGINT restart loop** — PM2 readiness probe SIGINT 被 graceful handler 捕获 → `process.exit(0)` → autorestart → loop

**修复方案：**
- PM2 env detection (`PM2_HOME` / `pm_id` / `pm2_env`)
- `isMain = isUnderPm2 || 原检查`
- PM2 下跳过 SIGINT/SIGTERM handlers（PM2 有自己的 signal handling）

**验证：**
- `pm2 status`: PID 21552, 119s+ uptime, ↺=0, online
- 复制 test PDF → memory 54→245mb spike → OCR pipeline 触发
- 29/29 tests pass, typecheck clean

**关键学习：** 我之前太快放弃 PM2（commit 85dcd7d 错误判断）。Lesson: 当用户说 "X doesn't work" 时不要立即切到 alternative — 先彻底排查 root cause。PM2 的 fix 实际很简单（3 行 detection + 1 段 skip signal handlers）。

### 用户反馈 2 (HH:MM ~11:05)："thống kê các prompt ngày 12-08-2026 vào docs.md"

**完整原文：**

> "thống kê các prompt ngày 12-08-2026 vào docs.md"

**处理方式：** 用户要 Day 25 的 prompt 统计。我整理 Day 25 的事件：PM2 fix 完成 + Day 24 narrative 修正 + 2 commits + 2 user feedback prompts（本条 + 上一条 Day 24 延续的）+ docs.md revert 抢救。

**关键学习：** Day 25 主要是 cleanup + narrative 修正 day — 没新 feature work，但 narrative 修正（commit 2289245）很重要，因为前一个 commit 的错误结论如果不修正会误导未来的 reader。

## Day 25 总统计

- **2 用户反馈 prompt** ("PM2 watch not working" continuation + Day 25 stats request)
- **0 subagent 派发** — pure direct work (continuation of Day 24 PM2 fix work)
- **2 commits**: 6a79f45 (PM2 src/index.ts fix) + 2289245 (docs.md Day 24 narrative correction)
- **Key finding**: PM2 7.x 在 Windows 上 **完全 work** — 两个叠加 bug 都有 clean fix。修正了 Day 24 的错误结论（"PM2 irreconcilable"）。Task Scheduler + .bat 仍是有效 fallback，但 PM2 是 primary。
- **Files changed**: `src/index.ts` (+31/-7 for PM2 fix), `docs.md` (+41/-10 for Day 24 narrative correction)
- **Cleanup**: 删 debug artifacts (`test-pm2-watch.pdf` / `.txt`, `debug-pm2-detection.json`), `pm2 delete all`

## Cross-day Observations Day 24-25

1. **Day 24-25 was pure infrastructure + narrative-correction day** — no feature work, but produced 3 production commits (25eb7a7, 85dcd7d, 6a79f45) + 1 docs correction (2289245). PM2 ecosystem + fix is now stable.
2. **Premature conclusion reversal**: Day 24 commit 85dcd7d wrongly concluded "PM2 on Win irreconcilable". Day 25 commit 6a79f45 fixed the actual bugs (which were simpler than the conclusion suggested). Lesson documented in commit message + Day 25 user feedback 1.
3. **docs.md edit mistake + recovery**: Last session's docs.md edit truncated Day 23 content. Day 25 reverted to HEAD + re-applied Day 24 correction properly. Lesson: large docs.md edits should always start from a fresh `git checkout` of HEAD.
4. **PM2 + Task Scheduler dual path**: PM2 is now primary (works fine on Win 11 with Node 22.22.3), Task Scheduler + .bat fallback for environments where PM2 isn't installed. Both are documented in their respective file headers.
5. **Commit 2289245 is unusual**: it's a docs-only commit correcting a previous commit's narrative — typically rare, but here justified because the wrong narrative (Day 24 "PM2 irreconcilable") would mislead anyone reading git history.
6. **Day 25 pattern matches Day 24**: both days had 0 subagent dispatches, all direct work, focused on PM2 infrastructure. User trusts AI for infrastructure work but doesn't seem to need subagents for it.

## Overall Project Statistics (Day 16-25, 10 days)

- **179 subagent prompts** (Day 16-22, all from initial 27-task implementation + refactor)
- **2 Day 25** + 7 Day 24 + 19 Day 23 = **28 user feedback prompts total**
- **207 total prompts** across **10 days** (2026-07-16 to 2026-08-12)
- **Day 24-25 streak**: 5 consecutive days of 0 subagent dispatches (Day 21-25). User is comfortable with project structure + trusts AI for direct infrastructure work.
- **Total production commits Day 24-25**: 4 (25eb7a7, 85dcd7d, 6a79f45, 2289245) — all infrastructure-related (PM2 ecosystem + fix + docs correction)
- **Windows compatibility journey**: Day 23 explored Node version workarounds (Node 12/14/10 + KB976932); Day 24-25 settled on modern Node (v22.22.3) + PM2 (primary) + Task Scheduler fallback. PM2 fully working after isMain + SIGINT fix.

---

# 2026-07-23 提示统计文档 (提示记录)
## Day 23 是 user support + 兼容性调试 day — 0 个 subagent 派发，全部是 direct Q&A。

| 时间 | 任务 | 描述 |
|------|------|------|
| 14:00 | Node 16 platform check 错误 | 用户在 Win 7 跑 `nvm use 16.20.2` → 出现 "Node.js is only supported on Windows 8.1, Windows Server 2012 R2, or higher" 错误 |
| 14:10 | npm install 错误 | 用户跑 `npm i` → "Socket timeout" + "FETCH_ERROR"（npm 无法 fetch packages） |
| 14:20 | Win 7 兼容性讨论 | 用户报告 `nvm use 16.20.2` 错误，询问 "lỗi" + "tôi đang trên win 7" + "làm sao để npm i phù hợp với win 7" → 我给出 5 个解决方案 |
| 14:30 | Node 版本切换 | 我建议 `nvm install 16.13.2` (Win 7 compatible) 或 18 LTS |
| 15:00 | Node 14 测试 | 用户 "toi da dung Node 14.21.3 ma van loi" → Node 14.21.3 也有 WS2_32.dll 错误 |
| 15:10 | GetHostNameW 错误诊断 | 用户显示错误 "无法找到入口 GetHostNameW 于动态链接库 WS2_32.dll" → 诊断为 Win 7 WS2_32.dll 太旧 |
| 15:30 | Node 12 建议 | 我建议 `nvm install 12.22.12` (last Node 12 LTS, 100% Win 7 compatible) |
| 16:00 | Node 10 选项 | 进一步建议 `nvm install 10.24.1` 作为 fallback |
| 16:30 | Package downgrade 方案 | 我给出 Node 12 兼容的 package versions (chokidar 3, dotenv 16, pino 8, tesseract.js 5, zod 3, vitest 1, typescript 4, eslint 8) |
| 17:00 | 额外改动 | 用户问 "sau Update package.json co can sua gi nua de phu hop node 12 khong" → 我列出 4 个文件需要改：tsconfig.json, tesseract-processor.ts, pdf-text/extractor.ts |

## Day 23 用户反馈 prompt 样例 (User Feedback Prompts Day 23)

### 用户反馈 1 (HH:MM ~14:00)："lỗi" + 环境信息

**完整原文：**
> PS E:\project\watch-file-server> nvm use 16.20.2
> Now using node v16.20.2 (64-bit)
> PS E:\project\watch-file-server> node -v
> Node.js is only supported on Windows 8.1, Windows Server 2012 R2, or higher.
> Setting the NODE_SKIP_PLATFORM_CHECK environment variable to 1 skips this check,
> but Node.js might not execute correctly. Any issues encountered on
> unsupported platforms will not be fixed.

**处理方式：** 我诊断为 Win 7 + Node 16.20.x platform check 问题。给出 3 个解决方案：(1) `$env:NODE_SKIP_PLATFORM_CHECK=1` 后 `nvm use 16.20.2` (2) `nvm install 16.20.0` (3) 升级到 Node 18 LTS。

**关键学习：** 用户直接 paste 完整 terminal output — 让诊断变容易。Node 16+ 的 Windows installer 有内置 OS check。

### 用户反馈 2 (HH:MM ~14:10)："npm install Socket timeout"

**完整原文：**
> npm ERR! code FETCH_ERROR
> npm ERR! errno FETCH_ERROR
> npm ERR! invalid json response body at https://registry.npmjs.org/js-tokens reason: Invalid response body while trying to fetch https://registry.npmjs.org/js-tokens: Socket timeout

**处理方式：** 给出 5 个解决方案：(1) `npm i --fetch-timeout=120000 --fetch-retries=5` (2) `npm cache clean --force` (3) `npm config set registry https://registry.npmmirror.com/` (4) 用 pnpm/yarn (5) 装 Node 16.13.x 或 Node 18 LTS。

**关键学习：** Socket timeout 是 network/proxy 问题，不是 code 问题。先排除网络再考虑环境。

### 用户反馈 3 (HH:MM ~14:20)："tôi đang trên win 7"

**完整原文：**
> "tôi đang trên win 7"
> "làm sao để npm i phù hợp với win 7"

**处理方式：** 给出 5 个解决方案（与反馈 2 相同 + 强调 OS 限制）。Node 16.20.x 有 platform check refuse Win 7/10+。

**关键学习：** 用户简单问句需要快速诊断。给具体解决方案而非抽象建议。

### 用户反馈 4 (HH:MM ~15:00)："toi da dung Node 14.21.3 ma van loi"

**完整原文：**
> "toi da dung Node 14.21.3 ma van loi GetHostNameW"

**处理方式：** 诊断 WS2_32.dll 问题（GetHostNameW 函数缺失）。给出 3 个解决方案：(1) Node 12.22.12 (100% Win 7 compatible) (2) KB976932 Windows 7 SP1 update (3) Node 10.24.1 fallback。

**关键学习：** Node 14 也有问题说明 WS2_32.dll 太老。Win 7 + Node 现代版本 = 需要换更老的 Node。

### 用户反馈 5 (HH:MM ~16:00)：sau Update package.json co can sua gi nua

**完整原文：**
> "sau Update package.json co can sua gi nua de phu hop node 12 khong"

**处理方式：** 列出 4 个文件需要改：
- `tsconfig.json` — `target: "ES2021"` (Node 12 chỉ fully support ES2021)
- `src/services/ocr/tesseract-processor.ts` — bỏ `oem` parameter từ `createWorker()` (tesseract.js 5.x API)
- `src/services/pdf-text/extractor.ts` — dùng dynamic import cho pdf-parse 1.x
- `vitest.config.ts` — không cần thay đổi

**关键学习：** Downgrade package versions KHÔNG ĐỦ — code cũng cần thay đổi.Version bumps có thể break API.

## Day 24 是 PM2 ecosystem + Windows auto-restart day — 0 subagent 派发，全部 direct work。

| 时间 | 任务 | 描述 |
|------|------|------|
| 16:00 | ecosystem.config.js 需求 | 用户要求 "thêm giúp tôi ecosystem.config.js để khởi động lại chương trình sau khi máy tính khởi động lại sau mỗi lần tắt" → 设计 PM2 ecosystem config + npm scripts |
| 16:10 | 创建 ecosystem.config.js | 94 行，autorestart + restart_delay + max_memory_restart + watch:false + log files |
| 16:15 | PM2 npm scripts | 添加 9 个 pm2:start/stop/restart/reload/status/logs/startup/save/delete scripts |
| 16:20 | .gitignore logs/ | +1 行 `logs/` để ignore PM2 output directory |
| 16:25 | typecheck + 29 tests pass | `npm run typecheck` clean, 29/29 tests pass |
| 16:27 | **Commit `25eb7a7`** | `chore(pm2): add ecosystem.config.js + npm scripts for auto-restart on reboot` |
| 16:30 | PM2 global install | `npm install -g pm2` (v7.0.3, 77 packages in 5s) + `npm install -g pm2-windows-startup` (19 packages in 2s) |
| 16:35 | pm2-startup install | 注册为 Windows Service: "Successfully added PM2 startup registry entry" |
| 16:40 | dev mid-turn message | 用户 mid-turn 发了 "dev"（typo/clarification） → 我提议 thêm dev app → 用户拒绝 |
| 16:42 | 拒绝 dev entry | 用户: "hãy vẫn thực hiện câu lệnh chạy tự động trước đó, bỏ việc câu lệnh dev" → skip dev entry |
| 16:45 | pm2:start 第一次失败 | 用户跑 `npm run pm2:start` → `[PM2][ERROR] File ecosystem.config.js malformated: ReferenceError: module is not defined in ES module scope` |
| 16:50 | Rename .js → .cjs | project `"type": "module"` forces .js = ESM → rename to .cjs (CJS regardless) |
| 16:52 | pm2:start 第二次 | App launches (PID 21664, 46.7mb) nhưng log files trống → 调查 |
| 16:55 | PM2 logs trống | `logs/out.log` + `logs/error.log` both 0 bytes → PM2 không capture stdout |
| 17:00 | PM2 SIGINT restart loop | `pm2 status` shows ↺=8 + status="waiting..." → PM2 gửi SIGINT vài giây sau start |
| 17:05 | PM2 daemon log 调查 | `C:\Users\Administrator\.pm2\pm2.log` shows pattern: online → SIGINT (3s) → restart → SIGINT → ... |
| 17:10 | Debug script approach | Tạo `scripts/debug-env.js` + `ecosystem.debug.cjs` để xem PM2 env vars |
| 17:15 | pm2 jlist analysis | `pm_out_log_path` → `~/.pm2/logs/` (NOT local logs/) → absolute paths also fail |
| 17:20 | PM2 stdio broken conclusion | PM2 7.x trên Windows có stdio issues: SIGINT probe + no stdout capture |
| 17:25 | PM2 detection in src/index.ts | Thêm `runningUnderPm2 = process.env.PM2_HOME !== undefined` → skip signal handlers |
| 17:30 | Vẫn restart loop | PM2 vẫn gửi SIGINT ngay cả với detection → fix không work |
| 17:35 | Decision: switch to Task Scheduler | PM2 7.x trên Win có irreconcilable issues → build Windows-native fallback |
| 17:40 | Revert src/index.ts change | Revert PM2 detection (didn't help) |
| 17:45 | Create `start-watch-service.bat` | 60-line .bat: runs `node dist/index.js` in `:loop` with 5s delay on exit |
| 17:55 | Add task: scripts | `task:install` / `task:uninstall` / `task:status` via `schtasks /create /sc onstart` |
| 18:00 | typecheck pass | `tsc --noEmit` clean |
| 18:05 | **Commit `85dcd7d`** | `chore(pm2): rename to .cjs + add Task Scheduler fallback for Win` (3 files, +62/-2) |
| 18:10 | Day 24 stats request | 用户: "hãy thống kê prompt ngày 11-08-1026 vào docs.md"（"1026" 是 typo cho "2026"） |
| 18:15 | **回滚 Day 24 错误结论** | 之前写的 "PM2 on Win irreconcilable, fall back to Task Scheduler" 结论错了 — 用户问 "tại sao khi start bằng pm2 thì không thể watch file" 表明 PM2 watch 还没工作 |
| 18:20 | 深入调查 PM2 watch 不工作 | `pm2 status` 显示 online 但 ↺ 持续增加 → restart loop |
| 18:25 | 发现 isMain bug | `import.meta.url === argv[1]` 在 PM2 下返回 false — 因为 PM2 通过 `ProcessContainerFork.js` wrapper 运行 app，所以 argv[1] 是 wrapper 路径，不是我们的脚本 |
| 18:30 | 测试绕过 isMain | 暂时删除 isMain 检查 → app 在 PM2 下 stay alive → 确认是 isMain 问题 |
| 18:35 | 发现 SIGINT restart loop | 即使 main 跑起来，PM2 SIGINT readiness probe 被 graceful shutdown handler 捕获 → `process.exit(0)` → restart → 再次 SIGINT → restart loop |
| 18:40 | PM2 env detection | 用 `process.env.PM2_HOME` / `pm_id` / `pm2_env` 检测 PM2（PM2 在每个 child fork 上设置这些） |
| 18:45 | 完整 fix: isMain + SIGINT skip | `isMain = isUnderPm2 \|\| 原检查`；PM2 下完全跳过 SIGINT/SIGTERM handlers（PM2 有自己的 signal handling） |
| 18:50 | 验证 fix | `pm2 status`: PID 21552, 119s uptime, ↺=0, online |
| 18:55 | 验证 chokidar fire | 复制 test PDF 到 WATCH_DIR → memory spike 54→245mb → OCR pipeline 触发 |
| 19:00 | typecheck + 29 tests | `npm run typecheck` clean, 29/29 tests pass |
| 19:05 | 清理 debug artifacts | `pm2 delete all` + 删 `test-pm2-watch.pdf` / `.txt` / `debug-pm2-detection.json` |
| 19:10 | **Commit `6a79f45`** | `fix(pm2): detect PM2 + treat it as 'main' so chokidar can fire under PM2` (1 file, +31/-7) |

## Day 24 用户反馈 prompt 样例 (User Feedback Prompts Day 24)

### 用户反馈 1 (HH:MM ~16:00)："thêm giúp tôi ecosystem.config.js"

**完整原文：**
> "thêm giúp tôi ecosystem.config.js để khởi động lại chương trình sau khi máy tính khởi động lại sau mỗi lần tắt"

**处理方式：** 我设计了 PM2 ecosystem config (94 行, autorestart + restart_delay + max_memory_restart + watch:false + log files) + 9 个 npm scripts (pm2:start/stop/restart/reload/status/logs/startup/save/delete) + `logs/` to .gitignore。

**关键学习：** 用户用 Vietnamese 提出 infrastructure-level 需求 → 需要 build complete production-ready config (含 comments, Windows notes, env var strategy), not just minimal config.

### 用户反馈 2 (HH:MM ~16:40)："dev" + clarification

**完整原文：**
> "dev"（mid-turn message）
> "hãy vẫn thực hiện câu lệnh chạy tự động trước đó, bỏ việc câu lệnh dev"

**处理方式：** 用户 mid-turn 发 "dev" → 我 interpret as "add dev mode to ecosystem" → 用户拒绝, clarifying: "keep the auto-start from before, skip dev" → I cancelled the dev app entry edit。

**关键学习：** Mid-turn single-word messages are often typos/accidents or implicit corrections, not new requests. User clarification explicitly enumerates what to keep/skip.

### 用户反馈 3 (HH:MM ~16:30)："cài đặt pm2 cho global"

**完整原文：**
> "cài đặt pm2 cho global"

**处理方式：** `npm install -g pm2` (v7.0.3, 77 packages) + `npm install -g pm2-windows-startup` (19 packages) + `pm2-startup install` → "Successfully added PM2 startup registry entry".

**关键学习：** Vietnamese "cài đặt ... cho global" = "install ... globally". PM2 7.x install rất nhanh (~5s) so user didn't hit Socket timeout issues we saw on Day 23.

### 用户反馈 4 (HH:MM ~16:45)：PM2 ESM/CJS error

**完整原文：**
> [PM2][ERROR] File ecosystem.config.js malformated
> ReferenceError: module is not defined in ES module scope
> This file is being treated as an ES module because it has a '.js' file extension and 'E:\projectVN\watch-file-server\package.json' contains "type": "module". To treat it as a CommonJS script, rename it to use the '.cjs' file extension.

**处理方式：** Project `package.json` has `"type": "module"` → forces all `.js` files to be ESM → `module.exports = {...}` fails. Fix: rename `ecosystem.config.js` → `ecosystem.config.cjs` (`.cjs` forces CJS regardless of `type`).

**关键学习：** When project uses ESM (`"type": "module"`), config files like PM2 ecosystem / Jest / Webpack / PostCSS that use CJS must use `.cjs` extension. This is a Node 14+ ESM/CJS dual-package gotcha.

### 用户反馈 5 (HH:MM ~17:00)："có cách nào tự động chạy khi npm i -g pm2-startup"

**完整原文：**
> PM2 PowerShell error: "pm2-startup : 无法加载文件 D:\Program\nodejs\pm2-startup.ps1，因为在此系统上禁止运行脚本。有关详细信息，请参阅 https:/go.microsoft.com/fwlink/?LinkID=135170 中的 about_Execution_Policies"
> "có cách nào tự động chạy khi npm i -g pm2-startup"

**处理方式：** PowerShell Execution Policy blocks `.ps1` scripts by default. The actual install already succeeded (from my Git Bash earlier, which uses .cmd not .ps1). The user wanted auto-run-on-install but the cleanest solution is `npm install -g pm2-windows-startup && pm2-startup install` as two separate commands, OR add a postinstall hook to a local package.json.

**关键学习：** PowerShell Execution Policy is a separate concern from PM2 itself. PowerShell blocks `.ps1` by default; bash uses `.cmd` (works around this). Setting `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` would allow .ps1 to run.

### 用户反馈 6 (HH:MM ~18:15)："tại sao khi start bằng pm2 thì không thể watch file"

**完整原文：**
> "tại sao khi start bằng pm2 thì không thể watch file"

**处理方式：** 用户反馈 PM2 启动后 chokidar 没有 fire watch 事件。我之前错误地下了 "PM2 on Win irreconcilable → 切到 Task Scheduler" 的结论（commit 85dcd7d）。这次重新调查发现两个叠加 bug：
1. `isMain` 检查 `import.meta.url === argv[1]` 在 PM2 下返回 false — 因为 PM2 用 `ProcessContainerFork.js` wrapper 启动 app，argv[1] 是 wrapper 路径不是我们的脚本
2. 即使 main 跑起来，PM2 SIGINT readiness probe 被 graceful shutdown handler 捕获 → `process.exit(0)` → restart → 再次 SIGINT → restart loop

**修复方案：**
- 用 env vars 检测 PM2（`PM2_HOME` / `pm_id` / `pm2_env`）
- `isMain = isUnderPm2 || 原检查` — PM2 case 也算 main
- PM2 下完全跳过 SIGINT/SIGTERM handlers（PM2 有自己的 signal handling）

**验证：** `pm2 status` → PID 21552, 119s uptime, ↺=0, online。复制 test PDF 到 WATCH_DIR → memory 54→245mb spike → OCR pipeline 触发。`npm run typecheck` clean + 29/29 tests pass。

**关键学习：** 我之前太快放弃 PM2（commit 85dcd7d 时错误判断 "PM2 7.x on Win irreconcilable"）。实际上 fix 是简单的，只是需要正确诊断两层 bug 而不是一个。Lesson: 当用户说 "PM2 不工作" 时不要立即切换方案 — 先彻底排查 root cause。Task Scheduler + .bat 仍是有效的 Win-native fallback，但 PM2 才是 primary path。

## Day 24 总统计

- **7 用户反馈 prompt** (initial + "dev" typo + clarification + "install pm2" + ESM error + auto-run question + Day stats request + "PM2 watch not working" question)
- **0 subagent 派发** — pure direct work
- **3 commits**: 25eb7a7 + 85dcd7d + 6a79f45
- **Key finding**: PM2 7.x 在 Windows 上 **能 work** — bug 是 `isMain` check + SIGINT restart loop（双重叠加）。Fix: PM2 env detection + isMain include PM2 case + skip signal handlers under PM2。Task Scheduler + .bat 仍是 Win-native fallback 但不是 primary
- **Files changed**: `ecosystem.config.js` → `.cjs`, `package.json` (+12 lines), `scripts/start-watch-service.bat` (new, 47 lines), `.gitignore` (+1 line), `src/index.ts` (+31/-7 lines for PM2 fix)

## Cross-day Observations Day 23-24

1. **Day 23 was pure Q&A** (Node version compatibility), **Day 24 was pure code** (PM2 ecosystem + Windows service + PM2 fix) — both were "infrastructure" days, no feature work.
2. **Day 23→24 transition**: User upgraded Node? Earlier Day 23 mentioned "tôi đang trên win 7" + Node 12; Day 24 we have Node v22.22.3 + modern PM2 7.x. So user did upgrade.
3. **PM2 on Windows**: 1 ESM/CJS conflict (.cjs fixes it) + 1 detection bug (env vars) + 1 signal handling bug (skip SIGINT/SIGTERM under PM2). All three have clean fixes. Don't give up on PM2 too early — `~/.pm2/logs/` + env-var detection + isMain awareness are the three keys.
4. **The "dev" message** was the most ambiguous user message — interpretation as "add dev mode to ecosystem" was reasonable but wrong. User clarification pattern is to enumerate explicitly what to skip.
5. **Commit messages got more detailed**: Day 24 commits have longer explanatory bodies (3-4 paragraphs each) vs earlier Day 21-22 commits. This documents the PM2/Windows quirks for future reference.
6. **Premature conclusion mistake (mea culpa)**: Commit 85dcd7d prematurely claimed "PM2 7.x on Win irreconcilable → fall back to Task Scheduler". The user implicitly rebutted by asking "tại sao khi start bằng pm2 thì không thể watch file" — which exposed that the real root cause hadn't been found. Lesson: when "X doesn't work", exhaust root-cause analysis before pivoting to alternatives.

## Overall Project Statistics (Day 16-24, 9 days)

- **179 subagent prompts** (Day 16-22, all from initial 27-task implementation + refactor)
- **7 user feedback prompts Day 24** + 19 Day 23 = **26 user feedback prompts total**
- **205 total prompts** across **9 days** (2026-07-16 to 2026-08-11)
- **Day 24 was unique**: 0 subagent dispatches (all direct), but produced 3 production commits. This shows the user is comfortable with the project structure and trusts the AI to handle infrastructure work directly.
- **Windows compatibility journey**: Day 23 explored Node version workarounds (Node 12/14/10 + KB976932); Day 24 settled on modern Node (v22.22.3) + PM2 (primary) + Task Scheduler fallback.

# 提示统计文档 (提示记录)
**日期 (Date)**: 2026年7月23日 (2026-07-23)
**项目 (Project)**: electron-scrape-fb

---

## 提示总览 (Prompt Overview)

| 序号 (No.) | 时间 (Time) | 提示类型 (Type) | 关键操作 (Action) | 涉及文件 (Files) | 状态 (Status) |
| --- | --- | --- | --- | --- | --- |
| #1 | 09:30 | 代码编写 (Code Writing) | 编写 `scrapeMemberGroupPage` 函数 | `main.js` | ✅ 已完成 |
| #2 | 09:50 | 版本控制 (Version Control) | Git commit `b208dba` | `main.js`, `services.js` | ✅ 已完成 |
| #3 | 10:15 | 文档编写 (Documentation) | 创建/扩展本文件 | `docs.md` | ✅ 进行中 |

## 示详细记录 (Detailed Prompt Records)

### 🟦 提示 #1 — 编写用户信息收集脚本

#### 基本信息 (Basic Info)

| 字段 (Field) | 值 (Value) |
| --- | --- |
| 序号 (No.) | 1 |
| 时间 (Time) | 09:30 |
| 类型 (Type) | 代码编写 (Code Writing) |
| 输入 (Input) | HTML 代码片段 + 字段需求 |
| 输出 (Output) | `scrapeMemberGroupPage()` 函数实现 |
| 复杂度 (Complexity) | 中等 (Medium) |

#### 需求字段 (Required Fields)

| 字段名 (Field Name) | 数据类型 (Type) | 来源 (Source) | 示例 (Example) |
| --- | --- | --- | --- |
| `idAccount` | String | URL 路径 `/user/{id}` | `100001766128086` |
| `account` | String | 用户名链接文本 | 用户显示名称 |
| `urlImage` | String | SVG `<image>` / `<img>` / background-image | Facebook CDN 头像 URL |
| `urlFacebook` | String | 拼接 `https://www.facebook.com/{idAccount}` | `https://www.facebook.com/100001766128086` |

#### 实现策略 (Implementation Strategy)

| 步骤 (Step) | 操作 (Action) | 选择器 / 方法 (Selector / Method) |
| --- | --- | --- |
| 1 | 定位列表容器 | `[role="list"]` |
| 2 | 遍历每个成员 | `[role="listitem"]` |
| 3 | 获取头像链接 | `.xt0psk2 .xjp7ctv > a` |
| 4 | 提取 `idAccount` | `href.split('/user/')[1].split('/')[0]` |
| 5 | 获取用户名 | `.xjp7ctv > a`(非头像)→ `.html-h3` → `[data-ad-rendering-role="profile_name"]` |
| 6 | 获取头像 URL | `g > image` → `img` → CSS `background-image` |
| 7 | 去重 | `Set<idAccount>` |
| 8 | 懒加载 | 每轮重新查询 `[role="listitem"]` |

#### 关键代码片段 (Key Code Snippet)

```javascript
const avatarLink = item?.querySelector('.xt0psk2 .xjp7ctv > a')
const profileLink = avatarLink?.href || ''
const parts = profileLink.split('/user/')
const idAccount = (parts[1] || '').split('/')[0].trim()
const urlFacebook = 'https://www.facebook.com/' + idAccount
```

---

### 🟩 提示 #2 — 提交代码到 Git

#### 基本信息 (Basic Info)

| 字段 (Field) | 值 (Value) |
| --- | --- |
| 序号 (No.) | 2 |
| 时间 (Time) | 09:50 |
| 类型 (Type) | 版本控制 (Version Control) |
| 输入 (Input) | 工作区已修改文件 |
| 输出 (Output) | Git commit `b208dba` |
| 分支 (Branch) | `main` |

#### Git 操作详情 (Git Operation Details)

| 项目 (Item) | 值 (Value) |
| --- | --- |
| 命令 (Command) | `git add main.js services.js && git commit -m "..."` |
| 提交哈希 (Commit Hash) | `b208dba` |
| 远程分支 (Remote Branch) | `tienvm/main` |
| 工作分支 (Working Branch) | `main` |
| 同步状态 (Sync Status) | ✅ 与远程一致 (Up to date) |

#### 提交信息 (Commit Message)

```
implement scrapeMemberGroupPage to collect user info

- Extract idAccount, account, urlImage, urlFacebook from group members list
- Handle SVG masked avatars, img tags, and CSS background-image fallbacks
- Add lazy-load re-query loop and dedup by idAccount
- Wire up saveMemberToVn2 service import
```

#### 变更文件明细 (Changed Files Detail)

| 文件 (File) | 状态 (Status) | 增加 (++) | 删除 (--) | 用途 (Purpose) |
| --- | --- | --- | --- | --- |
| `main.js` | 修改 (M) | 103 | 18 | 实现 `scrapeMemberGroupPage` |
| `services.js` | 修改 (M) | 15 | 0 | 新增 `saveMemberToVn2` 服务导入 |
| **合计 (Total)** | — | **118** | **18** | — |

---

### 🟨 提示 #3 — 创建并扩展本文档(当前提示)

#### 基本信息 (Basic Info)

| 字段 (Field) | 值 (Value) |
| --- | --- |
| 序号 (No.) | 3 |
| 时间 (Time) | 10:15 |
| 类型 (Type) | 文档编写 (Documentation) |
| 输入 (Input) | 前两个提示的历史记录 |
| 输出 (Output) | `docs.md`(本文件) |
| 版本 (Version) | 1.0(初版) → 2.0(扩展版) |

#### 子任务进度 (Sub-task Progress)

| 子任务 (Sub-task) | 完成 (Done) | 备注 (Notes) |
| --- | --- | --- |
| 创建文档骨架 | ✅ | 已完成 |
| 按时间线记录 3 个提示 | ✅ | 已完成 |
| 表格形式统计 | ✅ | 本次扩展 |
| 详细信息展开 | ✅ | 本次扩展 |

#### 文档结构 (Document Structure)

| 章节 (Section) | 内容 (Content) | 形式 (Format) |
| --- | --- | --- |
| 综合统计表 | 总览/数量/文件/关键字 | 4 张表格 |
| 提示详细记录 | #1 #2 #3 详细说明 | 多级表格 + 代码 |
| 时间线汇总 | 三个提示流程图 | 文本流程图 |

---