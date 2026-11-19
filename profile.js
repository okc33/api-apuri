/**
 * Life Pilot: Reboot - profile.js
 * Local-only pilot profile, persona selection, and safe status transitions.
 */

export const PROFILE_STORAGE_KEY = 'life_pilot_profile_v1';

export const MOODS = {
  low: { label: '不調', level: 1, description: 'まずは回復を優先する' },
  normal: { label: '通常', level: 2, description: 'いつものリズムを守る' },
  high: { label: '絶好調', level: 3, description: '少しだけ限界を広げる' },
  debt: { label: 'サボり期', level: 4, description: '積み残しを安全に回収する' }
};

export const PERSONAS = {
  dog: { id: 'dog', name: '相棒の犬', mood: 'low', tone: 'やさしい', icon: '🐕', color: '#86efac' },
  grandma: { id: 'grandma', name: 'やさしい祖母', mood: 'low', tone: 'いたわり', icon: '🧓', color: '#f9a8d4' },
  teacher: { id: 'teacher', name: '担任の先生', mood: 'normal', tone: '淡々と丁寧', icon: '📚', color: '#7dd3fc' },
  butler: { id: 'butler', name: '完璧主義の執事', mood: 'normal', tone: '端正', icon: '🎩', color: '#c4b5fd' },
  sergeant: { id: 'sergeant', name: '鬼軍曹', mood: 'high', tone: '熱血', icon: '🪖', color: '#fbbf24' },
  announcer: { id: 'announcer', name: '熱血実況者', mood: 'high', tone: '大げさ', icon: '📣', color: '#fb7185' },
  collector: { id: 'collector', name: 'ツケ回収係', mood: 'debt', tone: '厳格', icon: '🧾', color: '#f87171' }
};

const DEFAULT_PROFILE = {
  version: 1,
  mood: 'normal',
  personaId: 'teacher',
  syncRate: 20,
  debt: 0,
  completedMissions: 0,
  lastMissionDate: null
};

export function loadProfile(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    return normalizeProfile(parsed);
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile, storage = globalThis.localStorage) {
  const normalized = normalizeProfile(profile);
  try {
    storage?.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Private browsing or a disabled storage API should not stop the app.
  }
  return normalized;
}

export function normalizeProfile(input = {}) {
  const profile = { ...DEFAULT_PROFILE, ...input };
  if (!MOODS[profile.mood]) profile.mood = DEFAULT_PROFILE.mood;
  profile.syncRate = clampNumber(profile.syncRate, 0, 100, DEFAULT_PROFILE.syncRate);
  profile.debt = clampNumber(profile.debt, 0, 10, DEFAULT_PROFILE.debt);
  profile.completedMissions = Math.max(0, Math.floor(Number(profile.completedMissions) || 0));
  profile.personaId = PERSONAS[profile.personaId] ? profile.personaId : personaFor(profile);
  return profile;
}

export function personaFor(profile) {
  const normalized = { ...DEFAULT_PROFILE, ...profile };
  if (Number(normalized.debt) >= 3 || normalized.mood === 'debt') return 'collector';
  const candidates = Object.values(PERSONAS).filter(persona => persona.mood === normalized.mood);
  return candidates[0]?.id || DEFAULT_PROFILE.personaId;
}

export function setMood(profile, mood) {
  const next = normalizeProfile({ ...profile, mood });
  next.personaId = personaFor(next);
  return next;
}

export function applyMissionResult(profile, completed) {
  const next = normalizeProfile(profile);
  if (completed) {
    next.syncRate = Math.min(100, next.syncRate + 5);
    next.debt = Math.max(0, next.debt - 1);
    next.completedMissions += 1;
    next.lastMissionDate = new Date().toISOString().slice(0, 10);
  } else {
    next.debt = Math.min(10, next.debt + 1);
  }
  next.personaId = personaFor(next);
  return next;
}

export function personaLine(persona, type, missionTitle = '今日のミッション') {
  const name = persona?.name || PERSONAS.teacher.name;
  const lines = {
    intro: `${name}「あなたの機体を確認。今日は無理なく、でも一歩進もう。」`,
    mission: `${name}「${missionTitle}を実行してください。完了報告を待っています。」`,
    complete: `${name}「ミッション達成。シンクロ率を更新しました。」`,
    cancel: `${name}「未達成を記録。次の一歩は小さくてかまいません。」`
  };
  return lines[type] || lines.mission;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}
