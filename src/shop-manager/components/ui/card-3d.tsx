"use client";

import { cn } from "@/lib/utils";
import React, { useRef, useState, MouseEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  rotationIntensity?: number;
  glareOpacity?: number;
  scale?: number;
}

export function Card3D({
  children,
  className,
  containerClassName,
  rotationIntensity = 10,
  glareOpacity = 0.2,
  scale = 1.02,
}: Card3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [`${rotationIntensity}deg`, `-${rotationIntensity}deg`]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [`-${rotationIntensity}deg`, `${rotationIntensity}deg`]);

  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["0%", "100%"]);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      animate={{
        scale: isHovered ? scale : 1,
      }}
      transition={{
        scale: { type: "spring", stiffness: 400, damping: 30 },
      }}
      className={cn(
        "relative rounded-xl",
        containerClassName
      )}
    >
      {/* Card content */}
      <div
        className={cn(
          "relative rounded-xl overflow-hidden",
          className
        )}
        style={{ transformStyle: "preserve-3d" }}
      >
        {children}
        
        {/* Glare effect */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{
            background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,${glareOpacity}), transparent 50%)`,
            opacity: isHovered ? 1 : 0,
          }}
          transition={{ opacity: { duration: 0.2 } }}
        />
      </div>
    </motion.div>
  );
}

// Simpler tilt card without glare
export function TiltCard({
  children,
  className,
  tiltAmount = 5,
}: {
  children: React.ReactNode;
  className?: string;
  tiltAmount?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [tiltAmount, -tiltAmount]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-tiltAmount, tiltAmount]), {
    stiffness: 300,
    damping: 30,
  });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={cn("transition-shadow hover:shadow-xl", className)}
    >
      {children}
    </motion.div>
  );
}
