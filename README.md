# Taskflow (laskflow)

A minimal, local-first task manager for solo developers. Inspired by Linear, powered by Claude.

## Tech Stack

- **Framework:** Next.js 16 (App Router, RSC + HydrationBoundary)
- **UI:** React 19, Tailwind CSS (light theme, teal accent)
- **Database:** Prisma 7 + SQLite
- **State:** TanStack Query v5 (server state), Zustand (UI state)
- **Testing:** Vitest (unit), Playwright (E2E)

## Features

### Issue Management

- **CRUD** -- Issue の作成・編集・削除。Project に紐付き、`{prefix}-{counter}` 形式の identifier を自動採番
- **Status workflow** -- backlog / todo / in_progress / in_review / done / cancelled の 6 状態。一覧でワンクリック遷移
- **Priority** -- urgent / high / medium / low / none の 5 段階
- **Detail slideover** -- Issue 行クリックで右側パネルを展開。URL に `?selected=<id>` を反映し、リロードで復元
- **Inline title edit** -- スライドオーバー内でタイトルを直接編集（blur で保存）
- **Description editor** -- MDXEditor による Markdown 編集（`next/dynamic` で SSR 無効の遅延読込）
- **Subtasks** -- 親 Issue に子タスクを追加。チェックボックスで done/todo を切り替え。一覧では `done/total` バッジを表示
- **Meta sidebar** -- Status, Priority, Project, Cycle, Due, Created をインライン編集
- **Drag & drop reordering** -- @dnd-kit による同一ステータス内の並び替え。楽観的更新 + fractional-indexing でサーバー永続化
- **Filter & sort bar** -- Status, Project, Cycle, Initiative, Sort の各フィルタ。URL 検索パラメータで状態管理しリロード後も維持

### Command Palette

- **Cmd+K / Ctrl+K** でグローバル検索パレットを表示
- Issue, Project, Initiative, Cycle を横断検索
- 選択で該当ページ/スライドオーバーへ遷移
- "Create new issue" アクション

### Project Management

- **Initiative** -- 上位の戦略目標。Initiative > Project > Issue の階層
- **Project** -- Issue のグループ単位。prefix による識別子管理、issueCounter で自動採番
- **Cycle** -- 期間ベースのスプリント。startDate / endDate で期間定義

### Detail Pages

- **Initiative detail** (`/initiatives/[id]`) -- タイトル・説明・ステータス・日付を表示
- **Project detail** (`/projects/[id]`) -- 所属 Issue 一覧 + スライドオーバー連携
- **Cycle detail** (`/cycles/[id]`) -- 進捗バー（完了率 vs 経過日数で色分け: 緑/黄/赤）+ Issue 一覧

### List Pages

- **Issues** (`/issues`) -- ステータスごとにグループ化した Issue 一覧。フィルタ・D&D 対応
- **Initiatives** (`/initiatives`) -- Initiative 一覧。インライン作成
- **Projects** (`/projects`) -- Project 一覧。インライン作成
- **Cycles** (`/cycles`) -- Cycle 一覧。インライン作成

### API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/issues` | Issue 一覧（filter: status, priority, projectId, cycleId, initiativeId, sort） |
| POST | `/api/issues` | Issue 作成 |
| GET | `/api/issues/[id]` | Issue 詳細（children include） |
| PATCH | `/api/issues/[id]` | Issue 更新 |
| DELETE | `/api/issues/[id]` | Issue 削除 |
| POST | `/api/issues/[id]/move` | Issue 並び替え（beforeId / afterId） |
| GET | `/api/projects` | Project 一覧 |
| POST | `/api/projects` | Project 作成 |
| GET | `/api/projects/[id]` | Project 詳細 |
| PATCH | `/api/projects/[id]` | Project 更新 |
| DELETE | `/api/projects/[id]` | Project 削除 |
| GET | `/api/initiatives` | Initiative 一覧 |
| POST | `/api/initiatives` | Initiative 作成 |
| GET | `/api/initiatives/[id]` | Initiative 詳細 |
| PATCH | `/api/initiatives/[id]` | Initiative 更新 |
| DELETE | `/api/initiatives/[id]` | Initiative 削除 |
| GET | `/api/cycles` | Cycle 一覧 |
| POST | `/api/cycles` | Cycle 作成 |
| GET | `/api/cycles/[id]` | Cycle 詳細 |
| PATCH | `/api/cycles/[id]` | Cycle 更新 |
| DELETE | `/api/cycles/[id]` | Cycle 削除 |
| GET | `/api/search?q=` | 横断検索（issues, projects, initiatives, cycles） |

### Architecture

- **Server layer:** `src/server/db/` (Prisma CRUD) + `src/server/domain/` (business logic + Zod validation)
- **Client boundary:** ESLint `no-restricted-imports` で `src/components/**`, `src/hooks/**`, `src/stores/**` から `@/server/**` への import を禁止
- **Data fetching:** RSC で `prefetchQuery` → `HydrationBoundary` → Client Component で `useQuery`
- **Sort order:** fractional-indexing (string) で D&D 並び替えを永続化。`POST /api/issues/[id]/move` で `keyBetween` 計算

## Setup

```bash
pnpm install
pnpm exec prisma migrate deploy
pnpm migrate:sort-order   # 既存 Issue の sortOrder を採番
pnpm dev
```

## Testing

Complete [Setup](#setup) first so `data/taskflow.db` exists and migrations are applied.

### Unit tests (Vitest)

```bash
pnpm test
```

Watch mode: `pnpm test:watch`

### E2E tests (Playwright)

Install browser binaries once:

```bash
pnpm exec playwright install
```

E2E runs `e2e/global-setup.ts` to seed the database, then starts the app via `webServer` in `e2e/playwright.config.ts` and runs `e2e/*.spec.ts`.

```bash
pnpm test:e2e
```

When not in CI, Playwright reuses an existing dev server on port 3000 if one is already running.

Debug with UI mode:

```bash
pnpm exec playwright test --config=e2e/playwright.config.ts --ui
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | 開発サーバー起動 |
| `pnpm build` | プロダクションビルド |
| `pnpm test` | Vitest ユニットテスト |
| `pnpm test:e2e` | Playwright E2E テスト |
| `pnpm lint` | ESLint |
