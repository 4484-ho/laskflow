# ADR 0002: AI Agent 通信に SSE を採用

**日付:** 2026-04-26
**ステータス:** 採用

## 背景

仕様書では `/api/agent/ws` として WebSocket を想定していたが、
Next.js 15 App Router は WebSocket をネイティブサポートしない。

## 選択肢

| 方式 | 評価 |
|---|---|
| WebSocket（カスタムサーバー） | `server.js` が必要。`next start` が使えなくなる |
| SSE（Server-Sent Events） | Route Handler で標準サポート。カスタムサーバー不要 |
| ポーリング | シンプルだがリアルタイム性に欠ける |

## 決定

**SSE を採用。**

- サーバー → クライアントのストリーミングは SSE で実現
- クライアント → サーバーは通常の HTTP POST

## 結果

Route Handler 内で `ReadableStream` を返すだけで実装できる。
Claude CLI の `stream-json` 出力をそのまま SSE イベントとして中継できる。
