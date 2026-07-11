"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface NumberTickerProps {
  value: number;
  direction?: "up" | "down";
  delay?: number;
  className?: string;
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
  formatFn?: (value: number) => string;
}

export function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  prefix = "",
  suffix = "",
  formatFn,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === "down" ? value : 0);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });
  const [displayValue, setDisplayValue] = useState(direction === "down" ? value : 0);

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        motionValue.set(direction === "down" ? 0 : value);
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [motionValue, isInView, delay, value, direction]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      setDisplayValue(latest);
    });
    return unsubscribe;
  }, [springValue]);

  const formattedValue = formatFn 
    ? formatFn(displayValue)
    : displayValue.toFixed(decimalPlaces);

  return (
    <span
      ref={ref}
      className={cn(
        "inline-block tabular-nums tracking-tight",
        className
      )}
    >
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
}

// Convenience components for common use cases
export function CurrencyTicker({ 
  value, 
  className,
  delay = 0,
}: { 
  value: number; 
  className?: string;
  delay?: number;
}) {
  return (
    <NumberTicker
      value={value}
      delay={delay}
      className={className}
      formatFn={(v) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(v)}
    />
  );
}

export function PercentTicker({ 
  value, 
  className,
  delay = 0,
  decimalPlaces = 1,
}: { 
  value: number; 
  className?: string;
  delay?: number;
  decimalPlaces?: number;
}) {
  return (
    <NumberTicker
      value={value}
      delay={delay}
      className={className}
      decimalPlaces={decimalPlaces}
      suffix="%"
    />
  );
}
