Feature: Cycle Detail & Progress Panel
  Cycle 詳細ページで進捗状況を視覚的に把握したい

  Background:
    Given Project "DEV" が存在する
    And Cycle "Sprint 1" が存在する（開始: 今日、終了: 14日後）
    And 以下の Issue が "Sprint 1" に割り当てられている:
      | identifier | title      | status |
      | DEV-1      | タスク A   | done   |
      | DEV-2      | タスク B   | done   |
      | DEV-3      | タスク C   | todo   |

  Scenario: Cycle 詳細ページで進捗バーが表示される
    When "/cycles/<cycleId>" を開く
    Then "Progress" パネルが表示される
    And "2/3 issues completed" と表示される
    And 進捗率が "67%" と表示される

  Scenario: 進捗が順調な場合は緑のバー
    Given 経過日数が全体の 50% で完了率が 67% である
    When Cycle 詳細ページを開く
    Then 進捗バーが緑色で表示される

  Scenario: 進捗が遅れている場合は黄色のバー
    Given 経過日数が完了率より 15% 多い
    When Cycle 詳細ページを開く
    Then 進捗バーが黄色で表示される

  Scenario: 進捗が大幅に遅れている場合は赤のバー
    Given 経過日数が完了率より 25% 多い
    When Cycle 詳細ページを開く
    Then 進捗バーが赤色で表示される

  Scenario: 期限超過の Cycle では "overdue" が表示される
    Given Cycle の endDate が昨日である
    When Cycle 詳細ページを開く
    Then "1d overdue" と表示される

  Scenario: 残り日数が正しく表示される
    Given Cycle の endDate が 7 日後である
    When Cycle 詳細ページを開く
    Then "7d remaining" と表示される

  Scenario: Cycle 詳細で Issue をクリックしてスライドオーバーを開く
    When "/cycles/<cycleId>" を開く
    And Issue "DEV-3 タスク C" をクリックする
    Then スライドオーバーが表示される
    And URL に "?selected=<issueId>" が付与される

  Scenario: Issue が 0 件の Cycle では進捗 0%
    Given Cycle "Sprint 2" に Issue が割り当てられていない
    When "/cycles/<sprint2Id>" を開く
    Then "0/0 issues completed" と表示される
    And 進捗率が "0%" と表示される
