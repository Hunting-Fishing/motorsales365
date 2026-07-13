"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React from "react";

interface MovingBorderProps {
  children: React.ReactNode;
  duration?: number;
  className?: string;
  containerClassName?: string;
  borderRadius?: string;
  colors?: string[];
  as?: React.ElementType;
}

export function MovingBorder({
  children,
  duration = 2000,
  className,
  containerClassName,
  borderRadius = "1rem",
  colors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))"],
  as: Component = "div",
}: MovingBorderProps) {
  return (
    <Component
      className={cn(
        "relative overflow-hidden p-[2px]",
        containerClassName
      )}
      style={{ borderRadius }}
    >
      {/* Moving border animation */}
      <div
        className="absolute inset-0"
        style={{ borderRadius }}
      >
        <motion.div
          className="absolute h-[200%] w-[200%]"
          style={{
            background: `conic-gradient(from 0deg, ${colors.join(", ")}, ${colors[0]})`,
            top: "-50%",
            left: "-50%",
          }}
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: duration / 1000,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
      
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

// Button variant with moving border
export function MovingBorderButton({
  children,
  className,
  duration = 2000,
  borderRadius = "0.5rem",
  colors,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & Omit<MovingBorderProps, "as">) {
  return (
    <MovingBorder
      as="button"
      duration={duration}
      borderRadius={borderRadius}
      colors={colors}
      containerClassName="group"
      className={cn(
        "px-4 py-2 font-medium transition-colors hover:bg-muted/50",
        className
      )}
      {...props}
    >
      {children}
    </MovingBorder>
  );
}

// Card variant with moving border
export function MovingBorderCard({
  children,
  className,
  duration = 3000,
  borderRadius = "1rem",
  colors,
}: Omit<MovingBorderProps, "as">) {
  return (
    <MovingBorder
      duration={duration}
      borderRadius={borderRadius}
      colors={colors}
      className={cn("p-6", className)}
    >
      {children}
    </MovingBorder>
  );
}

// Subtle pulse border variant
export function PulseBorder({
  children,
  className,
  containerClassName,
  borderRadius = "1rem",
  color = "hsl(var(--primary))",
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  borderRadius?: string;
  color?: string;
}) {
  return (
    <div
      className={cn("relative p-[1px]", containerClassName)}
      style={{ borderRadius }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          borderRadius,
          border: `1px solid ${color}`,
        }}
        animate={{
          opacity: [0.5, 1, 0.5],
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <div
        className={cn("relative bg-background", className)}
        style={{ borderRadius: `calc(${borderRadius} - 1px)` }}
      >
        {children}
      </div>
    </div>
  );
}
