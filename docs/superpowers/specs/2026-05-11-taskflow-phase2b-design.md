# Taskflow Phase 2b 設計書

**日付**: 2026-05-11
**ステータス**: 承認済み（ブレスト完了 → 実装プラン作成へ）
**前提**: Phase 2a 完了・main マージ済み（PR #2）
**関連**:
- Phase 2 全体設計書: `docs/superpowers/specs/2026-05-01-taskflow-phase2-design.md`
- 全フェーズプラン: `docs/superpowers/plans/2026-04-26-taskflow-all-phases.md`
- 全体設計書: `docs/superpowers/specs/2026-04-26-taskflow-overall-design.md`

---

## 1. 概要

Phase 2b のゴールは「ドックフーディング可能な状態」への到達。Phase 2a で確立した基盤（TanStack Query / RSC+HydrationBoundary / fractional-indexing / `src/server` 分離）の上に、ユーザーが実際に触れる UI 機能をフルスタックで積み上げる。

**実装方針:** 機能エンドツーエンド型（各機能を schema→API→UI→テストの単位で完結させる）。ステップ 3（スライドオーバー）完了後からドックフーディング開始可能。

---

## 2. Phase 2a との差分（引き継ぎ事項）

| 項目 | 状況 |
|---|---|
| `createIssue` sortOrder トランザクション化 | TODO コメントあり、Phase 2b ステップ 1 で解消 |
| `parentIssueId` マイグレーション | Phase 2a 設計書では 2a 同梱予定だったが未実施。Phase 2b ステップ 2 で追加 |
| Issue スライドオーバー | 未着手 |
| D&D 並び替え UI | move API 完成済み、UI のみ未着手 |
| Cmd+K コマンドパレット | 未着手 |
| フィルタ・ソート | 未着手 |
| Initiative / Project / Cycle 詳細画面 | 未着手 |
| Cycle 進捗パネル | 未着手 |
| Playwright E2E | 未着手 |
| Projects / Initiatives / Cycles の TanStack Query 移行 | 未着手（Issues のみ完了済み）|

---

## 3. 実装シーケンス

| ステップ | タスク | ドックフーディング |
|---|---|---|
| 1 | `createIssue` sortOrder トランザクション化 | — |
| 2 | `parentIssueId` マイグレーション | — |
| 3 | Issue スライドオーバー + MDXEditor | ✅ **開始ライン** |
| 4 | D&D 並び替え UI（dnd-kit） | |
| 5 | Cmd+K コマンドパレット + `/api/search` | |
| 6 | フィルタ・ソート + URL 状態管理 | |
| 7 | Initiative / Project / Cycle 詳細画面 + TanStack Query 移行 | |
| 8 | Cycle 進捗パネル | |
| 9 | Playwright E2E セットアップ + 4 シナリオ | |

---

## 4. 各ステップ詳細設計

### 4.1 ステップ 1: `createIssue` sortOrder トランザクション化

**問題:** 現在の `createIssue` が「末尾 sortOrder 取得 → 新 key 計算 → INSERT」を非トランザクションで実行しており、並列作成時に sortOrder 重複の可能性がある。

**修正箇所:** `src/server/domain/issues.ts`

```typescript
export async function createIssue(input: CreateIssueInput) {
  return prisma.$transaction(async (tx) => {
    const last = await tx.issue.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const sortOrder = generateKeyBetween(last?.sortOrder ?? null, null);
    return tx.issue.create({ data: { ...input, sortOrder } });
  });
}
```

**テスト:** `src/server/domain/issues.test.ts` に並列作成シナリオを追加（in-memory SQLite）。

---

### 4.2 ステップ 2: `parentIssueId` マイグレーション

**Prisma スキーマ変更:**

```prisma
model Issue {
  // 既存フィールド...
  parentIssueId String?
  parentIssue   Issue?  @relation("IssueSubtasks", fields: [parentIssueId], references: [id])
  subtasks      Issue[] @relation("IssueSubtasks")
}
```

> **命名注意:** 既存の `updateIssueSchema` に `parentId` フィールドがあるが、Prisma フィールド名 `parentIssueId` に合わせて `parentIssueId` に統一する（schemas.ts の `parentId` → `parentIssueId` にリネーム）。

**影響範囲:**
- 既存 Issue は `parentIssueId: null`（破壊的変更なし）
- `src/server/db/issues.ts` の `listIssues` に `where: { parentIssueId: null }` を追加（一覧にサブタスクを出さない）
- `src/server/db/issues.ts` の `getIssue` は `include: { subtasks: true }` でサブタスクを含めて取得
- `src/types/index.ts` の `Issue` 型に `parentIssueId`, `subtasks` を追加

---

### 4.3 ステップ 3: Issue スライドオーバー + MDXEditor

#### URL 状態管理

`/issues?selected=<id>` でスライドオーバーの開閉を管理。Next.js の `useSearchParams` / `useRouter` を使用。ブラウザバック・リロード・URL 共有に対応。

#### コンポーネント構成

```
app/issues/page.tsx（RSC）
└── IssuesPageClient.tsx（'use client'）
    ├── IssueList.tsx（既存）— Issue 行クリックで ?selected=<id> を付与
    └── IssueDetailSlideover.tsx（新規）
        ├── タイトル（インライン編集、blur で useUpdateIssue 発火）
        ├── MetaSidebar.tsx（右サイドバー）
        ├── DescriptionEditor.tsx（next/dynamic で MDXEditor 遅延読込）
        └── SubtaskSection.tsx（子 Issue 一覧 + インライン作成）
```

#### MetaSidebar.tsx（右サイドバー）

フィールド: status / assignee / project / initiative / cycle / dueDate。各フィールドは選択肢をドロップダウンで表示し、変更時に `useUpdateIssue` mutation を即時発火（楽観的更新）。

#### DescriptionEditor.tsx

- `next/dynamic` で `MDXEditor` を遅延読込（バンドルサイズ対策）
- 保存タイミング: `onBlur` で自動保存（保存ボタンなし）
- DB には Markdown 文字列として保存（Phase 2a スキーマのまま、`description: String?`）

#### SubtaskSection.tsx

- サブタスク一覧: `issue.subtasks` をリレーションで取得
- チェックボックスで `status: 'done'` に変更（`useUpdateIssue` で楽観的更新）
- インライン入力で新規サブタスク作成（Enter で確定、`parentIssueId` を自動セット）
- 親 Issue の `IssueRow` には `{done}/{total}` バッジのみ表示

#### データフロー

| Hook | 操作 |
|---|---|
| `useIssue(id)` | `GET /api/issues/[id]` で単一 Issue 取得（`enabled: !!id`）|
| `useUpdateIssue()` | PATCH mutation、楽観的更新あり |
| `useCreateIssue()` | サブタスク作成（`parentIssueId` を引数に含める）|

#### 開閉動作

| 操作 | 動作 |
|---|---|
| Issue 行クリック | `?selected=<id>` を URL に追加、パネルを右からスライドイン |
| ESC / 背景クリック / × ボタン | `selected` パラメータを除去、パネルをスライドアウト |
| リロード | `selected` が URL にあれば自動的にパネルを開く |

#### 必要な API 変更

- `GET /api/issues/[id]` — **既存**。`include: { subtasks: true }` を追加
- `PATCH /api/issues/[id]` — **既存**。`updateIssueSchema` に `projectId`・`initiativeId`・`assigneeId` を追加し、スライドオーバーの MetaSidebar から全フィールドを更新可能にする

---

### 4.4 ステップ 4: D&D 並び替え UI（dnd-kit）

**スコープ:** 同一ステータスグループ内のみ（ステータス間移動は Phase 4）

**ライブラリ:** `@dnd-kit/core` + `@dnd-kit/sortable`

**コンポーネント変更:**

```
IssueList.tsx（ステータスグループごとに DndContext でラップ）
└── <DndContext onDragEnd={handleDragEnd}>
    └── <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
        └── IssueRow.tsx（useSortable で drag handle 付与）
```

**楽観的更新フロー:**
1. `onDragEnd` で drop 位置の `beforeId` / `afterId` を計算
2. `queryClient.setQueryData` でキャッシュを即時更新
3. `useMoveIssue` mutation 発火（`POST /api/issues/[id]/move`）
4. 失敗時は `onError` でキャッシュをロールバック

**UI 詳細:**
- drag handle（`⠿` アイコン）はホバー時のみ表示
- ドラッグ中はカード半透明（`opacity: 0.5`）
- ドロップ位置に青ラインインジケータ

---

### 4.5 ステップ 5: Cmd+K コマンドパレット（cmdk）

**新規 API:** `GET /api/search?q=<query>`
- 対象: Issue タイトル / Project 名 / Initiative 名 / Cycle 名
- 実装: 各テーブルへの SQLite LIKE 検索、上位 10 件返却
- レスポンス: `{ issues: Issue[], projects: Project[], initiatives: Initiative[], cycles: Cycle[] }`

**コンポーネント:** `components/CommandPalette.tsx`
- `useEffect` + `keydown` イベントで `Cmd+K` / `Ctrl+K` を検知
- `layout.tsx` に配置（全ページで動作）
- 検索結果: カテゴリ別グループ表示（Issues / Projects / Initiatives / Cycles）
- 固定アクション: "Create new issue"、"Go to Cycles"、"Go to Projects"、"Go to Initiatives"
- 選択: Enter で該当ページまたは `?selected=<id>` でスライドオーバーへ遷移

**状態管理:** `uiStore.ts` に `commandPaletteOpen: boolean` を追加

**ライブラリ:** `cmdk`（Radix ベース）

---

### 4.6 ステップ 6: フィルタ・ソート + URL 状態管理

**フィルタバー:** Issues 一覧上部にチップ式マルチセレクト

**フィルタ項目:**
- `status`: Todo / In Progress / Done / Cancelled（複数選択可）
- `assignee`: ユーザー名（複数選択可）
- `project`: プロジェクト名（複数選択可）
- `initiative`: イニシアティブ名
- `cycle`: サイクル名

**ソート選択肢:**
- `sortOrder`（D&D 順、デフォルト）
- `priority`
- `createdAt`
- `updatedAt`

**URL 状態:** `?status=todo,in_progress&project=xxx&sort=priority`
- `useSearchParams` でフィルタ状態を読み書き
- TanStack Query キーに filters を含める → URL 変更で自動 refetch
- `listIssues` の `IssueFilters` 型を再利用（`src/server/domain/issues.ts`）

**実装ファイル:**
- `components/issues/FilterBar.tsx`（新規）
- `hooks/useIssueFilters.ts`（新規、URL ↔ IssueFilters の変換ロジック）

---

### 4.7 ステップ 7: Initiative / Project / Cycle 詳細画面 + TanStack Query 移行

#### 詳細画面（3エンティティ共通構造）

**URL:** `/initiatives/[id]`、`/projects/[id]`、`/cycles/[id]`

```
app/[entity]/[id]/page.tsx（RSC: prefetchQuery）
└── [Entity]DetailClient.tsx（'use client'）
    ├── ヘッダー: 名前 / 説明（インライン編集）/ メタ情報
    ├── 関連 Issue 一覧（FilterBar + IssueList を再利用）
    └── （Cycle のみ）CycleProgressPanel.tsx（ステップ 8）
```

RSC + HydrationBoundary パターンを Issues 一覧と同様に適用。

#### TanStack Query 移行（一覧ページ）

| ページ | Hook | 移行内容 |
|---|---|---|
| `/initiatives` | `useInitiatives()` | RSC prefetch + HydrationBoundary 化 |
| `/projects` | `useProjects()` | 同上 |
| `/cycles` | `useCycles()` | 同上 |

移行完了後、Zustand は `uiStore.ts`（`commandPaletteOpen` 等の UI ステート）のみ。

#### 必要な API 変更

- `GET /api/initiatives/[id]`、`GET /api/projects/[id]`、`GET /api/cycles/[id]` — **新規追加**（現時点では GET が未実装）
- `PATCH /api/initiatives/[id]`、`PATCH /api/projects/[id]`、`PATCH /api/cycles/[id]` — **既存**。詳細画面のインライン編集で使用

---

### 4.8 ステップ 8: Cycle 進捗パネル

**配置:** `/cycles/[id]` 詳細画面内

**コンポーネント:** `components/cycles/CycleProgressPanel.tsx`

| 要素 | 仕様 |
|---|---|
| 進捗バー | 完了 Issue 数 / 全 Issue 数（%）|
| 残り日数 | `endDate - today`（マイナスなら「N 日超過」赤表示）|
| 緑（順調） | 経過日数% ≦ 完了% + 10% |
| 黄（注意） | 完了% + 10% < 経過日数% ≦ 完了% + 20% |
| 赤（遅延） | 経過日数% > 完了% + 20% |

バーンダウンチャートは Phase 4。

---

### 4.9 ステップ 9: Playwright E2E

**セットアップ:**
- `e2e/` 配下に配置
- `playwright.config.ts`: `baseURL: 'http://localhost:3000'`
- テスト DB: `data/taskflow-e2e-${process.env.TEST_WORKER_INDEX ?? 0}.db`（worker ごとに独立）
- `e2e/setup.ts`: 各テスト前に migrate + seed を実行

**4 シナリオ:**

1. **Issue 作成 → 詳細編集 → 永続化確認**
   - Issue を作成 → 一覧に表示されることを確認
   - スライドオーバーを開いて description を MDXEditor で編集・保存
   - リロード後も description が残ることを確認

2. **ステータス変更の永続化**
   - スライドオーバーのメタサイドバーからステータスを変更
   - リロード後も変更が維持されることを確認

3. **Cmd+K 検索 → 遷移**
   - Cmd+K でパレットを開く
   - Issue タイトルの一部を入力して検索
   - 結果を選択してスライドオーバーが開くことを確認

4. **Cycle 進捗バーの表示確認**
   - seed データで Cycle に Issue を紐付け（一部完了済み）
   - `/cycles/[id]` で進捗バーが正しい比率で表示されることを確認

**棲み分け:** domain ロジック → Vitest、UI フロー → Playwright

---

## 5. テスト戦略

| 層 | ツール | 対象 |
|---|---|---|
| 単体（domain） | Vitest | `createIssue` トランザクション、`listIssues` の parentIssueId フィルタ、Cycle 進捗計算ロジック |
| 統合（API） | Vitest | `GET /api/search`、`PATCH /api/issues/[id]`、新規 Route Handler |
| E2E | Playwright | ステップ 9 の 4 シナリオ |

TanStack Query hook と React コンポーネントの単体テストは書かない（ROI が低く Playwright がカバー）。

---

## 6. スコープ外

- AI Agent 統合（Phase 3）
- ステータス間 D&D（Phase 4）
- サブタスクの D&D 並び替え（Phase 4）
- バーンダウンチャート（Phase 4）
- コメント機能、ラベル CRUD UI
- Issue 以外のエンティティの fractional-indexing 化
- 認証・マルチユーザー対応

---

## 7. 受け入れ基準

次が全て満たされた時点で Phase 2b 完了:

- [ ] `pnpm test`（Vitest）が green
- [ ] `pnpm test:e2e`（Playwright）が green
- [ ] `pnpm lint` が green
- [ ] `pnpm build` が成功
- [ ] 手動確認:
  - [ ] `createIssue` がトランザクション内で sortOrder を採番する
  - [ ] Issue 行クリックでスライドオーバーが開き、`?selected=<id>` が URL に反映される
  - [ ] スライドオーバーで description を MDXEditor で編集・保存できる
  - [ ] サブタスクを親 Issue 詳細から作成・完了できる
  - [ ] D&D で同一ステータス内の Issue を並び替えられる
  - [ ] Cmd+K で Issue / Project / Initiative / Cycle を横断検索できる
  - [ ] フィルタ・ソートが URL に反映され、リロード後も維持される
  - [ ] Initiative / Project / Cycle 詳細画面が表示される
  - [ ] Cycle 詳細に進捗バーが表示される
  - [ ] `?selected=<id>` の URL をリロードしてもスライドオーバーが再現する
