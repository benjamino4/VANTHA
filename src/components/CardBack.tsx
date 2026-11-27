interface CardBackProps {
  className?: string;
  compact?: boolean;
}

export function CardBack({ className = '', compact = false }: CardBackProps) {
  return (
    <div
      className={`tarot-back-pattern relative overflow-hidden rounded-[6px] border-[2px] border-[#4A3B3E] flex items-center justify-center select-none ${className}`}
      style={{
        boxShadow:
          '0 10px 22px rgba(0,0,0,0.98), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 0 16px rgba(0,0,0,0.95), inset 0 0 0 1px rgba(196, 30, 58, 0.35)',
      }}
    >
      {/* Ornate Tarot Double Filigree Frame */}
      <div className="pointer-events-none absolute inset-[3px] rounded-[3px] border border-[#96283B]/55" />
      <div className="pointer-events-none absolute inset-[6px] rounded-[2px] border border-[#5B202C]/45" />

      {/* Corner Tarot Diamonds */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1.5 left-1.5 h-1.5 w-1.5 rotate-45 border border-[#C41E3A]/60"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1.5 right-1.5 h-1.5 w-1.5 rotate-45 border border-[#C41E3A]/60"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1.5 left-1.5 h-1.5 w-1.5 rotate-45 border border-[#C41E3A]/60"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rotate-45 border border-[#C41E3A]/60"
      />

      {/* Glowing Crimson Eye Sigil */}
      <svg
        viewBox="0 0 48 48"
        className={`relative z-10 ${compact ? 'h-5 w-5 sm:h-6 sm:w-6' : 'h-8 w-8'}`}
        style={{
          filter: 'drop-shadow(0 0 8px rgba(212, 28, 59, 0.95))',
        }}
        aria-hidden="true"
      >
        <circle
          cx="24"
          cy="24"
          r="18"
          fill="none"
          stroke="#C41E3A"
          strokeOpacity="0.35"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        <path
          d="M24 3 L41 24 L24 45 L7 24 Z"
          fill="none"
          stroke="#C41E3A"
          strokeOpacity="0.55"
          strokeWidth="1.2"
        />
        <path
          d="M8 24 Q24 11 40 24 Q24 37 8 24 Z"
          fill="#12060A"
          stroke="#E53552"
          strokeWidth="1.6"
        />
        <circle cx="24" cy="24" r="5.5" fill="#C41E3A" />
        <ellipse cx="24" cy="24" rx="1.6" ry="4.5" fill="#050608" />
        <circle cx="26" cy="22" r="1.1" fill="#FFD6DC" opacity="0.92" />
      </svg>
    </div>
  );
}
