import React, { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface MagicCardProps {
  children: React.ReactNode;
  className?: string;
  gradientSize?: number;
  gradientColor?: string;
  gradientOpacity?: number;
}

/**
 * MagicUI MagicCard — a spotlight that follows the cursor and highlights the border on hover.
 */
export const MagicCard: React.FC<MagicCardProps> = ({
  children,
  className,
  gradientSize = 200,
  gradientColor = 'hsl(var(--primary) / 0.18)',
  gradientOpacity = 0.8,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -gradientSize, y: -gradientSize });
  const [hovered, setHovered] = useState(false);

  const handleMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn('group relative overflow-hidden rounded-2xl border border-border bg-card', className)}
    >
      <div
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(${gradientSize}px circle at ${pos.x}px ${pos.y}px, ${gradientColor}, transparent 70%)`,
          opacity: hovered ? gradientOpacity : 0,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
};
