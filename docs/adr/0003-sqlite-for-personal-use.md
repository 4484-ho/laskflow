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
