"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { pageTransition, fadeIn, fadeInUp } from "@/lib/animations";

interface AnimatedPageProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "fade" | "slideUp" | "none";
}

export function AnimatedPage({ 
  children, 
  className,
  variant = "default" 
}: AnimatedPageProps) {
  const location = useLocation();
  
  const variants = {
    default: pageTransition,
    fade: fadeIn,
    slideUp: fadeInUp,
    none: {
      initial: {},
      animate: {},
      exit: {},
    },
  };

  const selectedVariant = variants[variant];

  return (
    <motion.div
      key={location.pathname}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={selectedVariant}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Wrapper for AnimatePresence at the router level
export function AnimatedRoutes({ children }: { children: ReactNode }) {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={location.pathname}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Simple fade wrapper for sections
export function FadeIn({ 
  children, 
  delay = 0,
  className,
}: { 
  children: ReactNode; 
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, 
        delay,
        ease: "easeOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Slide in from side
export function SlideIn({ 
  children, 
  direction = "left",
  delay = 0,
  className,
}: { 
  children: ReactNode; 
  direction?: "left" | "right" | "up" | "down";
  delay?: number;
  className?: string;
}) {
  const directionMap = {
    left: { x: -20, y: 0 },
    right: { x: 20, y: 0 },
    up: { x: 0, y: -20 },
    down: { x: 0, y: 20 },
  };

  const offset = directionMap[direction];

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ 
        duration: 0.3, 
        delay,
        type: "spring",
        stiffness: 300,
        damping: 30,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scale in animation
export function ScaleIn({ 
  children, 
  delay = 0,
  className,
}: { 
  children: ReactNode; 
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: 0.2, 
        delay,
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
