/**
 * Weather Mission - mission.js
 * 天気条件に基づくミッション選定ロジック
 */

import { isSevereRainOrThunder } from './weather.js';

/**
 * ミッション判定マスター
 * 各ルールの定義と生成するミッションのテンプレート
 */
export const MISSION_DEFINITIONS = {
  EXTREME_HEAT: {
    priority: 1,
    ruleId: 'EXTREME_HEAT',
    title: '室内で軽くストレッチ',
    category: 'indoor_stretch',
    durationMinutes: 5,
    description: '涼しい室内で肩甲骨や股関節を伸ばす軽いストレッチを行いましょう。こまめに水分・塩分を補給してください。',
    getReason: (data) => `予想最高気温が${data.daily.tempMax ?? '--'}℃と猛暑基準（35℃以上）に達するため、屋外活動を避け熱中症を予防します。`
  },
  SEVERE_WEATHER: {
    priority: 2,
    ruleId: 'SEVERE_WEATHER',
    title: '屋内で5分間運動',
    category: 'indoor_exercise',
    durationMinutes: 5,
    description: '大雨や雷雨の危険があるため外出は控えましょう。安全な屋内でラジオ体操や軽い足踏み運動を5分間行います。',
    getReason: (data) => `現在の天候が「${data.current.weatherLabel} (コード:${data.current.weatherCode})」で大雨・雷雨警報域に該当するため、安全確保を最優先します。`
  },
  HIGH_PRECIP_PROB: {
    priority: 3,
    ruleId: 'HIGH_PRECIP_PROB',
    title: '室内で10分間運動',
    category: 'indoor_exercise',
    durationMinutes: 10,
    description: '降水確率が高く雨に降られるリスクがあります。室内で自重スクワットやステップ運動などを10分間行いましょう。',
    getReason: (data) => `今日の最大降水確率が${data.daily.precipProbMax ?? '--'}%（基準60%以上）と高いため、濡れるリスクのない室内運動を選択しました。`
  },
  COLD_WEATHER: {
    priority: 4,
    ruleId: 'COLD_WEATHER',
    title: '暖かい室内で軽く身体を動かす',
    category: 'indoor_warmup',
    durationMinutes: 5,
    description: '寒さで筋肉が強張りやすい状態です。暖かい部屋で手足のグーパー運動やその場足踏みをして身体を温めましょう。',
    getReason: (data) => `予想最高気温が${data.daily.tempMax ?? '--'}℃と寒冷基準（10℃未満）のため、急な冷え込みによるケガや体調不良を予防します。`
  },
  OUTDOOR_WALK: {
    priority: 5,
    ruleId: 'OUTDOOR_WALK',
    title: '外に出て10分間歩く',
    category: 'outdoor_walk',
    durationMinutes: 10,
    description: '外の空気を吸いながら、近所を10分間リフレッシュウォーキングしましょう。歩くことで気分転換と生活リズム改善を図ります。',
    getReason: (data) => `猛暑・悪天候・高降水確率・極度の低温のいずれにも該当しない好条件のため、屋外でのウォーキングを推奨します。`
  },
  DATA_FALLBACK: {
    priority: 99,
    ruleId: 'DATA_FALLBACK',
    title: '室内で姿勢を正して深呼吸',
    category: 'indoor_stretch',
    durationMinutes: 3,
    description: '気象データの一部を取得できなかったため、安全を考慮して負担の少ない室内リフレッシュミッションを提案します。',
    getReason: (data) => `一部の気象データが欠落していたため、安全側デフォルト動作として室内での軽いリフレッシュを選択しました。`
  }
};

/**
 * 天気データから優先順位に基づいてミッションを1件判定する
 * 
 * 判定優先順位：
 * 1. 最高気温 >= 35℃  -> 室内ストレッチ (5分)
 * 2. 大雨・雷雨コード  -> 屋内運動 (5分)
 * 3. 降水確率 >= 60%  -> 室内運動 (10分)
 * 4. 最高気温 < 10℃   -> 暖かい室内で軽く動く (5分)
 * 5. それ以外          -> 外に出て10分歩く (10分)
 * 
 * @param {object} weatherData `fetchWeatherData` または `DEMO_PRESETS` が返すデータ構造
 * @returns {object} 構造化ミッションオブジェクト
 */
export function determineMission(weatherData, mood = globalThis.__LIFE_PILOT_MOOD || 'normal') {
  if (!weatherData) {
    throw new Error('判定対象の天気データが指定されていません。');
  }

  const { current, daily } = weatherData;

  // 欠損値（null / undefined）チェック
  const tempMax = daily?.tempMax;
  const weatherCode = current?.weatherCode;
  const precipProbMax = daily?.precipProbMax;

  // 重要な値がすべて欠損している場合はフォールバック
  if (tempMax === null || tempMax === undefined || isNaN(tempMax)) {
    return applyMoodMission(buildMission(MISSION_DEFINITIONS.DATA_FALLBACK, weatherData, 'tempMax_missing'), weatherData, mood);
  }

  // 優先順位 1: 今日の最高気温が 35℃ 以上
  if (tempMax >= 35.0) {
    return applyMoodMission(buildMission(MISSION_DEFINITIONS.EXTREME_HEAT, weatherData, `tempMax (${tempMax}℃) >= 35℃`), weatherData, mood);
  }

  // 優先順位 2: 大雨・雷雨に該当する天候コード
  if (weatherCode !== null && weatherCode !== undefined && isSevereRainOrThunder(weatherCode)) {
    return applyMoodMission(buildMission(MISSION_DEFINITIONS.SEVERE_WEATHER, weatherData, `severe weather code (${weatherCode})`), weatherData, mood);
  }

  // 優先順位 3: 今日の最大降水確率が 60% 以上
  if (precipProbMax !== null && precipProbMax !== undefined && !isNaN(precipProbMax) && precipProbMax >= 60) {
    return applyMoodMission(buildMission(MISSION_DEFINITIONS.HIGH_PRECIP_PROB, weatherData, `precipProbMax (${precipProbMax}%) >= 60%`), weatherData, mood);
  }

  // 優先順位 4: 今日の最高気温が 10℃ 未満
  if (tempMax < 10.0) {
    return applyMoodMission(buildMission(MISSION_DEFINITIONS.COLD_WEATHER, weatherData, `tempMax (${tempMax}℃) < 10℃`), weatherData, mood);
  }

  // 優先順位 5: それ以外（屋外行動推奨）
  const baseMission = buildMission(MISSION_DEFINITIONS.OUTDOOR_WALK, weatherData, 'all weather conditions suitable for outdoor');
  return applyMoodMission(baseMission, weatherData, mood);
}

function applyMoodMission(mission, weatherData, mood) {
  if (mood === 'normal') return mission;

  const safeIndoor = (definition, matchedCondition) => buildMission(definition, weatherData, matchedCondition);

  if (mood === 'low') {
    return { ...safeIndoor(MISSION_DEFINITIONS.EXTREME_HEAT, 'mood_low_recovery'), ...{
      title: '室内で5分リカバリー',
      durationMinutes: 5,
      description: '無理をせず、肩と首をゆっくり回して深呼吸します。水分も一口とりましょう。',
      reason: '不調時は負荷を下げ、回復を優先するため'
    }};
  }

  if (mood === 'debt') {
    const definition = MISSION_DEFINITIONS.HIGH_PRECIP_PROB;
    return { ...safeIndoor(definition, 'mood_debt_reset'), ...{
      title: '5分のツケ回収トレーニング',
      durationMinutes: 5,
      description: '室内でスクワットや足踏みを無理のない範囲で5分間行い、先延ばしを一つ返済します。',
      reason: 'サボりへのツケを小さな行動で回収するため'
    }};
  }

  if (mood === 'high' && mission.category === 'outdoor_walk') {
    return { ...mission, title: '絶好調の20分ブーストウォーク', durationMinutes: 20, description: '安全な道を選び、少し速めのペースで20分歩いて今日の勢いを伸ばします。', reason: '絶好調なので、通常より少し高い負荷に挑戦するため' };
  }

  return mission;
}

/**
 * 構造化ミッションオブジェクトを組み立てる
 */
function buildMission(definition, weatherData, matchedCondition) {
  const missionId = `mission_${definition.ruleId.toLowerCase()}_${Date.now()}`;
  return {
    missionId,
    ruleId: definition.ruleId,
    priority: definition.priority,
    title: definition.title,
    description: definition.description,
    reason: definition.getReason(weatherData),
    category: definition.category,
    durationMinutes: definition.durationMinutes,
    completed: false,
    matchedCondition,
    generatedAt: new Date().toISOString(),
    isSafeFallback: definition.ruleId === 'DATA_FALLBACK'
  };
}
