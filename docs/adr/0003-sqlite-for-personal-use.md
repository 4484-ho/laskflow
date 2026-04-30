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

## SQLite に起因する制約

- **`Issue.labels` を JSON 文字列として保存**: SQLite には配列型が無いため、`String` カラムに JSON を直列化して格納し、アプリ層（`parseIssue`）で `string[]` に復元する。Postgres へ移行する際は `Json` カラムに変更し、データを移行するマイグレーションを追加する必要がある。
- **status / priority 等の文字列カラム**: SQLite の Prisma enum サポートが限定的なため、現状は `String` で保持しアプリ層の型（`IssueStatus` 等）でガードしている。Postgres 移行時には Prisma enum 化が望ましい。

## 将来

クラウドデプロイが必要になった場合は Turso（libSQL）への移行を検討。
Prisma スキーマはそのまま活用できる。
