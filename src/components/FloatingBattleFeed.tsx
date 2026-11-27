import { BattleLogEntry, LogCategory } from '../types/duel';

export interface FloatingMessage {
  id: string;
  category: LogCategory;
  message: string;
}

interface FloatingBattleFeedProps {
  messages: FloatingMessage[];
}

const CATEGORY_CLASSES: Record<LogCategory, string> = {
  HIT: 'text-[#FF4D6A] drop-shadow-[0_2px_12px_rgba(196,30,58,0.85)]',
  MISS: 'text-[#A0A5B8] drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]',
  SKILL: 'text-[#FFBF00] drop-shadow-[0_2px_12px_rgba(255,191,0,0.65)]',
  DEATH: 'text-[#C41E3A] font-bold drop-shadow-[0_2px_14px_rgba(196,30,58,0.95)]',
  SYSTEM: 'text-[#E8E8F0] font-serif tracking-widest drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]',
};

export function FloatingBattleFeed({ messages }: FloatingBattleFeedProps) {
  if (messages.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 top-1/2 z-40 -translate-y-1/2 flex flex-col items-center gap-1.5 px-4"
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`anim-drift-message max-w-md text-center text-xs sm:text-sm font-medium tracking-wide px-3 py-1 rounded bg-black/65 backdrop-blur-[2px] ${CATEGORY_CLASSES[msg.category]}`}
        >
          {msg.message}
        </div>
      ))}
    </div>
  );
}

export function pickDisplayLogs(entries: BattleLogEntry[]): FloatingMessage[] {
  const resolved = entries.find((e) => e.message.includes('RESOLVED'));
  const impactful = entries.filter(
    (e) =>
      e.category === 'HIT' ||
      e.category === 'SKILL' ||
      e.category === 'DEATH' ||
      e.category === 'MISS'
  );
  const picked = impactful.slice(-2);
  if (resolved) {
    picked.push(resolved);
  }
  const source = picked.length > 0 ? picked : entries.slice(-1);
  return source.map((e) => ({
    id: e.id,
    category: e.category,
    message: e.message,
  }));
}
