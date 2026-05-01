import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { FlaskConical, Sliders, X } from "lucide-react";
import type { SimOptions } from "@/server/aqi";

interface Props {
  forceSim: boolean;
  onForceSim: (v: boolean) => void;
  options: SimOptions;
  onChange: (o: SimOptions) => void;
}

const SCENARIOS: Array<{ id: NonNullable<SimOptions["scenario"]>; label: string; emoji: string }> = [
  { id: "normal", label: "Normal", emoji: "🌤️" },
  { id: "rush", label: "Rush hour", emoji: "🚗" },
  { id: "calm", label: "Calm night", emoji: "🌙" },
  { id: "wildfire", label: "Wildfire", emoji: "🔥" },
  { id: "diwali", label: "Diwali", emoji: "🎆" },
];

export function SimulationControls({ forceSim, onForceSim, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const intensity = options.intensity ?? 1;
  const wind = options.windKmh ?? 8;
  const scenario = options.scenario ?? "normal";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
          forceSim
            ? "border-amber-400/40 bg-amber-500/15 text-amber-200 shadow-[0_0_20px_-5px_oklch(0.85_0.15_75_/_0.6)]"
            : "border-white/10 bg-black/30 text-muted-foreground hover:border-white/20 hover:bg-white/5"
        }`}
        title="Simulation Lab"
      >
        <FlaskConical className={`h-3.5 w-3.5 ${forceSim ? "animate-pulse" : ""}`} />
        <span className="uppercase tracking-wider">Sim Lab</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-30"
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-[calc(100%+8px)] z-40 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[oklch(0.13_0.03_260)]/95 p-4 shadow-2xl backdrop-blur-xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="h-3.5 w-3.5 text-amber-300" />
                  <span className="text-xs font-semibold uppercase tracking-[0.16em]">Simulation Lab</span>
                </div>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <label className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/30 px-3 py-2">
                <div>
                  <div className="text-xs font-semibold">Force simulation</div>
                  <div className="text-[10px] text-muted-foreground">Override live feed</div>
                </div>
                <input
                  type="checkbox"
                  checked={forceSim}
                  onChange={(e) => onForceSim(e.target.checked)}
                  className="h-4 w-4 accent-amber-400"
                />
              </label>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>Pollution intensity</span>
                  <span className="text-mono font-semibold text-amber-200">{intensity.toFixed(2)}×</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="2.5"
                  step="0.05"
                  value={intensity}
                  onChange={(e) => onChange({ ...options, intensity: Number(e.target.value) })}
                  className="w-full accent-amber-400"
                />
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>Wind speed</span>
                  <span className="text-mono font-semibold text-cyan-200">{wind} km/h</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="1"
                  value={wind}
                  onChange={(e) => onChange({ ...options, windKmh: Number(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="mt-3">
                <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Scenario</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {SCENARIOS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onChange({ ...options, scenario: s.id })}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition ${
                        scenario === s.id
                          ? "border-amber-400/50 bg-amber-500/10 text-amber-100"
                          : "border-white/5 bg-black/20 text-muted-foreground hover:border-white/15 hover:text-foreground"
                      }`}
                    >
                      <span>{s.emoji}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onChange({ intensity: 1, windKmh: 8, scenario: "normal" })}
                className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Reset to defaults
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}