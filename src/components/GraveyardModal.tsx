import { SkillIcon } from './SkillIcon';
import { useEffect, useState } from 'react';
import { Ban, Skull, X } from 'lucide-react';
import { GraveyardEntry } from '../types/duel';

export type GraveyardFilter = 'ALL' | 'A' | 'B';

interface GraveyardModalProps {
  open: boolean;
  entries: GraveyardEntry[];
  initialFilter?: GraveyardFilter;
  onClose: () => void;
}

export function GraveyardModal({
  open,
  entries,
  initialFilter = 'ALL',
  onClose,
}: GraveyardModalProps) {
  const [filter, setFilter] = useState<GraveyardFilter>(initialFilter);

  useEffect(() => {
    if (open) {
      setFilter(initialFilter);
    }
  }, [open, initialFilter]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const countA = entries.filter((e) => e.owner === 'A').length;
  const countB = entries.filter((e) => e.owner === 'B').length;

  const filtered =
    filter === 'ALL' ? entries : entries.filter((e) => e.owner === filter);
  const ordered = [...filtered].reverse();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Graveyard"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-[2px] p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-md bg-[#14161F]/95 border border-[#2C3145] p-5 space-y-4 shadow-[0_0_48px_rgba(0,0,0,0.98)]"
      >
        <div className="flex items-center justify-between border-b border-[#242838] pb-3">
          <div className="flex items-center gap-2 text-[#C41E3A]">
            <Skull className="h-4 w-4" />
            <h2 className="font-serif text-sm font-bold tracking-widest text-[#E8E8F0]">
              GRAVEYARD ({entries.length})
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Graveyard"
            className="h-8 w-8 inline-flex items-center justify-center rounded-full text-[#8A8FA6] hover:text-[#E8E8F0] hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Clean Underline Tabs: ALL / YOURS / FOE */}
        <div className="flex items-center gap-5 border-b border-[#202434] text-[11px] font-sans font-semibold tracking-wider">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`pb-2 border-b-2 transition-colors cursor-pointer ${
              filter === 'ALL'
                ? 'border-[#E8E8F0] text-[#E8E8F0]'
                : 'border-transparent text-[#6E7389] hover:text-[#A4A9BE]'
            }`}
          >
            ALL ({entries.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('A')}
            className={`pb-2 border-b-2 transition-colors cursor-pointer ${
              filter === 'A'
                ? 'border-[#FFBF00] text-[#FFBF00]'
                : 'border-transparent text-[#6E7389] hover:text-[#A4A9BE]'
            }`}
          >
            YOURS ({countA})
          </button>
          <button
            type="button"
            onClick={() => setFilter('B')}
            className={`pb-2 border-b-2 transition-colors cursor-pointer ${
              filter === 'B'
                ? 'border-[#C41E3A] text-[#FF4D6A]'
                : 'border-transparent text-[#6E7389] hover:text-[#A4A9BE]'
            }`}
          >
            FOE ({countB})
          </button>
        </div>

        {ordered.length === 0 ? (
          <div className="py-10 text-center space-y-1.5">
            <p className="text-xs italic text-[#7C8199]">
              No skill cards in this graveyard yet.
            </p>
            <p className="text-[11px] text-[#565B72]">
              Played skill cards resolve and fly here at the end of the turn.
            </p>
          </div>
        ) : (
          <ul className="max-h-[52vh] overflow-y-auto tide-scroll space-y-2 pr-1">
            {ordered.map((entry) => (
              <li
                key={entry.id}
                className="rounded border border-[#252A3C] bg-[#0B0D13]/90 px-3 py-2.5 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <SkillIcon id={entry.card.id} />
                    <span
                      className={`text-[10px] font-sans font-bold tracking-wider ${
                        entry.owner === 'A' ? 'text-[#FFBF00]' : 'text-[#FF4D6A]'
                      }`}
                    >
                      {entry.owner === 'A' ? 'YOU' : 'FOE'}
                    </span>
                    <span className="font-serif text-xs sm:text-sm font-bold text-[#E8E8F0] truncate">
                      {entry.card.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-[10px] font-sans tabular-nums text-[#7C8199]">
                    {entry.cancelled && (
                      <span className="inline-flex items-center gap-0.5 text-[#C41E3A] font-semibold">
                        <Ban className="h-2.5 w-2.5" />
                        CANCELLED
                      </span>
                    )}
                    <span>R{String(entry.round).padStart(2, '0')}</span>
                  </div>
                </div>

                <p className="text-[11px] leading-snug text-[#9CA3B8]">
                  {entry.card.effect}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
