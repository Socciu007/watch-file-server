# 提示词历史与统计 (Prompt History & Statistics)

本文档记录在 `watch-file-server` 项目开发过程中，向各类 subagent 发送的所有提示词与向用户提出的所有问题的统计与详细样例。

---

## 1. 统计表

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