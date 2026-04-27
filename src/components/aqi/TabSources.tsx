import { motion } from "framer-motion";
import { CarFront, Factory, Flame, Leaf, Wind } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CitySnapshot } from "@/server/aqi";
import { Panel } from "./Panel";

/**
 * Heuristic source attribution from pollutant signatures.
 * Traffic ≈ NO + NO2; Industry ≈ SO2; Combustion ≈ CO + PM2.5;
 * Photochem ≈ O3; Agriculture ≈ NH3.
 */
export function TabSources({ snapshot }: { snapshot: CitySnapshot }) {
  const c = snapshot.current;
  const sources = [
    { name: "Traffic", icon: CarFront, score: c.no2 * 1.2 + c.no, color: "var(--color-aqi-poor)" },
    { name: "Industry", icon: Factory, score: c.so2 * 4, color: "var(--color-aqi-very-poor)" },
    { name: "Combustion", icon: Flame, score: c.pm2_5 * 1.1 + c.co / 100, color: "var(--color-aqi-moderate)" },
    { name: "Photochem", icon: Wind, score: c.o3 * 0.5, color: "var(--color-aqi-fair)" },
    { name: "Agriculture", icon: Leaf, score: c.nh3 * 5, color: "var(--color-aqi-good)" },
  ];
  const total = sources.reduce((a, b) => a + b.score, 0) || 1;
  sources.forEach((s) => ((s as any).pct = (s.score / total) * 100));

  // 24h source mix
  const series = snapshot.history.slice(-24).map((p) => ({
    t: new Date(p.ts * 1000).getHours() + "h",
    Traffic: p.no2 * 1.2 + p.no,
    Industry: p.so2 * 4,
    Combustion: p.pm2_5 * 1.1 + p.co / 100,
    Photochem: p.o3 * 0.5,
    Agriculture: p.nh3 * 5,
  }));

  return (
    <div className="grid h-full grid-cols-12 grid-rows-6 gap-4">
      {/* Source attribution bars */}
      <Panel title="Pollution Source Attribution" subtitle="Inferred from chemical signature" badge="heuristic" className="col-span-6 row-span-6">
        <div className="flex h-full flex-col justify-center gap-3.5">
          {sources.map((s, idx) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.07 }}
              className="flex items-center gap-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30">
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">{s.name}</span>
                  <span className="text-mono text-sm font-bold" style={{ color: s.color }}>
                    {(s as any).pct.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(s as any).pct}%` }}
                    transition={{ delay: idx * 0.07 + 0.2, duration: 0.7, ease: "easeOut" }}
                    className="h-full"
                    style={{ background: s.color, boxShadow: `0 0 12px ${s.color}` }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Panel>

      {/* Stacked source mix over time */}
      <Panel title="Source Mix Evolution" subtitle="Past 24h proxy contribution" className="col-span-6 row-span-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid stroke="var(--grid)" vertical={false} strokeDasharray="2 4" />
            <XAxis dataKey="t" stroke="oklch(0.7 0 0 / 0.5)" fontSize={10} interval={2} />
            <YAxis stroke="oklch(0.7 0 0 / 0.5)" fontSize={10} width={32} />
            <Tooltip contentStyle={{ background: "oklch(0.1 0.03 250)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 11 }} />
            <Line dataKey="Traffic" stroke="var(--color-aqi-poor)" strokeWidth={1.8} dot={false} />
            <Line dataKey="Industry" stroke="var(--color-aqi-very-poor)" strokeWidth={1.8} dot={false} />
            <Line dataKey="Combustion" stroke="var(--color-aqi-moderate)" strokeWidth={1.8} dot={false} />
            <Line dataKey="Photochem" stroke="var(--color-aqi-fair)" strokeWidth={1.8} dot={false} />
            <Line dataKey="Agriculture" stroke="var(--color-aqi-good)" strokeWidth={1.8} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      {/* Wind context */}
      <Panel title="Atmospheric Carrier" subtitle="Wind direction & dispersion" className="col-span-6 row-span-2">
        <div className="flex h-full items-center gap-4">
          <motion.div
            animate={{ rotate: snapshot.weather.wind_deg }}
            transition={{ type: "spring", stiffness: 60, damping: 15 }}
            className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/10"
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-mono text-[9px] text-muted-foreground">N</div>
            <Wind className="h-8 w-8 text-cyan-300" />
            <div
              className="absolute h-1 w-10 rounded-full bg-gradient-accent"
              style={{ top: "10%", transformOrigin: "left center" }}
            />
          </motion.div>
          <div className="flex-1 grid grid-cols-2 gap-2 text-[11px]">
            <Cell label="Direction" value={`${snapshot.weather.wind_deg}°`} />
            <Cell label="Speed" value={`${snapshot.weather.wind_speed.toFixed(1)} m/s`} />
            <Cell label="Pressure" value={`${snapshot.weather.pressure} hPa`} />
            <Cell label="Cloud cover" value={`${snapshot.weather.clouds}%`} />
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/5 bg-black/20 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-mono font-semibold">{value}</div>
    </div>
  );
}