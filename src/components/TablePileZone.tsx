import { type RefObject } from 'react';
import { Skull } from 'lucide-react';
import { CardBack } from './CardBack';

interface DeckPileZoneProps {
  deckCount: number;
  isOpponent?: boolean;
  zoneRef?: RefObject<HTMLDivElement | null>;
}

export function DeckPileZone({
  deckCount,
  isOpponent = false,
  zoneRef,
}: DeckPileZoneProps) {
  return (
    <div
      ref={zoneRef}
      aria-label={`${isOpponent ? 'Opponent' : 'Your'} Deck: ${deckCount} cards remaining`}
      className="relative flex flex-col items-center justify-center select-none"
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Carved Metallic Stone Slot on the Obsidian Playmat */}
      <div
        className={`rune-slot relative h-[58px] w-[44px] sm:h-[74px] sm:w-[54px] rounded-[6px] flex flex-col items-center justify-center transition-all ${
          deckCount === 0 ? 'rune-slot-active-opponent' : ''
        }`}
      >
        {deckCount > 0 ? (
          <>
            {/* Layered 3D physical stack thickness */}
            {deckCount > 4 && (
              <div
                className="pointer-events-none absolute inset-0 rounded-[6px] bg-[#0B0D12] border border-[#3B3238]"
                style={{ transform: 'translate3d(-2px, -2px, 2px)' }}
              />
            )}
            {deckCount > 1 && (
              <div
                className="pointer-events-none absolute inset-0 rounded-[6px] bg-[#101219] border border-[#473A40]"
                style={{ transform: 'translate3d(-1px, -1px, 4px)' }}
              />
            )}
            <div
              className="absolute inset-0"
              style={{ transform: 'translateZ(6px)' }}
            >
              <CardBack compact className="h-full w-full" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0.5 flex flex-col items-center leading-none">
                <span className="rounded bg-black/90 px-1 py-0.5 font-sans text-[9px] font-bold tabular-nums text-[#E8E8F0] border border-[#4A3B3E]/70">
                  {deckCount}/10
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center leading-tight">
            <span className="font-sans text-[8px] sm:text-[9px] font-bold text-[#FF4D6A]">
              -2 VIT
            </span>
            <span className="font-sans text-[9px] font-bold tabular-nums text-[#9CA3B8]">
              0/10
            </span>
          </div>
        )}
      </div>
      <span className="mt-0.5 font-serif text-[7px] sm:text-[8px] font-semibold tracking-widest text-[#8A8F9E] drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
        DECK
      </span>
    </div>
  );
}

interface GraveyardPileZoneProps {
  graveyardCount: number;
  pulse: boolean;
  isOpponent?: boolean;
  zoneRef?: RefObject<HTMLButtonElement | null>;
  onClick: () => void;
}

export function GraveyardPileZone({
  graveyardCount,
  pulse,
  isOpponent = false,
  zoneRef,
  onClick,
}: GraveyardPileZoneProps) {
  return (
    <div className="flex flex-col items-center justify-center select-none">
      <button
        ref={zoneRef}
        type="button"
        onClick={onClick}
        aria-label={`${isOpponent ? 'Opponent' : 'Your'} Graveyard (${graveyardCount} cards)`}
        className={`rune-slot relative h-[58px] w-[44px] sm:h-[74px] sm:w-[54px] rounded-[6px] flex flex-col items-center justify-center transition-all duration-200 cursor-pointer hover:brightness-125 active:scale-95 ${
          pulse
            ? 'rune-slot-drag-target scale-105'
            : graveyardCount > 0
            ? 'rune-slot-active-opponent'
            : ''
        }`}
      >
        {/* Inner engraved slot frame */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[3px] rounded-[3px] border border-[#8E95AD]/15"
        />
        <Skull
          className={`relative z-10 h-3.5 w-3.5 sm:h-4 sm:w-4 mb-0.5 ${
            graveyardCount > 0
              ? 'text-[#D41C3B] drop-shadow-[0_0_6px_rgba(212,28,59,0.85)]'
              : 'text-[#6A7088]'
          }`}
        />
        <span className="relative z-10 font-sans text-[9px] sm:text-[10px] font-bold tabular-nums text-[#E8E8F0]">
          {graveyardCount}
        </span>
      </button>
      <span className="mt-0.5 font-serif text-[7px] sm:text-[8px] font-semibold tracking-widest text-[#8A8F9E] drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
        GRAVE
      </span>
    </div>
  );
}
