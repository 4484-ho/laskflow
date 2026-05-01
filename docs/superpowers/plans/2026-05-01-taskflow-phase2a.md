# Taskflow Phase 2a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 2a — Phase 2b/3 が乗る基盤を整える。`src/server/{db,domain}` 分離、TanStack Query 導入、Issues 一覧の RSC + HydrationBoundary 化、`Issue.sortOrder` の fractional-indexing 移行を行い、Phase 1 の振る舞いを維持しつつコードベースを刷新する。

**Architecture:** `src/lib/*.ts` の DB アクセス関数を `src/server/db/` に移動し、その上に zod 検証 + ビジネスルールを担う `src/server/domain/` を新設。Route Handler は domain を呼ぶ薄い層に整理。client からの `@/server/**` import は ESLint で禁止。Zustand `issueStore` を廃して TanStack Query に置換、Issues 一覧ページのみ RSC + HydrationBoundary パターンを先行採用。Issues の sortOrder は `fractional-indexing` (string base62) に移行し `moveIssue` domain 関数を追加。

**Tech Stack:** Next.js 16 (App Router) / React 19 / Prisma 7 (better-sqlite3 adapter) / TanStack Query v5 / fractional-indexing / Zod / Vitest / ESLint flat config

**Spec:** [docs/superpowers/specs/2026-05-01-taskflow-phase2-design.md](../specs/2026-05-01-taskflow-phase2-design.md) の §3 (Phase 2a)

---

## File Structure

**新規作成:**
- `docs/adr/0004-server-layer-separation.md`
- `docs/adr/0005-tanstack-query-for-server-state.md`
- `docs/adr/0006-fractional-indexing-for-sort-order.md`
- `src/server/db/prisma.ts` (移動 from `src/lib/prisma.ts`)
- `src/server/db/issues.ts` (移動 from `src/lib/issues.ts`)
- `src/server/db/projects.ts` (移動 from `src/lib/projects.ts`)
- `src/server/db/initiatives.ts` (移動 from `src/lib/initiatives.ts`)
- `src/server/db/cycles.ts` (移動 from `src/lib/cycles.ts`)
- `src/server/db/issues.test.ts` (移動 from `src/lib/issues.test.ts`)
- `src/server/db/projects.test.ts` (同上)
- `src/server/db/initiatives.test.ts` (同上)
- `src/server/db/cycles.test.ts` (同上)
- `src/server/domain/issues.ts` (新設、zod 検証 + sortOrder 計算 + 状態遷移)
- `src/server/domain/projects.ts`
- `src/server/domain/initiatives.ts`
- `src/server/domain/cycles.ts`
- `src/server/domain/issues.test.ts`
- `src/server/domain/projects.test.ts`
- `src/server/domain/initiatives.test.ts`
- `src/server/domain/cycles.test.ts`
- `src/lib/fractional-index.ts` (薄い wrapper)
- `src/lib/fractional-index.test.ts`
- `src/lib/query-client.ts`
- `src/lib/query-keys.ts`
- `src/components/providers/QueryProvider.tsx`
- `src/hooks/useIssues.ts`
- `src/app/issues/IssuesPageClient.tsx`
- `prisma/migrations/<timestamp>_issue_sort_order_string/migration.sql`

**変更:**
- `prisma/schema.prisma` — `Issue.sortOrder Float @default(0)` → `String`
- `src/types/index.ts` — `Issue.sortOrder: number` → `string`
- `src/lib/schemas.ts` — `updateIssueSchema.sortOrder` を削除(専用エンドポイントへ)
- `src/app/api/issues/route.ts` — domain 関数を呼ぶ形に
- `src/app/api/issues/[id]/route.ts` — 同上
- `src/app/api/projects/route.ts`, `[id]/route.ts` — 同上
- `src/app/api/initiatives/route.ts`, `[id]/route.ts` — 同上
- `src/app/api/cycles/route.ts`, `[id]/route.ts` — 同上
- `src/app/issues/page.tsx` — Server Component に変更
- `src/app/layout.tsx` — `<QueryProvider>` を追加
- `eslint.config.mjs` — `no-restricted-imports` 追加
- `package.json` — 依存追加
- `src/components/issues/IssueList.tsx`, `CreateIssueModal.tsx` — `useIssueStore` から `useIssues`/`useCreateIssue` に切替

**新規作成 (新規エンドポイント):**
- `src/app/api/issues/[id]/move/route.ts` (POST、moveIssue 用)

**削除:**
- `src/stores/issueStore.ts`
- `src/lib/prisma.ts` (移動済)
- `src/lib/issues.ts`, `projects.ts`, `initiatives.ts`, `cycles.ts` (移動済)
- `src/lib/issues.test.ts`, `projects.test.ts`, `initiatives.test.ts`, `cycles.test.ts` (移動済)

---

## Section A: ADR の追加

### Task A1: ADR 0004 — Server Layer Separation

**Files:**
- Create: `docs/adr/0004-server-layer-separation.md`

- [ ] **Step 1: ADR を書く**

```markdown
# ADR 0004: Server Layer Separation (`src/server/{db,domain}`)

**ステータス**: 承認済み (2026-05-01, Phase 2 ブレスト)

## Context

Phase 1 では DB アクセス関数が `src/lib/{issues,projects,...}.ts` に置かれ、Route Handler から直接呼ばれていた。Phase 2 で RSC を一部採用すると Server Component が同じ関数を直接 import する。Phase 3 で AI Agent サーバコードが入る。client コードに Prisma 依存が誤って混入するリスクがある。

## Decision

- `src/server/db/*.ts` — Prisma を直接叩く CRUD 関数のみを置く
- `src/server/domain/*.ts` — zod 検証 + ビジネスルール(状態遷移、sortOrder 計算等)を置く。db を呼ぶのは domain のみ
- Route Handler は thin wrapper にし、HTTP ↔ domain の変換だけ行う
- `src/components/**`, `src/hooks/**`, `src/stores/**`, および `'use client'` ファイルから `@/server/**` への import を ESLint `no-restricted-imports` で禁止する

## Consequences

- + client への Prisma 混入を機械的に防止できる
- + RSC が直接 domain を呼べる(API ラウンドトリップ不要)
- + Phase 3 の Agent コードを `src/server/agent/` に追加する明確な場所ができる
- − ファイル数が増え、import パスの書き換えが発生
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0004-server-layer-separation.md
git commit -m "docs(adr): add 0004 server layer separation"
```

---

### Task A2: ADR 0005 — TanStack Query for Server State

**Files:**
- Create: `docs/adr/0005-tanstack-query-for-server-state.md`

- [ ] **Step 1: ADR を書く**

```markdown
# ADR 0005: TanStack Query for Server State

**ステータス**: 承認済み (2026-05-01, Phase 2 ブレスト)

## Context

Phase 1 では Zustand store (`issueStore.ts`) が `fetch` を直接行い、サーバ状態をクライアントに重複保持していた。Phase 2 では D&D 並び替え、フィルタ変更、Cmd+K 等で頻繁な再取得・楽観的更新が必要になる。AI Agent (Phase 3) がサーバ DB を直接書き換えるため、サーバ側を真実とみなす経路が必要。

## Decision

- サーバ状態は `@tanstack/react-query` で管理する。Zustand は UI ステート専用に縮小(`uiStore.ts` のみ)
- 初期描画が重いビュー(各詳細画面、Issues 一覧)は Server Component で `prefetchQuery` し `<HydrationBoundary>` 経由で client に渡す
- mutation は楽観的更新で書き、失敗時は `onError` でロールバック
- REST API は変えない(Phase 3 Agent と共有)
- `staleTime: 30s`, `gcTime: 5min`(個人利用の現実的な値)

## Consequences

- + キャッシュ・楽観的更新・refetch が標準パターンで書ける
- + RSC + HydrationBoundary で初期描画と client refetch の両立
- − hydration mismatch のリスク(対策: クエリキー設計を厳密に)
- − Phase 2a で全ページを移行せず、Issues 一覧のみ先行採用 (残りは Phase 2b の各詳細画面実装と同時に移行)
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0005-tanstack-query-for-server-state.md
git commit -m "docs(adr): add 0005 tanstack query for server state"
```

---

### Task A3: ADR 0006 — Fractional Indexing for Sort Order

**Files:**
- Create: `docs/adr/0006-fractional-indexing-for-sort-order.md`

- [ ] **Step 1: ADR を書く**

```markdown
# ADR 0006: Fractional Indexing for Issue Sort Order

**ステータス**: 承認済み (2026-05-01, Phase 2 ブレスト)

## Context

Phase 1 では `Issue.sortOrder` を `Float` で持ち、作成時に `Date.now()` を入れていた。Phase 2 で D&D 並び替えを導入すると「2 つのアイテムの間に挿入」が必要になる。Float 中点法では精度限界(~50 回ネスト)で破綻する。連番リナンバーは挿入のたびに大量 UPDATE が必要。

## Decision

- `npm` パッケージ `fractional-indexing` を採用(string base62、Notion/Figma 型)
- `Issue.sortOrder` を `Float` から `String` に変更
- 既存レコードは `createdAt` 昇順で `generateNKeysBetween(null, null, count)` により一括採番してマイグレーション
- 並び替え用に `moveIssue(id, beforeId, afterId)` domain 関数を追加し、`generateKeyBetween` で新キー計算
- 衝突対策のリバランス関数 `rebalanceSortOrders(scope)` も用意するが、運用上は予防的(個人利用なので発火しない想定)
- 対象は **Issue のみ**。サブタスク並び替えや他エンティティの並び替えは Phase 4 候補

## Consequences

- + 任意箇所への挿入が `O(1)` で可能、リバランス不要
- + 衝突に強い
- − sortOrder 比較が文字列比較になる(Prisma クエリで `orderBy: { sortOrder: 'asc' }` のまま機能)
- − 既存データの移行マイグレーションが必要
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0006-fractional-indexing-for-sort-order.md
git commit -m "docs(adr): add 0006 fractional indexing for sort order"
```

---

## Section B: Server Layer Extraction (db レイヤ移動)

### Task B1: src/lib → src/server/db ファイル移動

**Files:**
- Move: `src/lib/prisma.ts` → `src/server/db/prisma.ts`
- Move: `src/lib/issues.ts` → `src/server/db/issues.ts`
- Move: `src/lib/projects.ts` → `src/server/db/projects.ts`
- Move: `src/lib/initiatives.ts` → `src/server/db/initiatives.ts`
- Move: `src/lib/cycles.ts` → `src/server/db/cycles.ts`
- Move: `src/lib/issues.test.ts` → `src/server/db/issues.test.ts`
- Move: `src/lib/projects.test.ts` → `src/server/db/projects.test.ts`
- Move: `src/lib/initiatives.test.ts` → `src/server/db/initiatives.test.ts`
- Move: `src/lib/cycles.test.ts` → `src/server/db/cycles.test.ts`

- [ ] **Step 1: ファイルを移動**

```bash
mkdir -p src/server/db
git mv src/lib/prisma.ts src/server/db/prisma.ts
git mv src/lib/issues.ts src/server/db/issues.ts
git mv src/lib/projects.ts src/server/db/projects.ts
git mv src/lib/initiatives.ts src/server/db/initiatives.ts
git mv src/lib/cycles.ts src/server/db/cycles.ts
git mv src/lib/issues.test.ts src/server/db/issues.test.ts
git mv src/lib/projects.test.ts src/server/db/projects.test.ts
git mv src/lib/initiatives.test.ts src/server/db/initiatives.test.ts
git mv src/lib/cycles.test.ts src/server/db/cycles.test.ts
```

- [ ] **Step 2: 各ファイル内の import を `@/lib/prisma` → `@/server/db/prisma` に更新**

例: `src/server/db/issues.ts` の先頭を以下に変更:

```typescript
import { prisma } from '@/server/db/prisma'
```

同様に `projects.ts`, `initiatives.ts`, `cycles.ts` の `import { prisma } from '@/lib/prisma'` をすべて `@/server/db/prisma` に置換。テストファイル内の同様の import も置換。

- [ ] **Step 3: 呼び出し側 import を更新**

`src/app/api/**/route.ts` 内の `from '@/lib/issues'` → `from '@/server/db/issues'` などへ全置換。対象:

```bash
grep -rl "from '@/lib/issues'" src/app
grep -rl "from '@/lib/projects'" src/app
grep -rl "from '@/lib/initiatives'" src/app
grep -rl "from '@/lib/cycles'" src/app
grep -rl "from '@/lib/prisma'" src/app
```

- [ ] **Step 4: Vitest 実行**

Run: `pnpm test`
Expected: 全 PASS(振る舞いは変えていない)

- [ ] **Step 5: ビルド確認**

Run: `pnpm build`
Expected: SUCCESS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move db access from src/lib to src/server/db"
```

---

### Task B2: ESLint で client → server import を禁止

**Files:**
- Modify: `eslint.config.mjs`

- [ ] **Step 1: ESLint 設定を更新**

`eslint.config.mjs` を以下に置き換える:

```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // src/server/** を client コードから import 禁止
  {
    files: ["src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}", "src/stores/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/*", "@/server/**"],
              message: "Do not import server code from client. Use API routes or domain functions through Server Components instead.",
            },
          ],
        },
      ],
    },
  },
  // 'use client' がついた app/ 配下のファイルにも同じ制約
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/*", "@/server/**"],
              message: "Do not import server code from client components. If this file is a Server Component (no 'use client'), this rule may need adjustment.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
```

注意: 上記 2 つ目のブロックは `app/**` 全体に効くため、Server Component で `@/server/**` を使うときは file-level override が必要。ここでは Server Component 内 import は **route handler と Server Component page (`page.tsx` で `'use client'` がないもの)に限る**運用ルールとし、後段の Task で `app/issues/page.tsx` を Server Component 化する際にこのルールを **ファイル単位 override** で外す(下記 Task E5 参照)。

- [ ] **Step 2: Lint 実行**

Run: `pnpm lint`
Expected: ERROR が出るはず(Route Handler 群が `@/server/db/*` を import している、または既存の client 側に違反がない)

実際には Route Handler は `app/api/**` にあり、上の 2 つ目ルールに引っかかる。これを許可するため、ルールを修正:

```javascript
  // app/ 配下: route handlers と Server Component には server import を許可
  // 'use client' を含むファイルだけが client。これを判定する方法がないため、
  // ルートを「client 候補のディレクトリ」だけに限定する。
  // 結論: 1 つ目のブロック (components/hooks/stores) のみで運用する。
  // app/ 配下の 'use client' ファイルへの違反検出は、code review と Type Error
  // (Prisma が browser bundle に入ると Next.js がエラーを出す) で担保する。
```

最終的な `eslint.config.mjs`:

```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}", "src/stores/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/*", "@/server/**"],
              message: "Do not import server code from client. Use API routes or call domain functions from Server Components.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
```

- [ ] **Step 3: Lint 再実行**

Run: `pnpm lint`
Expected: PASS(現状の client 側に `@/server/**` import は存在しないため)

- [ ] **Step 4: ルールが効くことを手動確認**

`src/components/issues/IssueList.tsx` の冒頭に一時的に以下を追加:

```typescript
import { prisma } from '@/server/db/prisma'
```

Run: `pnpm lint`
Expected: ERROR `'@/server/db/prisma' import is restricted from being used by a pattern.`

確認後、その import を削除。

- [ ] **Step 5: Commit**

```bash
git add eslint.config.mjs
git commit -m "build(eslint): forbid @/server imports from client code"
```

---

## Section C: Domain Layer 新設

### Task C1: Issues domain — failing test

**Files:**
- Create: `src/server/domain/issues.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createIssue,
  updateIssue,
  getIssue,
  listIssues,
} from '@/server/domain/issues'

vi.mock('@/server/db/issues', () => ({
  getIssues: vi.fn(),
  getIssue: vi.fn(),
  createIssue: vi.fn(),
  updateIssue: vi.fn(),
  deleteIssue: vi.fn(),
}))

vi.mock('@/server/db/prisma', () => ({
  prisma: { issue: { findFirst: vi.fn() } },
}))

import * as db from '@/server/db/issues'
import { prisma } from '@/server/db/prisma'

describe('domain/issues', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createIssue', () => {
    it('rejects invalid input (missing title)', async () => {
      await expect(
        createIssue({ projectId: 'p1' } as never),
      ).rejects.toThrow(/title/i)
      expect(db.createIssue).not.toHaveBeenCalled()
    })

    it('rejects invalid status', async () => {
      await expect(
        createIssue({ title: 't', projectId: 'p1', status: 'bogus' as never }),
      ).rejects.toThrow()
    })

    it('passes validated input to db', async () => {
      ;(prisma.issue.findFirst as never as vi.Mock).mockResolvedValue(null)
      ;(db.createIssue as never as vi.Mock).mockResolvedValue({ id: 'i1' })
      await createIssue({ title: 'hello', projectId: 'p1' })
      expect(db.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'hello', projectId: 'p1' }),
      )
    })
  })

  describe('updateIssue', () => {
    it('rejects invalid status transition (done → backlog forbidden when not requested)', async () => {
      // 状態遷移ルール: done からは cancelled / backlog どちらにも戻せる(自由)
      // ここではフリー遷移を許容することをテスト
      ;(db.getIssue as never as vi.Mock).mockResolvedValue({ id: 'i1', status: 'done' })
      ;(db.updateIssue as never as vi.Mock).mockResolvedValue({ id: 'i1', status: 'backlog' })
      await expect(updateIssue('i1', { status: 'backlog' })).resolves.toBeDefined()
    })

    it('rejects negative estimate', async () => {
      await expect(updateIssue('i1', { estimate: -1 })).rejects.toThrow()
    })
  })
})
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `pnpm test src/server/domain/issues.test.ts`
Expected: FAIL with "Cannot find module '@/server/domain/issues'"

---

### Task C2: Issues domain — implementation

**Files:**
- Create: `src/server/domain/issues.ts`

- [ ] **Step 1: Domain 関数を実装**

```typescript
import { z } from 'zod'
import {
  createIssueSchema,
  updateIssueSchema,
  issueListQuerySchema,
} from '@/lib/schemas'
import * as db from '@/server/db/issues'
import type { Issue } from '@/types'

export type CreateIssueDomainInput = z.input<typeof createIssueSchema>
export type UpdateIssueDomainInput = z.input<typeof updateIssueSchema>
export type ListIssuesParams = z.input<typeof issueListQuerySchema>

export async function createIssue(input: CreateIssueDomainInput): Promise<Issue> {
  const parsed = createIssueSchema.parse(input)
  return db.createIssue(parsed)
}

export async function updateIssue(
  id: string,
  input: UpdateIssueDomainInput,
): Promise<Issue> {
  const parsed = updateIssueSchema.parse(input)
  return db.updateIssue(id, parsed)
}

export async function getIssue(id: string): Promise<Issue | null> {
  return db.getIssue(id)
}

export async function listIssues(params: ListIssuesParams = {}): Promise<Issue[]> {
  const parsed = issueListQuerySchema.parse(params)
  return db.getIssues(parsed)
}

export async function deleteIssue(id: string): Promise<void> {
  return db.deleteIssue(id)
}
```

- [ ] **Step 2: テストを実行して PASS を確認**

Run: `pnpm test src/server/domain/issues.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/server/domain/issues.ts src/server/domain/issues.test.ts
git commit -m "feat(domain): add issues domain layer with zod validation"
```

---

### Task C3: Projects/Initiatives/Cycles domain — failing tests + implementation

**Files:**
- Create: `src/server/domain/projects.ts`
- Create: `src/server/domain/projects.test.ts`
- Create: `src/server/domain/initiatives.ts`
- Create: `src/server/domain/initiatives.test.ts`
- Create: `src/server/domain/cycles.ts`
- Create: `src/server/domain/cycles.test.ts`

- [ ] **Step 1: projects.test.ts を書く**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createProject, updateProject } from '@/server/domain/projects'

vi.mock('@/server/db/projects', () => ({
  getProjects: vi.fn(),
  getProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}))

import * as db from '@/server/db/projects'

describe('domain/projects', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects prefix not uppercase alphanumeric', async () => {
    await expect(createProject({ title: 't', prefix: 'lower' })).rejects.toThrow()
  })

  it('passes validated create to db', async () => {
    ;(db.createProject as never as vi.Mock).mockResolvedValue({ id: 'p1' })
    await createProject({ title: 'P', prefix: 'PRJ' })
    expect(db.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'P', prefix: 'PRJ' }),
    )
  })

  it('rejects invalid status on update', async () => {
    await expect(updateProject('p1', { status: 'bogus' as never })).rejects.toThrow()
  })
})
```

- [ ] **Step 2: projects.ts を実装**

```typescript
import { z } from 'zod'
import { createProjectSchema, updateProjectSchema } from '@/lib/schemas'
import * as db from '@/server/db/projects'
import type { Project } from '@/types'

export type CreateProjectDomainInput = z.input<typeof createProjectSchema>
export type UpdateProjectDomainInput = z.input<typeof updateProjectSchema>

export async function createProject(input: CreateProjectDomainInput): Promise<Project> {
  return db.createProject(createProjectSchema.parse(input))
}

export async function updateProject(
  id: string,
  input: UpdateProjectDomainInput,
): Promise<Project> {
  return db.updateProject(id, updateProjectSchema.parse(input))
}

export async function getProject(id: string): Promise<Project | null> {
  return db.getProject(id)
}

export async function listProjects(): Promise<Project[]> {
  return db.getProjects()
}

export async function deleteProject(id: string): Promise<void> {
  return db.deleteProject(id)
}
```

- [ ] **Step 3: initiatives.test.ts を書く**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createInitiative, updateInitiative } from '@/server/domain/initiatives'

vi.mock('@/server/db/initiatives', () => ({
  getInitiatives: vi.fn(),
  getInitiative: vi.fn(),
  createInitiative: vi.fn(),
  updateInitiative: vi.fn(),
  deleteInitiative: vi.fn(),
}))

import * as db from '@/server/db/initiatives'

describe('domain/initiatives', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects empty title', async () => {
    await expect(createInitiative({ title: '' })).rejects.toThrow()
  })

  it('rejects invalid status on update', async () => {
    await expect(updateInitiative('i1', { status: 'bogus' as never })).rejects.toThrow()
  })

  it('passes validated input to db', async () => {
    ;(db.createInitiative as never as vi.Mock).mockResolvedValue({ id: 'i1' })
    await createInitiative({ title: 'I' })
    expect(db.createInitiative).toHaveBeenCalledWith(expect.objectContaining({ title: 'I' }))
  })
})
```

- [ ] **Step 4: initiatives.ts を実装**

```typescript
import { z } from 'zod'
import { createInitiativeSchema, updateInitiativeSchema } from '@/lib/schemas'
import * as db from '@/server/db/initiatives'
import type { Initiative } from '@/types'

export type CreateInitiativeDomainInput = z.input<typeof createInitiativeSchema>
export type UpdateInitiativeDomainInput = z.input<typeof updateInitiativeSchema>

export async function createInitiative(
  input: CreateInitiativeDomainInput,
): Promise<Initiative> {
  return db.createInitiative(createInitiativeSchema.parse(input))
}

export async function updateInitiative(
  id: string,
  input: UpdateInitiativeDomainInput,
): Promise<Initiative> {
  return db.updateInitiative(id, updateInitiativeSchema.parse(input))
}

export async function getInitiative(id: string): Promise<Initiative | null> {
  return db.getInitiative(id)
}

export async function listInitiatives(): Promise<Initiative[]> {
  return db.getInitiatives()
}

export async function deleteInitiative(id: string): Promise<void> {
  return db.deleteInitiative(id)
}
```

- [ ] **Step 5: cycles.test.ts を書く**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCycle, updateCycle } from '@/server/domain/cycles'

vi.mock('@/server/db/cycles', () => ({
  getCycles: vi.fn(),
  getCycle: vi.fn(),
  createCycle: vi.fn(),
  updateCycle: vi.fn(),
  deleteCycle: vi.fn(),
}))

import * as db from '@/server/db/cycles'

describe('domain/cycles', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects missing endDate on create', async () => {
    await expect(
      createCycle({ title: 'C', startDate: '2026-05-01' } as never),
    ).rejects.toThrow()
  })

  it('passes validated input to db', async () => {
    ;(db.createCycle as never as vi.Mock).mockResolvedValue({ id: 'c1' })
    await createCycle({ title: 'C', startDate: '2026-05-01', endDate: '2026-05-15' })
    expect(db.createCycle).toHaveBeenCalled()
  })
})
```

- [ ] **Step 6: cycles.ts を実装**

```typescript
import { z } from 'zod'
import { createCycleSchema, updateCycleSchema } from '@/lib/schemas'
import * as db from '@/server/db/cycles'
import type { Cycle } from '@/types'

export type CreateCycleDomainInput = z.input<typeof createCycleSchema>
export type UpdateCycleDomainInput = z.input<typeof updateCycleSchema>

export async function createCycle(input: CreateCycleDomainInput): Promise<Cycle> {
  return db.createCycle(createCycleSchema.parse(input))
}

export async function updateCycle(
  id: string,
  input: UpdateCycleDomainInput,
): Promise<Cycle> {
  return db.updateCycle(id, updateCycleSchema.parse(input))
}

export async function getCycle(id: string): Promise<Cycle | null> {
  return db.getCycle(id)
}

export async function listCycles(): Promise<Cycle[]> {
  return db.getCycles()
}

export async function deleteCycle(id: string): Promise<void> {
  return db.deleteCycle(id)
}
```

- [ ] **Step 7: 全 domain テスト実行**

Run: `pnpm test src/server/domain`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/server/domain
git commit -m "feat(domain): add projects/initiatives/cycles domain layers"
```

---

### Task C4: Route Handlers を domain 経由に切り替え

**Files:**
- Modify: `src/app/api/issues/route.ts`
- Modify: `src/app/api/issues/[id]/route.ts`
- Modify: `src/app/api/projects/route.ts`
- Modify: `src/app/api/projects/[id]/route.ts`
- Modify: `src/app/api/initiatives/route.ts`
- Modify: `src/app/api/initiatives/[id]/route.ts`
- Modify: `src/app/api/cycles/route.ts`
- Modify: `src/app/api/cycles/[id]/route.ts`

各 route が `@/server/db/<entity>` を直接呼んでいた箇所を `@/server/domain/<entity>` に置換する。zod 検証は domain 内で行うため、route の `parseOrError(zodSchema, body)` は **削除**せず、HTTP 400 を返すために route に残す(domain は throw)。

ただし二重検証を避けるため、route では **検証だけして parsed.data を渡す** か、**domain に raw を渡して ZodError を catch して 400 にする** かを選ぶ。シンプルさのため後者を採用。

- [ ] **Step 1: api-helpers にエラーマッピングを追加**

`src/lib/api-helpers.ts` を確認。既存の `parseOrError` に加えて、ZodError → 400 マッピング関数を追加する。

```bash
cat src/lib/api-helpers.ts
```

(既存の `parseOrError` を流用するため、route 側では body を JSON.parse した後 `parseOrError` を残し、その data を domain に渡す形にする。domain 側で重複 parse するが副作用なし。)

- [ ] **Step 2: `src/app/api/issues/route.ts` を更新**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { listIssues, createIssue } from '@/server/domain/issues'
import { createIssueSchema, issueListQuerySchema } from '@/lib/schemas'
import { parseOrError } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const parsed = parseOrError(issueListQuerySchema, {
    status: searchParams.get('status') ?? undefined,
    priority: searchParams.get('priority') ?? undefined,
    projectId: searchParams.get('projectId') ?? undefined,
    cycleId: searchParams.get('cycleId') ?? undefined,
  })
  if (!parsed.ok) return parsed.response

  try {
    return NextResponse.json(await listIssues(parsed.data))
  } catch (e) {
    console.error('GET /api/issues failed', e)
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = parseOrError(createIssueSchema, body)
  if (!parsed.ok) return parsed.response

  try {
    return NextResponse.json(await createIssue(parsed.data), { status: 201 })
  } catch (e) {
    console.error('POST /api/issues failed', e)
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 })
  }
}
```

- [ ] **Step 3: `src/app/api/issues/[id]/route.ts` を更新**

`getIssue/updateIssue/deleteIssue` を `@/server/domain/issues` から import するように変更。同パターン。

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getIssue, updateIssue, deleteIssue } from '@/server/domain/issues'
import { updateIssueSchema } from '@/lib/schemas'
import { parseOrError } from '@/lib/api-helpers'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const issue = await getIssue(id)
    if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(issue)
  } catch (e) {
    console.error('GET /api/issues/[id] failed', e)
    return NextResponse.json({ error: 'Failed to fetch issue' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = parseOrError(updateIssueSchema, body)
  if (!parsed.ok) return parsed.response
  try {
    return NextResponse.json(await updateIssue(id, parsed.data))
  } catch (e) {
    console.error('PATCH /api/issues/[id] failed', e)
    return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await deleteIssue(id)
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error('DELETE /api/issues/[id] failed', e)
    return NextResponse.json({ error: 'Failed to delete issue' }, { status: 500 })
  }
}
```

注意: 既存ファイルのシグネチャを正確に維持するため、Step 開始前に元ファイルを `cat` し、`params` の Promise/同期、`NextResponse` の使い方を一致させる。Next.js 15+ では `params` は Promise。

- [ ] **Step 4: 同様に projects / initiatives / cycles の routes を更新**

各 route の import を `@/server/db/<entity>` から `@/server/domain/<entity>` に置換。関数名は domain で定義した `list*` / `create*` / `update*` / `get*` / `delete*` を使う。

具体例: `src/app/api/projects/route.ts` の `import { getProjects, createProject } from '@/server/db/projects'` を `import { listProjects, createProject } from '@/server/domain/projects'` に置換し、`getProjects()` の呼び出し箇所を `listProjects()` に書き換え。

同パターンで全 8 ファイル更新。

- [ ] **Step 5: テスト実行**

Run: `pnpm test`
Expected: PASS(domain 層のテストは独立、db テストは無変更で動く)

- [ ] **Step 6: ビルド確認**

Run: `pnpm build`
Expected: SUCCESS

- [ ] **Step 7: 動作確認(手動)**

```bash
pnpm dev &
DEV_PID=$!
sleep 3
curl -s http://localhost:3000/api/issues | head -c 200
curl -s -X POST http://localhost:3000/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"title":"smoke","prefix":"SMK"}'
kill $DEV_PID
```

Expected: GET は JSON 配列、POST は 201 で作成された Project。

- [ ] **Step 8: Commit**

```bash
git add src/app/api
git commit -m "refactor(api): route handlers call domain layer instead of db"
```

---

## Section D: fractional-indexing 移行

### Task D1: fractional-indexing 依存追加と wrapper

**Files:**
- Modify: `package.json`
- Create: `src/lib/fractional-index.ts`
- Create: `src/lib/fractional-index.test.ts`

- [ ] **Step 1: 依存を追加**

```bash
pnpm add fractional-indexing
```

- [ ] **Step 2: wrapper のテストを書く(失敗)**

```typescript
import { describe, it, expect } from 'vitest'
import {
  generateInitialKeys,
  keyBetween,
  isValidKey,
} from '@/lib/fractional-index'

describe('fractional-index', () => {
  describe('generateInitialKeys', () => {
    it('returns N unique ascending string keys', () => {
      const keys = generateInitialKeys(5)
      expect(keys).toHaveLength(5)
      expect(new Set(keys).size).toBe(5)
      const sorted = [...keys].sort()
      expect(sorted).toEqual(keys)
    })

    it('handles count=0', () => {
      expect(generateInitialKeys(0)).toEqual([])
    })

    it('handles count=1', () => {
      const keys = generateInitialKeys(1)
      expect(keys).toHaveLength(1)
      expect(typeof keys[0]).toBe('string')
    })
  })

  describe('keyBetween', () => {
    it('returns a key between two given keys', () => {
      const a = generateInitialKeys(2)
      const mid = keyBetween(a[0], a[1])
      expect(mid > a[0]).toBe(true)
      expect(mid < a[1]).toBe(true)
    })

    it('returns a key after when after=null', () => {
      const [k] = generateInitialKeys(1)
      const next = keyBetween(k, null)
      expect(next > k).toBe(true)
    })

    it('returns a key before when before=null', () => {
      const [k] = generateInitialKeys(1)
      const prev = keyBetween(null, k)
      expect(prev < k).toBe(true)
    })

    it('returns a first key when both null', () => {
      const k = keyBetween(null, null)
      expect(typeof k).toBe('string')
      expect(k.length).toBeGreaterThan(0)
    })
  })

  describe('isValidKey', () => {
    it('accepts generated keys', () => {
      const [k] = generateInitialKeys(1)
      expect(isValidKey(k)).toBe(true)
    })

    it('rejects empty string', () => {
      expect(isValidKey('')).toBe(false)
    })
  })
})
```

Run: `pnpm test src/lib/fractional-index.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: wrapper を実装**

```typescript
import {
  generateKeyBetween,
  generateNKeysBetween,
} from 'fractional-indexing'

export function generateInitialKeys(count: number): string[] {
  if (count <= 0) return []
  return generateNKeysBetween(null, null, count)
}

export function keyBetween(before: string | null, after: string | null): string {
  return generateKeyBetween(before, after)
}

export function isValidKey(key: unknown): key is string {
  return typeof key === 'string' && key.length > 0
}
```

Run: `pnpm test src/lib/fractional-index.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/fractional-index.ts src/lib/fractional-index.test.ts
git commit -m "feat: add fractional-indexing wrapper"
```

---

### Task D2: Prisma スキーマ変更 + データ移行 migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_issue_sort_order_string/migration.sql`

SQLite では列の型変更ができないため、一時テーブル + データコピー + リネームの手順を取る。

- [ ] **Step 1: スキーマを変更**

`prisma/schema.prisma` の Issue モデル内 `sortOrder` 行を:

```
  sortOrder   Float     @default(0)
```

から:

```
  sortOrder   String    @default("a0")
```

に変更。

- [ ] **Step 2: migration を作成**

```bash
pnpm prisma migrate dev --create-only --name issue_sort_order_string
```

これで `prisma/migrations/<timestamp>_issue_sort_order_string/migration.sql` が生成される(自動生成内容は SQLite の table-rebuild)。

- [ ] **Step 3: 生成された migration.sql を確認**

```bash
cat prisma/migrations/*_issue_sort_order_string/migration.sql
```

これで「Issue_new テーブル作成 → `INSERT INTO ... SELECT ... 'a0' AS sortOrder ...` → DROP old → RENAME」の SQL が出ているはず。**この時点ではすべての行に同じ仮値 `'a0'` が入る**(`@default("a0")` のため)。fractional-indexing の正規フォーマット(`a` プレフィックスは 1 桁、`b` は 2 桁、`c` は 3 桁、…)を SQLite の純 SQL で生成するのは煩雑なので、SQL では仮値で統一し、後続の TypeScript スクリプトで本来のキーに更新する。

migration.sql 中に `INSERT INTO "new_Issue" ... SELECT ...` の SELECT 句に `sortOrder` が含まれない場合は、明示的に追加して仮値を入れる:

```sql
INSERT INTO "new_Issue" ("id", "identifier", "title", "description", "status", "priority", "projectId", "cycleId", "parentId", "labels", "dueDate", "estimate", "sortOrder", "createdAt", "updatedAt")
SELECT "id", "identifier", "title", "description", "status", "priority", "projectId", "cycleId", "parentId", "labels", "dueDate", "estimate",
  'a0' AS "sortOrder",
  "createdAt", "updatedAt"
FROM "Issue";
```

(自動生成 SQL が既に `sortOrder` をコピーする形になっている場合: 既存 Float 値はキャストエラー or 文字列化されるため、上記のように明示的に `'a0'` リテラルへ書き換える)

- [ ] **Step 4: migration を適用**

```bash
pnpm prisma migrate dev
```

Expected: SUCCESS。`pnpm prisma generate` で型が更新される。

- [ ] **Step 5: 既存データの sortOrder を fractional-indexing で再採番するスクリプトを追加**

`scripts/migrate-sort-order.ts` を作成:

```typescript
import { prisma } from '../src/server/db/prisma'
import { generateInitialKeys } from '../src/lib/fractional-index'

async function main() {
  const issues = await prisma.issue.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (issues.length === 0) {
    console.log('No issues to migrate.')
    return
  }
  const keys = generateInitialKeys(issues.length)
  for (let i = 0; i < issues.length; i++) {
    await prisma.issue.update({
      where: { id: issues[i].id },
      data: { sortOrder: keys[i] },
    })
  }
  console.log(`Updated ${issues.length} issues with fractional sort keys.`)
}

main().finally(() => prisma.$disconnect())
```

`package.json` の scripts に追加:

```json
"migrate:sort-order": "tsx scripts/migrate-sort-order.ts"
```

`tsx` が未インストールなら追加: `pnpm add -D tsx`

- [ ] **Step 6: スクリプトを実行**

```bash
pnpm migrate:sort-order
```

Expected: `Updated N issues with fractional sort keys.`(N=0 なら `No issues to migrate.`)

- [ ] **Step 7: 結果を確認**

```bash
sqlite3 data/taskflow.db 'SELECT id, sortOrder FROM Issue ORDER BY sortOrder;'
```

Expected: 全 Issue の sortOrder が `a0`, `a1`, ..., `az`, `b00`, ... 形式の正規 fractional key になっている。0 件なら空。

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations scripts/migrate-sort-order.ts package.json pnpm-lock.yaml
git commit -m "feat(db): migrate Issue.sortOrder to string for fractional indexing"
```

---

### Task D3: Issue 型・schemas・db レイヤを string sortOrder に対応

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/schemas.ts`
- Modify: `src/server/db/issues.ts`
- Modify: `src/server/db/issues.test.ts`

- [ ] **Step 1: 型を更新**

`src/types/index.ts` の Issue interface:

```typescript
export interface Issue {
  // ...既存フィールド...
  sortOrder: string  // ← number から string へ
  // ...
}
```

- [ ] **Step 2: schemas.ts の updateIssueSchema から sortOrder を削除**

`updateIssueSchema` 内の `sortOrder: z.number().optional(),` 行を削除。

理由: sortOrder は専用エンドポイント `/api/issues/[id]/move` 経由でのみ更新する(後段 Task D5 で追加)。フリーフォームの PATCH では受け付けない(誤操作防止)。

- [ ] **Step 3: db/issues.ts の createIssue を更新**

`sortOrder: Date.now()` を削除し、新しいキーは domain 層で計算するため、引数で渡せるように変更。

```typescript
export async function createIssue(
  data: CreateIssueInput & { sortOrder: string },
): Promise<Issue> {
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
        sortOrder: data.sortOrder,
      },
    })
  })
  return parseIssue(issue)
}
```

`updateIssue` から `if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder` 行を削除。

`parseIssue` で sortOrder は raw のまま String が返るので変更なし(Prisma が String 型を返すため)。

新規エクスポート: `updateSortOrder` 関数を追加。

```typescript
export async function updateSortOrder(id: string, sortOrder: string): Promise<Issue> {
  const issue = await prisma.issue.update({ where: { id }, data: { sortOrder } })
  return parseIssue(issue)
}
```

- [ ] **Step 4: db/issues.test.ts を更新**

既存テストで `sortOrder` を数値で扱っている箇所(あれば)を文字列に置き換える。`createIssue` 呼び出しは `sortOrder` 引数を必須にしているので、テスト側も渡す:

```typescript
await createIssue({ title: 't', projectId: 'p1', sortOrder: 'a00001' })
```

Run: `pnpm test src/server/db/issues.test.ts`
Expected: PASS(必要に応じてテスト本体を sortOrder 文字列対応に修正)

- [ ] **Step 5: ビルド確認**

Run: `pnpm build`
Expected: SUCCESS(型チェックも通る)

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/lib/schemas.ts src/server/db/issues.ts src/server/db/issues.test.ts
git commit -m "refactor: switch Issue.sortOrder to string"
```

---

### Task D4: domain.createIssue で fractional key を採番、moveIssue を追加

**Files:**
- Modify: `src/server/domain/issues.ts`
- Modify: `src/server/domain/issues.test.ts`

- [ ] **Step 1: 失敗するテストを追加**

`src/server/domain/issues.test.ts` に追加:

```typescript
describe('domain/issues — sort order', () => {
  it('createIssue assigns key after the last existing issue', async () => {
    ;(db.getIssues as never as vi.Mock).mockResolvedValue([
      { id: 'i0', sortOrder: 'a00010' },
    ])
    ;(db.createIssue as never as vi.Mock).mockImplementation((arg) => ({
      id: 'i1',
      ...arg,
    }))
    const result = await createIssue({ title: 't', projectId: 'p1' })
    const sortOrder = (db.createIssue as never as vi.Mock).mock.calls[0][0].sortOrder
    expect(sortOrder > 'a00010').toBe(true)
  })

  it('createIssue assigns initial key when no issues exist', async () => {
    ;(db.getIssues as never as vi.Mock).mockResolvedValue([])
    ;(db.createIssue as never as vi.Mock).mockImplementation((arg) => ({ id: 'i1', ...arg }))
    await createIssue({ title: 't', projectId: 'p1' })
    const sortOrder = (db.createIssue as never as vi.Mock).mock.calls[0][0].sortOrder
    expect(typeof sortOrder).toBe('string')
    expect(sortOrder.length).toBeGreaterThan(0)
  })
})

describe('domain/issues — moveIssue', () => {
  it('moves issue to between two given issues', async () => {
    ;(db.getIssue as never as vi.Mock).mockImplementation((id: string) =>
      ({ a: { id: 'a', sortOrder: 'a0' }, b: { id: 'b', sortOrder: 'a1' }, target: { id: 'target', sortOrder: 'a5' } })[id as 'a' | 'b' | 'target'] ?? null,
    )
    ;(db.updateSortOrder as never as vi.Mock) = vi.fn().mockResolvedValue({ id: 'target' })
    await moveIssue('target', { beforeId: 'a', afterId: 'b' })
    const newKey = (db.updateSortOrder as never as vi.Mock).mock.calls[0][1]
    expect(newKey > 'a0').toBe(true)
    expect(newKey < 'a1').toBe(true)
  })

  it('moves to top when beforeId=null', async () => {
    ;(db.getIssue as never as vi.Mock).mockImplementation((id: string) =>
      ({ b: { id: 'b', sortOrder: 'a5' }, target: { id: 'target', sortOrder: 'a9' } })[id as 'b' | 'target'] ?? null,
    )
    ;(db.updateSortOrder as never as vi.Mock) = vi.fn().mockResolvedValue({ id: 'target' })
    await moveIssue('target', { beforeId: null, afterId: 'b' })
    const newKey = (db.updateSortOrder as never as vi.Mock).mock.calls[0][1]
    expect(newKey < 'a5').toBe(true)
  })
})
```

そして上の vi.mock ブロックに `updateSortOrder` を追加し、import 文に `moveIssue` を追加:

```typescript
vi.mock('@/server/db/issues', () => ({
  getIssues: vi.fn(),
  getIssue: vi.fn(),
  createIssue: vi.fn(),
  updateIssue: vi.fn(),
  updateSortOrder: vi.fn(),
  deleteIssue: vi.fn(),
}))

import {
  createIssue,
  updateIssue,
  getIssue,
  listIssues,
  moveIssue,
} from '@/server/domain/issues'
```

Run: `pnpm test src/server/domain/issues.test.ts`
Expected: FAIL(`moveIssue` が未定義、`createIssue` が sortOrder を渡していない)

- [ ] **Step 2: domain/issues.ts を更新**

```typescript
import { z } from 'zod'
import {
  createIssueSchema,
  updateIssueSchema,
  issueListQuerySchema,
} from '@/lib/schemas'
import * as db from '@/server/db/issues'
import { keyBetween } from '@/lib/fractional-index'
import type { Issue } from '@/types'

export type CreateIssueDomainInput = z.input<typeof createIssueSchema>
export type UpdateIssueDomainInput = z.input<typeof updateIssueSchema>
export type ListIssuesParams = z.input<typeof issueListQuerySchema>

export interface MoveIssueParams {
  beforeId: string | null
  afterId: string | null
}

export async function createIssue(input: CreateIssueDomainInput): Promise<Issue> {
  const parsed = createIssueSchema.parse(input)
  // 末尾に追加: 既存最大 sortOrder の後ろに新キー
  const existing = await db.getIssues({ projectId: parsed.projectId })
  const lastKey =
    existing.length > 0
      ? existing
          .map((i) => i.sortOrder)
          .sort()
          .pop() ?? null
      : null
  const sortOrder = keyBetween(lastKey, null)
  return db.createIssue({ ...parsed, sortOrder })
}

export async function updateIssue(
  id: string,
  input: UpdateIssueDomainInput,
): Promise<Issue> {
  const parsed = updateIssueSchema.parse(input)
  return db.updateIssue(id, parsed)
}

export async function moveIssue(
  id: string,
  params: MoveIssueParams,
): Promise<Issue> {
  const beforeKey = params.beforeId
    ? (await db.getIssue(params.beforeId))?.sortOrder ?? null
    : null
  const afterKey = params.afterId
    ? (await db.getIssue(params.afterId))?.sortOrder ?? null
    : null
  const newKey = keyBetween(beforeKey, afterKey)
  return db.updateSortOrder(id, newKey)
}

export async function getIssue(id: string): Promise<Issue | null> {
  return db.getIssue(id)
}

export async function listIssues(params: ListIssuesParams = {}): Promise<Issue[]> {
  const parsed = issueListQuerySchema.parse(params)
  return db.getIssues(parsed)
}

export async function deleteIssue(id: string): Promise<void> {
  return db.deleteIssue(id)
}
```

- [ ] **Step 3: テスト実行**

Run: `pnpm test src/server/domain/issues.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/server/domain/issues.ts src/server/domain/issues.test.ts
git commit -m "feat(domain): assign fractional sortOrder on create, add moveIssue"
```

---

### Task D5: /api/issues/[id]/move エンドポイント追加

**Files:**
- Create: `src/app/api/issues/[id]/move/route.ts`

- [ ] **Step 1: zod schema を schemas.ts に追加**

`src/lib/schemas.ts` の末尾に:

```typescript
export const moveIssueSchema = z.object({
  beforeId: z.string().min(1).nullable(),
  afterId: z.string().min(1).nullable(),
})
```

- [ ] **Step 2: route handler を作成**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { moveIssue } from '@/server/domain/issues'
import { moveIssueSchema } from '@/lib/schemas'
import { parseOrError } from '@/lib/api-helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = parseOrError(moveIssueSchema, body)
  if (!parsed.ok) return parsed.response

  try {
    return NextResponse.json(await moveIssue(id, parsed.data))
  } catch (e) {
    console.error('POST /api/issues/[id]/move failed', e)
    return NextResponse.json({ error: 'Failed to move issue' }, { status: 500 })
  }
}
```

- [ ] **Step 3: 動作確認(手動 smoke test)**

```bash
pnpm dev &
DEV_PID=$!
sleep 3
# 既存 Issue が 0 件ならスキップ。1 件以上あれば、その ID で末尾に動かす:
ISSUE_ID=$(curl -s http://localhost:3000/api/issues | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id']) if d else print('')")
if [ -n "$ISSUE_ID" ]; then
  curl -s -X POST "http://localhost:3000/api/issues/$ISSUE_ID/move" \
    -H 'Content-Type: application/json' \
    -d '{"beforeId":null,"afterId":null}'
fi
kill $DEV_PID
```

Expected: 200 + 更新された Issue JSON。

- [ ] **Step 4: Commit**

```bash
git add src/lib/schemas.ts src/app/api/issues/\[id\]/move
git commit -m "feat(api): add POST /api/issues/[id]/move endpoint"
```

---

## Section E: TanStack Query 導入と Issues ページ刷新

### Task E1: TanStack Query 依存追加と Provider セットアップ

**Files:**
- Modify: `package.json`
- Create: `src/lib/query-client.ts`
- Create: `src/lib/query-keys.ts`
- Create: `src/components/providers/QueryProvider.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: 依存を追加**

```bash
pnpm add @tanstack/react-query @tanstack/react-query-devtools
```

- [ ] **Step 2: query-client.ts を作成**

```typescript
import { QueryClient, isServer } from '@tanstack/react-query'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

export function getQueryClient() {
  if (isServer) {
    // server: 毎リクエスト新規(hydration boundary 用)
    return makeQueryClient()
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}
```

- [ ] **Step 3: query-keys.ts を作成**

```typescript
export const queryKeys = {
  issues: {
    all: ['issues'] as const,
    list: (filters: Record<string, string | undefined> = {}) =>
      [...queryKeys.issues.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.issues.all, 'detail', id] as const,
  },
  projects: {
    all: ['projects'] as const,
    list: () => [...queryKeys.projects.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.projects.all, 'detail', id] as const,
  },
  initiatives: {
    all: ['initiatives'] as const,
    list: () => [...queryKeys.initiatives.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.initiatives.all, 'detail', id] as const,
  },
  cycles: {
    all: ['cycles'] as const,
    list: () => [...queryKeys.cycles.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.cycles.all, 'detail', id] as const,
  },
}
```

- [ ] **Step 4: QueryProvider を作成**

```typescript
'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { getQueryClient } from '@/lib/query-client'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

- [ ] **Step 5: layout.tsx に Provider を追加**

`src/app/layout.tsx` の `<body>` 直下を `<QueryProvider>...</QueryProvider>` でラップ。

```typescript
// 既存 import に追加:
import { QueryProvider } from '@/components/providers/QueryProvider'

// JSX 内、<body> の中身を:
<body className={...}>
  <QueryProvider>
    {/* 既存の sidebar / main などの構造 */}
  </QueryProvider>
</body>
```

- [ ] **Step 6: ビルド確認**

Run: `pnpm build`
Expected: SUCCESS

Run: `pnpm dev` で `http://localhost:3000` を開き、画面右下に React Query Devtools のフローティングバッジが出ることを確認。

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/query-client.ts src/lib/query-keys.ts src/components/providers/QueryProvider.tsx src/app/layout.tsx
git commit -m "feat: integrate TanStack Query with provider and devtools"
```

---

### Task E2: useIssues hook 群を作成

**Files:**
- Create: `src/hooks/useIssues.ts`

- [ ] **Step 1: hook を実装**

```typescript
'use client'

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { Issue, CreateIssueInput, UpdateIssueInput } from '@/types'

type IssueFilters = {
  status?: string
  priority?: string
  projectId?: string
  cycleId?: string
}

async function fetchIssues(filters: IssueFilters): Promise<Issue[]> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) {
    if (v) qs.set(k, v)
  }
  const res = await fetch(`/api/issues${qs.size ? `?${qs}` : ''}`)
  if (!res.ok) throw new Error(`Failed to fetch issues: ${res.status}`)
  return res.json()
}

async function fetchIssue(id: string): Promise<Issue> {
  const res = await fetch(`/api/issues/${id}`)
  if (!res.ok) throw new Error(`Failed to fetch issue: ${res.status}`)
  return res.json()
}

async function postIssue(data: CreateIssueInput): Promise<Issue> {
  const res = await fetch('/api/issues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to create issue: ${res.status}`)
  return res.json()
}

async function patchIssue(id: string, data: UpdateIssueInput): Promise<Issue> {
  const res = await fetch(`/api/issues/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to update issue: ${res.status}`)
  return res.json()
}

async function deleteIssueRequest(id: string): Promise<void> {
  const res = await fetch(`/api/issues/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete issue: ${res.status}`)
}

async function postMoveIssue(id: string, body: { beforeId: string | null; afterId: string | null }): Promise<Issue> {
  const res = await fetch(`/api/issues/${id}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Failed to move issue: ${res.status}`)
  return res.json()
}

export function useIssues(filters: IssueFilters = {}) {
  return useQuery({
    queryKey: queryKeys.issues.list(filters),
    queryFn: () => fetchIssues(filters),
  })
}

export function useIssue(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.issues.detail(id) : ['issues', 'detail', 'disabled'],
    queryFn: () => fetchIssue(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: postIssue,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.issues.all })
    },
  })
}

export function useUpdateIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIssueInput }) =>
      patchIssue(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: queryKeys.issues.all })
      const previous = qc.getQueriesData<Issue[]>({ queryKey: queryKeys.issues.all })
      qc.setQueriesData<Issue[]>(
        { queryKey: queryKeys.issues.all },
        (old) =>
          Array.isArray(old)
            ? old.map((i) => (i.id === id ? { ...i, ...(data as Partial<Issue>) } : i))
            : old,
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.issues.all })
    },
  })
}

export function useDeleteIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteIssueRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.issues.all })
    },
  })
}

export function useMoveIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, beforeId, afterId }: { id: string; beforeId: string | null; afterId: string | null }) =>
      postMoveIssue(id, { beforeId, afterId }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.issues.all })
      const previous = qc.getQueriesData<Issue[]>({ queryKey: queryKeys.issues.all })
      // 楽観的に即時並べ替えるロジックは Phase 2b の D&D 実装と一緒に追加。
      // Phase 2a では invalidate のみで十分。
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.issues.all })
    },
  })
}
```

- [ ] **Step 2: ビルド確認**

Run: `pnpm build`
Expected: SUCCESS

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useIssues.ts
git commit -m "feat(hooks): add useIssues TanStack Query hook family"
```

---

### Task E3: Issues ページを RSC + HydrationBoundary 化

**Files:**
- Modify: `src/app/issues/page.tsx`
- Create: `src/app/issues/IssuesPageClient.tsx`
- Modify: `src/components/issues/IssueList.tsx`
- Modify: `src/components/issues/CreateIssueModal.tsx`

- [ ] **Step 1: page.tsx を Server Component に書き換え**

`src/app/issues/page.tsx` を以下に置き換え:

```typescript
import {
  HydrationBoundary,
  dehydrate,
} from '@tanstack/react-query'
import { listIssues } from '@/server/domain/issues'
import { getQueryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { IssuesPageClient } from './IssuesPageClient'

export default async function IssuesPage() {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    queryKey: queryKeys.issues.list({}),
    queryFn: () => listIssues({}),
  })
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <IssuesPageClient />
    </HydrationBoundary>
  )
}
```

注意: この page.tsx は **Server Component**(`'use client'` なし)なので `@/server/domain/issues` の import が必要。Section B で設定した ESLint ルールは `app/**` にかけていないので問題なし。

- [ ] **Step 2: IssuesPageClient.tsx を作成**

```typescript
'use client'

import { useIssues } from '@/hooks/useIssues'
import { useUiStore } from '@/stores/uiStore'
import { IssueList } from '@/components/issues/IssueList'
import { CreateIssueModal } from '@/components/issues/CreateIssueModal'
import { Topbar } from '@/components/layout/Topbar'
import { Plus } from 'lucide-react'

export function IssuesPageClient() {
  const { data: issues, isLoading } = useIssues()
  const { openCreateIssueModal } = useUiStore()

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

          {isLoading ? (
            <p className="px-4 text-sm text-neutral-500">Loading...</p>
          ) : !issues || issues.length === 0 ? (
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

- [ ] **Step 3: IssueList を useIssueStore 非依存に**

`src/components/issues/IssueList.tsx` を確認し、`useIssueStore` を使っている箇所を `useUpdateIssue` / `useDeleteIssue` に置換。一覧の `issues` は props で渡すパターンを維持。

具体的には:
- `import { useIssueStore } from '@/stores/issueStore'` を削除
- `import { useUpdateIssue, useDeleteIssue } from '@/hooks/useIssues'` を追加
- `const { updateIssue, deleteIssue } = useIssueStore()` を削除
- `const updateIssueMutation = useUpdateIssue()` および `const deleteIssueMutation = useDeleteIssue()` を追加
- `updateIssue(id, data)` の呼び出しを `updateIssueMutation.mutate({ id, data })` に置換
- `deleteIssue(id)` の呼び出しを `deleteIssueMutation.mutate(id)` に置換

(具体的な行番号は実ファイル参照。`grep -n useIssueStore src/components/issues/IssueList.tsx` で確認)

- [ ] **Step 4: CreateIssueModal を useCreateIssue に切替**

同様に `src/components/issues/CreateIssueModal.tsx`:
- `useIssueStore().createIssue` の利用を `useCreateIssue()` に置換
- フォーム送信時 `createIssueMutation.mutateAsync(data)` を await し、成功後にモーダルを閉じる

- [ ] **Step 5: Initiatives / Projects / Cycles のページ・コンポーネントを Zustand 非依存に確認**

`grep -rn "from '@/stores/issueStore'" src/` を実行。残っている import がないことを確認。

- [ ] **Step 6: useIssueStore 廃止**

```bash
git rm src/stores/issueStore.ts
```

- [ ] **Step 7: テスト + ビルド + 動作確認**

Run: `pnpm test`
Expected: PASS

Run: `pnpm lint`
Expected: PASS

Run: `pnpm build`
Expected: SUCCESS

Run: `pnpm dev` → `http://localhost:3000/issues` を開く。
Expected:
- 初期 HTML 段階で Issues 一覧が描画されている(View Source で確認)
- 「New Issue」で Issue 作成すると一覧に即時反映
- ページリロードしても消えない
- React Query Devtools で `['issues', 'list', {}]` クエリが hydrated 状態で出る

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(issues): convert page to RSC + HydrationBoundary, drop Zustand issueStore"
```

---

## Section F: 仕上げ

### Task F1: 全体検証 + リグレッション確認

- [ ] **Step 1: フルスイート実行**

```bash
pnpm lint && pnpm test && pnpm build
```

Expected: 全 PASS / SUCCESS

- [ ] **Step 2: 主要 API 手動確認**

```bash
pnpm dev &
DEV_PID=$!
sleep 3

echo "--- GET /api/issues ---"
curl -s http://localhost:3000/api/issues | head -c 300
echo
echo "--- POST /api/projects ---"
curl -s -X POST http://localhost:3000/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"title":"P2A smoke","prefix":"P2A"}' | head -c 300
echo
echo "--- POST /api/issues ---"
PROJECT_ID=$(curl -s http://localhost:3000/api/projects | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[-1]['id'])")
curl -s -X POST http://localhost:3000/api/issues \
  -H 'Content-Type: application/json' \
  -d "{\"title\":\"smoke issue\",\"projectId\":\"$PROJECT_ID\"}" | head -c 300
echo

kill $DEV_PID
```

Expected:
- GET は JSON 配列
- POST project 201 + 作成オブジェクト
- POST issue 201 + 作成オブジェクト(`sortOrder` が文字列で入っている)

- [ ] **Step 3: ブラウザでの最終確認**

`pnpm dev` を起動し `http://localhost:3000/issues` を開く。
- [ ] Issue が一覧表示される(初期は SSR 済み HTML)
- [ ] 「New Issue」モーダルから作成 → 一覧に即時追加
- [ ] React Query Devtools でクエリ状態が見える
- [ ] `/initiatives`, `/projects`, `/cycles` も 500 エラーなく表示される(Zustand → TanStack Query 化は Phase 2b 担当のため動作不変)

- [ ] **Step 4: README 更新**

`README.md` の「Phase 1」記述に Phase 2a 完了の追記、もしくは新規 `## Phase 2a Notes` セクションを追加:

```markdown
## Phase 2a Notes

- DB アクセスは `src/server/db/`、ビジネスルールは `src/server/domain/` に分離。client からの import は ESLint で禁止。
- サーバ状態は TanStack Query で管理(Issues 一覧は RSC + HydrationBoundary 採用)。Zustand は UI ステート専用。
- `Issue.sortOrder` は fractional-indexing(string)。並び替えは `POST /api/issues/[id]/move`。
- 詳細は `docs/superpowers/specs/2026-05-01-taskflow-phase2-design.md` および `docs/adr/0004-0006`。
```

- [ ] **Step 5: Phase 2a 完了 commit**

```bash
git add README.md
git commit -m "docs: add Phase 2a notes to README"
```

- [ ] **Step 6: 完了タグ(オプション)**

PR でマージするまで保留。ローカルで作業ブランチをマージ予定の main に上げる前に、最終 lint/test/build を再実行し全 green を確認。

---

## Done — Phase 2a 完了の定義(仕様書 §3.1 と一致)

- [ ] `src/server/{db,domain}` 分離完了、ESLint で client → `@/server` 禁止
- [ ] TanStack Query 導入、`issueStore.ts` 削除、Issues 一覧で RSC + HydrationBoundary 動作
- [ ] `Issue.sortOrder` が string 型に移行、既存データの sortOrder 移行が完了
- [ ] `moveIssue` domain 関数 + `/api/issues/[id]/move` エンドポイント追加
- [ ] Route Handler は domain を呼ぶ薄い層になっている、REST contract 不変
- [ ] `pnpm lint` `pnpm test` `pnpm build` 全 green
- [ ] Phase 1 のリグレッションなし(手動 smoke test 通過)
- [ ] ADR 0004 / 0005 / 0006 commit 済み

Phase 2b は 2a マージ後、別途ブレスト → プラン作成。
