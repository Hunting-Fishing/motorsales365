import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ParticlesProps {
  className?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  size?: number;
  color?: string;
  refresh?: boolean;
}

/**
 * MagicUI Particles — lightweight canvas particle field for hero backdrops.
 */
export const Particles: React.FC<ParticlesProps> = ({
  className,
  quantity = 80,
  staticity = 50,
  ease = 50,
  size = 0.6,
  color = 'hsl(217 91% 60%)',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    const particles = Array.from({ length: quantity }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      tx: Math.random() * width,
      ty: Math.random() * height,
      r: Math.random() * size + 0.4,
      a: Math.random() * 0.5 + 0.2,
      dx: 0,
      dy: 0,
    }));

    const onMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = e.clientY - rect.top;
    };
    canvas.addEventListener('mousemove', onMouse);
    window.addEventListener('resize', resize);

    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        // drift toward target
        p.tx += (Math.random() - 0.5) * 0.3;
        p.ty += (Math.random() - 0.5) * 0.3;
        const ddx = (p.tx - p.x) / staticity;
        const ddy = (p.ty - p.y) / staticity;
        p.dx = (p.dx + ddx) / 2;
        p.dy = (p.dy + ddy) / 2;
        p.x += p.dx;
        p.y += p.dy;

        // mouse repel
        const mdx = p.x - mouse.current.x;
        const mdy = p.y - mouse.current.y;
        const dist = Math.hypot(mdx, mdy);
        if (dist < 80 && dist > 0) {
          p.x += (mdx / dist) * (1 - dist / 80) * ease * 0.04;
          p.y += (mdy / dist) * (1 - dist / 80) * ease * 0.04;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = color.replace(')', ` / ${p.a})`).replace('hsl(', 'hsla(');
        ctx.fill();
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize', resize);
    };
  }, [quantity, staticity, ease, size, color]);

  return <canvas ref={canvasRef} className={cn('pointer-events-auto', className)} aria-hidden="true" />;
};
