import { RotateCcw, Skull } from 'lucide-react';
import { PlayerState, TurnResolution } from '../types/duel';

interface ResultScreenProps {
  resolution: TurnResolution;
  playerA: PlayerState;
  playerB: PlayerState;
  surrendered?: boolean;
  onNewDuel: () => void;
}

export function ResultScreen({
  resolution,
  playerA,
  playerB,
  surrendered = false,
  onNewDuel,
}: ResultScreenProps) {
  const isDraw = resolution.winner === 'DRAW';
  const winnerPlayer = resolution.winner === 'A' ? playerA : playerB;
  const loserPlayer = resolution.winner === 'A' ? playerB : playerA;

  const winnerLabel = resolution.winner === 'A' ? 'Player 1' : 'Player 2';
  const loserLabel = resolution.winner === 'A' ? 'Player 2' : 'Player 1';

  let headline = '';
  let subline = '';

  if (surrendered) {
    headline = `Player 2 wins. Player 1's name was ${playerA.name}. ${playerA.role}. Surrendered to ${playerB.name}.`;
    subline = 'Forfeit recorded. No proof of value granted.';
  } else if (isDraw) {
    headline = 'Mutual Annihilation.';
    subline = `Both ${playerA.name} and ${playerB.name} fell in the pit. Neither vessel survived.`;
  } else if (resolution.endReason === 'FLEE') {
    headline = `${winnerLabel} wins. ${loserLabel} fled the pit.`;
    subline = `${loserLabel}'s name was ${loserPlayer.name}. ${loserPlayer.role}. Survived, marked by ${winnerPlayer.name}.`;
  } else {
    headline = `${winnerLabel} wins. ${loserLabel}'s name was ${loserPlayer.name}. ${loserPlayer.role}. Killed by ${winnerPlayer.name}.`;
    subline =
      resolution.endReason === 'EXHAUSTED'
        ? 'Deck exhausted. The Tide claimed their remaining vitality.'
        : 'Vitality extinguished. Proof of value recorded.';
  }

  const xpShown = surrendered ? 0 : resolution.xpGained;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Duel Result"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-[2px] p-4"
    >
      <div
        className="w-full max-w-md rounded-md bg-[#14161F]/95 p-6 space-y-5"
        style={{
          boxShadow: '0 0 48px rgba(0,0,0,0.95), inset 0 0 0 1px rgba(196, 30, 58, 0.55)',
        }}
      >
        <div className="flex items-center justify-between border-b border-[#232736] pb-3">
          <div className="flex items-center gap-2 text-[#C41E3A]">
            <Skull className="h-5 w-5" />
            <span className="font-sans text-xs font-semibold tracking-widest">
              VERDICT · ROUND {String(resolution.turn).padStart(2, '0')}
            </span>
          </div>
          <span className="font-sans text-xs tabular-nums text-[#8A8FA6]">
            THE TIDE
          </span>
        </div>

        <div className="space-y-3">
          <h2 className="font-serif text-lg sm:text-xl font-bold leading-snug text-[#E8E8F0] [text-wrap:balance]">
            {headline}
          </h2>
          <p className="text-xs italic text-[#9CA3B8] leading-relaxed">{subline}</p>
        </div>

        {/* XP & Final VIT Telemetry */}
        <div className="grid grid-cols-2 gap-3 border-y border-[#232736] py-3.5 font-sans text-xs tabular-nums">
          <div>
            <div className="text-[#7C8199] text-[11px]">REWARD</div>
            <div className="mt-1 text-base font-bold text-[#FFBF00]">
              {surrendered ? '0 XP · 0 Coins' : `+${xpShown} XP`}
            </div>
            {!isDraw && !surrendered && (
              <div className="text-[11px] text-[#8A8FA6] mt-0.5 truncate">
                {winnerPlayer.name} ({winnerPlayer.xp + xpShown} XP)
              </div>
            )}
          </div>
          <div>
            <div className="text-[#7C8199] text-[11px]">FINAL VIT</div>
            <div className="mt-1 text-base font-bold text-[#E8E8F0]">
              {playerA.vit} vs {playerB.vit}
            </div>
            <div className="text-[11px] text-[#8A8FA6] mt-0.5">
              {surrendered
                ? 'Surrender'
                : resolution.endReason === 'FLEE'
                ? 'Escape'
                : resolution.endReason === 'EXHAUSTED'
                ? 'Deck Out'
                : 'Lethal Clash'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onNewDuel}
          className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-md bg-[#C41E3A] px-4 py-2.5 text-sm font-semibold text-[#E8E8F0] hover:bg-[#D92644] active:scale-[0.99] transition-all cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" />
          <span>New Duel</span>
        </button>
      </div>
    </div>
  );
}
