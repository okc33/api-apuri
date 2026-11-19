/**
 * Weather Mission - app.js
 * アプリケーション状態管理 & UIインタラクション
 */

import { CITIES, fetchWeatherData, fetchWeatherDataByCoordinates, DEMO_PRESETS } from './weather.js';
import { determineMission } from './mission.js';
import { generateMissionCandidates } from './ai.js';
import { MOODS, PERSONAS, applyMissionResult, loadProfile, personaFor, personaLine, saveProfile, setMood } from './profile.js';
import { createShakeDetector, speak, stopSpeaking, stopVibration, vibrate } from './intervention.js';

// LocalStorage キー
const STORAGE_KEY_HISTORY = 'weather_mission_completed_log_v1';

// アプリケーション状態
const state = {
  selectedCity: 'nagoya',
  locationMode: 'city',
  coordinates: null,
  currentWeather: null,
  currentMission: null,
  aiCandidates: [],
  activeDemoScenario: 'live',
  isLoading: false,
  history: [],
  profile: null,
  shakeDetector: null,
  dialogueTimer: null
};

// DOM 要素への参照
const elements = {
  citySelect: document.getElementById('city-select'),
  demoSelect: document.getElementById('demo-select'),
  refreshBtn: document.getElementById('refresh-btn'),
  locationBtn: document.getElementById('location-btn'),
  locationStatus: document.getElementById('location-status'),
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
  clearHistoryBtn: document.getElementById('clear-history-btn'),
  generateAiBtn: document.getElementById('generate-ai-btn'),
  aiStatus: document.getElementById('ai-status'),
  aiCandidateList: document.getElementById('ai-candidate-list'),
  preferenceEnvironment: document.getElementById('preference-environment'),
  preferenceDuration: document.getElementById('preference-duration'),
  preferenceIntensity: document.getElementById('preference-intensity'),
  moodSelect: document.getElementById('mood-select'),
  personaLevel: document.getElementById('persona-level'),
  personaCharacter: document.getElementById('persona-character'),
  dialogueSpeaker: document.getElementById('dialogue-speaker'),
  personaName: document.getElementById('persona-name'),
  personaTone: document.getElementById('persona-tone'),
  syncRate: document.getElementById('sync-rate'),
  syncRateLabel: document.getElementById('sync-rate-label'),
  debtRate: document.getElementById('debt-rate'),
  debtRateLabel: document.getElementById('debt-rate-label'),
  pilotDialogue: document.getElementById('pilot-dialogue'),
  speakBtn: document.getElementById('speak-btn'),
  stopInterventionBtn: document.getElementById('stop-intervention-btn'),
  interventionStatus: document.getElementById('intervention-status'),
  shakeBtn: document.getElementById('shake-btn')
};

/**
 * 初期化処理
 */
function initApp() {
  state.profile = loadProfile();
  loadHistoryFromStorage();
  renderHistory();
  renderPilotProfile();
  setupEventListeners();

  // 初回データ読み込み
  requestCurrentLocation(true);
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

  elements.locationBtn.addEventListener('click', () => requestCurrentLocation(false));
  elements.generateAiBtn.addEventListener('click', generateAiMissions);

  elements.aiCandidateList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-candidate-index]');
    if (!button) return;
    selectAiCandidate(Number(button.dataset.candidateIndex));
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

  elements.moodSelect.addEventListener('change', (event) => {
    state.profile = saveProfile(setMood(state.profile, event.target.value));
    renderPilotProfile();
    announcePilot('intro');
  });

  elements.speakBtn.addEventListener('click', () => announcePilot(state.currentMission ? 'mission' : 'intro'));
  elements.stopInterventionBtn.addEventListener('click', () => {
    stopSpeaking();
    stopVibration();
    state.shakeDetector?.stop();
    elements.shakeBtn.textContent = '📱 シェイク判定を開始';
    elements.interventionStatus.textContent = '介入を停止しました。';
  });
  elements.shakeBtn.addEventListener('click', startShakeDetection);
}

/**
 * 天気データ取得とミッション判定を実行（リアルタイムAPI）
 */
async function loadWeatherAndMission() {
  setLoadingState(true);

  try {
    const weather = state.locationMode === 'current' && state.coordinates
      ? await fetchWeatherDataByCoordinates(state.coordinates.latitude, state.coordinates.longitude, { timeoutMs: 8000 })
      : await fetchWeatherData(state.selectedCity, { timeoutMs: 8000 });
    const mission = determineMission(weather);

    state.currentWeather = weather;
    state.currentMission = mission;
    state.aiCandidates = [];
    renderAiCandidates();

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

function requestCurrentLocation(silent) {
  if (state.locationMode === 'current') {
    state.locationMode = 'city';
    state.coordinates = null;
    elements.citySelect.disabled = false;
    elements.locationStatus.textContent = '都市選択モードに戻しました。';
    loadWeatherAndMission();
    return;
  }
  if (!navigator.geolocation) {
    if (!silent) elements.locationStatus.textContent = 'このブラウザは位置情報に対応していません。都市を選択してください。';
    return;
  }
  elements.locationStatus.textContent = '現在地を取得しています…';
  elements.locationBtn.disabled = true;
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      state.locationMode = 'current';
      state.coordinates = { latitude: coords.latitude, longitude: coords.longitude };
      elements.locationStatus.textContent = '現在地を使用中（座標は保存しません）';
      elements.citySelect.disabled = true;
      loadWeatherAndMission();
      elements.locationBtn.disabled = false;
    },
    (error) => {
      state.locationMode = 'city';
      state.coordinates = null;
      elements.citySelect.disabled = false;
      elements.locationStatus.textContent = silent
        ? '現在地を取得できないため、名古屋の天気を表示します。'
        : `現在地を取得できませんでした（${error.message || '許可されていません'}）。`;
      loadWeatherAndMission();
      elements.locationBtn.disabled = false;
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
  );
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
  state.aiCandidates = [];
  renderAiCandidates();

  renderSuccess();
}

async function generateAiMissions() {
  if (!state.currentWeather || !state.currentMission) return;
  elements.generateAiBtn.disabled = true;
  elements.aiStatus.textContent = 'AI候補を生成しています…';
  try {
    const candidates = await generateMissionCandidates({
      weather: state.currentWeather,
      baseMission: state.currentMission,
      preferences: {
        environment: elements.preferenceEnvironment.value,
        durationMinutes: Number(elements.preferenceDuration.value),
        intensity: elements.preferenceIntensity.value,
        mood: state.profile.mood,
        personaId: state.profile.personaId,
        syncRate: state.profile.syncRate,
        debt: state.profile.debt
      }
    });
    state.aiCandidates = candidates;
    elements.aiStatus.textContent = `${candidates.length}件の候補を生成しました。`;
    renderAiCandidates();
  } catch (error) {
    state.aiCandidates = [];
    renderAiCandidates();
    elements.aiStatus.textContent = 'AI候補を取得できないため、固定ミッションを表示しています。';
    console.warn('AI mission generation failed:', error);
  } finally {
    elements.generateAiBtn.disabled = false;
  }
}

function renderAiCandidates() {
  if (!elements.aiCandidateList) return;
  elements.aiCandidateList.innerHTML = state.aiCandidates.map((candidate, index) => `
    <article class="ai-candidate">
      <h3>${escapeHtml(candidate.title)}</h3>
      <p>${escapeHtml(candidate.description)}</p>
      <p>${escapeHtml(candidate.reason)}</p>
      <span class="candidate-meta">${candidate.durationMinutes}分 / ${escapeHtml(candidate.safetyNote || '安全条件を確認済み')}</span>
      <button class="pixel-btn" type="button" data-candidate-index="${index}">このミッションを選ぶ</button>
    </article>
  `).join('');
}

function selectAiCandidate(index) {
  const candidate = state.aiCandidates[index];
  if (!candidate) return;
  state.currentMission = { ...candidate, completed: false };
  renderSuccess();
  elements.aiStatus.textContent = '選択したAIミッションを表示中です。';
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
  renderPilotProfile();

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
  elements.missionRuleBadge.textContent = `優先度 ${m.priority}`;
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
  if (!m.completed) announcePilot('mission', false);
}

/**
 * ミッションの完了状態トグル
 * @param {boolean} forceState 
 */
function toggleMissionComplete(forceState = null) {
  if (!state.currentMission) return;

  const newState = forceState !== null ? forceState : !state.currentMission.completed;
  if (newState === Boolean(state.currentMission.completed)) return;
  state.currentMission.completed = newState;
  state.profile = saveProfile(applyMissionResult(state.profile, newState));
  renderPilotProfile();

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
      isDemo: Boolean(state.currentWeather.isDemo),
      source: state.currentMission.source || 'rule'
    };
    state.history.unshift(entry);
    saveHistoryToStorage();
    renderHistory();
    announcePilot('complete');
    vibrate([80, 80, 160]);
  } else {
    announcePilot('cancel');
    vibrate([120, 100, 120]);
  }

  updateMissionStatusUI(newState);
}

function renderPilotProfile() {
  if (!state.profile || !elements.personaName) return;
  const profile = state.profile;
  const persona = PERSONAS[profile.personaId] || PERSONAS[personaFor(profile)];
  const mood = MOODS[profile.mood];
  elements.moodSelect.value = profile.mood;
  elements.personaLevel.textContent = `LV.${mood.level}`;
  if (elements.personaCharacter) {
    elements.personaCharacter.textContent = persona.icon;
    elements.personaCharacter.dataset.persona = persona.id;
    elements.personaCharacter.style.setProperty('--persona-color', persona.color);
  }
  elements.personaName.textContent = persona.name;
  elements.personaTone.textContent = `${persona.tone} / ${mood.description}`;
  if (elements.dialogueSpeaker) elements.dialogueSpeaker.textContent = persona.name;
  elements.syncRate.value = profile.syncRate;
  elements.syncRateLabel.textContent = `${profile.syncRate}%`;
  elements.debtRate.value = profile.debt;
  elements.debtRateLabel.textContent = String(profile.debt);
  elements.pilotDialogue.textContent = personaLine(persona, 'intro');
}

function announcePilot(type, readAloud = true) {
  const persona = PERSONAS[state.profile?.personaId] || PERSONAS.teacher;
  const title = state.currentMission?.title || '今日のミッション';
  const line = personaLine(persona, type, title);
  if (state.dialogueTimer) clearInterval(state.dialogueTimer);
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || line.length < 2) {
    elements.pilotDialogue.textContent = line;
  } else {
    let index = 0;
    elements.pilotDialogue.textContent = '';
    state.dialogueTimer = setInterval(() => {
      elements.pilotDialogue.textContent += line[index++];
      if (index >= line.length) {
        clearInterval(state.dialogueTimer);
        state.dialogueTimer = null;
      }
    }, 26);
  }
  if (elements.dialogueSpeaker) elements.dialogueSpeaker.textContent = persona.name;
  if (readAloud) {
    const didSpeak = speak(line);
    elements.interventionStatus.textContent = didSpeak
      ? '音声介入を実行しました。停止できます。'
      : 'このブラウザでは音声読み上げに対応していません。';
  }
}

async function startShakeDetection() {
  if (!state.shakeDetector) {
    state.shakeDetector = createShakeDetector({
      onShake: () => {
        elements.interventionStatus.textContent = 'シェイクを検知しました。ミッション達成として記録します。';
        toggleMissionComplete(true);
      }
    });
  }
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    const permission = await DeviceMotionEvent.requestPermission();
    if (permission !== 'granted') {
      elements.interventionStatus.textContent = 'モーションセンサーの許可が必要です。';
      return;
    }
  }
  if (state.shakeDetector.active) {
    state.shakeDetector.stop();
    elements.shakeBtn.textContent = '📱 シェイク判定を開始';
    elements.interventionStatus.textContent = 'シェイク判定を停止しました。';
    return;
  }
  const started = state.shakeDetector.start();
  elements.shakeBtn.textContent = started ? '⏹ シェイク判定を停止' : '📱 センサー未対応';
  elements.interventionStatus.textContent = started
    ? 'シェイク判定中。停止ボタンで終了できます。'
    : 'センサーを利用できないため、達成ボタンを使ってください。';
}

/**
 * 完了UIの状態反映
 */
function updateMissionStatusUI(isCompleted) {
  if (isCompleted) {
    elements.missionCard.classList.add('completed-mode');
    elements.missionStatusBadge.textContent = '★ CLEAR';
    elements.missionStatusBadge.className = 'badge-tag status-complete';

    elements.completeBtn.innerHTML = '<span class="btn-star">✓</span> CLEAR済み';
    elements.completeBtn.classList.add('is-completed');
    elements.cancelMissionBtn.style.display = 'inline-block';
  } else {
    elements.missionCard.classList.remove('completed-mode');
    elements.missionStatusBadge.textContent = '未達成';
    elements.missionStatusBadge.className = 'badge-tag status-incomplete';

    elements.completeBtn.innerHTML = '<span class="btn-star">★</span> ミッション達成';
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
