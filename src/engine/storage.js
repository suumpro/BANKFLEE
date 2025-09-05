// Simple localStorage-backed profile + leaderboard + upgrades
const KEY = 'bankflee_profile_v1';

export const UPGRADE_DEFS = {
  speed: { title: '신발끈', desc: '이동속도 +2% /레벨', base: 50, growth: 1.6, cap: 10 },
  maxhp: { title: '강인함', desc: '최대 체력 +10 /레벨', base: 60, growth: 1.6, cap: 10 },
  umbrella: { title: '우산 준비', desc: '시작 시 우산 +1', base: 120, growth: 2.2, cap: 2 },
  xpmul: { title: '경험 풍년', desc: '획득 경험치 +10% /레벨', base: 100, growth: 1.8, cap: 5 },
  magnet: { title: '코인 자석', desc: '코인 흡입 반경 +6px /레벨', base: 140, growth: 1.8, cap: 5 }
};

function defaultProfile() {
  return {
    name: 'Player',
    bestScore: 0,
    bestStage: 1,
    bestRunLevel: 1,
    totalRuns: 0,
    leaderboard: [], // { score, stage, level, coins, difficulty, date }
    credits: 0,
    upgrades: { speed: 0, maxhp: 0, umbrella: 0, xpmul: 0, magnet: 0 },
    difficulty: 'normal',
    settings: { muted: false }
  };
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProfile();
    const obj = JSON.parse(raw);
    // ensure shape
    return { ...defaultProfile(), ...obj, leaderboard: Array.isArray(obj.leaderboard) ? obj.leaderboard : [] };
  } catch (_) {
    return defaultProfile();
  }
}

export function saveProfile(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (_) {}
}

export function recordRun({ score, stage, level, coins, difficulty }) {
  const p = loadProfile();
  const run = { score: Math.floor(score || 0), stage: stage || 1, level: level || 1, coins: coins || 0, difficulty: difficulty || (p.difficulty || 'normal'), date: Date.now() };
  p.totalRuns += 1;
  if (run.score > (p.bestScore || 0)) p.bestScore = run.score;
  if (run.stage > (p.bestStage || 1)) p.bestStage = run.stage;
  if (run.level > (p.bestRunLevel || 1)) p.bestRunLevel = run.level;
  p.leaderboard.push(run);
  p.leaderboard.sort((a, b) => b.score - a.score);
  p.leaderboard = p.leaderboard.slice(0, 10);
  saveProfile(p);
  return p;
}

export function updatePlayerName(newName) {
  const p = loadProfile();
  p.name = (newName || '').trim() || 'Player';
  saveProfile(p);
  return p.name;
}

export function addCredits(n) {
  const p = loadProfile();
  p.credits = Math.max(0, (p.credits || 0) + Math.floor(n || 0));
  saveProfile(p); return p.credits;
}

export function getUpgradeLevel(key) {
  const p = loadProfile();
  return Math.max(0, (p.upgrades && p.upgrades[key]) || 0);
}

export function getUpgradeCost(key) {
  const def = UPGRADE_DEFS[key]; if (!def) return Infinity;
  const lvl = getUpgradeLevel(key);
  return Math.round(def.base * Math.pow(def.growth, lvl));
}

export function getUpgradesState() {
  const p = loadProfile(); const list = [];
  for (const k of Object.keys(UPGRADE_DEFS)) {
    const def = UPGRADE_DEFS[k];
    const lvl = (p.upgrades && p.upgrades[k]) || 0;
    list.push({ key: k, title: def.title, desc: def.desc, level: lvl, max: def.cap, cost: Math.round(def.base * Math.pow(def.growth, lvl)) });
  }
  return { credits: p.credits || 0, items: list };
}

export function purchaseUpgrade(key) {
  const p = loadProfile();
  const def = UPGRADE_DEFS[key]; if (!def) return { ok: false, reason: 'unknown' };
  const cur = (p.upgrades && p.upgrades[key]) || 0;
  if (cur >= def.cap) return { ok: false, reason: 'max' };
  const cost = Math.round(def.base * Math.pow(def.growth, cur));
  if ((p.credits || 0) < cost) return { ok: false, reason: 'funds' };
  p.credits -= cost; p.upgrades[key] = cur + 1; saveProfile(p);
  return { ok: true, profile: p };
}

export function getDifficulty() {
  const p = loadProfile();
  return p.difficulty || 'normal';
}

export function setDifficulty(key) {
  const allowed = ['easy', 'normal', 'hard', 'insane'];
  const p = loadProfile();
  p.difficulty = allowed.includes(key) ? key : 'normal';
  saveProfile(p);
  return p.difficulty;
}

export function getSettings() {
  const p = loadProfile();
  return p.settings || { muted: false };
}

export function setMuted(muted) {
  const p = loadProfile();
  p.settings = { ...(p.settings || {}), muted: !!muted };
  saveProfile(p);
  return p.settings;
}
