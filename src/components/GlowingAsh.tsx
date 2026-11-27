import type { CSSProperties } from 'react';

interface GlowingAshProps {
  active: boolean;
}

const EMBERS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: `${4 + ((i * 4.3) % 92)}%`,
  delay: `${(i % 7) * 0.35}s`,
  duration: `${2.2 + (i % 4) * 0.45}s`,
  size: i % 3 === 0 ? 4 : 2.5,
  drift: `${(i % 2 === 0 ? 1 : -1) * (10 + (i % 5) * 6)}px`,
  color: i % 3 === 0 ? '#FFBF00' : '#C41E3A',
}));

export function GlowingAsh({ active }: GlowingAshProps) {
  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-32 overflow-hidden"
    >
      {/* Smoldering crimson ash bed along bottom edge */}
      <div
        className="anim-ash-glow absolute inset-x-0 bottom-0 h-20"
        style={{
          background:
            'radial-gradient(ellipse 80% 100% at 50% 100%, rgba(196, 30, 58, 0.42) 0%, rgba(120, 14, 30, 0.18) 48%, transparent 80%)',
        }}
      />

      {/* Rising glowing ash embers */}
      {EMBERS.map((ember) => (
        <span
          key={ember.id}
          className="anim-ash-ember absolute bottom-1 rounded-full"
          style={
            {
              left: ember.left,
              width: `${ember.size}px`,
              height: `${ember.size}px`,
              backgroundColor: ember.color,
              boxShadow: `0 0 8px ${ember.color}`,
              animationDelay: ember.delay,
              animationDuration: ember.duration,
              '--ash-drift': ember.drift,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
