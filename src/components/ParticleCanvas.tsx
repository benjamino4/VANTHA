import { useEffect, useRef } from 'react';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface BurstTrigger {
  id: number;
  colorA: string;
  colorB: string;
  intensity: number;
}

interface ParticleCanvasProps {
  burst: BurstTrigger | null;
}

const POOL_SIZE = 120;

export function ParticleCanvas({ burst }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Pre-allocated particle object pool — reused across all bursts without GC churn
  const poolRef = useRef<Particle[]>(
    Array.from({ length: POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 2,
      life: 0,
      maxLife: 0.5,
      color: '#E8E8F0',
    }))
  );
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    if (!burst) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const width = parent ? parent.clientWidth : 360;
    const height = parent ? parent.clientHeight : 240;
    const cx = width * 0.5;
    const cy = height * 0.48;

    const pool = poolRef.current;
    const count = Math.min(POOL_SIZE, Math.max(36, burst.intensity * 12));
    let spawned = 0;

    for (let i = 0; i < POOL_SIZE && spawned < count; i++) {
      const p = pool[i];
      if (!p.active) {
        const angle = (Math.PI * 2 * spawned) / count + (Math.random() - 0.5) * 0.45;
        const speed = 90 + Math.random() * 230;
        p.active = true;
        p.x = cx + (Math.random() - 0.5) * 18;
        p.y = cy + (Math.random() - 0.5) * 18;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed - 20;
        p.size = 2 + Math.random() * 3.5;
        p.life = 0;
        p.maxLife = 0.36 + Math.random() * 0.16; // ~0.5s burst
        p.color = spawned % 2 === 0 ? burst.colorA : burst.colorB;
        spawned++;
      }
    }

    const step = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min(0.05, (timestamp - lastTimeRef.current) / 1000);
      lastTimeRef.current = timestamp;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      let anyActive = false;
      for (let i = 0; i < POOL_SIZE; i++) {
        const p = pool[i];
        if (!p.active) continue;
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }
        anyActive = true;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.94;
        p.vy = p.vy * 0.94 + 140 * dt;

        const alpha = 1 - p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      if (anyActive) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        lastTimeRef.current = 0;
        ctx.clearRect(0, 0, width, height);
      }
    };

    if (rafRef.current === null) {
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(step);
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [burst]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 h-full w-full"
    />
  );
}
