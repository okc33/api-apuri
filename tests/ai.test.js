import assert from 'node:assert/strict';
import { validateMissionCandidates } from '../ai.js';

const weather = {
  current: { isSevere: false },
  daily: { tempMax: 22, precipProbMax: 20 }
};
const baseMission = { ruleId: 'OUTDOOR_WALK', category: 'outdoor_walk', durationMinutes: 10 };
const valid = {
  title: '駅まで歩く',
  description: '近所をゆっくり歩く',
  reason: '気温が穏やかです',
  category: 'outdoor_walk',
  durationMinutes: 10,
  safetyNote: '無理をしない'
};

assert.equal(validateMissionCandidates([valid], weather, baseMission).length, 1);
assert.throws(
  () => validateMissionCandidates([{ ...valid, category: 'outdoor_walk' }], { ...weather, current: { isSevere: true } }, baseMission),
  /unsafe outdoor/
);
assert.throws(
  () => validateMissionCandidates([valid], weather, baseMission, { environment: 'indoor' }),
  /indoor preference/
);
assert.throws(
  () => validateMissionCandidates([{ ...valid, durationMinutes: 60 }], weather, baseMission),
  /duration/
);

console.log('AI candidate validation tests passed');
