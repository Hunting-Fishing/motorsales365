import React from "react";
import { SmoothScroll } from "./SmoothScroll";
import { KeyboardShortcuts } from "./KeyboardShortcuts";

export function GlobalUX() {
  return (
    <>
      <SmoothScroll />
      <KeyboardShortcuts />
    </>
  );
}
