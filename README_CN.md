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
- Supabase 账号
- GLM API Key（[智谱 AI 开放平台](https://open.bigmodel.cn/)）
- 飞书应用及多维表格权限（可选）

### 1. 克隆 & 安装

```bash
git clone https://github.com/xwmy13141314/outdoor-product-scraper.git
cd outdoor-product-scraper
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 填入你的凭证：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 配置 Supabase Edge Functions 环境变量

通过 Supabase CLI 设置密钥：

```bash
supabase secrets set GLM_API_KEY=your-glm-key
supabase secrets set FEISHU_APP_ID=your-app-id
supabase secrets set FEISHU_APP_SECRET=your-app-secret
supabase secrets set FEISHU_APP_TOKEN=your-app-token
supabase secrets set FEISHU_TABLE_ID=your-table-id
```

### 4. 部署 Edge Functions

```bash
supabase functions deploy scrape-product
supabase functions deploy scrape-product-list
supabase functions deploy feishu-sync
```

### 5. 启动开发服务器

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

## 许可证

MIT
