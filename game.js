(() => {
'use strict';

// ---------------- helpers ----------------
const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const TAU = Math.PI * 2;
function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
function rrect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// ---------------- data ----------------
const TILE = 48, MAP_W = 56, MAP_H = 56;

const WEAPONS = [
  { name: 'Fists', dmg: 8, range: 48, arc: 1.9, cd: 0.32, kb: 150, cost: 0, color: '#e8b48a', type: 'fist', desc: 'Good old knuckles. Fast but weak.' },
  { name: 'Rusty Dagger', dmg: 13, range: 60, arc: 1.6, cd: 0.22, kb: 130, cost: 5, color: '#9aa3ad', type: 'blade', len: 24, desc: 'Quick stabs. Found in a goblin\'s sock.' },
  { name: 'Iron Sword', dmg: 22, range: 80, arc: 2.3, cd: 0.38, kb: 210, cost: 15, color: '#d4dde8', type: 'blade', len: 40, desc: 'A proper hero sword. Wide swings.' },
  { name: 'Battle Axe', dmg: 38, range: 90, arc: 2.8, cd: 0.55, kb: 290, cost: 38, color: '#b8c4d0', type: 'axe', len: 46, desc: 'Heavy. Chops through crowds.' },
  { name: 'War Hammer', dmg: 62, range: 98, arc: 3.1, cd: 0.72, kb: 450, cost: 80, color: '#8d99a6', type: 'hammer', len: 52, desc: 'BONK. Sends monsters flying.' },
  { name: 'Shadow Blade', dmg: 80, range: 94, arc: 2.6, cd: 0.26, kb: 260, cost: 160, color: '#a66bff', type: 'blade', len: 50, glow: true, desc: 'Forged in the dark. Fast AND deadly.' },
];

const SECONDARIES = [
  { name: 'Sling', cost: 0, dmg: 7, cd: 0.65, speed: 420, kind: 'stone', color: '#c4b8a0', desc: 'A free starter sling. Unlimited stones; hold F or SHOOT to fire.' },
  { name: 'Shortbow', cost: 12, dmg: 17, cd: 0.5, speed: 620, kind: 'arrow', color: '#dfc295', desc: 'Quick arrows with a long reach.' },
  { name: 'Crossbow', cost: 35, dmg: 36, cd: 0.95, speed: 740, kind: 'arrow', color: '#a9d9ef', desc: 'Heavy bolts. Slow to reload, hard to survive.' },
  { name: 'Ember Wand', cost: 65, dmg: 25, cd: 0.7, speed: 400, kind: 'fireball', color: '#ff964f', splash: 72, desc: 'Fireballs burst on impact, damaging nearby enemies.' },
];
const BOONS = {
  might: { name: 'Mighty Blows', desc: '+15% damage to melee, secondary weapons and class blasts.', max: Infinity, color: '#ffac79' },
  haste: { name: 'Fleet Foot', desc: '+8% movement speed for this run.', max: 6, color: '#91dfff' },
  reach: { name: 'Long Reach', desc: '+12 melee reach for this run.', max: 5, color: '#e2bdff' },
  fire: { name: 'Flame Strike', desc: 'Melee attacks launch a fireball (0.7s cooldown). More stacks increase its damage.', max: 3, color: '#ff9957' },
  blast: { name: 'Chain Reaction', desc: 'Defeated enemies explode for 18 damage per stack. Explosions can chain, but cannot cross walls.', max: 3, color: '#f6df86' },
  vitality: { name: 'Second Wind', desc: '+20 max HP and restore 20 HP for this run.', max: 5, color: '#a9ee93' },
};

const UPGRADES = {
  sharp: { name: 'Sharpen', desc: '+12% damage per level', max: 10, base: 40, mult: 1.55 },
  armor: { name: 'Armor', desc: '-7% damage taken per level', max: 8, base: 50, mult: 1.65 },
  boots: { name: 'Swift Boots', desc: '+7% move speed per level', max: 6, base: 45, mult: 1.7 },
  heart: { name: 'Heart Container', desc: '+20 max HP per level', max: 10, base: 60, mult: 1.45 },
  gold: { name: 'Gold Rush', desc: '+15% monster gold per level', max: 5, base: 25, mult: 1.5 },
  tracker: { name: 'Enemy Tracker', desc: 'Marks enemies in explored areas on the minimap', max: 1, base: 35, mult: 1 },
  quiver: { name: 'Quick Reload', desc: '-8% secondary cooldown per level', max: 5, base: 30, mult: 1.5 },
};

const ARMORS = [
  { name: 'Traveler Cloth', cost: 0, defense: 0, hp: 0, color: '#7b3fbf', desc: 'Light cloth. Your starting armor.' },
  { name: 'Iron Mail', cost: 30, defense: 0.18, hp: 20, color: '#8facc5', desc: '18% less damage and +20 max HP.' },
  { name: 'Warden Plate', cost: 65, defense: 0.3, hp: 40, color: '#d4ac4f', desc: '30% less damage and +40 max HP.' },
  { name: 'Shadow Cloak', cost: 50, defense: 0.12, hp: 0, speed: 0.12, color: '#463474', desc: '12% less damage and 12% more speed.' },
];
const ACCESSORIES = [
  { name: 'No Accessory', cost: 0, desc: 'An empty accessory slot.' },
  { name: 'Gold Charm', cost: 20, gold: 0.4, desc: 'Monsters drop 40% more gold.' },
  { name: 'Wind Ring', cost: 25, speed: 0.15, desc: 'Move 15% faster.' },
  { name: 'Ward Pendant', cost: 30, ward: 0.5, desc: 'Enemy status effects last half as long.' },
];
const CLASSES = {
  brawler: { name: 'Brawler', ability: 'Enrage', cooldown: 16, duration: 6, hp: 20, speed: 0, color: '#ff845b', desc: '+20 max HP. Enrage gives +50% melee damage for 6 seconds.' },
  rogue: { name: 'Rogue', ability: 'Vanish', cooldown: 14, duration: 5, hp: 0, speed: 0.1, color: '#bb97ff', desc: '+10% speed. Vanish from enemies for 5 seconds, or until you attack.' },
  mystic: { name: 'Mystic', ability: 'Nova', cooldown: 12, duration: 0, hp: 0, speed: 0, color: '#78dfff', desc: 'Release a magic blast that hits nearby visible enemies for 45 damage.' },
};
const STATUS_EFFECTS = {
  poison: { name: 'Poison', duration: 5, dot: 2, color: '#9aef65', desc: 'Lose 2 HP each second' },
  bleed: { name: 'Bleed', duration: 4, dot: 3, color: '#ff8190', desc: 'Lose 3 HP each second' },
  burn: { name: 'Burn', duration: 3, dot: 4, color: '#ffb05f', desc: 'Lose 4 HP each second' },
  slow: { name: 'Slow', duration: 4, color: '#8ed7ff', desc: 'Move 40% slower' },
  weaken: { name: 'Weaken', duration: 4, color: '#d2a0ee', desc: 'Deal 35% less damage' },
  confuse: { name: 'Confused', duration: 2, color: '#ffdc80', desc: 'Movement controls are reversed' },
};
const ENEMY_TYPES = {
  zombie:   { xp: 12, hp: 30, speed: 62, dmg: 10, r: 16, coins: [3, 6], color: '#5f9a3c', minFloor: 1, weight: 5, effects: ['weaken'] },
  bat:      { xp: 6, hp: 12, speed: 150, dmg: 0, r: 11, coins: [1, 3], color: '#7a4fd1', minFloor: 1, weight: 3 },
  skeleton: { xp: 15, hp: 22, speed: 58, dmg: 8, r: 14, coins: [4, 7], color: '#e8e4d8', minFloor: 2, weight: 3, ranged: true, effects: ['bleed'] },
  slime:    { xp: 18, hp: 60, speed: 42, dmg: 9, r: 19, coins: [5, 9], color: '#3fd36b', minFloor: 3, weight: 2, effects: ['poison', 'slow'] },
  ghost:    { xp: 20, hp: 28, speed: 88, dmg: 12, r: 14, coins: [6, 10], color: '#b8c8ff', minFloor: 5, weight: 2, phase: true, effects: ['confuse'] },
  boss:     { boss: true, name: 'Grave Lord', xp: 140, hp: 340, speed: 72, dmg: 20, r: 30, coins: [70, 100], color: '#4f7d35', minFloor: 5, weight: 0, effects: ['burn'] },
  slimeKing: { boss: true, name: 'Slime Sovereign', xp: 160, hp: 390, speed: 48, dmg: 16, r: 30, coins: [80, 110], color: '#64e780', minFloor: 10, weight: 0, effects: ['poison', 'slow'] },
  emberWarden: { boss: true, name: 'Ember Warden', xp: 180, hp: 320, speed: 62, dmg: 18, r: 28, coins: [90, 120], color: '#ff874e', minFloor: 15, weight: 0, effects: ['burn'], ranged: true },
};
const BOSS_TYPES = ['boss', 'slimeKing', 'emberWarden'];
function bossTypeForFloor(level) { return BOSS_TYPES[(Math.floor(level / 5) - 1) % BOSS_TYPES.length]; }

// ---------------- save ----------------
const SAVE_KEY = 'dungeonCrawlerSave_v1';
const defaultSave = () => ({ coins: 0, owned: [0], equipped: 0, secondaryOwned: [0], secondary: 0, armorOwned: [0], armor: 0, accessoryOwned: [0], accessory: 0, classId: 'brawler', up: { sharp: 0, armor: 0, boots: 0, heart: 0, gold: 0, tracker: 0, quiver: 0 }, best: 0, checkpoint: 1, muted: false });
function validateSave(s) {
  const integer = (v, min, max) => Number.isSafeInteger(v) && v >= min && v <= max;
  const equipment = (owned, equipped, count) => Array.isArray(owned) && owned.length <= count && owned.includes(0) && new Set(owned).size === owned.length && owned.every(i => integer(i, 0, count - 1)) && owned.includes(equipped);
  if (!s || typeof s !== 'object' || !integer(s.coins, 0, 1000000000) || !integer(s.best, 0, 1000000) || !integer(s.checkpoint, 1, s.best + 1) || (s.checkpoint - 1) % 5 !== 0 || typeof s.muted !== 'boolean' || typeof s.classId !== 'string' || !Object.hasOwn(CLASSES, s.classId) || !s.up || !Object.keys(UPGRADES).every(k => integer(s.up[k], 0, UPGRADES[k].max)) || !equipment(s.owned, s.equipped, WEAPONS.length) || !equipment(s.secondaryOwned, s.secondary, SECONDARIES.length) || !equipment(s.armorOwned, s.armor, ARMORS.length) || !equipment(s.accessoryOwned, s.accessory, ACCESSORIES.length)) throw new Error('This save contains invalid progress or equipment.');
  return { coins: s.coins, owned: [...s.owned], equipped: s.equipped, secondaryOwned: [...s.secondaryOwned], secondary: s.secondary, armorOwned: [...s.armorOwned], armor: s.armor, accessoryOwned: [...s.accessoryOwned], accessory: s.accessory, classId: s.classId, up: Object.fromEntries(Object.keys(UPGRADES).map(k => [k, s.up[k]])), best: s.best, checkpoint: s.checkpoint, muted: s.muted };
}
let save = loadSave();
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && s.up) return validateSave({ ...defaultSave(), ...s, up: { ...defaultSave().up, ...s.up } });
  } catch (e) { /* ignore */ }
  return defaultSave();
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } }
function upgradeCost(key) { const u = UPGRADES[key]; return Math.round(u.base * Math.pow(u.mult, save.up[key])); }
function playerStats() {
  const armor = ARMORS[save.armor], accessory = ACCESSORIES[save.accessory], hero = CLASSES[save.classId], boons = run.boons;
  return {
    maxHp: 100 + save.up.heart * 20 + armor.hp + hero.hp + boons.vitality * 20,
    speed: 195 * (1 + save.up.boots * 0.07 + (armor.speed || 0) + (accessory.speed || 0) + hero.speed + boons.haste * 0.08),
    dmgMult: 1 + save.up.sharp * 0.12 + boons.might * 0.15,
    rangeBonus: boons.reach * 12,
    dmgTaken: Math.max(0.2, (1 - save.up.armor * 0.07) * (1 - armor.defense)),
    goldMult: 1 + (accessory.gold || 0) + save.up.gold * 0.15, statusDuration: accessory.ward || 1,
    secondary: SECONDARIES[save.secondary], secondaryCdMult: 1 - save.up.quiver * 0.08,
    weapon: WEAPONS[save.equipped], armor,
  };
}
function saveChecksum(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}
function exportSaveCode() {
  const body = btoa(JSON.stringify({ version: 2, progress: validateSave(save) })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `DC2.${body}.${saveChecksum(body)}`;
}
function decodeSaveCode(code) {
  if (code.length > 12000) throw new Error('That save code is too long.');
  const parts = code.trim().split('.');
  if (parts.length !== 3 || !['DC1', 'DC2'].includes(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1]) || saveChecksum(parts[1]) !== parts[2]) throw new Error('The code is incomplete or has been changed. Paste the entire code.');
  let data;
  try { data = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))); }
  catch { throw new Error('This is not a valid Dungeon Crawler save code.'); }
  if (!data || ![1, 2].includes(data.version) || parts[0] !== `DC${data.version}`) throw new Error('This save code version is not supported.');
  const progress = data.progress;
  if (data.version === 1 && progress && progress.up) return validateSave({ secondaryOwned: [0], secondary: 0, ...progress, up: { gold: 0, tracker: 0, quiver: 0, ...progress.up } });
  return validateSave(progress);
}

// ---------------- audio ----------------
const sfx = (() => {
  let ac = null, master = null, drone = null;
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = save.muted ? 0 : 0.5;
    master.connect(ac.destination);
  }
  function tone(o) {
    if (!ac) return;
    const osc = ac.createOscillator(), g = ac.createGain();
    const t = ac.currentTime + (o.delay || 0), dur = o.dur || 0.1;
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    g.gain.setValueAtTime(o.vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.03);
  }
  function noise(dur, vol, freq) {
    if (!ac) return;
    const len = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 900;
    const g = ac.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  function startDrone() {
    if (!ac || drone) return;
    const o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.type = 'sine'; o.frequency.value = 48;
    g.gain.value = 0.05;
    lfo.frequency.value = 0.12; lg.gain.value = 0.03;
    lfo.connect(lg); lg.connect(g.gain);
    o.connect(g); g.connect(master); o.start(); lfo.start();
    drone = { o, lfo, g };
  }
  function stopDrone() { if (!drone) return; drone.o.stop(); drone.lfo.stop(); drone = null; }
  function setMuted(m) { save.muted = m; persist(); if (master) master.gain.value = m ? 0 : 0.5; }
  return {
    init, startDrone, stopDrone, setMuted,
    swing() { noise(0.07, 0.12, 1400); tone({ type: 'triangle', f: 320, f2: 140, dur: 0.07, vol: 0.1 }); },
    hit() { tone({ type: 'square', f: 170, f2: 60, dur: 0.12, vol: 0.25 }); noise(0.1, 0.25, 700); },
    coin() { tone({ type: 'sine', f: 1046, dur: 0.07, vol: 0.15 }); tone({ type: 'sine', f: 1568, dur: 0.14, vol: 0.15, delay: 0.06 }); },
    hurt() { tone({ type: 'sawtooth', f: 240, f2: 70, dur: 0.25, vol: 0.25 }); noise(0.15, 0.2, 500); },
    kill() { tone({ type: 'sawtooth', f: 150, f2: 30, dur: 0.3, vol: 0.2 }); noise(0.22, 0.3, 600); },
    bone() { tone({ type: 'sine', f: 700, f2: 350, dur: 0.1, vol: 0.12 }); },
    heal() { tone({ type: 'sine', f: 520, dur: 0.1, vol: 0.15 }); tone({ type: 'sine', f: 780, dur: 0.18, vol: 0.15, delay: 0.09 }); },
    stairs() { [440, 554, 659, 880].forEach((f, i) => tone({ type: 'triangle', f, dur: 0.18, vol: 0.18, delay: i * 0.09 })); },
    buy() { tone({ type: 'square', f: 660, dur: 0.08, vol: 0.12 }); tone({ type: 'square', f: 990, dur: 0.12, vol: 0.12, delay: 0.08 }); },
    unlock() { [330, 392, 494, 659].forEach((f, i) => tone({ type: 'sine', f, dur: 0.2, vol: 0.18, delay: i * 0.07 })); },
    die() { [300, 240, 180, 110].forEach((f, i) => tone({ type: 'sawtooth', f, f2: f * 0.7, dur: 0.3, vol: 0.2, delay: i * 0.18 })); },
    boss() { tone({ type: 'sawtooth', f: 80, f2: 40, dur: 0.8, vol: 0.3 }); noise(0.5, 0.3, 300); },
  };
})();

// ---------------- canvas ----------------
const canvas = $('game'), ctx = canvas.getContext('2d');
const lightCanvas = document.createElement('canvas'), lctx = lightCanvas.getContext('2d');
let W = 0, H = 0;
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  lightCanvas.width = Math.max(1, Math.ceil(W / 2)); lightCanvas.height = Math.max(1, Math.ceil(H / 2));
  restSticks();
}
window.addEventListener('resize', resize);

// ---------------- state ----------------
function newRun() { return { kills: 0, coins: 0, xp: 0, level: 1, pendingLevels: 0, boons: Object.fromEntries(Object.keys(BOONS).map(key => [key, 0])) }; }
let run = newRun();
let boonChoices = [], explosionQueue = [];
let state = 'home';
let floor = 1, stats = playerStats();
let grid, rooms, torches, decos, stairs, spawnRoom;
let doors = [], doorIndex, explored, merchant = null, lastRevealTile = -1;
let enemies = [], projectiles = [], pickups = [], particles = [], texts = [];
let player = null;
const cam = { x: 0, y: 0, shake: 0 };
let time = 0, floorIntro = 0, shopMode = 'home', stairsAnnounced = false;
const REPLAY_SECONDS = 5, REPLAY_FPS = 30;
let replay;
function resetReplay() {
  clearTimeout(replay?.endTimer);
  replay = { recent: [], best: [], bestScore: 0, score: 0, lastActionAt: -Infinity, nextAt: 0, frames: [], elapsed: 0, duration: 0, index: 0, startedAt: 0, endTimer: null };
}
resetReplay();

function getScene() {
  return { time, floor, floorIntro, player, stats, grid, rooms, doors, doorIndex, merchant, torches, decos, stairs, enemies, projectiles, pickups, particles, texts, cam: { ...cam }, width: W, height: H };
}
function setScene(scene) {
  ({ time, floor, floorIntro, player, stats, grid, rooms, doors, doorIndex, merchant, torches, decos, stairs, enemies, projectiles, pickups, particles, texts } = scene);
  Object.assign(cam, scene.cam);
}
function recordHighlight(force = false) {
  if (!force && time + 0.000001 < replay.nextAt) return;
  replay.nextAt = time + 1 / REPLAY_FPS;
  const scene = getScene();
  scene.player = { ...player, effects: Object.fromEntries(Object.entries(player.effects).map(([key, effect]) => [key, { ...effect }])) }; scene.stairs = { ...stairs }; scene.score = replay.score;
  // Floor geometry is immutable after generation; only moving objects need copying.
  for (const key of ['enemies', 'projectiles', 'pickups', 'particles', 'texts', 'doors']) scene[key] = scene[key].map(item => ({ ...item }));
  replay.recent.push(scene);
  while (replay.recent.length > REPLAY_SECONDS * REPLAY_FPS + 1 || time - replay.recent[0].time > REPLAY_SECONDS) replay.recent.shift();
  const score = replay.score - replay.recent[0].score;
  if (score > replay.bestScore || (score > 0 && score === replay.bestScore && time - replay.lastActionAt <= 1.2)) {
    replay.best = replay.recent.slice();
    replay.bestScore = score;
  }
}
function startReplay() {
  replay.frames = (replay.best.length ? replay.best : replay.recent).slice();
  replay.elapsed = 0; replay.index = 0;
  const first = replay.frames[0], lastFrame = replay.frames[replay.frames.length - 1];
  replay.duration = Math.max(1.5, lastFrame.time - first.time);
  $('replayDetail').textContent = `${replay.bestScore > 0 ? 'Best battle' : 'Your last moments'} · Floor ${first.floor} · ${first.stats.weapon.name}`;
  $('replayProgress').value = 0;
  $('replayTime').textContent = `0:00 / 0:${String(Math.ceil(replay.duration)).padStart(2, '0')}`;
  showScreen('replay');
  $('skipReplayBtn').focus({ preventScroll: true });
  replay.startedAt = performance.now();
  replay.endTimer = setTimeout(finishReplay, Math.ceil(replay.duration * 1000));
  renderReplay(replay.startedAt);
}
function renderReplay(now) {
  // Playback must follow real time, not the capped simulation step.
  replay.elapsed = Math.max(0, (now - replay.startedAt) / 1000);
  if (replay.elapsed >= replay.duration) { finishReplay(); return; }
  const frames = replay.frames;
  const target = frames[0].time + replay.elapsed / replay.duration * (frames[frames.length - 1].time - frames[0].time);
  while (replay.index < frames.length - 1 && frames[replay.index + 1].time <= target) replay.index++;
  const scene = frames[replay.index], live = getScene();
  // Replays only render snapshots; they must never award coins or apply damage again.
  try {
    setScene(scene);
    cam.x += (scene.width - W) / 2; cam.y += (scene.height - H) / 2; cam.shake = 0;
    render();
  } finally { setScene(live); }
  $('replayProgress').value = replay.elapsed / replay.duration;
  $('replayTime').textContent = `0:${String(Math.floor(replay.elapsed)).padStart(2, '0')} / 0:${String(Math.ceil(replay.duration)).padStart(2, '0')}`;
}
function finishReplay() {
  if (state !== 'replay') return;
  state = 'dead'; resetReplay(); sfx.die();
  showScreen('dead');
  $('retryBtn').focus({ preventScroll: true });
}

// ---------------- map generation ----------------
function tileAt(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 0;
  return grid[ty * MAP_W + tx];
}
function setTile(tx, ty, v) { if (tx > 0 && ty > 0 && tx < MAP_W - 1 && ty < MAP_H - 1) grid[ty * MAP_W + tx] = v; }
function carveRect(x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setTile(i, j, 1); }
function carveH(x0, x1, y) { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { setTile(x, y, 1); setTile(x, y + 1, 1); } }
function carveV(y0, y1, x) { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) { setTile(x, y, 1); setTile(x + 1, y, 1); } }
function carveCorridor(x0, y0, x1, y1) {
  if (Math.random() < 0.5) { carveH(x0, x1, y0); carveV(y0, y1, x1); }
  else { carveV(y0, y1, x0); carveH(x0, x1, y1); }
}
function pickEnemyType() {
  const pool = [];
  for (const k in ENEMY_TYPES) {
    const t = ENEMY_TYPES[k];
    if (t.weight > 0 && floor >= t.minFloor) for (let i = 0; i < t.weight; i++) pool.push(k);
  }
  return pool[randi(0, pool.length - 1)];
}

function genFloor() {
  grid = new Uint8Array(MAP_W * MAP_H);
  explored = new Uint8Array(MAP_W * MAP_H);
  doorIndex = new Int16Array(MAP_W * MAP_H).fill(-1);
  doors = []; merchant = null; lastRevealTile = -1;
  rooms = []; torches = []; decos = [];
  enemies = []; projectiles = []; pickups = []; particles = []; texts = [];
  const target = Math.min(14, 7 + Math.floor(floor / 2));
  let tries = 0;
  while (rooms.length < target && tries++ < 500) {
    const w = randi(5, 10), h = randi(5, 8);
    const x = randi(2, MAP_W - w - 3), y = randi(2, MAP_H - h - 3);
    let ok = true;
    for (const r of rooms) if (x < r.x + r.w + 3 && x + w + 3 > r.x && y < r.y + r.h + 3 && y + h + 3 > r.y) { ok = false; break; }
    if (!ok) continue;
    const room = { x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) };
    carveRect(x, y, w, h);
    if (rooms.length) { const p = rooms[rooms.length - 1]; carveCorridor(p.cx, p.cy, room.cx, room.cy); }
    rooms.push(room);
  }
  for (let i = 0; i < Math.floor(rooms.length / 3); i++) {
    const a = rooms[randi(0, rooms.length - 1)], b = rooms[randi(0, rooms.length - 1)];
    if (a !== b) carveCorridor(a.cx, a.cy, b.cx, b.cy);
  }
  for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++) {
    const t = tileAt(tx, ty);
    if (t === 0 && tileAt(tx, ty + 1) === 1 && hash(tx, ty) < 0.13) torches.push({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE * 0.5, seed: hash(ty, tx) * 50 });
    if (t === 1 && hash(tx * 7 + 3, ty * 13 + 1) < 0.08) decos.push({ tx, ty, kind: Math.floor(hash(tx + 99, ty + 7) * 4), rot: hash(tx, ty + 55) * TAU });
  }
  spawnRoom = rooms[0];
  let far = rooms[1] || rooms[0], fd = -1;
  for (const r of rooms) { const d = dist(r.cx, r.cy, spawnRoom.cx, spawnRoom.cy); if (d > fd) { fd = d; far = r; } }
  stairs = { x: far.cx * TILE + TILE / 2, y: far.cy * TILE + TILE / 2, open: false };
  setTile(far.cx, far.cy, 2);
  const bossFloor = floor % 5 === 0;
  const special = rooms.filter(r => r !== spawnRoom && r !== far);
  for (const r of rooms) {
    r.kind = r === special[0] ? 'shop' : r === special[1] ? 'slime' : r === far && bossFloor ? 'boss' : 'crypt';
    if (r === spawnRoom) continue;
    if (r.kind === 'shop') { merchant = { x: r.cx * TILE + TILE / 2, y: r.cy * TILE + TILE / 2 }; continue; }
    let n = r.kind === 'slime' ? Math.min(8, 4 + floor) : Math.min(8, 1 + randi(0, 1) + Math.floor(floor / 4));
    if (r === far && bossFloor) { spawnEnemy(bossTypeForFloor(floor), stairs.x, stairs.y - TILE * 0.5); n = Math.max(0, n - 2); }
    for (let i = 0; i < n; i++) {
      const ex = (r.x + 1.5 + i % (r.w - 2)) * TILE, ey = (r.y + 1.5 + Math.floor(i / (r.w - 2)) % (r.h - 2)) * TILE;
      if (dist(ex, ey, stairs.x, stairs.y) < 70) continue;
      spawnEnemy(r.kind === 'slime' ? 'slime' : pickEnemyType(), ex, ey);
    }
  }
  buildDoors();
  stairsAnnounced = false;
  floorIntro = 2.4;
  if (bossFloor) sfx.boss();
}

function spawnEnemy(type, x, y) {
  const t = ENEMY_TYPES[type];
  const hpScale = 1 + (floor - 1) * 0.2;
  enemies.push({
    type, x, y, r: t.r, hp: t.hp * hpScale, maxHp: t.hp * hpScale,
    speed: t.speed * (1 + (floor - 1) * 0.02), dmg: Math.round(t.dmg * (1 + (floor - 1) * 0.1)),
    kbx: 0, kby: 0, hitFlash: 0, awake: false, wanderT: 0, wa: rand(0, TAU), wandering: false,
    shootCd: rand(1, 2), anim: rand(0, 10), seed: Math.random(), summonT: 5, specialCd: 3, telegraph: 0, atkCd: 0, dead: false,
  });
}

function buildDoors() {
  for (const room of rooms) {
    if (room === spawnRoom) continue;
    const sides = [
      Array.from({ length: room.h }, (_, i) => [room.x, room.y + i, room.x - 1, room.y + i]),
      Array.from({ length: room.h }, (_, i) => [room.x + room.w - 1, room.y + i, room.x + room.w, room.y + i]),
      Array.from({ length: room.w }, (_, i) => [room.x + i, room.y, room.x + i, room.y - 1]),
      Array.from({ length: room.w }, (_, i) => [room.x + i, room.y + room.h - 1, room.x + i, room.y + room.h]),
    ];
    for (const side of sides) {
      let cells = [];
      const place = () => {
        if (!cells.length) return;
        const id = doors.length;
        for (const cell of cells) doorIndex[cell.ty * MAP_W + cell.tx] = id;
        doors.push({ cells, open: false, openedAt: 0 }); cells = [];
      };
      for (const [tx, ty, ox, oy] of side) {
        if (tileAt(ox, oy) !== 0 && tileAt(tx, ty) === 1 && doorIndex[ty * MAP_W + tx] === -1) cells.push({ tx, ty });
        else place();
      }
      place();
    }
  }
}
function solidTile(tx, ty) {
  if (tileAt(tx, ty) === 0) return true;
  const id = doorIndex[ty * MAP_W + tx];
  return id >= 0 && !doors[id].open;
}
function hasLineOfSight(x, y, targetX, targetY) {
  const steps = Math.ceil(dist(x, y, targetX, targetY) / (TILE / 4));
  const endX = Math.floor(targetX / TILE), endY = Math.floor(targetY / TILE);
  for (let i = 1; i < steps; i++) {
    const tx = Math.floor(lerp(x, targetX, i / steps) / TILE), ty = Math.floor(lerp(y, targetY, i / steps) / TILE);
    if ((tx !== endX || ty !== endY) && solidTile(tx, ty)) return false;
  }
  return true;
}
function nearestDoor() {
  let nearest = null, distance = 80;
  for (const door of doors) {
    if (door.open) continue;
    for (const cell of door.cells) {
      const x = (cell.tx + 0.5) * TILE, y = (cell.ty + 0.5) * TILE, d = dist(player.x, player.y, x, y);
      if (d < distance && hasLineOfSight(player.x, player.y, x, y)) { nearest = door; distance = d; }
    }
  }
  return nearest;
}
function nearMerchant() {
  return merchant && dist(player.x, player.y, merchant.x, merchant.y) < 90 && hasLineOfSight(player.x, player.y, merchant.x, merchant.y);
}
function interact() {
  if (state !== 'play') return;
  const door = nearestDoor();
  if (door) {
    door.open = true; door.openedAt = time; cam.shake = 4; sfx.hit();
    for (const cell of door.cells) spawnParticles((cell.tx + 0.5) * TILE, (cell.ty + 0.5) * TILE, 10, '#ae793f');
    revealMap(true); toast('Door kicked open!', 900);
  } else if (nearMerchant()) openShop('merchant');
}
function revealMap(force = false) {
  const px = Math.floor(player.x / TILE), py = Math.floor(player.y / TILE), current = py * MAP_W + px;
  if (!force && current === lastRevealTile) return;
  lastRevealTile = current;
  for (let ty = Math.max(0, py - 4); ty <= Math.min(MAP_H - 1, py + 4); ty++) for (let tx = Math.max(0, px - 4); tx <= Math.min(MAP_W - 1, px + 4); tx++) {
    if (Math.hypot(tx - px, ty - py) <= 4.5 && hasLineOfSight(player.x, player.y, (tx + 0.5) * TILE, (ty + 0.5) * TILE)) explored[ty * MAP_W + tx] = 1;
  }
}
function drawMinimap() {
  const map = $('minimap'), c = map.getContext('2d'), scale = map.width / MAP_W;
  c.fillStyle = '#090611'; c.fillRect(0, 0, map.width, map.height);
  for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++) {
    if (!explored[ty * MAP_W + tx]) continue;
    c.fillStyle = tileAt(tx, ty) ? '#817194' : '#332941';
    const id = doorIndex[ty * MAP_W + tx];
    if (id >= 0 && !doors[id].open) c.fillStyle = '#e2a858';
    c.fillRect(tx * scale, ty * scale, Math.ceil(scale), Math.ceil(scale));
  }
  for (const [point, color] of [[merchant, '#ffd35c'], [stairs, stairs.open ? '#b9ff6c' : '#af82ff']]) {
    if (point && explored[Math.floor(point.y / TILE) * MAP_W + Math.floor(point.x / TILE)]) { c.fillStyle = color; c.fillRect(point.x / TILE * scale - 2, point.y / TILE * scale - 2, 4, 4); }
  }
  if (save.up.tracker > 0) for (const enemy of enemies) {
    if (enemy.dead || !explored[Math.floor(enemy.y / TILE) * MAP_W + Math.floor(enemy.x / TILE)]) continue;
    c.fillStyle = ENEMY_TYPES[enemy.type].boss ? '#ffbc62' : '#ff6b77';
    circle(c, enemy.x / TILE * scale, enemy.y / TILE * scale, ENEMY_TYPES[enemy.type].boss ? 2.5 : 1.5);
  }
  c.fillStyle = '#fff'; circle(c, player.x / TILE * scale, player.y / TILE * scale, 2.5);
}

// ---------------- collision ----------------
function circleHitsWall(x, y, r) {
  const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!solidTile(tx, ty)) continue;
    const nx = clamp(x, tx * TILE, tx * TILE + TILE), ny = clamp(y, ty * TILE, ty * TILE + TILE);
    if ((nx - x) * (nx - x) + (ny - y) * (ny - y) < r * r) return true;
  }
  return false;
}
function moveEntity(e, dx, dy, phase) {
  if (phase) {
    e.x = clamp(e.x + dx, TILE, (MAP_W - 1) * TILE);
    e.y = clamp(e.y + dy, TILE, (MAP_H - 1) * TILE);
    return;
  }
  e.x += dx; if (circleHitsWall(e.x, e.y, e.r)) { e.x -= dx; e.blocked = true; }
  e.y += dy; if (circleHitsWall(e.x, e.y, e.r)) { e.y -= dy; e.blocked = true; }
}

// ---------------- input ----------------
const keys = {};
const mouse = { x: 0, y: 0, down: false };
const touch = { active: false, punch: false, shoot: false, move: { id: null, bx: 0, by: 0, dx: 0, dy: 0 }, aim: { id: null, bx: 0, by: 0, dx: 0, dy: 0 } };
const STICK_R = 48;
const touchLayer = $('touchLayer'), moveStickEl = $('moveStick'), aimStickEl = $('aimStick'), punchBtn = $('punchBtn');

window.addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (state !== 'play' && e.target instanceof HTMLButtonElement && (e.code === 'Enter' || e.code === 'Space')) return;
  if (state === 'play' && (e.code === 'Space' || e.code.startsWith('Arrow'))) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if (e.code === 'Escape' && state === 'replay') finishReplay();
  else if (e.code === 'Escape' && state === 'shop' && shopMode === 'merchant') leaveMerchant();
  else if (e.code === 'Escape' || e.code === 'KeyP') {
    if (state === 'play') openPause(); else if (state === 'pause') closePause();
  }
  if (e.code === 'Enter' && state === 'home') { e.preventDefault(); openClassSelect(); }
  if (e.code === 'KeyE' && state === 'play') interact();
  if (e.code === 'KeyQ' && state === 'play') useAbility();
  sfx.init();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', clearControls);
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mousedown', e => { if (e.button === 0 && (e.target === canvas || e.target === touchLayer)) mouse.down = true; });
window.addEventListener('mouseup', () => { mouse.down = false; });
window.addEventListener('contextmenu', e => { if (e.target === canvas) e.preventDefault(); });

function enableTouch() {
  if (touch.active) return;
  touch.active = true;
  if (state === 'play') { touchLayer.classList.remove('hidden'); punchBtn.classList.remove('hidden'); }
}
window.addEventListener('touchstart', enableTouch, { passive: true, once: true });

function restSticks() {
  const y = H - (W <= 600 ? 174 : 150);
  placeStick(moveStickEl, Math.min(175, W * 0.28), y);
  placeStick(aimStickEl, W - Math.min(150, W * 0.25), y);
  moveStickEl.firstElementChild.style.transform = 'translate(-50%,-50%)';
  aimStickEl.firstElementChild.style.transform = 'translate(-50%,-50%)';
}
function placeStick(el, x, y) { el.style.left = x + 'px'; el.style.top = y + 'px'; }

touchLayer.addEventListener('touchstart', e => {
  e.preventDefault(); sfx.init();
  for (const t of e.changedTouches) {
    const zone = t.clientX < W / 2 ? touch.move : touch.aim;
    if (zone.id !== null) continue;
    const el = zone === touch.move ? moveStickEl : aimStickEl;
    zone.id = t.identifier; zone.dx = zone.dy = 0;
    zone.bx = clamp(t.clientX, 70, W - 70); zone.by = clamp(t.clientY, 70, H - 70);
    placeStick(el, zone.bx, zone.by); el.classList.add('active');
  }
}, { passive: false });
touchLayer.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const zone = t.identifier === touch.move.id ? touch.move : t.identifier === touch.aim.id ? touch.aim : null;
    if (!zone) continue;
    let dx = t.clientX - zone.bx, dy = t.clientY - zone.by;
    const len = Math.hypot(dx, dy);
    if (len > STICK_R) { dx = dx / len * STICK_R; dy = dy / len * STICK_R; }
    zone.dx = dx; zone.dy = dy;
    const el = zone === touch.move ? moveStickEl : aimStickEl;
    el.firstElementChild.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
}, { passive: false });
function touchEnd(e) {
  for (const t of e.changedTouches) {
    for (const zone of [touch.move, touch.aim]) {
      if (zone.id !== t.identifier) continue;
      zone.id = null; zone.dx = zone.dy = 0;
      const el = zone === touch.move ? moveStickEl : aimStickEl;
      el.classList.remove('active');
    }
  }
  if (touch.move.id === null && touch.aim.id === null) restSticks();
  else if (touch.move.id === null) { placeStick(moveStickEl, Math.min(175, W * 0.28), H - (W <= 600 ? 174 : 150)); moveStickEl.firstElementChild.style.transform = 'translate(-50%,-50%)'; }
  else { placeStick(aimStickEl, W - Math.min(150, W * 0.25), H - (W <= 600 ? 174 : 150)); aimStickEl.firstElementChild.style.transform = 'translate(-50%,-50%)'; }
}
touchLayer.addEventListener('touchend', touchEnd);
touchLayer.addEventListener('touchcancel', touchEnd);

punchBtn.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); sfx.init(); touch.punch = true; punchBtn.classList.add('pressed'); }, { passive: false });
const punchUp = e => { e.preventDefault(); touch.punch = false; punchBtn.classList.remove('pressed'); };
punchBtn.addEventListener('touchend', punchUp, { passive: false });
punchBtn.addEventListener('touchcancel', punchUp, { passive: false });
punchBtn.addEventListener('mousedown', e => { e.preventDefault(); touch.punch = true; });
window.addEventListener('mouseup', () => { touch.punch = false; punchBtn.classList.remove('pressed'); });

function clearControls() {
  for (const key in keys) keys[key] = false;
  mouse.down = false; touch.punch = false; touch.shoot = false;
  for (const zone of [touch.move, touch.aim]) { zone.id = null; zone.dx = zone.dy = 0; }
  moveStickEl.classList.remove('active'); aimStickEl.classList.remove('active'); punchBtn.classList.remove('pressed');
  restSticks();
}

// ---------------- UI wiring ----------------
const screens = { home: $('home'), shop: $('shop'), pause: $('pause'), replay: $('replay'), dead: $('dead'), classSelect: $('classSelect'), savePanel: $('savePanel'), boonSelect: $('boonSelect') };
function showScreen(name) {
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  for (const k in screens) screens[k].classList.toggle('hidden', k !== name);
  const playing = name === null;
  $('hud').classList.toggle('hidden', !(playing || name === 'pause'));
  $('mapPanel').classList.toggle('hidden', !playing);
  $('actionControls').classList.toggle('hidden', !playing);
  touchLayer.classList.toggle('hidden', !(playing && touch.active));
  punchBtn.classList.toggle('hidden', !(playing && touch.active));
}
function toast(msg, ms) {
  const el = $('toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), ms || 1800);
}
function updateMuteButtons() {
  $('muteBtn').classList.toggle('muted', save.muted);
  $('pauseMuteBtn').textContent = 'Sound: ' + (save.muted ? 'Off' : 'On');
}
function refreshHome() {
  $('bestText').textContent = save.best;
  $('homeCoins').textContent = save.coins;
  $('playBtn').textContent = save.checkpoint > 1 ? `ENTER THE DUNGEON (FLOOR ${save.checkpoint})` : 'ENTER THE DUNGEON';
  updateMuteButtons();
}

$('playBtn').addEventListener('click', openClassSelect);
$('armoryBtn').addEventListener('click', () => { sfx.init(); openShop('home'); });
$('muteBtn').addEventListener('click', () => { sfx.init(); sfx.setMuted(!save.muted); updateMuteButtons(); });
$('pauseMuteBtn').addEventListener('click', () => { sfx.setMuted(!save.muted); updateMuteButtons(); });
$('pauseBtn').addEventListener('click', e => { e.currentTarget.blur(); if (state === 'play') openPause(); });
$('resumeBtn').addEventListener('click', closePause);
$('quitBtn').addEventListener('click', goHome);
$('deadHomeBtn').addEventListener('click', goHome);
$('retryBtn').addEventListener('click', openClassSelect);
$('skipReplayBtn').addEventListener('click', finishReplay);
$('descendBtn').addEventListener('click', () => {
  if (shopMode === 'between') descend();
  else if (shopMode === 'merchant') leaveMerchant();
  else goHome();
});
$('classBackBtn').addEventListener('click', goHome);
$('abilityBtn').addEventListener('click', () => { sfx.init(); useAbility(); });
$('interactBtn').addEventListener('click', interact);
$('secondaryBtn').addEventListener('pointerdown', e => {
  if (e.button !== 0 || state !== 'play') return;
  e.preventDefault(); sfx.init(); touch.shoot = true;
  e.currentTarget.setPointerCapture(e.pointerId); fireSecondary();
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) $('secondaryBtn').addEventListener(event, () => { touch.shoot = false; });
$('secondaryBtn').addEventListener('click', () => { sfx.init(); fireSecondary(); });

let pendingImport = null;
function cancelImport() {
  pendingImport = null;
  $('importConfirm').classList.add('hidden');
}
$('saveCodeBtn').addEventListener('click', () => {
  state = 'savePanel'; clearControls(); cancelImport();
  $('saveCodeInput').value = ''; $('saveMessage').textContent = '';
  showScreen('savePanel'); $('savePanelTitle').focus();
});
$('exportSaveBtn').addEventListener('click', () => {
  cancelImport();
  $('saveCodeInput').value = exportSaveCode();
  $('saveMessage').textContent = 'Code generated. Copy it somewhere safe to keep this progress.';
});
$('copySaveBtn').addEventListener('click', async () => {
  const input = $('saveCodeInput');
  if (!input.value.trim()) { $('saveMessage').textContent = 'Generate a code first.'; return; }
  input.focus(); input.select();
  try {
    await navigator.clipboard.writeText(input.value);
    $('saveMessage').textContent = 'Code copied!';
  } catch {
    $('saveMessage').textContent = 'Code selected. Use your device’s Copy command to copy it.';
  }
});
$('importSaveBtn').addEventListener('click', () => {
  cancelImport();
  try {
    pendingImport = decodeSaveCode($('saveCodeInput').value);
    $('saveMessage').textContent = `Code ready: ${pendingImport.coins} coins · checkpoint ${pendingImport.checkpoint} · ${CLASSES[pendingImport.classId].name}. Confirm below to replace your progress.`;
    $('importConfirm').classList.remove('hidden');
    $('confirmImportBtn').focus();
  } catch (error) { $('saveMessage').textContent = error.message; }
});
$('confirmImportBtn').addEventListener('click', () => {
  if (!pendingImport) return;
  save = pendingImport; cancelImport();
  run = newRun(); boonChoices = []; explosionQueue = [];
  stats = playerStats(); player = null; resetReplay(); clearControls();
  sfx.setMuted(save.muted); refreshHome();
  $('saveMessage').textContent = 'Progress restored. Your next run starts at the saved checkpoint.';
});
$('cancelImportBtn').addEventListener('click', () => { cancelImport(); $('saveMessage').textContent = 'Import canceled. Your progress is unchanged.'; });
$('saveCodeInput').addEventListener('input', () => { cancelImport(); $('saveMessage').textContent = ''; });
$('saveBackBtn').addEventListener('click', () => { cancelImport(); goHome(); });

function openClassSelect() {
  sfx.init(); resetReplay(); clearControls(); state = 'classSelect';
  const list = $('classList'); list.replaceChildren();
  for (const [id, hero] of Object.entries(CLASSES)) {
    const card = document.createElement('div');
    card.className = 'card class-card' + (save.classId === id ? ' selected' : '');
    card.innerHTML = `<div class="card-title">${hero.name}</div><div class="gear-summary">${hero.ability} · ${hero.cooldown}s cooldown</div><div class="card-desc">${hero.desc}</div>`;
    const button = document.createElement('button');
    button.className = 'btn btn-play'; button.textContent = `Play as ${hero.name}`;
    button.onclick = () => { save.classId = id; persist(); startRun(save.checkpoint); };
    card.appendChild(button); list.appendChild(card);
  }
  showScreen('classSelect'); $('classSelectTitle').focus();
}
function goHome() {
  persist(); state = 'home'; player = null; run = newRun(); boonChoices = []; explosionQueue = [];
  sfx.stopDrone(); resetReplay(); clearControls();
  refreshHome(); showScreen('home');
}
function openPause() { state = 'pause'; clearControls(); updateMuteButtons(); showScreen('pause'); }
function closePause() { clearControls(); state = 'play'; showScreen(null); }
function leaveMerchant() {
  if (state !== 'shop' || shopMode !== 'merchant') return;
  clearControls(); replay.recent = [];
  player.inv = Math.max(player.inv, 1);
  state = 'play'; showScreen(null); updateHUD(); recordHighlight(true);
}

// ---------------- run flow ----------------
function startRun(fromFloor) {
  resetReplay(); clearControls();
  run = newRun(); boonChoices = []; explosionQueue = [];
  floor = fromFloor; stats = playerStats();
  player = { x: 0, y: 0, r: 15, hp: stats.maxHp, maxHp: stats.maxHp, aim: 0, cd: 0, atk: 0, atkDur: 0.18, swingSign: 1, inv: 0, hitFlash: 0, moving: false, walkT: 0, blocked: false, effects: {}, classId: save.classId, abilityCd: 0, secondaryCd: 0, fireCd: 0, buff: 0, novaT: 0 };
  genFloor();
  player.x = spawnRoom.cx * TILE + TILE / 2; player.y = spawnRoom.cy * TILE + TILE / 2;
  cam.x = player.x - W / 2; cam.y = player.y - H / 2;
  state = 'play'; showScreen(null); sfx.startDrone();
  revealMap(true); updateHUD(); recordHighlight(true);
}
function descend() {
  replay.recent = [];
  floor++;
  if (floor > save.best) save.best = floor - 1;
  if ((floor - 1) % 5 === 0 && floor > save.checkpoint) { save.checkpoint = floor; toast(`Checkpoint saved: floor ${floor}`, 2500); }
  persist();
  stats = playerStats();
  player.maxHp = stats.maxHp;
  player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.4));
  genFloor();
  player.x = spawnRoom.cx * TILE + TILE / 2; player.y = spawnRoom.cy * TILE + TILE / 2;
  player.cd = 0; player.atk = 0; player.inv = 1; player.effects = {}; player.buff = 0; player.novaT = 0;
  clearControls();
  cam.x = player.x - W / 2; cam.y = player.y - H / 2;
  state = 'play'; showScreen(null); revealMap(true); updateHUD(); recordHighlight(true);
}
function floorCleared() {
  save.best = Math.max(save.best, floor);
  persist();
  sfx.stairs();
  openShop('between');
}
function die() {
  if (state !== 'play') return;
  recordHighlight(true);
  state = 'replay'; sfx.stopDrone(); clearControls();
  $('toast').classList.remove('show');
  const lost = Math.floor(save.coins * 0.25);
  save.coins -= lost; persist();
  $('deadText').textContent = `The dungeon got you on floor ${floor}.`;
  $('deadStats').textContent = `Level ${run.level}  ·  Monsters slain: ${run.kills}  ·  Coins earned: ${run.coins}  ·  Coins dropped: ${lost}`;
  $('retryBtn').textContent = save.checkpoint > 1 ? `Try Again (Floor ${save.checkpoint})` : 'Try Again';
  startReplay();
}

// ---------------- shop ----------------
function openShop(mode) {
  clearControls(); shopMode = mode; state = 'shop'; stats = playerStats();
  renderShop(); showScreen('shop');
  $('shop').querySelector('.panel').scrollTop = 0;
}
function renderShop() {
  $('shopCoins').textContent = save.coins;
  $('shopTitle').textContent = shopMode === 'between' ? `Floor ${floor} cleared!` : shopMode === 'merchant' ? 'The Lantern Merchant' : 'Armory';
  $('descendBtn').textContent = shopMode === 'between' ? `Descend to floor ${floor + 1}` : shopMode === 'merchant' ? 'Back to Dungeon' : 'Back to Home';
  const hpEl = $('shopHp');
  if (shopMode !== 'home') {
    hpEl.classList.remove('hidden');
    const healCost = 15 + floor * 5, full = player.hp >= player.maxHp && !Object.keys(player.effects).length;
    hpEl.innerHTML = `HP: <b>${Math.round(player.hp)} / ${player.maxHp}</b> &nbsp; `;
    const b = document.createElement('button');
    b.className = 'btn btn-buy'; b.style.padding = '6px 12px'; b.style.fontSize = '12px';
    b.textContent = full ? 'Full health' : `Heal & cleanse (${healCost})`;
    b.disabled = full || save.coins < healCost;
    b.onclick = () => { save.coins -= healCost; player.hp = player.maxHp; player.effects = {}; persist(); sfx.heal(); renderShop(); updateHUD(); };
    hpEl.appendChild(b);
  } else hpEl.classList.add('hidden');

  const wl = $('weaponList'); wl.innerHTML = '';
  WEAPONS.forEach((w, i) => {
    const owned = save.owned.includes(i), eq = save.equipped === i;
    const card = document.createElement('div');
    card.className = 'card' + (eq ? ' equipped' : '') + (!owned ? ' locked' : '');
    const dmg = Math.round(w.dmg * stats.dmgMult);
    card.innerHTML = `<div class="card-title"><span>${w.name}</span><span class="lvl">DMG ${dmg}</span></div>`;
    const pv = document.createElement('canvas'); pv.width = 200; pv.height = 46; card.appendChild(pv);
    drawWeaponPreview(pv, w);
    const desc = document.createElement('div'); desc.className = 'card-desc';
    desc.textContent = `${w.desc} Range ${w.range} · Speed ${(1 / w.cd).toFixed(1)}/s`;
    card.appendChild(desc);
    const btn = document.createElement('button');
    if (eq) { btn.className = 'btn btn-equipped'; btn.textContent = 'Equipped'; btn.disabled = true; }
    else if (owned) { btn.className = 'btn btn-equip'; btn.textContent = 'Equip'; btn.onclick = () => { save.equipped = i; stats = playerStats(); persist(); sfx.buy(); renderShop(); updateHUD(); }; }
    else { btn.className = 'btn btn-buy'; btn.textContent = `Buy · ${w.cost}`; btn.disabled = save.coins < w.cost; btn.onclick = () => { save.coins -= w.cost; save.owned.push(i); save.equipped = i; stats = playerStats(); persist(); sfx.buy(); renderShop(); updateHUD(); }; }
    card.appendChild(btn); wl.appendChild(card);
  });

  for (const [items, listId, ownedKey, equippedKey] of [[SECONDARIES, 'secondaryList', 'secondaryOwned', 'secondary'], [ARMORS, 'armorList', 'armorOwned', 'armor'], [ACCESSORIES, 'accessoryList', 'accessoryOwned', 'accessory']]) {
    const list = $(listId); list.replaceChildren();
    items.forEach((item, i) => {
      const owned = save[ownedKey].includes(i), equipped = save[equippedKey] === i;
      const card = document.createElement('div');
      card.className = 'card' + (equipped ? ' equipped' : '') + (!owned ? ' locked' : '');
      card.innerHTML = `<div class="card-title">${item.name}</div><div class="card-desc">${item.desc}</div>`;
      if (items === SECONDARIES) {
        const detail = document.createElement('div'); detail.className = 'gear-summary';
        detail.textContent = `DMG ${Math.round(item.dmg * stats.dmgMult)} · ${(item.cd * stats.secondaryCdMult).toFixed(2)}s reload · Unlimited ammo`;
        card.appendChild(detail);
      }
      const button = document.createElement('button');
      button.className = 'btn ' + (equipped ? 'btn-equipped' : owned ? 'btn-equip' : 'btn-buy');
      button.textContent = equipped ? 'Equipped' : owned ? 'Equip' : `Buy · ${item.cost}`;
      button.disabled = equipped || (!owned && save.coins < item.cost);
      button.onclick = () => {
        if (!owned) { save.coins -= item.cost; save[ownedKey].push(i); }
        save[equippedKey] = i; stats = playerStats();
        if (player) {
          const healthRatio = player.hp / player.maxHp;
          player.maxHp = stats.maxHp; player.hp = healthRatio * player.maxHp;
        }
        persist(); sfx.buy(); renderShop(); updateHUD();
      };
      card.appendChild(button); list.appendChild(card);
    });
  }

  const ul = $('upgradeList'); ul.innerHTML = '';
  for (const key in UPGRADES) {
    const u = UPGRADES[key], lvl = save.up[key], maxed = lvl >= u.max, cost = upgradeCost(key);
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<div class="card-title"><span>${u.name}</span><span class="lvl">Lv ${lvl}/${u.max}</span></div><div class="card-desc">${u.desc}</div>`;
    const btn = document.createElement('button'); btn.className = 'btn btn-buy';
    btn.textContent = maxed ? 'MAXED' : `Upgrade · ${cost}`;
    btn.disabled = maxed || save.coins < cost;
    btn.onclick = () => {
      save.coins -= cost; save.up[key]++; persist(); sfx.buy();
      stats = playerStats();
      if (player) { const old = player.maxHp; player.maxHp = stats.maxHp; player.hp += stats.maxHp - old; }
      renderShop(); updateHUD();
    };
    card.appendChild(btn); ul.appendChild(card);
  }
}
function drawWeaponPreview(cv, w) {
  const c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  c.save(); c.translate(40, 23); c.scale(1.6, 1.6);
  drawWeapon(c, w, -1, 1);
  c.restore();
}

function xpToNextLevel() { return 40 + (run.level - 1) * 25; }
function gainXP(amount) {
  run.xp += amount;
  while (run.xp >= xpToNextLevel()) {
    run.xp -= xpToNextLevel(); run.level++; run.pendingLevels++;
  }
}
function openBoonChoice() {
  state = 'boon'; clearControls();
  const pool = Object.keys(BOONS).filter(key => run.boons[key] < BOONS[key].max);
  boonChoices = [];
  while (boonChoices.length < 3 && pool.length) boonChoices.push(pool.splice(randi(0, pool.length - 1), 1)[0]);
  $('boonTitle').textContent = `Level ${run.level - run.pendingLevels + 1}!`;
  $('boonDetail').textContent = 'Choose one boon' + (run.pendingLevels > 1 ? ` · ${run.pendingLevels} choices earned` : '');
  const list = $('boonList'); list.replaceChildren();
  for (const key of boonChoices) {
    const boon = BOONS[key], card = document.createElement('div');
    card.className = 'card boon-card'; card.style.borderColor = boon.color;
    card.innerHTML = `<div class="card-title">${boon.name}</div><div class="gear-summary">Stack ${run.boons[key] + 1}${Number.isFinite(boon.max) ? ` / ${boon.max}` : ''}</div><div class="card-desc">${boon.desc}</div>`;
    const button = document.createElement('button'); button.className = 'btn btn-play'; button.textContent = 'Choose ' + boon.name;
    button.onclick = () => chooseBoon(key); card.appendChild(button); list.appendChild(card);
  }
  sfx.heal(); showScreen('boonSelect'); $('boonTitle').focus();
}
function chooseBoon(key) {
  if (state !== 'boon' || !boonChoices.includes(key)) return;
  run.boons[key]++; run.pendingLevels--; boonChoices = [];
  stats = playerStats(); player.maxHp = stats.maxHp;
  if (key === 'vitality') player.hp = Math.min(player.maxHp, player.hp + 20);
  if (run.pendingLevels > 0) { openBoonChoice(); return; }
  clearControls(); replay.recent = []; player.inv = Math.max(1, player.inv);
  state = 'play'; showScreen(null); updateHUD(); recordHighlight(true);
}
function fireSecondary() {
  if (state !== 'play' || player.secondaryCd > 0) return;
  const weapon = stats.secondary;
  player.secondaryCd = weapon.cd * stats.secondaryCdMult;
  if (player.classId === 'rogue') player.buff = 0;
  launchPlayerProjectile(weapon, Math.round(weapon.dmg * stats.dmgMult * (player.effects.weaken ? 0.65 : 1)));
  sfx.bone(); updateHUD();
}
function launchPlayerProjectile(weapon, damage) {
  const p = player;
  projectiles.push({ x: p.x, y: p.y, vx: Math.cos(p.aim) * weapon.speed, vy: Math.sin(p.aim) * weapon.speed, dmg: damage, life: 1.4, rot: p.aim, friendly: true, kind: weapon.kind, color: weapon.color, splash: weapon.splash || 0 });
}
function blastEnemies(x, y, radius, damage, ignored = null) {
  spawnParticles(x, y, 20, '#ffa357');
  for (const enemy of enemies) {
    if (enemy !== ignored && !enemy.dead && dist(x, y, enemy.x, enemy.y) < radius + enemy.r && hasLineOfSight(x, y, enemy.x, enemy.y)) hitEnemy(enemy, damage, Math.atan2(enemy.y - y, enemy.x - x), 190);
  }
}
function resolveExplosions() {
  for (let i = 0; i < explosionQueue.length; i++) {
    const blast = explosionQueue[i]; blastEnemies(blast.x, blast.y, 100, blast.dmg);
  }
  explosionQueue = [];
}
function updateProjectiles(dt) {
  for (const pr of projectiles) {
    pr.life -= dt;
    if (pr.life <= 0) continue;
    const steps = Math.max(1, Math.ceil(Math.hypot(pr.vx, pr.vy) * dt / 8));
    for (let step = 0; step < steps && pr.life > 0; step++) {
      pr.x += pr.vx * dt / steps; pr.y += pr.vy * dt / steps;
      if (circleHitsWall(pr.x, pr.y, 4)) { pr.life = 0; spawnParticles(pr.x, pr.y, 4, pr.color || '#e8e4d8'); }
      else if (pr.friendly) {
        const hit = enemies.find(e => !e.dead && dist(pr.x, pr.y, e.x, e.y) < e.r + 5);
        if (hit) {
          pr.life = 0; hitEnemy(hit, pr.dmg, Math.atan2(pr.vy, pr.vx), 130);
          if (pr.splash) blastEnemies(pr.x, pr.y, pr.splash, Math.max(1, Math.round(pr.dmg * 0.5)), hit);
        }
      } else if (dist(pr.x, pr.y, player.x, player.y) < player.r + 5) {
        pr.life = 0; damagePlayer(pr.dmg, pr.x, pr.y, pr.sourceType);
        if (state !== 'play') return;
      }
    }
    if (!pr.friendly) pr.rot += dt * 10;
  }
  projectiles = projectiles.filter(pr => pr.life > 0);
}

function useAbility() {
  if (state !== 'play' || player.abilityCd > 0) return;
  const p = player, hero = CLASSES[p.classId];
  p.abilityCd = hero.cooldown; p.buff = hero.duration;
  spawnParticles(p.x, p.y, 24, hero.color); sfx.unlock();
  if (p.classId === 'mystic') {
    p.novaT = 0.45;
    for (const enemy of enemies) {
      if (!enemy.dead && dist(p.x, p.y, enemy.x, enemy.y) < 190 && hasLineOfSight(p.x, p.y, enemy.x, enemy.y)) hitEnemy(enemy, Math.round(45 * stats.dmgMult * (p.effects.weaken ? 0.65 : 1)), Math.atan2(enemy.y - p.y, enemy.x - p.x), 250);
    }
  }
  toast(hero.ability + '!', 1000); updateHUD();
}
function applyStatus(key) {
  const effect = STATUS_EFFECTS[key], existing = player.effects[key];
  player.effects[key] = { remaining: effect.duration * stats.statusDuration, tick: existing ? existing.tick : 0 };
  texts.push({ x: player.x, y: player.y - 50, text: effect.name, color: effect.color, life: 1, max: 1 });
}
function updateStatuses(dt) {
  for (const [key, effect] of Object.entries(player.effects)) {
    const definition = STATUS_EFFECTS[key];
    effect.tick += Math.min(dt, effect.remaining); effect.remaining -= dt;
    while (definition.dot && effect.tick >= 1 - 0.000001) {
      effect.tick -= 1; player.hp = Math.max(0, player.hp - definition.dot); player.hitFlash = 0.1;
      texts.push({ x: player.x, y: player.y - 34, text: '-' + definition.dot, color: definition.color, life: 0.7, max: 0.7 });
      if (player.hp <= 0) { die(); return; }
    }
    if (effect.remaining <= 0.000001) delete player.effects[key];
  }
}

// ---------------- gameplay update ----------------
function update(dt) {
  if (run.pendingLevels > 0 || explosionQueue.length) {
    resolveExplosions(); enemies = enemies.filter(e => !e.dead);
    if (run.pendingLevels > 0) { recordHighlight(true); openBoonChoice(); return; }
  }
  time += dt;
  const p = player;
  p.cd -= dt; p.atk -= dt; p.inv -= dt; p.hitFlash -= dt;
  p.secondaryCd = Math.max(0, p.secondaryCd - dt); p.fireCd = Math.max(0, p.fireCd - dt);
  p.abilityCd = Math.max(0, p.abilityCd - dt); p.buff = Math.max(0, p.buff - dt); p.novaT = Math.max(0, p.novaT - dt);
  updateStatuses(dt);
  if (state !== 'play') return;
  if (floorIntro > 0) floorIntro -= dt;

  // movement input
  let mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  let my = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  if (touch.move.id !== null) { mx = touch.move.dx / STICK_R; my = touch.move.dy / STICK_R; }
  if (p.effects.confuse) { mx *= -1; my *= -1; }
  const ml = Math.hypot(mx, my);
  if (ml > 1) { mx /= ml; my /= ml; }
  p.moving = ml > 0.1;
  if (p.moving) {
    p.walkT += dt;
    const speed = stats.speed * (p.effects.slow ? 0.6 : 1);
    moveEntity(p, mx * speed * dt, my * speed * dt, false);
  }
  revealMap();

  // aim
  const aimMag = Math.hypot(touch.aim.dx, touch.aim.dy);
  if (touch.aim.id !== null && aimMag > 8) p.aim = Math.atan2(touch.aim.dy, touch.aim.dx);
  else if (!touch.active) p.aim = Math.atan2(mouse.y - (p.y - cam.y), mouse.x - (p.x - cam.x));
  else if (p.moving && touch.aim.id === null) p.aim = Math.atan2(my, mx);

  // attack
  const wantAttack = keys.Space || mouse.down || touch.punch || (touch.aim.id !== null && aimMag > STICK_R * 0.92);
  if (wantAttack) tryAttack();
  if (keys.KeyF || touch.shoot) fireSecondary();

  // enemies
  for (const e of enemies) {
    if (e.dead) continue;
    e.anim += dt; e.hitFlash -= dt; e.atkCd -= dt;
    const t = ENEMY_TYPES[e.type];
    const d = dist(e.x, e.y, p.x, p.y);
    const visible = !(p.classId === 'rogue' && p.buff > 0) && hasLineOfSight(e.x, e.y, p.x, p.y);
    if (!e.awake && d < 340 && visible) e.awake = true;
    let vx = 0, vy = 0;
    if (e.awake && visible) {
      const ang = Math.atan2(p.y - e.y, p.x - e.x);
      if (e.type === 'bat') {
        e.wa += dt * 5;
        const wob = Math.sin(e.wa) * 1.1;
        vx = Math.cos(ang + wob); vy = Math.sin(ang + wob);
      } else if (t.ranged) {
        if (d > 240) { vx = Math.cos(ang); vy = Math.sin(ang); }
        else if (d < 150) { vx = -Math.cos(ang); vy = -Math.sin(ang); }
        else { const s = e.seed > 0.5 ? 1 : -1; vx = -Math.sin(ang) * 0.5 * s; vy = Math.cos(ang) * 0.5 * s; }
        e.shootCd -= dt;
        if (!t.boss && e.shootCd <= 0 && d < 340) {
          const a = ang + rand(-0.08, 0.08);
          projectiles.push({ x: e.x, y: e.y, vx: Math.cos(a) * 270, vy: Math.sin(a) * 270, dmg: e.dmg, sourceType: e.type, life: 3, rot: 0 });
          sfx.bone(); e.shootCd = 1.7 + rand(0, 0.7);
        }
      } else {
        vx = Math.cos(ang); vy = Math.sin(ang);
        if (e.blocked) { e.wa += dt * 3; vx += Math.cos(e.wa) * 0.6; vy += Math.sin(e.wa) * 0.6; }
      }
      if (e.type === 'boss') {
        e.summonT -= dt;
        if (e.summonT <= 0 && enemies.length < 14) {
          e.summonT = 7;
          for (let i = 0; i < 2; i++) {
            const sx = e.x + rand(-70, 70), sy = e.y + rand(-70, 70);
            if (!circleHitsWall(sx, sy, 16)) { spawnEnemy('zombie', sx, sy); enemies[enemies.length - 1].awake = true; spawnParticles(sx, sy, 10, '#5f9a3c'); }
          }
          toast('The Grave Lord summons minions!', 1400);
        }
      }
      if (t.boss) {
        updateBoss(e, dt);
        if (e.telegraph > 0) { vx *= 0.25; vy *= 0.25; }
      }
    } else {
      e.telegraph = 0;
      e.wanderT -= dt;
      if (e.wanderT <= 0) { e.wanderT = rand(1, 3); e.wa = rand(0, TAU); e.wandering = Math.random() < 0.5; }
      if (e.wandering) { vx = Math.cos(e.wa) * 0.35; vy = Math.sin(e.wa) * 0.35; }
    }
    e.blocked = false;
    const decay = Math.min(1, dt * 7);
    e.kbx -= e.kbx * decay; e.kby -= e.kby * decay;
    moveEntity(e, (vx * e.speed + e.kbx) * dt, (vy * e.speed + e.kby) * dt, t.phase);
    const dd = dist(e.x, e.y, p.x, p.y), minD = e.r + p.r - 2;
    if (dd > 0 && dd < minD && !t.phase) {
      const nx = (e.x - p.x) / dd, ny = (e.y - p.y) / dd, push = minD - dd;
      e.x += nx * push; e.y += ny * push;
      if (circleHitsWall(e.x, e.y, e.r)) { e.x -= nx * push; e.y -= ny * push; }
    }
    if (visible && d < e.r + p.r + 2 && e.atkCd <= 0) {
      e.atkCd = 0.9;
      damagePlayer(e.dmg, e.x, e.y, e.type);
      if (state !== 'play') return;
    }
  }
  // separation
  for (let i = 0; i < enemies.length; i++) for (let j = i + 1; j < enemies.length; j++) {
    const a = enemies[i], b = enemies[j];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
    if (d > 0 && d < min) {
      const push = (min - d) / 2, nx = dx / d, ny = dy / d;
      if (!ENEMY_TYPES[a.type].phase) { a.x -= nx * push; a.y -= ny * push; if (circleHitsWall(a.x, a.y, a.r)) { a.x += nx * push; a.y += ny * push; } }
      if (!ENEMY_TYPES[b.type].phase) { b.x += nx * push; b.y += ny * push; if (circleHitsWall(b.x, b.y, b.r)) { b.x -= nx * push; b.y -= ny * push; } }
    }
  }
  enemies = enemies.filter(e => !e.dead);

  updateProjectiles(dt);
  if (state !== 'play') return;
  resolveExplosions();
  enemies = enemies.filter(e => !e.dead);

  // pickups
  for (const k of pickups) {
    k.t += dt;
    const d = dist(k.x, k.y, p.x, p.y);
    if (d < 110 && k.t > 0.25) {
      const a = Math.atan2(p.y - k.y, p.x - k.x), sp = 420 + (110 - d) * 4;
      k.vx = Math.cos(a) * sp; k.vy = Math.sin(a) * sp;
    } else { k.vx -= k.vx * Math.min(1, dt * 5); k.vy -= k.vy * Math.min(1, dt * 5); }
    k.x += k.vx * dt; k.y += k.vy * dt;
    if (circleHitsWall(k.x, k.y, 5)) { k.x -= k.vx * dt; k.y -= k.vy * dt; k.vx *= -0.5; k.vy *= -0.5; }
    if (d < p.r + 10) {
      k.dead = true;
      if (k.type === 'coin') { save.coins = Math.min(1000000000, save.coins + k.value); run.coins += k.value; sfx.coin(); texts.push({ x: p.x, y: p.y - 30, text: '+' + k.value, color: '#ffd84a', life: 0.7, max: 0.7 }); }
      else { const heal = Math.round(p.maxHp * 0.2); p.hp = Math.min(p.maxHp, p.hp + heal); sfx.heal(); texts.push({ x: p.x, y: p.y - 30, text: '+' + heal, color: '#7dff8a', life: 0.8, max: 0.8 }); }
    }
  }
  pickups = pickups.filter(k => !k.dead);

  // particles & texts
  for (const pa of particles) { pa.life -= dt; pa.x += pa.vx * dt; pa.y += pa.vy * dt; pa.vx *= 0.9; pa.vy *= 0.9; pa.vy += pa.g * dt; }
  particles = particles.filter(pa => pa.life > 0);
  for (const tx of texts) { tx.life -= dt; tx.y -= 45 * dt; }
  texts = texts.filter(tx => tx.life > 0);

  if (run.pendingLevels > 0) { updateHUD(); recordHighlight(true); openBoonChoice(); return; }

  // stairs
  if (!stairs.open && enemies.length === 0) {
    stairs.open = true;
    if (!stairsAnnounced) { stairsAnnounced = true; sfx.unlock(); toast('Floor cleared! The stairs are open.', 2200); }
  }
  if (stairs.open && dist(p.x, p.y, stairs.x, stairs.y) < 26) { floorCleared(); return; }

  // camera
  const f = 1 - Math.pow(0.0005, dt);
  cam.x = lerp(cam.x, p.x - W / 2, f); cam.y = lerp(cam.y, p.y - H / 2, f);
  const mw = MAP_W * TILE, mh = MAP_H * TILE;
  if (mw > W) cam.x = clamp(cam.x, 0, mw - W); else cam.x = (mw - W) / 2;
  if (mh > H) cam.y = clamp(cam.y, 0, mh - H); else cam.y = (mh - H) / 2;
  cam.shake = Math.max(0, cam.shake - dt * 28);

  updateHUD();
}

function updateBoss(enemy, dt) {
  if (enemy.type === 'boss') return;
  enemy.specialCd -= dt;
  if (enemy.specialCd <= 0.85) {
    if (!enemy.telegraph) enemy.castAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    enemy.telegraph = Math.max(0.01, 1 - enemy.specialCd / 0.85);
  }
  if (enemy.specialCd > 0) return;
  const slime = enemy.type === 'slimeKing', count = slime ? 10 : 5;
  for (let i = 0; i < count; i++) {
    const angle = slime ? i * TAU / count + enemy.anim * 0.1 : enemy.castAngle + (i - 2) * 0.18;
    const speed = slime ? 170 : 290;
    projectiles.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, dmg: enemy.dmg, sourceType: enemy.type, kind: slime ? 'goo' : 'fireball', color: ENEMY_TYPES[enemy.type].color, life: 2.6, rot: angle });
  }
  enemy.specialCd = slime ? 4 : 3.2; enemy.telegraph = 0; sfx.bone();
}

function tryAttack() {
  const p = player;
  if (p.cd > 0) return;
  const w = stats.weapon;
  p.cd = w.cd; p.atk = p.atkDur; p.swingSign *= -1; p.atkDir = p.aim;
  if (p.classId === 'rogue') p.buff = 0;
  sfx.swing();
  let hit = false;
  const dmg = Math.round(w.dmg * stats.dmgMult * (p.classId === 'brawler' && p.buff > 0 ? 1.5 : 1) * (p.effects.weaken ? 0.65 : 1));
  for (const e of enemies) {
    const d = dist(p.x, p.y, e.x, e.y);
    if (e.dead || d > w.range + stats.rangeBonus + e.r || !hasLineOfSight(p.x, p.y, e.x, e.y)) continue;
    const a = Math.atan2(e.y - p.y, e.x - p.x);
    if (Math.abs(angDiff(p.aim, a)) <= w.arc / 2 + 0.25 || d < e.r + p.r + 4) {
      hitEnemy(e, dmg, a, w.kb); hit = true;
    }
  }
  if (run.boons.fire > 0 && p.fireCd <= 0) {
    p.fireCd = 0.7;
    launchPlayerProjectile({ speed: 380, kind: 'fireball', color: '#ffb060', splash: 60 }, Math.round((12 + (run.boons.fire - 1) * 8) * stats.dmgMult * (p.effects.weaken ? 0.65 : 1)));
  }
  if (hit) { cam.shake = Math.max(cam.shake, 4); sfx.hit(); }
}
function hitEnemy(e, dmg, ang, kb) {
  if (e.dead) return;
  replay.score++; replay.lastActionAt = time;
  e.hp -= dmg; e.hitFlash = 0.12; e.awake = true;
  const kbm = ENEMY_TYPES[e.type].boss ? 0.3 : 1;
  e.kbx += Math.cos(ang) * kb * kbm; e.kby += Math.sin(ang) * kb * kbm;
  texts.push({ x: e.x + rand(-6, 6), y: e.y - e.r - 8, text: dmg, color: '#fff', life: 0.7, max: 0.7 });
  spawnParticles(e.x, e.y, 6, ENEMY_TYPES[e.type].color);
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  if (e.dead) return;
  e.dead = true; run.kills++;
  replay.score += ENEMY_TYPES[e.type].boss ? 1000 : 100; replay.lastActionAt = time;
  sfx.kill();
  spawnParticles(e.x, e.y, 18, ENEMY_TYPES[e.type].color);
  const t = ENEMY_TYPES[e.type];
  gainXP(t.xp);
  texts.push({ x: e.x, y: e.y - 40, text: '+' + t.xp + ' XP', color: '#b8a2ff', life: 1, max: 1 });
  if (run.boons.blast > 0) explosionQueue.push({ x: e.x, y: e.y, dmg: Math.round(18 * run.boons.blast * stats.dmgMult * (player.effects.weaken ? 0.65 : 1)) });
  const bonus = 1 + (floor - 1) * 0.12;
  let n = Math.round(randi(t.coins[0], t.coins[1]) * bonus * stats.goldMult);
  const coinValue = Math.max(1, Math.ceil(n / 24));
  if (t.boss) { toast(t.name.toUpperCase() + ' DEFEATED!', 2500); cam.shake = 14; }
  while (n > 0) {
    const v = Math.min(n, coinValue); n -= v;
    const a = rand(0, TAU), s = rand(60, 200);
    pickups.push({ type: 'coin', value: v, x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0 });
  }
  if (Math.random() < 0.14 || t.boss) {
    const a = rand(0, TAU);
    pickups.push({ type: 'heart', x: e.x, y: e.y, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100, t: 0 });
  }
}
function damagePlayer(amount, sx, sy, sourceType) {
  const p = player;
  if (amount <= 0 || p.inv > 0 || (p.classId === 'rogue' && p.buff > 0)) return;
  const dmg = Math.max(1, Math.round(amount * stats.dmgTaken));
  p.hp -= dmg; p.inv = 0.7; p.hitFlash = 0.25; cam.shake = Math.max(cam.shake, 9);
  const a = Math.atan2(p.y - sy, p.x - sx);
  moveEntity(p, Math.cos(a) * 18, Math.sin(a) * 18, false);
  sfx.hurt();
  texts.push({ x: p.x, y: p.y - 32, text: '-' + dmg, color: '#ff6b5c', life: 0.8, max: 0.8 });
  spawnParticles(p.x, p.y, 6, '#ff6b5c');
  if (p.hp <= 0) { p.hp = 0; die(); return; }
  const effects = ENEMY_TYPES[sourceType]?.effects;
  if (effects && Math.random() < 0.45) applyStatus(effects[randi(0, effects.length - 1)]);
}
function spawnParticles(x, y, n, color) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(40, 220);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.7), color, size: rand(2, 5), g: 200 });
  }
}

// ---------------- HUD ----------------
const hud = { hpFill: $('hpFill'), hpText: $('hpText'), coin: $('coinText'), floor: $('floorText'), enemy: $('enemyText'), weapon: $('weaponText') };
let hudCache = '';
function updateHUD() {
  if (!player) return;
  const p = player, hero = CLASSES[p.classId], door = nearestDoor(), trading = nearMerchant();
  const room = rooms.find(r => p.x >= r.x * TILE && p.x < (r.x + r.w) * TILE && p.y >= r.y * TILE && p.y < (r.y + r.h) * TILE);
  const roomName = room?.kind === 'boss' ? ENEMY_TYPES[bossTypeForFloor(floor)].name + '’s Chamber' : room ? { shop: 'Merchant Room', slime: 'Slime Nest', crypt: 'The Crypt' }[room.kind] : 'Passage';
  const effects = Object.entries(p.effects).map(([id, effect]) => [id, Math.ceil(effect.remaining)]);
  drawMinimap();
  const key = JSON.stringify([Math.ceil(p.hp), p.maxHp, save.coins, floor, enemies.length, stats.weapon.name, stats.secondary.name, Math.ceil(p.secondaryCd * 10), run.level, run.xp, stats.armor.name, p.classId, Math.ceil(p.abilityCd), Math.ceil(p.buff), effects, roomName, !!door, !!trading, touch.active]);
  if (key === hudCache) return;
  hudCache = key;
  hud.hpFill.style.width = clamp(p.hp / p.maxHp * 100, 0, 100) + '%';
  hud.hpText.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
  hud.coin.textContent = save.coins;
  hud.floor.textContent = (floor % 5 === 0 ? 'BOSS FLOOR ' : 'FLOOR ') + floor;
  hud.enemy.textContent = enemies.length ? `Enemies left: ${enemies.length}` : 'Stairs open!';
  hud.enemy.classList.toggle('open', enemies.length === 0);
  hud.weapon.textContent = stats.weapon.name;
  const xpNeeded = xpToNextLevel();
  $('xpFill').style.width = `${run.xp / xpNeeded * 100}%`;
  $('xpText').textContent = `Lv ${run.level} · ${run.xp}/${xpNeeded} XP`;
  $('xpBar').setAttribute('aria-valuenow', run.xp);
  $('xpBar').setAttribute('aria-valuemax', xpNeeded);
  $('xpBar').setAttribute('aria-valuetext', $('xpText').textContent);
  $('secondaryText').textContent = stats.secondary.name;
  $('secondaryBtn').textContent = `${touch.active ? 'SHOOT' : 'F · ' + stats.secondary.name}${p.secondaryCd > 0 ? ` ${(Math.ceil(p.secondaryCd * 10) / 10).toFixed(1)}s` : ''}`;
  $('secondaryBtn').title = 'Hold to fire ' + stats.secondary.name;
  $('classText').textContent = hero.name + (p.buff > 0 ? ` · ${hero.ability} ${Math.ceil(p.buff)}s` : '');
  $('classText').title = stats.armor.name + ' · ' + ACCESSORIES[save.accessory].name;
  $('roomText').textContent = roomName;
  $('abilityBtn').textContent = `${touch.active ? '' : 'Q · '}${hero.ability}${p.abilityCd > 0 ? ` ${Math.ceil(p.abilityCd)}s` : ''}`;
  $('abilityBtn').disabled = p.abilityCd > 0;
  $('interactBtn').classList.toggle('hidden', !door && !trading);
  $('interactBtn').textContent = `${touch.active ? '' : 'E · '}${door ? 'Kick door' : 'Trade'}`;
  $('statusList').replaceChildren();
  for (const [id, seconds] of effects) {
    const badge = document.createElement('span'), effect = STATUS_EFFECTS[id];
    badge.className = 'status-badge'; badge.style.color = effect.color;
    badge.textContent = `${effect.name} ${seconds}s`; badge.title = effect.desc;
    $('statusList').appendChild(badge);
  }
}

// ---------------- rendering ----------------
function render() {
  ctx.fillStyle = '#07050c'; ctx.fillRect(0, 0, W, H);
  if (!player) return;
  const shX = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake * 1.6 : 0;
  const shY = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake * 1.6 : 0;
  const ox = Math.round(cam.x + shX), oy = Math.round(cam.y + shY);

  drawMap(ox, oy);
  drawRoomFeatures(ox, oy);
  drawStairs(ox, oy);
  for (const k of pickups) drawPickup(k, k.x - ox, k.y - oy);

  const ents = enemies.slice(); ents.push(player);
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) { if (e === player) drawPlayer(e.x - ox, e.y - oy); else drawEnemy(e, e.x - ox, e.y - oy); }

  for (const pr of projectiles) drawProjectile(pr, pr.x - ox, pr.y - oy);
  for (const pa of particles) {
    ctx.globalAlpha = clamp(pa.life * 2, 0, 1); ctx.fillStyle = pa.color;
    ctx.fillRect(pa.x - ox - pa.size / 2, pa.y - oy - pa.size / 2, pa.size, pa.size);
  }
  ctx.globalAlpha = 1;

  drawLighting(ox, oy);

  ctx.font = '900 16px "Trebuchet MS", Verdana, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const t of texts) {
    ctx.globalAlpha = clamp(t.life / t.max * 1.5, 0, 1);
    ctx.fillStyle = '#000'; ctx.fillText(t.text, t.x - ox + 1, t.y - oy + 2);
    ctx.fillStyle = t.color; ctx.fillText(t.text, t.x - ox, t.y - oy);
  }
  ctx.globalAlpha = 1;

  drawStairsArrow(ox, oy);
  drawBossBar();
  if (floorIntro > 0) drawFloorIntro();
  if (player.hitFlash > 0) { ctx.fillStyle = `rgba(255,40,30,${player.hitFlash * 0.45})`; ctx.fillRect(0, 0, W, H); }
}

function drawMap(ox, oy) {
  const tx0 = Math.max(0, Math.floor(ox / TILE)), tx1 = Math.min(MAP_W - 1, Math.floor((ox + W) / TILE));
  const ty0 = Math.max(0, Math.floor(oy / TILE)), ty1 = Math.min(MAP_H - 1, Math.floor((oy + H) / TILE));
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const sx = tx * TILE - ox, sy = ty * TILE - oy, t = tileAt(tx, ty);
    if (t !== 0) {
      const h = hash(tx, ty), s = 40 + h * 16;
      ctx.fillStyle = `rgb(${s},${s - 8},${s + 16})`;
      ctx.fillRect(sx, sy, TILE, TILE);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
      ctx.strokeRect(sx + 0.5, sy + 0.5, TILE - 1, TILE - 1);
      if (h > 0.7) { ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(sx + 6 + h * 20, sy + 8 + h * 10, 10, 6); }
    } else {
      const below = tileAt(tx, ty + 1);
      if (below !== 0) {
        ctx.fillStyle = '#332846'; ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#1f1830';
        for (let row = 0; row < 3; row++) {
          const y = sy + row * 16;
          ctx.fillRect(sx, y + 14, TILE, 2);
          const off = row % 2 ? 24 : 0;
          ctx.fillRect(sx + ((off + 12) % TILE), y, 2, 14);
          ctx.fillRect(sx + ((off + 36) % TILE), y, 2, 14);
        }
        ctx.fillStyle = '#4f4068'; ctx.fillRect(sx, sy, TILE, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(sx, sy + TILE - 5, TILE, 5);
        if (hash(tx + 31, ty) > 0.82) { ctx.fillStyle = 'rgba(70,140,60,0.45)'; circle(ctx, sx + 12 + hash(tx, ty) * 24, sy + 24, 6); }
      } else {
        let near = false;
        for (let j = -1; j <= 1 && !near; j++) for (let i = -1; i <= 1; i++) if (tileAt(tx + i, ty + j) !== 0) { near = true; break; }
        ctx.fillStyle = near ? '#18121f' : '#0a0710';
        ctx.fillRect(sx, sy, TILE, TILE);
        if (near) { ctx.fillStyle = 'rgba(255,255,255,0.025)'; ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8); }
      }
    }
  }
  for (const d of decos) {
    const sx = d.tx * TILE - ox + TILE / 2, sy = d.ty * TILE - oy + TILE / 2;
    if (sx < -TILE || sy < -TILE || sx > W + TILE || sy > H + TILE) continue;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(d.rot);
    if (d.kind === 0) { ctx.fillStyle = '#d9d2c2'; ctx.fillRect(-10, -2, 20, 4); circle(ctx, -10, -3, 3); circle(ctx, -10, 3, 3); circle(ctx, 10, -3, 3); circle(ctx, 10, 3, 3); }
    else if (d.kind === 1) { ctx.fillStyle = '#d9d2c2'; circle(ctx, 0, 0, 8); ctx.fillStyle = '#1a1220'; circle(ctx, -3, -1, 2.2); circle(ctx, 3, -1, 2.2); ctx.fillRect(-3, 4, 6, 2); }
    else if (d.kind === 2) { ctx.fillStyle = 'rgba(60,200,90,0.35)'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 9, 0, 0, TAU); ctx.fill(); }
    else { ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-4, 0); ctx.lineTo(2, -8); ctx.lineTo(10, 4); ctx.lineTo(16, 2); ctx.stroke(); }
    ctx.restore();
  }
  for (const t of torches) {
    const sx = t.x - ox, sy = t.y - oy;
    if (sx < -40 || sy < -40 || sx > W + 40 || sy > H + 40) continue;
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(sx - 2, sy - 2, 4, 16);
    ctx.fillStyle = '#2a1a0e'; ctx.fillRect(sx - 5, sy + 10, 10, 4);
    const f = 0.85 + 0.15 * Math.sin(time * 7 + t.seed) * Math.sin(time * 3.3 + t.seed * 2);
    ctx.fillStyle = '#ff8a2a'; circle(ctx, sx, sy - 6, 6 * f);
    ctx.fillStyle = '#ffd36a'; circle(ctx, sx, sy - 7, 3.2 * f);
  }
}

function drawRoomFeatures(ox, oy) {
  for (const room of rooms) {
    if (room.kind !== 'slime' && room.kind !== 'shop') continue;
    const x = room.x * TILE - ox, y = room.y * TILE - oy;
    ctx.fillStyle = room.kind === 'slime' ? 'rgba(46,195,90,0.12)' : 'rgba(255,190,80,0.08)';
    ctx.fillRect(x, y, room.w * TILE, room.h * TILE);
    ctx.font = '900 13px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = room.kind === 'slime' ? '#8aeaa0' : '#ffda8d';
    ctx.fillText(room.kind === 'slime' ? 'SLIME NEST' : 'LANTERN MERCHANT', x + room.w * TILE / 2, y + 26);
  }
  for (const door of doors) for (const cell of door.cells) {
    const x = cell.tx * TILE - ox, y = cell.ty * TILE - oy;
    if (x < -TILE || y < -TILE || x > W || y > H) continue;
    if (door.open) {
      ctx.fillStyle = '#76502f';
      ctx.save(); ctx.translate(x + 24, y + 24); ctx.rotate(0.4);
      ctx.fillRect(-20, -18, 28, 6); ctx.fillRect(-8, 9, 28, 6);
      ctx.restore();
    } else {
      ctx.fillStyle = '#271a17'; rrect(ctx, x + 1, y + 1, 46, 46, 4); ctx.fill();
      ctx.fillStyle = '#a27443'; ctx.fillRect(x + 5, y + 4, 38, 39);
      ctx.fillStyle = '#704a2b'; ctx.fillRect(x + 16, y + 4, 3, 39); ctx.fillRect(x + 30, y + 4, 3, 39);
      ctx.fillStyle = '#30313c'; ctx.fillRect(x + 4, y + 10, 40, 6); ctx.fillRect(x + 4, y + 32, 40, 6);
      ctx.fillStyle = '#ffd078'; circle(ctx, x + 36, y + 25, 3);
    }
  }
  if (merchant) {
    const x = merchant.x - ox, y = merchant.y - oy;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y + 20, 35, 13, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#476b74'; rrect(ctx, x - 15, y - 13, 30, 30, 10); ctx.fill();
    ctx.fillStyle = '#efd0a3'; circle(ctx, x, y - 22, 11);
    ctx.fillStyle = '#49656f'; ctx.beginPath(); ctx.moveTo(x - 17, y - 28); ctx.lineTo(x + 3, y - 48); ctx.lineTo(x + 15, y - 28); ctx.fill();
    ctx.fillStyle = '#2b1d30'; circle(ctx, x - 4, y - 23, 2); circle(ctx, x + 4, y - 23, 2);
    ctx.fillStyle = '#9e7044'; rrect(ctx, x - 36, y + 2, 72, 22, 4); ctx.fill();
    ctx.fillStyle = '#5d3b28'; ctx.fillRect(x - 33, y + 22, 7, 12); ctx.fillRect(x + 26, y + 22, 7, 12);
    ctx.fillStyle = '#d7b1ff'; circle(ctx, x - 20, y + 9, 6);
    ctx.fillStyle = '#ffdc70'; circle(ctx, x + 22, y + 6 + Math.sin(time * 3), 7);
    ctx.font = '900 11px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe2aa'; ctx.fillText('SHOP', x, y - 57);
  }
}

function drawStairs(ox, oy) {
  const sx = stairs.x - ox, sy = stairs.y - oy;
  if (sx < -60 || sy < -60 || sx > W + 60 || sy > H + 60) return;
  ctx.save(); ctx.translate(sx, sy);
  ctx.fillStyle = '#0a0710'; rrect(ctx, -20, -20, 40, 40, 5); ctx.fill();
  ctx.fillStyle = '#231a33'; ctx.fillRect(-16, -16, 32, 8);
  ctx.fillStyle = '#1a1326'; ctx.fillRect(-16, -6, 32, 8);
  ctx.fillStyle = '#120d1b'; ctx.fillRect(-16, 4, 32, 8);
  if (stairs.open) {
    const pulse = 0.6 + 0.4 * Math.sin(time * 4);
    ctx.strokeStyle = `rgba(142,224,74,${0.5 + pulse * 0.5})`; ctx.lineWidth = 3; rrect(ctx, -22, -22, 44, 44, 6); ctx.stroke();
    ctx.fillStyle = `rgba(142,224,74,${0.25 + pulse * 0.25})`; ctx.fillRect(-16, -16, 32, 28);
    ctx.fillStyle = '#b9ff6c';
    const by = -34 - pulse * 5;
    ctx.beginPath(); ctx.moveTo(0, by + 10); ctx.lineTo(-8, by); ctx.lineTo(-3, by); ctx.lineTo(-3, by - 8); ctx.lineTo(3, by - 8); ctx.lineTo(3, by); ctx.lineTo(8, by); ctx.closePath(); ctx.fill();
  } else {
    ctx.strokeStyle = '#6a6070'; ctx.lineWidth = 3; rrect(ctx, -22, -22, 44, 44, 6); ctx.stroke();
    ctx.fillStyle = '#8d8595'; rrect(ctx, -8, -4, 16, 13, 3); ctx.fill();
    ctx.strokeStyle = '#8d8595'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -5, 5.5, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#1a1326'; circle(ctx, 0, 2, 2.2);
  }
  ctx.restore();
}

function drawPickup(k, sx, sy) {
  if (sx < -20 || sy < -20 || sx > W + 20 || sy > H + 20) return;
  const bob = Math.sin(k.t * 6) * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(sx, sy + 7, 6, 3, 0, 0, TAU); ctx.fill();
  if (k.type === 'coin') {
    const w = Math.abs(Math.cos(k.t * 5)) * 6 + 1.5, big = k.value > 1;
    ctx.fillStyle = '#9a6a0e'; ctx.beginPath(); ctx.ellipse(sx, sy + bob, w, big ? 9 : 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = big ? '#ffe36a' : '#f5c131'; ctx.beginPath(); ctx.ellipse(sx, sy + bob - 1, w * 0.85, big ? 7.5 : 5.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(sx - w * 0.3, sy + bob - 3, w * 0.25, 1.8, 0, 0, TAU); ctx.fill();
  } else {
    ctx.save(); ctx.translate(sx, sy + bob); ctx.scale(1, 1);
    ctx.fillStyle = '#ff4d5e';
    ctx.beginPath(); ctx.moveTo(0, 7); ctx.bezierCurveTo(-11, -2, -8, -10, -1, -5); ctx.bezierCurveTo(8, -10, 11, -2, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(ctx, -4, -4, 1.8);
    ctx.restore();
  }
}

function drawProjectile(pr, sx, sy) {
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(pr.rot);
  if (pr.kind === 'arrow') {
    ctx.fillStyle = '#ab8154'; ctx.fillRect(-12, -1.5, 22, 3);
    ctx.fillStyle = pr.color; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(5, -5); ctx.lineTo(5, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8e4d8'; ctx.fillRect(-12, -4, 5, 8);
  } else if (pr.kind === 'stone') {
    ctx.fillStyle = '#63574b'; circle(ctx, 0, 1, 5);
    ctx.fillStyle = pr.color; circle(ctx, -1, -1, 3.5);
  } else if (pr.kind === 'fireball' || pr.kind === 'goo') {
    ctx.shadowColor = pr.color; ctx.shadowBlur = 12; ctx.fillStyle = pr.color;
    circle(ctx, 0, 0, 7); ctx.shadowBlur = 0;
    ctx.fillStyle = pr.kind === 'goo' ? '#daff98' : '#fff2a0'; circle(ctx, 1, -1, 3.5);
  } else {
    ctx.fillStyle = '#efe9da'; ctx.fillRect(-7, -1.5, 14, 3);
    circle(ctx, -7, -2, 2.5); circle(ctx, -7, 2, 2.5); circle(ctx, 7, -2, 2.5); circle(ctx, 7, 2, 2.5);
  }
  ctx.restore();
}

function drawWeapon(c, w, prog, sign) {
  const ext = prog >= 0 ? Math.sin(prog * Math.PI) : 0;
  if (w.type === 'fist') {
    c.fillStyle = w.color; c.strokeStyle = '#6a4330'; c.lineWidth = 2;
    const px = 12 + ext * 20;
    c.beginPath(); c.arc(px, 6 * sign, 6, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.arc(10, -7 * sign, 5, 0, TAU); c.fill(); c.stroke();
    return;
  }
  c.save();
  c.fillStyle = '#5b3a1e'; c.fillRect(6, -2.5, 16, 5);
  c.translate(22, 0);
  if (w.type === 'blade') {
    if (w.glow) { c.shadowColor = w.color; c.shadowBlur = 14; }
    c.fillStyle = w.color;
    c.beginPath(); c.moveTo(0, -4); c.lineTo(w.len - 8, -3); c.lineTo(w.len, 0); c.lineTo(w.len - 8, 3); c.lineTo(0, 4); c.closePath(); c.fill();
    c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(2, -1, w.len - 12, 1.5);
    c.fillStyle = '#d9b24a'; c.fillRect(-3, -8, 4, 16);
  } else if (w.type === 'axe') {
    c.fillStyle = '#5b3a1e'; c.fillRect(0, -2.5, w.len - 10, 5);
    c.fillStyle = w.color;
    c.beginPath(); c.moveTo(w.len - 20, -18); c.quadraticCurveTo(w.len + 10, 0, w.len - 20, 18); c.quadraticCurveTo(w.len - 10, 0, w.len - 20, -18); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.moveTo(w.len - 16, -14); c.quadraticCurveTo(w.len + 2, 0, w.len - 16, 14); c.quadraticCurveTo(w.len - 10, 0, w.len - 16, -14); c.fill();
  } else if (w.type === 'hammer') {
    c.fillStyle = '#5b3a1e'; c.fillRect(0, -3, w.len - 14, 6);
    c.fillStyle = w.color; rrect(c, w.len - 22, -13, 22, 26, 3); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(w.len - 22, -13, 22, 7);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(w.len - 22, 7, 22, 6);
  }
  c.restore();
}

function drawPlayer(sx, sy) {
  const p = player, w = stats.weapon;
  const prog = p.atk > 0 ? 1 - p.atk / p.atkDur : -1;
  if (p.buff > 0 || p.novaT > 0) {
    ctx.save(); ctx.strokeStyle = CLASSES[p.classId].color;
    ctx.globalAlpha = p.novaT > 0 ? p.novaT / 0.45 : 0.6;
    ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy, p.novaT > 0 ? 190 * (1 - p.novaT / 0.45) : 25 + Math.sin(time * 8) * 3, 0, TAU); ctx.stroke(); ctx.restore();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(sx, sy + 14, 14, 6, 0, 0, TAU); ctx.fill();
  if (prog >= 0 && w.type !== 'fist') {
    ctx.globalAlpha = 0.45 * (1 - prog);
    ctx.fillStyle = w.glow ? '#c9a6ff' : '#ffffff';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, w.range + stats.rangeBonus, p.atkDir - w.arc / 2, p.atkDir + w.arc / 2); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
  const bob = p.moving ? Math.abs(Math.sin(p.walkT * 11)) * -3 : Math.sin(time * 2) * -1;
  ctx.save(); ctx.translate(sx, sy + bob);
  if (p.classId === 'rogue' && p.buff > 0) ctx.globalAlpha = 0.3;
  else if (p.inv > 0) ctx.globalAlpha = 0.65;
  // legs
  ctx.fillStyle = '#2a1f45';
  const lg = p.moving ? Math.sin(p.walkT * 11) * 5 : 0;
  ctx.fillRect(-9, 8 + lg * 0.3, 7, 8); ctx.fillRect(2, 8 - lg * 0.3, 7, 8);
  // cape
  ctx.fillStyle = '#5a2d8c'; rrect(ctx, -14, -10, 28, 24, 9); ctx.fill();
  ctx.fillStyle = stats.armor.color; rrect(ctx, -11, -8, 22, 18, 7); ctx.fill();
  ctx.fillStyle = '#d9b24a'; ctx.fillRect(-11, 4, 22, 3);
  // head
  ctx.fillStyle = '#f1c9a5'; circle(ctx, 0, -16, 10);
  ctx.fillStyle = '#5b3a1e'; ctx.beginPath(); ctx.arc(0, -18, 10, Math.PI, 0); ctx.fill(); ctx.fillRect(-10, -19, 20, 3);
  const ex = Math.cos(p.aim) * 3, ey = Math.sin(p.aim) * 2;
  ctx.fillStyle = '#1a1220'; circle(ctx, -3.5 + ex, -15 + ey, 1.8); circle(ctx, 3.5 + ex, -15 + ey, 1.8);
  // weapon
  ctx.save();
  const swing = prog >= 0 && w.type !== 'fist' ? p.swingSign * lerp(-w.arc / 2, w.arc / 2, prog) : 0;
  ctx.rotate(p.aim + swing);
  drawWeapon(ctx, w, prog, p.swingSign);
  ctx.restore();
  ctx.restore();
}

function drawEnemy(e, sx, sy) {
  if (sx < -80 || sy < -80 || sx > W + 80 || sy > H + 80) return;
  const t = ENEMY_TYPES[e.type];
  const ang = Math.atan2(player.y - e.y, player.x - e.x);
  if (t.boss && e.telegraph > 0) {
    ctx.save(); ctx.strokeStyle = t.color; ctx.globalAlpha = 0.4 + e.telegraph * 0.5; ctx.lineWidth = 3;
    ctx.beginPath();
    if (e.type === 'emberWarden') {
      ctx.moveTo(sx, sy); ctx.arc(sx, sy, 110, e.castAngle - 0.45, e.castAngle + 0.45); ctx.closePath();
    } else ctx.arc(sx, sy, 45 + e.telegraph * 40, 0, TAU);
    ctx.stroke(); ctx.restore();
  }
  if (!t.phase) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(sx, sy + e.r * 0.85, e.r * 0.9, e.r * 0.4, 0, 0, TAU); ctx.fill(); }
  ctx.save(); ctx.translate(sx, sy);
  if (e.hitFlash > 0) ctx.filter = 'brightness(2.5)';
  const s = e.type === 'boss' ? 1.9 : 1;
  ctx.scale(s, s);
  if (e.type === 'zombie' || e.type === 'boss') {
    const bob = Math.sin(e.anim * 6) * 1.5;
    ctx.translate(0, bob);
    ctx.fillStyle = '#2b2040'; ctx.fillRect(-9, 8, 7, 7); ctx.fillRect(2, 8, 7, 7);
    ctx.fillStyle = e.type === 'boss' ? '#3a5a2a' : '#4f7d35'; rrect(ctx, -13, -8, 26, 22, 7); ctx.fill();
    ctx.fillStyle = '#3a2a4a'; ctx.fillRect(-13, -2, 26, 9);
    ctx.fillStyle = '#2a1b3d'; ctx.fillRect(-6, 7, 5, 4); ctx.fillRect(4, 5, 4, 5);
    ctx.save(); ctx.rotate(ang);
    ctx.fillStyle = '#6f9f48'; rrect(ctx, 6, -9, 18, 6, 3); ctx.fill(); rrect(ctx, 6, 3, 18, 6, 3); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#6f9f48'; circle(ctx, 0, -15, 11);
    ctx.fillStyle = '#4f7d35'; ctx.fillRect(-11, -22, 8, 4); ctx.fillRect(2, -24, 6, 4);
    ctx.fillStyle = '#ff3b3b'; circle(ctx, -4, -15, 2.4); circle(ctx, 4, -15, 2.4);
    ctx.fillStyle = '#1a1220'; ctx.fillRect(-5, -9, 10, 2.5);
    if (e.type === 'boss') {
      ctx.fillStyle = '#f5c131'; ctx.beginPath(); ctx.moveTo(-10, -24); ctx.lineTo(-10, -34); ctx.lineTo(-5, -28); ctx.lineTo(0, -36); ctx.lineTo(5, -28); ctx.lineTo(10, -34); ctx.lineTo(10, -24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff3b3b'; circle(ctx, 0, -29, 2);
    }
  } else if (e.type === 'emberWarden') {
    ctx.fillStyle = '#522535';
    ctx.beginPath(); ctx.moveTo(-20, -15); ctx.lineTo(20, -15); ctx.lineTo(27, 28); ctx.lineTo(-27, 28); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff773e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-3, 6); ctx.lineTo(-12, 21); ctx.moveTo(12, -10); ctx.lineTo(5, 11); ctx.lineTo(17, 24); ctx.stroke();
    ctx.fillStyle = '#943943'; circle(ctx, 0, -22, 19);
    ctx.fillStyle = '#ff9850'; circle(ctx, -7, -24, 4); circle(ctx, 7, -24, 4);
    ctx.fillStyle = '#ffcc70'; ctx.beginPath(); ctx.moveTo(-19, -35); ctx.lineTo(-22, -51); ctx.lineTo(-7, -38); ctx.lineTo(0, -54); ctx.lineTo(8, -38); ctx.lineTo(23, -51); ctx.lineTo(19, -35); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2d162b'; ctx.fillRect(-8, -12, 16, 4);
    ctx.fillStyle = '#58352e'; ctx.fillRect(26, -28, 5, 56);
    ctx.fillStyle = '#ff9747'; circle(ctx, 28, -34 + Math.sin(e.anim * 4) * 2, 10);
    ctx.fillStyle = '#fff2a0'; circle(ctx, 28, -36, 4);
  } else if (e.type === 'bat') {
    const flap = Math.sin(e.anim * 18);
    ctx.fillStyle = '#4a2d7a';
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-22, -6 - flap * 8); ctx.lineTo(-16, 4 - flap * 4); ctx.lineTo(-10, 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(22, -6 - flap * 8); ctx.lineTo(16, 4 - flap * 4); ctx.lineTo(10, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6a42a8'; circle(ctx, 0, 0, 8);
    ctx.fillStyle = '#4a2d7a'; ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(-4, -12); ctx.lineTo(-1, -6); ctx.fill(); ctx.beginPath(); ctx.moveTo(6, -5); ctx.lineTo(4, -12); ctx.lineTo(1, -6); ctx.fill();
    ctx.fillStyle = '#ffe14a'; circle(ctx, -3, -1, 1.8); circle(ctx, 3, -1, 1.8);
    ctx.fillStyle = '#fff'; ctx.fillRect(-2, 3, 1.5, 2.5); ctx.fillRect(1, 3, 1.5, 2.5);
  } else if (e.type === 'skeleton') {
    const bob = Math.sin(e.anim * 8) * 1.5;
    ctx.translate(0, bob);
    ctx.fillStyle = '#d9d2c2'; ctx.fillRect(-7, 8, 4, 8); ctx.fillRect(3, 8, 4, 8);
    ctx.fillStyle = '#e8e4d8'; ctx.fillRect(-2, -4, 4, 14);
    for (let i = 0; i < 3; i++) { ctx.fillRect(-9, -2 + i * 4, 18, 2); }
    ctx.save(); ctx.rotate(ang); ctx.fillStyle = '#e8e4d8'; ctx.fillRect(6, -6, 14, 3); ctx.fillRect(6, 3, 14, 3); ctx.restore();
    ctx.fillStyle = '#efe9da'; circle(ctx, 0, -14, 10);
    ctx.fillRect(-5, -6, 10, 4);
    ctx.fillStyle = '#1a1220'; circle(ctx, -3.5, -15, 2.6); circle(ctx, 3.5, -15, 2.6);
    ctx.fillRect(-1, -11, 2, 2); ctx.fillRect(-4, -5, 1.2, 3); ctx.fillRect(-1, -5, 1.2, 3); ctx.fillRect(2, -5, 1.2, 3);
    ctx.fillStyle = '#ff3b3b'; circle(ctx, -3.5, -15, 1); circle(ctx, 3.5, -15, 1);
  } else if (e.type === 'slime' || e.type === 'slimeKing') {
    const wob = Math.sin(e.anim * 5);
    ctx.fillStyle = 'rgba(40,150,70,0.9)'; ctx.beginPath(); ctx.ellipse(0, 4, e.r * (1 + wob * 0.08), e.r * 0.78 * (1 - wob * 0.08), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(90,230,120,0.9)'; ctx.beginPath(); ctx.ellipse(0, 2, e.r * 0.8 * (1 + wob * 0.08), e.r * 0.6 * (1 - wob * 0.08), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-6, -5, 4, 2.5, -0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1220'; circle(ctx, -5, 0, 2.6); circle(ctx, 5, 0, 2.6);
    ctx.fillStyle = '#fff'; circle(ctx, -4.3, -0.7, 0.9); circle(ctx, 5.7, -0.7, 0.9);
    ctx.fillStyle = '#1a1220'; ctx.beginPath(); ctx.arc(0, 5, 3.5, 0, Math.PI); ctx.fill();
    if (e.type === 'slimeKing') {
      ctx.fillStyle = '#f2c451'; ctx.beginPath(); ctx.moveTo(-17, -18); ctx.lineTo(-20, -35); ctx.lineTo(-8, -27); ctx.lineTo(0, -40); ctx.lineTo(8, -27); ctx.lineTo(20, -35); ctx.lineTo(17, -18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b481f5'; circle(ctx, 0, -26, 4);
    }
  } else if (e.type === 'ghost') {
    ctx.globalAlpha = 0.72 + Math.sin(e.anim * 3) * 0.1;
    const bob = Math.sin(e.anim * 3) * 3;
    ctx.translate(0, bob);
    ctx.fillStyle = '#c9d6ff';
    ctx.beginPath(); ctx.arc(0, -4, 13, Math.PI, 0);
    ctx.lineTo(13, 10);
    for (let i = 0; i < 4; i++) {
      const x0 = 13 - i * 6.5, x1 = 13 - (i + 1) * 6.5;
      ctx.quadraticCurveTo((x0 + x1) / 2, 16 + Math.sin(e.anim * 6 + i) * 2, x1, 10);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1a1230'; circle(ctx, -5, -5, 3); circle(ctx, 5, -5, 3); ctx.beginPath(); ctx.ellipse(0, 3, 2.5, 3.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9fb3ff'; circle(ctx, -5, -6, 1); circle(ctx, 5, -6, 1);
  }
  ctx.filter = 'none';
  ctx.restore();
  if (e.hp < e.maxHp) {
    const w = t.boss ? 70 : 32, y = sy - e.r * (t.boss ? 2.4 : 1) - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx - w / 2 - 1, y - 1, w + 2, 6);
    ctx.fillStyle = '#ff5b4a'; ctx.fillRect(sx - w / 2, y, w * clamp(e.hp / e.maxHp, 0, 1), 4);
  }
}

function drawLighting(ox, oy) {
  const s = lightCanvas.width / W;
  lctx.setTransform(1, 0, 0, 1, 0, 0);
  lctx.globalCompositeOperation = 'source-over';
  lctx.fillStyle = 'rgba(5,3,12,0.78)';
  lctx.fillRect(0, 0, lightCanvas.width, lightCanvas.height);
  lctx.globalCompositeOperation = 'destination-out';
  const light = (x, y, r, a) => {
    const g = lctx.createRadialGradient(x * s, y * s, 0, x * s, y * s, r * s);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.45, `rgba(0,0,0,${a * 0.7})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.fillRect((x - r) * s, (y - r) * s, 2 * r * s, 2 * r * s);
  };
  light(player.x - ox, player.y - oy, 380, 1);
  for (const t of torches) {
    const sx = t.x - ox, sy = t.y - oy;
    if (sx < -160 || sy < -160 || sx > W + 160 || sy > H + 160) continue;
    const f = 0.85 + 0.15 * Math.sin(time * 7 + t.seed) * Math.sin(time * 3.3 + t.seed * 2);
    light(sx, sy - 6, 140 * f, 0.9);
  }
  if (stairs.open) light(stairs.x - ox, stairs.y - oy, 120, 0.8);
  for (const e of enemies) if (e.type === 'ghost') light(e.x - ox, e.y - oy, 70, 0.6);
  ctx.drawImage(lightCanvas, 0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  for (const t of torches) {
    const sx = t.x - ox, sy = t.y - oy;
    if (sx < -160 || sy < -160 || sx > W + 160 || sy > H + 160) continue;
    const f = 0.85 + 0.15 * Math.sin(time * 7 + t.seed) * Math.sin(time * 3.3 + t.seed * 2);
    const g = ctx.createRadialGradient(sx, sy - 6, 0, sx, sy - 6, 120 * f);
    g.addColorStop(0, 'rgba(255,140,50,0.22)'); g.addColorStop(1, 'rgba(255,140,50,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - 120, sy - 126, 240, 240);
  }
  if (stairs.open) {
    const sx = stairs.x - ox, sy = stairs.y - oy;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 100);
    g.addColorStop(0, 'rgba(142,224,74,0.25)'); g.addColorStop(1, 'rgba(142,224,74,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - 100, sy - 100, 200, 200);
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawStairsArrow(ox, oy) {
  if (!stairs.open) return;
  const sx = stairs.x - ox, sy = stairs.y - oy;
  if (sx > 40 && sy > 40 && sx < W - 40 && sy < H - 40) return;
  const cx = W / 2, cy = H / 2, a = Math.atan2(sy - cy, sx - cx);
  const rx = Math.min(W, H) * 0.42;
  const ax = cx + Math.cos(a) * rx, ay = cy + Math.sin(a) * rx;
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
  ctx.fillStyle = `rgba(185,255,108,${0.7 + 0.3 * Math.sin(time * 5)})`;
  ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -12); ctx.lineTo(-4, 0); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawBossBar() {
  const boss = enemies.find(e => ENEMY_TYPES[e.type].boss && !e.dead);
  if (!boss) return;
  const touchLandscape = touch.active && W >= 600 && H <= 520;
  const w = Math.min(touchLandscape ? W - 500 : 420, W * 0.6), x = (W - w) / 2;
  const y = W < 600 ? Math.max(260, H - 330) : touchLandscape ? Math.max(128, H - 210) : 128;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; rrect(ctx, x - 3, y - 3, w + 6, 20, 6); ctx.fill();
  ctx.fillStyle = '#6a1212'; ctx.fillRect(x, y, w, 14);
  ctx.fillStyle = '#ff3b3b'; ctx.fillRect(x, y, w * clamp(boss.hp / boss.maxHp, 0, 1), 14);
  ctx.font = '900 13px Impact, "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#ffd1cf'; ctx.fillText(ENEMY_TYPES[boss.type].name.toUpperCase(), W / 2, y - 6);
}

function drawFloorIntro() {
  const a = clamp(floorIntro > 1.9 ? (2.4 - floorIntro) * 2 : floorIntro / 1.9, 0, 1);
  const size = Math.min(72, W * 0.12, H * 0.16);
  ctx.globalAlpha = a;
  ctx.font = `900 ${size}px Impact, "Arial Black", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const boss = floor % 5 === 0;
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillText(boss ? `BOSS FLOOR ${floor}` : `FLOOR ${floor}`, W / 2 + 3, H * 0.34 + 4);
  ctx.fillStyle = boss ? '#ff5b4a' : '#b9ff6c'; ctx.fillText(boss ? `BOSS FLOOR ${floor}` : `FLOOR ${floor}`, W / 2, H * 0.34);
  ctx.font = `900 ${Math.min(16, size * 0.3)}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.fillStyle = '#e9e3f5';
  ctx.fillText(boss ? `The ${ENEMY_TYPES[bossTypeForFloor(floor)].name} awaits...` : 'Defeat every monster to open the stairs', W / 2, H * 0.34 + size * 0.7);
  ctx.globalAlpha = 1;
}

// ---------------- loop ----------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state === 'play') {
    update(dt);
    if (state === 'play') recordHighlight();
  }
  if (state === 'replay') renderReplay(now);
  if (state === 'play' || state === 'pause' || state === 'shop' || state === 'dead') render();
  requestAnimationFrame(frame);
}

resize();
refreshHome();
showScreen('home');
requestAnimationFrame(frame);
})();
