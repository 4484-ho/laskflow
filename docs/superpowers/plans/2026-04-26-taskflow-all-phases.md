# Taskflow 全フェーズ実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Linear ライクな個人向けタスク管理アプリを、Claude Code CLI を AI Agent として統合した形で構築する。

**Architecture:** Next.js 15 App Router。ビジネスロジックは `src/lib/` に集約し（Vitest でテスト可能）、Route Handler は薄いラッパーとして機能する。AI Agent は SSE（Server-Sent Events）経由で Claude CLI サブプロセスと通信する。

**Tech Stack:** Next.js 15, TypeScript (strict), Tailwind CSS v4, Prisma 5 + SQLite, Zustand, Lucide React, Vitest, Playwright

---

> **フェーズ方針:** Phase 1 は即実装可能な状態で詳細化済み。Phase 2〜4 は各フェーズ開始前にブレストセッションを行い、そこで詳細な実装計画を別途作成する。

---

## Phase 1: 基盤 MVP

**完了の定義:** ブラウザで Issue の作成・一覧表示（ステータス別グループ）・ステータス変更ができる状態。Initiative / Project / Cycle の一覧・作成も動作する。

### ファイルマップ（Phase 1 で作成するファイル）

```
.gitignore
prisma/schema.prisma
vitest.config.ts
src/
  types/index.ts
  lib/
    prisma.ts
    issues.ts          + issues.test.ts
    projects.ts        + projects.test.ts
    initiatives.ts     + initiatives.test.ts
    cycles.ts          + cycles.test.ts
  app/
    layout.tsx
    page.tsx
    issues/page.tsx
    initiatives/page.tsx
    projects/page.tsx
    cycles/page.tsx
    api/
      issues/route.ts
      issues/[id]/route.ts
      projects/route.ts
      projects/[id]/route.ts
      initiatives/route.ts
      initiatives/[id]/route.ts
      cycles/route.ts
      cycles/[id]/route.ts
  components/
    layout/
      Sidebar.tsx
      Topbar.tsx
    issues/
      IssueList.tsx
      IssueRow.tsx
      CreateIssueModal.tsx
    initiatives/InitiativeList.tsx
    projects/ProjectList.tsx
    cycles/CycleList.tsx
  stores/
    issueStore.ts
    uiStore.ts
data/                  # .gitignore で除外
docs/adr/
  0001-tech-stack.md
  0002-ai-agent-sse-over-websocket.md
  0003-sqlite-for-personal-use.md
```

---

### Task 1: プロジェクトセットアップ

**Files:**
- Create: `.gitignore`
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts 追加)

- [ ] **Step 1: create-next-app を実行**

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --yes
```

既存ファイル（`README.md`, `LICENSE`, `docs/`）との競合を確認し、上書きを選択。

- [ ] **Step 2: Tailwind v4 を確認・インストール**

```bash
npm list tailwindcss
```

v3 が入っている場合は v4 に更新:

```bash
npm install tailwindcss@latest @tailwindcss/postcss
```

`postcss.config.mjs` を以下に置き換え:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}
export default config
```

`src/app/globals.css` の先頭を以下に置き換え（v3 のディレクティブを削除）:

```css
@import "tailwindcss";

@layer base {
  :root {
    color-scheme: dark;
  }
  body {
    @apply bg-neutral-950 text-neutral-100;
  }
}
```

- [ ] **Step 3: 追加の依存パッケージをインストール**

```bash
npm install @prisma/client zustand lucide-react
npm install -D prisma vitest @vitejs/plugin-react jsdom
```

- [ ] **Step 4: Vitest を設定**

`vitest.config.ts` を作成:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    clearMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

`package.json` の `scripts` に追加:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

`tsconfig.json` の `compilerOptions` に確認（create-next-app が生成しているはずだが念のため）:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

- [ ] **Step 5: .gitignore を作成**

`.gitignore` に以下を追加（create-next-app が生成したものに追記）:

```gitignore
# SQLite
data/
*.db
*.db-journal

# Env
.env.local
.env.*.local

# Playwright
playwright-report/
test-results/
```

- [ ] **Step 6: Vitest が動くことを確認**

```bash
npm test
```

Expected: "No test files found" と表示されてパス（エラーなし）

- [ ] **Step 7: コミット**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 project with Vitest and Tailwind v4"
```

---

### Task 2: ADR ドキュメント作成

**Files:**
- Create: `docs/adr/0001-tech-stack.md`
- Create: `docs/adr/0002-ai-agent-sse-over-websocket.md`
- Create: `docs/adr/0003-sqlite-for-personal-use.md`

- [ ] **Step 1: `docs/adr/0001-tech-stack.md` を作成**

```markdown
# ADR 0001: 技術スタック選定

**日付:** 2026-04-26
**ステータス:** 採用

## 背景

個人開発向けタスク管理アプリ「Taskflow」を構築する。
ポートフォリオとして公開することも念頭に置く。

## 決定

| カテゴリ | 採用技術 | 理由 |
|---|---|---|
| フレームワーク | Next.js 15 (App Router) | フルスタック。Server Components で初期表示高速化 |
| 言語 | TypeScript (strict) | 型安全性。個人開発でも品質を担保 |
| DB | SQLite via Prisma | 個人利用。セットアップ不要。ファイル1つで完結 |
| スタイリング | Tailwind CSS v4 | ユーティリティファースト。Linear ライクなダーク UI |
| 状態管理 | Zustand | 軽量。ボイラープレートが少ない |
| アイコン | Lucide React | Linear と同系統のデザイン |
| ユニットテスト | Vitest | Vite 互換。Next.js との親和性が高い |
| E2E テスト | Playwright | Phase 2 で導入 |

## 結果

シンプルな構成でありながら、型安全・テスト可能・ポートフォリオに適した品質が担保できる。
```

- [ ] **Step 2: `docs/adr/0002-ai-agent-sse-over-websocket.md` を作成**

```markdown
# ADR 0002: AI Agent 通信に SSE を採用

**日付:** 2026-04-26
**ステータス:** 採用

## 背景

仕様書では `/api/agent/ws` として WebSocket を想定していたが、
Next.js 15 App Router は WebSocket をネイティブサポートしない。

## 選択肢

| 方式 | 評価 |
|---|---|
| WebSocket（カスタムサーバー） | `server.js` が必要。`next start` が使えなくなる |
| SSE（Server-Sent Events） | Route Handler で標準サポート。カスタムサーバー不要 |
| ポーリング | シンプルだがリアルタイム性に欠ける |

## 決定

**SSE を採用。**

- サーバー → クライアントのストリーミングは SSE で実現
- クライアント → サーバーは通常の HTTP POST

## 結果

Route Handler 内で `ReadableStream` を返すだけで実装できる。
Claude CLI の `stream-json` 出力をそのまま SSE イベントとして中継できる。
```

- [ ] **Step 3: `docs/adr/0003-sqlite-for-personal-use.md` を作成**

```markdown
# ADR 0003: データストアに SQLite を採用

**日付:** 2026-04-26
**ステータス:** 採用

## 背景

個人利用・localhost 前提のアプリのため、外部 DB サーバーは不要。

## 決定

SQLite（`data/taskflow.db`）+ Prisma ORM を採用。

- セットアップ不要（ファイルベース）
- Prisma による型安全な操作とマイグレーション管理
- `data/` ディレクトリは `.gitignore` で除外

## 将来

クラウドデプロイが必要になった場合は Turso（libSQL）への移行を検討。
Prisma スキーマはそのまま活用できる。
```

- [ ] **Step 4: コミット**

```bash
git add docs/adr/
git commit -m "docs: add ADR 0001-0003 for tech stack decisions"
```

---

### Task 3: Prisma スキーマ + マイグレーション

**Files:**
- Create: `prisma/schema.prisma`
- Create: `data/` ディレクトリ（自動生成）

- [ ] **Step 1: `prisma/schema.prisma` を作成**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:../data/taskflow.db"
}

model Initiative {
  id          String    @id @default(cuid())
  title       String
  description String?
  status      String    @default("active")
  color       String?
  startDate   DateTime?
  targetDate  DateTime?
  projects    Project[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Project {
  id           String      @id @default(cuid())
  title        String
  description  String?
  prefix       String      @unique
  color        String?
  status       String      @default("active")
  issueCounter Int         @default(0)
  initiative   Initiative? @relation(fields: [initiativeId], references: [id])
  initiativeId String?
  issues       Issue[]
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}

model Issue {
  id          String    @id @default(cuid())
  identifier  String    @unique
  title       String
  description String?
  status      String    @default("backlog")
  priority    String    @default("none")
  project     Project   @relation(fields: [projectId], references: [id])
  projectId   String
  cycle       Cycle?    @relation(fields: [cycleId], references: [id])
  cycleId     String?
  parent      Issue?    @relation("SubTasks", fields: [parentId], references: [id])
  parentId    String?
  children    Issue[]   @relation("SubTasks")
  labels      String    @default("[]")
  dueDate     DateTime?
  estimate    Float?
  sortOrder   Float     @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Cycle {
  id          String   @id @default(cuid())
  title       String
  description String?
  status      String   @default("upcoming")
  startDate   DateTime
  endDate     DateTime
  issues      Issue[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

- [ ] **Step 2: `data/` ディレクトリを作成して `.gitkeep` を配置**

```bash
mkdir -p data
touch data/.gitkeep
```

`.gitignore` に以下が含まれていることを確認（Task 1 で追加済み）:
```
data/
*.db
```

ただし `.gitkeep` はコミットしたい場合は `.gitignore` に例外を追加:
```gitignore
!data/.gitkeep
```

- [ ] **Step 3: マイグレーション実行**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Expected: `data/taskflow.db` が生成され、`prisma/migrations/` にマイグレーションファイルが作成される。

- [ ] **Step 4: コミット**

```bash
git add prisma/ data/.gitkeep .gitignore
git commit -m "feat: add Prisma schema and initial migration"
```

---

### Task 4: 共有型定義 + Prisma シングルトン

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/prisma.ts`

- [ ] **Step 1: `src/types/index.ts` を作成**

```ts
export type IssueStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'done'
  | 'cancelled'

export type IssuePriority = 'urgent' | 'high' | 'medium' | 'low' | 'none'
export type InitiativeStatus = 'active' | 'completed' | 'archived'
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'
export type CycleStatus = 'upcoming' | 'active' | 'completed'

export interface Initiative {
  id: string
  title: string
  description: string | null
  status: InitiativeStatus
  color: string | null
  startDate: Date | null
  targetDate: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Project {
  id: string
  title: string
  description: string | null
  initiativeId: string | null
  prefix: string
  color: string | null
  status: ProjectStatus
  issueCounter: number
  createdAt: Date
  updatedAt: Date
}

export interface Issue {
  id: string
  identifier: string
  title: string
  description: string | null
  status: IssueStatus
  priority: IssuePriority
  projectId: string
  cycleId: string | null
  parentId: string | null
  labels: string[]
  dueDate: Date | null
  estimate: number | null
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface Cycle {
  id: string
  title: string
  description: string | null
  status: CycleStatus
  startDate: Date
  endDate: Date
  createdAt: Date
  updatedAt: Date
}

// API 入力型
export interface CreateIssueInput {
  title: string
  description?: string
  projectId: string
  status?: IssueStatus
  priority?: IssuePriority
  cycleId?: string
  parentId?: string
  labels?: string[]
  dueDate?: string
  estimate?: number
}

export interface UpdateIssueInput {
  title?: string
  description?: string
  status?: IssueStatus
  priority?: IssuePriority
  cycleId?: string | null
  parentId?: string | null
  labels?: string[]
  dueDate?: string | null
  estimate?: number | null
  sortOrder?: number
}

export interface CreateProjectInput {
  title: string
  description?: string
  prefix: string
  color?: string
  initiativeId?: string
}

export interface CreateInitiativeInput {
  title: string
  description?: string
  color?: string
  startDate?: string
  targetDate?: string
}

export interface CreateCycleInput {
  title: string
  description?: string
  startDate: string
  endDate: string
}
```

- [ ] **Step 2: `src/lib/prisma.ts` を作成**

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 3: コミット**

```bash
git add src/types/ src/lib/prisma.ts
git commit -m "feat: add shared types and Prisma singleton"
```

---

### Task 5: Issues ライブラリ（TDD）

**Files:**
- Create: `src/lib/issues.ts`
- Create: `src/lib/issues.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/issues.test.ts`:

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    issue: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
    project: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '@/lib/prisma'
import { getIssues, getIssue, createIssue, updateIssue, deleteIssue } from '@/lib/issues'

const rawIssue = {
  id: 'issue-1',
  identifier: 'FE-1',
  title: 'Test issue',
  description: null,
  status: 'backlog',
  priority: 'none',
  projectId: 'proj-1',
  cycleId: null,
  parentId: null,
  labels: '["bug"]',
  dueDate: null,
  estimate: null,
  sortOrder: 0,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getIssues', () => {
  it('returns parsed issues with labels as array', async () => {
    vi.mocked(prisma.issue.findMany).mockResolvedValue([rawIssue] as any)

    const result = await getIssues()

    expect(result).toHaveLength(1)
    expect(result[0].labels).toEqual(['bug'])
  })

  it('filters by status', async () => {
    vi.mocked(prisma.issue.findMany).mockResolvedValue([])

    await getIssues({ status: 'done' })

    expect(vi.mocked(prisma.issue.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'done' }),
      }),
    )
  })
})

describe('getIssue', () => {
  it('returns null when not found', async () => {
    vi.mocked(prisma.issue.findUnique).mockResolvedValue(null)

    const result = await getIssue('nonexistent')

    expect(result).toBeNull()
  })

  it('returns parsed issue when found', async () => {
    vi.mocked(prisma.issue.findUnique).mockResolvedValue(rawIssue as any)

    const result = await getIssue('issue-1')

    expect(result?.identifier).toBe('FE-1')
    expect(result?.labels).toEqual(['bug'])
  })
})

describe('createIssue', () => {
  it('auto-generates identifier from project prefix and counter', async () => {
    const mockProject = { id: 'proj-1', prefix: 'FE', issueCounter: 3 }
    const mockCreated = { ...rawIssue, identifier: 'FE-3', labels: '[]' }

    vi.mocked(prisma.project.update).mockResolvedValue(mockProject as any)
    vi.mocked(prisma.issue.create).mockResolvedValue(mockCreated as any)
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(prisma))

    const result = await createIssue({ title: 'New issue', projectId: 'proj-1' })

    expect(result.identifier).toBe('FE-3')
    expect(vi.mocked(prisma.project.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { issueCounter: { increment: 1 } },
      }),
    )
  })
})

describe('updateIssue', () => {
  it('updates and returns parsed issue', async () => {
    const updated = { ...rawIssue, status: 'done', labels: '[]' }
    vi.mocked(prisma.issue.update).mockResolvedValue(updated as any)

    const result = await updateIssue('issue-1', { status: 'done' })

    expect(result.status).toBe('done')
  })
})

describe('deleteIssue', () => {
  it('calls prisma.issue.delete with correct id', async () => {
    vi.mocked(prisma.issue.delete).mockResolvedValue(rawIssue as any)

    await deleteIssue('issue-1')

    expect(vi.mocked(prisma.issue.delete)).toHaveBeenCalledWith({ where: { id: 'issue-1' } })
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npm test src/lib/issues.test.ts
```

Expected: `Cannot find module '@/lib/issues'`

- [ ] **Step 3: `src/lib/issues.ts` を実装**

```ts
import { prisma } from '@/lib/prisma'
import type { Issue, IssueStatus, IssuePriority, CreateIssueInput, UpdateIssueInput } from '@/types'

interface GetIssuesParams {
  status?: IssueStatus
  priority?: IssuePriority
  projectId?: string
  cycleId?: string
}

function parseIssue(raw: any): Issue {
  return {
    ...raw,
    labels: JSON.parse(raw.labels ?? '[]') as string[],
  }
}

export async function getIssues(params: GetIssuesParams = {}): Promise<Issue[]> {
  const where: Record<string, unknown> = {}
  if (params.status) where.status = params.status
  if (params.priority) where.priority = params.priority
  if (params.projectId) where.projectId = params.projectId
  if (params.cycleId) where.cycleId = params.cycleId

  const issues = await prisma.issue.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  })
  return issues.map(parseIssue)
}

export async function getIssue(id: string): Promise<Issue | null> {
  const issue = await prisma.issue.findUnique({ where: { id } })
  return issue ? parseIssue(issue) : null
}

export async function createIssue(data: CreateIssueInput): Promise<Issue> {
  const issue = await prisma.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id: data.projectId },
      data: { issueCounter: { increment: 1 } },
    })
    return tx.issue.create({
      data: {
        identifier: `${project.prefix}-${project.issueCounter}`,
        title: data.title,
        description: data.description ?? null,
        status: data.status ?? 'backlog',
        priority: data.priority ?? 'none',
        projectId: data.projectId,
        cycleId: data.cycleId ?? null,
        parentId: data.parentId ?? null,
        labels: JSON.stringify(data.labels ?? []),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        estimate: data.estimate ?? null,
        sortOrder: Date.now(),
      },
    })
  })
  return parseIssue(issue)
}

export async function updateIssue(id: string, data: UpdateIssueInput): Promise<Issue> {
  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.status !== undefined) updateData.status = data.status
  if (data.priority !== undefined) updateData.priority = data.priority
  if (data.cycleId !== undefined) updateData.cycleId = data.cycleId
  if (data.parentId !== undefined) updateData.parentId = data.parentId
  if (data.labels !== undefined) updateData.labels = JSON.stringify(data.labels)
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null
  if (data.estimate !== undefined) updateData.estimate = data.estimate
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

  const issue = await prisma.issue.update({ where: { id }, data: updateData })
  return parseIssue(issue)
}

export async function deleteIssue(id: string): Promise<void> {
  await prisma.issue.delete({ where: { id } })
}
```

- [ ] **Step 4: テストがパスすることを確認**

```bash
npm test src/lib/issues.test.ts
```

Expected: 全テストがパス（PASS）

- [ ] **Step 5: コミット**

```bash
git add src/lib/issues.ts src/lib/issues.test.ts
git commit -m "feat: add issues lib with CRUD functions (TDD)"
```

---

### Task 6: Projects / Initiatives / Cycles ライブラリ（TDD）

**Files:**
- Create: `src/lib/projects.ts` + `src/lib/projects.test.ts`
- Create: `src/lib/initiatives.ts` + `src/lib/initiatives.test.ts`
- Create: `src/lib/cycles.ts` + `src/lib/cycles.test.ts`

Issues と同様のパターン。各ライブラリに `get*`, `create*`, `update*`, `delete*` を実装する。

- [ ] **Step 1: `src/lib/projects.test.ts` を作成**

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { getProjects, createProject, updateProject, deleteProject } from '@/lib/projects'

const rawProject = {
  id: 'proj-1',
  title: 'Frontend',
  description: null,
  prefix: 'FE',
  color: null,
  status: 'active',
  issueCounter: 0,
  initiativeId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

beforeEach(() => vi.clearAllMocks())

describe('getProjects', () => {
  it('returns projects ordered by createdAt', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([rawProject] as any)
    const result = await getProjects()
    expect(result).toHaveLength(1)
    expect(result[0].prefix).toBe('FE')
  })
})

describe('createProject', () => {
  it('creates a project with the given data', async () => {
    vi.mocked(prisma.project.create).mockResolvedValue(rawProject as any)
    const result = await createProject({ title: 'Frontend', prefix: 'FE' })
    expect(result.prefix).toBe('FE')
  })
})

describe('deleteProject', () => {
  it('calls prisma.project.delete with correct id', async () => {
    vi.mocked(prisma.project.delete).mockResolvedValue(rawProject as any)
    await deleteProject('proj-1')
    expect(vi.mocked(prisma.project.delete)).toHaveBeenCalledWith({ where: { id: 'proj-1' } })
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npm test src/lib/projects.test.ts
```

Expected: `Cannot find module '@/lib/projects'`

- [ ] **Step 3: `src/lib/projects.ts` を実装**

```ts
import { prisma } from '@/lib/prisma'
import type { Project, ProjectStatus, CreateProjectInput } from '@/types'

interface UpdateProjectInput {
  title?: string
  description?: string
  color?: string
  status?: ProjectStatus
  initiativeId?: string | null
}

export async function getProjects(): Promise<Project[]> {
  return prisma.project.findMany({ orderBy: { createdAt: 'asc' } }) as Promise<Project[]>
}

export async function getProject(id: string): Promise<Project | null> {
  return prisma.project.findUnique({ where: { id } }) as Promise<Project | null>
}

export async function createProject(data: CreateProjectInput): Promise<Project> {
  return prisma.project.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      prefix: data.prefix.toUpperCase(),
      color: data.color ?? null,
      initiativeId: data.initiativeId ?? null,
    },
  }) as Promise<Project>
}

export async function updateProject(id: string, data: UpdateProjectInput): Promise<Project> {
  return prisma.project.update({ where: { id }, data }) as Promise<Project>
}

export async function deleteProject(id: string): Promise<void> {
  await prisma.project.delete({ where: { id } })
}
```

- [ ] **Step 4: `src/lib/initiatives.test.ts` を作成**

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    initiative: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { getInitiatives, createInitiative, deleteInitiative } from '@/lib/initiatives'

const rawInitiative = {
  id: 'init-1',
  title: 'Q3 Release',
  description: null,
  status: 'active',
  color: null,
  startDate: null,
  targetDate: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

beforeEach(() => vi.clearAllMocks())

describe('getInitiatives', () => {
  it('returns initiatives', async () => {
    vi.mocked(prisma.initiative.findMany).mockResolvedValue([rawInitiative] as any)
    const result = await getInitiatives()
    expect(result[0].title).toBe('Q3 Release')
  })
})

describe('createInitiative', () => {
  it('creates an initiative', async () => {
    vi.mocked(prisma.initiative.create).mockResolvedValue(rawInitiative as any)
    const result = await createInitiative({ title: 'Q3 Release' })
    expect(result.id).toBe('init-1')
  })
})
```

- [ ] **Step 5: `src/lib/initiatives.ts` を実装**

```ts
import { prisma } from '@/lib/prisma'
import type { Initiative, InitiativeStatus, CreateInitiativeInput } from '@/types'

interface UpdateInitiativeInput {
  title?: string
  description?: string
  status?: InitiativeStatus
  color?: string
  startDate?: string | null
  targetDate?: string | null
}

export async function getInitiatives(): Promise<Initiative[]> {
  return prisma.initiative.findMany({ orderBy: { createdAt: 'asc' } }) as Promise<Initiative[]>
}

export async function getInitiative(id: string): Promise<Initiative | null> {
  return prisma.initiative.findUnique({ where: { id } }) as Promise<Initiative | null>
}

export async function createInitiative(data: CreateInitiativeInput): Promise<Initiative> {
  return prisma.initiative.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      color: data.color ?? null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
    },
  }) as Promise<Initiative>
}

export async function updateInitiative(id: string, data: UpdateInitiativeInput): Promise<Initiative> {
  const updateData: Record<string, unknown> = { ...data }
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null
  if (data.targetDate !== undefined) updateData.targetDate = data.targetDate ? new Date(data.targetDate) : null
  return prisma.initiative.update({ where: { id }, data: updateData }) as Promise<Initiative>
}

export async function deleteInitiative(id: string): Promise<void> {
  await prisma.initiative.delete({ where: { id } })
}
```

- [ ] **Step 6: `src/lib/cycles.test.ts` と `src/lib/cycles.ts` を作成**

`src/lib/cycles.test.ts`:

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    cycle: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { getCycles, createCycle } from '@/lib/cycles'

const rawCycle = {
  id: 'cycle-1',
  title: 'Sprint 2026-W17',
  description: null,
  status: 'active',
  startDate: new Date('2026-04-21'),
  endDate: new Date('2026-04-27'),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

beforeEach(() => vi.clearAllMocks())

describe('getCycles', () => {
  it('returns cycles ordered by startDate', async () => {
    vi.mocked(prisma.cycle.findMany).mockResolvedValue([rawCycle] as any)
    const result = await getCycles()
    expect(result[0].title).toBe('Sprint 2026-W17')
  })
})

describe('createCycle', () => {
  it('creates a cycle with startDate and endDate', async () => {
    vi.mocked(prisma.cycle.create).mockResolvedValue(rawCycle as any)
    const result = await createCycle({
      title: 'Sprint 2026-W17',
      startDate: '2026-04-21',
      endDate: '2026-04-27',
    })
    expect(result.id).toBe('cycle-1')
  })
})
```

`src/lib/cycles.ts`:

```ts
import { prisma } from '@/lib/prisma'
import type { Cycle, CycleStatus, CreateCycleInput } from '@/types'

interface UpdateCycleInput {
  title?: string
  description?: string
  status?: CycleStatus
  startDate?: string
  endDate?: string
}

export async function getCycles(): Promise<Cycle[]> {
  return prisma.cycle.findMany({ orderBy: { startDate: 'desc' } }) as Promise<Cycle[]>
}

export async function getCycle(id: string): Promise<Cycle | null> {
  return prisma.cycle.findUnique({ where: { id } }) as Promise<Cycle | null>
}

export async function createCycle(data: CreateCycleInput): Promise<Cycle> {
  return prisma.cycle.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    },
  }) as Promise<Cycle>
}

export async function updateCycle(id: string, data: UpdateCycleInput): Promise<Cycle> {
  const updateData: Record<string, unknown> = { ...data }
  if (data.startDate) updateData.startDate = new Date(data.startDate)
  if (data.endDate) updateData.endDate = new Date(data.endDate)
  return prisma.cycle.update({ where: { id }, data: updateData }) as Promise<Cycle>
}

export async function deleteCycle(id: string): Promise<void> {
  await prisma.cycle.delete({ where: { id } })
}
```

- [ ] **Step 7: 全テストが通ることを確認**

```bash
npm test
```

Expected: 全テストがパス

- [ ] **Step 8: コミット**

```bash
git add src/lib/
git commit -m "feat: add projects, initiatives, cycles libs with TDD"
```

---

### Task 7: API Route Handlers（全エンティティ）

**Files:**
- Create: `src/app/api/issues/route.ts`
- Create: `src/app/api/issues/[id]/route.ts`
- Create: `src/app/api/projects/route.ts`
- Create: `src/app/api/projects/[id]/route.ts`
- Create: `src/app/api/initiatives/route.ts`
- Create: `src/app/api/initiatives/[id]/route.ts`
- Create: `src/app/api/cycles/route.ts`
- Create: `src/app/api/cycles/[id]/route.ts`

Route Handler は lib 関数の薄いラッパー。エラーハンドリングは共通パターンで実装する。

- [ ] **Step 1: Issues Route Handlers を作成**

`src/app/api/issues/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getIssues, createIssue } from '@/lib/issues'
import type { IssueStatus, IssuePriority } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  try {
    const issues = await getIssues({
      status: (searchParams.get('status') as IssueStatus) ?? undefined,
      priority: (searchParams.get('priority') as IssuePriority) ?? undefined,
      projectId: searchParams.get('projectId') ?? undefined,
      cycleId: searchParams.get('cycleId') ?? undefined,
    })
    return NextResponse.json(issues)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const issue = await createIssue(body)
    return NextResponse.json(issue, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 })
  }
}
```

`src/app/api/issues/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { updateIssue, deleteIssue } from '@/lib/issues'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const body = await request.json()
    const issue = await updateIssue(id, body)
    return NextResponse.json(issue)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    await deleteIssue(id)
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete issue' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Projects / Initiatives / Cycles Route Handlers を作成**

`src/app/api/projects/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getProjects, createProject } from '@/lib/projects'

export async function GET() {
  try {
    return NextResponse.json(await getProjects())
  } catch {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const project = await createProject(body)
    return NextResponse.json(project, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
```

`src/app/api/projects/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { updateProject, deleteProject } from '@/lib/projects'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    return NextResponse.json(await updateProject(id, await request.json()))
  } catch {
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    await deleteProject(id)
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
```

Initiatives / Cycles も同じパターンで作成（`getInitiatives`/`createInitiative` などを import）。

`src/app/api/initiatives/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getInitiatives, createInitiative } from '@/lib/initiatives'

export async function GET() {
  try { return NextResponse.json(await getInitiatives()) }
  catch { return NextResponse.json({ error: 'Failed to fetch initiatives' }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(await createInitiative(await request.json()), { status: 201 })
  } catch { return NextResponse.json({ error: 'Failed to create initiative' }, { status: 500 }) }
}
```

`src/app/api/initiatives/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { updateInitiative, deleteInitiative } from '@/lib/initiatives'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try { return NextResponse.json(await updateInitiative(id, await request.json())) }
  catch { return NextResponse.json({ error: 'Failed to update initiative' }, { status: 500 }) }
}
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try { await deleteInitiative(id); return new NextResponse(null, { status: 204 }) }
  catch { return NextResponse.json({ error: 'Failed to delete initiative' }, { status: 500 }) }
}
```

`src/app/api/cycles/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getCycles, createCycle } from '@/lib/cycles'

export async function GET() {
  try { return NextResponse.json(await getCycles()) }
  catch { return NextResponse.json({ error: 'Failed to fetch cycles' }, { status: 500 }) }
}
export async function POST(request: NextRequest) {
  try { return NextResponse.json(await createCycle(await request.json()), { status: 201 }) }
  catch { return NextResponse.json({ error: 'Failed to create cycle' }, { status: 500 }) }
}
```

`src/app/api/cycles/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { updateCycle, deleteCycle } from '@/lib/cycles'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try { return NextResponse.json(await updateCycle(id, await request.json())) }
  catch { return NextResponse.json({ error: 'Failed to update cycle' }, { status: 500 }) }
}
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try { await deleteCycle(id); return new NextResponse(null, { status: 204 }) }
  catch { return NextResponse.json({ error: 'Failed to delete cycle' }, { status: 500 }) }
}
```

- [ ] **Step 3: 開発サーバーで動作確認**

```bash
npm run dev
```

別ターミナルで:
```bash
# Project を作成（Issues 作成の前提）
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"title":"Frontend","prefix":"FE"}'

# Issue を作成
curl -X POST http://localhost:3000/api/issues \
  -H "Content-Type: application/json" \
  -d '{"title":"First issue","projectId":"<上記で返ったID>"}'

# Issues を取得
curl http://localhost:3000/api/issues
```

Expected: Issue が `{"identifier":"FE-1",...}` として返る

- [ ] **Step 4: コミット**

```bash
git add src/app/api/
git commit -m "feat: add REST API route handlers for all entities"
```

---

### Task 8: レイアウトシェル（Sidebar + Topbar）

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/Topbar.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: `src/components/layout/Sidebar.tsx` を作成**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CircleDot, Flag, FolderOpen, RefreshCw, Bot } from 'lucide-react'

const nav = [
  { href: '/issues', label: 'Issues', icon: CircleDot },
  { href: '/initiatives', label: 'Initiatives', icon: Flag },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/cycles', label: 'Cycles', icon: RefreshCw },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 h-screen flex flex-col border-r border-neutral-800 bg-neutral-950 shrink-0">
      <div className="px-4 py-3 border-b border-neutral-800">
        <span className="font-semibold text-sm text-white">Taskflow</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              pathname.startsWith(href)
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-2 border-t border-neutral-800">
        <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition-colors">
          <Bot size={15} />
          AI Agent
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: `src/components/layout/Topbar.tsx` を作成**

```tsx
interface TopbarProps {
  title: string
}

export function Topbar({ title }: TopbarProps) {
  return (
    <header className="h-10 border-b border-neutral-800 flex items-center px-4 shrink-0">
      <span className="text-sm text-neutral-400">{title}</span>
    </header>
  )
}
```

- [ ] **Step 3: `src/app/layout.tsx` を更新**

```tsx
import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Taskflow',
  description: 'Personal task management with Claude Code AI Agent',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="dark">
      <body className={`${geist.className} flex h-screen overflow-hidden bg-neutral-950 text-neutral-100`}>
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: `src/app/page.tsx` を `/issues` にリダイレクト**

```tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/issues')
}
```

- [ ] **Step 5: ブラウザで確認してコミット**

```bash
npm run dev
```

`http://localhost:3000` にアクセスして `/issues` にリダイレクトされることを確認。Sidebar が表示されること。

```bash
git add src/app/layout.tsx src/app/page.tsx src/components/layout/
git commit -m "feat: add layout shell with Sidebar and Topbar"
```

---

### Task 9: Zustand ストア

**Files:**
- Create: `src/stores/issueStore.ts`
- Create: `src/stores/uiStore.ts`

- [ ] **Step 1: `src/stores/issueStore.ts` を作成**

```ts
import { create } from 'zustand'
import type { Issue, CreateIssueInput, UpdateIssueInput } from '@/types'

interface IssueStore {
  issues: Issue[]
  loading: boolean
  fetchIssues: (params?: Record<string, string>) => Promise<void>
  createIssue: (data: CreateIssueInput) => Promise<Issue>
  updateIssue: (id: string, data: UpdateIssueInput) => Promise<void>
  deleteIssue: (id: string) => Promise<void>
}

export const useIssueStore = create<IssueStore>((set) => ({
  issues: [],
  loading: false,

  fetchIssues: async (params = {}) => {
    set({ loading: true })
    const query = new URLSearchParams(params).toString()
    const res = await fetch(`/api/issues${query ? `?${query}` : ''}`)
    const issues: Issue[] = await res.json()
    set({ issues, loading: false })
  },

  createIssue: async (data) => {
    const res = await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const issue: Issue = await res.json()
    set((s) => ({ issues: [...s.issues, issue] }))
    return issue
  },

  updateIssue: async (id, data) => {
    const res = await fetch(`/api/issues/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const updated: Issue = await res.json()
    set((s) => ({ issues: s.issues.map((i) => (i.id === id ? updated : i)) }))
  },

  deleteIssue: async (id) => {
    await fetch(`/api/issues/${id}`, { method: 'DELETE' })
    set((s) => ({ issues: s.issues.filter((i) => i.id !== id) }))
  },
}))
```

- [ ] **Step 2: `src/stores/uiStore.ts` を作成**

```ts
import { create } from 'zustand'

interface UiStore {
  isCreateIssueModalOpen: boolean
  openCreateIssueModal: () => void
  closeCreateIssueModal: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  isCreateIssueModalOpen: false,
  openCreateIssueModal: () => set({ isCreateIssueModalOpen: true }),
  closeCreateIssueModal: () => set({ isCreateIssueModalOpen: false }),
}))
```

- [ ] **Step 3: コミット**

```bash
git add src/stores/
git commit -m "feat: add Zustand stores for issues and UI state"
```

---

### Task 10: Issues ページ + IssueList + IssueRow

**Files:**
- Create: `src/app/issues/page.tsx`
- Create: `src/components/issues/IssueList.tsx`
- Create: `src/components/issues/IssueRow.tsx`

- [ ] **Step 1: `src/components/issues/IssueRow.tsx` を作成**

```tsx
'use client'

import { useIssueStore } from '@/stores/issueStore'
import type { Issue, IssueStatus } from '@/types'

const STATUS_ICONS: Record<IssueStatus, { icon: string; label: string; next: IssueStatus }> = {
  backlog:     { icon: '○', label: 'Backlog',      next: 'todo' },
  todo:        { icon: '◎', label: 'Todo',         next: 'in_progress' },
  in_progress: { icon: '◑', label: 'In Progress',  next: 'in_review' },
  in_review:   { icon: '◐', label: 'In Review',    next: 'done' },
  done:        { icon: '●', label: 'Done',          next: 'cancelled' },
  cancelled:   { icon: '⊘', label: 'Cancelled',    next: 'backlog' },
}

const PRIORITY_ICONS: Record<string, string> = {
  urgent: '⚡',
  high: '▲',
  medium: '■',
  low: '▽',
  none: '',
}

interface IssueRowProps {
  issue: Issue
}

export function IssueRow({ issue }: IssueRowProps) {
  const { updateIssue } = useIssueStore()
  const statusInfo = STATUS_ICONS[issue.status]

  const cycleStatus = () => {
    const next = statusInfo.next
    updateIssue(issue.id, { status: next })
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-900/50 group rounded-md">
      <button
        onClick={cycleStatus}
        title={`${statusInfo.label} → ${STATUS_ICONS[statusInfo.next].label}`}
        className="text-neutral-500 hover:text-neutral-200 transition-colors shrink-0 font-mono text-sm w-4"
      >
        {statusInfo.icon}
      </button>

      <span className="text-xs text-neutral-600 shrink-0 font-mono w-14">
        {issue.identifier}
      </span>

      <span className="flex-1 text-sm text-neutral-100 truncate">
        {issue.title}
      </span>

      {issue.priority !== 'none' && (
        <span className="text-xs text-neutral-500 shrink-0" title={issue.priority}>
          {PRIORITY_ICONS[issue.priority]}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: `src/components/issues/IssueList.tsx` を作成**

```tsx
import { IssueRow } from './IssueRow'
import type { Issue, IssueStatus } from '@/types'

const STATUS_ORDER: IssueStatus[] = [
  'in_progress', 'in_review', 'todo', 'backlog', 'done', 'cancelled',
]

const STATUS_LABELS: Record<IssueStatus, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  cancelled: 'Cancelled',
}

interface IssueListProps {
  issues: Issue[]
}

export function IssueList({ issues }: IssueListProps) {
  const grouped = STATUS_ORDER.reduce<Record<IssueStatus, Issue[]>>(
    (acc, status) => {
      acc[status] = issues.filter((i) => i.status === status)
      return acc
    },
    {} as Record<IssueStatus, Issue[]>,
  )

  return (
    <div className="flex flex-col gap-4">
      {STATUS_ORDER.map((status) => {
        const group = grouped[status]
        if (group.length === 0) return null
        return (
          <section key={status}>
            <div className="flex items-center gap-2 px-4 py-1 text-xs text-neutral-500 font-medium">
              <span>{STATUS_LABELS[status]}</span>
              <span className="text-neutral-700">{group.length}</span>
            </div>
            <div>
              {group.map((issue) => (
                <IssueRow key={issue.id} issue={issue} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: `src/app/issues/page.tsx` を作成**

```tsx
'use client'

import { useEffect } from 'react'
import { useIssueStore } from '@/stores/issueStore'
import { useUiStore } from '@/stores/uiStore'
import { IssueList } from '@/components/issues/IssueList'
import { CreateIssueModal } from '@/components/issues/CreateIssueModal'
import { Topbar } from '@/components/layout/Topbar'
import { Plus } from 'lucide-react'

export default function IssuesPage() {
  const { issues, loading, fetchIssues } = useIssueStore()
  const { openCreateIssueModal } = useUiStore()

  useEffect(() => {
    fetchIssues()
  }, [fetchIssues])

  return (
    <>
      <Topbar title="Issues" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-6">
          <div className="flex items-center justify-between px-4 mb-4">
            <h1 className="text-sm font-medium text-neutral-200">All Issues</h1>
            <button
              onClick={openCreateIssueModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm text-neutral-200 transition-colors"
            >
              <Plus size={14} />
              New Issue
            </button>
          </div>

          {loading ? (
            <p className="px-4 text-sm text-neutral-500">Loading...</p>
          ) : issues.length === 0 ? (
            <p className="px-4 text-sm text-neutral-500">No issues yet.</p>
          ) : (
            <IssueList issues={issues} />
          )}
        </div>
      </div>
      <CreateIssueModal />
    </>
  )
}
```

- [ ] **Step 4: ブラウザで確認してコミット**

```bash
npm run dev
```

`http://localhost:3000/issues` でリストが表示されること、ステータスアイコンをクリックするとステータスが更新されることを確認。

```bash
git add src/app/issues/ src/components/issues/IssueRow.tsx src/components/issues/IssueList.tsx
git commit -m "feat: add issues page with status-grouped list and status cycling"
```

---

### Task 11: Issue 作成モーダル

**Files:**
- Create: `src/components/issues/CreateIssueModal.tsx`

- [ ] **Step 1: `src/components/issues/CreateIssueModal.tsx` を作成**

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useIssueStore } from '@/stores/issueStore'
import { useUiStore } from '@/stores/uiStore'
import type { IssuePriority } from '@/types'

interface Project {
  id: string
  title: string
  prefix: string
}

export function CreateIssueModal() {
  const { isCreateIssueModalOpen, closeCreateIssueModal } = useUiStore()
  const { createIssue } = useIssueStore()

  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [priority, setPriority] = useState<IssuePriority>('none')
  const [projects, setProjects] = useState<Project[]>([])
  const [submitting, setSubmitting] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isCreateIssueModalOpen) {
      fetch('/api/projects')
        .then((r) => r.json())
        .then((data: Project[]) => {
          setProjects(data)
          if (data.length > 0) setProjectId(data[0].id)
        })
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setTitle('')
      setPriority('none')
    }
  }, [isCreateIssueModalOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !projectId) return
    setSubmitting(true)
    try {
      await createIssue({ title: title.trim(), projectId, priority })
      closeCreateIssueModal()
    } finally {
      setSubmitting(false)
    }
  }

  if (!isCreateIssueModalOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && closeCreateIssueModal()}
    >
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-lg p-5 shadow-2xl">
        <h2 className="text-sm font-medium text-neutral-200 mb-4">New Issue</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            ref={inputRef}
            type="text"
            placeholder="Issue title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
          />

          <div className="flex gap-3">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.prefix} — {p.title}
                </option>
              ))}
            </select>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as IssuePriority)}
              className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500"
            >
              <option value="none">No priority</option>
              <option value="urgent">⚡ Urgent</option>
              <option value="high">▲ High</option>
              <option value="medium">■ Medium</option>
              <option value="low">▽ Low</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={closeCreateIssueModal}
              className="px-4 py-1.5 rounded-md text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !projectId || submitting}
              className="px-4 py-1.5 rounded-md text-sm bg-neutral-700 hover:bg-neutral-600 text-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: ブラウザで動作確認**

1. Project が存在しない場合は先に curl で作成:
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"title":"Frontend","prefix":"FE"}'
```

2. `New Issue` ボタンをクリック → モーダルが開く
3. タイトルを入力して `Create Issue` → Issues リストに追加される

- [ ] **Step 3: コミット**

```bash
git add src/components/issues/CreateIssueModal.tsx
git commit -m "feat: add create issue modal with project and priority selection"
```

---

### Task 12: その他エンティティページ（Initiatives / Projects / Cycles）

**Files:**
- Create: `src/components/initiatives/InitiativeList.tsx`
- Create: `src/components/projects/ProjectList.tsx`
- Create: `src/components/cycles/CycleList.tsx`
- Create: `src/app/initiatives/page.tsx`
- Create: `src/app/projects/page.tsx`
- Create: `src/app/cycles/page.tsx`

- [ ] **Step 1: Projects ページを作成（モデルケース）**

`src/components/projects/ProjectList.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Project } from '@/types'

interface ProjectListProps {
  projects: Project[]
  onCreated: () => void
}

export function ProjectList({ projects, onCreated }: ProjectListProps) {
  const [title, setTitle] = useState('')
  const [prefix, setPrefix] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !prefix.trim()) return
    setCreating(true)
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), prefix: prefix.trim() }),
    })
    setTitle('')
    setPrefix('')
    setCreating(false)
    onCreated()
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          placeholder="Project name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 bg-neutral-800 border border-neutral-700 rounded-md px-3 py-1.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
        />
        <input
          placeholder="Prefix (e.g. FE)"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value.toUpperCase())}
          maxLength={5}
          className="w-28 bg-neutral-800 border border-neutral-700 rounded-md px-3 py-1.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none font-mono"
        />
        <button
          type="submit"
          disabled={!title.trim() || !prefix.trim() || creating}
          className="px-4 py-1.5 rounded-md bg-neutral-700 hover:bg-neutral-600 text-sm text-neutral-100 disabled:opacity-40 transition-colors"
        >
          Add
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {projects.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800">
            <span className="font-mono text-xs text-neutral-500 w-12">{p.prefix}</span>
            <span className="text-sm text-neutral-100">{p.title}</span>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
              p.status === 'active' ? 'bg-green-900/40 text-green-400' : 'bg-neutral-800 text-neutral-500'
            }`}>{p.status}</span>
          </div>
        ))}
        {projects.length === 0 && (
          <p className="text-sm text-neutral-500 px-1">No projects yet.</p>
        )}
      </div>
    </div>
  )
}
```

`src/app/projects/page.tsx`:

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProjectList } from '@/components/projects/ProjectList'
import { Topbar } from '@/components/layout/Topbar'
import type { Project } from '@/types'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])

  const load = useCallback(async () => {
    const res = await fetch('/api/projects')
    setProjects(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <>
      <Topbar title="Projects" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6 px-4">
          <h1 className="text-sm font-medium text-neutral-200 mb-4">Projects</h1>
          <ProjectList projects={projects} onCreated={load} />
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Initiatives ページを作成**

`src/components/initiatives/InitiativeList.tsx` と `src/app/initiatives/page.tsx` を Projects と同パターンで作成（フォームは title のみ）。

`src/components/initiatives/InitiativeList.tsx`:

```tsx
'use client'
import { useState } from 'react'
import type { Initiative } from '@/types'

interface InitiativeListProps {
  initiatives: Initiative[]
  onCreated: () => void
}

export function InitiativeList({ initiatives, onCreated }: InitiativeListProps) {
  const [title, setTitle] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    await fetch('/api/initiatives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    })
    setTitle('')
    onCreated()
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          placeholder="Initiative name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 bg-neutral-800 border border-neutral-700 rounded-md px-3 py-1.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
        />
        <button type="submit" disabled={!title.trim()}
          className="px-4 py-1.5 rounded-md bg-neutral-700 hover:bg-neutral-600 text-sm disabled:opacity-40 transition-colors">
          Add
        </button>
      </form>
      <div className="flex flex-col gap-2">
        {initiatives.map((i) => (
          <div key={i.id} className="px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800">
            <span className="text-sm text-neutral-100">{i.title}</span>
          </div>
        ))}
        {initiatives.length === 0 && <p className="text-sm text-neutral-500">No initiatives yet.</p>}
      </div>
    </div>
  )
}
```

`src/app/initiatives/page.tsx`:

```tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { InitiativeList } from '@/components/initiatives/InitiativeList'
import { Topbar } from '@/components/layout/Topbar'
import type { Initiative } from '@/types'

export default function InitiativesPage() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([])
  const load = useCallback(async () => {
    const res = await fetch('/api/initiatives')
    setInitiatives(await res.json())
  }, [])
  useEffect(() => { load() }, [load])
  return (
    <>
      <Topbar title="Initiatives" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6 px-4">
          <h1 className="text-sm font-medium text-neutral-200 mb-4">Initiatives</h1>
          <InitiativeList initiatives={initiatives} onCreated={load} />
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Cycles ページを作成**

`src/components/cycles/CycleList.tsx` と `src/app/cycles/page.tsx` を同パターンで作成（フォームは title + startDate + endDate）。

`src/components/cycles/CycleList.tsx`:

```tsx
'use client'
import { useState } from 'react'
import type { Cycle } from '@/types'

interface CycleListProps {
  cycles: Cycle[]
  onCreated: () => void
}

export function CycleList({ cycles, onCreated }: CycleListProps) {
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !startDate || !endDate) return
    await fetch('/api/cycles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), startDate, endDate }),
    })
    setTitle(''); setStartDate(''); setEndDate('')
    onCreated()
  }

  const fmt = (d: string | Date) => new Date(d).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
        <input placeholder="Sprint name" value={title} onChange={(e) => setTitle(e.target.value)}
          className="flex-1 min-w-40 bg-neutral-800 border border-neutral-700 rounded-md px-3 py-1.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none" />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-1.5 text-sm text-neutral-100 focus:outline-none" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-1.5 text-sm text-neutral-100 focus:outline-none" />
        <button type="submit" disabled={!title.trim() || !startDate || !endDate}
          className="px-4 py-1.5 rounded-md bg-neutral-700 hover:bg-neutral-600 text-sm disabled:opacity-40 transition-colors">
          Add
        </button>
      </form>
      <div className="flex flex-col gap-2">
        {cycles.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800">
            <span className="text-sm text-neutral-100 flex-1">{c.title}</span>
            <span className="text-xs text-neutral-500">{fmt(c.startDate)} – {fmt(c.endDate)}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-green-900/40 text-green-400' : 'bg-neutral-800 text-neutral-500'}`}>{c.status}</span>
          </div>
        ))}
        {cycles.length === 0 && <p className="text-sm text-neutral-500">No cycles yet.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: `src/app/cycles/page.tsx` を作成**

```tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { CycleList } from '@/components/cycles/CycleList'
import { Topbar } from '@/components/layout/Topbar'
import type { Cycle } from '@/types'

export default function CyclesPage() {
  const [cycles, setCycles] = useState<Cycle[]>([])
  const load = useCallback(async () => {
    const res = await fetch('/api/cycles')
    setCycles(await res.json())
  }, [])
  useEffect(() => { load() }, [load])
  return (
    <>
      <Topbar title="Cycles" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6 px-4">
          <h1 className="text-sm font-medium text-neutral-200 mb-4">Cycles</h1>
          <CycleList cycles={cycles} onCreated={load} />
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 5: 全ページ動作確認 + コミット**

各ページ（`/initiatives`, `/projects`, `/cycles`）でアイテムが作成・表示されることをブラウザで確認。

```bash
git add src/app/initiatives/ src/app/projects/ src/app/cycles/ src/components/initiatives/ src/components/projects/ src/components/cycles/
git commit -m "feat: add initiatives, projects, cycles list pages with create forms"
```

---

### Phase 1 完了チェック

- [ ] `npm test` 全テストがパス
- [ ] `npm run dev` でブラウザが起動する
- [ ] Project 作成 → Issue 作成 → リスト表示 → ステータスクリックで更新 が動作する
- [ ] Initiatives / Cycles も作成・表示できる

```bash
git tag phase1-complete
```

---

## Phase 2: UI 充実

> **このフェーズは実装前に別途ブレストセッションを行い、詳細な実装計画を作成する。**

**完了の定義:** フィルタ・検索・Cmd+K が動き、全ビューが揃っている状態

**主要タスク（ブレスト後に詳細化）:**

1. Issue 詳細スライドオーバー（Markdown エディタ選定: Tiptap or MDXEditor）
2. サブタスク表示・作成
3. フィルタ UI（ステータス / 優先度 / プロジェクト / サイクル）
4. ソート（ステータス / 優先度 / 作成日 / 更新日）
5. グローバル検索（Cmd+K コマンドパレット）
6. D&D 並び替え（`sortOrder` フィールドを利用）
7. Initiative 詳細ページ（配下 Project 一覧 + 進捗バー）
8. Project Issues ページ
9. Cycle 詳細ページ（Issue 一覧 + 進捗表示）
10. Playwright セットアップ + 主要フロー E2E テスト

---

## Phase 3: AI Agent 統合

> **このフェーズは実装前に別途ブレストセッションを行い、詳細な実装計画を作成する。**

**完了の定義:** 自然言語で Issue 操作・サブタスク分割・進捗サマリーが動く状態

**主要タスク（ブレスト後に詳細化）:**

1. `GET /api/agent/status` — `claude --version` で CLI 疎通確認
2. `src/lib/agent/claude-cli.ts` — CLI サブプロセス起動・SSE 中継  
   （PoC 知見を反映: `--disallowed-tools`, `--verbose`, `stdio: ["ignore","pipe","pipe"]`）
3. `src/lib/agent/system-prompt.ts` — コンテキスト注入・アクションスキーマ定義
4. `src/lib/agent/action-handler.ts` — JSON アクション解析 → 内部 API 呼び出し
5. `POST /api/agent/chat` — SSE ストリーム Route Handler
6. `AgentPanel.tsx` — フローティングパネル UI（展開/折りたたみ）
7. `AgentMessage.tsx` — ストリーミング表示・実行ログ
8. `AgentSuggestions.tsx` — サジェストチップ
9. 破壊的操作（削除・ステータス巻き戻し）の確認ダイアログ
10. Vitest で agent パーサーロジックのテスト（CLI はモック化）

**PoC で確認済みの CLI オプション:**
```bash
claude -p \
  --output-format stream-json \
  --verbose \
  --disallowed-tools Bash Write Edit Read \
  --max-turns 5 \
  --system-prompt "..." \
  "ユーザーメッセージ"
```
`stdio: ["ignore", "pipe", "pipe"]` 必須（stdin を閉じる）

---

## Phase 4: 磨き込み

> **このフェーズは実装前に別途ブレストセッションを行い、詳細な実装計画を作成する。**

**完了の定義:** ポートフォリオとして公開できる品質

**主要タスク（ブレスト後に詳細化）:**

1. キーボードショートカット全般（`tinykeys`）
2. アニメーション・トランジション（Tailwind v4 のアニメーション機能を活用）
3. ダークテーマ最適化
4. 楽観的更新（Zustand ストアの即時反映 + ロールバック）
5. エラーハンドリング強化（API エラートースト通知）
6. データエクスポート（JSON / CSV）
7. README 整備（スクリーンショット・デモ動画・セットアップ手順）
8. ADR 総まとめ（全フェーズの意思決定を一覧化）
