/* ============================================================
   VANTHA · DUEL
   A 90-second card duel: 5 turns, 2 skill cards, one trap.
   Vanilla + Canvas 2D VFX + Web Audio. No build step.
   ============================================================ */
'use strict';

/* ── 0 · tiny helpers ──────────────────────────────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const nf = n => Math.round(n).toLocaleString('en-US');

/* ── 1 · telegram shell ────────────────────────────── */
const TG = window.Telegram?.WebApp;
function bootTelegram() {
  if (!TG) return;
  try {
    TG.ready();
    TG.expand();
    TG.disableVerticalSwipes?.();
    TG.enableClosingConfirmation?.();
    TG.setHeaderColor?.('#000000');
    TG.setBackgroundColor?.('#000000');
  } catch (_) {}
}
function haptic(kind) {
  const h = TG?.HapticFeedback;
  if (!h) return;
  try {
    if (kind === 'light') h.impactOccurred('light');
    else if (kind === 'medium') h.impactOccurred('medium');
    else if (kind === 'heavy') h.impactOccurred('heavy');
    else if (kind === 'error') h.notificationOccurred('error');
    else if (kind === 'success') h.notificationOccurred('success');
    else if (kind === 'select') h.selectionChanged();
  } catch (_) {}
}

/* ── 2 · audio engine (Web Audio, no files) ────────── */
const Audio2 = (() => {
  let ctx = null, master = null, muted = false;
  const ensure = () => {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    return ctx;
  };
  const now = () => ctx.currentTime;
  const noise = (dur = 0.3) => {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  };
  function whoosh() {
    if (muted || !ensure()) return;
    const src = noise(0.26), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = 'bandpass'; bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(600, now());
    bp.frequency.exponentialRampToValueAtTime(2600, now() + 0.16);
    g.gain.setValueAtTime(0.0001, now());
    g.gain.exponentialRampToValueAtTime(0.30, now() + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now() + 0.24);
    src.connect(bp).connect(g).connect(master);
    src.start(); src.stop(now() + 0.26);
  }
  function clang(power = 1) {
    if (muted || !ensure()) return;
    [880, 1320, 1760].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f, now());
      o.frequency.exponentialRampToValueAtTime(f * 0.62, now() + 0.22);
      g.gain.setValueAtTime(0.16 * power / (i + 1), now());
      g.gain.exponentialRampToValueAtTime(0.0001, now() + 0.26 + i * 0.03);
      o.connect(g).connect(master);
      o.start(); o.stop(now() + 0.34);
    });
  }
  function thud(power = 1) {
    if (muted || !ensure()) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, now());
    o.frequency.exponentialRampToValueAtTime(38, now() + 0.42);
    g.gain.setValueAtTime(0.0001, now());
    g.gain.exponentialRampToValueAtTime(0.55 * power, now() + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now() + 0.5);
    o.connect(g).connect(master);
    o.start(); o.stop(now() + 0.52);
  }
  function tick(hi = false) {
    if (muted || !ensure()) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = hi ? 1480 : 1040;
    g.gain.setValueAtTime(0.0001, now());
    g.gain.exponentialRampToValueAtTime(0.07, now() + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, now() + 0.05);
    o.connect(g).connect(master);
    o.start(); o.stop(now() + 0.06);
  }
  function chime() {
    if (muted || !ensure()) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      const t = now() + i * 0.085;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.14, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(master);
      o.start(t); o.stop(t + 0.62);
    });
  }
  function err() {
    if (muted || !ensure()) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(190, now());
    o.frequency.exponentialRampToValueAtTime(90, now() + 0.18);
    g.gain.setValueAtTime(0.12, now());
    g.gain.exponentialRampToValueAtTime(0.0001, now() + 0.2);
    o.connect(g).connect(master);
    o.start(); o.stop(now() + 0.22);
  }
  function resume() { ensure(); if (ctx.state === 'suspended') ctx.resume(); }
  return {
    whoosh, clang, thud, tick, chime, err, resume,
    setMuted(v) { muted = v; },
    get muted() { return muted; },
  };
})();

/* ── 3 · canvas VFX ────────────────────────────────── */
const FX = (() => {
  const cv = $('#fx');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const parts = [];
  const amb = [];
  let band = { top: 0, bottom: 0 };
  let frozenUntil = 0;

  function resize() {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ar = cv.parentElement.getBoundingClientRect();
    band = { top: ar.top - r.top, bottom: ar.bottom - r.top };
    if (!amb.length) for (let i = 0; i < 18; i++) amb.push(seedAmb(true));
  }
  function seedAmb(anywhere) {
    const y = anywhere ? rnd(band.top, band.bottom) : band.bottom + rnd(2, 20);
    return { x: rnd(8, W - 8), y, vy: rnd(-26, -9), vx: rnd(-5, 5), r: rnd(.5, 1.7), a: rnd(.06, .26), tw: rnd(0, 6.28) };
  }

  const local = el => {
    const c = cv.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - c.left, y: r.top + r.height / 2 - c.top, w: r.width, h: r.height };
  };

  function add(p) { parts.push(Object.assign({ t: 0, life: 500 }, p)); }

  function slash(x, y, angle, color = '#FF7A8A', len = 150) {
    add({ kind: 'slash', x, y, angle, color, len, life: 260 });
    for (let i = 0; i < 7; i++) {
      const a = angle + rnd(-.5, .5);
      add({ kind: 'spark', x, y, vx: Math.cos(a) * rnd(90, 260), vy: Math.sin(a) * rnd(90, 260) - 40,
            color, life: rnd(280, 520), size: rnd(1, 2.2) });
    }
  }

  function beam(x1, y1, x2, y2, color = '#FFD24A') {
    add({ kind: 'beam', x: x1, y: y1, x2, y2, color, life: 230 });
  }

  function shatter(x, y, color = '#FFB0B8', n = 16, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2), sp = rnd(60, 260) * power;
      add({ kind: 'shard', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
            rot: rnd(0, 6.28), vr: rnd(-9, 9), size: rnd(3, 8), color, life: rnd(420, 760) });
    }
  }

  function ring(x, y, color = '#8FD4FF', r0 = 10, r1 = 90, life = 380, squash = 1) {
    add({ kind: 'ring', x, y, color, r0, r1, life, squash });
  }

  function number(x, y, text, opts = {}) {
    const { crit = false, good = false, small = false, color } = opts;
    add({ kind: 'text', x, y, text, crit, good, small, color, life: crit ? 1100 : 900 });
  }

  function burst(x, y, color = '#C9B2FF') {
    for (let i = 0; i < 22; i++) {
      const a = rnd(0, 6.28), sp = rnd(30, 180);
      add({ kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, color, life: rnd(300, 620), size: rnd(.8, 2) });
    }
    ring(x, y, color, 6, 84, 460, .6);
  }

  function step(now) {
    if (now < frozenUntil) { draw(0); requestAnimationFrame(step); return; }
    const dt = 16;
    ctx.clearRect(0, 0, W, H);
    // ambient embers drifting up the clash zone
    ctx.save();
    for (let i = 0; i < amb.length; i++) {
      const e = amb[i];
      e.y += e.vy * dt / 1000; e.x += e.vx * dt / 1000; e.tw += .04;
      if (e.y < band.top - 4) { amb[i] = seedAmb(false); continue; }
      const a = e.a * (0.6 + 0.4 * Math.sin(e.tw));
      ctx.globalAlpha = a;
      ctx.fillStyle = i % 3 === 0 ? '#8FB6FF' : '#FFC661';
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 7;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 6.283); ctx.fill();
    }
    ctx.restore();
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      const k = p.t / p.life;
      switch (p.kind) {
        case 'slash': {
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.angle);
          const grow = Math.min(1, k * 2.6);
          const alpha = k < .18 ? k / .18 : 1 - (k - .18) / .82;
          const w = p.len * grow;
          const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
          g.addColorStop(0, 'rgba(255,255,255,0)');
          g.addColorStop(.3, 'rgba(255,255,255,.95)');
          g.addColorStop(.55, p.color);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = g; ctx.lineWidth = 5; ctx.lineCap = 'round';
          ctx.shadowColor = p.color; ctx.shadowBlur = 22;
          ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.stroke();
          ctx.lineWidth = 1.4; ctx.globalAlpha = alpha * .9;
          ctx.beginPath(); ctx.moveTo(-w / 2.2, -3.4); ctx.lineTo(w / 2.2, -3.4); ctx.stroke();
          ctx.restore();
          break;
        }
        case 'beam': {
          ctx.save();
          const a = 1 - k;
          ctx.globalAlpha = a;
          ctx.strokeStyle = p.color; ctx.lineWidth = 3 + 10 * (1 - k);
          ctx.shadowColor = p.color; ctx.shadowBlur = 26;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x2, p.y2); ctx.stroke();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.globalAlpha = a * .9;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x2, p.y2); ctx.stroke();
          ctx.restore();
          break;
        }
        case 'shard': {
          p.vy += 0.55 * dt * 0.6;
          p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000; p.rot += p.vr * dt / 1000;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(0, -p.size); ctx.lineTo(p.size * .8, 0); ctx.lineTo(0, p.size); ctx.lineTo(-p.size * .6, 0);
          ctx.closePath(); ctx.fill();
          ctx.restore();
          break;
        }
        case 'spark': {
          p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000; p.vy += 0.35;
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - k * .5), 0, 6.283); ctx.fill();
          break;
        }
        case 'ring': {
          const r = p.r0 + (p.r1 - p.r0) * Math.pow(k, .45);
          ctx.save();
          ctx.globalAlpha = (1 - k) * .9;
          ctx.strokeStyle = p.color; ctx.lineWidth = 2.2 * (1 - k) + .4;
          ctx.shadowColor = p.color; ctx.shadowBlur = 18;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * (p.squash || 1), 0, 0, 6.283); ctx.stroke();
          ctx.restore();
          break;
        }
        case 'text': {
          const rise = p.crit ? 54 : 42;
          const y = p.y - rise * Math.pow(k, .55);
          const pop = k < .14 ? .6 + (k / .14) * .55 : 1.15 - Math.min(.15, (k - .14) * .5);
          ctx.save();
          ctx.globalAlpha = k < .75 ? 1 : 1 - (k - .75) / .25;
          ctx.translate(p.x, y); ctx.scale(pop, pop);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = `800 ${p.crit ? 21 : p.small ? 11 : 16}px Inter, sans-serif`;
          ctx.lineWidth = 3.4; ctx.strokeStyle = 'rgba(0,0,0,.85)';
          ctx.strokeText(p.text, 0, 0);
          const grd = ctx.createLinearGradient(0, -12, 0, 12);
          if (p.good) { grd.addColorStop(0, '#EAF9FF'); grd.addColorStop(1, '#6FE3FF'); }
          else if (p.crit) { grd.addColorStop(0, '#FFF6D8'); grd.addColorStop(.55, '#FFB24A'); grd.addColorStop(1, '#FF4E5E'); }
          else { grd.addColorStop(0, '#FFFFFF'); grd.addColorStop(1, p.color || '#FF9AA5'); }
          ctx.fillStyle = grd;
          ctx.shadowColor = p.crit ? 'rgba(255,150,60,.9)' : 'rgba(255,80,100,.7)';
          ctx.shadowBlur = p.crit ? 22 : 12;
          ctx.fillText(p.text, 0, 0);
          ctx.restore();
          break;
        }
      }
    }
    requestAnimationFrame(step);
  }
  function draw() {}

  function freeze(ms) { frozenUntil = performance.now() + ms; }

  return { resize, local, slash, beam, shatter, ring, number, burst, freeze, start: () => requestAnimationFrame(step), _parts: parts };
})();

/* ── 4 · content ───────────────────────────────────── */
const DECK = [
  { id: 'heavy', pixelIndex: 0, name: 'Heavy Slash', school: 'STRIKE', cost: 3, tone: 'gold', icon: 'i-sword', effect: '140% ATK', dmg: 1.4 },
  { id: 'parry', pixelIndex: 1, name: 'Mirror Parry', school: 'TRAP', cost: 2, tone: 'violet', icon: 'i-shield', effect: 'REFLECT 80%', trap: 'parry' },
  { id: 'iron', pixelIndex: 2, name: 'Iron Guard', school: 'GUARD', cost: 2, tone: 'ice', icon: 'i-shield', effect: '+60 DEF · +1 EP', guard: 60, ep: 1 },
  { id: 'rend', pixelIndex: 3, name: 'Soul Rend', school: 'STRIKE', cost: 2, tone: 'gold', icon: 'i-flame', effect: '90% ATK · +25 SOUL', dmg: 0.9, soul: 25 },
  { id: 'lance', pixelIndex: 4, name: 'Ember Lance', school: 'STRIKE', cost: 3, tone: 'gold', icon: 'i-bolt', effect: '110% · PIERCE', dmg: 1.1, pierce: true },
  { id: 'bind', pixelIndex: 5, name: 'Hex Bind', school: 'HEX', cost: 2, tone: 'violet', icon: 'i-chain', effect: 'FOE −25% ATK', weaken: 0.25 },
  { id: 'tithe', pixelIndex: 6, name: 'Blood Tithe', school: 'HEX', cost: 1, tone: 'violet', icon: 'i-skull', effect: '40% ATK · HEAL 20', dmg: 0.4, heal: 20 },
  { id: 'step', pixelIndex: 7, name: 'Phantom Step', school: 'GUARD', cost: 1, tone: 'ice', icon: 'i-eye', effect: 'DODGE 50%', dodge: 0.5 },
  { id: 'bloom', pixelIndex: 8, name: 'Grave Bloom', school: 'HEX', cost: 2, tone: 'violet', icon: 'i-grave', effect: 'SOUL ÷ 2 DAMAGE', soulDmg: true },
  { id: 'last', pixelIndex: 9, name: 'Last Light', school: 'STRIKE', cost: 4, tone: 'gold', icon: 'i-star', effect: '180% ATK · TURN 4+', dmg: 1.8, minTurn: 4 },
];

const FRAMES = [
  { min: 0, cls: 'frame--bronze', label: 'BRONZE' },
  { min: 3, cls: 'frame--silver', label: 'SILVER' },
  { min: 7, cls: 'frame--neon', label: 'CYBER-NEON' },
  { min: 15, cls: 'frame--mythic', label: 'MYTHIC GOLD' },
];

/* ── 5 · state ─────────────────────────────────────── */
const META_KEY = 'vantha.duel.meta';
const meta = { wins: 0, shards: 0, muted: false, best: 0 };
function loadMeta() {
  try { Object.assign(meta, JSON.parse(localStorage.getItem(META_KEY) || '{}')); } catch (_) {}
}
function saveMeta() {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (_) {}
}
function frameFor(w) { let f = FRAMES[0]; for (const x of FRAMES) if (w >= x.min) f = x; return f; }

let S = null;
function freshState() {
  return {
    turn: 1, maxTurns: 5,
    phase: 'boot', busy: false, over: false,
    time: 15, clock: null, lastTick: 0,
    me: { hp: 400, max: 400, ep: 4, maxEp: 8, atk: 90, def: 35, soul: 0, guard: 0, dodge: 0, trap: null },
    foe: { hp: 320, max: 320, ep: 4, maxEp: 8, atk: 85, def: 40, soul: 0, guard: 0, dodge: 0, atkMod: 1, intent: null, trap: null },
    hand: [], grave: 0, deck: 10, pile: [],
    dmgDealt: 0, dmgTaken: 0, log: [],
    resolving: null,
  };
}

/* ── 6 · paint ─────────────────────────────────────── */
const ROMAN = ['','I','II','III','IV','V'];
const EL = {
  turnNum: $('#turn-num'), pips: $$('#turn-pips i'), timer: $('#timer'), clock: $('.bar__clock'),
  grave: $('#grave-count'), deck: $('#deck-count'),
  foeHpFill: $('#foe-hp-fill'), foeHpGhost: $('#foe-hp-ghost'), foeHpNum: $('#foe-hp-num'), foeEp: $('#foe-ep'),
  meHpFill: $('#me-hp-fill'), meHpGhost: $('#me-hp-ghost'), meHpNum: $('#me-hp-num'), meEp: $('#me-ep'),
  foeAtk: $('#foe-atk'), foeDef: $('#foe-def'), meAtk: $('#me-atk'), meDef: $('#me-def'),
  foeSoul: $('#foe-soul'), meSoul: $('#me-soul'),
  arenaNum: $('#arena-num'),
  foeTell: $('#foe-tell'), meTell: $('#me-tell'), foeAura: $('#foe-aura'), meAura: $('#me-aura'),
  meFrame: $('#me-frame'), meTag: $('#me-tag'), fuse: $('#fuse'), fuseFill: $('#fuse-fill'),
  hand: $('#hand'), callout: $('#callout'),
};

function pips(n, max) {
  let s = '';
  for (let i = 0; i < max; i++) s += `<i class="${i < n ? 'is-on' : ''}"></i>`;
  return s;
}

function setHp(side, hp) {
  const o = S[side]; o.hp = clamp(hp, 0, o.max);
  const k = o.hp / o.max;
  const fill = side === 'me' ? EL.meHpFill : EL.foeHpFill;
  const ghost = side === 'me' ? EL.meHpGhost : EL.foeHpGhost;
  const num = side === 'me' ? EL.meHpNum : EL.foeHpNum;
  fill.style.transform = `scaleX(${k})`;
  ghost.style.transform = `scaleX(${k})`;
  fill.classList.toggle('is-low', k <= 0.3);
  fill.classList.toggle('is-mid', k > 0.3 && k <= 0.62);
  num.textContent = nf(o.hp);
}

const LAST = {};
function setOnce(key, el, html) {
  if (LAST[key] === html) return;
  LAST[key] = html;
  el.innerHTML = html;
}
function paint() {
  if (EL.arenaNum){
    EL.arenaNum.textContent = ROMAN[S.turn] || String(S.turn);
    EL.arenaNum.classList.toggle('is-off', S.turn <= 1);
    EL.arenaNum.classList.toggle('is-final', S.turn >= 5);
  }
  EL.turnNum.textContent = S.turn;
  EL.pips.forEach((p, i) => p.classList.toggle('is-on', i < S.turn));
  EL.timer.textContent = Math.max(0, Math.ceil(S.time));
  EL.clock.classList.toggle('is-low', S.time <= 5.01 && S.phase === 'player');
  EL.grave.textContent = S.grave;
  EL.deck.textContent = S.deck;
  setOnce('foeEp', EL.foeEp, pips(S.foe.ep, S.foe.maxEp));
  setOnce('meEp', EL.meEp, pips(S.me.ep, S.me.maxEp));
  EL.foeAtk.textContent = Math.round(S.foe.atk * S.foe.atkMod);
  EL.foeDef.textContent = Math.round(S.foe.def + S.foe.guard);
  EL.meAtk.textContent = S.me.atk;
  EL.meDef.textContent = Math.round(S.me.def + S.me.guard);
  EL.foeSoul.style.width = `${S.foe.soul}%`;
  EL.meSoul.style.width = `${S.me.soul}%`;
  EL.meHpNum.textContent = nf(S.me.hp);
  EL.foeHpNum.textContent = nf(S.foe.hp);
  EL.fuseFill.style.transform = `scaleX(${clamp(S.time / 15, 0, 1)})`;
  EL.fuse.classList.toggle('is-low', S.time <= 5 && S.phase === 'player');
  // your own status line
  let mt = 'READY';
  if (S.me.trap) mt = 'TRAP ARMED · NEXT HIT REFLECTED';
  else if (S.me.guard > 0) mt = `GUARD +${Math.round(S.me.guard)}`;
  else if (S.me.soul >= 100) mt = 'SOUL SURGE READY · NEXT HIT ×1.4';
  else if (S.me.dodge) mt = 'PHANTOM STEP · 50% EVADE';
  if (EL.meTell) {
    if (EL.meTell.textContent !== mt) EL.meTell.textContent = mt;
    EL.meTell.className = 'mc__tagline' + (S.me.trap ? ' is-armed' : S.me.guard ? '' : ' is-armed');
  }
  const fr = frameFor(meta.wins);
  EL.meFrame.className = `mc__frame ${fr.cls}`;
  EL.meTag.textContent = `${fr.label} · ASHBOUND`;
  document.body.classList.toggle('climax', S.turn >= 4 && !S.over);
}

/* ── 7 · hand ──────────────────────────────────────── */
function drawCard() {
  if (!S.pile.length) S.pile = [...DECK].sort(() => Math.random() - .5);
  let card = S.pile.pop();
  let guard = 0;
  while (card && card.minTurn && card.minTurn > S.turn && guard++ < 8) {
    S.pile.unshift(card);
    card = S.pile.pop();
  }
  return card;
}
function dealTo(n) {
  while (S.hand.length < n && S.deck > 0) {
    S.hand.push(drawCard());
    S.deck--;
  }
}
function renderHand(enter = false) {
  EL.hand.innerHTML = '';
  S.hand.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'skill';
    b.dataset.tone = c.tone;
    b.style.setProperty('--skill-icon-x', `${-c.pixelIndex * 32}px`);
    b.dataset.i = i;
    b.dataset.id = c.id;
    b.innerHTML = `
      <span class="skill__frame"></span>
      <span class="skill__foil"></span>
      <span class="skill__top">
        <span class="skill__cost">${c.cost}</span>
        <span class="skill__school">${c.school}</span>
      </span>
      <span class="skill__body">
        <span class="skill__art"><span class="skill__pixel" role="img" aria-label="${c.name} icon"></span></span>
        <span class="skill__name">${c.name}</span>
      </span>
      <span class="skill__plate">
        <span class="skill__effect">${c.effect}</span>
        <span class="skill__hint"><svg class="ico"><use href="#i-arrow-up"/></svg></span>
      </span>`;
    if (enter) {
      b.style.opacity = '0';
      b.style.transform = 'translateY(26px) scale(.86)';
      requestAnimationFrame(() => {
        b.style.transition = 'transform .5s cubic-bezier(.18,1.24,.32,1), opacity .3s';
        b.style.opacity = '1';
        b.style.transform = '';
      });
    }
    attachCardGestures(b, i);
    EL.hand.appendChild(b);
  });
  refreshAffordability();
}
function refreshAffordability() {
  $$('.skill', EL.hand).forEach((el, i) => {
    const c = S.hand[i];
    if (!c) return;
    const locked = c.cost > S.me.ep || (c.minTurn && S.turn < c.minTurn);
    el.classList.toggle('is-unaffordable', locked && S.phase === 'player');
  });
}

/* ── 8 · tilt + gestures ───────────────────────────── */
function attachTilt(tiltEl, cardEl) {
  let raf = null;
  const move = e => {
    const r = cardEl.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const ry = (px - .5) * 13;
    const rx = (.5 - py) * 10;
    cardEl.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
    cardEl.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
    cardEl.style.setProperty('--px', `${(px * 100).toFixed(1)}%`);
    cardEl.style.setProperty('--py', `${(py * 100).toFixed(1)}%`);
    if (!tiltEl.classList.contains('is-tilting')) tiltEl.classList.add('is-tilting');
    if (raf) cancelAnimationFrame(raf);
  };
  tiltEl.addEventListener('pointermove', move);
  tiltEl.addEventListener('pointerleave', () => {
    tiltEl.classList.remove('is-tilting');
    cardEl.style.setProperty('--rx', '0deg');
    cardEl.style.setProperty('--ry', '0deg');
    cardEl.style.setProperty('--px', '50%');
    cardEl.style.setProperty('--py', '50%');
  });
  tiltEl.addEventListener('pointerdown', () => haptic('light'));
}

function attachCardGestures(el, i) {
  let sx = 0, sy = 0, dragging = false, moved = false;
  el.addEventListener('pointerdown', e => {
    if (S.phase === 'discard') {
      dragging = true; moved = false; sx = e.clientX; sy = e.clientY;
      haptic('light'); Audio2.resume();
      return;
    }
    if (S.phase !== 'player' || S.busy) return;
    dragging = true; moved = false; sx = e.clientX; sy = e.clientY;
    el.setPointerCapture?.(e.pointerId);
    el.style.transition = 'box-shadow .2s';
    haptic('light');
    Audio2.resume();
    // tilt
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', `${(px - .5) * 12}deg`);
    el.style.setProperty('--rx', `${(.5 - py) * 9}deg`);
  });
  el.addEventListener('pointermove', e => {
    if (!dragging) {
      // hover-tilt / foil
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--ry', `${(px - .5) * 12}deg`);
      el.style.setProperty('--rx', `${(.5 - py) * 9}deg`);
      el.style.setProperty('--px', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--py', `${(py * 100).toFixed(1)}%`);
      return;
    }
    const dy = e.clientY - sy, dx = e.clientX - sx;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
    el.style.setProperty('--ty', `${Math.min(0, dy)}px`);
    if (dy < -8) el.classList.add('is-discard');
  });
  const end = e => {
    if (!dragging) return;
    dragging = false;
    const dy = e.clientY - sy;
    el.classList.remove('is-discard');
    el.style.setProperty('--ty', '0px');
    if (S.phase === 'discard') { pickDiscard(i); return; }
    if (S.phase !== 'player' || S.busy) return;
    if (dy < -34) { castSkill(i); return; }
    if (!moved) castSkill(i);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', () => { dragging = false; el.style.setProperty('--ty', '0px'); });
  el.addEventListener('click', () => { if (S.phase === 'discard') pickDiscard(i); });
  el.addEventListener('pointerleave', () => {
    el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--px', '50%'); el.style.setProperty('--py', '50%');
  });
}

/* ── 9 · callout / toast / flash ───────────────────── */
let calloutTimer = null;
function callout(text, tone = '') {
  EL.callout.className = 'callout is-on' + (tone ? ` is-${tone}` : '');
  EL.callout.textContent = text;
  clearTimeout(calloutTimer);
  calloutTimer = setTimeout(() => EL.callout.classList.remove('is-on'), 1500);
}
let toastTimer = null;
function toast(text, tone = '') {
  const t = $('#toast');
  t.className = 'toast is-on' + (tone === 'bad' ? ' is-bad' : '');
  t.textContent = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 1500);
}
function flash(kind = 'white') {
  const f = $('#flash');
  f.className = 'flash';
  void f.offsetWidth;
  f.classList.add(kind === 'crimson' ? 'is-crimson' : 'is-white');
}
function shakeStage() {
  const st = $('#stage');
  st.classList.remove('is-shaking');
  void st.offsetWidth;
  st.classList.add('is-shaking');
  setTimeout(() => st.classList.remove('is-shaking'), 420);
}

/* ── 10 · combat ───────────────────────────────────── */
function posOf(el) { return FX.local(el); }

async function strike(attacker, defender, amount, opts = {}) {
  const { crit = false, label = '', color = '#FF7A8A', trap = null } = opts;
  const aEl = attacker === 'me' ? $('#me-card') : $('#foe-card');
  const dEl = defender === 'me' ? $('#me-card') : $('#foe-card');
  const from = posOf(aEl), to = posOf(dEl);

  Audio2.whoosh();
  const midY = (from.y + to.y) / 2;
  FX.slash((from.x + to.x) / 2, midY + rnd(-10, 10), rnd(-.42, .42) + (attacker === 'me' ? -.15 : 2.9), color, 172);
  FX.beam(from.x, from.y, to.x, to.y, color);

  await sleep(140);

  // trap resolution
  const dState = S[defender];
  if (dState.trap === 'parry') {
    const reflect = Math.round(amount * 0.8);
    dState.trap = null;
    const aState = S[attacker];
    setHp(attacker, aState.hp - reflect);
    S.dmgTaken += attacker === 'me' ? reflect : 0;
    S.log.push({ type: 'reflect', turn: S.turn, value: reflect, by: defender });
    callout('MIRROR PARRY TRIGGERED!', 'trap');
    FX.burst(to.x, to.y, '#C9B2FF');
    FX.shatter((from.x + to.x) / 2, midY, '#DCCBFF', 20, 1.1);
    FX.number((from.x + to.x) / 2, midY, `REFLECT ${reflect}`, { good: true, crit: true });
    FX.number(from.x + rnd(40, 70), from.y + rnd(-8, 8), `-${reflect}`, { crit: true });
    hitStop(120);
    flash('white');
    shakeStage();
    Audio2.clang(1.3); Audio2.thud(.7);
    haptic('heavy');
    paint();
    await sleep(560);
    return { reflected: reflect, dealt: 0 };
  }

  const guard = dState.guard || 0;
  const dodge = dState.dodge || 0;
  if (dodge && Math.random() < dodge) {
    dState.dodge = 0;
    callout('PHANTOM STEP — EVADED', 'trap');
    FX.number(to.x + rnd(-40, 40), midY, 'MISS', { good: true });
    Audio2.whoosh();
    paint();
    await sleep(420);
    return { evaded: true, dealt: 0 };
  }
  let dmg = Math.max(6, Math.round(amount - guard * 0.7));
  dState.guard = 0;
  dState.dodge = 0;
  setHp(defender, dState.hp - dmg);
  if (attacker === 'me') S.dmgDealt += dmg; else S.dmgTaken += dmg;
  S.log.push({ type: 'hit', turn: S.turn, value: dmg, by: attacker, crit });

  const numY = defender === 'foe' ? to.y + to.h / 2 + 6 : to.y - to.h / 2 - 2;
  FX.shatter((from.x + to.x) / 2, midY, color, crit ? 24 : 15, crit ? 1.2 : .9);
  FX.ring((from.x + to.x) / 2, midY, color, 6, crit ? 96 : 74, 360, .55);
  FX.number(to.x + rnd(-34, 34), numY, `-${dmg}${crit ? ' CRIT!' : ''}`, { crit, color });
  hitStop(crit ? 130 : 90);
  flash(crit ? 'white' : 'crimson');
  shakeStage();
  Audio2.clang(crit ? 1.4 : 1);
  if (crit) Audio2.thud(1);
  haptic(crit ? 'heavy' : 'medium');
  if (label) callout(label, crit ? '' : '');
  paint();
  await sleep(crit ? 620 : 480);
  return { dealt: dmg };
}

function hitStop(ms) { FX.freeze(ms); }

/* ── 11 · clock ────────────────────────────────────── */
function startClock() {
  stopClock();
  S.time = 15;
  S.lastTick = 0;
  paint();
  S.clock = setInterval(() => {
    if (S.phase !== 'player' || S.busy) return;
    S.time -= 0.1;
    if (S.time <= 5.01) {
      const sec = Math.ceil(S.time);
      if (sec !== S.lastTick) { S.lastTick = sec; Audio2.tick(sec <= 3); haptic('light'); }
    }
    if (S.time <= 0) {
      S.time = 0;
      stopClock();
      paint();
      timedOut();
      return;
    }
    paint();
  }, 100);
}
function stopClock() { if (S && S.clock) { clearInterval(S.clock); S.clock = null; } }
function timedOut() {
  callout('THE FUSE BURNS OUT — FORCED GUARD', 'bad');
  toast('TIME', 'bad');
  haptic('error');
  doGuard(true);
}

/* ── 12 · player actions ───────────────────────────── */
function canAct() { return S.phase === 'player' && !S.busy && !S.over; }

async function castSkill(i) {
  if (!canAct()) return;
  if (S.phase === 'discard') return;
  const card = S.hand[i];
  if (!card) return;
  if (card.minTurn && S.turn < card.minTurn) { toast('TURN 4 OR LATER', 'bad'); Audio2.err(); haptic('error'); return; }
  if (card.cost > S.me.ep) { toast('NOT ENOUGH EP', 'bad'); Audio2.err(); haptic('error');
    const el = $$('.skill', EL.hand)[i]; el?.animate?.([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 260 });
    return; }
  S.busy = true;
  stopClock();
  S.me.ep -= card.cost;
  haptic('medium');
  paint(); refreshAffordability();

  const el = $$('.skill', EL.hand)[i];
  el?.classList.add('is-gone');
  S.hand.splice(i, 1);
  Audio2.whoosh();
  await sleep(230);
  renderHand();

  await resolveSkill(card);
  await afterPlayerAction('skill');
}

async function resolveSkill(card) {
  const me = S.me, foe = S.foe;
  const pMe = posOf($('#me-card')), pFoe = posOf($('#foe-card'));

  if (card.trap) {
    me.trap = 'parry';
    EL.meAura.classList.add('is-on');
    callout('COUNTER SET — TRAP ARMED', 'trap');
    FX.burst(pMe.x, pMe.y, '#C9B2FF');
    FX.ring(pMe.x, pMe.y, '#C9B2FF', 8, 78, 460, .5);
    Audio2.clang(.7);
    haptic('medium');
    S.log.push({ type: 'trap', turn: S.turn });
    await sleep(520);
    return;
  }

  if (card.guard) {
    me.guard += card.guard;
    me.ep = Math.min(me.maxEp, me.ep + (card.ep || 0));
    EL.meAura.classList.add('is-on');
    callout('IRON GUARD — +60 DEF', 'trap');
    FX.ring(pMe.x, pMe.y, '#8FD4FF', 8, 74, 430, .5);
    Audio2.clang(.9);
    paint();
    await sleep(460);
    return;
  }

  if (card.dodge) {
    me.dodge = card.dodge;
    callout('PHANTOM STEP — 50% EVADE', 'trap');
    FX.ring(pMe.x, pMe.y, '#8FD4FF', 6, 68, 400, .5);
    Audio2.whoosh();
    haptic('medium');
    await sleep(400);
    return;
  }

  if (card.weaken) {
    foe.atkMod = Math.max(0.5, foe.atkMod - card.weaken);
    callout('HEX BIND — FOE ATK FALLING', 'trap');
    FX.burst(pFoe.x, pFoe.y, '#A97BFF');
    Audio2.clang(.6);
    paint();
    haptic('medium');
    await sleep(440);
    return;
  }

  // damage cards
  let raw = 0;
  if (card.soulDmg) {
    raw = Math.round(me.soul / 2 + me.atk * .45);
    me.soul = 0;
  } else if (card.dmg) {
    raw = me.atk * card.dmg;
    if (me.soul >= 100) { raw *= 1.4; me.soul = 0; callout('SOUL SURGE', 'trap'); }
  }
  if (card.soul) me.soul = Math.min(100, me.soul + card.soul);
  if (card.heal) { setHp('me', me.hp + card.heal); FX.number(pMe.x, pMe.y - 8, `+${card.heal}`, { good: true }); }

  const def = card.pierce ? 0 : foe.def * 0.5;
  let dmg = Math.round(raw - def);
  if (S.turn >= 5) dmg = Math.round(dmg * 1.5);
  const crit = Math.random() < .16;
  if (crit) dmg = Math.round(dmg * 1.55);

  await strike('me', 'foe', dmg, { crit, label: card.name.toUpperCase(), color: card.tone === 'ice' ? '#8FD4FF' : card.tone === 'violet' ? '#C9B2FF' : '#FFD24A' });
  paint();
}

async function doAttack() {
  if (!canAct()) return;
  S.busy = true; stopClock();
  S.me.ep = Math.min(S.me.maxEp, S.me.ep + 2);
  paint();
  let dmg = Math.round(S.me.atk - S.foe.def * .5);
  if (S.turn >= 5) { dmg = Math.round(dmg * 1.5); Audio2.thud(1); }
  const crit = Math.random() < .12;
  if (crit) dmg = Math.round(dmg * 1.5);
  haptic('medium');
  await strike('me', 'foe', dmg, { crit, label: S.turn >= 5 ? 'FINAL CLIMAX STRIKE' : 'BASIC ATTACK', color: '#FFD24A' });
  await afterPlayerAction('attack');
}

async function doGuard(forced = false) {
  if (!canAct()) return;
  S.busy = true; stopClock();
  S.me.guard += 55;
  S.me.ep = Math.min(S.me.maxEp, S.me.ep + 2);
  EL.meAura.classList.add('is-on');
  const p = posOf($('#me-card'));
  FX.ring(p.x, p.y, '#8FD4FF', 10, 80, 460, .5);
  FX.number(p.x, p.y - 10, '+55 DEF', { good: true });
  Audio2.clang(.8);
  callout(forced ? 'FUSE OUT — GUARD' : 'GUARDING', 'trap');
  paint();
  await sleep(460);
  await afterPlayerAction('guard');
}

/* ── 13 · discard ritual ───────────────────────────── */
let discardResolve = null;
function pickDiscard(i) {
  if (!discardResolve) return;
  const card = S.hand[i];
  const el = $$('.skill', EL.hand)[i];
  el?.classList.add('is-gone');
  S.hand.splice(i, 1);
  S.grave++; S.deck = Math.max(0, S.deck);
  S.me.soul = Math.min(100, S.me.soul + 22);
  const p = posOf($('#me-card'));
  FX.burst(p.x + 40, p.y - 30, '#C41E3A');
  FX.number(p.x + 40, p.y - 34, '+22 SOUL', { small: true });
  Audio2.thud(.35);
  haptic('heavy');
  EL.grave.parentElement.classList.add('is-pulse');
  setTimeout(() => EL.grave.parentElement.classList.remove('is-pulse'), 400);
  paint();
  const fn = discardResolve;
  discardResolve = null;
  setTimeout(() => { renderHand(); fn(); }, 240);
}
function askDiscard() {
  return new Promise(res => {
    discardResolve = res;
    S.phase = 'discard';
    callout('DISCARD TO THE GRAVE', 'bad');
    toast('TAP A CARD TO FEED THE GRAVE', 'bad');
    $$('.skill', EL.hand).forEach(el => el.classList.add('is-discard'));
    haptic('medium');
  });
}

/* ── 14 · turn flow ────────────────────────────────── */
async function afterPlayerAction(kind) {
  EL.meAura.classList.remove('is-on');
  if (S.foe.hp <= 0) return finish('win');

  // the 2-card hand limit — discard the surplus into the grave
  if (S.hand.length > 2 && (kind === 'attack' || kind === 'guard')) {
    while (S.hand.length > 2) await askDiscard();
    S.phase = 'player';
  }

  await enemyTurn();
}

function rollIntent() {
  const r = Math.random();
  if (r < .11 && !S.foe.trap) return { type: 'trap' };
  if (r < .24) return { type: 'guard', value: 45 };
  if (r < .34) return { type: 'skill', value: 1.25, name: 'GRAVE LANCE' };
  return { type: 'strike', value: 1 };
}
function tellIntent() {
  const i = S.foe.intent;
  if (!i) return;
  const dmg = Math.round(S.foe.atk * S.foe.atkMod * i.value - S.me.def * .5);
  if (i.type === 'trap') {
    EL.foeTell.textContent = 'COUNTER ARMED · UNKNOWN';
    EL.foeTell.className = 'mc__tagline is-armed';
    EL.foeAura.classList.add('is-on');
  } else if (i.type === 'guard') {
    EL.foeTell.textContent = 'GUARDING · BRACING';
    EL.foeTell.className = 'mc__tagline is-armed';
  } else if (i.type === 'skill') {
    EL.foeTell.textContent = `GRAVE LANCE · ${dmg} DMG`;
    EL.foeTell.className = 'mc__tagline is-warn';
  } else {
    EL.foeTell.textContent = `WILL STRIKE · ${dmg} DMG`;
    EL.foeTell.className = 'mc__tagline' + (dmg > 70 ? ' is-warn' : '');
  }
  EL.foeAura.classList.toggle('is-on', !!S.foe.trap);
}

async function enemyTurn() {
  S.phase = 'enemy';
  S.busy = true;
  paint();
  await sleep(420);
  const i = S.foe.intent || rollIntent();
  if (i.type === 'trap') {
    S.foe.trap = 'parry';
    EL.foeAura.classList.add('is-on');
    const p = posOf($('#foe-card'));
    FX.burst(p.x, p.y, '#C9B2FF');
    FX.ring(p.x, p.y, '#C9B2FF', 8, 78, 520, .5);
    callout('THE KNIGHT SETS A COUNTER', 'trap');
    Audio2.clang(.6); Audio2.tick(true);
    haptic('medium');
    paint();
    await sleep(560);
  } else if (i.type === 'guard') {
    S.foe.guard += i.value;
    EL.foeAura.classList.add('is-on');
    const p = posOf($('#foe-card'));
    FX.ring(p.x, p.y, '#8C7BFF', 8, 74, 430, .5);
    FX.number(p.x, p.y - 10, `+${i.value} DEF`, { good: true });
    callout('THE KNIGHT BRACES', 'trap');
    Audio2.clang(.7);
    paint();
    await sleep(520);
    EL.foeAura.classList.remove('is-on');
  } else {
    const raw = S.foe.atk * S.foe.atkMod * (i.type === 'skill' ? 1.25 : 1);
    let dmg = Math.round(raw - S.me.def * .5);
    if (S.turn >= 5) dmg = Math.round(dmg * 1.5);
    await strike('foe', 'me', dmg, {
      crit: i.type === 'skill',
      label: i.type === 'skill' ? 'GRAVE LANCE' : 'KNIGHT STRIKE',
      color: i.type === 'skill' ? '#C9B2FF' : '#FF7A8A',
    });
  }
  S.foe.intent = rollIntent();
  tellIntent();
  paint();
  await sleep(260);
  if (S.me.hp <= 0) return finish('lose');
  if (S.foe.hp <= 0) return finish('win');
  S.turn++;
  if (S.turn > S.maxTurns) return finish(S.me.hp >= S.foe.hp ? 'win' : 'lose', true);
  beginTurn();
}

function beginTurn(first = false) {
  S.phase = 'player';
  S.busy = false;
  S.me.guard = 0;
  if (!first) S.me.ep = Math.min(S.me.maxEp, S.me.ep + 2);
  dealTo(3);
  renderHand(true);
  paint();
  tellIntent();
  refreshAffordability();
  if (S.turn >= 4) callout(S.turn >= 5 ? 'FINAL TURN — EVERY BLOW ×1.5' : 'FINAL CLIMAX', 'bad');
  startClock();
}

/* ── 15 · verdict ──────────────────────────────────── */
function mvpLine() {
  const best = [...S.log].sort((a, b) => b.value - a.value)[0];
  if (!best) return 'A quiet duel — no decisive moment.';
  if (best.type === 'reflect') return `Turn ${best.turn} — Mirror Parry reflected ${best.value} damage back into the Knight.`;
  if (best.type === 'hit') return `Turn ${best.turn} — a ${best.crit ? 'critical' : 'clean'} ${best.value}-damage strike broke the guard.`;
  return `Turn ${best.turn} — the trap closed.`;
}

function finish(result, byPoints = false) {
  S.over = true;
  S.phase = 'over';
  stopClock();
  S.busy = true;
  paint();
  const win = result === 'win';
  const shards = win ? 40 + Math.round(S.dmgDealt / 25) : 12 + Math.round(S.dmgDealt / 40);
  meta.shards += shards;
  if (win) { meta.wins += 1; meta.best = Math.max(meta.best, S.me.hp); }
  saveMeta();

  setTimeout(() => {
    $('#verdict-title').textContent = win ? 'THE KNIGHT FALLS' : 'YOU FELL';
    $('#verdict-eyebrow').textContent = win ? (byPoints ? 'DUEL WON ON POINTS' : 'KNOCKOUT') : (byPoints ? 'DUEL LOST ON POINTS' : 'KNOCKOUT');
    $('#mvp-text').textContent = mvpLine();
    $('#v-dmg').textContent = S.dmgDealt;
    $('#v-turns').textContent = Math.min(S.turn, 5);
    $('#v-shards').textContent = `+${shards}`;
    $('#v-wins').textContent = meta.wins;
    const w = meta.wins === 1 ? 'WIN' : 'WINS';
    $('#v-frame').innerHTML = `FRAME · ${frameFor(meta.wins).label} · <b>${meta.wins}</b> ${w} · ${meta.shards} SHARDS`;
    $('#verdict').classList.add('is-open');
    if (win) { Audio2.chime(); haptic('success'); } else { Audio2.thud(1); haptic('error'); }
    const c = $('#fx').getBoundingClientRect();
    if (win) { FX.burst(c.width / 2, c.height / 2, '#FFD24A'); flash('white'); }
  }, 700);
}

function shareDuel() {
  const win = S.me.hp > 0 && S.foe.hp <= 0;
  const text = win
    ? `I survived on ${S.me.hp} HP and took the Knight down in ${Math.min(S.turn, 5)} turns — beat my deck.`
    : `The Knight left me at ${S.me.hp} HP. Rematch my deck?`;
  const url = 'https://t.me/vantha_bot/duel';
  if (TG?.openTelegramLink) TG.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
  else if (navigator.share) navigator.share({ title: 'VANTHA DUEL', text, url }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(`${text} ${url}`).then(() => toast('REPLAY CARD COPIED'));
}

/* ── 16 · boot & reset ─────────────────────────────── */
function newDuel() {
  stopClock();
  $('#verdict').classList.remove('is-open');
  EL.meAura.classList.remove('is-on');
  EL.foeAura.classList.remove('is-on');
  S = freshState();
  S.hand = [];
  S.pile = [...DECK].sort(() => Math.random() - .5);
  dealTo(2);
  S.deck = 8;
  S.foe.intent = rollIntent();
  setHp('me', S.me.hp);
  setHp('foe', S.foe.hp);
  renderHand(true);
  paint();
  tellIntent();
  beginTurn(true);
  paint();
}

function boot() {
  bootTelegram();
  loadMeta();
  Audio2.setMuted(meta.muted);
  $('#sound-ico').querySelector('use').setAttribute('href', meta.muted ? '#i-mute' : '#i-sound');
  $('#btn-sound').classList.toggle('is-off', meta.muted);

  // fit the stage to the viewport without breaking the 360×640 design box
  const fit = () => {
    const k = Math.min(window.innerWidth / 360, window.innerHeight / 640, 1.35);
    const st = $('#stage');
    st.style.transform = `scale(${k})`;
    st.style.width = '360px';
    st.style.height = '640px';
    st.style.marginLeft = 'auto';
    st.style.marginRight = 'auto';
    document.body.style.height = '100dvh';
    const wrap = 360 * k, hh = 640 * k;
    st.style.position = 'absolute';
    st.style.left = `${(window.innerWidth - wrap) / 2}px`;
    st.style.top = `${Math.max(0, (window.innerHeight - hh) / 2)}px`;
    FX.resize();
  };
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 120));

  attachTilt($('#foe-tilt'), $('#foe-card'));
  attachTilt($('#me-tilt'), $('#me-card'));

  $('#btn-attack').addEventListener('click', () => { Audio2.resume(); doAttack(); });
  $('#btn-guard').addEventListener('click', () => { Audio2.resume(); doGuard(); });
  $('#btn-flee').addEventListener('click', () => {
    if (!canAct()) return;
    haptic('error');
    toast('YOU YIELD THE GROUND', 'bad');
    finish('lose');
  });
  $('#btn-sound').addEventListener('click', () => {
    meta.muted = !meta.muted;
    Audio2.setMuted(meta.muted);
    if (!meta.muted) Audio2.resume();
    saveMeta();
    $('#sound-ico').querySelector('use').setAttribute('href', meta.muted ? '#i-mute' : '#i-sound');
    $('#btn-sound').classList.toggle('is-off', meta.muted);
    if (!meta.muted) Audio2.tick();
  });
  $('#btn-rematch').addEventListener('click', () => { haptic('medium'); Audio2.whoosh(); newDuel(); });
  $('#btn-close').addEventListener('click', () => { haptic('light'); $('#verdict').classList.remove('is-open'); });
  $('#btn-share').addEventListener('click', () => { haptic('medium'); shareDuel(); });

  document.addEventListener('keydown', e => {
    if (e.key >= '1' && e.key <= '3') castSkill(+e.key - 1);
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); doAttack(); }
    else if (e.key.toLowerCase() === 'g') doGuard();
    else if (e.key.toLowerCase() === 'e') $('#btn-flee').click();
  });

  FX.start();
  newDuel();
  setTimeout(() => callout('TURN 1 — SET YOUR TRAP OR STRIKE', 'trap'), 700);
}

document.addEventListener('DOMContentLoaded', boot);
if (document.readyState !== 'loading') boot();
