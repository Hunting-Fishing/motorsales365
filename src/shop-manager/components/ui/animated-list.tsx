"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence, Variants } from "framer-motion";
import React, { ReactNode, Children, isValidElement, cloneElement } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { staggerContainer, staggerItem, staggerItemScale } from "@/lib/animations";

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
  variant?: "slide" | "scale" | "fade";
  staggerDelay?: number;
  as?: React.ElementType;
}

// Framer Motion staggered list
export function AnimatedList({
  children,
  className,
  variant = "slide",
  staggerDelay = 0.05,
  as: Component = "div",
}: AnimatedListProps) {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Record<string, Variants> = {
    slide: {
      hidden: { opacity: 0, y: 20 },
      visible: { 
        opacity: 1, 
        y: 0,
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 24,
        },
      },
    },
    scale: {
      hidden: { opacity: 0, scale: 0.9 },
      visible: { 
        opacity: 1, 
        scale: 1,
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 20,
        },
      },
    },
    fade: {
      hidden: { opacity: 0 },
      visible: { 
        opacity: 1,
        transition: { duration: 0.3 },
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;
        
        return (
          <motion.div
            key={child.key || index}
            variants={itemVariants[variant]}
          >
            {child}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// Auto-animate list (for dynamic add/remove)
export function AutoAnimateList({
  children,
  className,
  as: Component = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: React.ElementType;
}) {
  const [parent] = useAutoAnimate();

  return (
    <Component ref={parent} className={className}>
      {children}
    </Component>
  );
}

// Grid variant with stagger
export function AnimatedGrid({
  children,
  className,
  staggerDelay = 0.05,
  columns = 3,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  columns?: number;
}) {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    },
  };

  return (
    <motion.div
      className={cn(
        "grid gap-4",
        className
      )}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;
        
        return (
          <motion.div key={child.key || index} variants={itemVariants}>
            {child}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// Single item with enter/exit animations
export function AnimatedItem({
  children,
  className,
  layoutId,
}: {
  children: ReactNode;
  className?: string;
  layoutId?: string;
}) {
  return (
    <motion.div
      layoutId={layoutId}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Presence wrapper for conditional rendering
export function AnimatedPresence({
  children,
  show,
  className,
}: {
  children: ReactNode;
  show: boolean;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
