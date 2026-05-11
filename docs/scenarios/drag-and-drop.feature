Feature: Drag & Drop Reordering
  Issue の表示順をドラッグ操作で変更し、永続化したい

  Background:
    Given Project "DEV" が存在する
    And 以下の Issue が "todo" ステータスで存在する:
      | identifier | title      | sortOrder |
      | DEV-1      | タスク A   | a0        |
      | DEV-2      | タスク B   | a1        |
      | DEV-3      | タスク C   | a2        |
    And "/issues" ページを開いている

  Scenario: 同一ステータス内で Issue を並び替える
    When "DEV-3 タスク C" を "DEV-1 タスク A" の上にドラッグする
    Then Todo グループの表示順が "タスク C, タスク A, タスク B" になる

  Scenario: 並び替えがリロード後も維持される
    Given "DEV-3" を先頭に並び替えた
    When ページをリロードする
    Then Todo グループの先頭が "タスク C" のままである

  Scenario: ドラッグ中に要素が半透明になる
    When "DEV-2 タスク B" のドラッグハンドルを掴む
    Then ドラッグ中の要素が opacity 0.4 で表示される

  Scenario: 5px 未満の移動ではドラッグが発火しない
    When "DEV-1" のドラッグハンドルを 3px だけ動かす
    Then ドラッグ操作は開始されない
    And クリックイベントとして処理される

  Scenario: 異なるステータスグループ間ではドラッグできない
    Given Issue "DEV-4" のステータスが "in_progress" である
    When "DEV-1 (todo)" を "in_progress" グループにドラッグしようとする
    Then ドロップは受け付けられない
