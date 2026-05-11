Feature: Subtasks
  親 Issue に子タスクを追加・管理して作業を細分化したい

  Background:
    Given Project "DEV" が存在する
    And Issue "DEV-1 認証機能を実装する" が存在する
    And Issue "DEV-1" のスライドオーバーが開いている

  Scenario: サブタスクを作成する
    When "Add subtask" ボタンをクリックする
    And タイトルに "OAuth プロバイダ設定" を入力する
    And Enter キーを押す
    Then サブタスク一覧に "OAuth プロバイダ設定" が表示される
    And サブタスクのステータスは "todo" である

  Scenario: サブタスクを完了にする
    Given サブタスク "OAuth プロバイダ設定" が存在する
    When サブタスクのチェックボックスをクリックする
    Then サブタスクのステータスが "done" に変更される
    And サブタスクのタイトルに取り消し線が表示される

  Scenario: サブタスクを未完了に戻す
    Given サブタスク "OAuth プロバイダ設定" が "done" である
    When サブタスクのチェックボックスをクリックする
    Then サブタスクのステータスが "todo" に戻る
    And 取り消し線が消える

  Scenario: Issue 一覧でサブタスク進捗バッジが表示される
    Given Issue "DEV-1" にサブタスクが 3 件あり 1 件完了している
    When "/issues" ページを開く
    Then Issue "DEV-1" の行に "1/3" バッジが表示される

  Scenario: サブタスクは Issue 一覧に直接表示されない
    Given Issue "DEV-1" にサブタスク "OAuth プロバイダ設定" がある
    When "/issues" ページを開く
    Then 一覧に "OAuth プロバイダ設定" は表示されない

  Scenario: 空タイトルでサブタスク作成をキャンセルする
    When "Add subtask" ボタンをクリックする
    And タイトルを空のまま Escape キーを押す
    Then サブタスク入力欄が閉じる
    And 新しいサブタスクは作成されない
