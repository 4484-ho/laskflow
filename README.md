# laskflow
A minimal, local-first task manager for solo developers. Inspired by Linear, powered by Claude.

## Phase 2a Notes

- DB アクセスは `src/server/db/`、ビジネスルールは `src/server/domain/` に分離。client からの import は ESLint で禁止。
- **初回セットアップ時の注意:** `prisma migrate deploy` 後に `pnpm migrate:sort-order` を実行して既存 Issue の sortOrder を採番してください。
- サーバ状態は TanStack Query で管理（Issues 一覧は RSC + HydrationBoundary 採用）。Zustand は UI ステート専用。
- `Issue.sortOrder` は fractional-indexing（string）。並び替えは `POST /api/issues/[id]/move`。
- 詳細は `docs/superpowers/specs/2026-05-01-taskflow-phase2-design.md` および `docs/adr/0004-0006`。
