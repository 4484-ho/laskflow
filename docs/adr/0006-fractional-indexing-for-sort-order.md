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

## Migration

SQL マイグレーションは既存の全レコードの `sortOrder` を `'a0'` プレースホルダーに設定する。その後、`scripts/migrate-sort-order.ts` を実行して `createdAt` 昇順で正しい一意キーを採番する必要がある。`prisma migrate deploy` だけでは不十分で、**必ず** `pnpm migrate:sort-order` を続けて実行すること。

## Consequences

- + 任意箇所への挿入が `O(1)` で可能、リバランス不要
- + 衝突に強い
- − sortOrder 比較が文字列比較になる(Prisma クエリで `orderBy: { sortOrder: 'asc' }` のまま機能)
- − 既存データの移行マイグレーションが必要
