import { SkillIcon } from './SkillIcon';
import { type RefObject, useState } from 'react';
import { motion, type PanInfo } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import { SkillCard } from '../types/duel';

interface SkillHandProps {
  hand: SkillCard[];
  vit: number;
  maxVit: number;
  isPlayerTurn: boolean;
  fieldSkill: SkillCard | null;
  disabled: boolean;
  skillZoneRef: RefObject<HTMLDivElement | null>;
  handContainerRef: RefObject<HTMLDivElement | null>;
  onDragStateChange: (isDragging: boolean) => void;
  onPlaySkillToField: (card: SkillCard) => void;
  onRemoveFieldSkill: () => void;
}

export function SkillHand({
  hand,
  vit,
  maxVit,
  isPlayerTurn,
  fieldSkill,
  disabled,
  skillZoneRef,
  handContainerRef,
  onDragStateChange,
  onPlaySkillToField,
  onRemoveFieldSkill,
}: SkillHandProps) {
  const [draggingUid, setDraggingUid] = useState<string | null>(null);
  const [hoveredUid, setHoveredUid] = useState<string | null>(null);
  const isLowVit = vit < maxVit * 0.2;

  const checkDropInSkillZone = (info: PanInfo): boolean => {
    const zoneEl = skillZoneRef.current;
    if (!zoneEl) return false;
    const rect = zoneEl.getBoundingClientRect();
    const pad = 34;
    const { x, y } = info.point;
    return (
      x >= rect.left - pad &&
      x <= rect.right + pad &&
      y >= rect.top - pad &&
      y <= rect.bottom + pad
    );
  };

  return (
    <section
      ref={handContainerRef}
      aria-label="Your Skill Hand"
      className="relative z-30 w-full flex flex-col items-center pb-0"
    >
      {isPlayerTurn && fieldSkill && !disabled && (
        <button
          type="button"
          onClick={onRemoveFieldSkill}
          className="stone-btn mb-1 inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-[11px] font-sans text-[#FFBF00] hover:text-[#E8E8F0] transition-colors cursor-pointer"
        >
          <Sparkles className="h-3 w-3" />
          <span>{fieldSkill.name} carved</span>
          <X className="h-3 w-3 ml-0.5" />
        </button>
      )}

      {hand.length === 0 ? (
        <div className="pb-4 pt-3 text-[11px] italic text-[#5B6075]">
          Hand empty — act with base stats
        </div>
      ) : (
        <div
          className={`hand-camera-tilt w-full flex items-end justify-start sm:justify-center px-4 pt-10 pb-0 -mt-6 tide-scroll ${
            draggingUid ? 'overflow-visible' : 'overflow-x-auto touch-pan-x'
          }`}
        >
          <div className="flex items-end mx-auto">
            {hand.map((card, idx) => {
              const isOnField = fieldSkill?.uid === card.uid;
              const canInteract =
                isPlayerTurn && !disabled && !isOnField && !fieldSkill;
              const lastStandInactive = card.id === 'last_stand' && !isLowVit;

              const mid = (hand.length - 1) / 2;
              const offset = idx - mid;
              const fanAngle = offset * 5.5;
              const fanArcY = Math.abs(offset) * 4;
              const isHovered = hoveredUid === card.uid;
              const isDraggingThis = draggingUid === card.uid;

              return (
                <motion.div
                  key={card.uid}
                  drag={canInteract}
                  dragSnapToOrigin
                  dragElastic={0.18}
                  dragMomentum={false}
                  onMouseEnter={() => setHoveredUid(card.uid)}
                  onMouseLeave={() =>
                    setHoveredUid((curr) => (curr === card.uid ? null : curr))
                  }
                  onTap={() => {
                    if (isOnField && !disabled) {
                      onRemoveFieldSkill();
                    } else if (canInteract) {
                      onPlaySkillToField(card);
                    }
                  }}
                  onDragStart={() => {
                    if (!canInteract) return;
                    setDraggingUid(card.uid);
                    onDragStateChange(true);
                  }}
                  onDragEnd={(_event, info) => {
                    setDraggingUid(null);
                    onDragStateChange(false);
                    if (canInteract && checkDropInSkillZone(info)) {
                      onPlaySkillToField(card);
                    }
                  }}
                  initial={false}
                  animate={{
                    rotate: isDraggingThis ? 0 : isHovered ? 0 : fanAngle,
                    y: isDraggingThis ? -32 : isHovered ? -30 : fanArcY,
                    scale: isDraggingThis ? 1.12 : isHovered ? 1.1 : 1,
                  }}
                  whileHover={
                    !isOnField
                      ? { y: -30, scale: 1.1, rotate: 0, transition: { duration: 0.16 } }
                      : undefined
                  }
                  whileTap={
                    canInteract
                      ? { y: -30, scale: 1.1, rotate: 0 }
                      : undefined
                  }
                  transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                  style={{
                    zIndex: isDraggingThis ? 60 : isHovered ? 45 : idx + 1,
                    boxShadow: isOnField
                      ? '0 0 24px rgba(218,165,62,0.55), inset 0 1px 0 rgba(255,232,175,0.45), inset 0 0 0 1px #DAA53E'
                      : canInteract
                      ? '0 -10px 28px rgba(0,0,0,0.98), 0 8px 18px rgba(0,0,0,0.96), inset 0 1px 0 rgba(255,255,255,0.2)'
                      : '0 -6px 18px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.08)',
                  }}
                  className={`iron-card-frame relative flex w-[114px] sm:w-[132px] shrink-0 flex-col justify-between rounded-t-[7px] px-2.5 pt-2.5 pb-5 text-left select-none min-h-[96px] sm:min-h-[108px] ${
                    idx > 0 ? '-ml-6 sm:-ml-4' : ''
                  } ${
                    isOnField
                      ? 'opacity-35 cursor-pointer border-[#DAA53E]'
                      : canInteract
                      ? 'cursor-grab active:cursor-grabbing border-[#5C637B]'
                      : 'opacity-45 cursor-not-allowed border-[#303546]'
                  }`}
                >
                  {/* Inner etched filigree border */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-[3px] rounded-t-[4px] border border-white/10"
                  />

                  <div className="relative z-10">
                    <div className="flex items-center gap-1.5 min-h-[32px]">
                      <SkillIcon id={card.id} />
                      <span className="min-w-0 font-serif text-[11px] sm:text-xs font-bold text-[#EDE6D6] leading-tight block drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                        {card.name}
                      </span>
                    </div>
                    <p className="mt-1 text-[9.5px] sm:text-[10px] leading-snug text-[#A8AEBE]">
                      {card.effect}
                    </p>
                  </div>

                  <div className="relative z-10 mt-1 flex items-center justify-between text-[9px] font-sans">
                    {lastStandInactive ? (
                      <span className="text-[#C41E3A] font-semibold">&lt;20% VIT</span>
                    ) : canInteract ? (
                      <span className="text-[#787F96]">Drag / Tap</span>
                    ) : (
                      <span className="text-[#5A6075]">
                        {isOnField ? 'ON FIELD' : 'LOCKED'}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
