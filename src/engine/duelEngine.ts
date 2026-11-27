import {
  ActionType,
  BattleLogEntry,
  PlayerState,
  SkillCard,
  TurnResolution,
  TYPE_COLORS,
} from '../types/duel';

export interface DuelRng {
  d6: () => number;
  d20: () => number;
  rand: () => number;
}

export const defaultRng: DuelRng = {
  d6: () => Math.floor(Math.random() * 6) + 1,
  d20: () => Math.floor(Math.random() * 20) + 1,
  rand: () => Math.random(),
};

function clonePlayer(p: PlayerState): PlayerState {
  return {
    ...p,
    stats: { ...p.stats },
    deck: [...p.deck],
    hand: [...p.hand],
    graveyard: [...p.graveyard],
  };
}

/**
 * Individual Turn Start: draw 1 card from the 10-card deck.
 * If deck is empty, take 2 direct VIT damage (Deck Out penalty).
 */
export function prepareSinglePlayerTurnStart(
  playerA: PlayerState,
  playerB: PlayerState,
  playerId: 'A' | 'B',
  round: number
): {
  nextPlayerA: PlayerState;
  nextPlayerB: PlayerState;
  drawnCard: SkillCard | null;
  deckOutDamage: number;
  logs: BattleLogEntry[];
} {
  const nextA = clonePlayer(playerA);
  const nextB = clonePlayer(playerB);
  const active = playerId === 'A' ? nextA : nextB;
  const logs: BattleLogEntry[] = [];
  let drawnCard: SkillCard | null = null;
  let deckOutDamage = 0;

  if (active.deck.length > 0) {
    drawnCard = active.deck.shift()!;
    active.hand.push(drawnCard);
    active.drawsUsed += 1;
    logs.push({
      id: `r${round}-start-${playerId}-${Math.random().toString(36).slice(2, 7)}`,
      turn: round,
      category: 'SYSTEM',
      message:
        playerId === 'A'
          ? `${active.name} draws "${drawnCard.name}".`
          : `${active.name} draws 1 card.`,
    });
  } else {
    deckOutDamage = 2;
    active.vit = Math.max(0, active.vit - deckOutDamage);
    active.drawsUsed += 1;
    logs.push({
      id: `r${round}-deckout-${playerId}-${Math.random().toString(36).slice(2, 7)}`,
      turn: round,
      category: active.vit === 0 ? 'DEATH' : 'HIT',
      message: `${active.name}'s deck is empty! -2 VIT (Deck Out).`,
    });
  }

  return { nextPlayerA: nextA, nextPlayerB: nextB, drawnCard, deckOutDamage, logs };
}

export function createDeckOutDeathResolution(
  playerA: PlayerState,
  playerB: PlayerState,
  victimId: 'A' | 'B',
  round: number,
  logs: BattleLogEntry[]
): TurnResolution {
  const winner: 'A' | 'B' = victimId === 'A' ? 'B' : 'A';
  return {
    turn: round,
    nextPlayerA: playerA,
    nextPlayerB: playerB,
    logs,
    fx: {
      actionA: 'SKIPPED',
      actionB: 'SKIPPED',
      skillA: null,
      skillB: null,
      playedSkillA: null,
      playedSkillB: null,
      skillCancelledA: false,
      skillCancelledB: false,
      damageToA: victimId === 'A' ? 2 : 0,
      damageToB: victimId === 'B' ? 2 : 0,
      healToA: 0,
      healToB: 0,
      mirroredToA: false,
      mirroredToB: false,
      frozenTarget: null,
      instantKillBy: null,
      fleeAttemptA: { attempted: false, success: false },
      fleeAttemptB: { attempted: false, success: false },
      particleColorA: TYPE_COLORS[playerA.primaryType],
      particleColorB: TYPE_COLORS[playerB.primaryType],
    },
    winner,
    endReason: 'EXHAUSTED',
    fledBy: null,
    xpGained: 105,
  };
}

/**
 * Pure simultaneous clash resolution function (no Mana cost; Skill Cards go to Graveyard).
 */
export function resolveTurn(
  playerA: PlayerState,
  playerB: PlayerState,
  actionA: ActionType,
  actionB: ActionType,
  skillA: SkillCard | null,
  skillB: SkillCard | null,
  turn: number,
  rng: DuelRng = defaultRng
): TurnResolution {
  const nextA = clonePlayer(playerA);
  const nextB = clonePlayer(playerB);
  const logs: BattleLogEntry[] = [];

  const mkLog = (category: BattleLogEntry['category'], message: string) => {
    logs.push({
      id: `r${turn}-${logs.length}-${Math.random().toString(36).slice(2, 7)}`,
      turn,
      category,
      message,
    });
  };

  const effectiveActionA: ActionType = nextA.skipNextTurn ? 'SKIPPED' : actionA;
  const effectiveActionB: ActionType = nextB.skipNextTurn ? 'SKIPPED' : actionB;
  nextA.skipNextTurn = false;
  nextB.skipNextTurn = false;
  nextA.cannotFleeNextTurn = false;
  nextB.cannotFleeNextTurn = false;

  // Validate & consume skills (free — 1 per turn, then sent to Graveyard)
  const playedSkillA: SkillCard | null =
    effectiveActionA !== 'SKIPPED' && skillA ? skillA : null;
  const playedSkillB: SkillCard | null =
    effectiveActionB !== 'SKIPPED' && skillB ? skillB : null;

  let activeSkillA: SkillCard | null = playedSkillA;
  let activeSkillB: SkillCard | null = playedSkillB;

  if (playedSkillA) {
    nextA.hand = nextA.hand.filter((c) => c.uid !== playedSkillA.uid);
    nextA.graveyard.push(playedSkillA);
    mkLog('SKILL', `${nextA.name} activates ${playedSkillA.name}!`);
  }
  if (playedSkillB) {
    nextB.hand = nextB.hand.filter((c) => c.uid !== playedSkillB.uid);
    nextB.graveyard.push(playedSkillB);
    mkLog('SKILL', `${nextB.name} activates ${playedSkillB.name}!`);
  }

  // Chain Break cancels opponent's skill card (still goes to Graveyard)
  let skillCancelledA = false;
  let skillCancelledB = false;
  const aHasChainBreak = activeSkillA?.id === 'chain_break';
  const bHasChainBreak = activeSkillB?.id === 'chain_break';

  if (aHasChainBreak && bHasChainBreak) {
    skillCancelledA = true;
    skillCancelledB = true;
    activeSkillA = null;
    activeSkillB = null;
    mkLog('SKILL', 'Both Chain Breaks snap and cancel each other.');
  } else if (aHasChainBreak && activeSkillB) {
    mkLog('SKILL', `${nextA.name}'s Chain Break cancels ${nextB.name}'s ${activeSkillB.name}!`);
    skillCancelledB = true;
    activeSkillB = null;
  } else if (bHasChainBreak && activeSkillA) {
    mkLog('SKILL', `${nextB.name}'s Chain Break cancels ${nextA.name}'s ${activeSkillA.name}!`);
    skillCancelledA = true;
    activeSkillA = null;
  }

  // Pre-clash skills: Blood Pact, Frozen Time
  if (activeSkillA?.id === 'blood_pact') {
    nextA.vit = Math.max(0, nextA.vit - 2);
    nextA.bloodPactActive = true;
    mkLog('SKILL', `${nextA.name} sacrifices 2 VIT to Blood Pact (+50% ATK).`);
  }
  if (activeSkillB?.id === 'blood_pact') {
    nextB.vit = Math.max(0, nextB.vit - 2);
    nextB.bloodPactActive = true;
    mkLog('SKILL', `${nextB.name} sacrifices 2 VIT to Blood Pact (+50% ATK).`);
  }

  let frozenTarget: 'A' | 'B' | null = null;
  if (activeSkillA?.id === 'frozen_time') {
    nextB.skipNextTurn = true;
    frozenTarget = 'B';
    mkLog('SKILL', `${nextA.name} freezes time — ${nextB.name} skips next clash!`);
  }
  if (activeSkillB?.id === 'frozen_time') {
    nextA.skipNextTurn = true;
    frozenTarget = frozenTarget === 'B' ? null : 'A';
    mkLog('SKILL', `${nextB.name} freezes time — ${nextA.name} skips next clash!`);
  }

  if (effectiveActionA === 'SKIPPED') {
    mkLog('MISS', `${nextA.name} is frozen and cannot act.`);
  }
  if (effectiveActionB === 'SKIPPED') {
    mkLog('MISS', `${nextB.name} is frozen and cannot act.`);
  }

  const computeAttack = (
    attacker: PlayerState,
    defender: PlayerState,
    attackerSkill: SkillCard | null
  ): { rawDamage: number; roll: number; instantKill: boolean } => {
    const roll = rng.d6();
    const isCrimsonSlash = attackerSkill?.id === 'crimson_slash';
    const baseStrDamage = isCrimsonSlash
      ? Math.floor(attacker.stats.STR / 2) * 2
      : Math.floor(attacker.stats.STR / 2);

    let damage = baseStrDamage + roll;

    if (attacker.bloodPactActive) {
      damage = Math.floor(damage * 1.5);
    }

    let instantKill = false;
    if (attackerSkill?.id === 'last_stand') {
      if (attacker.vit < attacker.maxVit * 0.2) {
        damage = Math.max(damage, defender.vit);
        instantKill = true;
      } else {
        mkLog('MISS', `${attacker.name}'s Last Stand misfires (VIT >= 20%).`);
      }
    }

    return { rawDamage: damage, roll, instantKill };
  };

  let damageToA = 0;
  let damageToB = 0;
  let healToA = 0;
  let healToB = 0;
  let mirroredToA = false;
  let mirroredToB = false;
  let instantKillBy: 'A' | 'B' | null = null;
  let fledBy: 'A' | 'B' | null = null;

  const fleeAttemptA: TurnResolution['fx']['fleeAttemptA'] = { attempted: false, success: false };
  const fleeAttemptB: TurnResolution['fx']['fleeAttemptB'] = { attempted: false, success: false };

  const atkA =
    effectiveActionA === 'ATTACK' ? computeAttack(nextA, nextB, activeSkillA) : null;
  const atkB =
    effectiveActionB === 'ATTACK' ? computeAttack(nextB, nextA, activeSkillB) : null;

  if (effectiveActionA === 'ATTACK' && nextA.bloodPactActive) {
    nextA.bloodPactActive = false;
  }
  if (effectiveActionB === 'ATTACK' && nextB.bloodPactActive) {
    nextB.bloodPactActive = false;
  }

  if (effectiveActionA === 'GUARD' && effectiveActionB === 'GUARD') {
    mkLog('MISS', 'Both hold GUARD. Stalemate — no damage.');
  } else if (effectiveActionA === 'FLEE' && effectiveActionB === 'FLEE') {
    fleeAttemptA.attempted = true;
    fleeAttemptB.attempted = true;
    if (nextA.stats.AGI > nextB.stats.AGI || (nextA.stats.AGI === nextB.stats.AGI && nextA.stats.LUK >= nextB.stats.LUK)) {
      fleeAttemptA.success = true;
      fledBy = 'A';
      mkLog('MISS', `${nextA.name} outruns ${nextB.name} and escapes!`);
    } else {
      fleeAttemptB.success = true;
      fledBy = 'B';
      mkLog('MISS', `${nextB.name} outruns ${nextA.name} and escapes!`);
    }
  } else {
    if (effectiveActionA === 'ATTACK' && atkA) {
      if (atkA.instantKill) instantKillBy = 'A';

      if (activeSkillB?.id === 'mirror_shield') {
        mirroredToA = true;
        damageToA += atkA.rawDamage;
        mkLog('SKILL', `${nextB.name}'s Mirror Shield reflects ${atkA.rawDamage} DMG back!`);
      } else if (effectiveActionB === 'GUARD') {
        const blockedAll = activeSkillB?.id === 'iron_wall';
        const finalDmg = blockedAll ? 0 : Math.floor(atkA.rawDamage / 2);
        damageToB += finalDmg;
        if (blockedAll) {
          mkLog('MISS', `${nextB.name}'s Iron Wall blocks 100% of ${nextA.name}'s attack!`);
        } else {
          mkLog('HIT', `${nextA.name} attacks into GUARD for ${finalDmg} DMG!`);
        }
      } else if (effectiveActionB === 'FLEE') {
        fleeAttemptB.attempted = true;
        const roll = rng.d20();
        const total = nextB.stats.AGI + roll;
        fleeAttemptB.roll = roll;
        fleeAttemptB.total = total;
        const success = activeSkillB?.id === 'phantom_step' || total >= 15;
        fleeAttemptB.success = success;
        if (success) {
          const finalDmg = Math.floor(atkA.rawDamage / 2);
          damageToB += finalDmg;
          fledBy = 'B';
          mkLog('HIT', `${nextB.name} escapes, taking ${finalDmg} grazing DMG!`);
        } else {
          damageToB += atkA.rawDamage;
          nextB.cannotFleeNextTurn = true;
          mkLog('HIT', `${nextB.name}'s flee fails! ${nextA.name} hits for ${atkA.rawDamage} DMG!`);
        }
      } else {
        damageToB += atkA.rawDamage;
        mkLog('HIT', `${nextA.name} attacks for ${atkA.rawDamage} DMG!`);
      }

      if (activeSkillA?.id === 'soul_drain' && !mirroredToA && damageToB > 0) {
        const heal = Math.floor(damageToB / 2);
        if (heal > 0) {
          healToA += heal;
          mkLog('SKILL', `${nextA.name}'s Soul Drain heals +${heal} VIT!`);
        }
      }
    }

    if (effectiveActionB === 'ATTACK' && atkB) {
      if (atkB.instantKill) instantKillBy = 'B';

      if (activeSkillA?.id === 'mirror_shield') {
        mirroredToB = true;
        damageToB += atkB.rawDamage;
        mkLog('SKILL', `${nextA.name}'s Mirror Shield reflects ${atkB.rawDamage} DMG back!`);
      } else if (effectiveActionA === 'GUARD') {
        const blockedAll = activeSkillA?.id === 'iron_wall';
        const finalDmg = blockedAll ? 0 : Math.floor(atkB.rawDamage / 2);
        damageToA += finalDmg;
        if (blockedAll) {
          mkLog('MISS', `${nextA.name}'s Iron Wall blocks 100% of ${nextB.name}'s attack!`);
        } else {
          mkLog('HIT', `${nextB.name} attacks into GUARD for ${finalDmg} DMG!`);
        }
      } else if (effectiveActionA === 'FLEE') {
        fleeAttemptA.attempted = true;
        const roll = rng.d20();
        const total = nextA.stats.AGI + roll;
        fleeAttemptA.roll = roll;
        fleeAttemptA.total = total;
        const success = activeSkillA?.id === 'phantom_step' || total >= 15;
        fleeAttemptA.success = success;
        if (success) {
          const finalDmg = Math.floor(atkB.rawDamage / 2);
          damageToA += finalDmg;
          fledBy = 'A';
          mkLog('HIT', `${nextA.name} escapes, taking ${finalDmg} grazing DMG!`);
        } else {
          damageToA += atkB.rawDamage;
          nextA.cannotFleeNextTurn = true;
          mkLog('HIT', `${nextA.name}'s flee fails! ${nextB.name} hits for ${atkB.rawDamage} DMG!`);
        }
      } else {
        damageToA += atkB.rawDamage;
        mkLog('HIT', `${nextB.name} attacks for ${atkB.rawDamage} DMG!`);
      }

      if (activeSkillB?.id === 'soul_drain' && !mirroredToB && damageToA > 0) {
        const heal = Math.floor(damageToA / 2);
        if (heal > 0) {
          healToB += heal;
          mkLog('SKILL', `${nextB.name}'s Soul Drain heals +${heal} VIT!`);
        }
      }
    }

    if (effectiveActionA === 'FLEE' && effectiveActionB !== 'ATTACK') {
      fleeAttemptA.attempted = true;
      const roll = rng.d20();
      const total = nextA.stats.AGI + roll;
      fleeAttemptA.roll = roll;
      fleeAttemptA.total = total;
      const success = activeSkillA?.id === 'phantom_step' || effectiveActionB === 'SKIPPED' || total >= 15;
      fleeAttemptA.success = success;
      if (success) {
        fledBy = 'A';
        mkLog('MISS', `${nextA.name} slips out of the arena!`);
      } else {
        nextA.cannotFleeNextTurn = true;
        mkLog('MISS', `${nextA.name} fails to escape (${total} < 15)!`);
      }
    }

    if (effectiveActionB === 'FLEE' && effectiveActionA !== 'ATTACK') {
      fleeAttemptB.attempted = true;
      const roll = rng.d20();
      const total = nextB.stats.AGI + roll;
      fleeAttemptB.roll = roll;
      fleeAttemptB.total = total;
      const success = activeSkillB?.id === 'phantom_step' || effectiveActionA === 'SKIPPED' || total >= 15;
      fleeAttemptB.success = success;
      if (success) {
        fledBy = 'B';
        mkLog('MISS', `${nextB.name} slips out of the arena!`);
      } else {
        nextB.cannotFleeNextTurn = true;
        mkLog('MISS', `${nextB.name} fails to escape (${total} < 15)!`);
      }
    }
  }

  nextA.vit = Math.max(0, nextA.vit - damageToA);
  nextB.vit = Math.max(0, nextB.vit - damageToB);

  if (nextA.vit > 0 && healToA > 0) {
    nextA.vit = Math.min(nextA.maxVit, nextA.vit + healToA);
  }
  if (nextB.vit > 0 && healToB > 0) {
    nextB.vit = Math.min(nextB.maxVit, nextB.vit + healToB);
  }

  let winner: TurnResolution['winner'] = null;
  let endReason: TurnResolution['endReason'] = null;
  let xpGained = 0;

  if (nextA.vit === 0 && nextB.vit === 0) {
    if (nextA.stats.LUK > nextB.stats.LUK) {
      nextA.vit = 1;
      winner = 'A';
      endReason = 'KILL';
      xpGained = 140;
      mkLog('DEATH', `Double lethal blow! ${nextA.name} survives at 1 VIT by LUK!`);
    } else if (nextB.stats.LUK > nextA.stats.LUK) {
      nextB.vit = 1;
      winner = 'B';
      endReason = 'KILL';
      xpGained = 140;
      mkLog('DEATH', `Double lethal blow! ${nextB.name} survives at 1 VIT by LUK!`);
    } else {
      winner = 'DRAW';
      endReason = 'DRAW';
      xpGained = 45;
      mkLog('DEATH', 'Both vessels shatter simultaneously.');
    }
  } else if (nextA.vit === 0) {
    winner = 'B';
    endReason = 'KILL';
    xpGained = 120;
    mkLog('DEATH', `${nextA.name} falls! Killed by ${nextB.name}.`);
  } else if (nextB.vit === 0) {
    winner = 'A';
    endReason = 'KILL';
    xpGained = 120;
    mkLog('DEATH', `${nextB.name} falls! Killed by ${nextA.name}.`);
  } else if (fledBy !== null) {
    winner = fledBy === 'A' ? 'B' : 'A';
    endReason = 'FLEE';
    xpGained = 65;
  } else {
    mkLog('SYSTEM', `ROUND ${turn} RESOLVED`);
  }

  return {
    turn,
    nextPlayerA: nextA,
    nextPlayerB: nextB,
    logs,
    fx: {
      actionA: effectiveActionA,
      actionB: effectiveActionB,
      skillA: activeSkillA,
      skillB: activeSkillB,
      playedSkillA,
      playedSkillB,
      skillCancelledA,
      skillCancelledB,
      damageToA,
      damageToB,
      healToA,
      healToB,
      mirroredToA,
      mirroredToB,
      frozenTarget,
      instantKillBy,
      fleeAttemptA,
      fleeAttemptB,
      particleColorA: TYPE_COLORS[nextA.primaryType],
      particleColorB: TYPE_COLORS[nextB.primaryType],
    },
    winner,
    endReason,
    fledBy,
    xpGained,
  };
}

/**
 * Secret AI move selector during Opponent's Turn (free skill cards, 1 per turn).
 */
export function chooseOpponentMove(
  opponent: PlayerState,
  player: PlayerState,
  randomFn: () => number = Math.random
): { action: ActionType; skill: SkillCard | null } {
  if (opponent.skipNextTurn) {
    return { action: 'SKIPPED', skill: null };
  }

  const availableSkills = opponent.hand;
  let chosenSkill: SkillCard | null = null;
  let action: ActionType = 'ATTACK';

  if (
    opponent.vit < opponent.maxVit * 0.2 &&
    availableSkills.some((c) => c.id === 'last_stand')
  ) {
    return {
      action: 'ATTACK',
      skill: availableSkills.find((c) => c.id === 'last_stand') || null,
    };
  }

  const roll = randomFn();
  if (opponent.vit <= Math.ceil(opponent.maxVit * 0.25) && !opponent.cannotFleeNextTurn && roll < 0.35) {
    const phantom = availableSkills.find((c) => c.id === 'phantom_step');
    if (phantom) {
      return { action: 'FLEE', skill: phantom };
    }
  }

  if (roll < 0.65) {
    action = 'ATTACK';
  } else if (roll < 0.92) {
    action = 'GUARD';
  } else if (!opponent.cannotFleeNextTurn && opponent.vit < opponent.maxVit * 0.42) {
    action = 'FLEE';
  } else {
    action = 'ATTACK';
  }

  if (availableSkills.length > 0 && randomFn() < 0.65) {
    const matching = availableSkills.filter((c) => {
      if (c.id === 'last_stand') return opponent.vit < opponent.maxVit * 0.2;
      if (c.id === 'blood_pact') return opponent.vit > 5 && action === 'ATTACK';
      if (c.id === 'chain_break') return player.hand.length > 0;
      return c.preferredAction === action || c.preferredAction === 'ANY';
    });

    if (matching.length > 0) {
      chosenSkill = matching[Math.floor(randomFn() * matching.length)];
    }
  }

  return { action, skill: chosenSkill };
}
