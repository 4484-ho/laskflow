Feature: Filter & Sort Bar
  Issue 一覧をフィルタ・ソートして必要な情報に素早くアクセスしたい

  Background:
    Given Project "DEV" と Project "API" が存在する
    And Cycle "Sprint 1" が存在する
    And Initiative "Q3 計画" が存在する
    And 以下の Issue が存在する:
      | identifier | title        | status      | project | cycle    |
      | DEV-1      | UI 修正      | todo        | DEV     | Sprint 1 |
      | DEV-2      | API 設計     | in_progress | DEV     | -        |
      | API-1      | 認証エンド   | done        | API     | Sprint 1 |
    And "/issues" ページを開いている

  Scenario: Status でフィルタする
    When Status フィルタで "todo" を選択する
    Then "DEV-1 UI 修正" のみが表示される
    And URL に "status=todo" が含まれる

  Scenario: Project でフィルタする
    When Project フィルタで "API" を選択する
    Then "API-1 認証エンド" のみが表示される

  Scenario: Cycle でフィルタする
    When Cycle フィルタで "Sprint 1" を選択する
    Then "DEV-1" と "API-1" が表示される
    And "DEV-2" は表示されない

  Scenario: 複数フィルタを組み合わせる
    When Status フィルタで "done" を選択する
    And Cycle フィルタで "Sprint 1" を選択する
    Then "API-1 認証エンド" のみが表示される

  Scenario: ソート順を変更する
    When Sort セレクトで "Created" を選択する
    Then Issue が作成日時の降順で表示される
    And URL に "sort=createdAt" が含まれる

  Scenario: フィルタ状態がリロード後も維持される
    Given Status フィルタで "todo" を選択した
    And URL に "status=todo" がある
    When ページをリロードする
    Then Status フィルタが "todo" のままである
    And "DEV-1 UI 修正" のみが表示される

  Scenario: Clear ボタンで全フィルタをリセットする
    Given Status と Project のフィルタを設定した
    When "Clear" ボタンをクリックする
    Then 全てのフィルタがリセットされる
    And 全 Issue が表示される
    And URL からフィルタパラメータが削除される
