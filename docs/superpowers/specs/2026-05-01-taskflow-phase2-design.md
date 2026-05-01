# Taskflow Phase 2 設計書

**日付**: 2026-05-01
**ステータス**: 承認済み(ブレスト完了 → 実装プラン作成へ)
**前提**: Phase 1 完了・main マージ済み(タグ: `phase1-complete`)
**関連**:
- 全体設計書: `docs/superpowers/specs/2026-04-26-taskflow-overall-design.md`
- 全フェーズプラン: `docs/superpowers/plans/2026-04-26-taskflow-all-phases.md`
- 機能仕様: `docs/taskflow-spec.md`
- ADR: `docs/adr/0001-0003`

---

## 1. 概要

Phase 2 のゴールは、全体設計書の通り「フィルタ・検索・Cmd+K が動き、全ビューが揃っている状態」。
ただし Phase 1 で持ち越した **アーキテクチャ刷新の論点**(TanStack Query 導入、RSC 部分採用、`src/server` 分離、fractional indexing)を Phase 2 内で解消するため、**2 段構え**で進める:

- **Phase 2a — 基盤刷新**: コードベースを Phase 2b/3 が乗る土台に整える
- **Phase 2b — UI 機能**: ユーザーが触る機能(スライドオーバー、Markdown、D&D、Cmd+K、各詳細画面、Cycle 進捗、Playwright E2E)を実装

Phase 2a は既存の振る舞いを変えない(リグレッションなし)。Phase 2b は 2a で確立したパターンの上に積む。

---

## 2. 確定した技術的決定

| 論点 | 決定 | 理由概要 |
|---|---|---|
| データ経路 | REST + TanStack Query 中心、初期描画が重い箇所のみ RSC + HydrationBoundary | REST は Phase 3 Agent で不可欠 / 楽観的更新と Cmd+K キャッシュは TanStack Query が強い / 初期描画の SEO 要件は薄い |
| レイヤ分離 | `src/server/{db,domain}` に分離、ESLint で client からの import を禁止 | RSC 部分採用と Phase 3 Agent コードの追加を見据え、サーバ専用の境界を機械的に強制 |
| 並び替え | `fractional-indexing` (npm, string base62) | リバランス不要、Notion/Figma 型の標準的手法 |
| Markdown エディタ | MDXEditor | UI セット同梱で工数削減 / Markdown ソース = 表示 で DB 形式と一致 / Phase 3 Agent 連携が素直 |
| D&D | `dnd-kit` | React 19 / Next.js 15 と互換、アクセシビリティ良好 |
| Cmd+K | `cmdk` (Vercel) | 事実上の標準、Linear 型 UX、Radix ベース |

---

## 3. Phase 2a — 基盤刷新

### 3.1 完了の定義

- `src/server/{db,domain}` 分離が完了し、client からの import は ESLint で防止
- TanStack Query 導入、Zustand の `issueStore.ts` から fetch 系を削除(Zustand は UI ステート専用に縮小)
- 初期描画向けに RSC prefetch + HydrationBoundary パターンを Issues 一覧で先行採用(以降 2b で他ビューへ展開)
- Prisma スキーマに `sortOrder: String` 列を追加し、既存データを移行
- 既存の API Route Handler は zod で domain 関数を呼ぶ薄い層へ整理(REST contract は変えない)
- Vitest が全件 green、Phase 1 の振る舞いはリグレッションなし

### 3.2 ディレクトリ再編

```
src/
├── server/                       ← サーバ専用(client から import 禁止)
│   ├── db/
│   │   ├── prisma.ts             ← 既存 lib/prisma.ts を移動
│   │   ├── issues.ts             ← 既存 lib/issues.ts を移動
│   │   ├── projects.ts
│   │   ├── initiatives.ts
│   │   └── cycles.ts
│   └── domain/
│       ├── issues.ts             ← zod 検証 + ビジネスルール(状態遷移、sortOrder 計算)
│       ├── projects.ts
│       ├── initiatives.ts
│       └── cycles.ts
├── lib/
│   ├── api-helpers.ts            ← 既存(client/server 両用 OK)
│   ├── schemas.ts                ← 既存 zod スキーマ(client/server 共有)
│   ├── query-client.ts           ← TanStack Query の QueryClient 設定
│   ├── query-keys.ts             ← クエリキー定義
│   └── fractional-index.ts       ← fractional-indexing の薄い wrapper
├── hooks/                        ← 新設
│   ├── useIssues.ts
│   ├── useProjects.ts
│   ├── useInitiatives.ts
│   └── useCycles.ts
├── stores/
│   └── uiStore.ts                ← issueStore.ts は廃止
└── app/, components/             ← 既存(中身は 2b で更新)
```

### 3.3 ESLint ルール

`no-restricted-imports` を設定し、`'use client'` 付きファイル + `src/components/**` + `src/hooks/**` + `src/stores/**` から `@/server/**` の import を禁止する。CI で検出。

### 3.4 Route Handler の整理

- `route.ts` は thin wrapper にし、HTTP ↔ domain 関数の変換のみ
- ビジネスルール(zod 検証、sortOrder 計算、状態遷移)は `src/server/domain/*.ts` に集約
- domain 関数は `src/server/db/*.ts` を呼び、Prisma を直接叩くのは db レイヤのみ
- REST contract(エンドポイント、URL、レスポンス形)は変更しない(Phase 3 Agent 互換のため)

### 3.5 TanStack Query 導入

- `app/layout.tsx` を `<QueryClientProvider>` でラップ(`'use client'` 化したラッパーコンポーネント経由)
- `lib/query-keys.ts` でキーを集約: `['issues', { filters }]`, `['issue', id]`, `['projects']`, …
- `hooks/use*.ts` で `useQuery` / `useMutation` を提供
- mutation は楽観的更新で書く(D&D、ステータス変更、削除)。失敗時は `onError` で前状態へロールバック
- 設定値: `staleTime: 30s`, `gcTime: 5min`(個人利用の現実的な値)
- 2a の段階では Issues 一覧のみを Query 化してパターンを確立する。残り(Initiatives/Projects/Cycles 一覧)は 2b で詳細画面実装と同時に移行
- Zustand `issueStore.ts` は削除、`uiStore.ts` のみ残す(モーダル開閉などの UI ステート専用)

### 3.6 RSC + HydrationBoundary パターン(先行サンプル)

`app/issues/page.tsx` を Server Component に変更:

```
page.tsx (Server Component)
  ├── server/domain/issues.ts listIssues() を直接 await(初期描画分)
  ├── new QueryClient() + queryClient.prefetchQuery(['issues', {}], ...)
  └── <HydrationBoundary state={dehydrate(queryClient)}>
        <IssuesPageClient />  ← 'use client', useIssues() でデータ参照
      </HydrationBoundary>
```

初期描画は SSR 済み HTML、以降のフィルタ変更や mutation は client の TanStack Query が引き受ける。Phase 2b で各詳細画面に同じパターンを適用。

### 3.7 fractional-indexing 移行

- 対象: **Issue のみ**(Subtask など他エンティティは Phase 4 候補に持ち越し)
- Prisma スキーマで Issue の `sortOrder` を `Int` から `String` に変更
- マイグレーション: 既存レコードを `createdAt` 昇順で並べ、`generateNKeysBetween(null, null, count)` で初期 sortOrder を一括採番
- domain 関数 `moveIssue(id, beforeId, afterId)` を追加: `generateKeyBetween(beforeKey, afterKey)` で新 key を計算し DB 更新
- リバランス関数 `rebalanceSortOrders(scope)` を予防的に用意(個人利用なので必要時のみ実行)

### 3.8 Phase 2a でのテスト

- 既存の `src/lib/*.test.ts` は `src/server/db/*.test.ts` と `src/server/domain/*.test.ts` に分割移動
- domain レイヤの単体テスト追加: zod 検証エラー、sortOrder 計算、状態遷移ルール
- マイグレーションを vitest で動作確認: in-memory SQLite で migration 実行 → 既存データの sortOrder 移行ロジック検証
- TanStack Query の hook 単体テストはこの段階では書かない(2b の Playwright がカバー)

---

## 4. Phase 2b — UI 機能

### 4.1 完了の定義

- Issue 詳細スライドオーバー(MDXEditor で description 編集、サブタスク表示・作成・親子関係)
- フィルタ(status / assignee / project / initiative / cycle)、ソート、グローバル検索(cmdk)
- D&D による Issue 並び替え(**まずは同一ステータス内のみ**)
- Initiative / Project / Cycle 各詳細画面、Cycle 進捗表示
- Playwright セットアップ + 主要フローの E2E
- 既存ビュー(Initiatives/Projects/Cycles 一覧)の TanStack Query 化が完了

### 4.2 Issue 詳細スライドオーバー

- 配置: `/issues` 一覧の上にオーバーレイ
- URL に出す: `/issues?selected=<id>`(リロード可・共有可)
- コンポーネント: `components/issues/IssueDetailSlideover.tsx`
- 中身:
  - タイトル(インライン編集、blur で保存)
  - description: MDXEditor(`next/dynamic` で遅延読込)
  - メタ情報サイドバー: status / assignee / project / initiative / cycle / dates
  - サブタスクセクション: 子 Issue の一覧表示 + インライン作成 + チェックボックスで完了
- データ: `useIssue(id)` で取得、`useUpdateIssue` mutation で楽観的更新
- 閉じる: ESC / 背景クリック / × ボタン → URL の `selected` を消す

### 4.3 サブタスク

- Prisma スキーマの Issue に `parentIssueId: String?` 自己参照を追加(Phase 2a の migration に同梱)
- 表示は親 Issue 詳細画面の中だけ。`/issues` 一覧には平坦に出さず、カード上に件数バッジのみ
- サブタスクの D&D 並び替えは Phase 2 では非対応(Phase 4 候補)

### 4.4 フィルタ・ソート

- 上部にフィルタバー: status / assignee / project / initiative / cycle のチップ式マルチセレクト
- フィルタ状態は URL クエリに反映: `?status=todo,in_progress&project=xxx`
- TanStack Query のキーに filters を含める → URL 変更で自動 refetch
- ソート: 「優先度」「作成日」「更新日」「sortOrder(D&D 順)」を選択可能。デフォルトは sortOrder

### 4.5 グローバル検索 (Cmd+K)

- `cmdk` を `components/CommandPalette.tsx` で実装
- 起動: Cmd+K(Mac)/ Ctrl+K(Win)
- 検索対象: Issue タイトル / Project 名 / Initiative 名 / Cycle 名 を横断
- 新規 API: `GET /api/search?q=<query>`(各エンティティを LIKE 検索して上位ヒットを返す)
- 結果はカテゴリ別にグループ表示、Enter で該当画面へ遷移
- 「アクション」固定エントリも含める: "Create new issue", "Go to Cycles" 等

### 4.6 D&D 並び替え

- ライブラリ: `@dnd-kit/core` + `@dnd-kit/sortable`
- **対象範囲: 同一ステータス内のみ**(ステータス間移動は Phase 4 候補に持ち越し)
- 実装場所: `components/issues/IssueList.tsx` を `<DndContext>` でラップ
- 楽観的更新フロー:
  - drop 時に `useMoveIssue` mutation 発火
  - mutation 引数: `{id, beforeId, afterId}`
  - サーバ側 `moveIssue` domain 関数が `generateKeyBetween` で新 sortOrder を計算
  - 失敗時は TanStack Query の `onError` で前状態へロールバック
- 視覚: ドラッグ中はカード半透明、ドロップ位置にラインインジケータ

### 4.7 Initiative / Project / Cycle 詳細画面

URL: `/initiatives/[id]`, `/projects/[id]`, `/cycles/[id]`

共通構造:
- 上部: 名前 / 説明 / メタ情報(編集可)
- 中央: 関連 Issue 一覧(2a で確立した RSC + HydrationBoundary パターン + フィルタを継承)
- Cycle のみ: 進捗パネル(下記 4.8)

### 4.8 Cycle 進捗表示

- 進捗バー: 完了 Issue 数 / 全 Issue 数(%)
- 残り日数: `endDate - today`(マイナスなら「N 日超過」表示)
- 完了率の色分け:
  - 経過日数 % > 完了 % + 20% で赤(遅延)
  - +10% で黄(注意)
  - それ以外は緑(順調)
- バーンダウンチャートは Phase 4 へ

### 4.9 既存ページの TanStack Query 化

2b の各詳細画面実装と同時に、対応する一覧ページ(Initiatives / Projects / Cycles)も Zustand から TanStack Query に切り替え。最終的に Zustand は `uiStore.ts`(モーダル等)のみ。

### 4.10 Playwright E2E

- セットアップ: `e2e/` 配下、`playwright.config.ts` で baseURL を `http://localhost:3000`
- テスト DB: `e2e/setup.ts` で SQLite ファイルを別パス(`data/taskflow-e2e-${workerIndex}.db`)に切替、各テスト前に migrate + seed
- 主要シナリオ:
  1. Issue 作成 → 一覧に表示 → 詳細スライドオーバーで description 編集 → 保存後再読込しても残る
  2. ステータス変更が API へ反映 → 再読込で維持(D&D は同一ステータス内のみのため、ステータス変更はメニュー操作で確認)
  3. Cmd+K で Issue タイトル検索 → 該当 Issue へ遷移
  4. Cycle 詳細で進捗バーが seed データ通りの比率で出る
- Vitest との棲み分け: domain ロジックは Vitest、UI フローは Playwright

---

## 5. リスクと緩和策

| リスク | 緩和策 |
|---|---|
| sortOrder 移行で既存データの並びが崩れる | `createdAt` 昇順を踏襲して採番。マイグレーション後に手動で並びを目視確認する手順を README に記載 |
| TanStack Query 化で hydration mismatch エラー | RSC + HydrationBoundary パターンを Issues 一覧で先に確立し、テンプレ化してから他ビューへ展開 |
| Server からの import が誤って client に混入 | ESLint `no-restricted-imports` で機械的に検知 |
| MDXEditor のバンドルサイズ増 | `next/dynamic` で遅延読込、スライドオーバーが開くまでロードしない |
| dnd-kit と TanStack Query 楽観的更新の整合 | mutation の `onMutate` で query data を直接更新、`onError` でロールバック。dnd-kit はコンポーネント state を持たず TanStack Query を真実とする |
| Playwright の SQLite テスト DB 並列実行で競合 | テスト DB ファイルパスを `process.env.TEST_WORKER_INDEX` で分離、各 worker が独立 DB を持つ |

---

## 6. テスト戦略

| 層 | ツール | 対象 |
|---|---|---|
| 単体(domain) | Vitest | `src/server/domain/*.ts` のビジネスルール(sortOrder、状態遷移、zod 検証) |
| 単体(db) | Vitest + in-memory SQLite | `src/server/db/*.ts` の CRUD + sortOrder 移行 migration |
| 統合(API) | Vitest | Route Handler の HTTP 入出力 |
| E2E | Playwright | ブラウザでの主要フロー(4.10 の 4 シナリオ) |

TanStack Query hook と React コンポーネントの単体テストは書かない(ROI が低く、Playwright が UI フローをカバー)。

---

## 7. 受け入れ基準(Phase 2 全体)

次が全て満たされた時点で Phase 2 完了:

- [ ] `pnpm test`(Vitest)が green
- [ ] `pnpm test:e2e`(Playwright)が green
- [ ] `pnpm lint` が green(ESLint の server-import ルールを含む)
- [ ] `pnpm build` が成功
- [ ] 手動確認:
  - [ ] Issue 作成 / 編集 / 削除 / D&D 並び替え(同一ステータス内)/ ステータス変更 が動く
  - [ ] スライドオーバーで description を MDXEditor で編集・保存できる
  - [ ] サブタスクを親 Issue 詳細から作成・完了できる
  - [ ] フィルタ + ソート + Cmd+K 検索が動く
  - [ ] Initiative / Project / Cycle 詳細画面が表示され、Cycle に進捗バーが出る
  - [ ] スライドオーバー URL (`?selected=...`)を開いた状態でリロードしても再現する
- [ ] Phase 1 のリグレッションなし(既存 API contract、既存 Issue 表示)

---

## 8. スコープ外(Phase 2 では扱わない)

- AI Agent 統合(Phase 3)
- バーンダウンチャート、コメント機能、ラベル CRUD UI
- カンバン以外のビュー(タイムライン、ロードマップ等)
- D&D でのステータス間移動(本 Phase は同一ステータス内のみ)
- サブタスクの D&D 並び替え
- Issue 以外のエンティティの fractional-indexing 化
- 認証・マルチユーザー対応、クラウドデプロイ(全体設計書 §5 通り)

---

## 9. ADR の追加予定

Phase 2a 着手時に次の ADR を追加する:

- `0004-server-layer-separation.md` — `src/server/{db,domain}` 分離と client import 禁止
- `0005-tanstack-query-for-server-state.md` — Zustand から TanStack Query への移行と RSC + HydrationBoundary 併用方針
- `0006-fractional-indexing-for-sort-order.md` — sortOrder の string base62 化
