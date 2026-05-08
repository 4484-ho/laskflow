# Taskflow 全体開発設計書

**日付**: 2026-04-26  
**ステータス**: 承認済み

---

## 1. 概要

Linear ライクな個人開発向けタスク管理アプリ「Taskflow」の全体開発計画。  
Claude Code CLI をサブプロセスで呼び出す AI Agent 統合が最大の差別化点。  
ポートフォリオとしての公開を目的とするため、コード品質・意思決定の透明性を重視する。

詳細な機能仕様は [taskflow-spec.md](../taskflow-spec.md) を参照。

---

## 2. 確定した技術的決定

### 2.1 AI Agent 通信: SSE（Server-Sent Events）を採用

仕様書では WebSocket (`/api/agent/ws`) を前提としていたが、SSE に変更する。

**理由**: Next.js 15 App Router は WebSocket をネイティブサポートしない。SSE であれば Route Handler で標準的に実装でき、カスタムサーバーが不要。  
クライアント → サーバー方向は通常の HTTP POST で十分。

ADR: `docs/adr/0002-ai-agent-sse-over-websocket.md`

### 2.2 Claude CLI オプション（PoC 検証済み）

仕様書から修正が必要な点：

| 仕様書 | 正しい実装 | 備考 |
|---|---|---|
| `--no-tool Bash` | `--disallowed-tools Bash Write Edit Read` | オプション名が異なる |
| 記載なし | `--verbose` を追加 | `stream-json` に必須（v2.1.x） |
| 記載なし | `stdio: ["ignore", "pipe", "pipe"]` | stdin を閉じないと警告が出る |

参考: `/Users/tarouco/development/memo-blog/docs/agents/claude-cli-subprocess-poc.md`

### 2.3 Next.js アプリの配置

リポジトリルート（`laskflow/`）直下に Next.js プロジェクトを展開する。

### 2.4 テスト戦略

| 層 | ツール | 対象 |
|---|---|---|
| ユニット | Vitest | API Route ロジック、agent パーサー、ユーティリティ |
| E2E | Playwright | Issue CRUD、AI Agent 基本フロー |

テストファイルは実装ファイルと同階層（`foo.ts` / `foo.test.ts`）。E2E は `e2e/` 配下。

---

## 3. プロジェクト規約

### 3.1 ADR（Architecture Decision Records）

`docs/adr/` 配下に Markdown で管理。各フェーズのブレスト時に決定した内容を記録する。

```
docs/adr/
  0001-tech-stack.md
  0002-ai-agent-sse-over-websocket.md
  0003-sqlite-for-personal-use.md
  ...
```

### 3.2 ディレクトリ構成

```
laskflow/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── issues/
│   │   ├── initiatives/
│   │   ├── projects/
│   │   ├── cycles/
│   │   └── api/
│   │       ├── initiatives/
│   │       ├── projects/
│   │       ├── issues/
│   │       ├── cycles/
│   │       └── agent/
│   ├── components/
│   │   ├── layout/
│   │   ├── issues/
│   │   ├── initiatives/
│   │   ├── projects/
│   │   ├── cycles/
│   │   └── agent/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── agent/
│   │   │   ├── claude-cli.ts
│   │   │   ├── system-prompt.ts
│   │   │   └── action-handler.ts
│   │   └── utils.ts
│   ├── stores/
│   │   ├── issueStore.ts
│   │   └── agentStore.ts
│   └── types/
│       └── index.ts
├── e2e/
├── data/
│   └── taskflow.db
├── docs/
│   ├── adr/
│   ├── superpowers/
│   └── taskflow-spec.md
├── .gitignore
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 3.3 .gitignore の主な対象

- `data/taskflow.db`（SQLite ファイル）
- `.env.local`
- `node_modules/`
- `.next/`
- `playwright-report/`

---

## 4. フェーズ構成

各フェーズは独立して動作確認できる状態をゴールとする。  
**次フェーズに入る前に、そのフェーズ専用のブレストセッションを行う。**

### Phase 1 — 基盤 MVP

**完了の定義**: ブラウザで Issue を作成・一覧表示・ステータス変更できる状態

| カテゴリ | 内容 |
|---|---|
| セットアップ | Next.js 15 + TypeScript + Tailwind v4 + Prisma + SQLite + Vitest。`.gitignore`、ADR 初期3件作成 |
| DB | Prisma スキーマ定義・マイグレーション（Initiative / Project / Issue / Cycle） |
| API | 全エンティティの CRUD Route Handler |
| UI | サイドバー + トップバーレイアウト、Issue リスト（ステータス別グループ）、Issue 作成モーダル、Initiative / Project / Cycle 一覧・作成 |
| テスト | Vitest で API Route の基本テスト |

### Phase 2 — UI 充実

**完了の定義**: フィルタ・検索・Cmd+K が動き、全ビューが揃っている状態

| カテゴリ | 内容 |
|---|---|
| Issue | 詳細スライドオーバー、サブタスク表示・作成、Markdown エディタ（Tiptap or MDXEditor はブレスト時に決定） |
| 操作性 | フィルタ・ソート・グローバル検索（Cmd+K）、D&D 並び替え |
| ビュー | Initiative / Project / Cycle 各詳細画面、Cycle 進捗表示 |
| テスト | Playwright セットアップ + 主要フローの E2E |

### Phase 3 — AI Agent 統合

**完了の定義**: 自然言語で Issue 操作・サブタスク分割・進捗サマリーが動く状態

| カテゴリ | 内容 |
|---|---|
| サーバー | Claude CLI サブプロセス起動（`--disallowed-tools` / `--verbose` / `stdio: ignore` を反映）、SSE で中継 |
| パーサー | stream-json パース、JSON アクション抽出、エラー・タイムアウト・レート制限超過時の処理 |
| UI | フローティング Agent パネル、ストリーミング表示、サジェストチップ、破壊的操作の確認ダイアログ |
| 機能 | Issue CRUD、サブタスク自動分割、進捗サマリー、アプリ UI 操作（ビュー切替・フィルタ） |
| テスト | CLI モックを使った Vitest でパーサーロジックのテスト |

### Phase 4 — 磨き込み

**完了の定義**: ポートフォリオとして公開できる品質

| カテゴリ | 内容 |
|---|---|
| UX | キーボードショートカット全般、アニメーション・トランジション、ダークテーマ最適化 |
| データ | JSON / CSV エクスポート |
| 品質 | 楽観的更新、エラーハンドリング全般強化 |
| ドキュメント | README 整備（デモ動画・スクリーンショット含む）、ADR 総まとめ |

---

## 5. スコープ外（本設計で扱わない）

- 認証・マルチユーザー対応（個人利用・localhost 前提）
- クラウドデプロイ
- Agent SDK への移行（Agent SDK がサブスク対応したタイミングで改めて検討）
