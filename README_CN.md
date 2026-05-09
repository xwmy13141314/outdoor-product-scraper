[English](./README.md)

# 户外电子产品竞品采集工具

一款智能户外电子产品数据采集与分析工具。自动抓取产品页面，通过 AI 提取结构化规格参数，并同步数据到飞书多维表格。

## 功能特点

- **智能页面识别** — 自动识别产品列表页与详情页
- **AI 结构化提取** — 使用 GLM-4-flash 从非结构化 HTML 中提取 30+ 字段
- **飞书自动同步** — 自动在飞书多维表格中创建/更新记录
- **批量处理** — 单次运行可抓取列表页中最多 20 个产品
- **反检测机制** — 随机 User-Agent 轮换、可配置请求延迟、失败重试

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| 后端 | Supabase Edge Functions (Deno) |
| 数据库 | Supabase PostgreSQL |
| AI 提取 | GLM-4-flash（主力）/ Claude API（备选） |
| 数据同步 | 飞书多维表格 API |

## 数据流程

```
URL 输入 → HTML 抓取 → DOM 解析 → AI 提取 → 飞书同步 + 数据库存储
```

## 提取字段

工具可提取以下产品规格参数：

| 分类 | 字段 |
|------|------|
| 基本信息 | 产品名称、品牌、发布时间、尺寸、重量 |
| 显示屏 | 屏幕尺寸、分辨率、类型、保护玻璃 |
| 性能 | 操作系统、芯片组、CPU、GPU、RAM、存储 |
| 相机 | 主摄、前摄、视频规格 |
| 电池 | 容量、续航时间、充电功率、无线充电 |
| 连接性 | 网络制式、NFC、USB 类型、3.5mm 耳机孔 |
| 防护 | 防水防尘等级（IP68、IP69K 等） |
| 其他 | 颜色、价格、特殊功能 |

## 快速开始

### 前置条件

- Node.js 18+
- pnpm
- [Supabase](https://supabase.com/) 账号
- [智谱 AI（GLM）](https://open.bigmodel.cn/) API Key
- [飞书](https://open.feishu.cn/) 账号（可选，用于表格同步）

### 1. 克隆 & 安装

```bash
git clone https://github.com/xwmy13141314/outdoor-product-scraper.git
cd outdoor-product-scraper
pnpm install
```

### 2. 创建 Supabase 项目

1. 前往 [supabase.com](https://supabase.com/) 创建一个新项目
2. 执行 `supabase/migrations/` 目录下的迁移文件，创建所需的数据库表（`product_scrapes` 和 `products`）
3. 在 **项目设置 → API** 中获取项目 URL 和 anon key

```bash
cp .env.example .env
```

编辑 `.env`：

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 获取 GLM API Key

1. 注册 [智谱 AI 开放平台](https://open.bigmodel.cn/)
2. 进入 **API Keys** 页面，创建新的 API Key
3. 保存该 Key 用于下一步配置

### 4. 配置飞书集成（可选）

> 此步骤可选。不配置飞书不影响核心功能——数据仍会保存到 Supabase 数据库。

#### 4a. 创建飞书应用

1. 前往 [飞书开放平台](https://open.feishu.cn/app)，点击 **创建企业自建应用**
2. 创建完成后，进入 **凭证与基础信息** 页面获取：
   - `App ID` → 即 `FEISHU_APP_ID`
   - `App Secret` → 即 `FEISHU_APP_SECRET`
3. 进入 **权限管理**，搜索并开通以下权限：
   - `bitable:app` — 查看、评论、编辑和管理多维表格
   - `bitable:app:readonly` — 读取多维表格（按需）
4. **重要**：点击 **创建版本 → 提交审核 → 发布**，使权限生效

#### 4b. 创建多维表格

1. 在飞书中新建一个 **多维表格**
2. 添加以下列（文本类型）：

| 列名 | 类型 | 说明 |
|------|------|------|
| 产品型号 | 文本 | 产品型号名称 |
| 产品名称 | 文本 | 产品名称 |
| 品牌 | 文本 | 品牌 |
| 发布时间 | 文本 | 发布日期 |
| 尺寸 | 文本 | 尺寸规格 |
| 重量 | 文本 | 重量 |
| 屏幕尺寸 | 文本 | 屏幕大小 |
| 分辨率 | 文本 | 屏幕分辨率 |
| 屏幕类型 | 文本 | 屏幕类型 |
| 屏幕保护 | 文本 | 屏幕保护玻璃 |
| 操作系统 | 文本 | 操作系统 |
| 芯片 | 文本 | 芯片组 |
| CPU | 文本 | CPU |
| GPU | 文本 | GPU |
| RAM | 文本 | 运行内存 |
| ROM | 文本 | 存储容量 |
| 主摄 | 文本 | 主摄像头 |
| 前摄 | 文本 | 前置摄像头 |
| 视频格式 | 文本 | 视频规格 |
| 电池容量 | 文本 | 电池容量 |
| 续航时间 | 文本 | 续航时间 |
| 充电功率 | 文本 | 充电功率 |
| 无线充电 | 文本 | 无线充电 |
| 防水防尘 | 文本 | 防水等级 |
| 网络制式 | 文本 | 网络制式 |
| NFC | 文本 | NFC |
| USB类型 | 文本 | USB 接口类型 |
| 3.5mm耳机孔 | 文本 | 3.5mm 耳机孔 |
| 颜色 | 文本 | 可选颜色 |
| 价格 | 文本 | 价格 |
| 特殊功能 | 文本 | 特殊功能 |
| 数据来源 | 文本 | 来源 URL |
| 抓取时间 | 文本 | 抓取时间 |

3. 从多维表格 URL 中提取标识符：

```
https://your-domain.feishu.cn/base/YOUR_APP_TOKEN?table=YOUR_TABLE_ID
```

- `YOUR_APP_TOKEN` → 即 `FEISHU_APP_TOKEN`
- `YOUR_TABLE_ID` → 即 `FEISHU_TABLE_ID`

#### 4c. 将应用添加为多维表格协作者

1. 打开你创建的多维表格
2. 点击右上角 **分享** → **添加协作者**
3. 搜索你的应用名称，添加并授予 **编辑** 权限

### 5. 配置 Supabase Edge Functions 环境变量

通过 Supabase CLI 设置所有凭证：

```bash
# 必需
supabase secrets set GLM_API_KEY=your-glm-api-key

# 可选（飞书同步）
supabase secrets set FEISHU_APP_ID=your-feishu-app-id
supabase secrets set FEISHU_APP_SECRET=your-feishu-app-secret
supabase secrets set FEISHU_APP_TOKEN=your-bitable-app-token
supabase secrets set FEISHU_TABLE_ID=your-bitable-table-id

# 以下由 Supabase 自动配置，无需手动设置
# SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
```

### 6. 部署 Edge Functions

```bash
supabase functions deploy scrape-product
supabase functions deploy scrape-product-list
supabase functions deploy feishu-sync
```

### 7. 启动开发服务器

```bash
pnpm dev
```

打开 http://localhost:8080

## 项目结构

```
├── src/
│   ├── pages/
│   │   └── Index.tsx              # 主界面
│   ├── integrations/supabase/
│   │   ├── client.ts              # Supabase 客户端（基于环境变量）
│   │   └── types.ts               # 自动生成的数据库类型
│   ├── components/ui/             # shadcn/ui 组件库
│   └── hooks/
├── supabase/
│   ├── functions/
│   │   ├── scrape-product/        # 主抓取函数（列表 + 详情）
│   │   ├── scrape-product-list/   # 列表页批量抓取
│   │   ├── extract-product-info/  # Claude API 提取器
│   │   ├── feishu-sync/           # 飞书增删改查同步
│   │   ├── feishu-diagnostic/     # 连接诊断工具
│   │   ├── feishu-simple-write/   # 简单写入测试
│   │   ├── feishu-debug-write/    # 调试写入测试
│   │   └── test-scrape/           # 完整流程测试
│   └── migrations/                # 数据库迁移文件
├── .env.example                   # 环境变量模板
└── .gitignore                     # 排除 .env 和密钥文件
```

## API 接口

### `scrape-product`

主抓取接口，同时支持列表页和详情页。

```typescript
// 请求
{ url: string, useAI?: boolean, syncToFeishu?: boolean }

// 响应
{
  success: boolean,
  id: string,
  title: string,
  pageType: "product_list" | "product_detail" | "unknown",
  data: { products?: Product[], product?: Product, count?: number },
  productsCount: number,
  feishuSync?: { success: boolean, action?: string }
}
```

### `feishu-sync`

同步产品数据到飞书多维表格，支持 upsert 逻辑。

```typescript
// 请求
{ product: Product, sourceUrl?: string, action?: "sync" | "add" | "search" }

// 响应
{ success: boolean, action: "created" | "updated" | "searched", record: any }
```

## 环境变量一览

| 变量名 | 配置位置 | 必需 | 说明 |
|--------|---------|------|------|
| `VITE_SUPABASE_URL` | `.env` | ✅ | Supabase 项目 URL |
| `VITE_SUPABASE_ANON_KEY` | `.env` | ✅ | Supabase anon/public key |
| `GLM_API_KEY` | `supabase secrets` | ✅ | 智谱 AI API Key |
| `FEISHU_APP_ID` | `supabase secrets` | ❌ | 飞书应用 App ID |
| `FEISHU_APP_SECRET` | `supabase secrets` | ❌ | 飞书应用 App Secret |
| `FEISHU_APP_TOKEN` | `supabase secrets` | ❌ | 飞书多维表格 App Token |
| `FEISHU_TABLE_ID` | `supabase secrets` | ❌ | 飞书多维表格 Table ID |
| `ANTHROPIC_API_KEY` | `supabase secrets` | ❌ | Anthropic API Key（备选 AI） |

## 许可证

MIT
