import type { Signal } from "@/types/agent3.types";

const CONFIG: Record<
  Signal,
  { label: string; emoji: string; className: string }
> = {
  value_bet: {
    label: "VALUE BET",
    emoji: "✅",
    className: "bg-success/20 text-success border-success/40",
  },
  neutral: {
    label: "NEUTRE",
    emoji: "⚠️",
    className: "bg-warning/20 text-warning border-warning/40",
  },
  avoid: {
    label: "ÉVITER",
    emoji: "❌",
    className: "bg-danger/20 text-danger border-danger/40",
  },
};

export function SignalBadge({ signal }: { signal: Signal }) {
  const c = CONFIG[signal];
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${c.className}`}
    >
      <span>{c.emoji}</span>
      {c.label}
    </span>
  );
}
