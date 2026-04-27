import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Heart, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import type { CitySnapshot } from "@/server/aqi";
import {
  aqiCategory,
  aqiColor,
  aqiGradient,
  compositeAqi,
  describePollutant,
  healthAdvice,
  WHO_LIMITS,
  linreg,
} from "@/lib/aqi";
import { Panel } from "./Panel";

export function TabOverview({ snapshot }: { snapshot: CitySnapshot }) {
  const aqi = compositeAqi(snapshot.current.pm2_5, snapshot.current.pm10);
  const advice = healthAdvice(aqi);

  const last24 = snapshot.history.slice(-24).map((p, i) => ({
    i,
    t: new Date(p.ts * 1000).getHours(),
    aqi: compositeAqi(p.pm2_5, p.pm10),
  }));
  const trend = linreg(last24.map((d) => d.i), last24.map((d) => d.aqi));
  const trendDir = trend.b > 0.5 ? "up" : trend.b < -0.5 ? "down" : "flat";

  const polls: Array<{ k: keyof typeof WHO_LIMITS; v: number }> = [
    { k: "pm2_5", v: snapshot.current.pm2_5 },
    { k: "pm10", v: snapshot.current.pm10 },
    { k: "no2", v: snapshot.current.no2 },
    { k: "so2", v: snapshot.current.so2 },
    { k: "o3", v: snapshot.current.o3 },
    { k: "co", v: snapshot.current.co },
  ];
  const dominant = polls.reduce((a, b) => (b.v / WHO_LIMITS[b.k] > a.v / WHO_LIMITS[a.k] ? b : a));

  const pieData = polls.map((p) => ({
    name: describePollutant(p.k as string).name,
    value: Number((p.v / WHO_LIMITS[p.k]).toFixed(2)),
  }));
  const pieColors = [
    "var(--color-aqi-poor)",
    "var(--color-aqi-moderate)",
    "var(--color-aqi-fair)",
    "var(--color-aqi-good)",
    "var(--glow)",
    "var(--color-aqi-very-poor)",
  ];

  return (
    <div className="grid h-full grid-cols-12 grid-rows-6 gap-4">
      {/* Big AQI hero */}
      <Panel title="Live Air Quality" subtitle={`${snapshot.city}, ${snapshot.country}`} badge="EPA scale" className="col-span-4 row-span-4">
        <div className="relative flex flex-1 flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 160, damping: 18 }}
            className="relative flex h-44 w-44 items-center justify-center rounded-full"
            style={{
              background: aqiGradient(aqi),
              boxShadow: `0 0 80px -10px ${aqiColor(aqi)}, inset 0 0 0 6px oklch(0 0 0 / 0.15)`,
            }}
          >
            <div className="absolute inset-3 rounded-full bg-black/40 backdrop-blur" />
            <div className="relative text-center">
              <div className="text-mono text-[64px] font-bold leading-none">{aqi}</div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: aqiColor(aqi) }}>
                {aqiCategory(aqi)}
              </div>
            </div>
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-dashed border-white/15"
            />
          </motion.div>
          <div className="mt-4 flex items-center gap-2 text-mono text-xs text-muted-foreground">
            {trendDir === "up" && <TrendingUp className="h-3.5 w-3.5 text-rose-400" />}
            {trendDir === "down" && <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />}
            <span>
              24h trend: {trend.b > 0 ? "+" : ""}{trend.b.toFixed(2)}/h · R²{" "}
              {trend.r2.toFixed(2)}
            </span>
          </div>
        </div>
      </Panel>

      {/* Health advisory */}
      <Panel title="Health Insight" subtitle="Personalized advisory" badge="WHO" className="col-span-4 row-span-2">
        <div className="flex h-full items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-accent">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold">{advice.headline}</div>
            <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{advice.detail}</div>
          </div>
        </div>
      </Panel>

      {/* Dominant pollutant */}
      <Panel title="Dominant Pollutant" subtitle="Highest WHO ratio" className="col-span-4 row-span-2">
        <div className="flex h-full flex-col justify-center">
          <div className="flex items-baseline gap-2">
            <span className="text-mono text-3xl font-bold">{describePollutant(dominant.k).name}</span>
            <span className="text-xs text-muted-foreground">{describePollutant(dominant.k).desc}</span>
          </div>
          <div className="mt-2 flex items-end gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Concentration</div>
              <div className="text-mono text-lg font-semibold">{dominant.v.toFixed(2)} <span className="text-xs text-muted-foreground">µg/m³</span></div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">vs WHO limit</div>
              <div className="text-mono text-lg font-semibold text-rose-300">
                ×{(dominant.v / WHO_LIMITS[dominant.k]).toFixed(2)}
              </div>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (dominant.v / WHO_LIMITS[dominant.k]) * 50)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-warn"
            />
          </div>
        </div>
      </Panel>

      {/* Pollutant share */}
      <Panel title="Pollutant Burden" subtitle="× WHO 24h limit" className="col-span-4 row-span-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" innerRadius={28} outerRadius={56} paddingAngle={2}>
              {pieData.map((_, i) => (
                <Cell key={i} fill={pieColors[i % pieColors.length]} stroke="oklch(0 0 0 / 0.4)" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "oklch(0.1 0.03 250)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 11 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Panel>

      {/* 24h sparkline */}
      <Panel title="24h AQI Pulse" subtitle="Composite EPA index" badge="hourly" className="col-span-8 row-span-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={last24}>
            <defs>
              <linearGradient id="aqiArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--glow)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="var(--glow)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--grid)" vertical={false} strokeDasharray="2 4" />
            <XAxis dataKey="t" tickFormatter={(v) => `${v}h`} stroke="oklch(0.7 0 0 / 0.5)" fontSize={10} />
            <YAxis stroke="oklch(0.7 0 0 / 0.5)" fontSize={10} width={28} />
            <Tooltip
              contentStyle={{ background: "oklch(0.1 0.03 250)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 11 }}
              labelFormatter={(v) => `${v}:00`}
            />
            <Area dataKey="aqi" stroke="var(--glow)" strokeWidth={2} fill="url(#aqiArea)" />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      {/* Quick action insight */}
      <Panel title="Smart Recommendation" badge="AI-derived" className="col-span-4 row-span-2">
        <div className="flex h-full flex-col justify-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span className="font-semibold">{aqi <= 50 ? "Open windows for ventilation" : aqi <= 100 ? "Light outdoor activity OK" : aqi <= 150 ? "Sensitive groups: stay indoors" : "Activate purifier · seal windows"}</span>
          </div>
          <div className="text-xs leading-relaxed text-muted-foreground">
            Based on {dominant.k.toUpperCase()} surge ({(dominant.v / WHO_LIMITS[dominant.k]).toFixed(1)}× WHO) and {trendDir} 24h trend.
          </div>
        </div>
      </Panel>
    </div>
  );
}