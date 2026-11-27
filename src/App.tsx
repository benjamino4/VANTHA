import { SkillIcon } from './components/SkillIcon';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Flag,
  Footprints,
  Lock,
  RotateCcw,
  Shield,
  Snowflake,
  Swords,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CardBack } from './components/CardBack';
import { CardEmote, CharacterCard } from './components/CharacterCard';
import {
  FloatingBattleFeed,
  FloatingMessage,
  pickDisplayLogs,
} from './components/FloatingBattleFeed';
import { GlowingAsh } from './components/GlowingAsh';
import { GraveyardFilter, GraveyardModal } from './components/GraveyardModal';
import { OpponentHand } from './components/OpponentHand';
import { BurstTrigger, ParticleCanvas } from './components/ParticleCanvas';
import { ResultScreen } from './components/ResultScreen';
import { SkillHand } from './components/SkillHand';
import { DeckPileZone, GraveyardPileZone } from './components/TablePileZone';
import { createRandomLevel4Character } from './engine/cards';
import {
  chooseOpponentMove,
  createDeckOutDeathResolution,
  prepareSinglePlayerTurnStart,
  resolveTurn,
} from './engine/duelEngine';
import { soundFx } from './engine/soundFx';
import {
  ActionType,
  AnimationPhase,
  BattleLogEntry,
  GraveyardEntry,
  PlayerState,
  RoundPhase,
  SkillCard,
  TurnResolution,
  TYPE_COLORS,
} from './types/duel';

interface DuelSession {
  round: number;
  roundPhase: RoundPhase;
  playerA: PlayerState;
  playerB: PlayerState;
  logs: BattleLogEntry[];
}

interface FlyingGraveCard {
  id: string;
  card: SkillCard;
  owner: 'A' | 'B';
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  deltaX: number;
  deltaY: number;
}

interface FlyingDrawCard {
  id: string;
  card: SkillCard;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
}

const EMOTES: Array<{ emoji: string; text: string }> = [
  { emoji: '😂', text: 'Is that all?' },
  { emoji: '🩸', text: 'Bleed for me.' },
  { emoji: '⏳', text: 'Too slow.' },
  { emoji: '😐', text: '...' },
];

function createInitialSession(): { session: DuelSession; drawnCard: SkillCard | null } {
  const rawA = createRandomLevel4Character('A');
  const rawB = createRandomLevel4Character('B', rawA.name);
  const startA = prepareSinglePlayerTurnStart(rawA, rawB, 'A', 1);

  return {
    session: {
      round: 1,
      roundPhase: 'PLAYER_TURN',
      playerA: startA.nextPlayerA,
      playerB: startA.nextPlayerB,
      logs: startA.logs,
    },
    drawnCard: startA.drawnCard,
  };
}

export default function App() {
  const [initialBundle] = useState(() => createInitialSession());
  const [session, setSession] = useState<DuelSession>(initialBundle.session);
  const [animPhase, setAnimPhase] = useState<AnimationPhase>('IDLE');

  // Player Turn staging
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [fieldSkill, setFieldSkill] = useState<SkillCard | null>(null);

  // Secret locked choices (hidden once locked in until simultaneous CLASH reveal)
  const [lockedPlayerMove, setLockedPlayerMove] = useState<{
    action: ActionType;
    skill: SkillCard | null;
  } | null>(null);
  const [lockedOpponentMove, setLockedOpponentMove] = useState<{
    action: ActionType;
    skill: SkillCard | null;
  } | null>(null);

  const [activeResolution, setActiveResolution] = useState<TurnResolution | null>(null);
  const [finalResult, setFinalResult] = useState<TurnResolution | null>(null);
  const [surrendered, setSurrendered] = useState(false);
  const [ashActive, setAshActive] = useState(false);
  const [screenShakeKey, setScreenShakeKey] = useState(0);
  const [isScreenShaking, setIsScreenShaking] = useState(false);
  const [floatingMessages, setFloatingMessages] = useState<FloatingMessage[]>([]);
  const [playerEmote, setPlayerEmote] = useState<CardEmote | null>(null);
  const [opponentEmote, setOpponentEmote] = useState<CardEmote | null>(null);
  const [burst, setBurst] = useState<BurstTrigger | null>(null);
  const [muted, setMuted] = useState(false);
  const [isDraggingSkill, setIsDraggingSkill] = useState(false);
  const [isDrawingPhase, setIsDrawingPhase] = useState(false);
  const [flyingDrawCard, setFlyingDrawCard] = useState<FlyingDrawCard | null>(null);

  // Deck Out floating damage indicators
  const [deckOutDamageA, setDeckOutDamageA] = useState(0);
  const [deckOutDamageB, setDeckOutDamageB] = useState(0);

  // Graveyard state + flying card FX
  const [graveyardEntries, setGraveyardEntries] = useState<GraveyardEntry[]>([]);
  const [graveyardOpen, setGraveyardOpen] = useState(false);
  const [graveyardFilter, setGraveyardFilter] = useState<GraveyardFilter>('ALL');
  const [graveyardPulseA, setGraveyardPulseA] = useState(false);
  const [graveyardPulseB, setGraveyardPulseB] = useState(false);
  const [flyingGraveCards, setFlyingGraveCards] = useState<FlyingGraveCard[]>([]);
  const [skillsClearedToGrave, setSkillsClearedToGrave] = useState(false);

  const timersRef = useRef<number[]>([]);
  const playerSkillZoneRef = useRef<HTMLDivElement | null>(null);
  const opponentSkillZoneRef = useRef<HTMLDivElement | null>(null);
  const playerDeckRef = useRef<HTMLDivElement | null>(null);
  const playerGraveyardRef = useRef<HTMLButtonElement | null>(null);
  const opponentGraveyardRef = useRef<HTMLButtonElement | null>(null);
  const handContainerRef = useRef<HTMLDivElement | null>(null);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const scheduleStep = useCallback((fn: () => void, delayMs: number) => {
    const id = window.setTimeout(fn, delayMs);
    timersRef.current.push(id);
  }, []);

  const showFloatingLogs = useCallback(
    (newEntries: BattleLogEntry[]) => {
      const picked = pickDisplayLogs(newEntries);
      if (picked.length === 0) return;
      setFloatingMessages(picked);
      const ids = new Set(picked.map((p) => p.id));
      scheduleStep(() => {
        setFloatingMessages((prev) => prev.filter((m) => !ids.has(m.id)));
      }, 2400);
    },
    [scheduleStep]
  );

  const triggerPlayerEmote = (emoji: string, text: string) => {
    const emoteId = Date.now();
    setPlayerEmote({ id: emoteId, emoji, text });
    scheduleStep(() => {
      setPlayerEmote((curr) => (curr?.id === emoteId ? null : curr));
    }, 3000);
  };

  const triggerOpponentEmote = useCallback(
    (emoji: string, text: string) => {
      const emoteId = Date.now() + Math.floor(Math.random() * 1000);
      setOpponentEmote({ id: emoteId, emoji, text });
      scheduleStep(() => {
        setOpponentEmote((curr) => (curr?.id === emoteId ? null : curr));
      }, 3000);
    },
    [scheduleStep]
  );

  // AI drops an impatience emote if human player idles >= 12 seconds on their turn
  useEffect(() => {
    if (session.roundPhase !== 'PLAYER_TURN' || animPhase !== 'IDLE' || finalResult) return;
    const idleTimer = window.setTimeout(() => {
      const pick = Math.random() < 0.65 ? EMOTES[2] : EMOTES[3];
      triggerOpponentEmote(pick.emoji, pick.text);
    }, 12000);
    return () => window.clearTimeout(idleTimer);
  }, [session.roundPhase, session.round, animPhase, finalResult, triggerOpponentEmote]);

  // Draw Animation: card flips from Player's Deck on bottom-right of 3D playmat, arcs up, and joins Player's hand at bottom
  const triggerDrawPhaseFx = useCallback(
    (drawnCard: SkillCard | null) => {
      if (!drawnCard) return;
      setIsDrawingPhase(true);
      soundFx.playCardDraw();

      window.requestAnimationFrame(() => {
        const deckRect = playerDeckRef.current?.getBoundingClientRect();
        const handRect = handContainerRef.current?.getBoundingClientRect();

        if (deckRect && handRect) {
          const cardW = 104;
          const cardH = 106;
          const startX = deckRect.left + deckRect.width / 2 - cardW / 2;
          const startY = deckRect.top + deckRect.height / 2 - cardH / 2;
          const dstX = handRect.left + handRect.width / 2 - cardW / 2;
          const dstY = handRect.top + handRect.height / 2 - cardH / 2;

          setFlyingDrawCard({
            id: `draw-${drawnCard.uid}-${Date.now()}`,
            card: drawnCard,
            startX,
            startY,
            deltaX: dstX - startX,
            deltaY: dstY - startY,
          });
        }
      });

      scheduleStep(() => {
        setIsDrawingPhase(false);
        setFlyingDrawCard(null);
      }, 920);
    },
    [scheduleStep]
  );

  const triggerDeckOutFx = useCallback(
    (victimId: 'A' | 'B', damage: number, logs: BattleLogEntry[]) => {
      if (damage <= 0) return;
      if (victimId === 'A') {
        setDeckOutDamageA(damage);
        scheduleStep(() => setDeckOutDamageA(0), 900);
      } else {
        setDeckOutDamageB(damage);
        scheduleStep(() => setDeckOutDamageB(0), 900);
      }
      setIsScreenShaking(true);
      setScreenShakeKey((k) => k + 1);
      scheduleStep(() => setIsScreenShaking(false), 380);
      soundFx.playImpact(false);
      showFloatingLogs(logs);
    },
    [scheduleStep, showFloatingLogs]
  );

  // Graveyard Animation: played skill card flies from its Skill Zone into its respective Graveyard slot on the 3D playmat and fades out
  const launchSkillsToGraveyard = useCallback(
    (resolution: TurnResolution) => {
      const { playedSkillA, playedSkillB, skillCancelledA, skillCancelledB } = resolution.fx;
      const toSend: Array<{
        card: SkillCard;
        owner: 'A' | 'B';
        ownerName: string;
        cancelled: boolean;
        zoneEl: HTMLDivElement | null;
        graveEl: HTMLButtonElement | null;
      }> = [];

      if (playedSkillA) {
        toSend.push({
          card: playedSkillA,
          owner: 'A',
          ownerName: resolution.nextPlayerA.name,
          cancelled: skillCancelledA,
          zoneEl: playerSkillZoneRef.current,
          graveEl: playerGraveyardRef.current,
        });
      }
      if (playedSkillB) {
        toSend.push({
          card: playedSkillB,
          owner: 'B',
          ownerName: resolution.nextPlayerB.name,
          cancelled: skillCancelledB,
          zoneEl: opponentSkillZoneRef.current,
          graveEl: opponentGraveyardRef.current,
        });
      }

      if (toSend.length === 0) return;

      setSkillsClearedToGrave(true);

      const flights: FlyingGraveCard[] = [];
      const newEntries: GraveyardEntry[] = [];
      let sentA = false;
      let sentB = false;

      toSend.forEach((item, idx) => {
        if (item.owner === 'A') sentA = true;
        else sentB = true;

        newEntries.push({
          id: `grave-${resolution.turn}-${item.owner}-${item.card.uid}`,
          card: item.card,
          owner: item.owner,
          ownerName: item.ownerName,
          round: resolution.turn,
          cancelled: item.cancelled,
        });

        const srcRect = item.zoneEl?.getBoundingClientRect();
        const dstRect = item.graveEl?.getBoundingClientRect();
        if (srcRect && dstRect) {
          const srcCx = srcRect.left + srcRect.width / 2;
          const srcCy = srcRect.top + srcRect.height / 2;
          const dstCx = dstRect.left + dstRect.width / 2;
          const dstCy = dstRect.top + dstRect.height / 2;

          flights.push({
            id: `fly-${resolution.turn}-${item.owner}-${idx}-${Date.now()}`,
            card: item.card,
            owner: item.owner,
            startX: srcRect.left,
            startY: srcRect.top,
            startW: srcRect.width,
            startH: srcRect.height,
            deltaX: dstCx - srcCx,
            deltaY: dstCy - srcCy,
          });
        }
      });

      const triggerPulses = () => {
        if (sentA) {
          setGraveyardPulseA(true);
          scheduleStep(() => setGraveyardPulseA(false), 380);
        }
        if (sentB) {
          setGraveyardPulseB(true);
          scheduleStep(() => setGraveyardPulseB(false), 380);
        }
      };

      if (flights.length > 0) {
        setFlyingGraveCards(flights);
        scheduleStep(() => {
          setFlyingGraveCards([]);
          setGraveyardEntries((prev) => [...prev, ...newEntries]);
          triggerPulses();
        }, 460);
      } else {
        setGraveyardEntries((prev) => [...prev, ...newEntries]);
        triggerPulses();
      }
    },
    [scheduleStep]
  );

  useEffect(() => {
    triggerDrawPhaseFx(initialBundle.drawnCard);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewDuel = useCallback(() => {
    clearAllTimers();
    const fresh = createInitialSession();
    setAnimPhase('IDLE');
    setSelectedAction(null);
    setFieldSkill(null);
    setLockedPlayerMove(null);
    setLockedOpponentMove(null);
    setActiveResolution(null);
    setFinalResult(null);
    setSurrendered(false);
    setAshActive(false);
    setIsScreenShaking(false);
    setFloatingMessages([]);
    setPlayerEmote(null);
    setOpponentEmote(null);
    setBurst(null);
    setIsDraggingSkill(false);
    setFlyingDrawCard(null);
    setDeckOutDamageA(0);
    setDeckOutDamageB(0);
    setGraveyardEntries([]);
    setGraveyardOpen(false);
    setGraveyardPulseA(false);
    setGraveyardPulseB(false);
    setFlyingGraveCards([]);
    setSkillsClearedToGrave(false);
    setSession(fresh.session);
    triggerDrawPhaseFx(fresh.drawnCard);
  }, [clearAllTimers, triggerDrawPhaseFx]);

  const handleToggleMute = () => {
    const next = !muted;
    soundFx.muted = next;
    setMuted(next);
  };

  const handlePlaySkillToField = (card: SkillCard) => {
    if (session.roundPhase !== 'PLAYER_TURN' || animPhase !== 'IDLE' || finalResult) return;
    if (fieldSkill) return;
    soundFx.playSkillCast();
    setFieldSkill(card);
  };

  const handleRemoveFieldSkill = () => {
    if (session.roundPhase !== 'PLAYER_TURN' || animPhase !== 'IDLE' || finalResult) return;
    setFieldSkill(null);
  };

  const openGraveyard = (filter: GraveyardFilter) => {
    setGraveyardFilter(filter);
    setGraveyardOpen(true);
  };

  // Phase 3: Simultaneous Clash execution
  const runSimultaneousClash = useCallback(
    (
      playerAState: PlayerState,
      playerBState: PlayerState,
      playerMove: { action: ActionType; skill: SkillCard | null },
      oppMove: { action: ActionType; skill: SkillCard | null },
      currentRound: number,
      logsSoFar: BattleLogEntry[]
    ) => {
      const resolution = resolveTurn(
        playerAState,
        playerBState,
        playerMove.action,
        oppMove.action,
        playerMove.skill,
        oppMove.skill,
        currentRound
      );

      setSkillsClearedToGrave(false);
      setSession((prev) => ({
        ...prev,
        roundPhase: 'CLASH',
        playerA: playerAState,
        playerB: playerBState,
        logs: logsSoFar,
      }));
      setActiveResolution(resolution);

      const hasSkills = Boolean(resolution.fx.playedSkillA || resolution.fx.playedSkillB);
      let t = 0;

      // 1. Skill cards reveal & activate in their Zones
      if (hasSkills) {
        setAnimPhase('SKILL_ACTIVATE');
        soundFx.playSkillCast();
        t += 650;
      }

      // 2. Both character cards lunge toward center simultaneously
      scheduleStep(() => {
        setAnimPhase('LUNGE');
      }, t);
      t += 280;

      // 3. Simultaneous Impact: White flash, Screen shake, Particle burst, Floating logs ("ROUND X RESOLVED")
      scheduleStep(() => {
        setAnimPhase('IMPACT');
        const totalDmg = resolution.fx.damageToA + resolution.fx.damageToB;

        if (
          totalDmg > 0 ||
          resolution.fx.actionA === 'ATTACK' ||
          resolution.fx.actionB === 'ATTACK'
        ) {
          setIsScreenShaking(true);
          setScreenShakeKey((k) => k + 1);
          scheduleStep(() => setIsScreenShaking(false), 380);
        }

        if (totalDmg > 0) {
          soundFx.playImpact(totalDmg >= 10);
        } else {
          soundFx.playGuardClang();
        }

        showFloatingLogs(resolution.logs);

        setBurst({
          id: Date.now(),
          colorA: resolution.fx.particleColorA,
          colorB: resolution.fx.particleColorB,
          intensity: Math.max(5, totalDmg),
        });

        if (resolution.fx.damageToA >= 8 && Math.random() < 0.75) {
          const pool = [EMOTES[0], EMOTES[1]];
          const chosen = pool[Math.floor(Math.random() * pool.length)];
          triggerOpponentEmote(chosen.emoji, chosen.text);
        }
      }, t);
      t += 340;

      // 4. Cards recoil back
      scheduleStep(() => {
        setAnimPhase('RECOIL');
      }, t);
      t += 260;

      // 5. VIT bars drain & played skill cards fly from Skill Zones into Graveyard slots on playmat
      const updatedLogs = [...logsSoFar, ...resolution.logs];
      scheduleStep(() => {
        setAnimPhase('DRAIN');
        setSession((prev) => ({
          ...prev,
          playerA: resolution.nextPlayerA,
          playerB: resolution.nextPlayerB,
          logs: updatedLogs,
        }));
        launchSkillsToGraveyard(resolution);
      }, t);
      t += hasSkills ? 520 : 280;

      // 6. Check win/death or start Next Round ('YOUR TURN')
      scheduleStep(() => {
        if (resolution.winner !== null) {
          const someoneDied =
            resolution.nextPlayerA.vit === 0 ||
            resolution.nextPlayerB.vit === 0 ||
            resolution.endReason === 'KILL';

          if (someoneDied) {
            setAnimPhase('DEATH_SHATTER');
            setAshActive(true);
            soundFx.playDeathShatter();
            scheduleStep(() => {
              setAnimPhase('RESULT');
              setFinalResult(resolution);
            }, 1500);
          } else {
            setAnimPhase('RESULT');
            setFinalResult(resolution);
          }
          return;
        }

        // Next Round: reset board and start YOUR TURN (Player draws 1 or suffers -2 VIT Deck Out)
        const nextRound = currentRound + 1;
        const nextStartA = prepareSinglePlayerTurnStart(
          resolution.nextPlayerA,
          resolution.nextPlayerB,
          'A',
          nextRound
        );
        const nextLogs = [...updatedLogs, ...nextStartA.logs];

        setLockedPlayerMove(null);
        setLockedOpponentMove(null);
        setActiveResolution(null);
        setFieldSkill(null);
        setSkillsClearedToGrave(false);
        setSelectedAction(nextStartA.nextPlayerA.skipNextTurn ? 'SKIPPED' : null);

        setSession({
          round: nextRound,
          roundPhase: 'PLAYER_TURN',
          playerA: nextStartA.nextPlayerA,
          playerB: nextStartA.nextPlayerB,
          logs: nextLogs,
        });

        if (nextStartA.deckOutDamage > 0) {
          triggerDeckOutFx('A', nextStartA.deckOutDamage, nextStartA.logs);
          if (nextStartA.nextPlayerA.vit === 0) {
            const deckOutLoss = createDeckOutDeathResolution(
              nextStartA.nextPlayerA,
              nextStartA.nextPlayerB,
              'A',
              nextRound,
              nextLogs
            );
            setActiveResolution(deckOutLoss);
            setAnimPhase('DEATH_SHATTER');
            setAshActive(true);
            soundFx.playDeathShatter();
            scheduleStep(() => {
              setAnimPhase('RESULT');
              setFinalResult(deckOutLoss);
            }, 1500);
            return;
          }
        } else {
          triggerDrawPhaseFx(nextStartA.drawnCard);
        }

        setAnimPhase('IDLE');
      }, t);
    },
    [
      launchSkillsToGraveyard,
      scheduleStep,
      showFloatingLogs,
      triggerDeckOutFx,
      triggerDrawPhaseFx,
      triggerOpponentEmote,
    ]
  );

  // Phase 1 -> Phase 2: Player clicks LOCK IN
  const handleLockIn = () => {
    if (session.roundPhase !== 'PLAYER_TURN' || animPhase !== 'IDLE' || finalResult) return;

    const chosenAction: ActionType = session.playerA.skipNextTurn
      ? 'SKIPPED'
      : selectedAction ?? 'GUARD';

    if (!session.playerA.skipNextTurn && !selectedAction) return;

    const playerMove = { action: chosenAction, skill: fieldSkill };

    setLockedPlayerMove(playerMove);
    setSelectedAction(null);
    setFieldSkill(null);

    const startB = prepareSinglePlayerTurnStart(
      session.playerA,
      session.playerB,
      'B',
      session.round
    );
    const logsWithB = [...session.logs, ...startB.logs];

    setSession({
      round: session.round,
      roundPhase: 'OPPONENT_TURN',
      playerA: startB.nextPlayerA,
      playerB: startB.nextPlayerB,
      logs: logsWithB,
    });

    if (startB.deckOutDamage > 0) {
      triggerDeckOutFx('B', startB.deckOutDamage, startB.logs);
      if (startB.nextPlayerB.vit === 0) {
        const deckOutWin = createDeckOutDeathResolution(
          startB.nextPlayerA,
          startB.nextPlayerB,
          'B',
          session.round,
          logsWithB
        );
        setActiveResolution(deckOutWin);
        setAnimPhase('DEATH_SHATTER');
        setAshActive(true);
        soundFx.playDeathShatter();
        scheduleStep(() => {
          setAnimPhase('RESULT');
          setFinalResult(deckOutWin);
        }, 1500);
        return;
      }
    }

    // Phase 2: After 1-second delay, AI secretly picks its move -> switches to RESOLVING ROUND (CLASH)
    scheduleStep(() => {
      const oppMove = chooseOpponentMove(startB.nextPlayerB, startB.nextPlayerA);
      setLockedOpponentMove(oppMove);

      runSimultaneousClash(
        startB.nextPlayerA,
        startB.nextPlayerB,
        playerMove,
        oppMove,
        session.round,
        logsWithB
      );
    }, 1000);
  };

  // Surrender: immediately ends duel in loss, death shatter + persistent ash, 0 XP/Coins
  const handleSurrender = () => {
    if (finalResult || animPhase === 'DEATH_SHATTER') return;
    clearAllTimers();

    const defeatedA: PlayerState = { ...session.playerA, vit: 0 };
    const surrenderResolution: TurnResolution = {
      turn: session.round,
      nextPlayerA: defeatedA,
      nextPlayerB: session.playerB,
      logs: [
        {
          id: `surrender-${Date.now()}`,
          turn: session.round,
          category: 'DEATH',
          message: `${session.playerA.name} surrenders. 0 XP granted.`,
        },
      ],
      fx: {
        actionA: 'FLEE',
        actionB: 'GUARD',
        skillA: null,
        skillB: null,
        playedSkillA: null,
        playedSkillB: null,
        skillCancelledA: false,
        skillCancelledB: false,
        damageToA: session.playerA.vit,
        damageToB: 0,
        healToA: 0,
        healToB: 0,
        mirroredToA: false,
        mirroredToB: false,
        frozenTarget: null,
        instantKillBy: 'B',
        fleeAttemptA: { attempted: false, success: false },
        fleeAttemptB: { attempted: false, success: false },
        particleColorA: TYPE_COLORS[session.playerA.primaryType],
        particleColorB: '#C41E3A',
      },
      winner: 'B',
      endReason: 'KILL',
      fledBy: null,
      xpGained: 0,
    };

    setSurrendered(true);
    setActiveResolution(surrenderResolution);
    setSession((prev) => ({ ...prev, playerA: defeatedA }));
    showFloatingLogs(surrenderResolution.logs);
    setAnimPhase('DEATH_SHATTER');
    setAshActive(true);
    soundFx.playDeathShatter();

    scheduleStep(() => {
      setAnimPhase('RESULT');
      setFinalResult(surrenderResolution);
    }, 1500);
  };

  const { playerA, playerB, round, roundPhase } = session;
  const isPlayerTurn = roundPhase === 'PLAYER_TURN';
  const isOpponentTurn = roundPhase === 'OPPONENT_TURN';
  const isClash = roundPhase === 'CLASH';
  const isIdle = animPhase === 'IDLE';
  const isPlayerFrozen = playerA.skipNextTurn;

  const canLockIn =
    isPlayerTurn &&
    isIdle &&
    !finalResult &&
    (isPlayerFrozen || selectedAction !== null);

  const isLungingA =
    animPhase === 'LUNGE' && activeResolution?.fx.actionA !== 'SKIPPED';
  const isLungingB =
    animPhase === 'LUNGE' && activeResolution?.fx.actionB !== 'SKIPPED';

  const isRecoilingA =
    animPhase === 'RECOIL' && activeResolution?.fx.actionA !== 'SKIPPED';
  const isRecoilingB =
    animPhase === 'RECOIL' && activeResolution?.fx.actionB !== 'SKIPPED';

  const isDefenderRecoilingA =
    animPhase === 'IMPACT' && (activeResolution?.fx.damageToA ?? 0) > 0;
  const isDefenderRecoilingB =
    animPhase === 'IMPACT' && (activeResolution?.fx.damageToB ?? 0) > 0;

  const isGlowingAnticipationB = isOpponentTurn;

  const isDyingA =
    (animPhase === 'DEATH_SHATTER' || (finalResult !== null && playerA.vit === 0)) &&
    activeResolution !== null &&
    (activeResolution.nextPlayerA.vit === 0 || activeResolution.winner === 'B');
  const isDyingB =
    (animPhase === 'DEATH_SHATTER' || (finalResult !== null && playerB.vit === 0)) &&
    activeResolution !== null &&
    (activeResolution.nextPlayerB.vit === 0 || activeResolution.winner === 'A');

  const revealedActionA = isClash && activeResolution ? activeResolution.fx.actionA : null;
  const revealedActionB = isClash && activeResolution ? activeResolution.fx.actionB : null;

  const playerZoneCard = isPlayerTurn
    ? fieldSkill
    : isClash && !skillsClearedToGrave
    ? activeResolution?.fx.playedSkillA ?? lockedPlayerMove?.skill ?? null
    : null;
  const playerZoneLocked = isOpponentTurn && Boolean(lockedPlayerMove?.skill);

  const opponentZoneCard =
    isClash && !skillsClearedToGrave
      ? activeResolution?.fx.playedSkillB ?? lockedOpponentMove?.skill ?? null
      : null;

  const phaseLabel =
    roundPhase === 'PLAYER_TURN'
      ? 'YOUR TURN'
      : roundPhase === 'OPPONENT_TURN'
      ? "OPPONENT'S TURN"
      : 'RESOLVING ROUND';

  const turnTitleClass =
    roundPhase === 'PLAYER_TURN'
      ? 'turn-title-glow'
      : roundPhase === 'OPPONENT_TURN'
      ? 'turn-title-glow-opp'
      : 'turn-title-glow-clash';

  return (
    <div
      key={isScreenShaking ? `shake-${screenShakeKey}` : 'arena-root'}
      className={`relative min-h-screen h-[100dvh] bg-[#000000] text-[#E8E8F0] flex flex-col overflow-hidden ${
        isScreenShaking ? 'anim-screen-shake' : ''
      }`}
    >
      {/* Harsh Overhead Spotlight + Pulsing Crimson Arena Glow */}
      <div
        aria-hidden="true"
        className="arena-spotlight anim-crimson-pulse pointer-events-none fixed inset-0 z-0"
      />

      {/* Claustrophobic Dark Edge Vignette */}
      <div
        aria-hidden="true"
        className="arena-vignette pointer-events-none fixed inset-0 z-20"
      />

      {/* Draw Animation: 3D Flipping Card from Player's Deck on Playmat -> Up -> Player's Hand */}
      {flyingDrawCard && (
        <motion.div
          key={flyingDrawCard.id}
          initial={{
            x: 0,
            y: 0,
            scale: 0.55,
            rotateY: 180,
            opacity: 0.9,
          }}
          animate={{
            x: [0, flyingDrawCard.deltaX * 0.35, flyingDrawCard.deltaX],
            y: [0, -76, flyingDrawCard.deltaY],
            scale: [0.55, 1.08, 0.92],
            rotateY: [180, 15, 0],
            opacity: [0.95, 1, 0],
          }}
          transition={{
            duration: 0.85,
            times: [0, 0.45, 1],
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            position: 'fixed',
            left: flyingDrawCard.startX,
            top: flyingDrawCard.startY,
            width: 104,
            height: 106,
            zIndex: 75,
            pointerEvents: 'none',
            transformStyle: 'preserve-3d',
            perspective: 900,
          }}
        >
          {/* Card Front (Reveals once flipped past 90deg) */}
          <div
            className="iron-card-frame absolute inset-0 rounded-[7px] border-[#DAA53E] p-2.5 flex flex-col justify-between shadow-[0_0_28px_rgba(218,165,62,0.5)]"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="flex items-center gap-1 min-w-0">
              <SkillIcon id={flyingDrawCard.card.id} />
              <span className="min-w-0 font-serif text-[11px] font-bold text-[#EDE6D6] leading-tight">
                {flyingDrawCard.card.name}
              </span>
            </div>
            <p className="text-[9px] text-[#A8AEBE] line-clamp-3">
              {flyingDrawCard.card.effect}
            </p>
          </div>

          {/* Card Back (Visible when starting at Deck) */}
          <div
            className="absolute inset-0"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <CardBack className="h-full w-full" />
          </div>
        </motion.div>
      )}

      {/* Graveyard Animation: Flying Skill Cards from Skill Zones into respective Graveyard slots on the 3D Playmat */}
      {flyingGraveCards.map((flight) => (
        <motion.div
          key={flight.id}
          initial={{
            x: 0,
            y: 0,
            scale: 1,
            rotate: 0,
            opacity: 1,
          }}
          animate={{
            x: flight.deltaX,
            y: flight.deltaY,
            scale: 0.34,
            rotate: flight.owner === 'A' ? 24 : -24,
            opacity: 0,
          }}
          transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed',
            left: flight.startX,
            top: flight.startY,
            width: flight.startW,
            height: flight.startH,
            zIndex: 70,
            pointerEvents: 'none',
          }}
          className={`iron-card-frame rounded-[6px] px-2.5 py-1.5 flex flex-col justify-center shadow-[0_0_26px_rgba(196,30,58,0.5)] ${
            flight.owner === 'A' ? 'border-[#DAA53E]' : 'border-[#C41E3A]'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <SkillIcon id={flight.card.id} />
            <div className="min-w-0 flex-1">
              <span className="block font-serif text-[11px] font-bold text-[#EDE6D6] truncate">{flight.card.name}</span>
              <span className="block text-[9px] text-[#A8AEBE] truncate">{flight.card.effect}</span>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Minimalist Top Bar */}
      <header className="relative z-30 flex items-center justify-between gap-2 px-3 py-1.5 sm:px-6 sm:py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-serif text-xs font-semibold tracking-[0.2em] tabular-nums text-[#8F95AA] whitespace-nowrap">
            ROUND {String(round).padStart(2, '0')}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div aria-label="Emotes" className="flex items-center gap-0.5 mr-1 sm:mr-2">
            {EMOTES.map((em) => (
              <button
                key={em.emoji}
                type="button"
                title={em.text}
                aria-label={`Send emote: ${em.text}`}
                onClick={() => triggerPlayerEmote(em.emoji, em.text)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-transparent text-sm sm:text-base opacity-65 hover:opacity-100 hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
              >
                {em.emoji}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
            className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-transparent text-[#7C8199] hover:text-[#E8E8F0] hover:bg-white/5 transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            type="button"
            disabled={Boolean(finalResult) || animPhase === 'DEATH_SHATTER'}
            onClick={handleSurrender}
            className="stone-btn min-h-[32px] inline-flex items-center gap-1 rounded px-2 sm:px-2.5 py-1 text-[11px] font-sans font-medium text-[#B8BDCF] hover:text-[#FF4D6A] disabled:opacity-35 transition-all whitespace-nowrap cursor-pointer"
          >
            <Flag className="h-3 w-3" />
            <span>Surrender</span>
          </button>

          <button
            type="button"
            onClick={handleNewDuel}
            className="stone-btn min-h-[32px] inline-flex items-center gap-1 rounded px-2 sm:px-2.5 py-1 text-[11px] font-sans font-semibold text-[#E8E8F0] transition-all whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>New Duel</span>
          </button>
        </div>
      </header>

      {/* Opponent's Face-Down Tarot Fan Hand at Top of Screen */}
      <OpponentHand count={playerB.hand.length} isOpponentTurn={isOpponentTurn} />

      {/* Massive Blood-Red Glowing Serif Turn Title */}
      <div className="relative z-30 flex items-center justify-center pointer-events-none -mt-0.5 mb-0.5">
        <h1
          aria-live="polite"
          className={`font-serif text-xl sm:text-3xl font-bold tracking-[0.2em] leading-none whitespace-nowrap ${turnTitleClass}`}
        >
          {phaseLabel}
        </h1>
      </div>

      {/* Floating DRAW PHASE banner */}
      {isDrawingPhase && (
        <div
          aria-live="polite"
          className="anim-draw-phase-banner pointer-events-none fixed top-20 left-1/2 z-50 -translate-x-1/2 rounded bg-[#101219]/95 px-4 py-1 text-xs font-serif font-bold tracking-[0.22em] text-[#E5B95C] border border-[#B89242]/70 shadow-[0_8px_24px_rgba(0,0,0,0.95)]"
        >
          DRAW PHASE
        </div>
      )}

      {/* Main Arena Focus: 2.5D CSS 3D Obsidian Tabletop Playmat */}
      <main className="relative z-20 flex-1 flex flex-col justify-between max-w-5xl w-full mx-auto px-2 sm:px-6 pb-0 overflow-visible">
        <div className="playmat-perspective relative flex-1 flex items-center justify-center min-h-0 py-0.5 overflow-visible">
          {animPhase === 'IMPACT' && (
            <div
              aria-hidden="true"
              className="anim-impact-flash pointer-events-none fixed inset-0 z-40 bg-white/65"
            />
          )}

          <ParticleCanvas burst={burst} />

          <FloatingBattleFeed messages={floatingMessages} />

          {/* Tilted 2.5D Playmat Board with Cracked Obsidian Background & Edge Fade */}
          <div className="playmat-table relative z-10 w-full max-w-[470px] sm:max-w-[610px] rounded-2xl px-3 py-2.5 sm:px-6 sm:py-4 flex flex-col items-center justify-between gap-2 sm:gap-3">
            {/* Dark Semi-Transparent Scrim + Inset/Radial Edge Fade into Pitch Black */}
            <div
              aria-hidden="true"
              className="playmat-surface-scrim pointer-events-none absolute inset-0 rounded-2xl"
            />

            {/* TOP ROW OF PLAYMAT: Opponent Deck & Graveyard (Top-Left) + Opponent Character Card (Center) */}
            <div
              className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-start gap-1.5 sm:gap-3 w-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Opponent's Side (Top Left): Deck & Graveyard */}
              <div
                className="justify-self-start flex flex-col sm:flex-row items-start gap-1.5 sm:gap-2"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <DeckPileZone deckCount={playerB.deck.length} isOpponent />
                <GraveyardPileZone
                  graveyardCount={playerB.graveyard.length}
                  pulse={graveyardPulseB}
                  isOpponent
                  zoneRef={opponentGraveyardRef}
                  onClick={() => openGraveyard('B')}
                />
              </div>

              {/* Opponent's Character Card */}
              <div className="justify-self-center flex justify-center">
                <CharacterCard
                  player={playerB}
                  position="top"
                  animPhase={animPhase}
                  isActiveTurn={isOpponentTurn}
                  isLunging={isLungingB}
                  isRecoiling={isRecoilingB}
                  isDefenderRecoiling={isDefenderRecoilingB}
                  isGlowingAnticipation={isGlowingAnticipationB}
                  floatingDamage={activeResolution?.fx.damageToB ?? 0}
                  floatingHeal={activeResolution?.fx.healToB ?? 0}
                  deckOutDamage={deckOutDamageB}
                  isDying={isDyingB}
                  revealedAction={revealedActionB}
                  emote={opponentEmote}
                  isOpponent
                />
              </div>

              <div aria-hidden="true" />
            </div>

            {/* MIDDLE OF PLAYMAT: Carved Glowing Engraved Rune Skill Zones */}
            <div
              className="relative z-10 grid grid-cols-2 gap-2.5 sm:gap-4 w-full max-w-[330px] sm:max-w-[430px]"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Player Carved Rune Skill Slot */}
              <div
                ref={playerSkillZoneRef}
                aria-label="Player Skill Card Zone"
                className={`relative min-h-[60px] sm:min-h-[74px] rounded-[6px] px-2.5 py-1.5 flex flex-col justify-center transition-all duration-200 ${
                  playerZoneCard
                    ? animPhase === 'SKILL_ACTIVATE'
                      ? 'rune-slot-drag-target scale-[1.04]'
                      : 'rune-slot-active-player'
                    : playerZoneLocked
                    ? 'rune-slot-active-player'
                    : isDraggingSkill
                    ? 'rune-slot-drag-target scale-[1.04]'
                    : 'rune-slot'
                }`}
              >
                {/* Engraved Corner Rune Brackets */}
                <span aria-hidden="true" className="pointer-events-none absolute top-1 left-1 h-2 w-2 border-t border-l border-[#A89A78]/45" />
                <span aria-hidden="true" className="pointer-events-none absolute top-1 right-1 h-2 w-2 border-t border-r border-[#A89A78]/45" />
                <span aria-hidden="true" className="pointer-events-none absolute bottom-1 left-1 h-2 w-2 border-b border-l border-[#A89A78]/45" />
                <span aria-hidden="true" className="pointer-events-none absolute bottom-1 right-1 h-2 w-2 border-b border-r border-[#A89A78]/45" />

                {playerZoneCard ? (
                  <div
                    key={`p-skill-${playerZoneCard.uid}`}
                    className="anim-skill-slam-player flex items-center gap-1.5"
                  >
                    <SkillIcon id={playerZoneCard.id} />
                    <div className="min-w-0 flex-1">
                    <span className="font-serif text-[11px] sm:text-xs font-bold text-[#F0C66B] truncate drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
                      {playerZoneCard.name}
                    </span>
                    <p className="text-[9px] sm:text-[10px] leading-tight text-[#C2C7D6] line-clamp-2">
                      {playerZoneCard.effect}
                    </p>
                    </div>
                  </div>
                ) : playerZoneLocked ? (
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-serif font-semibold tracking-widest text-[#E5B95C]">
                    <Lock className="h-3 w-3" />
                    <span>RUNE SEALED</span>
                  </div>
                ) : (
                  <div className="text-center">
                    <div
                      className={`font-serif text-[9px] sm:text-[10px] font-semibold tracking-[0.18em] ${
                        isDraggingSkill
                          ? 'text-[#FFBF00] drop-shadow-[0_0_8px_rgba(255,191,0,0.85)]'
                          : 'text-[#848B9F]/85'
                      }`}
                    >
                      {isDraggingSkill ? 'INSCRIBE RUNE' : 'YOUR SKILL ZONE'}
                    </div>
                  </div>
                )}
              </div>

              {/* Opponent Carved Rune Skill Slot */}
              <div
                ref={opponentSkillZoneRef}
                aria-label="Opponent Skill Card Zone"
                className={`relative min-h-[60px] sm:min-h-[74px] rounded-[6px] px-2.5 py-1.5 flex flex-col justify-center transition-all duration-200 ${
                  opponentZoneCard
                    ? animPhase === 'SKILL_ACTIVATE'
                      ? 'rune-slot-active-opponent scale-[1.04]'
                      : 'rune-slot-active-opponent'
                    : isOpponentTurn
                    ? 'rune-slot-active-opponent opacity-80'
                    : 'rune-slot'
                }`}
              >
                {/* Engraved Corner Rune Brackets */}
                <span aria-hidden="true" className="pointer-events-none absolute top-1 left-1 h-2 w-2 border-t border-l border-[#A85563]/45" />
                <span aria-hidden="true" className="pointer-events-none absolute top-1 right-1 h-2 w-2 border-t border-r border-[#A85563]/45" />
                <span aria-hidden="true" className="pointer-events-none absolute bottom-1 left-1 h-2 w-2 border-b border-l border-[#A85563]/45" />
                <span aria-hidden="true" className="pointer-events-none absolute bottom-1 right-1 h-2 w-2 border-b border-r border-[#A85563]/45" />

                {opponentZoneCard ? (
                  <div
                    key={`ai-skill-${opponentZoneCard.uid}`}
                    className="anim-skill-slam-opponent flex items-center gap-1.5"
                  >
                    <SkillIcon id={opponentZoneCard.id} />
                    <div className="min-w-0 flex-1">
                    <span className="font-serif text-[11px] sm:text-xs font-bold text-[#FF546E] truncate drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
                      {opponentZoneCard.name}
                    </span>
                    <p className="text-[9px] sm:text-[10px] leading-tight text-[#C2C7D6] line-clamp-2">
                      {opponentZoneCard.effect}
                    </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="font-serif text-[9px] sm:text-[10px] font-semibold tracking-[0.18em] text-[#848B9F]/85">
                      {isOpponentTurn ? 'INSCRIBING...' : 'FOE SKILL ZONE'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* BOTTOM ROW OF PLAYMAT: Player Character Card (Center) + Player Graveyard & Deck (Bottom-Right) */}
            <div
              className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-end gap-1.5 sm:gap-3 w-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div aria-hidden="true" />

              {/* Player's Character Card */}
              <div className="justify-self-center flex justify-center">
                <CharacterCard
                  player={playerA}
                  position="bottom"
                  animPhase={animPhase}
                  isActiveTurn={isPlayerTurn}
                  isLunging={isLungingA}
                  isRecoiling={isRecoilingA}
                  isDefenderRecoiling={isDefenderRecoilingA}
                  isGlowingAnticipation={false}
                  floatingDamage={activeResolution?.fx.damageToA ?? 0}
                  floatingHeal={activeResolution?.fx.healToA ?? 0}
                  deckOutDamage={deckOutDamageA}
                  isDying={isDyingA}
                  revealedAction={revealedActionA}
                  emote={playerEmote}
                />
              </div>

              {/* Player's Side (Bottom Right): Graveyard & Deck */}
              <div
                className="justify-self-end flex flex-col sm:flex-row items-end gap-1.5 sm:gap-2"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <GraveyardPileZone
                  graveyardCount={playerA.graveyard.length}
                  pulse={graveyardPulseA}
                  zoneRef={playerGraveyardRef}
                  onClick={() => openGraveyard('A')}
                />
                <DeckPileZone
                  deckCount={playerA.deck.length}
                  zoneRef={playerDeckRef}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Heavy Forged Metallic / Stone Controls Row + Swipeable Player Hand Fan */}
        <div className="relative z-30 flex flex-col items-center gap-1 pt-0.5">
          <div className="flex items-center justify-between gap-2 w-full max-w-lg px-1 mb-0.5 min-h-[54px]">
            <div className="flex-1 min-w-0">
              {isPlayerTurn ? (
                isPlayerFrozen ? (
                  <div className="flex items-center gap-1.5 text-xs font-sans text-[#00CED1] pl-2">
                    <Snowflake className="h-3.5 w-3.5" />
                    <span>Frozen — Lock In to pass</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
                    <button
                      type="button"
                      disabled={Boolean(finalResult)}
                      onClick={() => setSelectedAction('ATTACK')}
                      aria-pressed={selectedAction === 'ATTACK'}
                      className={`min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-[5px] px-2 sm:px-3 py-1.5 font-serif text-[11px] sm:text-xs font-bold tracking-[0.12em] transition-all whitespace-nowrap cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                        selectedAction === 'ATTACK'
                          ? 'stone-btn-attack-active text-[#FFE8EC]'
                          : 'stone-btn text-[#D2D6E2]'
                      }`}
                    >
                      <Swords className="h-3.5 w-3.5 shrink-0" />
                      <span>ATTACK</span>
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(finalResult)}
                      onClick={() => setSelectedAction('GUARD')}
                      aria-pressed={selectedAction === 'GUARD'}
                      className={`min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-[5px] px-2 sm:px-3 py-1.5 font-serif text-[11px] sm:text-xs font-bold tracking-[0.12em] transition-all whitespace-nowrap cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                        selectedAction === 'GUARD'
                          ? 'stone-btn-guard-active text-[#C9F7DB]'
                          : 'stone-btn text-[#D2D6E2]'
                      }`}
                    >
                      <Shield className="h-3.5 w-3.5 shrink-0" />
                      <span>GUARD</span>
                    </button>

                    <button
                      type="button"
                      disabled={playerA.cannotFleeNextTurn || Boolean(finalResult)}
                      onClick={() => setSelectedAction('FLEE')}
                      aria-pressed={selectedAction === 'FLEE'}
                      className={`min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-[5px] px-2 sm:px-3 py-1.5 font-serif text-[11px] sm:text-xs font-bold tracking-[0.12em] transition-all whitespace-nowrap cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                        selectedAction === 'FLEE'
                          ? 'stone-btn-flee-active text-[#D2FBFC]'
                          : 'stone-btn text-[#D2D6E2]'
                      }`}
                    >
                      <Footprints className="h-3.5 w-3.5 shrink-0" />
                      <span>{playerA.cannotFleeNextTurn ? 'TRAPPED' : 'FLEE'}</span>
                    </button>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center gap-2 text-xs font-serif tracking-widest text-[#9CA3B8]">
                  {isOpponentTurn ? (
                    <span className="text-[#C41E3A] drop-shadow-[0_0_8px_rgba(196,30,58,0.6)]">
                      OPPONENT SECRETLY CHOOSING...
                    </span>
                  ) : (
                    <span className="text-[#E5B95C] drop-shadow-[0_0_8px_rgba(229,185,92,0.5)]">
                      SIMULTANEOUS CLASH RESOLVING
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Forged Metallic LOCK IN Seal — ONLY appears on the Player's turn */}
            {isPlayerTurn && (
              <button
                type="button"
                disabled={!canLockIn}
                onClick={handleLockIn}
                aria-label="Lock In"
                className={`h-13 w-14 sm:h-14 sm:w-16 shrink-0 rounded-[6px] flex flex-col items-center justify-center font-serif text-[9.5px] font-bold tracking-wider leading-tight transition-all duration-200 ${
                  canLockIn
                    ? 'stone-btn-gold hover:brightness-110 active:scale-95 cursor-pointer'
                    : 'stone-btn text-[#5D6378] opacity-55 cursor-not-allowed'
                }`}
              >
                <Lock className="h-3 w-3 mb-0.5" />
                <span>LOCK IN</span>
              </button>
            )}
          </div>

          {/* Swipeable Overlapping Fan Hand */}
          <SkillHand
            hand={playerA.hand}
            vit={playerA.vit}
            maxVit={playerA.maxVit}
            isPlayerTurn={isPlayerTurn && isIdle && !finalResult}
            fieldSkill={isPlayerTurn ? fieldSkill : null}
            disabled={!isPlayerTurn || isPlayerFrozen || Boolean(finalResult)}
            skillZoneRef={playerSkillZoneRef}
            handContainerRef={handContainerRef}
            onDragStateChange={setIsDraggingSkill}
            onPlaySkillToField={handlePlaySkillToField}
            onRemoveFieldSkill={handleRemoveFieldSkill}
          />
        </div>
      </main>

      {/* Persistent Glowing Ash at Bottom Edge After a Card Dies */}
      <GlowingAsh active={ashActive} />

      {/* Clickable Graveyard Modal */}
      <GraveyardModal
        open={graveyardOpen}
        entries={graveyardEntries}
        initialFilter={graveyardFilter}
        onClose={() => setGraveyardOpen(false)}
      />

      {/* Final Broadcast Result Screen */}
      {finalResult && (
        <ResultScreen
          resolution={finalResult}
          playerA={finalResult.nextPlayerA}
          playerB={finalResult.nextPlayerB}
          surrendered={surrendered}
          onNewDuel={handleNewDuel}
        />
      )}
    </div>
  );
}
