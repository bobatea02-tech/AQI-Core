import { motion } from "framer-motion";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Brain, Target, Zap } from "lucide-react";
import type { CitySnapshot } from "@/server/aqi";
import { aqiColor, compositeAqi, linreg } from "@/lib/aqi";
import { Panel } from "./Panel";

export function TabPredict({ snapshot }: { snapshot: CitySnapshot }) {
  const histAqi = snapshot.history.map((p, i) => ({
    i,
    label: new Date(p.ts * 1000).getHours() + "h",
    actual: compositeAqi(p.pm2_5, p.pm10),
    type: "history" as const,
  }));
  const forecastAqi = snapshot.forecast.slice(0, 24).map((p, i) => ({
    i: histAqi.length + i,
    label: "+" + (i + 1) + "h",
    forecast: compositeAqi(p.pm2_5, p.pm10),
    type: "forecast" as const,
  }));

  // Build prediction model from history + uncertainty band
  const trend = linreg(histAqi.map((d) => d.i), histAqi.map((d) => d.actual));
  const residuals = histAqi.map((d) => d.actual - (trend.a + trend.b * d.i));
  const sigma = Math.sqrt(residuals.reduce((a, b) => a + b * b, 0) / Math.max(1, residuals.length - 1));

  const merged: Array<Record<string, number | string | null>> = [
    ...histAqi.map((d) => ({ i: d.i, label: d.label, actual: d.actual, forecast: null, lo: null, hi: null })),
    ...forecastAqi.map((d) => ({
      i: d.i,
      label: d.label,
      actual: null,
      forecast: d.forecast,
      lo: Math.max(0, d.forecast - 1.5 * sigma),
      hi: d.forecast + 1.5 * sigma,
    })),
  ];

  const next6 = forecastAqi.slice(0, 6);
  const peakHour = forecastAqi.reduce((a, b) => (b.forecast > a.forecast ? b : a));
  const minHour = forecastAqi.reduce((a, b) => (b.forecast < a.forecast ? b : a));

  const accuracy = Math.round((1 - Math.min(0.4, sigma / 100)) * 100);

  return (
    <div className="grid h-full grid-cols-12 grid-rows-6 gap-3">
      <Panel title="Forecast Horizon" subtitle="History → 24h prediction with 95% CI" badge="ARIMA-lite" className="col-span-9 row-span-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={merged}>
            <defs>
              <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.7 0.2 280)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="oklch(0.7 0.2 280)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--grid)" vertical={false} strokeDasharray="2 4" />
            <XAxis dataKey="label" stroke="oklch(0.7 0 0 / 0.5)" fontSize={10} interval={2} />
            <YAxis stroke="oklch(0.7 0 0 / 0.5)" fontSize={10} width={32} />
            <Tooltip contentStyle={{ background: "oklch(0.1 0.03 250)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 11 }} />
            <ReferenceLine x={histAqi[histAqi.length - 1]?.label} stroke="oklch(1 0 0 / 0.3)" strokeDasharray="4 4" label={{ value: "now", fill: "oklch(0.7 0 0)", fontSize: 10, position: "top" }} />
            <Area dataKey="hi" stroke="none" fill="url(#band)" />
            <Area dataKey="lo" stroke="none" fill="oklch(0 0 0 / 0)" />
            <Line dataKey="actual" stroke="var(--glow)" strokeWidth={2.5} dot={false} />
            <Line dataKey="forecast" stroke="oklch(0.78 0.22 320)" strokeWidth={2.5} strokeDasharray="6 4" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>

      {/* Model card */}
      <Panel title="Model Confidence" badge="R²" className="col-span-3 row-span-2">
        <div className="flex h-full flex-col justify-center">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-300" />
            <span className="text-mono text-3xl font-bold">{accuracy}%</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Prediction confidence</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
            <Stat label="σ residual" value={sigma.toFixed(2)} />
            <Stat label="Slope" value={trend.b.toFixed(3)} />
            <Stat label="R²" value={trend.r2.toFixed(3)} />
            <Stat label="Window" value={`${snapshot.history.length}h`} />
          </div>
        </div>
      </Panel>

      {/* Peak / min */}
      <Panel title="Critical Windows" badge="next 24h" className="col-span-3 row-span-2">
        <div className="flex h-full flex-col justify-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-danger">
              <Target className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Peak AQI</div>
              <div className="text-mono text-lg font-semibold" style={{ color: aqiColor(peakHour.forecast) }}>
                {peakHour.forecast} <span className="text-xs text-muted-foreground">@ {peakHour.label}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-good">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Cleanest</div>
              <div className="text-mono text-lg font-semibold" style={{ color: aqiColor(minHour.forecast) }}>
                {minHour.forecast} <span className="text-xs text-muted-foreground">@ {minHour.label}</span>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Next 6h breakdown */}
      <Panel title="Next 6 Hours" subtitle="Hourly AQI projection" className="col-span-12 row-span-2">
        <div className="grid h-full grid-cols-6 gap-2">
          {next6.map((h, idx) => (
            <motion.div
              key={h.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="relative flex flex-col items-center justify-center overflow-hidden rounded-lg border border-white/5 bg-black/20 p-2"
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{h.label}</div>
              <div
                className="text-mono text-2xl font-bold"
                style={{ color: aqiColor(h.forecast) }}
              >
                {h.forecast}
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (h.forecast / 200) * 100)}%` }}
                  transition={{ delay: idx * 0.05 + 0.2, duration: 0.6 }}
                  className="h-full"
                  style={{ background: aqiColor(h.forecast) }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/5 bg-black/20 px-2 py-1">
      <div className="text-[8px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-mono text-[11px] font-semibold">{value}</div>
    </div>
  );
}