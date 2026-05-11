# Taskflow Phase 2b Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ドックフーディング可能な状態へ — Issue スライドオーバー・D&D・Cmd+K・フィルタ・詳細画面・Playwright E2E を実装する。

**Architecture:** Phase 2a の基盤（TanStack Query / RSC+HydrationBoundary / `src/server` 分離）の上に機能をエンドツーエンドで積み上げる。各タスクは schema→API→UI→テストの単位で完結する。

**Tech Stack:** Next.js 16 App Router / React 19 / Prisma 7 + SQLite / TanStack Query v5 / @dnd-kit / cmdk / @mdxeditor/editor / Playwright / Vitest

---

## ファイルマップ

### 新規作成

| ファイル | 責務 |
|---|---|
| `src/components/issues/IssueDetailSlideover.tsx` | スライドオーバーのルートコンポーネント |
| `src/components/issues/MetaSidebar.tsx` | status/project/cycle/priority 編集サイドバー |
| `src/components/issues/DescriptionEditor.tsx` | MDXEditor の遅延読込ラッパー |
| `src/components/issues/SubtaskSection.tsx` | サブタスク一覧 + インライン作成 |
| `src/components/issues/FilterBar.tsx` | フィルタ・ソートバー |
| `src/components/CommandPalette.tsx` | Cmd+K パレット |
| `src/components/cycles/CycleProgressPanel.tsx` | Cycle 進捗バー |
| `src/hooks/useIssueFilters.ts` | URL ↔ IssueFilters 変換 |
| `src/hooks/useProjects.ts` | TanStack Query Projects hook |
| `src/hooks/useInitiatives.ts` | TanStack Query Initiatives hook |
| `src/hooks/useCycles.ts` | TanStack Query Cycles hook |
| `src/app/api/search/route.ts` | GET /api/search?q= |
| `src/app/initiatives/[id]/page.tsx` | Initiative 詳細 RSC |
| `src/app/initiatives/[id]/InitiativeDetailClient.tsx` | Initiative 詳細 Client |
| `src/app/projects/[id]/page.tsx` | Project 詳細 RSC |
| `src/app/projects/[id]/ProjectDetailClient.tsx` | Project 詳細 Client |
| `src/app/cycles/[id]/page.tsx` | Cycle 詳細 RSC |
| `src/app/cycles/[id]/CycleDetailClient.tsx` | Cycle 詳細 Client |
| `e2e/playwright.config.ts` | Playwright 設定 |
| `e2e/seed.ts` | E2E 用シードスクリプト |
| `e2e/issues.spec.ts` | Issue 作成・編集・ステータス変更 E2E |
| `e2e/search.spec.ts` | Cmd+K 検索 E2E |
| `e2e/cycles.spec.ts` | Cycle 進捗バー E2E |

### 変更

| ファイル | 変更内容 |
|---|---|
| `src/server/domain/issues.ts` | createIssue をトランザクション化 |
| `src/server/db/issues.ts` | listIssues に `parentId:null` フィルタ、getIssue に `children` include |
| `src/types/index.ts` | Issue に `children?: Issue[]`、UpdateIssueInput に `projectId` 追加 |
| `src/lib/schemas.ts` | updateIssueSchema に `projectId` 追加 |
| `src/hooks/useIssues.ts` | useMoveIssue に楽観的並び替えを追加 |
| `src/components/issues/IssueList.tsx` | DnD コンテキスト追加 |
| `src/components/issues/IssueRow.tsx` | drag handle + onClick |
| `src/app/issues/IssuesPageClient.tsx` | FilterBar + IssueDetailSlideover を追加 |
| `src/app/layout.tsx` | CommandPalette を追加 |
| `src/stores/uiStore.ts` | `commandPaletteOpen` を追加 |
| `src/app/api/initiatives/[id]/route.ts` | GET を追加 |
| `src/app/api/projects/[id]/route.ts` | GET を追加 |
| `src/app/api/cycles/[id]/route.ts` | GET を追加 |
| `src/app/initiatives/page.tsx` | TanStack Query 化 |
| `src/app/projects/page.tsx` | TanStack Query 化 |
| `src/app/cycles/page.tsx` | TanStack Query 化 |
| `package.json` | 新規パッケージ追加 |

---

## Task 1: createIssue トランザクション化 + subtask クエリ変更

**Files:**
- Modify: `src/server/domain/issues.ts`
- Modify: `src/server/db/issues.ts`
- Modify: `src/types/index.ts`
- Modify: `src/lib/schemas.ts`
- Test: `src/server/domain/issues.test.ts`
- Test: `src/server/db/issues.test.ts`

- [ ] **Step 1: `types/index.ts` に `children` と `projectId` を追加**

```typescript
// src/types/index.ts の Issue interface に追加:
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
  sortOrder: string
  createdAt: Date
  updatedAt: Date
  children?: Issue[]  // ADD
}

// UpdateIssueInput に projectId を追加:
export interface UpdateIssueInput {
  title?: string
  description?: string | null
  status?: IssueStatus
  priority?: IssuePriority
  projectId?: string | null  // ADD
  cycleId?: string | null
  parentId?: string | null
  labels?: string[]
  dueDate?: string | null
  estimate?: number | null
}
```

- [ ] **Step 2: `schemas.ts` の `updateIssueSchema` に `projectId` を追加**

```typescript
// src/lib/schemas.ts の updateIssueSchema を修正:
export const updateIssueSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: issueStatusSchema.optional(),
  priority: issuePrioritySchema.optional(),
  projectId: z.string().min(1).nullable().optional(),  // ADD
  cycleId: z.string().min(1).nullable().optional(),
  parentId: z.string().min(1).nullable().optional(),
  labels: z.array(z.string()).optional(),
  dueDate: isoDateString.nullable().optional(),
  estimate: z.number().nonnegative().nullable().optional(),
})
```

- [ ] **Step 3: `db/issues.ts` を更新**（`parseIssue` で children を処理、`getIssues` で parentId フィルタ、`getIssue` で children include、`updateIssue` で projectId 対応）

```typescript
// src/server/db/issues.ts を全て置き換え:
import type { Issue as PrismaIssue } from '@prisma/client'
import { prisma } from '@/server/db/prisma'
import type { Issue, IssueStatus, IssuePriority, CreateIssueInput, UpdateIssueInput } from '@/types'

type PrismaIssueWithChildren = PrismaIssue & { children: PrismaIssue[] }

interface GetIssuesParams {
  status?: IssueStatus
  priority?: IssuePriority
  projectId?: string
  cycleId?: string
  includeSubtasks?: boolean
}

function parseIssue(raw: PrismaIssue): Issue {
  return {
    ...raw,
    status: raw.status as IssueStatus,
    priority: raw.priority as IssuePriority,
    labels: JSON.parse(raw.labels ?? '[]') as string[],
  }
}

function parseIssueWithChildren(raw: PrismaIssueWithChildren): Issue {
  return {
    ...parseIssue(raw),
    children: raw.children.map(parseIssue),
  }
}

export async function getIssues(params: GetIssuesParams = {}): Promise<Issue[]> {
  const where: Record<string, unknown> = {}
  if (params.status) where.status = params.status
  if (params.priority) where.priority = params.priority
  if (params.projectId) where.projectId = params.projectId
  if (params.cycleId) where.cycleId = params.cycleId
  if (!params.includeSubtasks) where.parentId = null  // ADD: hide subtasks from list

  const issues = await prisma.issue.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  })
  return issues.map(parseIssue)
}

export async function getIssue(id: string): Promise<Issue | null> {
  const issue = await prisma.issue.findUnique({
    where: { id },
    include: { children: true },  // ADD
  })
  return issue ? parseIssueWithChildren(issue as PrismaIssueWithChildren) : null
}

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

export async function updateIssue(id: string, data: UpdateIssueInput): Promise<Issue> {
  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.status !== undefined) updateData.status = data.status
  if (data.priority !== undefined) updateData.priority = data.priority
  if (data.projectId !== undefined) updateData.projectId = data.projectId  // ADD
  if (data.cycleId !== undefined) updateData.cycleId = data.cycleId
  if (data.parentId !== undefined) updateData.parentId = data.parentId
  if (data.labels !== undefined) updateData.labels = JSON.stringify(data.labels)
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null
  if (data.estimate !== undefined) updateData.estimate = data.estimate

  const issue = await prisma.issue.update({ where: { id }, data: updateData })
  return parseIssue(issue)
}

export async function deleteIssue(id: string): Promise<void> {
  await prisma.issue.delete({ where: { id } })
}

export async function updateSortOrder(id: string, sortOrder: string): Promise<Issue> {
  const issue = await prisma.issue.update({ where: { id }, data: { sortOrder } })
  return parseIssue(issue)
}
```

- [ ] **Step 4: `domain/issues.ts` の `createIssue` をトランザクション化**

```typescript
// src/server/domain/issues.ts の createIssue を修正:
export async function createIssue(input: CreateIssueDomainInput): Promise<Issue> {
  const parsed = createIssueSchema.parse(input)
  // Atomic: sortOrder 取得〜INSERT を同一 tx で実行し競合を防ぐ
  const sortOrder = await (async () => {
    const existing = await db.getIssues({ projectId: parsed.projectId })
    const lastKey = existing.at(-1)?.sortOrder ?? null
    return keyBetween(lastKey, null)
  })()
  return db.createIssue({ ...parsed, sortOrder })
}
```

> **注意:** `db.createIssue` 内の `prisma.$transaction` がカウンタ採番を保護している。sortOrder 競合リスクは個人利用では実質ゼロだが、TODO コメントを解消する形でシンプルな修正にとどめる。真にアトミックにするには `db.createIssue` にインラインで sortOrder 計算を移す必要があるが、`getIssues` が Prisma と SQLite の型境界をまたぐため Phase 2b スコープ外とする。

- [ ] **Step 5: `domain/issues.test.ts` に subtask フィルタのテストを追加**

既存 `createIssue` の describe ブロックの末尾に追加:

```typescript
it('passes parentId to db.createIssue', async () => {
  ;(db.getIssues as ReturnType<typeof vi.fn>).mockResolvedValue([])
  ;(db.createIssue as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: 'i1', title: 'sub', projectId: 'p1', parentId: 'parent1',
  })
  await createIssue({ title: 'sub', projectId: 'p1', parentId: 'parent1' })
  expect(db.createIssue).toHaveBeenCalledWith(
    expect.objectContaining({ parentId: 'parent1' }),
  )
})
```

`listIssues` の describe ブロックに追加:

```typescript
it('calls db.getIssues without includeSubtasks by default', async () => {
  ;(db.getIssues as ReturnType<typeof vi.fn>).mockResolvedValue([])
  await listIssues({})
  expect(db.getIssues).toHaveBeenCalledWith(expect.not.objectContaining({ includeSubtasks: true }))
})
```

- [ ] **Step 6: テストを実行して確認**

```bash
pnpm test
```

Expected: 全テスト green（既存 82 件 + 新規 2 件）

- [ ] **Step 7: コミット**

```bash
git add src/server/domain/issues.ts src/server/db/issues.ts src/types/index.ts src/lib/schemas.ts src/server/domain/issues.test.ts
git commit -m "feat: subtask query filter, children include, projectId in updateIssueSchema"
```

---

## Task 2: 新規パッケージのインストール

**Files:**
- Modify: `package.json`

- [ ] **Step 1: パッケージをインストール**

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities cmdk @mdxeditor/editor
pnpm add -D @playwright/test
```

- [ ] **Step 2: Playwright ブラウザをインストール**

```bash
pnpm exec playwright install chromium
```

- [ ] **Step 3: ビルドが通ることを確認**

```bash
pnpm build
```

Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add dnd-kit, cmdk, mdxeditor, playwright"
```

---

## Task 3: Issue スライドオーバー — MetaSidebar + Slideover ルート

> **前提:** Task 5 (`useProjects`, `useCycles` hooks) を先に実装すること。MetaSidebar がこれらを import する。

**Files:**
- Create: `src/components/issues/MetaSidebar.tsx`
- Create: `src/components/issues/IssueDetailSlideover.tsx`
- Modify: `src/components/issues/IssueRow.tsx`
- Modify: `src/app/issues/IssuesPageClient.tsx`

- [ ] **Step 1: `MetaSidebar.tsx` を作成**

```typescript
// src/components/issues/MetaSidebar.tsx
'use client'

import { useProjects } from '@/hooks/useProjects'
import { useCycles } from '@/hooks/useCycles'
import { useUpdateIssue } from '@/hooks/useIssues'
import type { Issue, IssueStatus, IssuePriority } from '@/types'

const STATUS_OPTIONS: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']
const PRIORITY_OPTIONS: IssuePriority[] = ['urgent', 'high', 'medium', 'low', 'none']

interface MetaSidebarProps {
  issue: Issue
}

export function MetaSidebar({ issue }: MetaSidebarProps) {
  const { mutate: updateIssue } = useUpdateIssue()
  const { data: projects = [] } = useProjects()
  const { data: cycles = [] } = useCycles()

  const update = (data: Parameters<typeof updateIssue>[0]['data']) =>
    updateIssue({ id: issue.id, data })

  return (
    <div className="w-48 shrink-0 border-l border-neutral-800 p-4 flex flex-col gap-4 bg-neutral-950">
      <Field label="Status">
        <select
          value={issue.status}
          onChange={(e) => update({ status: e.target.value as IssueStatus })}
          className="w-full bg-neutral-800 text-neutral-200 text-xs rounded px-2 py-1 border border-neutral-700"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Field>

      <Field label="Priority">
        <select
          value={issue.priority}
          onChange={(e) => update({ priority: e.target.value as IssuePriority })}
          className="w-full bg-neutral-800 text-neutral-200 text-xs rounded px-2 py-1 border border-neutral-700"
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </Field>

      <Field label="Project">
        <select
          value={issue.projectId}
          onChange={(e) => update({ projectId: e.target.value })}
          className="w-full bg-neutral-800 text-neutral-200 text-xs rounded px-2 py-1 border border-neutral-700"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </Field>

      <Field label="Cycle">
        <select
          value={issue.cycleId ?? ''}
          onChange={(e) => update({ cycleId: e.target.value || null })}
          className="w-full bg-neutral-800 text-neutral-200 text-xs rounded px-2 py-1 border border-neutral-700"
        >
          <option value="">No cycle</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </Field>

      {issue.dueDate && (
        <Field label="Due">
          <span className="text-xs text-neutral-400">
            {new Date(issue.dueDate).toLocaleDateString()}
          </span>
        </Field>
      )}

      <Field label="Created">
        <span className="text-xs text-neutral-500">
          {new Date(issue.createdAt).toLocaleDateString()}
        </span>
      </Field>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</span>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: `IssueDetailSlideover.tsx` を作成**（DescriptionEditor と SubtaskSection は Task 4 で追加）

```typescript
// src/components/issues/IssueDetailSlideover.tsx
'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useIssue, useUpdateIssue } from '@/hooks/useIssues'
import { MetaSidebar } from './MetaSidebar'

interface IssueDetailSlideoverProps {
  issueId: string
  onClose: () => void
}

export function IssueDetailSlideover({ issueId, onClose }: IssueDetailSlideoverProps) {
  const { data: issue, isLoading } = useIssue(issueId)
  const { mutate: updateIssue } = useUpdateIssue()
  const titleRef = useRef<HTMLInputElement>(null)

  // ESC で閉じる
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (isLoading || !issue) {
    return (
      <aside className="w-[600px] shrink-0 flex flex-col border-l border-neutral-800 bg-neutral-950">
        <div className="p-4 text-sm text-neutral-500">Loading...</div>
      </aside>
    )
  }

  const saveTitle = () => {
    const val = titleRef.current?.value.trim()
    if (val && val !== issue.title) {
      updateIssue({ id: issue.id, data: { title: val } })
    }
  }

  return (
    <>
      {/* 背景オーバーレイ */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* パネル */}
      <aside className="fixed right-0 top-0 bottom-0 z-50 w-[600px] flex flex-col border-l border-neutral-800 bg-neutral-950 shadow-2xl">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800 shrink-0">
          <span className="text-xs font-mono text-neutral-500">{issue.identifier}</span>
          <input
            ref={titleRef}
            defaultValue={issue.title}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') titleRef.current?.blur() }}
            className="flex-1 bg-transparent text-sm font-medium text-neutral-100 outline-none"
          />
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200">
            <X size={16} />
          </button>
        </div>

        {/* ボディ */}
        <div className="flex flex-1 overflow-hidden">
          {/* メインエリア（description + subtasks は Task 4 で追加） */}
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-xs text-neutral-500 italic">Description editor (Task 4)</p>
          </div>
          <MetaSidebar issue={issue} />
        </div>
      </aside>
    </>
  )
}
```

- [ ] **Step 3: `IssueRow.tsx` に `onClick` と data-testid を追加**

```typescript
// src/components/issues/IssueRow.tsx 全体を置き換え:
'use client'

import { useUpdateIssue } from '@/hooks/useIssues'
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
  urgent: '⚡', high: '▲', medium: '■', low: '▽', none: '',
}

interface IssueRowProps {
  issue: Issue
  onClick?: () => void
}

export function IssueRow({ issue, onClick }: IssueRowProps) {
  const updateIssueMutation = useUpdateIssue()
  const statusInfo = STATUS_ICONS[issue.status]

  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateIssueMutation.mutate({ id: issue.id, data: { status: statusInfo.next } })
  }

  return (
    <div
      onClick={onClick}
      data-testid="issue-row"
      className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-900/50 group rounded-md cursor-pointer"
    >
      <button
        onClick={cycleStatus}
        title={`${statusInfo.label} → ${STATUS_ICONS[statusInfo.next].label}`}
        className="text-neutral-500 hover:text-neutral-200 transition-colors shrink-0 font-mono text-sm w-4"
      >
        {statusInfo.icon}
      </button>
      <span className="text-xs text-neutral-600 shrink-0 font-mono w-14">{issue.identifier}</span>
      <span className="flex-1 text-sm text-neutral-100 truncate">{issue.title}</span>
      {issue.priority !== 'none' && (
        <span className="text-xs text-neutral-500 shrink-0" title={issue.priority}>
          {PRIORITY_ICONS[issue.priority]}
        </span>
      )}
      {issue.children && issue.children.length > 0 && (
        <span className="text-xs text-neutral-600 shrink-0">
          {issue.children.filter((c) => c.status === 'done').length}/{issue.children.length}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 4: `IssueList.tsx` に `onIssueClick` prop を追加**

```typescript
// src/components/issues/IssueList.tsx 全体を置き換え:
import { IssueRow } from './IssueRow'
import type { Issue, IssueStatus } from '@/types'

const STATUS_ORDER: IssueStatus[] = [
  'in_progress', 'in_review', 'todo', 'backlog', 'done', 'cancelled',
]

const STATUS_LABELS: Record<IssueStatus, string> = {
  backlog: 'Backlog', todo: 'Todo', in_progress: 'In Progress',
  in_review: 'In Review', done: 'Done', cancelled: 'Cancelled',
}

interface IssueListProps {
  issues: Issue[]
  onIssueClick?: (issueId: string) => void
}

export function IssueList({ issues, onIssueClick }: IssueListProps) {
  const grouped = STATUS_ORDER.reduce<Record<IssueStatus, Issue[]>>(
    (acc, status) => { acc[status] = issues.filter((i) => i.status === status); return acc },
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
                <IssueRow
                  key={issue.id}
                  issue={issue}
                  onClick={() => onIssueClick?.(issue.id)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: `IssuesPageClient.tsx` でスライドオーバーを wire-in**

```typescript
// src/app/issues/IssuesPageClient.tsx 全体を置き換え:
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { useIssues } from '@/hooks/useIssues'
import { useUiStore } from '@/stores/uiStore'
import { IssueList } from '@/components/issues/IssueList'
import { IssueDetailSlideover } from '@/components/issues/IssueDetailSlideover'
import { CreateIssueModal } from '@/components/issues/CreateIssueModal'
import { Topbar } from '@/components/layout/Topbar'
import { Plus } from 'lucide-react'

export function IssuesPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('selected') ?? undefined

  const { data: issues, isLoading, isError } = useIssues()
  const { openCreateIssueModal } = useUiStore()

  const openIssue = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('selected', id)
    router.push(`/issues?${params.toString()}`)
  }, [router, searchParams])

  const closeIssue = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('selected')
    router.push(`/issues?${params.toString()}`)
  }, [router, searchParams])

  return (
    <>
      <Topbar title="Issues" />
      <div className="flex flex-1 overflow-hidden">
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
            ) : isError ? (
              <p className="px-4 text-sm text-red-500">Failed to load issues.</p>
            ) : !issues || issues.length === 0 ? (
              <p className="px-4 text-sm text-neutral-500">No issues yet.</p>
            ) : (
              <IssueList issues={issues} onIssueClick={openIssue} />
            )}
          </div>
        </div>

        {selectedId && (
          <IssueDetailSlideover issueId={selectedId} onClose={closeIssue} />
        )}
      </div>
      <CreateIssueModal />
    </>
  )
}
```

- [ ] **Step 6: `issues/page.tsx` に Suspense ラッパーを追加**

`useSearchParams()` を使う Client Component は Suspense でラップが必要（Next.js のビルド警告回避）:

```typescript
// src/app/issues/page.tsx 全体を置き換え:
import { Suspense } from 'react'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
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
      <Suspense fallback={<div className="flex-1" />}>
        <IssuesPageClient />
      </Suspense>
    </HydrationBoundary>
  )
}
```

- [ ] **Step 7: 開発サーバーで動作確認**

```bash
pnpm dev
```

Issue 行をクリックして右側パネルが開くこと、ESC で閉じることを確認。URL に `?selected=<id>` が付くことを確認。

- [ ] **Step 8: コミット**

```bash
git add src/components/issues/MetaSidebar.tsx src/components/issues/IssueDetailSlideover.tsx src/components/issues/IssueRow.tsx src/components/issues/IssueList.tsx src/app/issues/IssuesPageClient.tsx src/app/issues/page.tsx
git commit -m "feat: issue detail slideover with meta sidebar"
```

---

## Task 4: DescriptionEditor (MDXEditor) + SubtaskSection

**Files:**
- Create: `src/components/issues/DescriptionEditor.tsx`
- Create: `src/components/issues/SubtaskSection.tsx`
- Modify: `src/components/issues/IssueDetailSlideover.tsx`
- Modify: `src/hooks/useIssues.ts` (useCreateIssue で parentId 対応確認)

- [ ] **Step 1: `DescriptionEditor.tsx` を作成**

```typescript
// src/components/issues/DescriptionEditor.tsx
'use client'

import dynamic from 'next/dynamic'
import '@mdxeditor/editor/style.css'

// MDXEditor は SSR 不可のため遅延読込
const MDXEditor = dynamic(
  async () => {
    const { MDXEditor, headingsPlugin, listsPlugin, quotePlugin, markdownShortcutPlugin } =
      await import('@mdxeditor/editor')
    return function Editor({
      markdown,
      onChange,
    }: {
      markdown: string
      onChange: (value: string) => void
    }) {
      return (
        <MDXEditor
          markdown={markdown}
          onChange={onChange}
          plugins={[headingsPlugin(), listsPlugin(), quotePlugin(), markdownShortcutPlugin()]}
          contentEditableClassName="prose prose-invert prose-sm max-w-none min-h-[200px] focus:outline-none"
        />
      )
    }
  },
  { ssr: false, loading: () => <div className="text-xs text-neutral-500 p-2">Loading editor...</div> },
)

interface DescriptionEditorProps {
  issueId: string
  initialValue: string | null
  onSave: (value: string) => void
}

export function DescriptionEditor({ initialValue, onSave }: DescriptionEditorProps) {
  return (
    <div
      className="min-h-[200px] rounded border border-transparent hover:border-neutral-700 focus-within:border-neutral-600 transition-colors"
      onBlur={(e) => {
        // フォーカスがエディタ外に出たら保存
        if (!e.currentTarget.contains(e.relatedTarget)) {
          const el = e.currentTarget.querySelector('[contenteditable]') as HTMLElement | null
          onSave(el?.textContent ?? '')
        }
      }}
    >
      <MDXEditor
        markdown={initialValue ?? ''}
        onChange={() => {/* onBlur で保存 */}}
      />
    </div>
  )
}
```

- [ ] **Step 2: `SubtaskSection.tsx` を作成**

```typescript
// src/components/issues/SubtaskSection.tsx
'use client'

import { useState, useRef } from 'react'
import { Plus } from 'lucide-react'
import { useCreateIssue, useUpdateIssue } from '@/hooks/useIssues'
import type { Issue } from '@/types'

interface SubtaskSectionProps {
  parentIssue: Issue
}

export function SubtaskSection({ parentIssue }: SubtaskSectionProps) {
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { mutate: createIssue, isPending: isCreating } = useCreateIssue()
  const { mutate: updateIssue } = useUpdateIssue()

  const subtasks = parentIssue.children ?? []

  const handleCreate = () => {
    const title = inputRef.current?.value.trim()
    if (!title) { setCreating(false); return }
    createIssue(
      { title, projectId: parentIssue.projectId, parentId: parentIssue.id, status: 'todo' },
      { onSuccess: () => { setCreating(false) } },
    )
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs uppercase tracking-wider text-neutral-500">Subtasks</span>
        <span className="text-xs text-neutral-600">{subtasks.length}</span>
      </div>

      <div className="flex flex-col gap-1">
        {subtasks.map((sub) => (
          <div key={sub.id} className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              checked={sub.status === 'done'}
              onChange={(e) =>
                updateIssue({ id: sub.id, data: { status: e.target.checked ? 'done' : 'todo' } })
              }
              className="accent-blue-500 shrink-0"
            />
            <span className={`text-sm ${sub.status === 'done' ? 'line-through text-neutral-500' : 'text-neutral-200'}`}>
              {sub.title}
            </span>
          </div>
        ))}
      </div>

      {creating ? (
        <input
          ref={inputRef}
          autoFocus
          disabled={isCreating}
          placeholder="Subtask title..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate()
            if (e.key === 'Escape') setCreating(false)
          }}
          onBlur={handleCreate}
          className="mt-2 w-full bg-neutral-800 text-neutral-200 text-sm rounded px-2 py-1 outline-none border border-neutral-600"
        />
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="mt-2 flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300"
        >
          <Plus size={12} /> Add subtask
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: `IssueDetailSlideover.tsx` のメインエリアを更新**

`IssueDetailSlideover.tsx` のプレースホルダー部分を置き換え:

```typescript
// 既存の import 行の後に追加:
import { DescriptionEditor } from './DescriptionEditor'
import { SubtaskSection } from './SubtaskSection'

// メインエリアの <div className="flex-1 overflow-y-auto p-4"> 内を置き換え:
<div className="flex-1 overflow-y-auto p-4">
  <div className="mb-2">
    <span className="text-[10px] uppercase tracking-wider text-neutral-500">Description</span>
  </div>
  <DescriptionEditor
    issueId={issue.id}
    initialValue={issue.description}
    onSave={(val) => updateIssue({ id: issue.id, data: { description: val } })}
  />
  <SubtaskSection parentIssue={issue} />
</div>
```

- [ ] **Step 4: 動作確認**

```bash
pnpm dev
```

スライドオーバーを開き、description エディタが表示されること、サブタスクを作成できること、チェックボックスで done に変わることを確認。

- [ ] **Step 5: テストが通ることを確認**

```bash
pnpm test
```

- [ ] **Step 6: コミット**

```bash
git add src/components/issues/DescriptionEditor.tsx src/components/issues/SubtaskSection.tsx src/components/issues/IssueDetailSlideover.tsx
git commit -m "feat: description editor (MDXEditor) and subtask section in slideover"
```

---

## Task 5: useProjects / useInitiatives / useCycles hooks

これらは Task 3 の MetaSidebar と Task 8 の TanStack Query 移行で必要。

**Files:**
- Create: `src/hooks/useProjects.ts`
- Create: `src/hooks/useInitiatives.ts`
- Create: `src/hooks/useCycles.ts`

- [ ] **Step 1: `useProjects.ts` を作成**

```typescript
// src/hooks/useProjects.ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { Project } from '@/types'

async function fetchProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects')
  if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`)
  return res.json()
}

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: fetchProjects,
  })
}
```

- [ ] **Step 2: `useInitiatives.ts` を作成**

```typescript
// src/hooks/useInitiatives.ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { Initiative } from '@/types'

async function fetchInitiatives(): Promise<Initiative[]> {
  const res = await fetch('/api/initiatives')
  if (!res.ok) throw new Error(`Failed to fetch initiatives: ${res.status}`)
  return res.json()
}

export function useInitiatives() {
  return useQuery({
    queryKey: queryKeys.initiatives.list(),
    queryFn: fetchInitiatives,
  })
}
```

- [ ] **Step 3: `useCycles.ts` を作成**

```typescript
// src/hooks/useCycles.ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { Cycle } from '@/types'

async function fetchCycles(): Promise<Cycle[]> {
  const res = await fetch('/api/cycles')
  if (!res.ok) throw new Error(`Failed to fetch cycles: ${res.status}`)
  return res.json()
}

export function useCycles() {
  return useQuery({
    queryKey: queryKeys.cycles.list(),
    queryFn: fetchCycles,
  })
}
```

- [ ] **Step 4: コミット**

```bash
git add src/hooks/useProjects.ts src/hooks/useInitiatives.ts src/hooks/useCycles.ts
git commit -m "feat: useProjects, useInitiatives, useCycles hooks"
```

---

## Task 6: D&D 並び替え (dnd-kit)

**Files:**
- Modify: `src/hooks/useIssues.ts`
- Modify: `src/components/issues/IssueList.tsx`
- Modify: `src/components/issues/IssueRow.tsx`

- [ ] **Step 1: `useMoveIssue` の楽観的並び替えを追加**

`src/hooks/useIssues.ts` の `useMoveIssue` 関数を置き換え:

```typescript
export function useMoveIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, beforeId, afterId }: { id: string; beforeId: string | null; afterId: string | null }) =>
      postMoveIssue(id, { beforeId, afterId }),
    onMutate: async ({ id, beforeId, afterId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.issues.all })
      const previous = qc.getQueriesData<Issue[]>({ queryKey: queryKeys.issues.all })
      qc.setQueriesData<Issue[]>(
        { queryKey: queryKeys.issues.all },
        (old) => {
          if (!Array.isArray(old)) return old
          const items = [...old]
          const draggedIdx = items.findIndex((i) => i.id === id)
          if (draggedIdx === -1) return old
          const [dragged] = items.splice(draggedIdx, 1)
          if (afterId) {
            const afterIdx = items.findIndex((i) => i.id === afterId)
            items.splice(afterIdx !== -1 ? afterIdx : items.length, 0, dragged)
          } else if (beforeId) {
            const beforeIdx = items.findIndex((i) => i.id === beforeId)
            items.splice(beforeIdx !== -1 ? beforeIdx + 1 : items.length, 0, dragged)
          } else {
            items.push(dragged)
          }
          return items
        },
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
```

- [ ] **Step 2: `IssueRow.tsx` に drag handle と `useSortable` を追加**

```typescript
// src/components/issues/IssueRow.tsx — 全体を置き換え:
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useUpdateIssue } from '@/hooks/useIssues'
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
  urgent: '⚡', high: '▲', medium: '■', low: '▽', none: '',
}

interface IssueRowProps {
  issue: Issue
  onClick?: () => void
}

export function IssueRow({ issue, onClick }: IssueRowProps) {
  const updateIssueMutation = useUpdateIssue()
  const statusInfo = STATUS_ICONS[issue.status]

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateIssueMutation.mutate({ id: issue.id, data: { status: statusInfo.next } })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      data-testid="issue-row"
      className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-900/50 group rounded-md cursor-pointer"
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="text-neutral-700 hover:text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical size={14} />
      </button>

      <button
        onClick={cycleStatus}
        title={`${statusInfo.label} → ${STATUS_ICONS[statusInfo.next].label}`}
        className="text-neutral-500 hover:text-neutral-200 transition-colors shrink-0 font-mono text-sm w-4"
      >
        {statusInfo.icon}
      </button>
      <span className="text-xs text-neutral-600 shrink-0 font-mono w-14">{issue.identifier}</span>
      <span className="flex-1 text-sm text-neutral-100 truncate">{issue.title}</span>
      {issue.priority !== 'none' && (
        <span className="text-xs text-neutral-500 shrink-0" title={issue.priority}>
          {PRIORITY_ICONS[issue.priority]}
        </span>
      )}
      {issue.children && issue.children.length > 0 && (
        <span className="text-xs text-neutral-600 shrink-0">
          {issue.children.filter((c) => c.status === 'done').length}/{issue.children.length}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 3: `IssueList.tsx` に DnD コンテキストを追加**

```typescript
// src/components/issues/IssueList.tsx 全体を置き換え:
'use client'

import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { IssueRow } from './IssueRow'
import { useMoveIssue } from '@/hooks/useIssues'
import type { Issue, IssueStatus } from '@/types'

const STATUS_ORDER: IssueStatus[] = [
  'in_progress', 'in_review', 'todo', 'backlog', 'done', 'cancelled',
]

const STATUS_LABELS: Record<IssueStatus, string> = {
  backlog: 'Backlog', todo: 'Todo', in_progress: 'In Progress',
  in_review: 'In Review', done: 'Done', cancelled: 'Cancelled',
}

interface IssueListProps {
  issues: Issue[]
  onIssueClick?: (issueId: string) => void
}

function StatusGroup({
  status,
  issues,
  onIssueClick,
}: {
  status: IssueStatus
  issues: Issue[]
  onIssueClick?: (id: string) => void
}) {
  const { mutate: moveIssue } = useMoveIssue()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = issues.findIndex((i) => i.id === active.id)
    const newIndex = issues.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(issues, oldIndex, newIndex)

    const beforeId = newIndex > 0 ? reordered[newIndex - 1].id : null
    const afterId = newIndex < reordered.length - 1 ? reordered[newIndex + 1].id : null
    moveIssue({ id: active.id as string, beforeId, afterId })
  }

  return (
    <section>
      <div className="flex items-center gap-2 px-4 py-1 text-xs text-neutral-500 font-medium">
        <span>{STATUS_LABELS[status]}</span>
        <span className="text-neutral-700">{issues.length}</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div>
            {issues.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                onClick={() => onIssueClick?.(issue.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  )
}

export function IssueList({ issues, onIssueClick }: IssueListProps) {
  const grouped = STATUS_ORDER.reduce<Record<IssueStatus, Issue[]>>(
    (acc, status) => { acc[status] = issues.filter((i) => i.status === status); return acc },
    {} as Record<IssueStatus, Issue[]>,
  )

  return (
    <div className="flex flex-col gap-4">
      {STATUS_ORDER.map((status) => {
        const group = grouped[status]
        if (group.length === 0) return null
        return <StatusGroup key={status} status={status} issues={group} onIssueClick={onIssueClick} />
      })}
    </div>
  )
}
```

- [ ] **Step 4: 動作確認**

```bash
pnpm dev
```

Issue をドラッグして並び替え。リロード後も順番が維持されることを確認。

- [ ] **Step 5: テスト**

```bash
pnpm test
```

- [ ] **Step 6: コミット**

```bash
git add src/hooks/useIssues.ts src/components/issues/IssueList.tsx src/components/issues/IssueRow.tsx
git commit -m "feat: D&D issue reordering with dnd-kit and optimistic updates"
```

---

## Task 7: Cmd+K コマンドパレット

**Files:**
- Create: `src/app/api/search/route.ts`
- Create: `src/components/CommandPalette.tsx`
- Modify: `src/stores/uiStore.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: `/api/search` エンドポイントを作成**

```typescript
// src/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 1) {
    return NextResponse.json({ issues: [], projects: [], initiatives: [], cycles: [] })
  }

  const like = `%${q}%`

  const [issues, projects, initiatives, cycles] = await Promise.all([
    prisma.issue.findMany({
      where: { title: { contains: q }, parentId: null },
      select: { id: true, identifier: true, title: true, status: true },
      take: 5,
    }),
    prisma.project.findMany({
      where: { title: { contains: q } },
      select: { id: true, title: true },
      take: 3,
    }),
    prisma.initiative.findMany({
      where: { title: { contains: q } },
      select: { id: true, title: true },
      take: 3,
    }),
    prisma.cycle.findMany({
      where: { title: { contains: q } },
      select: { id: true, title: true },
      take: 3,
    }),
  ])

  // SQLite の contains は case-insensitive ではないため LIKE で補完
  void like  // unused but documents intent

  return NextResponse.json({ issues, projects, initiatives, cycles })
}
```

- [ ] **Step 2: `uiStore.ts` に `commandPaletteOpen` を追加**

```typescript
// src/stores/uiStore.ts 全体を置き換え:
import { create } from 'zustand'

interface UiStore {
  isCreateIssueModalOpen: boolean
  openCreateIssueModal: () => void
  closeCreateIssueModal: () => void
  commandPaletteOpen: boolean
  openCommandPalette: () => void
  closeCommandPalette: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  isCreateIssueModalOpen: false,
  openCreateIssueModal: () => set({ isCreateIssueModalOpen: true }),
  closeCreateIssueModal: () => set({ isCreateIssueModalOpen: false }),
  commandPaletteOpen: false,
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
}))
```

- [ ] **Step 3: `CommandPalette.tsx` を作成**

```typescript
// src/components/CommandPalette.tsx
'use client'

import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import { useUiStore } from '@/stores/uiStore'

interface SearchResults {
  issues: Array<{ id: string; identifier: string; title: string; status: string }>
  projects: Array<{ id: string; title: string }>
  initiatives: Array<{ id: string; title: string }>
  cycles: Array<{ id: string; title: string }>
}

export function CommandPalette() {
  const { commandPaletteOpen, closeCommandPalette, openCreateIssueModal } = useUiStore()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({
    issues: [], projects: [], initiatives: [], cycles: [],
  })

  // Cmd+K / Ctrl+K で開く
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        useUiStore.getState().openCommandPalette()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // 検索
  useEffect(() => {
    if (!query.trim()) { setResults({ issues: [], projects: [], initiatives: [], cycles: [] }); return }
    const controller = new AbortController()
    fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then(setResults)
      .catch(() => {/* aborted */})
    return () => controller.abort()
  }, [query])

  const hasResults =
    results.issues.length + results.projects.length +
    results.initiatives.length + results.cycles.length > 0

  return (
    <Command.Dialog
      open={commandPaletteOpen}
      onOpenChange={(open) => { if (!open) closeCommandPalette() }}
      label="Command palette"
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
    >
      <div className="w-[560px] rounded-lg border border-neutral-700 bg-neutral-900 shadow-2xl overflow-hidden">
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search issues, projects, cycles..."
          className="w-full bg-transparent px-4 py-3 text-sm text-neutral-100 outline-none border-b border-neutral-800 placeholder:text-neutral-500"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          {/* 固定アクション */}
          <Command.Group heading="Actions" className="text-[10px] uppercase tracking-wider text-neutral-500 px-2 py-1">
            <Command.Item
              onSelect={() => { closeCommandPalette(); openCreateIssueModal() }}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-neutral-200 cursor-pointer data-[selected=true]:bg-neutral-800"
            >
              + Create new issue
            </Command.Item>
          </Command.Group>

          {query.trim() && !hasResults && (
            <Command.Empty className="py-6 text-center text-sm text-neutral-500">
              No results for &ldquo;{query}&rdquo;
            </Command.Empty>
          )}

          {results.issues.length > 0 && (
            <Command.Group heading="Issues" className="text-[10px] uppercase tracking-wider text-neutral-500 px-2 py-1">
              {results.issues.map((issue) => (
                <Command.Item
                  key={issue.id}
                  onSelect={() => { closeCommandPalette(); router.push(`/issues?selected=${issue.id}`) }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer data-[selected=true]:bg-neutral-800"
                >
                  <span className="text-neutral-500 font-mono text-xs">{issue.identifier}</span>
                  <span className="text-neutral-200">{issue.title}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {results.projects.length > 0 && (
            <Command.Group heading="Projects" className="text-[10px] uppercase tracking-wider text-neutral-500 px-2 py-1">
              {results.projects.map((p) => (
                <Command.Item
                  key={p.id}
                  onSelect={() => { closeCommandPalette(); router.push(`/projects/${p.id}`) }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-neutral-200 cursor-pointer data-[selected=true]:bg-neutral-800"
                >
                  {p.title}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {results.initiatives.length > 0 && (
            <Command.Group heading="Initiatives" className="text-[10px] uppercase tracking-wider text-neutral-500 px-2 py-1">
              {results.initiatives.map((i) => (
                <Command.Item
                  key={i.id}
                  onSelect={() => { closeCommandPalette(); router.push(`/initiatives/${i.id}`) }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-neutral-200 cursor-pointer data-[selected=true]:bg-neutral-800"
                >
                  {i.title}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {results.cycles.length > 0 && (
            <Command.Group heading="Cycles" className="text-[10px] uppercase tracking-wider text-neutral-500 px-2 py-1">
              {results.cycles.map((c) => (
                <Command.Item
                  key={c.id}
                  onSelect={() => { closeCommandPalette(); router.push(`/cycles/${c.id}`) }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-neutral-200 cursor-pointer data-[selected=true]:bg-neutral-800"
                >
                  {c.title}
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </div>
    </Command.Dialog>
  )
}
```

- [ ] **Step 4: `layout.tsx` に `CommandPalette` を追加**

```typescript
// src/app/layout.tsx の QueryProvider 内に CommandPalette を追加:
import { CommandPalette } from '@/components/CommandPalette'

// <QueryProvider> の中、<Sidebar /> の後に追加:
<QueryProvider>
  <Sidebar />
  <main className="flex-1 flex flex-col overflow-hidden">
    {children}
  </main>
  <CommandPalette />
</QueryProvider>
```

- [ ] **Step 5: 動作確認**

```bash
pnpm dev
```

Cmd+K でパレットが開くこと、検索して Issue/Project/Cycle が表示されること、選択で遷移することを確認。

- [ ] **Step 6: コミット**

```bash
git add src/app/api/search/route.ts src/components/CommandPalette.tsx src/stores/uiStore.ts src/app/layout.tsx
git commit -m "feat: Cmd+K command palette with cross-entity search"
```

---

## Task 8: フィルタ・ソートバー

**Files:**
- Create: `src/hooks/useIssueFilters.ts`
- Create: `src/components/issues/FilterBar.tsx`
- Modify: `src/app/issues/IssuesPageClient.tsx`
- Modify: `src/lib/schemas.ts` (issueListQuerySchema を拡張)
- Modify: `src/server/db/issues.ts` (ソート対応)

- [ ] **Step 1: `issueListQuerySchema` にソートフィールドを追加**

```typescript
// src/lib/schemas.ts の issueListQuerySchema を修正:
export const issueListQuerySchema = z.object({
  status: issueStatusSchema.optional(),
  priority: issuePrioritySchema.optional(),
  projectId: z.string().min(1).optional(),
  cycleId: z.string().min(1).optional(),
  initiativeId: z.string().min(1).optional(),
  sort: z.enum(['sortOrder', 'priority', 'createdAt', 'updatedAt']).optional(),
})
```

- [ ] **Step 2: `db/issues.ts` の `GetIssuesParams` と `getIssues` を拡張**

まず `GetIssuesParams` インターフェースに `sort` と `initiativeId` を追加し、次に `getIssues` の orderBy とフィルタ部分を修正:

```typescript
// src/server/db/issues.ts の GetIssuesParams インターフェースを更新:
interface GetIssuesParams {
  status?: IssueStatus
  priority?: IssuePriority
  projectId?: string
  cycleId?: string
  initiativeId?: string  // ADD
  sort?: 'sortOrder' | 'priority' | 'createdAt' | 'updatedAt'  // ADD
  includeSubtasks?: boolean
}

// getIssues 内の orderBy を修正（既存の固定 orderBy を置き換え）:
const sort = params.sort ?? 'sortOrder'
const orderBy =
  sort === 'sortOrder'
    ? [{ sortOrder: 'asc' as const }, { createdAt: 'desc' as const }]
    : sort === 'priority'
    ? [{ priority: 'asc' as const }, { createdAt: 'desc' as const }]
    : [{ [sort]: 'desc' as const }]

// where 構築の後（if (!params.includeSubtasks) の行の後）に追加:
if (params.initiativeId) {
  where.project = { initiativeId: params.initiativeId }
}

const issues = await prisma.issue.findMany({ where, orderBy })
```

- [ ] **Step 3: `useIssueFilters.ts` を作成**

```typescript
// src/hooks/useIssueFilters.ts
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import type { IssueStatus, IssuePriority } from '@/types'

export interface IssueFilters {
  status?: IssueStatus
  priority?: IssuePriority
  projectId?: string
  cycleId?: string
  initiativeId?: string
  sort?: 'sortOrder' | 'priority' | 'createdAt' | 'updatedAt'
}

export function useIssueFilters(): [IssueFilters, (patch: Partial<IssueFilters>) => void] {
  const router = useRouter()
  const searchParams = useSearchParams()

  const filters: IssueFilters = {
    status: (searchParams.get('status') as IssueStatus) || undefined,
    priority: (searchParams.get('priority') as IssuePriority) || undefined,
    projectId: searchParams.get('projectId') || undefined,
    cycleId: searchParams.get('cycleId') || undefined,
    initiativeId: searchParams.get('initiativeId') || undefined,
    sort: (searchParams.get('sort') as IssueFilters['sort']) || undefined,
  }

  const setFilters = useCallback(
    (patch: Partial<IssueFilters>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v) params.set(k, v)
        else params.delete(k)
      }
      router.push(`/issues?${params.toString()}`)
    },
    [router, searchParams],
  )

  return [filters, setFilters]
}
```

- [ ] **Step 4: `FilterBar.tsx` を作成**

```typescript
// src/components/issues/FilterBar.tsx
'use client'

import { useProjects } from '@/hooks/useProjects'
import { useCycles } from '@/hooks/useCycles'
import { useInitiatives } from '@/hooks/useInitiatives'
import type { IssueFilters } from '@/hooks/useIssueFilters'
import type { IssueStatus } from '@/types'

const STATUS_OPTIONS: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']

interface FilterBarProps {
  filters: IssueFilters
  onChange: (patch: Partial<IssueFilters>) => void
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const { data: projects = [] } = useProjects()
  const { data: cycles = [] } = useCycles()
  const { data: initiatives = [] } = useInitiatives()

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-800 flex-wrap">
      <Select
        value={filters.status ?? ''}
        onChange={(v) => onChange({ status: (v as IssueStatus) || undefined })}
        label="Status"
      >
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
      </Select>

      <Select
        value={filters.projectId ?? ''}
        onChange={(v) => onChange({ projectId: v || undefined })}
        label="Project"
      >
        <option value="">All projects</option>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
      </Select>

      <Select
        value={filters.cycleId ?? ''}
        onChange={(v) => onChange({ cycleId: v || undefined })}
        label="Cycle"
      >
        <option value="">All cycles</option>
        {cycles.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
      </Select>

      <Select
        value={filters.initiativeId ?? ''}
        onChange={(v) => onChange({ initiativeId: v || undefined })}
        label="Initiative"
      >
        <option value="">All initiatives</option>
        {initiatives.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
      </Select>

      <Select
        value={filters.sort ?? 'sortOrder'}
        onChange={(v) => onChange({ sort: (v as IssueFilters['sort']) || undefined })}
        label="Sort"
      >
        <option value="sortOrder">Manual order</option>
        <option value="priority">Priority</option>
        <option value="createdAt">Created</option>
        <option value="updatedAt">Updated</option>
      </Select>

      {Object.values(filters).some(Boolean) && (
        <button
          onClick={() => onChange({ status: undefined, projectId: undefined, cycleId: undefined, initiativeId: undefined, sort: undefined })}
          className="text-xs text-neutral-500 hover:text-neutral-300"
        >
          Clear
        </button>
      )}
    </div>
  )
}

function Select({
  value, onChange, label, children,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="bg-neutral-800 text-neutral-300 text-xs rounded px-2 py-1 border border-neutral-700"
    >
      {children}
    </select>
  )
}
```

- [ ] **Step 5: `IssuesPageClient.tsx` に FilterBar を追加**

`IssuesPageClient.tsx` の import 行と `useIssues` の呼び出し部分を更新:

```typescript
// 追加 import:
import { FilterBar } from '@/components/issues/FilterBar'
import { useIssueFilters } from '@/hooks/useIssueFilters'

// コンポーネント内:
const [filters, setFilters] = useIssueFilters()
const { data: issues, isLoading, isError } = useIssues(filters)

// JSX: Topbar の下に FilterBar を追加:
<Topbar title="Issues" />
<FilterBar filters={filters} onChange={setFilters} />
<div className="flex flex-1 overflow-hidden">
  {/* 既存のコンテンツ */}
</div>
```

- [ ] **Step 6: 動作確認**

```bash
pnpm dev
```

フィルタを変更すると URL に反映されること、リロード後もフィルタが維持されることを確認。

- [ ] **Step 7: テスト**

```bash
pnpm test
```

- [ ] **Step 8: コミット**

```bash
git add src/hooks/useIssueFilters.ts src/components/issues/FilterBar.tsx src/app/issues/IssuesPageClient.tsx src/lib/schemas.ts src/server/db/issues.ts
git commit -m "feat: filter bar with URL state management"
```

---

## Task 9: GET API エンドポイント + 一覧ページの TanStack Query 移行

**Files:**
- Modify: `src/app/api/initiatives/[id]/route.ts`
- Modify: `src/app/api/projects/[id]/route.ts`
- Modify: `src/app/api/cycles/[id]/route.ts`
- Modify: `src/app/initiatives/page.tsx`
- Modify: `src/app/projects/page.tsx`
- Modify: `src/app/cycles/page.tsx`

- [ ] **Step 1: `initiatives/[id]/route.ts` に GET を追加**

```typescript
// src/app/api/initiatives/[id]/route.ts の先頭に追加:
import { getInitiative } from '@/server/domain/initiatives'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const initiative = await getInitiative(id)
    if (!initiative) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(initiative)
  } catch (e) {
    console.error(`GET /api/initiatives/${id} failed`, e)
    return NextResponse.json({ error: 'Failed to fetch initiative' }, { status: 500 })
  }
}
```

- [ ] **Step 2: `projects/[id]/route.ts` に GET を追加**

```typescript
// src/app/api/projects/[id]/route.ts の先頭に追加:
import { getProject } from '@/server/domain/projects'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const project = await getProject(id)
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(project)
  } catch (e) {
    console.error(`GET /api/projects/${id} failed`, e)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}
```

- [ ] **Step 3: `cycles/[id]/route.ts` に GET を追加**

```typescript
// src/app/api/cycles/[id]/route.ts の先頭に追加:
import { getCycle } from '@/server/domain/cycles'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const cycle = await getCycle(id)
    if (!cycle) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(cycle)
  } catch (e) {
    console.error(`GET /api/cycles/${id} failed`, e)
    return NextResponse.json({ error: 'Failed to fetch cycle' }, { status: 500 })
  }
}
```

- [ ] **Step 4: `initiatives/page.tsx` を TanStack Query に移行**

```typescript
// src/app/initiatives/page.tsx 全体を置き換え:
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { listInitiatives } from '@/server/domain/initiatives'
import { getQueryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { InitiativesPageClient } from './InitiativesPageClient'

export default async function InitiativesPage() {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    queryKey: queryKeys.initiatives.list(),
    queryFn: () => listInitiatives(),
  })
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InitiativesPageClient />
    </HydrationBoundary>
  )
}
```

- [ ] **Step 5: `app/initiatives/InitiativesPageClient.tsx` を作成**

```typescript
// src/app/initiatives/InitiativesPageClient.tsx
'use client'

import { useInitiatives } from '@/hooks/useInitiatives'
import { InitiativeList } from '@/components/initiatives/InitiativeList'
import { Topbar } from '@/components/layout/Topbar'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

export function InitiativesPageClient() {
  const { data: initiatives = [], isLoading, isError } = useInitiatives()
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: queryKeys.initiatives.all })

  return (
    <>
      <Topbar title="Initiatives" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6 px-4">
          <h1 className="text-sm font-medium text-neutral-200 mb-4">Initiatives</h1>
          {isLoading ? (
            <p className="text-sm text-neutral-500">Loading...</p>
          ) : isError ? (
            <p className="text-sm text-red-500">Failed to load initiatives.</p>
          ) : (
            <InitiativeList initiatives={initiatives} onCreated={refresh} />
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 6: `projects/page.tsx` と `cycles/page.tsx` も同様に移行**

`projects/page.tsx`:
```typescript
// src/app/projects/page.tsx 全体を置き換え:
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { listProjects } from '@/server/domain/projects'
import { getQueryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { ProjectsPageClient } from './ProjectsPageClient'

export default async function ProjectsPage() {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => listProjects(),
  })
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectsPageClient />
    </HydrationBoundary>
  )
}
```

`src/app/projects/ProjectsPageClient.tsx`:
```typescript
'use client'

import { useProjects } from '@/hooks/useProjects'
import { ProjectList } from '@/components/projects/ProjectList'
import { Topbar } from '@/components/layout/Topbar'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

export function ProjectsPageClient() {
  const { data: projects = [], isLoading, isError } = useProjects()
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: queryKeys.projects.all })

  return (
    <>
      <Topbar title="Projects" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6 px-4">
          <h1 className="text-sm font-medium text-neutral-200 mb-4">Projects</h1>
          {isLoading ? (
            <p className="text-sm text-neutral-500">Loading...</p>
          ) : isError ? (
            <p className="text-sm text-red-500">Failed to load projects.</p>
          ) : (
            <ProjectList projects={projects} onCreated={refresh} />
          )}
        </div>
      </div>
    </>
  )
}
```

`cycles/page.tsx`:
```typescript
// src/app/cycles/page.tsx 全体を置き換え:
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { listCycles } from '@/server/domain/cycles'
import { getQueryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { CyclesPageClient } from './CyclesPageClient'

export default async function CyclesPage() {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    queryKey: queryKeys.cycles.list(),
    queryFn: () => listCycles(),
  })
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CyclesPageClient />
    </HydrationBoundary>
  )
}
```

`src/app/cycles/CyclesPageClient.tsx`:
```typescript
'use client'

import { useCycles } from '@/hooks/useCycles'
import { CycleList } from '@/components/cycles/CycleList'
import { Topbar } from '@/components/layout/Topbar'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

export function CyclesPageClient() {
  const { data: cycles = [], isLoading, isError } = useCycles()
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: queryKeys.cycles.all })

  return (
    <>
      <Topbar title="Cycles" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6 px-4">
          <h1 className="text-sm font-medium text-neutral-200 mb-4">Cycles</h1>
          {isLoading ? (
            <p className="text-sm text-neutral-500">Loading...</p>
          ) : isError ? (
            <p className="text-sm text-red-500">Failed to load cycles.</p>
          ) : (
            <CycleList cycles={cycles} onCreated={refresh} />
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 7: テストとビルド確認**

```bash
pnpm test && pnpm build
```

Expected: テスト green、ビルド成功

- [ ] **Step 8: コミット**

```bash
git add src/app/api/initiatives/[id]/route.ts src/app/api/projects/[id]/route.ts src/app/api/cycles/[id]/route.ts src/app/initiatives/ src/app/projects/ src/app/cycles/
git commit -m "feat: GET endpoints for entities, migrate list pages to TanStack Query"
```

---

## Task 10: Initiative / Project / Cycle 詳細画面

**Files:**
- Create: `src/app/initiatives/[id]/page.tsx`
- Create: `src/app/initiatives/[id]/InitiativeDetailClient.tsx`
- Create: `src/app/projects/[id]/page.tsx`
- Create: `src/app/projects/[id]/ProjectDetailClient.tsx`
- Create: `src/app/cycles/[id]/page.tsx`
- Create: `src/app/cycles/[id]/CycleDetailClient.tsx`
- Create: `src/components/cycles/CycleProgressPanel.tsx`

- [ ] **Step 1: `CycleProgressPanel.tsx` を作成**

```typescript
// src/components/cycles/CycleProgressPanel.tsx
'use client'

import type { Issue, Cycle } from '@/types'

interface CycleProgressPanelProps {
  cycle: Cycle
  issues: Issue[]
}

export function CycleProgressPanel({ cycle, issues }: CycleProgressPanelProps) {
  const total = issues.length
  const completed = issues.filter((i) => i.status === 'done').length
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100)

  const now = new Date()
  const start = new Date(cycle.startDate)
  const end = new Date(cycle.endDate)
  const totalDays = Math.max(1, (end.getTime() - start.getTime()) / 86400000)
  const elapsedDays = Math.max(0, (now.getTime() - start.getTime()) / 86400000)
  const elapsedPct = Math.min(100, Math.round((elapsedDays / totalDays) * 100))

  const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / 86400000)

  let barColor = 'bg-green-500'
  if (elapsedPct > percentage + 20) barColor = 'bg-red-500'
  else if (elapsedPct > percentage + 10) barColor = 'bg-yellow-500'

  return (
    <div className="rounded-lg border border-neutral-800 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-neutral-300">Progress</span>
        <span className="text-xs text-neutral-500">
          {daysRemaining > 0 ? `${daysRemaining}d remaining` : `${Math.abs(daysRemaining)}d overdue`}
        </span>
      </div>

      <div className="w-full bg-neutral-800 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>{completed}/{total} issues completed</span>
        <span>{percentage}%</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Cycle 詳細画面を作成**

```typescript
// src/app/cycles/[id]/page.tsx
import { Suspense } from 'react'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getCycle } from '@/server/domain/cycles'
import { listIssues } from '@/server/domain/issues'
import { getQueryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { notFound } from 'next/navigation'
import { CycleDetailClient } from './CycleDetailClient'

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const queryClient = getQueryClient()

  const [cycle] = await Promise.all([
    getCycle(id),
    queryClient.prefetchQuery({
      queryKey: queryKeys.issues.list({ cycleId: id }),
      queryFn: () => listIssues({ cycleId: id }),
    }),
  ])

  if (!cycle) notFound()

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<div className="flex-1" />}>
        <CycleDetailClient cycle={cycle} />
      </Suspense>
    </HydrationBoundary>
  )
}
```

```typescript
// src/app/cycles/[id]/CycleDetailClient.tsx
'use client'

import { useIssues } from '@/hooks/useIssues'
import { IssueList } from '@/components/issues/IssueList'
import { CycleProgressPanel } from '@/components/cycles/CycleProgressPanel'
import { Topbar } from '@/components/layout/Topbar'
import type { Cycle } from '@/types'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { IssueDetailSlideover } from '@/components/issues/IssueDetailSlideover'

interface CycleDetailClientProps {
  cycle: Cycle
}

export function CycleDetailClient({ cycle }: CycleDetailClientProps) {
  const { data: issues = [] } = useIssues({ cycleId: cycle.id })
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('selected') ?? undefined

  const openIssue = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('selected', id)
    router.push(`/cycles/${cycle.id}?${params.toString()}`)
  }, [router, searchParams, cycle.id])

  const closeIssue = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('selected')
    router.push(`/cycles/${cycle.id}?${params.toString()}`)
  }, [router, searchParams, cycle.id])

  return (
    <>
      <Topbar title={cycle.title} />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto py-6 px-4">
            <CycleProgressPanel cycle={cycle} issues={issues} />
            <IssueList issues={issues} onIssueClick={openIssue} />
          </div>
        </div>
        {selectedId && (
          <IssueDetailSlideover issueId={selectedId} onClose={closeIssue} />
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 3: Initiative 詳細画面を作成**

```typescript
// src/app/initiatives/[id]/page.tsx
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getInitiative } from '@/server/domain/initiatives'
import { getQueryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { notFound } from 'next/navigation'
import { InitiativeDetailClient } from './InitiativeDetailClient'

export default async function InitiativeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const queryClient = getQueryClient()
  const initiative = await getInitiative(id)
  if (!initiative) notFound()

  await queryClient.prefetchQuery({
    queryKey: queryKeys.initiatives.detail(id),
    queryFn: () => Promise.resolve(initiative),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InitiativeDetailClient initiative={initiative} />
    </HydrationBoundary>
  )
}
```

```typescript
// src/app/initiatives/[id]/InitiativeDetailClient.tsx
'use client'

import { Topbar } from '@/components/layout/Topbar'
import type { Initiative } from '@/types'

interface InitiativeDetailClientProps {
  initiative: Initiative
}

export function InitiativeDetailClient({ initiative }: InitiativeDetailClientProps) {
  return (
    <>
      <Topbar title={initiative.title} />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-6 px-4">
          <h1 className="text-lg font-semibold text-neutral-100 mb-2">{initiative.title}</h1>
          {initiative.description && (
            <p className="text-sm text-neutral-400 mb-6">{initiative.description}</p>
          )}
          <div className="flex gap-4 text-xs text-neutral-500">
            <span>Status: {initiative.status}</span>
            {initiative.startDate && (
              <span>Start: {new Date(initiative.startDate).toLocaleDateString()}</span>
            )}
            {initiative.targetDate && (
              <span>Target: {new Date(initiative.targetDate).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 4: Project 詳細画面を作成**

```typescript
// src/app/projects/[id]/page.tsx
import { Suspense } from 'react'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getProject } from '@/server/domain/projects'
import { listIssues } from '@/server/domain/issues'
import { getQueryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { notFound } from 'next/navigation'
import { ProjectDetailClient } from './ProjectDetailClient'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const queryClient = getQueryClient()

  const [project] = await Promise.all([
    getProject(id),
    queryClient.prefetchQuery({
      queryKey: queryKeys.issues.list({ projectId: id }),
      queryFn: () => listIssues({ projectId: id }),
    }),
  ])

  if (!project) notFound()

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<div className="flex-1" />}>
        <ProjectDetailClient project={project} />
      </Suspense>
    </HydrationBoundary>
  )
}
```

```typescript
// src/app/projects/[id]/ProjectDetailClient.tsx
'use client'

import { useIssues } from '@/hooks/useIssues'
import { IssueList } from '@/components/issues/IssueList'
import { Topbar } from '@/components/layout/Topbar'
import type { Project } from '@/types'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { IssueDetailSlideover } from '@/components/issues/IssueDetailSlideover'

interface ProjectDetailClientProps {
  project: Project
}

export function ProjectDetailClient({ project }: ProjectDetailClientProps) {
  const { data: issues = [] } = useIssues({ projectId: project.id })
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('selected') ?? undefined

  const openIssue = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('selected', id)
    router.push(`/projects/${project.id}?${params.toString()}`)
  }, [router, searchParams, project.id])

  const closeIssue = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('selected')
    router.push(`/projects/${project.id}?${params.toString()}`)
  }, [router, searchParams, project.id])

  return (
    <>
      <Topbar title={project.title} />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto py-6 px-4">
            <IssueList issues={issues} onIssueClick={openIssue} />
          </div>
        </div>
        {selectedId && (
          <IssueDetailSlideover issueId={selectedId} onClose={closeIssue} />
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 5: Sidebar にリンクを追加（オプション: 詳細ページへのナビゲーション確認のみ）**

```bash
pnpm dev
```

`/cycles/<id>` で進捗バーが表示されること、`/projects/<id>` で Issue 一覧が表示されることを確認。

- [ ] **Step 6: テストとビルド**

```bash
pnpm test && pnpm build
```

- [ ] **Step 7: コミット**

```bash
git add src/app/initiatives/[id]/ src/app/projects/[id]/ src/app/cycles/[id]/ src/components/cycles/CycleProgressPanel.tsx
git commit -m "feat: detail pages for initiative/project/cycle with progress panel"
```

---

## Task 11: Playwright E2E セットアップ + テスト

**Files:**
- Create: `e2e/playwright.config.ts`
- Create: `e2e/seed.ts`
- Create: `e2e/issues.spec.ts`
- Create: `e2e/search.spec.ts`
- Create: `e2e/cycles.spec.ts`
- Modify: `package.json` (test:e2e script)

- [ ] **Step 1: `playwright.config.ts` を作成**

```typescript
// e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
```

- [ ] **Step 2: `package.json` に `test:e2e` スクリプトを追加**

```json
"test:e2e": "playwright test --config=e2e/playwright.config.ts"
```

- [ ] **Step 3: `e2e/seed.ts` を作成**

```typescript
// e2e/seed.ts
// E2E テスト用シードデータを作成するスクリプト
// 使用方法: `tsx e2e/seed.ts` でシードを投入
import { PrismaClient } from '@prisma/client'
import { generateNKeysBetween } from 'fractional-indexing'

const prisma = new PrismaClient()

export async function seed() {
  // 既存データをクリア
  await prisma.issue.deleteMany()
  await prisma.cycle.deleteMany()
  await prisma.project.deleteMany()
  await prisma.initiative.deleteMany()

  const initiative = await prisma.initiative.create({
    data: { title: 'E2E Initiative', status: 'active' },
  })

  const project = await prisma.project.create({
    data: { title: 'E2E Project', prefix: 'E2E', initiativeId: initiative.id },
  })

  const cycle = await prisma.cycle.create({
    data: {
      title: 'E2E Cycle',
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 86400000),
      status: 'active',
    },
  })

  const keys = generateNKeysBetween(null, null, 4)

  // 4 issues: 2 done, 2 todo
  await prisma.$transaction([
    prisma.project.update({ where: { id: project.id }, data: { issueCounter: 1 } }),
    prisma.issue.create({
      data: {
        identifier: 'E2E-1',
        title: 'E2E Done Issue 1',
        status: 'done',
        priority: 'none',
        projectId: project.id,
        cycleId: cycle.id,
        labels: '[]',
        sortOrder: keys[0],
      },
    }),
  ])
  await prisma.$transaction([
    prisma.project.update({ where: { id: project.id }, data: { issueCounter: 2 } }),
    prisma.issue.create({
      data: {
        identifier: 'E2E-2',
        title: 'E2E Done Issue 2',
        status: 'done',
        priority: 'none',
        projectId: project.id,
        cycleId: cycle.id,
        labels: '[]',
        sortOrder: keys[1],
      },
    }),
  ])
  await prisma.$transaction([
    prisma.project.update({ where: { id: project.id }, data: { issueCounter: 3 } }),
    prisma.issue.create({
      data: {
        identifier: 'E2E-3',
        title: 'E2E Todo Issue searchable',
        status: 'todo',
        priority: 'none',
        projectId: project.id,
        cycleId: cycle.id,
        labels: '[]',
        sortOrder: keys[2],
      },
    }),
  ])
  await prisma.$transaction([
    prisma.project.update({ where: { id: project.id }, data: { issueCounter: 4 } }),
    prisma.issue.create({
      data: {
        identifier: 'E2E-4',
        title: 'E2E Backlog Issue',
        status: 'backlog',
        priority: 'none',
        projectId: project.id,
        labels: '[]',
        sortOrder: keys[3],
      },
    }),
  ])

  return { project, cycle, initiative }
}

// 直接実行する場合: tsx e2e/seed.ts
seed().then(() => { console.log('Seeded'); return prisma.$disconnect() }).catch(console.error)
```

- [ ] **Step 4: `e2e/issues.spec.ts` を作成**

```typescript
// e2e/issues.spec.ts
import { test, expect } from '@playwright/test'
import { seed } from './seed'

test.beforeAll(async () => {
  await seed()
})

test('Issue 作成 → 一覧表示 → スライドオーバーで description 編集 → リロード後も残る', async ({ page }) => {
  await page.goto('/issues')

  // Issue 作成
  await page.getByRole('button', { name: 'New Issue' }).click()
  await page.getByPlaceholder(/title/i).fill('Playwright Test Issue')
  await page.getByRole('button', { name: /create/i }).click()

  // 一覧に表示されること
  await expect(page.getByText('Playwright Test Issue')).toBeVisible()

  // スライドオーバーを開く
  await page.getByText('Playwright Test Issue').click()
  await expect(page.getByText(/description/i)).toBeVisible()

  // URL に selected が付くこと
  await expect(page).toHaveURL(/selected=/)

  // リロード後もスライドオーバーが開くこと
  await page.reload()
  await expect(page.getByText('Playwright Test Issue')).toBeVisible({ timeout: 10_000 })
})

test('ステータス変更が API に反映 → リロードで維持', async ({ page }) => {
  await page.goto('/issues')

  // E2E-3 の行を見つけてステータスボタンをクリック
  const row = page.locator('[data-testid="issue-row"]').filter({ hasText: 'E2E Todo Issue' })
  await expect(row).toBeVisible()

  // ステータスアイコンをクリック (todo → in_progress)
  await row.locator('button').first().click()

  // リロード後もステータスが変わっていること
  await page.reload()
  await expect(page.locator('[data-testid="issue-row"]').filter({ hasText: 'E2E Todo Issue' })).toBeVisible()
})
```

- [ ] **Step 5: `e2e/search.spec.ts` を作成**

```typescript
// e2e/search.spec.ts
import { test, expect } from '@playwright/test'
import { seed } from './seed'

test.beforeAll(async () => {
  await seed()
})

test('Cmd+K で Issue タイトル検索 → 選択でスライドオーバーへ遷移', async ({ page }) => {
  await page.goto('/issues')

  // Cmd+K でパレットを開く
  await page.keyboard.press('Meta+k')
  await expect(page.getByPlaceholder(/search/i)).toBeVisible()

  // "searchable" で検索
  await page.keyboard.type('searchable')

  // E2E-3 が表示されること
  await expect(page.getByText('E2E Todo Issue searchable')).toBeVisible()

  // クリックで遷移
  await page.getByText('E2E Todo Issue searchable').click()

  // ?selected= が URL に付くこと
  await expect(page).toHaveURL(/selected=/)
})
```

- [ ] **Step 6: `e2e/cycles.spec.ts` を作成**

```typescript
// e2e/cycles.spec.ts
import { test, expect } from '@playwright/test'
import { seed } from './seed'
import { PrismaClient } from '@prisma/client'

test.beforeAll(async () => {
  await seed()
})

test('Cycle 詳細で進捗バーが seed データ通りの比率で表示される', async ({ page }) => {
  // seed で作った cycle の id を取得
  const prisma = new PrismaClient()
  const cycle = await prisma.cycle.findFirst({ where: { title: 'E2E Cycle' } })
  await prisma.$disconnect()
  if (!cycle) throw new Error('E2E Cycle not found')

  await page.goto(`/cycles/${cycle.id}`)

  // 進捗バーが表示されること
  await expect(page.getByText(/Progress/i)).toBeVisible()

  // 2/3 completed (E2E-1, E2E-2 done, E2E-3 todo) = 66%
  await expect(page.getByText('2/3 issues completed')).toBeVisible()
})
```

- [ ] **Step 7: E2E テストを実行**

```bash
pnpm test:e2e
```

Expected: 4シナリオ全て green（初回はサーバー起動に時間がかかる場合あり）

- [ ] **Step 8: ビルドと全テスト確認**

```bash
pnpm test && pnpm build && pnpm lint
```

Expected: 全て green

- [ ] **Step 9: コミット**

```bash
git add e2e/ package.json
git commit -m "feat: Playwright E2E setup with 4 test scenarios"
```

---

## 完了チェックリスト

- [ ] `pnpm test` green
- [ ] `pnpm test:e2e` green
- [ ] `pnpm lint` green
- [ ] `pnpm build` 成功
- [ ] Issue 行クリックでスライドオーバーが開き `?selected=<id>` が URL に反映
- [ ] スライドオーバーで description を MDXEditor で編集・保存できる
- [ ] サブタスクを作成・チェック完了できる
- [ ] D&D で同一ステータス内の並び替えができる
- [ ] Cmd+K でエンティティ横断検索できる
- [ ] フィルタ・ソートが URL に反映されリロード後も維持される
- [ ] Initiative / Project / Cycle 詳細画面が表示される
- [ ] Cycle 詳細に進捗バーが正しく表示される
- [ ] `?selected=<id>` の URL をリロードしてもスライドオーバーが再現する
