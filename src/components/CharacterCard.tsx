import { useState } from 'react';
import { Flame, Lock, Shield, Skull, Snowflake, Sparkles } from 'lucide-react';
import { ActionType, AnimationPhase, PlayerState, TYPE_COLORS } from '../types/duel';

export interface CardEmote {
  id: number;
  emoji: string;
  text: string;
}

interface CharacterCardProps {
  player: PlayerState;
  position: 'top' | 'bottom';
  animPhase: AnimationPhase;
  isActiveTurn: boolean;
  isLunging: boolean;
  isRecoiling: boolean;
  isDefenderRecoiling: boolean;
  isGlowingAnticipation: boolean;
  floatingDamage: number;
  floatingHeal: number;
  deckOutDamage?: number;
  isDying: boolean;
  revealedAction?: ActionType | null;
  emote?: CardEmote | null;
  isOpponent?: boolean;
}

const SHARD_CLIP_PATHS = [
  'polygon(0% 0%, 52% 0%, 44% 34%, 0% 28%)',
  'polygon(52% 0%, 100% 0%, 100% 31%, 44% 34%)',
  'polygon(0% 28%, 44% 34%, 36% 62%, 0% 56%)',
  'polygon(44% 34%, 100% 31%, 100% 59%, 36% 62%)',
  'polygon(0% 56%, 36% 62%, 48% 82%, 0% 80%)',
  'polygon(36% 62%, 100% 59%, 100% 82%, 48% 82%)',
  'polygon(0% 80%, 48% 82%, 42% 100%, 0% 100%)',
  'polygon(48% 82%, 100% 82%, 100% 100%, 42% 100%)',
];

export function CharacterCard({
  player,
  position,
  animPhase,
  isActiveTurn,
  isLunging,
  isRecoiling,
  isDefenderRecoiling,
  isGlowingAnticipation,
  floatingDamage,
  floatingHeal,
  deckOutDamage = 0,
  isDying,
  revealedAction,
  emote,
  isOpponent = false,
}: CharacterCardProps) {
  const [imgError, setImgError] = useState(false);

  const primaryColor = TYPE_COLORS[player.primaryType];
  const vitPercent = Math.max(0, Math.min(100, (player.vit / player.maxVit) * 100));
  const isCritical = player.vit > 0 && player.vit < player.maxVit * 0.2;
  const vitGlowColor = isCritical ? '#C41E3A' : primaryColor;

  let motionClass =
    position === 'bottom' ? 'player-card-elevated' : 'opponent-card-rest';
  if (isLunging) {
    motionClass = position === 'bottom' ? 'anim-lunge-player z-40' : 'anim-lunge-opponent z-40';
  } else if (isRecoiling) {
    motionClass = position === 'bottom' ? 'anim-recoil-player z-30' : 'anim-recoil-opponent z-30';
  } else if (isDefenderRecoiling) {
    motionClass =
      position === 'bottom'
        ? 'anim-defend-recoil-player z-20'
        : 'anim-defend-recoil-opponent z-20';
  } else if (isGlowingAnticipation) {
    motionClass = `${motionClass} anim-glow-anticipation z-20`;
  }

  const showClashNumbers =
    animPhase === 'IMPACT' || animPhase === 'RECOIL' || animPhase === 'DRAIN';

  // Heavy metallic iron/gold bezel styling
  const frameBorderColor = isDying
    ? '#C41E3A'
    : isActiveTurn
    ? '#B89242'
    : '#535A70';

  return (
    <div
      className={`relative select-none w-[154px] sm:w-[206px] h-[154px] sm:h-[208px] ${motionClass}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Emote Speech Bubble (3 seconds) */}
      {emote && (
        <div
          key={emote.id}
          className="anim-speech-bubble pointer-events-none absolute -top-9 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#14161F]/95 px-2.5 py-1 text-xs font-sans text-[#E8E8F0]"
          style={{
            boxShadow: `0 0 0 1px ${primaryColor}80, 0 10px 26px rgba(0,0,0,0.95)`,
            transform: 'translateZ(30px)',
          }}
        >
          <span className="mr-1">{emote.emoji}</span>
          <span>{emote.text}</span>
        </div>
      )}

      {/* Floating Damage & Heal Numbers */}
      {(showClashNumbers || deckOutDamage > 0) && (
        <div className="pointer-events-none absolute top-2 left-1/2 z-40 -translate-x-1/2 flex flex-col items-center">
          {showClashNumbers && floatingDamage > 0 && (
            <span className="anim-float-damage font-sans text-2xl sm:text-3xl font-bold tabular-nums text-[#FF3B4E] drop-shadow-[0_2px_12px_rgba(196,30,58,0.95)]">
              -{floatingDamage}
            </span>
          )}
          {showClashNumbers && floatingHeal > 0 && (
            <span className="anim-float-damage font-sans text-lg sm:text-xl font-bold tabular-nums text-[#50C878] drop-shadow-[0_2px_10px_rgba(80,200,120,0.9)]">
              +{floatingHeal}
            </span>
          )}
          {deckOutDamage > 0 && (
            <span className="anim-float-damage font-sans text-2xl sm:text-3xl font-bold tabular-nums text-[#FF3B4E] drop-shadow-[0_2px_12px_rgba(196,30,58,0.95)]">
              -{deckOutDamage}
            </span>
          )}
        </div>
      )}

      {/* Heavy Forged Metallic Bezel Monolith Card */}
      <article
        className={`relative h-full w-full overflow-hidden rounded-[8px] bg-[#0B0D12] flex flex-col justify-end transition-all duration-300 ${
          isDying ? 'anim-death-card' : ''
        }`}
        style={{
          border: `3px solid ${frameBorderColor}`,
          boxShadow: isDying
            ? '0 26px 52px rgba(0,0,0,0.99), 0 0 42px rgba(196, 30, 58, 0.85), inset 0 0 0 1px #FF4D6A'
            : isGlowingAnticipation
            ? `0 26px 50px rgba(0,0,0,0.99), 0 10px 22px rgba(0,0,0,0.95), 0 0 34px ${primaryColor}85, inset 0 1px 0 rgba(255,255,255,0.28), inset 0 0 0 1px ${primaryColor}`
            : isActiveTurn
            ? `0 26px 52px rgba(0,0,0,0.99), 0 12px 24px rgba(0,0,0,0.96), 0 0 28px rgba(212,165,68,0.35), inset 0 1px 0 rgba(255,232,175,0.45), inset 0 0 0 1px ${primaryColor}AA`
            : `0 22px 46px rgba(0,0,0,0.99), 0 10px 20px rgba(0,0,0,0.94), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px ${primaryColor}55`,
        }}
      >
        {/* Full-bleed Monolith Portrait centered on character's face */}
        {!imgError ? (
          <img
            src={player.portraitUrl}
            alt={`${player.name} — ${player.role}`}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="absolute inset-0 h-full w-full object-cover object-[50%_22%]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#14161F]">
            <Skull className="h-10 w-10 text-[#5B6075]" />
          </div>
        )}

        {/* Inner etched metallic corner accents */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[3px] z-10 rounded-[4px] border border-white/10"
        />

        {/* Deep Obsidian Monolith Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05060A] via-[#0B0D13]/35 to-black/25" />

        {/* Subtle Top Metadata */}
        <div className="absolute top-2 left-2.5 right-2.5 z-10 flex items-center justify-between text-[10px] font-sans tabular-nums tracking-widest text-[#E8E8F0]/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
          <span style={{ color: primaryColor }} className="font-bold">
            {player.primaryType}
          </span>
          <span className="text-[#C8CCD8]">
            {isOpponent ? 'FOE' : 'YOU'} · LV{player.level}
          </span>
        </div>

        {/* Active Stance Flags */}
        <div className="absolute top-6 left-2.5 z-10 flex flex-col gap-0.5">
          {player.mirrorShieldActive && (
            <span className="inline-flex items-center gap-1 bg-black/85 px-1.5 py-0.5 text-[9px] font-sans text-[#C0C0C0] rounded border border-[#C0C0C0]/30">
              <Sparkles className="h-2.5 w-2.5" /> MIRROR
            </span>
          )}
          {player.ironWallActive && (
            <span className="inline-flex items-center gap-1 bg-black/85 px-1.5 py-0.5 text-[9px] font-sans text-[#50C878] rounded border border-[#50C878]/30">
              <Shield className="h-2.5 w-2.5" /> IRON WALL
            </span>
          )}
          {player.guarding && !player.ironWallActive && !player.mirrorShieldActive && (
            <span className="inline-flex items-center gap-1 bg-black/85 px-1.5 py-0.5 text-[9px] font-sans text-[#50C878] rounded border border-[#50C878]/30">
              <Shield className="h-2.5 w-2.5" /> GUARD
            </span>
          )}
          {player.skipNextTurn && (
            <span className="inline-flex items-center gap-1 bg-black/85 px-1.5 py-0.5 text-[9px] font-sans text-[#00CED1] rounded border border-[#00CED1]/30">
              <Snowflake className="h-2.5 w-2.5" /> FROZEN
            </span>
          )}
          {player.bloodPactActive && (
            <span className="inline-flex items-center gap-1 bg-black/85 px-1.5 py-0.5 text-[9px] font-sans text-[#C41E3A] rounded border border-[#C41E3A]/40">
              <Flame className="h-2.5 w-2.5" /> +50%
            </span>
          )}
          {player.cannotFleeNextTurn && (
            <span className="inline-flex items-center gap-1 bg-black/85 px-1.5 py-0.5 text-[9px] font-sans text-[#FFBF00] rounded border border-[#FFBF00]/30">
              <Lock className="h-2.5 w-2.5" /> TRAPPED
            </span>
          )}
        </div>

        {/* Revealed Action Overlay during resolution */}
        {revealedAction && (
          <div className="absolute top-6 right-2.5 z-10 bg-black/90 px-1.5 py-0.5 rounded border border-[#FFBF00]/50 text-[9px] font-sans font-semibold tracking-wider text-[#FFBF00]">
            {revealedAction}
          </div>
        )}

        {/* Minimalist Bottom Monolith Typography */}
        <div className="relative z-10 px-3 sm:px-3.5 pb-2 pt-4 space-y-1 bg-gradient-to-t from-[#05060A]/95 to-transparent">
          <h2 className="font-serif text-sm sm:text-base font-bold tracking-wide text-[#E8E8F0] leading-tight truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.98)]">
            {player.name}
          </h2>

          <div className="flex items-baseline justify-between font-sans text-xs sm:text-sm tabular-nums">
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] font-medium tracking-wider text-[#A4A9BE]">
                VIT
              </span>
              <span
                className={`font-bold ${
                  isCritical ? 'text-[#FF3B4E]' : 'text-[#E8E8F0]'
                }`}
              >
                {player.vit}/{player.maxVit}
              </span>
            </div>

            <div className="flex items-baseline gap-1 text-[10px] font-medium tracking-wider text-[#959BB2]">
              <span>STR {player.stats.STR}</span>
              <span>·</span>
              <span>AGI {player.stats.AGI}</span>
            </div>
          </div>
        </div>

        {/* Glowing VIT Underline along the VERY BOTTOM EDGE */}
        <div className="relative z-10 h-[4px] w-full bg-[#06070A]">
          <div
            className="h-full transition-[width,background-color] duration-200 ease-out"
            style={{
              width: `${vitPercent}%`,
              backgroundColor: vitGlowColor,
              boxShadow: `0 0 12px ${vitGlowColor}, 0 -2px 8px ${vitGlowColor}90`,
            }}
          />
        </div>
      </article>

      {/* Death Shatter Overlay */}
      {isDying && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30">
          <svg
            viewBox="0 0 100 130"
            preserveAspectRatio="none"
            className="anim-death-crack absolute inset-0 h-full w-full"
          >
            <path
              d="M50 0 L44 44 L0 36 M44 44 L100 40 M44 44 L36 80 L0 74 M36 80 L48 106 L100 106 M48 106 L42 130"
              fill="none"
              stroke="#C41E3A"
              strokeWidth="1.6"
            />
            <path
              d="M50 0 L44 44 L36 80 L48 106 L42 130"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="0.6"
              strokeOpacity="0.8"
            />
          </svg>

          {SHARD_CLIP_PATHS.map((clipPath, idx) => (
            <div
              key={idx}
              className={`anim-shard-${idx} absolute inset-0 rounded-[8px] bg-[#14161F]/90`}
              style={{
                clipPath,
                boxShadow: 'inset 0 0 14px rgba(196, 30, 58, 0.55)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
