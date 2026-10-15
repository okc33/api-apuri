/**
 * Weather Mission - app.js
 * アプリケーション状態管理 & UIインタラクション
 */

import { CITIES, fetchWeatherData, DEMO_PRESETS } from './weather.js';
import { determineMission } from './mission.js';

// LocalStorage キー
const STORAGE_KEY_HISTORY = 'weather_mission_completed_log_v1';

// アプリケーション状態
const state = {
  selectedCity: 'nagoya',
  currentWeather: null,
  currentMission: null,
  activeDemoScenario: 'live',
  isLoading: false,
  history: []
};

// DOM 要素への参照
const elements = {
  citySelect: document.getElementById('city-select'),
  demoSelect: document.getElementById('demo-select'),
  refreshBtn: document.getElementById('refresh-btn'),
  retryBtn: document.getElementById('retry-btn'),
  fallbackDemoBtn: document.getElementById('fallback-demo-btn'),

  loadingView: document.getElementById('loading-view'),
  errorView: document.getElementById('error-view'),
  successView: document.getElementById('success-view'),

  errorTitle: document.getElementById('error-title'),
  errorMessage: document.getElementById('error-message'),

  demoNoticeBanner: document.getElementById('demo-notice-banner'),
  demoNoticeText: document.getElementById('demo-notice-text'),

  targetCityName: document.getElementById('target-city-name'),
  weatherIcon: document.getElementById('weather-icon'),
  weatherLabel: document.getElementById('weather-label'),
  tempCurrent: document.getElementById('temp-current'),
  tempMax: document.getElementById('temp-max'),
  precipProb: document.getElementById('precip-prob'),
  forecastDate: document.getElementById('forecast-date'),
  fetchedTime: document.getElementById('fetched-time'),

  missionCard: document.querySelector('.mission-card'),
  missionRuleBadge: document.getElementById('mission-rule-badge'),
  missionTitle: document.getElementById('mission-title'),
  missionDesc: document.getElementById('mission-desc'),
  missionReason: document.getElementById('mission-reason'),
  missionCategory: document.getElementById('mission-category'),
  missionDuration: document.getElementById('mission-duration'),
  missionStatusBadge: document.getElementById('mission-status-badge'),
  completeBtn: document.getElementById('complete-btn'),
  cancelMissionBtn: document.getElementById('cancel-mission-btn'),

  historyCount: document.getElementById('history-count'),
  historyList: document.getElementById('history-list'),
  clearHistoryBtn: document.getElementById('clear-history-btn')
};

/**
 * 初期化処理
 */
function initApp() {
  loadHistoryFromStorage();
  renderHistory();
  setupEventListeners();

  // 初回データ読み込み
  loadWeatherAndMission();
}

/**
 * イベントリスナー登録
 */
function setupEventListeners() {
  // 都市選択変更
  elements.citySelect.addEventListener('change', (e) => {
    state.selectedCity = e.target.value;
    if (state.activeDemoScenario === 'live') {
      loadWeatherAndMission();
    } else {
      // デモシナリオ実行中ならliveに戻して取得
      state.activeDemoScenario = 'live';
      elements.demoSelect.value = 'live';
      loadWeatherAndMission();
    }
  });

  // 更新ボタン
  elements.refreshBtn.addEventListener('click', () => {
    loadWeatherAndMission();
  });

  // 再試行ボタン
  elements.retryBtn.addEventListener('click', () => {
    loadWeatherAndMission();
  });

  // エラー時のDEMOフォールバックボタン
  elements.fallbackDemoBtn.addEventListener('click', () => {
    elements.demoSelect.value = 'outdoor_clear';
    applyDemoScenario('outdoor_clear');
  });

  // デモシナリオ選択
  elements.demoSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    state.activeDemoScenario = val;
    if (val === 'live') {
      loadWeatherAndMission();
    } else {
      applyDemoScenario(val);
    }
  });

  // ミッション完了ボタン
  elements.completeBtn.addEventListener('click', () => {
    toggleMissionComplete();
  });

  // ミッション未達成に戻すボタン
  elements.cancelMissionBtn.addEventListener('click', () => {
    toggleMissionComplete(false);
  });

  // 履歴消去ボタン
  elements.clearHistoryBtn.addEventListener('click', () => {
    if (confirm('ミッション達成ログをすべて消去しますか？')) {
      state.history = [];
      saveHistoryToStorage();
      renderHistory();
    }
  });
}

/**
 * 天気データ取得とミッション判定を実行（リアルタイムAPI）
 */
async function loadWeatherAndMission() {
  setLoadingState(true);

  try {
    const weather = await fetchWeatherData(state.selectedCity, { timeoutMs: 8000 });
    const mission = determineMission(weather);

    state.currentWeather = weather;
    state.currentMission = mission;

    // 前回の完了状態を引き継ぐかチェック (同日・同都市・同ミッションなら)
    checkIfAlreadyCompleted(mission);

    renderSuccess();
  } catch (err) {
    console.error('天気データ取得失敗:', err);
    renderError('API通信エラー', err.message);
  } finally {
    setLoadingState(false);
  }
}

/**
 * DEMO検証用シナリオを適用
 * @param {string} scenarioKey 
 */
function applyDemoScenario(scenarioKey) {
  const preset = DEMO_PRESETS[scenarioKey];
  if (!preset) return;

  state.activeDemoScenario = scenarioKey;
  state.currentWeather = JSON.parse(JSON.stringify(preset.data));
  state.currentMission = determineMission(state.currentWeather);

  renderSuccess();
}

/**
 * ローディング表示の切り替え
 */
function setLoadingState(loading) {
  state.isLoading = loading;
  if (loading) {
    elements.loadingView.style.display = 'block';
    elements.errorView.style.display = 'none';
    elements.successView.style.display = 'none';
    elements.refreshBtn.disabled = true;
    elements.refreshBtn.style.opacity = '0.6';
  } else {
    elements.loadingView.style.display = 'none';
    elements.refreshBtn.disabled = false;
    elements.refreshBtn.style.opacity = '1';
  }
}

/**
 * エラー表示
 */
function renderError(title, message) {
  elements.loadingView.style.display = 'none';
  elements.successView.style.display = 'none';
  elements.errorView.style.display = 'block';

  elements.errorTitle.textContent = title;
  elements.errorMessage.textContent = message;
}

/**
 * 成功時（天気＆ミッション）のUI描画
 */
function renderSuccess() {
  elements.loadingView.style.display = 'none';
  elements.errorView.style.display = 'none';
  elements.successView.style.display = 'flex';

  const w = state.currentWeather;
  const m = state.currentMission;

  // DEMOバナーの表示制御
  if (w.isDemo) {
    elements.demoNoticeBanner.style.display = 'flex';
    const preset = DEMO_PRESETS[w.demoScenario];
    elements.demoNoticeText.textContent = preset ? preset.description : '固定検証用テストデータで表示中';
  } else {
    elements.demoNoticeBanner.style.display = 'none';
  }

  // 天気情報の描画
  elements.targetCityName.textContent = `${w.city.name} (${w.city.id.toUpperCase()})`;
  elements.weatherIcon.textContent = w.current.weatherIcon;
  elements.weatherLabel.textContent = w.current.weatherLabel;
  elements.tempCurrent.textContent = w.current.temperature.toFixed(1);
  elements.tempMax.textContent = w.daily.tempMax !== null ? w.daily.tempMax.toFixed(1) : '--';
  elements.precipProb.textContent = w.daily.precipProbMax !== null ? w.daily.precipProbMax : '--';
  elements.forecastDate.textContent = w.daily.targetDate;

  // 受信時刻表示 (HH:MM:SS)
  const fetchDate = new Date(w.fetchedAt);
  elements.fetchedTime.textContent = fetchDate.toLocaleTimeString('ja-JP');

  // ミッション情報の描画
  elements.missionRuleBadge.textContent = `RULE #${m.priority} [${m.ruleId}]`;
  elements.missionTitle.textContent = m.title;
  elements.missionDesc.textContent = m.description;
  elements.missionReason.textContent = m.reason;

  const categoryLabels = {
    indoor_stretch: '🧘 室内ストレッチ',
    indoor_exercise: '🏠 室内フィットネス',
    indoor_warmup: '🔥 室内ウォームアップ',
    outdoor_walk: '👟 屋外ウォーキング'
  };
  elements.missionCategory.textContent = categoryLabels[m.category] || m.category;
  elements.missionDuration.textContent = `⏱️ 所要 ${m.durationMinutes} 分`;

  // 完了状態の描画更新
  updateMissionStatusUI(m.completed);
}

/**
 * ミッションの完了状態トグル
 * @param {boolean} forceState 
 */
function toggleMissionComplete(forceState = null) {
  if (!state.currentMission) return;

  const newState = forceState !== null ? forceState : !state.currentMission.completed;
  state.currentMission.completed = newState;

  if (newState) {
    // 達成記録をログに追加
    const entry = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      dateStr: new Date().toLocaleDateString('ja-JP'),
      timeStr: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      missionTitle: state.currentMission.title,
      ruleId: state.currentMission.ruleId,
      cityName: state.currentWeather.city.name,
      tempMax: state.currentWeather.daily.tempMax,
      weatherLabel: state.currentWeather.current.weatherLabel,
      isDemo: Boolean(state.currentWeather.isDemo)
    };
    state.history.unshift(entry);
    saveHistoryToStorage();
    renderHistory();
  }

  updateMissionStatusUI(newState);
}

/**
 * 完了UIの状態反映
 */
function updateMissionStatusUI(isCompleted) {
  if (isCompleted) {
    elements.missionCard.classList.add('completed-mode');
    elements.missionStatusBadge.textContent = '★ 達成完了！';
    elements.missionStatusBadge.className = 'badge-tag status-complete';

    elements.completeBtn.innerHTML = '<span class="btn-star">✓</span> MISSION CLEARED!';
    elements.completeBtn.classList.add('is-completed');
    elements.cancelMissionBtn.style.display = 'inline-block';
  } else {
    elements.missionCard.classList.remove('completed-mode');
    elements.missionStatusBadge.textContent = '未達成';
    elements.missionStatusBadge.className = 'badge-tag status-incomplete';

    elements.completeBtn.innerHTML = '<span class="btn-star">★</span> MISSION COMPLETE!';
    elements.completeBtn.classList.remove('is-completed');
    elements.cancelMissionBtn.style.display = 'none';
  }
}

/**
 * 過去ログに同日同ミッションの完了履歴があるか確認
 */
function checkIfAlreadyCompleted(mission) {
  const todayStr = new Date().toLocaleDateString('ja-JP');
  const found = state.history.some(h => 
    h.dateStr === todayStr && 
    h.ruleId === mission.ruleId && 
    h.cityName === state.currentWeather?.city?.name
  );
  if (found) {
    mission.completed = true;
  }
}

/**
 * LocalStorage から履歴を読み込む
 */
function loadHistoryFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (raw) {
      state.history = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('LocalStorage読み込み失敗:', e);
    state.history = [];
  }
}

/**
 * LocalStorage へ履歴を保存する
 */
function saveHistoryToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(state.history.slice(0, 30)));
  } catch (e) {
    console.warn('LocalStorage保存失敗:', e);
  }
}

/**
 * 履歴リストの描画
 */
function renderHistory() {
  elements.historyCount.textContent = state.history.length;

  if (state.history.length === 0) {
    elements.historyList.innerHTML = '<li class="empty-log">達成ログはまだありません。ミッションを達成して記録しましょう！</li>';
    return;
  }

  elements.historyList.innerHTML = state.history.map(item => `
    <li class="history-item">
      <div>
        <strong>${escapeHtml(item.missionTitle)}</strong>
        <div class="history-meta">
          ${item.dateStr} ${item.timeStr} | ${escapeHtml(item.cityName)} (${item.weatherLabel}, 最高${item.tempMax ?? '--'}℃)
          ${item.isDemo ? '<span class="badge-demo">DEMO</span>' : ''}
        </div>
      </div>
      <span class="badge-tag status-complete">CLEARED</span>
    </li>
  `).join('');
}

/**
 * XSS対策のエスケープ関数
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 起動
document.addEventListener('DOMContentLoaded', initApp);
