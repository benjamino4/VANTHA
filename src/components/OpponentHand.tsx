import { CardBack } from './CardBack';

interface OpponentHandProps {
  count: number;
  isOpponentTurn: boolean;
}

export function OpponentHand({ count, isOpponentTurn }: OpponentHandProps) {
  return (
    <div
      aria-label={`Opponent hand: ${count} face-down cards`}
      className="relative z-20 w-full flex items-start justify-center pointer-events-none select-none min-h-[42px] sm:min-h-[50px]"
    >
      {count === 0 ? (
        <div className="pt-1 text-[10px] italic tracking-wider text-[#4A4F63]">
          Opponent hand empty
        </div>
      ) : (
        <div
          className="flex items-start justify-center -mt-3 sm:-mt-2"
          style={{
            transform: 'perspective(800px) rotateX(18deg)',
            transformOrigin: 'top center',
          }}
        >
          {Array.from({ length: count }).map((_, idx) => {
            const mid = (count - 1) / 2;
            const offset = idx - mid;
            const rotateDeg = -offset * 5;
            const arcY = -Math.abs(offset) * 2.5;

            return (
              <div
                key={idx}
                className={`transition-transform duration-300 ${
                  idx > 0 ? '-ml-5 sm:-ml-4' : ''
                }`}
                style={{
                  transform: `translateY(${arcY}px) rotate(${rotateDeg}deg)`,
                  zIndex: idx + 1,
                }}
              >
                <CardBack
                  compact
                  className={`h-[50px] w-[38px] sm:h-[60px] sm:w-[44px] ${
                    isOpponentTurn ? 'ring-1 ring-[#C41E3A]/60' : ''
                  }`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
