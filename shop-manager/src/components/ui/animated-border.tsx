"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React from "react";

interface AnimatedBorderProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  borderRadius?: string;
  duration?: number;
  gradientColors?: string[];
  as?: React.ElementType;
}

export function AnimatedBorder({
  children,
  className,
  containerClassName,
  borderRadius = "1rem",
  duration = 3,
  gradientColors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "hsl(var(--primary))"],
  as: Component = "div",
}: AnimatedBorderProps) {
  const gradientString = gradientColors.join(", ");

  return (
    <Component
      className={cn(
        "relative p-[2px] overflow-hidden group",
        containerClassName
      )}
      style={{ borderRadius }}
    >
      {/* Animated gradient border */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{
          background: `linear-gradient(90deg, ${gradientString})`,
          backgroundSize: "300% 100%",
          borderRadius,
        }}
        animate={{
          backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      
      {/* Inner content */}
      <div
        className={cn(
          "relative z-10 bg-background",
          className
        )}
        style={{ borderRadius: `calc(${borderRadius} - 2px)` }}
      >
        {children}
      </div>
    </Component>
  );
}

// Variant with glow effect
export function AnimatedGlowBorder({
  children,
  className,
  containerClassName,
  borderRadius = "1rem",
  duration = 3,
  glowColor = "hsl(var(--primary))",
}: Omit<AnimatedBorderProps, 'gradientColors'> & { glowColor?: string }) {
  return (
    <div
      className={cn(
        "relative p-[2px] overflow-hidden group",
        containerClassName
      )}
      style={{ borderRadius }}
    >
      {/* Animated glow */}
      <motion.div
        className="absolute inset-0 z-0 opacity-75 blur-sm group-hover:opacity-100 transition-opacity"
        style={{
          background: `conic-gradient(from 0deg, ${glowColor}, transparent, ${glowColor})`,
          borderRadius,
        }}
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      
      {/* Border gradient */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{
          background: `conic-gradient(from 0deg, ${glowColor}, transparent 40%, transparent 60%, ${glowColor})`,
          borderRadius,
        }}
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      
      {/* Inner content */}
      <div
        className={cn(
          "relative z-10 bg-background",
          className
        )}
        style={{ borderRadius: `calc(${borderRadius} - 2px)` }}
      >
        {children}
      </div>
    </div>
  );
}
