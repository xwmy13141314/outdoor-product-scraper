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
- Supabase account
- GLM API key (from [Zhipu AI](https://open.bigmodel.cn/))
- Feishu App with Bitable permissions (optional)

### 1. Clone & Install

```bash
git clone https://github.com/xwmy13141314/outdoor-product-scraper.git
cd outdoor-product-scraper
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Configure Supabase Edge Functions

Set secrets via Supabase CLI:

```bash
supabase secrets set GLM_API_KEY=your-glm-key
supabase secrets set FEISHU_APP_ID=your-app-id
supabase secrets set FEISHU_APP_SECRET=your-app-secret
supabase secrets set FEISHU_APP_TOKEN=your-app-token
supabase secrets set FEISHU_TABLE_ID=your-table-id
```

### 4. Deploy Edge Functions

```bash
supabase functions deploy scrape-product
supabase functions deploy scrape-product-list
supabase functions deploy feishu-sync
```

### 5. Run Development Server

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

## License

MIT
