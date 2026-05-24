"use client";

type Step = "idle" | "collector" | "statistician" | "strategist" | "done" | "error";

const STEPS: { key: Step; label: string; num: number }[] = [
  { key: "collector", label: "Collecteur", num: 1 },
  { key: "statistician", label: "Statisticien", num: 2 },
  { key: "strategist", label: "Stratège", num: 3 },
];

function stepIndex(step: Step): number {
  if (step === "idle") return -1;
  if (step === "collector") return 0;
  if (step === "statistician") return 1;
  if (step === "strategist") return 2;
  if (step === "done") return 3;
  return -1;
}

export function PipelineStatus({
  step,
  errorAgent,
  errorMessage,
}: {
  step: Step;
  errorAgent?: number;
  errorMessage?: string;
}) {
  const current = stepIndex(step);
  const loading = step !== "idle" && step !== "done" && step !== "error";

  return (
    <div className="glass p-4 mb-6">
      <p className="text-sm text-white/60 mb-3">Pipeline FASO BET</p>
      <div className="flex flex-wrap gap-4">
        {STEPS.map((s, i) => {
          const active = current === i && loading;
          const done = current > i || step === "done";
          const failed = step === "error" && errorAgent === s.num;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${
                  failed
                    ? "border-danger bg-danger/20 text-danger"
                    : done
                      ? "border-success bg-success/20 text-success"
                      : active
                        ? "border-accent bg-accent/20 text-accent animate-pulse"
                        : "border-white/20 text-white/40"
                }`}
              >
                {failed ? "!" : done ? "✓" : s.num}
              </div>
              <span
                className={
                  active || done
                    ? "text-white font-medium"
                    : "text-white/50"
                }
              >
                Agent {s.num} — {s.label}
              </span>
            </div>
          );
        })}
      </div>
      {step === "error" && errorMessage && (
        <p className="mt-3 text-sm text-danger">
          Erreur Agent {errorAgent} : {errorMessage}
        </p>
      )}
    </div>
  );
}
