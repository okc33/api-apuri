const DEFAULT_AI_ENDPOINT = '';

const ALLOWED_CATEGORIES = new Set([
  'indoor_stretch',
  'indoor_exercise',
  'indoor_warmup',
  'outdoor_walk'
]);

export function getAiEndpoint() {
  return String(globalThis.WEATHER_MISSION_AI_ENDPOINT || DEFAULT_AI_ENDPOINT).trim();
}

export function buildMissionRequest(weather, baseMission, preferences) {
  return {
    weather: {
      cityName: weather.city?.name || '現在地',
      currentTemperature: weather.current?.temperature,
      weatherLabel: weather.current?.weatherLabel,
      weatherCode: weather.current?.weatherCode,
      isSevere: Boolean(weather.current?.isSevere),
      tempMax: weather.daily?.tempMax,
      precipProbMax: weather.daily?.precipProbMax,
      targetDate: weather.daily?.targetDate,
      timezone: weather.timezone
    },
    baseMission: {
      ruleId: baseMission.ruleId,
      category: baseMission.category,
      durationMinutes: baseMission.durationMinutes,
      safetyFallback: Boolean(baseMission.isSafeFallback)
    },
    preferences
  };
}

export async function generateMissionCandidates({ weather, baseMission, preferences, signal } = {}) {
  if (!weather || !baseMission) throw new Error('Weather and base mission are required');
  const endpoint = getAiEndpoint();
  if (!endpoint) throw new Error('AI endpoint is not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(buildMissionRequest(weather, baseMission, preferences)),
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = payload.error || `HTTP ${response.status}`;
      const error = new Error(`AI候補生成に失敗しました: ${detail}`);
      error.code = payload.code || `HTTP_${response.status}`;
      error.status = response.status;
      throw error;
    }
    return validateMissionCandidates(payload.missions, weather, baseMission, preferences);
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('AI候補生成がタイムアウトしました（15秒）');
    if (error instanceof TypeError) throw new Error('AI Workerへ接続できません。URL・公開設定・CORSを確認してください。');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkAiHealth() {
  const endpoint = getAiEndpoint();
  if (!endpoint) throw new Error('AI Worker URLが設定されていません');
  const healthUrl = `${endpoint.replace(/\/api\/missions\/?$/, '')}/api/health`;
  const response = await fetch(healthUrl, { headers: { Accept: 'application/json' } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `AI Worker health check failed (HTTP ${response.status})`);
  }
  return payload;
}

export function validateMissionCandidates(missions, weather, baseMission, preferences = {}) {
  if (!Array.isArray(missions)) throw new Error('AI response must contain missions[]');

  const outdoorBlocked = Boolean(weather.current?.isSevere)
    || Number(weather.daily?.tempMax) >= 35
    || Number(weather.daily?.tempMax) < 10;

  const result = missions.slice(0, 3).map((mission, index) => {
    if (!mission || typeof mission !== 'object') throw new Error('Invalid AI mission');
    const title = String(mission.title || '').trim().slice(0, 80);
    const description = String(mission.description || '').trim().slice(0, 240);
    const reason = String(mission.reason || '').trim().slice(0, 240);
    const category = String(mission.category || '');
    const durationMinutes = Number(mission.durationMinutes);
    if (!title || !description || !reason || !ALLOWED_CATEGORIES.has(category)) {
      throw new Error('AI mission contains invalid fields');
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 3 || durationMinutes > 30) {
      throw new Error('AI mission duration is outside the safe range');
    }
    if (outdoorBlocked && category === 'outdoor_walk') {
      throw new Error('AI suggested an unsafe outdoor mission');
    }
    if (preferences.environment === 'indoor' && category === 'outdoor_walk') {
      throw new Error('AI mission does not match indoor preference');
    }
    if (preferences.environment === 'outdoor' && category !== 'outdoor_walk') {
      throw new Error('AI mission does not match outdoor preference');
    }
    return {
      missionId: `ai_mission_${Date.now()}_${index}`,
      ruleId: 'AI_GENERATED',
      priority: 6,
      title,
      description,
      reason,
      category,
      durationMinutes,
      safetyNote: String(mission.safetyNote || '').trim().slice(0, 160),
      completed: false,
      generatedAt: new Date().toISOString(),
      source: 'ai',
      baseRuleId: baseMission.ruleId
    };
  });

  if (!result.length) throw new Error('AI returned no usable missions');
  return result;
}
