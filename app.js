import { fetchWeatherData, fetchWeatherDataByCoordinates, DEMO_PRESETS } from './weather.js';
import { determineMission } from './mission.js';
import { generateMissionCandidates, checkAiHealth } from './ai.js';
import { MOODS, PERSONAS, applyMissionResult, loadProfile, saveProfile, setMood } from './profile.js';

const HISTORY_KEY = 'weather_mission_completed_log_v1';
const state = { screen: 'title-screen', city: 'nagoya', locationMode: 'city', coordinates: null, weather: null, mission: null, profile: loadProfile(), history: [], mood: 'normal', timer: null, remaining: 0, total: 0 };
const $ = (id) => document.getElementById(id);
const els = { loading: $('loading-view'), error: $('error-view'), title: $('error-title'), errorMessage: $('error-message'), city: $('city-select'), demo: $('demo-select'), refresh: $('refresh-btn'), location: $('location-btn'), locationStatus: $('location-status'), homeCity: $('home-city'), homeTemp: $('home-temp'), homeRain: $('home-rain'), homeWeatherIcon: $('home-weather-icon'), missionTitle: $('mission-title'), missionDesc: $('mission-desc'), missionDuration: $('mission-duration'), missionCategory: $('mission-category'), missionReason: $('mission-reason'), missionStatus: $('mission-status'), timer: $('mission-timer'), progress: $('mission-progress'), syncReward: $('sync-reward'), debtReward: $('debt-reward'), historyCount: $('history-count'), historyList: $('history-list'), aiStatus: $('ai-status'), aiList: $('ai-candidate-list') };

function showScreen(id) { const normalized = id === 'settings' ? 'settings-screen' : id === 'home' ? 'home-screen' : id; state.screen = normalized; document.querySelectorAll('.screen').forEach((screen) => screen.classList.toggle('active-screen', screen.id === normalized)); if (normalized === 'mission-screen' && state.mission) renderMission(); }
function setLoading(on) { els.loading.style.display = on ? 'grid' : 'none'; if (on) els.error.style.display = 'none'; }
function renderError(title, message) { setLoading(false); els.error.style.display = 'grid'; els.title.textContent = title; els.errorMessage.textContent = message; }
function loadHistory() { try { state.history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { state.history = []; } renderHistory(); }
function renderHistory() { els.historyCount.textContent = state.history.length; els.historyList.innerHTML = state.history.length ? state.history.slice(0, 10).map((entry) => `<li>${entry.dateStr}　${entry.missionTitle}</li>`).join('') : '<li>まだ達成ログはありません。</li>'; }
function weatherToHome() { const w = state.weather; if (!w) return; els.homeCity.textContent = w.city.name; els.homeTemp.textContent = w.current.temperature.toFixed(1); els.homeRain.textContent = w.daily.precipProbMax ?? '--'; els.homeWeatherIcon.textContent = w.current.weatherIcon; }
function renderMission() { const m = state.mission; if (!m) return; els.missionTitle.textContent = m.title; els.missionDesc.textContent = m.description; els.missionDuration.textContent = m.durationMinutes; els.missionReason.textContent = m.reason; els.missionCategory.textContent = ({ outdoor_walk: '屋外ウォーキング', indoor_stretch: '室内ストレッチ', indoor_exercise: '室内フィットネス', indoor_warmup: '室内ウォームアップ' })[m.category] || m.category; els.missionStatus.textContent = m.completed ? 'CLEAR' : '未達成'; }
function selectedMood() { return document.querySelector('.condition-item.selected')?.dataset.mood || 'normal'; }
function applyMood(mood) { state.mood = mood; state.profile = saveProfile(setMood(state.profile, mood)); document.querySelectorAll('.condition-item').forEach((button) => button.classList.toggle('selected', button.dataset.mood === mood)); const moodData = MOODS[mood]; $('home-dialogue').textContent = moodData?.description ? `今日は「${moodData.description}」。それに合わせたミッションを呼び出すぞ！` : '今のキミに合うミッションを呼び出すぞ！'; }
async function loadWeather() { setLoading(true); try { const w = state.locationMode === 'current' && state.coordinates ? await fetchWeatherDataByCoordinates(state.coordinates.latitude, state.coordinates.longitude, { timeoutMs: 8000 }) : await fetchWeatherData(state.city, { timeoutMs: 8000 }); state.weather = w; state.mission = determineMission(w); weatherToHome(); renderMission(); setLoading(false); } catch (error) { renderError('天気データを取得できません', error.message); } }
function applyDemo(key) { const preset = DEMO_PRESETS[key]; if (!preset) return; state.weather = JSON.parse(JSON.stringify(preset.data)); state.mission = determineMission(state.weather); weatherToHome(); renderMission(); setLoading(false); }
function startMission() { if (!state.mission) return; state.total = Math.max(1, Number(state.mission.durationMinutes || 10) * 60); state.remaining = state.total; updateTimer(); showScreen('active-screen'); clearInterval(state.timer); state.timer = setInterval(() => { state.remaining -= 1; updateTimer(); if (state.remaining <= 0) completeMission(); }, 1000); }
function updateTimer() { const minutes = Math.floor(state.remaining / 60).toString().padStart(2, '0'); const seconds = Math.max(0, state.remaining % 60).toString().padStart(2, '0'); els.timer.textContent = `${minutes}:${seconds}`; els.progress.style.width = `${Math.max(0, ((state.total - state.remaining) / state.total) * 100)}%`; }
function completeMission() { if (!state.mission || state.mission.completed) return; clearInterval(state.timer); state.timer = null; state.mission.completed = true; state.profile = saveProfile(applyMissionResult(state.profile, true)); const now = new Date(); state.history.unshift({ id: `log_${Date.now()}`, dateStr: now.toLocaleDateString('ja-JP'), missionTitle: state.mission.title, ruleId: state.mission.ruleId, cityName: state.weather?.city?.name || '現在地' }); localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(0, 30))); renderHistory(); const sync = state.profile.syncRate; els.syncReward.textContent = `${Math.max(0, sync - 6)}% ▶ ${sync}%（+${Math.min(6, sync)}%）`; els.debtReward.textContent = `${state.profile.debt} ▶ ${state.profile.debt}（変化なし）`; showScreen('complete-screen'); }
function cancelMission() { clearInterval(state.timer); state.timer = null; showScreen('mission-screen'); }
async function generateAi() { if (!state.weather || !state.mission) { els.aiStatus.textContent = '先に天気を読み込んでください。'; return; } const button = $('generate-ai-btn'); button.disabled = true; els.aiStatus.textContent = 'Geminiに候補を依頼しています…'; try { const candidates = await generateMissionCandidates({ weather: state.weather, baseMission: state.mission, preferences: { environment: $('preference-environment').value, durationMinutes: Number($('preference-duration').value), intensity: 'light', mood: state.profile.mood, personaId: state.profile.personaId, syncRate: state.profile.syncRate, debt: state.profile.debt } }); els.aiList.innerHTML = candidates.map((candidate, index) => `<article class="ai-candidate"><h3>${escapeHtml(candidate.title)}</h3><p>${escapeHtml(candidate.description)}</p><small>${escapeHtml(candidate.reason)}</small><button class="game-btn secondary" data-candidate="${index}">このミッションを選ぶ</button></article>`).join(''); els.aiStatus.textContent = `Geminiが${candidates.length}件の候補を生成しました`; els.aiList._candidates = candidates; } catch (error) { els.aiStatus.textContent = error.message || 'AI候補生成に失敗しました。'; } finally { button.disabled = false; } }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function setupAiHealthCheck() { const generateButton = $('generate-ai-btn'); if (!generateButton || $('ai-health-btn')) return; const healthButton = document.createElement('button'); healthButton.id = 'ai-health-btn'; healthButton.className = 'game-btn ghost'; healthButton.textContent = 'AI接続を確認'; const status = document.createElement('p'); status.id = 'ai-health-status'; status.className = 'status-text'; generateButton.insertAdjacentElement('afterend', healthButton); healthButton.insertAdjacentElement('afterend', status); healthButton.addEventListener('click', async () => { healthButton.disabled = true; status.textContent = 'Workerへ接続しています…'; try { const result = await checkAiHealth(); status.textContent = result.geminiConfigured ? '接続成功：Gemini API設定済み' : 'Worker接続成功：Gemini APIキー未設定'; } catch (error) { status.textContent = `接続失敗：${error.message}`; } finally { healthButton.disabled = false; } }); }
function requestLocation() { if (!navigator.geolocation) { els.locationStatus.textContent = 'このブラウザでは現在地を利用できません。'; return; } els.locationStatus.textContent = '現在地を取得しています…'; navigator.geolocation.getCurrentPosition(({ coords }) => { state.locationMode = 'current'; state.coordinates = coords; els.locationStatus.textContent = '現在地モードで取得しました。'; loadWeather(); }, () => { els.locationStatus.textContent = '現在地を取得できないため、選択エリアを使います。'; }); }
function locationErrorMessage(error) { if (error?.code === 1) return '位置情報の利用が拒否されています。ブラウザ設定でこのサイトの位置情報を許可してください。'; if (error?.code === 2) return '現在地を取得できませんでした。屋内や電波状況を確認してください。'; if (error?.code === 3) return '現在地の取得がタイムアウトしました。もう一度試してください。'; return '現在地を取得できませんでした。選択エリアを使用します。'; }
async function requestLocationV2() { if (!navigator.geolocation) { els.locationStatus.textContent = 'このブラウザは位置情報に対応していません。'; return; } if (!['https:', 'http:'].includes(location.protocol)) { els.locationStatus.textContent = '位置情報にはHTTPS接続が必要です。'; return; } try { const permission = await navigator.permissions?.query?.({ name: 'geolocation' }); if (permission?.state === 'denied') { els.locationStatus.textContent = '位置情報が拒否されています。ブラウザ設定から許可してください。'; return; } } catch { /* Permissions API is optional. */ } els.locationStatus.textContent = 'GPSから現在地を取得しています…'; navigator.geolocation.getCurrentPosition(({ coords }) => { state.locationMode = 'current'; state.coordinates = { latitude: coords.latitude, longitude: coords.longitude }; els.locationStatus.textContent = `現在地を取得しました（精度 約${Math.round(coords.accuracy || 0)}m）。`; loadWeather(); }, (error) => { state.locationMode = 'city'; state.coordinates = null; els.locationStatus.textContent = locationErrorMessage(error); loadWeather(); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }); }
requestLocation = requestLocationV2;
function bindEvents() { document.addEventListener('click', (event) => { const screenButton = event.target.closest('[data-screen]'); if (screenButton) showScreen(screenButton.dataset.screen); }); $('boot-btn').addEventListener('click', () => { showScreen('home-screen'); if (!state.weather) loadWeather(); }); document.querySelectorAll('.condition-item').forEach((button) => button.addEventListener('click', () => applyMood(button.dataset.mood))); $('condition-confirm').addEventListener('click', () => { if (!state.mission) loadWeather(); showScreen('mission-screen'); }); $('start-mission-btn').addEventListener('click', startMission); $('finish-mission-btn').addEventListener('click', completeMission); $('cancel-active-btn').addEventListener('click', cancelMission); $('mission-back-btn').addEventListener('click', () => showScreen('home-screen')); $('next-mission-btn').addEventListener('click', () => showScreen('home-screen')); $('home-refresh').addEventListener('click', loadWeather); els.refresh.addEventListener('click', loadWeather); els.location.addEventListener('click', requestLocation); els.city.addEventListener('change', () => { state.city = els.city.value; state.locationMode = 'city'; state.coordinates = null; loadWeather(); }); els.demo.addEventListener('change', () => els.demo.value === 'live' ? loadWeather() : applyDemo(els.demo.value)); $('retry-btn').addEventListener('click', loadWeather); $('fallback-demo-btn').addEventListener('click', () => { els.demo.value = 'outdoor_clear'; applyDemo('outdoor_clear'); }); $('generate-ai-btn').addEventListener('click', generateAi); els.aiList.addEventListener('click', (event) => { const button = event.target.closest('[data-candidate]'); if (!button) return; const candidate = els.aiList._candidates?.[Number(button.dataset.candidate)]; if (candidate) { state.mission = { ...candidate, completed: false }; renderMission(); showScreen('mission-screen'); } }); $('clear-history-btn').addEventListener('click', () => { state.history = []; localStorage.removeItem(HISTORY_KEY); renderHistory(); }); }
function updateClock() { $('clock').textContent = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }); }
loadHistory(); bindEvents(); setupAiHealthCheck(); applyMood('normal'); updateClock(); setInterval(updateClock, 30000);

// Keep the selected condition in sync with deterministic missions and let Gemini
// enrich the command after the safe base mission has been selected.
globalThis.__LIFE_PILOT_MOOD = state.mood;
document.querySelectorAll('.condition-item').forEach((button) => button.addEventListener('click', () => {
  globalThis.__LIFE_PILOT_MOOD = button.dataset.mood || 'normal';
  if (state.weather) {
    state.mission = determineMission(state.weather, globalThis.__LIFE_PILOT_MOOD);
    renderMission();
  }
}));

async function enrichMissionWithAi() {
  if (!state.weather || !state.mission || !getAiEndpointSafe()) return;
  try {
    const candidates = await generateMissionCandidates({
      weather: state.weather,
      baseMission: state.mission,
      preferences: {
        environment: $('preference-environment')?.value || 'any',
        durationMinutes: Number($('preference-duration')?.value || state.mission.durationMinutes),
        intensity: 'light',
        mood: state.profile.mood,
        personaId: state.profile.personaId,
        syncRate: state.profile.syncRate,
        debt: state.profile.debt
      }
    });
    if (candidates[0]) {
      state.mission = { ...candidates[0], completed: false };
      renderMission();
      $('home-dialogue').textContent = candidates[0].description;
    }
  } catch {
    // The deterministic safe mission remains active when the AI service is unavailable.
  }
}

function getAiEndpointSafe() {
  return String(globalThis.WEATHER_MISSION_AI_ENDPOINT || '').trim();
}

function syncConfirmedMission(attempt = 0) {
  if (state.weather) {
    state.mission = determineMission(state.weather, state.mood);
    renderMission();
    enrichMissionWithAi();
    return;
  }
  if (attempt < 20) window.setTimeout(() => syncConfirmedMission(attempt + 1), 300);
}

$('condition-confirm').addEventListener('click', () => syncConfirmedMission());
