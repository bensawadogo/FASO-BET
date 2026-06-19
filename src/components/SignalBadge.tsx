"use client";

import React from "react";

interface SignalBadgeProps {
  signal: "value_bet" | "neutral" | "avoid" | string;
}

export function SignalBadge({ signal }: SignalBadgeProps) {
  const config = {
    value_bet: {
      label: "Value Bet",
      classes: "bg-success/10 text-success border-success/20",
    },
    neutral: {
      label: "Neutre",
      classes: "bg-warning/10 text-warning border-warning/20",
    },
    avoid: {
      label: "À Éviter",
      classes: "bg-error/10 text-error border-error/20",
    },
  };

  const current = config[signal as keyof typeof config] || config.neutral;

  return (
    <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-tighter ${current.classes}`}>
      {current.label}
    </div>
  );
}
