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
