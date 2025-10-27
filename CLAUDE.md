# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

POI Translation Portal is a Next.js 14 application for managing multi-language translations of Points of Interest (POIs). The system uses AI-powered translation through multiple sources (OpenAI, Perplexity, SERP API) and stores data in Supabase.

## Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Linting
npm run lint
```

The development server runs on http://localhost:3000 by default.

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **UI Components**: Radix UI + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Translation APIs**: OpenAI GPT-4, Perplexity, SERP API
- **State Management**: React hooks (no external state library)

### Project Structure

```
app/
├── api/                     # Next.js API routes
│   ├── openai/             # OpenAI translation endpoint
│   ├── perplexity/         # Perplexity translation endpoint
│   ├── serp-real/          # SERP API search endpoint
│   ├── serp-demo/          # SERP API demo endpoint
│   ├── serp-screenshot/    # SERP screenshot retrieval
│   ├── translation-sources/ # Aggregated translation sources
│   ├── translations/       # Translation CRUD operations
│   └── pois/               # POI CRUD operations
├── layout.tsx              # Root layout
└── page.tsx                # Main application (single-page app)

components/
└── ui/                     # Reusable UI components (Radix UI based)

lib/
└── utils.ts                # Utility functions (cn helper for Tailwind)
```

### Key API Routes

All API routes are in `app/api/*/route.ts` following Next.js 14 conventions:

- **POST `/api/openai`**: Translates POI names using OpenAI GPT-4
  - Expects: `{ poiName, language, context? }`
  - Returns: Translation with reasoning, confidence, and alternatives

- **POST `/api/perplexity`**: Translates using Perplexity API
  - Similar structure to OpenAI endpoint

- **POST `/api/serp-real`**: Performs localized Google searches via SERP API
  - Expects: `{ query, location?, language, engine }`
  - Supports both Google search and Google Maps engines
  - Returns structured search results with localization

- **POST `/api/translation-sources`**: Aggregates translations from all sources
  - Orchestrates parallel calls to OpenAI, Perplexity, SERP, and Google Maps
  - Returns consolidated translation data with source attribution

- **DELETE `/api/pois/[klookId]`**: Deletes a POI by Klook ID

### Timeout Configuration

API routes have extended timeout limits configured in `vercel.json`:
- OpenAI, Perplexity, SERP, and translation-sources routes: 30 seconds
- This is necessary for AI API calls and SERP API requests

### Localization System

The application supports 14 languages with full localization for SERP API searches:

**Supported Languages**: ZH-CN, ZH-TW, JA-JP, KO-KR, TH-TH, VI-VN, ID-ID, MS-MY, EN-US, EN-GB, FR-FR, DE-DE, IT-IT, PT-BR

Each language has specific SERP localization config in `app/api/serp-real/route.ts:6-26`:
- `hl`: Interface language
- `gl`: Country for results
- `google_domain`: Localized Google domain
- `location`: Default search location

Language mappings for different APIs are defined in `app/api/translation-sources/route.ts:4-24`.

### Frontend Architecture

The main UI is a single-page application in `app/page.tsx`:

**State Management Patterns**:
- Form state for POI input (klookId, name, googlePlaceId, country)
- CSV upload state with progress tracking
- Translation results with filtering (status, language, country)
- Translation modal with multi-source comparison
- Real-time progress tracking for batch operations

**Key UI Features**:
- Tab-based interface (Dashboard, Add POI, Upload CSV, Translation Results, Manual Check)
- Real-time progress logs for translation operations
- Multi-source translation comparison with reasoning display
- SERP screenshot viewing functionality
- Manual task management for translation conflicts

### Database Structure

Database operations are simulated in the current implementation (see `app/api/pois/[klookId]/route.ts`). The application is designed to integrate with Supabase.

A database cleanup script is available in `cleanup-database.sql` which:
- Drops all RLS policies
- Removes foreign key constraints
- Cleans all tables, views, functions, sequences, and custom types
- Run this in Supabase SQL Editor before setting up a fresh schema

### Environment Variables

Required environment variables (not committed to repository):
- `OPENAI_API_KEY`: OpenAI API key for GPT-4 translations
- `SERP_API_KEY`: SERP API key for Google search data
- `PERPLEXITY_API_KEY`: Perplexity API key
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

## Development Guidelines

### Path Aliases
The project uses `@/*` to reference root-level imports:
```typescript
import { Button } from "@/components/ui/button"
```

### TypeScript Configuration
- Strict mode enabled
- Path alias `@/*` maps to project root
- ES6 lib with DOM types

### UI Component Pattern
All UI components follow shadcn/ui patterns:
- Based on Radix UI primitives
- Styled with Tailwind CSS
- Use `class-variance-authority` (cva) for variants
- Utility function `cn()` from `lib/utils.ts` for className merging

### API Response Structure
API routes should follow this pattern:
```typescript
return NextResponse.json({
  success: true,
  // ... data
  metadata: {
    timestamp: new Date().toISOString(),
    // ... additional metadata
  }
})
```

Error responses:
```typescript
return NextResponse.json(
  { error: 'Error message', details: 'Optional details' },
  { status: 400 }
)
```

### Translation Source Integration
When adding new translation sources:
1. Create API route in `app/api/[source-name]/route.ts`
2. Add language mapping to `LANGUAGE_MAPPINGS` in `translation-sources/route.ts`
3. Update timeout config in `vercel.json` if needed
4. Follow existing pattern of returning translation + reasoning + confidence

### CSV Upload Format
Expected CSV columns for bulk POI upload:
- `klookId`: Unique POI identifier
- `name`: POI name in original language
- `googlePlaceId`: Google Places ID
- `country`: Country code or name

## Application User Flow

```mermaid
flowchart TD
    Start([用戶啟動應用]) --> Dashboard[Dashboard 儀表板]

    Dashboard --> Choice{選擇操作}

    Choice -->|單個 POI| AddPOI[Add POI 頁面]
    Choice -->|批量上傳| UploadCSV[Upload CSV 頁面]
    Choice -->|查看結果| ViewResults[Translation Results 頁面]
    Choice -->|處理衝突| ManualCheck[Manual Check 頁面]

    %% Add POI Flow
    AddPOI --> FillForm[填寫表單<br/>Klook ID, Name,<br/>Google Place ID, Country]
    FillForm --> ValidateForm{表單驗證}
    ValidateForm -->|欄位缺失| FillForm
    ValidateForm -->|ID 重複| FillForm
    ValidateForm -->|通過| CreatePOI[創建 POI 物件<br/>status: processing]
    CreatePOI --> AddToResults[加入 translationResults]
    AddToResults --> SaveLocalStorage[儲存至 localStorage]
    SaveLocalStorage --> StartTranslation[開始翻譯流程]

    %% CSV Upload Flow
    UploadCSV --> DownloadTemplate{需要範本?}
    DownloadTemplate -->|是| GetTemplate[下載 CSV 範本]
    DownloadTemplate -->|否| SelectFile[選擇 CSV 檔案]
    GetTemplate --> SelectFile
    SelectFile --> ParseCSV[解析 CSV 檔案]
    ParseCSV --> ValidateCSV{驗證 CSV}
    ValidateCSV -->|缺少欄位| ShowError[顯示錯誤訊息]
    ValidateCSV -->|格式正確| ProcessRows[處理每一行資料]
    ProcessRows --> CheckDuplicate{檢查重複 ID}
    CheckDuplicate -->|重複| SkipRow[跳過該行<br/>記錄為 duplicate]
    CheckDuplicate -->|不重複| CreateBatchPOI[創建 POI 物件<br/>status: pending]
    SkipRow --> NextRow{還有資料?}
    CreateBatchPOI --> NextRow
    NextRow -->|是| ProcessRows
    NextRow -->|否| BatchComplete[批次上傳完成]
    BatchComplete --> ShowUploadStats[顯示上傳統計<br/>成功/重複/錯誤數量]
    ShowUploadStats --> StartBatchTranslation[開始批次翻譯]

    %% Translation Process Flow
    StartTranslation --> TranslationLoop[翻譯循環開始]
    StartBatchTranslation --> TranslationLoop

    TranslationLoop --> InitProgress[初始化進度追蹤]
    InitProgress --> UpdateStatus1[更新 POI status<br/>為 processing]
    UpdateStatus1 --> LanguageLoop{遍歷 14 種語言}

    LanguageLoop --> SetLangProcessing[設定語言狀態<br/>為 processing]
    SetLangProcessing --> CallAPI[呼叫 /api/translation-sources]

    CallAPI --> APIRequest[並行呼叫 4 個 API<br/>OpenAI | Perplexity<br/>SERP | Google Maps]
    APIRequest --> APITimeout{API 超時?}
    APITimeout -->|是| UseError[使用錯誤翻譯]
    APITimeout -->|否| CollectSources[收集所有來源翻譯]

    CollectSources --> ConsistencyCheck[一致性檢查<br/>checkTranslationConsistency]
    ConsistencyCheck --> CheckResult{翻譯一致?}

    CheckResult -->|一致| SetCompleted[status: completed<br/>使用最佳翻譯]
    CheckResult -->|不一致| SetManualReview[status: manual_review<br/>標記需人工檢查]
    CheckResult -->|API 錯誤| UseError

    SetCompleted --> UpdateTranslation[更新翻譯結果]
    SetManualReview --> UpdateTranslation
    UseError --> UpdateTranslation

    UpdateTranslation --> UpdateProgress[更新進度百分比]
    UpdateProgress --> LogProgress[記錄進度日誌]
    LogProgress --> MoreLanguages{還有語言?}

    MoreLanguages -->|是| LanguageLoop
    MoreLanguages -->|否| POIComplete[POI 翻譯完成]

    POIComplete --> UpdateFinalStatus[更新 POI 最終狀態]
    UpdateFinalStatus --> MorePOIs{還有 POI?}
    MorePOIs -->|是| TranslationLoop
    MorePOIs -->|否| AllComplete[所有翻譯完成]

    AllComplete --> AutoSave[自動儲存至<br/>localStorage]
    AutoSave --> ViewResults

    %% Translation Results View Flow
    ViewResults --> ApplyFilters[套用篩選器<br/>status/language/country]
    ApplyFilters --> DisplayTable[顯示翻譯結果表格]
    DisplayTable --> UserAction{用戶操作}

    UserAction -->|查看詳情| OpenModal[開啟翻譯詳情 Modal]
    UserAction -->|編輯翻譯| EditMode[進入編輯模式]
    UserAction -->|刪除 POI| DeletePOI[刪除 POI<br/>呼叫 DELETE API]
    UserAction -->|匯出資料| ExportData[匯出為 CSV/JSON/Excel]
    UserAction -->|查看來源| ViewSources[查看 4 個來源翻譯]

    OpenModal --> ShowSources[顯示所有來源<br/>SERP/Google Maps/<br/>Perplexity/OpenAI]
    ShowSources --> ViewReasoning[查看推理說明]
    ViewReasoning --> ViewScreenshot{需要截圖?}
    ViewScreenshot -->|是| FetchScreenshot[呼叫 /api/serp-screenshot<br/>獲取 SERP 截圖]
    ViewScreenshot -->|否| ModalAction{Modal 操作}
    FetchScreenshot --> DisplayScreenshot[顯示截圖]
    DisplayScreenshot --> ModalAction

    ModalAction -->|切換編輯| EditMode
    ModalAction -->|關閉| ViewResults

    EditMode --> EditText[編輯翻譯文字]
    EditText --> SaveEdit[儲存編輯]
    SaveEdit --> UpdateState[更新狀態]
    UpdateState --> SaveLocalStorage

    DeletePOI --> ConfirmDelete{確認刪除?}
    ConfirmDelete -->|是| RemoveFromState[從狀態移除]
    ConfirmDelete -->|否| ViewResults
    RemoveFromState --> SaveLocalStorage

    ExportData --> GenerateFile[生成匯出檔案]
    GenerateFile --> DownloadFile[下載檔案]
    DownloadFile --> ViewResults

    %% Manual Check Flow
    ManualCheck --> LoadTasks[載入需人工檢查任務<br/>status: manual_review]
    LoadTasks --> ApplyTaskFilters[套用篩選器<br/>語言/排序]
    ApplyTaskFilters --> ShowTask[顯示當前任務]
    ShowTask --> TaskDetails[顯示任務詳情<br/>翻譯差異/相似度]
    TaskDetails --> TaskAction{任務操作}

    TaskAction -->|查看來源| ViewTaskSources[查看所有來源翻譯]
    TaskAction -->|選擇翻譯| SelectTranslation[選擇最佳翻譯]
    TaskAction -->|手動輸入| ManualInput[手動輸入翻譯]
    TaskAction -->|標記完成| MarkComplete[標記任務完成]
    TaskAction -->|跳過| SkipTask[跳過至下一個]

    ViewTaskSources --> FetchTaskScreenshot[獲取 SERP 截圖]
    FetchTaskScreenshot --> TaskAction

    SelectTranslation --> UpdateTaskStatus[更新任務狀態]
    ManualInput --> UpdateTaskStatus
    MarkComplete --> UpdateTaskStatus

    UpdateTaskStatus --> SaveLocalStorage
    SkipTask --> NextTask{還有任務?}
    UpdateTaskStatus --> NextTask

    NextTask -->|是| ShowTask
    NextTask -->|否| TasksComplete[所有任務完成]
    TasksComplete --> ViewResults

    %% Real-time Updates
    SaveLocalStorage -.->|自動更新| Dashboard

    %% Auto-refresh for processing POIs
    TranslationLoop -.->|每 2 秒刷新| Dashboard

    style Start fill:#e1f5e1
    style AllComplete fill:#e1f5e1
    style TasksComplete fill:#e1f5e1
    style SetManualReview fill:#ffe1e1
    style UseError fill:#ffe1e1
    style ShowError fill:#ffe1e1
    style TranslationLoop fill:#e1e5ff
    style APIRequest fill:#fff4e1
    style ConsistencyCheck fill:#f0e1ff
```

## Common Development Tasks

### Adding a New Language
1. Add language mapping to `SERP_LOCALIZATION_CONFIG` in `app/api/serp-real/route.ts`
2. Add to `LANGUAGE_MAPPINGS` in `app/api/translation-sources/route.ts`
3. Update mock translation dictionary in `generateMockTranslation()` if needed
4. Add language to the `languages` array in `processTranslationsSequentially()` in `app/page.tsx:770`

### Modifying UI Components
- UI components are in `components/ui/`
- Follow Radix UI component API patterns
- Use Tailwind classes with `cn()` utility for dynamic styles
- Maintain consistent variant structure using `cva`

### Working with API Routes
- All routes are in `app/api/` following Next.js 14 App Router conventions
- Use `NextRequest` and `NextResponse` types
- Implement proper error handling with try-catch
- Log important operations for debugging
- Add timeout configuration to `vercel.json` for long-running operations

### Database Schema Changes
Currently, database operations are mocked. When integrating with Supabase:
- Run `cleanup-database.sql` to reset database
- Create schema SQL file following Supabase conventions
- Update API routes to use actual Supabase client
- Implement proper RLS (Row Level Security) policies
