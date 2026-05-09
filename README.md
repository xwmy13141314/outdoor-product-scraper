[中文文档](./README_CN.md)

# Outdoor Product Scraper

An intelligent outdoor electronics product data collection and analysis tool. It automatically scrapes product pages, extracts structured specifications via AI, and syncs data to Feishu (Lark) spreadsheets.

## Features

- **Smart Page Detection** — Automatically identifies product list pages vs. detail pages
- **AI-Powered Extraction** — Uses GLM-4-flash to extract 30+ structured fields from unstructured HTML
- **Feishu Sync** — Auto-creates/updates records in Feishu Bitable
- **Batch Processing** — Scrapes up to 20 products from a list page in one run
- **Anti-Detection** — Random User-Agent rotation, configurable request delays, retry with backoff

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Backend | Supabase Edge Functions (Deno) |
| Database | Supabase PostgreSQL |
| AI | GLM-4-flash (primary) / Claude API (fallback) |
| Data Sync | Feishu (Lark) Bitable API |

## Data Flow

```
URL Input → HTML Scrape → DOM Parse → AI Extraction → Feishu Sync + DB Storage
```

## Extracted Fields

The tool extracts the following product specifications:

| Category | Fields |
|----------|--------|
| Basic | Name, Brand, Release Date, Dimensions, Weight |
| Display | Size, Resolution, Type, Protection |
| Performance | OS, Chipset, CPU, GPU, RAM, Storage |
| Camera | Main Camera, Selfie Camera, Video |
| Battery | Capacity, Life, Charging Power, Wireless Charging |
| Connectivity | Network, NFC, USB Type, Audio Jack |
| Durability | Waterproof/Dust Rating (IP68, IP69K, etc.) |
| Other | Colors, Price, Special Features |

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- A [Supabase](https://supabase.com/) account
- A [Zhipu AI (GLM)](https://open.bigmodel.cn/) API key
- A [Feishu (Lark)](https://open.feishu.cn/) account (optional, for spreadsheet sync)

### 1. Clone & Install

```bash
git clone https://github.com/xwmy13141314/outdoor-product-scraper.git
cd outdoor-product-scraper
pnpm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com/) and create a new project
2. Run the migration files in `supabase/migrations/` to create the required tables (`product_scrapes` and `products`)
3. Get your project URL and anon key from **Project Settings → API**

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Get GLM API Key

1. Register at [Zhipu AI Open Platform](https://open.bigmodel.cn/)
2. Go to **API Keys** page and create a new key
3. Save the key for the next step

### 4. Set Up Feishu Integration (Optional)

> This step is optional. The scraper works without Feishu — data will still be saved to Supabase.

#### 4a. Create a Feishu App

1. Go to [Feishu Open Platform](https://open.feishu.cn/app) and click **Create Enterprise Custom App**
2. After creation, go to **Credentials & Basic Info** to get:
   - `App ID` → this is your `FEISHU_APP_ID`
   - `App Secret` → this is your `FEISHU_APP_SECRET`
3. Go to **Permissions & Scopes**, search and enable:
   - `bitable:app` — Read and write Bitable
   - `bitable:app:readonly` — Read Bitable (if needed)
4. **Important**: Click **Create Version → Submit for Review → Publish** to activate permissions

#### 4b. Create a Bitable (Spreadsheet)

1. Create a new **Bitable** (多维表格) in Feishu
2. Add the following columns (text type):

| Column Name | Type | Description |
|------------|------|-------------|
| 产品型号 | Text | Product model name |
| 产品名称 | Text | Product name |
| 品牌 | Text | Brand |
| 发布时间 | Text | Release date |
| 尺寸 | Text | Dimensions |
| 重量 | Text | Weight |
| 屏幕尺寸 | Text | Display size |
| 分辨率 | Text | Resolution |
| 屏幕类型 | Text | Display type |
| 屏幕保护 | Text | Display protection |
| 操作系统 | Text | OS |
| 芯片 | Text | Chipset |
| CPU | Text | CPU |
| GPU | Text | GPU |
| RAM | Text | RAM |
| ROM | Text | Storage |
| 主摄 | Text | Main camera |
| 前摄 | Text | Selfie camera |
| 视频格式 | Text | Video |
| 电池容量 | Text | Battery |
| 续航时间 | Text | Battery life |
| 充电功率 | Text | Charging |
| 无线充电 | Text | Wireless charging |
| 防水防尘 | Text | Waterproof rating |
| 网络制式 | Text | Network |
| NFC | Text | NFC |
| USB类型 | Text | USB type |
| 3.5mm耳机孔 | Text | Audio jack |
| 颜色 | Text | Colors |
| 价格 | Text | Price |
| 特殊功能 | Text | Special features |
| 数据来源 | Text | Source URL |
| 抓取时间 | Text | Scraped time |

3. Get the table identifiers from the Bitable URL:

```
https://your-domain.feishu.cn/base/YOUR_APP_TOKEN?table=YOUR_TABLE_ID
```

- `YOUR_APP_TOKEN` → this is your `FEISHU_APP_TOKEN`
- `YOUR_TABLE_ID` → this is your `FEISHU_TABLE_ID`

#### 4c. Add App as Bitable Collaborator

1. Open the Bitable you created
2. Click **Share** (top-right) → **Add Collaborator**
3. Search for your app by name and add it with **Edit** permission

### 5. Configure Supabase Edge Function Secrets

Set all credentials via Supabase CLI:

```bash
# Required
supabase secrets set GLM_API_KEY=your-glm-api-key

# Optional (Feishu sync)
supabase secrets set FEISHU_APP_ID=your-feishu-app-id
supabase secrets set FEISHU_APP_SECRET=your-feishu-app-secret
supabase secrets set FEISHU_APP_TOKEN=your-bitable-app-token
supabase secrets set FEISHU_TABLE_ID=your-bitable-table-id

# Auto-configured by Supabase (no need to set manually)
# SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
```

### 6. Deploy Edge Functions

```bash
supabase functions deploy scrape-product
supabase functions deploy scrape-product-list
supabase functions deploy feishu-sync
```

### 7. Run Development Server

```bash
pnpm dev
```

Open http://localhost:8080

## Project Structure

```
├── src/
│   ├── pages/
│   │   └── Index.tsx              # Main UI page
│   ├── integrations/supabase/
│   │   ├── client.ts              # Supabase client (env-based)
│   │   └── types.ts               # Auto-generated DB types
│   ├── components/ui/             # shadcn/ui components
│   └── hooks/
├── supabase/
│   ├── functions/
│   │   ├── scrape-product/        # Main scraper (list + detail)
│   │   ├── scrape-product-list/   # Batch list scraper
│   │   ├── extract-product-info/  # Claude API extractor
│   │   ├── feishu-sync/           # Feishu CRUD sync
│   │   ├── feishu-diagnostic/     # Connection diagnostics
│   │   ├── feishu-simple-write/   # Simple write test
│   │   ├── feishu-debug-write/    # Debug write test
│   │   └── test-scrape/           # Full pipeline test
│   └── migrations/                # DB migration files
├── .env.example                   # Environment template
└── .gitignore                     # Excludes .env and secrets
```

## API Reference

### `scrape-product`

Main scraping endpoint supporting both list and detail pages.

```typescript
// Request
{ url: string, useAI?: boolean, syncToFeishu?: boolean }

// Response
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

Sync product data to Feishu Bitable with upsert logic.

```typescript
// Request
{ product: Product, sourceUrl?: string, action?: "sync" | "add" | "search" }

// Response
{ success: boolean, action: "created" | "updated" | "searched", record: any }
```

## Environment Variables Summary

| Variable | Where to Set | Required | Description |
|----------|-------------|----------|-------------|
| `VITE_SUPABASE_URL` | `.env` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env` | ✅ | Supabase anon/public key |
| `GLM_API_KEY` | `supabase secrets` | ✅ | Zhipu AI API key |
| `FEISHU_APP_ID` | `supabase secrets` | ❌ | Feishu app ID |
| `FEISHU_APP_SECRET` | `supabase secrets` | ❌ | Feishu app secret |
| `FEISHU_APP_TOKEN` | `supabase secrets` | ❌ | Feishu Bitable app token |
| `FEISHU_TABLE_ID` | `supabase secrets` | ❌ | Feishu Bitable table ID |
| `ANTHROPIC_API_KEY` | `supabase secrets` | ❌ | Anthropic API key (fallback AI) |

## License

MIT
