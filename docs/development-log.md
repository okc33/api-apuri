# Weather Mission 開発記録 (Development Log)

大学経営情報システム系ゼミ API実習 & 卒業制作「Life Pilot: Reboot」先行開発

## 1. プロジェクト概要
- **名称**: Weather Mission
- **コンセプト**: 「今日の天気を、今日の行動に変える。」
- **目的**: 外部API（Open-Meteo）から気象データを取得し、環境条件に応じた生活改善ミッションを自動選定・提示するWebアプリケーション。
- **技術選定**: HTML5, CSS3, Vanilla JavaScript (ES Modules), Fetch API, LocalStorage, GitHub Pages

---

## 2. 実装タイムライン & 変更履歴

### 2026-10-15: STEP 1 準備
- Gitリポジトリ初期化 (`git init`)
- `.gitignore` の整備
- ディレクトリ構成策定 (`tests/`, `assets/`, `docs/`, `slides/`)
- 開発記録ドキュメント作成

### 2026-10-15: STEP 2 API通信モジュール (`weather.js`)
- Open-Meteo Weather Forecast API (`https://api.open-meteo.com/v1/forecast`) の仕様調査とテスト通信を実施
- 対象3都市（名古屋、東京、大阪）の座標パラメータ定義
- タイムアウト制御（AbortController, 8000ms）、HTTPステータス検査、レスポンス構造（current, daily配列）の整合性検証を実装
- WMO天候コード表（コード・日本語名・ピクセルアイコン・悪天候フラグ）を作成
- プレゼン・検証用固定デモデータ（猛暑、雷雨、降水確率高、寒冷、通常）の定義を追加

### 2026-10-15: STEP 3 ミッション判定ロジック (`mission.js`) & 単体テスト
- 優先順位付き条件分岐（1: 猛暑35℃以上、2: 大雨・雷雨コード、3: 降水確率60%以上、4: 低温10℃未満、5: 通常屋外行動）を実装
- 構造化フィールド（missionId, title, description, reason, category, durationMinutes, completed, ruleId, priority）を網羅
- 欠損値（null/undefined）発生時の安全側フォールバック（室内深呼吸）を実装
- `tests/mission.test.js` を作成し、Node.jsで15項目の単体テストを実行。全15件PASSを確認

### 2026-10-15: STEP 4 UI・アプリ実装 (`index.html`, `style.css`, `app.js`)
- レトロゲーム／携帯端末風UIをVanilla HTML/CSS/JSで設計
- Google Fonts（DotGothic16 / Press Start 2P）、ピクセルボーダー、CRT走査線エフェクトを適用
- 状態遷移（Loading, Error, Success）を明確に分離
- リアルタイムAPI取得・都市切替・更新ボタン・検証用DEMO切替を統合
- LocalStorageによるミッション完了記録と達成ログ機能（最大30件保持）を実装

### 2026-10-15: STEP 5 動作検証 & スクリーンショット自動取得
- Puppeteerスクリプト (`scripts/capture_screens.js`) を作成し、ヘッドレスブラウザでローカルサーバー上の実機画面を自動撮影
- リアルタイム取得（名古屋・快晴・23.7℃）、ミッション完了状態、DEMO猛暑シナリオ、DEMO雷雨シナリオ、デスクトップ表示の各スクリーンショットを `assets/screenshots/` および `slides/img/` に保存完了

