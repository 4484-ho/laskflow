Feature: Issue Management
  ソロ開発者として、Issue を作成・編集・管理して作業を追跡したい

  Background:
    Given Project "DEV" が存在する
    And "/issues" ページを開いている

  # ── 作成 ──

  Scenario: Issue を新規作成する
    When "New Issue" ボタンをクリックする
    And タイトルに "認証機能を実装する" を入力する
    And "Create" ボタンをクリックする
    Then Issue 一覧に "認証機能を実装する" が表示される
    And identifier が "DEV-1" 形式で自動採番されている

  Scenario: 必須フィールド未入力で作成できない
    When "New Issue" ボタンをクリックする
    And タイトルを空のまま "Create" をクリックする
    Then Issue は作成されない

  # ── スライドオーバー ──

  Scenario: Issue をクリックしてスライドオーバーを開く
    Given Issue "DEV-1 認証機能を実装する" が存在する
    When Issue 行をクリックする
    Then 右側にスライドオーバーが表示される
    And URL に "?selected=<issueId>" が付与される
    And identifier "DEV-1" がヘッダーに表示される

  Scenario: スライドオーバーの URL をリロードしても復元される
    Given Issue のスライドオーバーが開いている
    And URL に "?selected=<issueId>" がある
    When ページをリロードする
    Then スライドオーバーが再び表示される

  Scenario: ESC キーでスライドオーバーを閉じる
    Given スライドオーバーが開いている
    When ESC キーを押す
    Then スライドオーバーが閉じる
    And URL から "selected" パラメータが削除される

  Scenario: オーバーレイクリックでスライドオーバーを閉じる
    Given スライドオーバーが開いている
    When 背景オーバーレイをクリックする
    Then スライドオーバーが閉じる

  # ── インライン編集 ──

  Scenario: スライドオーバーでタイトルを編集する
    Given Issue "DEV-1" のスライドオーバーが開いている
    When タイトルを "認証機能を実装する (OAuth)" に変更する
    And タイトル入力欄からフォーカスを外す
    Then タイトルが "認証機能を実装する (OAuth)" に更新される

  Scenario: スライドオーバーで description を Markdown 編集する
    Given Issue "DEV-1" のスライドオーバーが開いている
    When Description エディタに "## 概要\nOAuth 2.0 を導入" と入力する
    And エディタからフォーカスを外す
    Then description が Markdown として保存される

  # ── ステータス ──

  Scenario: ステータスアイコンをクリックして次の状態に遷移する
    Given Issue "DEV-1" のステータスが "todo" である
    When ステータスアイコンをクリックする
    Then ステータスが "in_progress" に変更される

  Scenario: ステータス変更はリロード後も維持される
    Given Issue "DEV-1" のステータスを "in_progress" に変更した
    When ページをリロードする
    Then Issue "DEV-1" のステータスは "in_progress" のままである

  # ── メタサイドバー ──

  Scenario: メタサイドバーで Priority を変更する
    Given Issue "DEV-1" のスライドオーバーが開いている
    When Priority セレクトで "high" を選択する
    Then Issue の Priority が "high" に更新される

  Scenario: メタサイドバーで Cycle を割り当てる
    Given Cycle "Sprint 1" が存在する
    And Issue "DEV-1" のスライドオーバーが開いている
    When Cycle セレクトで "Sprint 1" を選択する
    Then Issue の Cycle が "Sprint 1" に更新される

  Scenario: メタサイドバーで Project を変更する
    Given Project "API" が存在する
    And Issue "DEV-1" のスライドオーバーが開いている
    When Project セレクトで "API" を選択する
    Then Issue の Project が "API" に更新される
