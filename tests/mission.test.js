/**
 * Weather Mission - 単体テスト (tests/mission.test.js)
 * mission.js の判定ロジック・優先順位・境界値・欠損値のテスト
 */

import assert from 'node:assert';
import { determineMission, MISSION_DEFINITIONS } from '../mission.js';
import { DEMO_PRESETS } from '../weather.js';

console.log('=== Weather Mission 判定ロジック単体テスト開始 ===\n');

let passCount = 0;
let failCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       理由: ${err.message}`);
    failCount++;
  }
}

// 1. 優先順位 1 (猛暑) のテスト
runTest('優先度1: 最高気温35.0℃(境界値) -> EXTREME_HEAT', () => {
  const data = {
    current: { weatherCode: 1, weatherLabel: '晴れ' },
    daily: { tempMax: 35.0, precipProbMax: 10 }
  };
  const m = determineMission(data);
  assert.strictEqual(m.ruleId, 'EXTREME_HEAT');
  assert.strictEqual(m.priority, 1);
  assert.strictEqual(m.category, 'indoor_stretch');
});

runTest('優先度1: 猛暑DEMOデータ -> EXTREME_HEAT', () => {
  const m = determineMission(DEMO_PRESETS.heatwave.data);
  assert.strictEqual(m.ruleId, 'EXTREME_HEAT');
  assert.strictEqual(m.priority, 1);
});

// 2. 優先順位の競合 (猛暑 vs 雷雨) -> 猛暑(優先度1)が優先される
runTest('優先度の検証: 最高気温36℃ かつ 雷雨コード95 -> EXTREME_HEAT が優先', () => {
  const data = {
    current: { weatherCode: 95, weatherLabel: '雷雨' },
    daily: { tempMax: 36.0, precipProbMax: 80 }
  };
  const m = determineMission(data);
  assert.strictEqual(m.ruleId, 'EXTREME_HEAT');
  assert.strictEqual(m.priority, 1);
});

// 3. 優先順位 2 (大雨・雷雨コード) のテスト
runTest('優先度2: 気温30℃, 雷雨コード95 -> SEVERE_WEATHER', () => {
  const m = determineMission(DEMO_PRESETS.severe_rain.data);
  assert.strictEqual(m.ruleId, 'SEVERE_WEATHER');
  assert.strictEqual(m.priority, 2);
  assert.strictEqual(m.category, 'indoor_exercise');
});

runTest('優先度2: 大雨コード65 -> SEVERE_WEATHER', () => {
  const data = {
    current: { weatherCode: 65, weatherLabel: '大雨' },
    daily: { tempMax: 24.0, precipProbMax: 50 }
  };
  const m = determineMission(data);
  assert.strictEqual(m.ruleId, 'SEVERE_WEATHER');
});

// 4. 優先順位の競合 (雷雨 vs 降水確率高) -> 雷雨(優先度2)が優先される
runTest('優先度の検証: 雷雨コード95 かつ 降水確率80% -> SEVERE_WEATHER が優先', () => {
  const data = {
    current: { weatherCode: 95, weatherLabel: '雷雨' },
    daily: { tempMax: 28.0, precipProbMax: 80 }
  };
  const m = determineMission(data);
  assert.strictEqual(m.ruleId, 'SEVERE_WEATHER');
  assert.strictEqual(m.priority, 2);
});

// 5. 優先順位 3 (降水確率60%以上) のテスト
runTest('優先度3: 降水確率60%(境界値), 曇りコード3 -> HIGH_PRECIP_PROB', () => {
  const data = {
    current: { weatherCode: 3, weatherLabel: '曇り' },
    daily: { tempMax: 22.0, precipProbMax: 60 }
  };
  const m = determineMission(data);
  assert.strictEqual(m.ruleId, 'HIGH_PRECIP_PROB');
  assert.strictEqual(m.priority, 3);
  assert.strictEqual(m.category, 'indoor_exercise');
  assert.strictEqual(m.durationMinutes, 10);
});

runTest('優先度3: DEMO降水確率70% -> HIGH_PRECIP_PROB', () => {
  const m = determineMission(DEMO_PRESETS.high_precip.data);
  assert.strictEqual(m.ruleId, 'HIGH_PRECIP_PROB');
});

// 6. 優先順位 4 (最高気温10℃未満) のテスト
runTest('優先度4: 最高気温9.9℃(境界値), 降水確率20% -> COLD_WEATHER', () => {
  const data = {
    current: { weatherCode: 1, weatherLabel: '晴れ' },
    daily: { tempMax: 9.9, precipProbMax: 20 }
  };
  const m = determineMission(data);
  assert.strictEqual(m.ruleId, 'COLD_WEATHER');
  assert.strictEqual(m.priority, 4);
});

runTest('優先度4: 寒冷DEMOデータ(8℃) -> COLD_WEATHER', () => {
  const m = determineMission(DEMO_PRESETS.cold.data);
  assert.strictEqual(m.ruleId, 'COLD_WEATHER');
});

// 7. 優先順位 5 (通常・快適 -> 屋外ウォーキング) のテスト
runTest('優先度5: 気温20℃, 降水確率20%, 晴れ -> OUTDOOR_WALK', () => {
  const m = determineMission(DEMO_PRESETS.outdoor_clear.data);
  assert.strictEqual(m.ruleId, 'OUTDOOR_WALK');
  assert.strictEqual(m.priority, 5);
  assert.strictEqual(m.category, 'outdoor_walk');
  assert.strictEqual(m.durationMinutes, 10);
});

// 8. 境界値（10.0℃ / 34.9℃ / 59%）の通常分岐判定テスト
runTest('境界値: 最高気温10.0℃ (10℃未満ではない), 降水確率59% -> OUTDOOR_WALK', () => {
  const data = {
    current: { weatherCode: 0, weatherLabel: '快晴' },
    daily: { tempMax: 10.0, precipProbMax: 59 }
  };
  const m = determineMission(data);
  assert.strictEqual(m.ruleId, 'OUTDOOR_WALK');
});

runTest('境界値: 最高気温34.9℃ (35℃以上ではない), 降水確率20% -> OUTDOOR_WALK', () => {
  const data = {
    current: { weatherCode: 0, weatherLabel: '快晴' },
    daily: { tempMax: 34.9, precipProbMax: 20 }
  };
  const m = determineMission(data);
  assert.strictEqual(m.ruleId, 'OUTDOOR_WALK');
});

// 9. 欠損値テスト (tempMax欠落時は安全側フォールバック)
runTest('欠損値: tempMax が null -> DATA_FALLBACK', () => {
  const data = {
    current: { weatherCode: 1, weatherLabel: '晴れ' },
    daily: { tempMax: null, precipProbMax: 20 }
  };
  const m = determineMission(data);
  assert.strictEqual(m.ruleId, 'DATA_FALLBACK');
  assert.strictEqual(m.isSafeFallback, true);
});

// 10. 構造化フィールドの検証
runTest('構造化フィールドの完全性チェック', () => {
  const m = determineMission(DEMO_PRESETS.outdoor_clear.data);
  const requiredFields = [
    'missionId', 'title', 'description', 'reason', 
    'category', 'durationMinutes', 'completed'
  ];
  for (const field of requiredFields) {
    assert.ok(field in m, `フィールド ${field} が存在すること`);
  }
});

console.log(`\n=== テスト完了: 合格 ${passCount}件 / 失敗 ${failCount}件 ===`);
if (failCount > 0) {
  process.exit(1);
}
