"use client";

import { cn } from "@/lib/utils";
import React, { useRef, useState, useCallback } from "react";

interface SpotlightProps {
  children: React.ReactNode;
  className?: string;
  spotlightClassName?: string;
  size?: number;
  color?: string;
}

export function Spotlight({
  children,
  className,
  spotlightClassName,
  size = 400,
  color = "hsl(var(--primary))",
}: SpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setOpacity(1);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setOpacity(0);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn("relative overflow-hidden", className)}
    >
      {/* Spotlight effect */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-300",
          spotlightClassName
        )}
        style={{
          opacity,
          background: `radial-gradient(${size}px circle at ${position.x}px ${position.y}px, ${color}15, transparent 40%)`,
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// Border spotlight variant - light follows border
export function SpotlightBorder({
  children,
  className,
  borderWidth = 1,
  color = "hsl(var(--primary))",
}: {
  children: React.ReactNode;
  className?: string;
  borderWidth?: number;
  color?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={cn("relative rounded-xl p-px", className)}
      style={{
        background: `radial-gradient(200px circle at ${position.x}px ${position.y}px, ${color}, transparent 40%)`,
      }}
    >
      {/* Border glow */}
      <div
        className="absolute inset-0 rounded-xl transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(300px circle at ${position.x}px ${position.y}px, ${color}30, transparent 40%)`,
        }}
      />
      
      {/* Inner content */}
      <div className="relative rounded-[11px] bg-background p-4">
        {children}
      </div>
    </div>
  );
}

// Card with spotlight on hover
export function SpotlightCard({
  children,
  className,
  spotlightColor = "hsl(var(--primary))",
}: {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}) {
  return (
    <Spotlight
      className={cn(
        "rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/50",
        className
      )}
      color={spotlightColor}
      size={300}
    >
      {children}
    </Spotlight>
  );
}
