import atlasUrl from '../assets/skill-icons/tide-skills.png';
import type { SkillId } from '../types/duel';

const ICON_INDEX: Record<SkillId, number> = {
  crimson_slash: 0,
  iron_wall: 1,
  phantom_step: 2,
  void_gaze: 3,
  blood_pact: 4,
  frozen_time: 5,
  mirror_shield: 6,
  chain_break: 7,
  soul_drain: 8,
  last_stand: 9,
};

/** Native-resolution, transparent pixel art by Dani Melich. */
export function SkillIcon({ id, className = '' }: { id: SkillId; className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-skill-icon={id}
      className={`tide-skill-icon ${className}`}
      style={{ backgroundImage: `url("${atlasUrl}")`, backgroundPosition: `${-32 * ICON_INDEX[id]}px 0px` }}
    />
  );
}
