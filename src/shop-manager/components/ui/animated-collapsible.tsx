"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import React, { createContext, useContext, useState, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

// Context for collapsible state
interface CollapsibleContextType {
  isOpen: boolean;
  toggle: () => void;
}

const CollapsibleContext = createContext<CollapsibleContextType | null>(null);

function useCollapsible() {
  const context = useContext(CollapsibleContext);
  if (!context) {
    throw new Error("Collapsible components must be used within AnimatedCollapsible");
  }
  return context;
}

// Main collapsible component
interface AnimatedCollapsibleProps {
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function AnimatedCollapsible({
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  className,
}: AnimatedCollapsibleProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  
  const toggle = () => {
    if (isControlled) {
      onOpenChange?.(!isOpen);
    } else {
      setInternalOpen(!isOpen);
    }
  };

  return (
    <CollapsibleContext.Provider value={{ isOpen, toggle }}>
      <div className={className}>{children}</div>
    </CollapsibleContext.Provider>
  );
}

// Trigger component
interface CollapsibleTriggerProps {
  children: ReactNode;
  className?: string;
  showChevron?: boolean;
  asChild?: boolean;
}

export function CollapsibleTrigger({
  children,
  className,
  showChevron = true,
  asChild = false,
}: CollapsibleTriggerProps) {
  const { isOpen, toggle } = useCollapsible();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: toggle,
      "aria-expanded": isOpen,
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "flex w-full items-center justify-between text-left",
        className
      )}
      aria-expanded={isOpen}
    >
      {children}
      {showChevron && (
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </motion.div>
      )}
    </button>
  );
}

// Content component with staggered children
interface CollapsibleContentProps {
  children: ReactNode;
  className?: string;
  staggerChildren?: boolean;
  staggerDelay?: number;
}

export function CollapsibleContent({
  children,
  className,
  staggerChildren = false,
  staggerDelay = 0.05,
}: CollapsibleContentProps) {
  const { isOpen } = useCollapsible();

  const containerVariants = {
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
        staggerChildren: staggerChildren ? staggerDelay : 0,
        delayChildren: 0.1,
      },
    },
  };

  const childVariants = {
    collapsed: { opacity: 0, x: -10 },
    expanded: { 
      opacity: 1, 
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    },
  };

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial="collapsed"
          animate="expanded"
          exit="collapsed"
          variants={containerVariants}
          className={cn("overflow-hidden", className)}
        >
          {staggerChildren ? (
            React.Children.map(children, (child, index) => {
              if (!React.isValidElement(child)) return child;
              return (
                <motion.div key={index} variants={childVariants}>
                  {child}
                </motion.div>
              );
            })
          ) : (
            children
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Convenience wrapper for sidebar navigation groups
interface NavGroupProps {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function AnimatedNavGroup({
  label,
  icon,
  children,
  defaultOpen = false,
  className,
}: NavGroupProps) {
  return (
    <AnimatedCollapsible defaultOpen={defaultOpen} className={className}>
      <CollapsibleTrigger className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors">
        <span className="flex items-center gap-2">
          {icon}
          {label}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent staggerChildren className="pl-4 mt-1 space-y-1">
        {children}
      </CollapsibleContent>
    </AnimatedCollapsible>
  );
}
