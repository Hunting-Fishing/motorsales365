import React from 'react';

export function GradientOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#e85d3a] opacity-30 blur-3xl" />
      <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-[#4f46e5] opacity-25 blur-3xl" />
      <div className="absolute -top-10 right-10 h-72 w-72 rounded-full bg-[#f59e0b] opacity-15 blur-3xl" />
    </div>
  );
}
