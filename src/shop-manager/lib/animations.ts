// Centralized animation configuration for Framer Motion
import { Variants, Transition } from "framer-motion";

// === TRANSITION PRESETS ===
export const transitions = {
  spring: {
    type: "spring",
    stiffness: 400,
    damping: 30,
  } as Transition,
  springBouncy: {
    type: "spring",
    stiffness: 300,
    damping: 20,
  } as Transition,
  springGentle: {
    type: "spring",
    stiffness: 200,
    damping: 25,
  } as Transition,
  easeOut: {
    type: "tween",
    ease: "easeOut",
    duration: 0.3,
  } as Transition,
  easeInOut: {
    type: "tween",
    ease: "easeInOut",
    duration: 0.4,
  } as Transition,
};

// === FADE VARIANTS ===
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: transitions.easeOut,
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.spring,
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { duration: 0.2 },
  },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.spring,
  },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: transitions.spring,
  },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: transitions.spring,
  },
};

// === SCALE VARIANTS ===
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: transitions.springBouncy,
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 25,
    },
  },
};

// === STAGGER CONTAINERS ===
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
};

export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

// === STAGGER ITEMS ===
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.spring,
  },
};

export const staggerItemScale: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: transitions.springBouncy,
  },
};

// === PAGE TRANSITIONS ===
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: {
      duration: 0.2,
    },
  },
};

export const slideInFromRight: Variants = {
  initial: { opacity: 0, x: 50 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: transitions.spring,
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: { duration: 0.2 },
  },
};

// === HOVER ANIMATIONS ===
export const hoverScale = {
  scale: 1.02,
  transition: transitions.spring,
};

export const hoverScaleLarge = {
  scale: 1.05,
  transition: transitions.springBouncy,
};

export const tapScale = {
  scale: 0.98,
};

// === COLLAPSE/EXPAND ===
export const collapseVariants: Variants = {
  collapsed: { 
    height: 0, 
    opacity: 0,
    transition: {
      height: { duration: 0.3, ease: "easeInOut" },
      opacity: { duration: 0.2 },
    },
  },
  expanded: { 
    height: "auto", 
    opacity: 1,
    transition: {
      height: { duration: 0.3, ease: "easeInOut" },
      opacity: { duration: 0.3, delay: 0.1 },
    },
  },
};

// === LIST ANIMATIONS ===
export const listItem: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      ...transitions.spring,
    },
  }),
  exit: { 
    opacity: 0, 
    x: 10,
    transition: { duration: 0.15 },
  },
};

// === UTILITY FUNCTIONS ===
export const getStaggerDelay = (index: number, baseDelay = 0.05) => ({
  delay: index * baseDelay,
});

export const reducedMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};
