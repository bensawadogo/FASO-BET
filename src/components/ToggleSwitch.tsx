"use client";

import React from "react";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  ariaLabel: string;
}

export function ToggleSwitch({ checked, onChange, label, ariaLabel }: ToggleSwitchProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
          checked ? "bg-primary-container" : "bg-surface-container-highest"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full transition-transform duration-300 ${
            checked ? "translate-x-5 bg-primary" : "translate-x-[2px] bg-outline"
          }`}
        />
      </button>
      {label && (
        <span className="text-sm text-on-surface">{label}</span>
      )}
    </div>
  );
}
