"use client";

import React from 'react';

type SignalType = "VALUE" | "HIGH" | "MEDIUM" | "LOW" | "avoid" | "back" | "lay";

export function SignalBadge({ type, signal }: { type?: SignalType; signal?: SignalType }) {
  // Support both old API (signal prop) and new API (type prop)
  const signalType = type || signal || "VALUE";
  
  const config: Record<string, { label: string; classes: string }> = {
    VALUE:   { label: "VALUE BET", classes: "bg-primary/15 text-primary border-primary/30" },
    HIGH:    { label: "HIGH",     classes: "bg-success/10 text-success border-success/20" },
    MEDIUM:  { label: "MEDIUM",   classes: "bg-primary/10 text-primary border-primary/20" },
    LOW:     { label: "LOW",      classes: "bg-warning/10 text-warning border-warning/20" },
    back:    { label: "BACK",     classes: "bg-success/10 text-success border-success/20" },
    lay:     { label: "LAY",      classes: "bg-error/10 text-error border-error/20" },
    avoid:   { label: "AVOID",    classes: "bg-on-surface-variant/10 text-on-surface-variant border-on-surface-variant/20" },
  };

  const { label, classes } = config[signalType] || config.VALUE;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full border font-data-label text-[10px] uppercase tracking-widest ${classes}`}>
      {label}
    </span>
  );
}