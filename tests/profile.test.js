import assert from 'node:assert/strict';
import {
  applyMissionResult, loadProfile, normalizeProfile, personaFor, setMood
} from '../profile.js';

const memoryStorage = {
  values: new Map(),
  getItem(key) { return this.values.get(key) ?? null; },
  setItem(key, value) { this.values.set(key, value); }
};

const initial = loadProfile(memoryStorage);
assert.equal(initial.mood, 'normal');
assert.equal(initial.debt, 0);

const low = setMood(initial, 'low');
assert.equal(low.personaId, 'dog');

const completed = applyMissionResult(low, true);
assert.equal(completed.syncRate, 25);
assert.equal(completed.completedMissions, 1);

const missed = applyMissionResult(completed, false);
assert.equal(missed.debt, 1);
assert.equal(personaFor({ mood: 'normal', debt: 3 }), 'collector');

const bounded = normalizeProfile({ syncRate: 999, debt: -4, mood: 'unknown' });
assert.equal(bounded.syncRate, 100);
assert.equal(bounded.debt, 0);
assert.equal(bounded.mood, 'normal');

console.log('Profile state tests passed');
