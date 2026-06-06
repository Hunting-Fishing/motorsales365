"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

type PressableTooltipProps = {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
};

export function PressableTooltip({
  children,
  content,
  side = "top",
}: PressableTooltipProps) {
  const [open, setOpen] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);
  const touchStartedRef = React.useRef(false);
  const isTouch = React.useRef(false);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch") {
        isTouch.current = true;
        touchStartedRef.current = true;
        timerRef.current = window.setTimeout(() => {
          setOpen(true);
          touchStartedRef.current = false;
        }, 400);
      }
    },
    []
  );

  const handlePointerUp = React.useCallback(() => {
    clearTimer();
    touchStartedRef.current = false;
  }, [clearTimer]);

  const handleClick = React.useCallback(() => {
    // Toggle on tap for touch devices; ignore on desktop (hover handles it)
    if (isTouch.current || "ontouchstart" in window || navigator.maxTouchPoints > 0) {
      setOpen((prev) => !prev);
    }
  }, []);

  // Auto-close after a few seconds so the tooltip doesn't linger
  React.useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => setOpen(false), 3500);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <Tooltip open={open} onOpenChange={setOpen} delayDuration={150}>
      <TooltipTrigger asChild>
        <span
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onClick={handleClick}
          className="inline-block"
          style={{
            WebkitTapHighlightColor: "transparent",
            userSelect: "none",
            touchAction: "manipulation",
          }}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </Tooltip>
  );
}
