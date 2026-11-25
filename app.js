/* ============================================================
   VANTHA — TURN-BASED CLASH ENGINE
   Pure state + DOM choreography. No frameworks, no emoji.
   ============================================================ */
'use strict';

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const rnd = (a, b) => a + Math.random() * (b - a);

/* ------------------------------------------------------------
   1. TELEGRAM
   ------------------------------------------------------------ */
const TG = window.Telegram?.WebApp;

function initTelegram() {
  if (!TG) return;
  try {
    TG.ready();
    TG.expand();
    TG.setHeaderColor?.('#000000');
    TG.setBackgroundColor?.('#000000');
    TG.disableVerticalSwipes?.();
  } catch (_) { /* browser fallback */ }
}

const haptic = (kind = 'light') => {
  const h = TG?.HapticFeedback;
  if (!h) return;
  try {
    if (kind === 'heavy' || kind === 'medium' || kind === 'light') h.impactOccurred(kind);
    else if (kind === 'error' || kind === 'success' || kind === 'warning') h.notificationOccurred(kind);
    else h.selectionChanged();
  } catch (_) { /* noop */ }
};

/* ------------------------------------------------------------
   2. DATA
   ------------------------------------------------------------ */
const CARD_POOL = [
  { key: 'cleave',    name: 'Cleave',     cost: 1, dmg: 9,  icon: 'i-sword', tone: 'gold',    tag: 'Strike' },
  { key: 'fang',      name: 'Fang',       cost: 2, dmg: 16, icon: 'i-fang',  tone: 'crimson', tag: 'Rend'   },
  { key: 'gaze',      name: 'Hollow Gaze',cost: 1, dmg: 6,  icon: 'i-eye',   tone: 'bone',    tag: 'Hex'    },
  { key: 'coil',      name: 'Serpent Coil',cost: 2, dmg: 12,icon: 'i-coil',  tone: 'gold',    tag: 'Strike' },
  { key: 'crown',     name: 'Crownbreak', cost: 3, dmg: 26, icon: 'i-crown', tone: 'crimson', tag: 'Rend'   },
  { key: 'sunder',    name: 'Sunder',     cost: 2, dmg: 14, icon: 'i-bolt',  tone: 'gold',    tag: 'Strike' },
  { key: 'foresight', name: 'Foresight',  cost: 1, dmg: 0,  icon: 'i-eye',   tone: 'bone',    tag: 'Sight', sight: 1 },
  { key: 'second',    name: 'Second Sight',cost: 2, dmg: 0, icon: 'i-eye',   tone: 'bone',    tag: 'Sight', sight: 2 },
];

const STAT_KEYS = ['power', 'speed', 'health', 'presence'];
const STAT_LABEL = { power: 'POWER', speed: 'SPEED', health: 'VITALITY', presence: 'PRESENCE' };

const ENEMY_BASE = {
  name: 'The Hollow Knight',
  lv: 4,
  maxHp: 112,
  power: 4, speed: 3, health: 12, presence: 6,
};

const PLAYER_BASE = {
  name: 'The Unnamed',
  maxHp: 74,
  power: 7, speed: 5, health: 37, presence: 9,
  apMax: 3,
};

/* ------------------------------------------------------------
   3. STATE
   ------------------------------------------------------------ */
const S = {
  phase: 'player',
  busy: false,
  over: false,
  turnNo: 1,
  ap: 3,
  player: { ...PLAYER_BASE, hp: PLAYER_BASE.maxHp },
  enemy: {
    name: ENEMY_BASE.name,
    lv: ENEMY_BASE.lv,
    maxHp: ENEMY_BASE.maxHp,
    hp: ENEMY_BASE.maxHp,
    power: ENEMY_BASE.power,
    speed: ENEMY_BASE.speed,
    health: ENEMY_BASE.health,
    presence: ENEMY_BASE.presence,
    revealed: {},
    hpKnown: false,
  },
  hand: [],
  intent: null,
};

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/* ------------------------------------------------------------
   4. STAGE FIT
   ------------------------------------------------------------ */
function fitStage() {
  const stage = $('#stage');
  const k = Math.min(window.innerWidth / 360, window.innerHeight / 640, 1.5);
  stage.style.transform = `scale(${k})`;
}

/* ------------------------------------------------------------
   5. JUICE PRIMITIVES
   ------------------------------------------------------------ */
function shakeNow() {
  const stage = $('#stage');
  stage.classList.remove('is-shaking');
  void stage.offsetWidth;           // restart the animation
  stage.classList.add('is-shaking');
  setTimeout(() => stage.classList.remove('is-shaking'), 560);
}

function spawnFx(kind) {
  const host = $('#arena-fx');
  const el = document.createElement('div');
  el.className = `fx fx--${kind}`;
  el.style.rotate = `${rnd(-6, 6)}deg`;
  el.innerHTML = '<i></i><i></i><i></i>';
  host.appendChild(el);
  setTimeout(() => el.remove(), 680);
}

function flash(tone = 'crimson') {
  const el = $('#arena-flash');
  el.classList.toggle('arena__flash--gold', tone === 'gold');
  el.classList.remove('is-live');
  void el.offsetWidth;
  el.classList.add('is-live');
  setTimeout(() => el.classList.remove('is-live'), 460);
}

function floatDamage(host, value, opts = {}) {
  const { crit = false, small = false, tag = '', tone = '' } = opts;
  const el = document.createElement('div');
  el.className = 'dmg'
    + (crit ? ' dmg--crit' : '')
    + (small ? ' dmg--small' : '')
    + (tone === 'heal' ? ' dmg--heal' : '');
  el.innerHTML = `${value}${tag ? `<span class="dmg__tag">${tag}</span>` : ''}`;
  host.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

/** Ghost card flies from the hand into the arena. */
function flyCard(cardEl) {
  const stage = $('#stage');
  const sr = stage.getBoundingClientRect();
  const k = sr.width / 360 || 1;
  const cr = cardEl.getBoundingClientRect();
  const ar = $('#arena').getBoundingClientRect();

  const ghost = cardEl.cloneNode(true);
  ghost.classList.add('card--ghost');
  ghost.classList.remove('is-selected', 'is-unaffordable', 'is-denied');
  ghost.style.left = `${(cr.left - sr.left) / k}px`;
  ghost.style.top = `${(cr.top - sr.top) / k}px`;
  ghost.style.width = `${cr.width / k}px`;
  ghost.style.height = `${cr.height / k}px`;

  const dx = ((ar.left + ar.width / 2) - (cr.left + cr.width / 2)) / k;
  const dy = ((ar.top + ar.height / 2) - (cr.top + cr.height / 2)) / k;
  ghost.style.setProperty('--dx', `${dx}px`);
  ghost.style.setProperty('--dy', `${dy}px`);

  stage.appendChild(ghost);
  return new Promise(resolve => setTimeout(() => { ghost.remove(); resolve(); }, 450));
}

function toast(text) {
  const arena = $('#arena');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  arena.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

/* ------------------------------------------------------------
   6. PAINT
   ------------------------------------------------------------ */
function paintTurn() {
  $('#turn-no').textContent = `TURN ${ROMAN[S.turnNo] || S.turnNo}`;
}

function paintState(label, tone = 'good') {
  const el = $('#turn-state');
  el.textContent = label;
  el.dataset.tone = tone;
}

function paintAP() {
  $$('#ap-pips .ap__pip').forEach((pip, i) => {
    pip.classList.toggle('is-on', i < S.ap);
  });
  $('#basic-btn').disabled = S.ap < 1 || S.phase !== 'player' || S.busy;
  $$('#hand .card:not(.is-dead)').forEach(el => {
    const card = S.hand.find(c => c.iid === el.dataset.iid);
    if (!card) return;
    el.classList.toggle('is-unaffordable', card.cost > S.ap);
  });
}

function paintEnemyHp() {
  const pct = clamp(S.enemy.hp / S.enemy.maxHp, 0, 1) * 100;
  $('#enemy-hp-fill').style.width = `${pct}%`;
  $('#enemy-hp-ghost').style.width = `${pct}%`;
  const num = $('#enemy-hp-num');
  num.textContent = S.enemy.hpKnown ? `${Math.max(0, S.enemy.hp)} / ${S.enemy.maxHp}` : '???';
}

function paintPlayerHp() {
  const pct = clamp(S.player.hp / S.player.maxHp, 0, 1) * 100;
  $('#player-hp-fill').style.width = `${pct}%`;
  $('#player-hp-num').textContent = `${Math.max(0, S.player.hp)} / ${S.player.maxHp}`;
}

function renderStats() {
  $('#stat-power').textContent = S.player.power;
  $('#stat-speed').textContent = S.player.speed;
  $('#stat-health').textContent = S.player.health;
}

let IID = 0;
const CARD_HTML = (card) => `
  <button class="card" type="button" data-key="${card.key}" data-iid="${card.iid}" data-tone="${card.tone}"
          aria-label="${card.name}, ${card.cost} action points, ${card.sight ? 'reveals hidden stats' : card.dmg + ' damage'}">
    <span class="card__cost">${card.cost}</span>
    <span class="card__tag">${card.tag}</span>
    <span class="card__art"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#${card.icon}"/></svg></span>
    <span class="card__name">${card.name}</span>
    ${card.sight
      ? `<span class="card__dmg card__dmg--sight">REVEAL ${card.sight}</span>`
      : `<span class="card__dmg">${card.dmg}<small>DMG</small></span>`}
  </button>`;

function renderHand() {
  $('#hand').innerHTML = S.hand.map(CARD_HTML).join('');
  $$('#hand .card').forEach(el => {
    el.addEventListener('click', () => playCard(el.dataset.iid, el));
  });
  paintAP();
}

function ensureFloatLayer(parent) {
  let layer = parent.querySelector(':scope > .float-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'float-layer';
    parent.appendChild(layer);
  }
  return layer;
}

/* ------------------------------------------------------------
   7. DRAW / TURN SETUP
   ------------------------------------------------------------ */
function drawHand() {
  const pool = [...CARD_POOL];
  const hand = [];
  for (let i = 0; i < 5 && pool.length; i++) {
    const pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    hand.push({ ...pick, iid: `c${++IID}` });
  }
  // Sight is guaranteed only while the veil is completely unbroken — after the
  // first reveal the deck decides, so the hand never wastes a slot on a dead card.
  const noneKnown = !STAT_KEYS.some(k => S.enemy.revealed[k]);
  if (noneKnown && !hand.some(c => c.sight)) hand[4] = { ...CARD_POOL.find(c => c.key === 'foresight'), iid: `c${++IID}` };
  S.hand = hand;
}

function rollIntent() {
  const heavy = S.turnNo % 3 === 0;
  const dmg = Math.round((6 + S.enemy.power + rnd(0, 2.5)) * (heavy ? 1.5 : 1));
  S.intent = { type: heavy ? 'heavy' : 'strike', dmg };
  const el = $('#intent');
  el.dataset.mode = S.intent.type;
  $('#intent-text').textContent = heavy
    ? `GRAVE LANCE · ${S.enemy.hpKnown ? dmg : '??'} DMG`
    : `WILL STRIKE · ${S.enemy.hpKnown ? dmg : '??'} DMG`;
}

async function startPlayerTurn() {
  S.phase = 'player';
  S.busy = false;
  S.ap = S.player.apMax;
  paintTurn();
  paintState('YOUR MOVE');
  paintAP();
  rollIntent();

  if (S.turnNo > 1) {
    drawHand();
    renderHand();
  }

  $('#arena-hint').classList.add('is-hidden');
  $('#end-btn').disabled = false;
  $('#basic-btn').disabled = false;
}

/* ------------------------------------------------------------
   8. COMBAT MATH
   ------------------------------------------------------------ */
function strikeDamage(card) {
  const raw = card.dmg + Math.round(S.player.power * 0.35);
  const crit = Math.random() < 0.15;
  const variance = rnd(0.92, 1.08);
  return { dmg: Math.max(1, Math.round(raw * variance * (crit ? 1.6 : 1))), crit };
}

async function hitEnemy(dmg, { crit = false, tag = '', quiet = false } = {}) {
  S.enemy.hp = Math.max(0, S.enemy.hp - dmg);
  S.enemy.hpKnown = true;

  if (!quiet) {
    shakeNow();
    spawnFx('impact');
    flash('crimson');
    floatDamage(ensureFloatLayer($('#enemy-card')), `−${dmg}`, { crit, tag });
    $('#enemy-card').classList.add('is-hit');
    setTimeout(() => $('#enemy-card').classList.remove('is-hit'), 520);
    haptic('medium');
  }
  paintEnemyHp();
}

/* ------------------------------------------------------------
   9. PLAYING A CARD
   ------------------------------------------------------------ */
async function playCard(iid, el) {
  const idx = S.hand.findIndex(c => c.iid === iid);
  const card = S.hand[idx];
  if (!card || S.busy || S.over || S.phase !== 'player') return;

  if (card.cost > S.ap) {
    el.classList.remove('is-denied');
    void el.offsetWidth;
    el.classList.add('is-denied');
    haptic('error');
    toast('NOT ENOUGH AP');
    return;
  }

  S.busy = true;
  S.ap -= card.cost;
  $('#arena-hint').classList.add('is-hidden');
  $$('#hand .card').forEach(c => c.classList.remove('is-selected'));
  el.classList.add('is-selected');
  haptic('select');
  paintAP();

  // 1 · the card flies to the centre and vanishes
  await flyCard(el);

  // 2..5 · impact
  if (card.sight) {
    spawnFx('sight');
    spawnFx('ring');
    flash('gold');
    revealStats(card.sight);
    haptic('light');
    await sleep(320);
  }

  if (card.dmg > 0) {
    const { dmg, crit } = strikeDamage(card);
    await hitEnemy(dmg, { crit, tag: card.name.toUpperCase() });
    if (crit) haptic('heavy');
    await sleep(300);
  }

  // clear the card from the hand — the element dies immediately so it can never
  // be clicked or counted again while it fades out
  S.hand.splice(idx, 1);
  el.classList.add('is-dead');
  el.style.pointerEvents = 'none';
  el.style.transition = 'opacity .2s, transform .2s';
  el.style.opacity = '0';
  el.style.transform = 'translateY(8px) scale(.9)';
  setTimeout(() => el.remove(), 220);

  if (S.enemy.hp <= 0) {
    await sleep(520);
    return victory();
  }

  S.busy = false;
  paintAP();
  if (S.ap === 0) nudgeEndTurn();
  else if (!S.hand.length) nudgeEndTurn();
}

function nudgeEndTurn() {
  const btn = $('#end-btn');
  btn.style.boxShadow = '0 0 0 2px rgba(255,215,0,.55),0 8px 22px -10px rgba(255,190,0,.9)';
  setTimeout(() => { btn.style.boxShadow = ''; }, 900);
}

/* ------------------------------------------------------------
   10. SIGHT — flips ??? into a value
   ------------------------------------------------------------ */
function revealStats(count) {
  const hidden = STAT_KEYS.filter(k => !S.enemy.revealed[k]);
  if (!hidden.length) {
    toast('NO VEIL LEFT TO BREAK');
    return;
  }
  const picks = hidden.sort(() => Math.random() - 0.5).slice(0, count);
  picks.forEach((key, i) => setTimeout(() => flipStat(key), i * 180));
}

function flipStat(key) {
  const chip = $(`.estat[data-stat="${key}"]`);
  if (!chip || S.enemy.revealed[key]) return;
  const val = chip.querySelector('.estat__v');

  chip.classList.add('is-veiled');
  chip.classList.remove('is-flipping');
  void chip.offsetWidth;
  chip.classList.add('is-flipping');
  haptic('light');

  setTimeout(() => {
    S.enemy.revealed[key] = true;
    val.textContent = S.enemy[key];
    chip.classList.remove('is-veiled');
    chip.classList.add('is-revealed');
    spawnFx('sight');
    toast(`${STAT_LABEL[key]} REVEALED · ${S.enemy[key]}`);
  }, 210);

  setTimeout(() => chip.classList.remove('is-flipping'), 470);
}

/* ------------------------------------------------------------
   11. BASIC ATTACK + END TURN
   ------------------------------------------------------------ */
async function basicAttack() {
  if (S.busy || S.over || S.phase !== 'player' || S.ap < 1) return;

  S.busy = true;
  S.ap -= 1;
  paintAP();
  haptic('light');

  const btn = $('#basic-btn');
  btn.classList.add('is-pressed');
  setTimeout(() => btn.classList.remove('is-pressed'), 200);

  spawnFx('ring');
  await sleep(160);

  const dmg = Math.max(1, Math.round((5 + S.player.power * 0.5) * rnd(0.94, 1.06)));
  await hitEnemy(dmg, { tag: 'BASIC', small: true });

  if (S.enemy.hp <= 0) {
    await sleep(480);
    return victory();
  }

  S.busy = false;
  paintAP();
  if (S.ap === 0) nudgeEndTurn();
}

async function endTurn() {
  if (S.busy || S.over || S.phase !== 'player') return;
  S.phase = 'enemy';
  S.busy = true;
  S.ap = 0;
  paintAP();
  $('#end-btn').disabled = true;
  $('#basic-btn').disabled = true;
  paintState('ENEMY TURN', 'bad');
  haptic('light');

  await enemyTurn();
}

async function enemyTurn() {
  await sleep(420);

  // wind-up
  $('#intent').classList.add('is-firing');
  spawnFx(S.intent.type === 'heavy' ? 'burst' : 'impact');
  await sleep(240);

  shakeNow();
  flash('crimson');

  const dmg = S.intent.dmg;
  S.player.hp = Math.max(0, S.player.hp - dmg);
  paintPlayerHp();
  floatDamage(ensureFloatLayer($('.player')), `−${dmg}`, { tag: S.intent.type === 'heavy' ? 'GRAVE LANCE' : 'STRUCK' });
  haptic('heavy');

  await sleep(880);

  if (S.player.hp <= 0) return defeat();

  S.turnNo += 1;
  await startPlayerTurn();
  paintAP();
}

/* ------------------------------------------------------------
   12. VERDICT
   ------------------------------------------------------------ */
function victory() {
  S.over = true;
  paintState('GROUND CLAIMED');
  openVerdict({
    win: true,
    title: 'THE KNIGHT FALLS',
    sub: 'It kneels in the glass. The ground remembers what you are.',
    label: 'Claim the Ground',
  });
  haptic('success');
}

function defeat() {
  S.over = true;
  paintState('YOU FELL', 'bad');
  openVerdict({
    win: false,
    title: 'YOU FELL',
    sub: 'The Hollow Knight takes your coin and your name. The glass closes over you.',
    label: 'Rise Again',
  });
  haptic('error');
}

function openVerdict({ win, title, sub, label }) {
  $('#verdict-title').textContent = title;
  $('#verdict-sub').textContent = sub;
  $('#verdict-btn-label').textContent = label;
  $('#verdict-sigil').classList.toggle('is-gold', win);
  $('#verdict-sigil').querySelector('svg').style.filter = win ? 'drop-shadow(0 0 10px rgba(255,215,0,.8))' : '';
  const v = $('#verdict');
  v.classList.add('is-open');
  v.setAttribute('aria-hidden', 'false');
}

function closeVerdict() {
  const v = $('#verdict');
  v.classList.remove('is-open');
  v.setAttribute('aria-hidden', 'true');
}

function resetBattle() {
  closeVerdict();
  Object.assign(S, {
    phase: 'player', busy: false, over: false, turnNo: 1, ap: 3,
    player: { ...PLAYER_BASE, hp: PLAYER_BASE.maxHp },
    hand: [], intent: null,
  });
  S.enemy = {
    name: ENEMY_BASE.name, lv: ENEMY_BASE.lv,
    maxHp: ENEMY_BASE.maxHp, hp: ENEMY_BASE.maxHp,
    power: ENEMY_BASE.power, speed: ENEMY_BASE.speed,
    health: ENEMY_BASE.health, presence: ENEMY_BASE.presence,
    revealed: {}, hpKnown: false,
  };

  $$('#enemy-stats .estat').forEach(chip => {
    chip.classList.remove('is-revealed', 'is-flipping', 'is-veiled');
    chip.querySelector('.estat__v').textContent = '???';
  });
  $('#enemy-hp-num').textContent = '???';
  paintEnemyHp();
  paintPlayerHp();
  paintTurn();
  paintState('YOUR MOVE');
  $('#intent').dataset.mode = 'idle';
  $('#intent-text').textContent = 'READING THE GLASS';
  $('#arena-hint').classList.remove('is-hidden');
  $('#end-btn').disabled = false;
  drawHand();
  renderHand();
  paintAP();
}

/* ------------------------------------------------------------
   13. BOOT
   ------------------------------------------------------------ */
function boot() {
  initTelegram();
  fitStage();
  window.addEventListener('resize', fitStage);
  window.addEventListener('orientationchange', () => setTimeout(fitStage, 120));

  renderStats();
  paintTurn();
  paintState('YOUR MOVE');
  paintEnemyHp();
  paintPlayerHp();
  drawHand();
  renderHand();
  paintAP();
  rollIntent();

  $('#basic-btn').addEventListener('click', basicAttack);
  $('#end-btn').addEventListener('click', endTurn);
  $('#verdict-btn').addEventListener('click', resetBattle);

  // keyboard for desktop review
  document.addEventListener('keydown', (e) => {
    if (e.key === 'e' || e.key === 'E') endTurn();
    if (e.key === ' ') { e.preventDefault(); basicAttack(); }
    if (/^[1-5]$/.test(e.key)) {
      const el = $$('#hand .card')[+e.key - 1];
      if (el) el.click();
    }
  });

  // test / debug hook
  window.VANTHA = { state: S, playCard, endTurn, basicAttack, revealStats, resetBattle };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
