Feature: Command Palette
  Cmd+K でアプリ全体を横断検索し、素早くナビゲーションしたい

  Background:
    Given Project "DEV" が存在する
    And Issue "DEV-1 認証機能を実装する" が存在する
    And Initiative "Q3 セキュリティ強化" が存在する
    And Cycle "Sprint 1" が存在する

  Scenario: Cmd+K でコマンドパレットを開く
    Given "/issues" ページを開いている
    When Cmd+K を押す
    Then コマンドパレットが表示される
    And 検索入力欄にフォーカスがある

  Scenario: Ctrl+K でもコマンドパレットが開く
    Given "/issues" ページを開いている
    When Ctrl+K を押す
    Then コマンドパレットが表示される

  Scenario: Issue をタイトルで検索する
    Given コマンドパレットが開いている
    When "認証" と入力する
    Then "Issues" グループに "DEV-1 認証機能を実装する" が表示される

  Scenario: 検索結果から Issue を選択してスライドオーバーを開く
    Given コマンドパレットが開いている
    And "認証" と入力した
    When "DEV-1 認証機能を実装する" を選択する
    Then コマンドパレットが閉じる
    And "/issues?selected=<issueId>" に遷移する

  Scenario: Project を検索して詳細ページに遷移する
    Given コマンドパレットが開いている
    When "DEV" と入力する
    Then "Projects" グループに "DEV" プロジェクトが表示される
    When プロジェクトを選択する
    Then "/projects/<projectId>" に遷移する

  Scenario: 検索結果が無い場合のメッセージ
    Given コマンドパレットが開いている
    When "存在しないキーワード" と入力する
    Then "No results" メッセージが表示される

  Scenario: "Create new issue" アクションを実行する
    Given コマンドパレットが開いている
    When "Create new issue" を選択する
    Then コマンドパレットが閉じる
    And Issue 作成モーダルが開く

  Scenario: コマンドパレットを閉じる
    Given コマンドパレットが開いている
    When Escape キーを押す
    Then コマンドパレットが閉じる
