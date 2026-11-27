export type StatType = 'STR' | 'AGI' | 'WIS' | 'VIT' | 'CHA' | 'LUK';

export interface PlayerStats {
  STR: number;
  AGI: number;
  WIS: number;
  VIT: number;
  CHA: number;
  LUK: number;
}

export type SkillId =
  | 'crimson_slash'
  | 'iron_wall'
  | 'phantom_step'
  | 'void_gaze'
  | 'blood_pact'
  | 'frozen_time'
  | 'mirror_shield'
  | 'chain_break'
  | 'soul_drain'
  | 'last_stand';

export interface SkillCard {
  id: SkillId;
  uid: string;
  name: string;
  effect: string;
  visualDescription: string;
  preferredAction?: 'ATTACK' | 'GUARD' | 'FLEE' | 'ANY';
}

export interface GraveyardEntry {
  id: string;
  card: SkillCard;
  owner: 'A' | 'B';
  ownerName: string;
  round: number;
  cancelled: boolean;
}

export type ActionType = 'ATTACK' | 'GUARD' | 'FLEE' | 'SKIPPED';

export type LogCategory = 'HIT' | 'MISS' | 'SKILL' | 'DEATH' | 'SYSTEM';

export interface BattleLogEntry {
  id: string;
  turn: number;
  category: LogCategory;
  message: string;
}

export interface PlayerState {
  id: 'A' | 'B';
  name: string;
  role: string;
  level: number;
  xp: number;
  stats: PlayerStats;
  primaryType: StatType;
  secondaryType: StatType;
  portraitUrl: string;
  vit: number;
  maxVit: number;
  deck: SkillCard[];
  hand: SkillCard[];
  graveyard: SkillCard[];
  drawsUsed: number;
  bloodPactActive: boolean;
  guarding: boolean;
  ironWallActive: boolean;
  mirrorShieldActive: boolean;
  skipNextTurn: boolean;
  cannotFleeNextTurn: boolean;
}

export type RoundPhase = 'PLAYER_TURN' | 'OPPONENT_TURN' | 'CLASH';

export interface TurnFxEvents {
  actionA: ActionType;
  actionB: ActionType;
  skillA: SkillCard | null;
  skillB: SkillCard | null;
  playedSkillA: SkillCard | null;
  playedSkillB: SkillCard | null;
  skillCancelledA: boolean;
  skillCancelledB: boolean;
  damageToA: number;
  damageToB: number;
  healToA: number;
  healToB: number;
  mirroredToA: boolean;
  mirroredToB: boolean;
  frozenTarget: 'A' | 'B' | null;
  instantKillBy: 'A' | 'B' | null;
  fleeAttemptA: { attempted: boolean; success: boolean; roll?: number; total?: number };
  fleeAttemptB: { attempted: boolean; success: boolean; roll?: number; total?: number };
  particleColorA: string;
  particleColorB: string;
}

export interface TurnResolution {
  turn: number;
  nextPlayerA: PlayerState;
  nextPlayerB: PlayerState;
  logs: BattleLogEntry[];
  fx: TurnFxEvents;
  winner: 'A' | 'B' | 'DRAW' | null;
  endReason: 'KILL' | 'FLEE' | 'EXHAUSTED' | 'DRAW' | null;
  fledBy: 'A' | 'B' | null;
  xpGained: number;
}

export type AnimationPhase =
  | 'IDLE'
  | 'SKILL_ACTIVATE'
  | 'LUNGE'
  | 'IMPACT'
  | 'RECOIL'
  | 'DRAIN'
  | 'DEATH_SHATTER'
  | 'RESULT';

export const TYPE_COLORS: Record<StatType, string> = {
  STR: '#C41E3A',
  AGI: '#00CED1',
  WIS: '#8A2BE2',
  VIT: '#50C878',
  CHA: '#FFBF00',
  LUK: '#C0C0C0',
};

export const TYPE_LABELS: Record<StatType, string> = {
  STR: 'Strength',
  AGI: 'Agility',
  WIS: 'Wisdom',
  VIT: 'Vitality',
  CHA: 'Charisma',
  LUK: 'Luck',
};
