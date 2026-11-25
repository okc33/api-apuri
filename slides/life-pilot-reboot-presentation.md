---
marp: true
theme: default
paginate: true
size: 16:9
title: Life Pilot: Reboot
description: 天気と気分に合わせて生活行動をミッション化するPWA
style: |
  @import url('https://fonts.googleapis.com/css2?family=DotGothic16&family=Press+Start+2P&display=swap');
  section {
    background: #100d35;
    color: #f7f4ff;
    font-family: 'DotGothic16', 'Yu Gothic', Meiryo, sans-serif;
    padding: 42px 56px;
    font-size: 22px;
    line-height: 1.45;
  }
  section::after { color: #8d86c7; font-family: monospace; }
  h1, h2 { font-family: 'Press Start 2P', 'DotGothic16', monospace; color: #fff2a8; text-shadow: 3px 3px #4d2c9e; }
  h1 { font-size: 2.0em; line-height: 1.35; }
  h2 { font-size: 1.25em; border-bottom: 3px solid #6fe7ff; padding-bottom: 10px; }
  h3 { color: #6fe7ff; margin: 8px 0; }
  strong { color: #ffb9eb; }
  a { color: #73e8ff; }
  code, pre { background: #090721; color: #bff8ff; border: 1px solid #5b51a5; }
  .lead { background: linear-gradient(135deg, #100d35 0%, #25165f 100%); text-align: center; }
  .lead h1 { font-size: 2.3em; margin-top: 75px; }
  .lead h2 { border: 0; color: #ffb9eb; font-family: 'DotGothic16', sans-serif; font-size: 1.3em; }
  .lead img { position: absolute; right: 30px; bottom: 0; width: 330px; height: 480px; object-fit: cover; object-position: center; opacity: .9; }
  .lead .copy { position: relative; z-index: 2; text-align: left; width: 66%; }
  .tag { display: inline-block; background: #31276e; border: 2px solid #8f80ee; color: #bff8ff; padding: 4px 12px; font-size: .72em; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items: center; }
  .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .card { background: #211b58; border: 2px solid #756dcc; box-shadow: 5px 5px #090721; padding: 15px 18px; }
  .card h3 { font-size: .92em; }
  .card p, .card li { font-size: .8em; }
  .screen-shot { max-height: 470px; max-width: 100%; object-fit: contain; border: 3px solid #9d95e8; box-shadow: 5px 5px #090721; }
  .flow { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 26px 0; }
  .flow span { background: #2a2366; border: 2px solid #8d82e8; padding: 16px 13px; text-align: center; font-size: .78em; }
  .flow b { color: #ffe36e; font-size: 1.4em; }
  .small { font-size: .7em; color: #c8c4ef; }
  .accent { color: #6fe7ff; }
  .warn { border-left: 6px solid #ff718d; background: #321a3e; padding: 12px 16px; }
  .footer-note { position: absolute; bottom: 22px; color: #8d86c7; font-size: .58em; }
---

<!-- _class: lead -->

<div class="copy">
<span class="tag">LIFE PILOT PROJECT</span>

# Life Pilot: Reboot

## スマホに自分を操縦させる、生活リズムハック

天気と気分に合わせて、今日の行動をミッションに変えるPWA
</div>
<img src="../assets/art/title-skyline.png" alt="夕暮れの街を眺めるパイロット">

---

# 1. 解決したい課題

<div class="grid3">
<div class="card"><h3>意志力に頼りすぎる</h3><p>やる気がある日だけ行動できる。疲れている日は、最初の一歩が重い。</p></div>
<div class="card"><h3>天候と体調を無視する</h3><p>晴天の日と大雨の日で同じ行動を選ぶと、無理や失敗につながる。</p></div>
<div class="card"><h3>習慣が単調になる</h3><p>正しい行動でも、毎日同じだと飽きて続きにくい。</p></div>
</div>

<div class="warn"><strong>着眼点：</strong>「頑張る」仕組みではなく、次にやることを小さく具体化し、ゲームとして開始できる仕組みにする。</div>

---

# 2. コンセプト

<div class="grid2">
<div>
<h3>利用者は「機体」</h3>
<p>その日の気分を選ぶと、パイロット人格が変わり、強さや語り口が変化する。</p>
<h3>生活改善を「バトル」にする</h3>
<p>行動をミッション化し、HP・シンクロ率・サボりへのツケで結果を可視化する。</p>
</div>
<img class="screen-shot" src="../assets/screenshots/02_mission_completed.png" alt="ミッション達成画面">
</div>

---

# 3. アプリの使い方

<div class="flow"><span>① 起動</span><b>›</b><span>② 気分を選ぶ</span><b>›</b><span>③ 指令を確認</span><b>›</b><span>④ 集中する</span><b>›</b><span>⑤ 達成</span></div>

<div class="grid2">
<div class="card"><h3>入力</h3><ul><li>気分：不調／通常／絶好調／サボり期</li><li>地域または現在地</li><li>必要ならAI候補の条件</li></ul></div>
<div class="card"><h3>出力</h3><ul><li>天気に合った行動</li><li>所要時間と理由</li><li>人格らしいメッセージ</li></ul></div>
</div>

---

# 4. UI設計：ゲームの導線をそのまま使う

<div class="grid2">
<div>
<p><strong>タイトル</strong>：起動する理由をつくる</p>
<p><strong>コンディション</strong>：自分の状態を選ぶ</p>
<p><strong>ミッション指令</strong>：行動を一つに絞る</p>
<p><strong>集中タイマー</strong>：実行中の状態を見せる</p>
<p><strong>達成画面</strong>：次の行動につなげる</p>
</div>
<img class="screen-shot" src="../assets/screenshots/05_desktop_view.png" alt="アプリのデスクトップ表示">
</div>

---

# 5. 天気からミッションを決める

<div class="grid2">
<div class="card"><h3>Open-Meteo API</h3><p>現在気温、最高気温、天気コード、降水確率を取得する。</p><p class="small">APIキー不要。都市選択とブラウザの現在地に対応。</p></div>
<div class="card"><h3>安全優先の固定ルール</h3><ol><li>猛暑：室内ストレッチ</li><li>大雨・雷雨：屋外行動を避ける</li><li>高降水確率：室内運動</li><li>寒冷：軽いウォームアップ</li><li>その他：屋外ウォーキング</li></ol></div>
</div>

<div class="warn"><strong>設計判断：</strong>天気APIの結果から安全性を含む基本ミッションを先に決め、AIはその範囲内で候補や表現を補助する。</div>

---

# 6. AIの役割

<div class="flow"><span>天気・気分・ステータス</span><b>→</b><span>Cloudflare Worker</span><b>→</b><span>Gemini API</span><b>→</b><span>ミッション候補</span></div>

<div class="grid2">
<div class="card"><h3>現在の実装</h3><ul><li>AI候補のタイトル・説明・理由・時間を生成</li><li>最大3件に制限</li><li>カテゴリと所要時間を検証</li></ul></div>
<div class="card"><h3>今後の拡張</h3><ul><li>教官・鬼軍曹・マッドサイエンティストなどの人格文</li><li>音声読み上げ用の短い指令</li><li>達成状況に応じたセリフ</li></ul></div>
</div>

<p class="small">Gemini APIキーはGitHub Pagesに置かず、Cloudflare WorkerのSecretとして管理する。</p>

---

# 7. 技術構成

<div class="grid3">
<div class="card"><h3>フロントエンド</h3><p>HTML / CSS / Vanilla JavaScript<br>Marpと同じレトロピクセル表現<br>LocalStorageでプロフィールと履歴を保存</p></div>
<div class="card"><h3>外部API</h3><p>Open-Meteo：天気<br>Gemini：候補・人格表現<br>Cloudflare Worker：APIキー保護</p></div>
<div class="card"><h3>端末機能</h3><p>Geolocation：現在地<br>DeviceMotion：シェイク<br>SpeechSynthesis：読み上げ<br>Vibration：フィードバック</p></div>
</div>

---

# 8. 安全性とプライバシー

<div class="grid2">
<div class="card"><h3>安全性</h3><ul><li>AIの出力をクライアントとWorkerの両方で検証</li><li>危険な天候時の屋外行動を拒否</li><li>所要時間を3〜30分に制限</li><li>AI停止時は固定ミッションへ戻す</li></ul></div>
<div class="card"><h3>プライバシー</h3><ul><li>現在地は天気取得のためだけに利用</li><li>座標をLocalStorageへ保存しない</li><li>Geminiキーをブラウザへ出さない</li><li>端末センサーはユーザー操作時だけ利用</li></ul></div>
</div>

---

# 9. 現在の実装状況

<div class="grid2">
<div>
<p><span class="accent">実装済み</span></p>
<ul><li>レトロRPG風の画面遷移</li><li>天気取得・デモシナリオ</li><li>気分と人格の切り替え</li><li>ミッションタイマー</li><li>達成履歴とステータス更新</li><li>現在地取得のエラー処理</li></ul>
</div>
<div>
<p><span class="accent">接続準備済み</span></p>
<ul><li>Cloudflare Worker</li><li>Gemini API呼び出し</li><li>APIキーのSecret管理</li><li>AI候補の安全検証</li></ul>
<div class="warn">残作業：Worker URLとGemini APIキーを設定して本番接続する。</div>
</div>
</div>

---

## 現在の実装に合わせた更新

<div class="grid2">
<div class="card"><h3>コンディション連動</h3><ul><li>不調：室内5分リカバリー</li><li>ふつう：天候に合わせた標準ミッション</li><li>絶好調：20分ブーストウォーク</li><li>サボり気味：室内5分ツケ回収</li></ul></div>
<div class="card"><h3>AI指令生成</h3><ul><li>安全な基本ミッションを先に決定</li><li>Geminiがタイトル・説明・理由を具体化</li><li>失敗時は固定ミッションへフォールバック</li></ul></div>
</div>

<div class="flow"><span>天気・気分</span><b>→</b><span>安全判定</span><b>→</b><span>Gemini指令</span><b>→</b><span>実行</span></div>

<div class="warn"><strong>設定画面のAIミッション候補</strong>：場所・時間を指定して最大3件の候補を生成し、選択した候補を実行できます。APIが利用できない場合も通常ミッションは継続します。</div>

<p class="small">設定からホームへ戻る画面遷移も修正済み。APIキーはCloudflare Worker側で管理し、ブラウザには公開しません。</p>

---

# 10. 今後の方針

<div class="grid3">
<div class="card"><h3>生活リズム</h3><p>起床・就寝時刻、固定タスク、連続達成日数を追加する。</p></div>
<div class="card"><h3>介入体験</h3><p>人格によるリアルタイム指令、読み上げ、通知、水平設置判定を追加する。</p></div>
<div class="card"><h3>成長要素</h3><p>人格の解放、シンクロ率による態度変化、サボりへのツケの演出を強化する。</p></div>
</div>

<p class="small">ブラウザのバックグラウンド処理やiOSのセンサー制約を考慮し、常時監視ではなくユーザーが開始したミッション単位で実装する。</p>

---

<!-- _class: lead -->

# まとめ

## Life Pilot: Rebootは、生活改善を「続けられるゲーム」に変える

<div class="flow"><span>天気</span><b>＋</b><span>気分</span><b>＋</b><span>安全ルール</span><b>＋</b><span>AI人格</span></div>

次にやることを小さくし、行動の開始を楽しくする。

<p class="footer-note">参考：Open-Meteo API / Google Gemini API / Cloudflare Workers</p>
