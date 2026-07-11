"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";

interface BackgroundBeamsProps {
  className?: string;
  children?: React.ReactNode;
}

export function BackgroundBeams({ className, children }: BackgroundBeamsProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      return () => container.removeEventListener("mousemove", handleMouseMove);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden bg-background",
        className
      )}
    >
      {/* SVG Beams */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient
            id="beam-gradient"
            cx="50%"
            cy="50%"
            r="50%"
            fx={`${(mousePosition.x / (containerRef.current?.offsetWidth || 1)) * 100}%`}
            fy={`${(mousePosition.y / (containerRef.current?.offsetHeight || 1)) * 100}%`}
          >
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity="0.1" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          
          <linearGradient id="beam-line-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          
          <linearGradient id="beam-line-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        
        {/* Animated beam lines */}
        <g className="animate-pulse">
          <line
            x1="0"
            y1="0"
            x2="100%"
            y2="100%"
            stroke="url(#beam-line-1)"
            strokeWidth="1"
            className="opacity-50"
          />
          <line
            x1="100%"
            y1="0"
            x2="0"
            y2="100%"
            stroke="url(#beam-line-2)"
            strokeWidth="1"
            className="opacity-50"
          />
          <line
            x1="50%"
            y1="0"
            x2="50%"
            y2="100%"
            stroke="url(#beam-line-1)"
            strokeWidth="0.5"
            className="opacity-30"
          />
          <line
            x1="0"
            y1="50%"
            x2="100%"
            y2="50%"
            stroke="url(#beam-line-2)"
            strokeWidth="0.5"
            className="opacity-30"
          />
        </g>
        
        {/* Mouse-following gradient overlay */}
        <rect
          width="100%"
          height="100%"
          fill="url(#beam-gradient)"
          className="transition-all duration-300 ease-out"
        />
      </svg>
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// Simpler static beams variant
export function StaticBeams({ className, children }: BackgroundBeamsProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-50">
          {/* Beam 1 */}
          <div
            className="absolute left-1/4 top-0 h-[500px] w-px rotate-[35deg] bg-gradient-to-b from-transparent via-primary/40 to-transparent"
            style={{ animationDelay: "0s" }}
          />
          {/* Beam 2 */}
          <div
            className="absolute left-1/2 top-0 h-[600px] w-px rotate-[25deg] bg-gradient-to-b from-transparent via-accent/30 to-transparent animate-pulse"
            style={{ animationDelay: "0.5s" }}
          />
          {/* Beam 3 */}
          <div
            className="absolute left-3/4 top-0 h-[400px] w-px rotate-[45deg] bg-gradient-to-b from-transparent via-primary/20 to-transparent animate-pulse"
            style={{ animationDelay: "1s" }}
          />
          {/* Beam 4 */}
          <div
            className="absolute right-1/4 top-0 h-[550px] w-px -rotate-[30deg] bg-gradient-to-b from-transparent via-secondary/30 to-transparent animate-pulse"
            style={{ animationDelay: "1.5s" }}
          />
        </div>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
