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

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(buildMissionRequest(weather, baseMission, preferences)),
    signal
  });

  if (!response.ok) {
    throw new Error(`AI mission service error (${response.status})`);
  }
  const payload = await response.json();
  return validateMissionCandidates(payload.missions, weather, baseMission, preferences);
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
