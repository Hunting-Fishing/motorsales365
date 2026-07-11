"use client";

import { cn } from "@/lib/utils";
import { motion, type AnimationProps } from "framer-motion";
import React from "react";

const animationProps: AnimationProps = {
  initial: { "--x": "100%", scale: 0.8 },
  animate: { "--x": "-100%", scale: 1 },
  whileTap: { scale: 0.95 },
  transition: {
    repeat: Infinity,
    repeatType: "loop",
    repeatDelay: 1,
    type: "spring",
    stiffness: 20,
    damping: 15,
    mass: 2,
    scale: {
      type: "spring",
      stiffness: 200,
      damping: 5,
      mass: 0.5,
    },
  },
} as AnimationProps;

interface ShinyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "primary" | "secondary" | "accent";
}

export function ShinyButton({
  children,
  className,
  variant = "default",
  ...props
}: ShinyButtonProps) {
  const variantStyles = {
    default: "bg-primary text-primary-foreground",
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    accent: "bg-accent text-accent-foreground",
  };

  return (
    <motion.button
      {...animationProps}
      {...(props as any)}
      className={cn(
        "relative rounded-lg px-6 py-2 font-medium backdrop-blur-xl transition-shadow duration-300 ease-in-out hover:shadow-lg",
        variantStyles[variant],
        className
      )}
    >
      <span
        className="relative block size-full text-sm uppercase tracking-wide"
        style={{
          maskImage:
            "linear-gradient(-75deg, hsl(var(--primary)) calc(var(--x) + 20%), transparent calc(var(--x) + 30%), hsl(var(--primary)) calc(var(--x) + 100%))",
        }}
      >
        {children}
      </span>
      <span
        style={{
          mask: "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box, linear-gradient(rgb(0,0,0), rgb(0,0,0))",
          maskComposite: "exclude",
        }}
        className="absolute inset-0 z-10 block rounded-[inherit] bg-[linear-gradient(-75deg,hsl(var(--primary)/10%)_calc(var(--x)+20%),hsl(var(--primary)/50%)_calc(var(--x)+25%),hsl(var(--primary)/10%)_calc(var(--x)+100%))] p-px"
      />
    </motion.button>
  );
}

// Simpler shimmer button variant
export function ShimmerButton({
  children,
  className,
  shimmerColor = "hsl(var(--primary))",
  shimmerSize = "0.1em",
  shimmerDuration = "2s",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  shimmerColor?: string;
  shimmerSize?: string;
  shimmerDuration?: string;
}) {
  return (
    <button
      className={cn(
        "relative overflow-hidden rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground transition-all hover:shadow-lg hover:shadow-primary/25",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent",
        className
      )}
      style={{
        ["--shimmer-color" as any]: shimmerColor,
        ["--shimmer-size" as any]: shimmerSize,
        animationDuration: shimmerDuration,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
