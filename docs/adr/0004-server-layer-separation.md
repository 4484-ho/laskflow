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
