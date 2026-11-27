import { PlayerState, PlayerStats, SkillCard, SkillId, StatType } from '../types/duel';

export interface SkillDefinition {
  id: SkillId;
  name: string;
  effect: string;
  visualDescription: string;
  preferredAction: 'ATTACK' | 'GUARD' | 'FLEE' | 'ANY';
}

export const SKILL_DEFINITIONS: SkillDefinition[] = [
  {
    id: 'crimson_slash',
    name: 'Crimson Slash',
    effect: 'ATTACK deals double STR damage.',
    visualDescription: 'Red blade arc.',
    preferredAction: 'ATTACK',
  },
  {
    id: 'iron_wall',
    name: 'Iron Wall',
    effect: 'GUARD blocks 100% damage.',
    visualDescription: 'Stone barrier.',
    preferredAction: 'GUARD',
  },
  {
    id: 'phantom_step',
    name: 'Phantom Step',
    effect: 'FLEE auto-succeeds.',
    visualDescription: 'Afterimage blur.',
    preferredAction: 'FLEE',
  },
  {
    id: 'void_gaze',
    name: 'Void Gaze',
    effect: "See opponent's action before choosing.",
    visualDescription: 'Eye opens.',
    preferredAction: 'ANY',
  },
  {
    id: 'blood_pact',
    name: 'Blood Pact',
    effect: 'Sacrifice 2 VIT. Next ATTACK +50%.',
    visualDescription: 'Red sigil.',
    preferredAction: 'ATTACK',
  },
  {
    id: 'frozen_time',
    name: 'Frozen Time',
    effect: 'Opponent skips next turn.',
    visualDescription: 'Screen freezes.',
    preferredAction: 'ANY',
  },
  {
    id: 'mirror_shield',
    name: 'Mirror Shield',
    effect: 'If opponent ATTACKs, they take their own damage.',
    visualDescription: 'Mirror.',
    preferredAction: 'GUARD',
  },
  {
    id: 'chain_break',
    name: 'Chain Break',
    effect: "Cancel opponent's skill card.",
    visualDescription: 'Chain snaps.',
    preferredAction: 'ANY',
  },
  {
    id: 'soul_drain',
    name: 'Soul Drain',
    effect: 'ATTACK heals you 50% of damage.',
    visualDescription: 'Green tendrils.',
    preferredAction: 'ATTACK',
  },
  {
    id: 'last_stand',
    name: 'Last Stand',
    effect: 'If your VIT < 20%, ATTACK is instant kill.',
    visualDescription: 'Crimson explosion.',
    preferredAction: 'ATTACK',
  },
];

export const PORTRAIT_BY_TYPE: Record<StatType, string> = {
  STR: '/src/assets/images/portrait_str_brute_1795736367473.jpg',
  AGI: '/src/assets/images/portrait_agi_stalker_1795736368458.jpg',
  WIS: '/src/assets/images/portrait_wis_oracle_1795736368042.jpg',
  VIT: '/src/assets/images/portrait_vit_warden_1795736369383.jpg',
  CHA: '/src/assets/images/portrait_cha_arbiter_1795736369764.jpg',
  LUK: '/src/assets/images/portrait_luk_wraith_1795736369823.jpg',
};

const SURVIVOR_PROFILES: Array<{ name: string; role: string }> = [
  { name: 'Kaelen Vance', role: 'Pit Scavenger' },
  { name: 'Mireia Soren', role: 'Debt Collector' },
  { name: 'Darius Thorne', role: 'Tide-Breaker' },
  { name: 'Vespera Ash', role: 'Salt Hermit' },
  { name: 'Corvus Hale', role: 'Signal Runner' },
  { name: 'Orlov Krenn', role: 'Oath-Keeper' },
  { name: 'Sable Mercier', role: 'Bilge Surgeon' },
  { name: 'Thane Solis', role: 'Bell Diver' },
  { name: 'Nyx Vermeer', role: 'Cinder Scribe' },
  { name: 'Gideon Rook', role: 'Chain Warden' },
  { name: 'Isolde Marrow', role: 'Grave Broker' },
  { name: 'Bramwell Cross', role: 'Dock Enforcer' },
];

export function shuffleArray<T>(items: T[], randomFn: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildRandomizedDeck(ownerId: 'A' | 'B', randomFn: () => number = Math.random): SkillCard[] {
  const shuffled = shuffleArray(SKILL_DEFINITIONS, randomFn);
  return shuffled.map((def, idx) => ({
    ...def,
    uid: `${ownerId}-${def.id}-${idx}-${Math.floor(randomFn() * 10000)}`,
  }));
}

function randomStatInRange(min: number, max: number, randomFn: () => number): number {
  return Math.floor(randomFn() * (max - min + 1)) + min;
}

export function derivePrimarySecondary(stats: PlayerStats): { primaryType: StatType; secondaryType: StatType } {
  const entries = (Object.entries(stats) as Array<[StatType, number]>).sort((a, b) => b[1] - a[1]);
  return {
    primaryType: entries[0][0],
    secondaryType: entries[1][0],
  };
}

export function createRandomLevel4Character(
  id: 'A' | 'B',
  excludeName?: string,
  randomFn: () => number = Math.random
): PlayerState {
  const candidates = SURVIVOR_PROFILES.filter((p) => p.name !== excludeName);
  const profile = candidates[Math.floor(randomFn() * candidates.length)];

  const stats: PlayerStats = {
    STR: randomStatInRange(7, 19, randomFn),
    AGI: randomStatInRange(6, 19, randomFn),
    WIS: randomStatInRange(5, 18, randomFn),
    VIT: randomStatInRange(13, 20, randomFn),
    CHA: randomStatInRange(5, 17, randomFn),
    LUK: randomStatInRange(6, 19, randomFn),
  };

  const { primaryType, secondaryType } = derivePrimarySecondary(stats);

  // Game starts with 10 cards in the deck; players draw 1 at the start of their turn
  const fullDeck = buildRandomizedDeck(id, randomFn);

  return {
    id,
    name: profile.name,
    role: profile.role,
    level: 4,
    xp: randomStatInRange(1200, 1480, randomFn),
    stats,
    primaryType,
    secondaryType,
    portraitUrl: PORTRAIT_BY_TYPE[primaryType],
    vit: stats.VIT,
    maxVit: stats.VIT,
    deck: fullDeck,
    hand: [],
    graveyard: [],
    drawsUsed: 0,
    bloodPactActive: false,
    guarding: false,
    ironWallActive: false,
    mirrorShieldActive: false,
    skipNextTurn: false,
    cannotFleeNextTurn: false,
  };
}
