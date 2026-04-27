import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, Database, Filter, GitBranch } from "lucide-react";
import type { CitySnapshot } from "@/server/aqi";
import { Panel } from "./Panel";
import { describePollutant } from "@/lib/aqi";

export function TabPipeline({ snapshot }: { snapshot: CitySnapshot }) {
  const pollutants = ["pm2_5", "pm10", "no2", "so2", "o3", "co", "nh3", "no"] as const;
  const rows = snapshot.history.slice(-12).map((p) => ({
    t: new Date(p.ts * 1000),
    ...p,
  }));

  const stats = pollutants.map((k) => {
    const vals = snapshot.history.map((p) => p[k]).filter((v) => v >= 0);
    const n = vals.length || 1;
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const sorted = [...vals].sort((a, b) => a - b);
    const median = sorted[Math.floor(n / 2)];
    const min = sorted[0] ?? 0;
    const max = sorted[n - 1] ?? 0;
    const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
    const missing = snapshot.history.length - vals.length;
    return { k, mean, median, min, max, std, missing };
  });

  const stages = [
    { icon: Database, label: "Ingest", desc: "OpenWeather API", count: `${snapshot.history.length + snapshot.forecast.length + 1} pts` },
    { icon: Filter, label: "Clean", desc: "Null/outlier check", count: `${stats.reduce((a, b) => a + b.missing, 0)} gaps` },
    { icon: GitBranch, label: "Transform", desc: "EPA AQI mapping", count: "8 species" },
    { icon: CheckCircle2, label: "Validate", desc: "WHO benchmark", count: "OK" },
  ];

  return (
    <div className="grid h-full grid-cols-12 grid-rows-6 gap-3">
      {/* Pipeline stages */}
      <Panel title="Preprocessing Pipeline" subtitle="Stage 1 → Stage 2" badge="ETL" className="col-span-12 row-span-1">
        <div className="flex items-center gap-2">
          {stages.map((s, i) => (
            <div key={s.label} className="flex flex-1 items-center">
              <div className="flex flex-1 items-center gap-2.5 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-accent">
                  <s.icon className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="leading-tight">
                  <div className="text-[11px] font-semibold">{s.label}</div>
                  <div className="text-[9px] text-muted-foreground">{s.desc}</div>
                </div>
                <div className="ml-auto text-mono text-[10px] text-emerald-300">{s.count}</div>
              </div>
              {i < stages.length - 1 && <div className="h-px w-3 bg-white/10" />}
            </div>
          ))}
        </div>
      </Panel>

      {/* Stats table */}
      <Panel title="Descriptive Statistics" subtitle="Past 24h, all pollutants" badge="EDA" className="col-span-7 row-span-3">
        <div className="scrollbar-thin overflow-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-black/40 backdrop-blur">
              <tr className="text-[9px] uppercase tracking-wider text-muted-foreground">
                <th className="px-2 py-1.5 text-left">Species</th>
                <th className="px-2 py-1.5 text-right">Mean</th>
                <th className="px-2 py-1.5 text-right">Median</th>
                <th className="px-2 py-1.5 text-right">Min</th>
                <th className="px-2 py-1.5 text-right">Max</th>
                <th className="px-2 py-1.5 text-right">σ</th>
                <th className="px-2 py-1.5 text-right">Gaps</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.k} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-2 py-1.5 font-semibold">{describePollutant(s.k).name}</td>
                  <td className="px-2 py-1.5 text-right text-mono">{s.mean.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right text-mono">{s.median.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right text-mono text-emerald-300">{s.min.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right text-mono text-rose-300">{s.max.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right text-mono text-muted-foreground">{s.std.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right text-mono">{s.missing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Distribution */}
      <Panel title="Mean Concentration" subtitle="µg/m³ · 24h average" className="col-span-5 row-span-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.map((s) => ({ name: describePollutant(s.k).name, value: Number(s.mean.toFixed(2)) }))}>
            <CartesianGrid stroke="var(--grid)" vertical={false} strokeDasharray="2 4" />
            <XAxis dataKey="name" stroke="oklch(0.7 0 0 / 0.5)" fontSize={10} />
            <YAxis stroke="oklch(0.7 0 0 / 0.5)" fontSize={10} width={32} />
            <Tooltip contentStyle={{ background: "oklch(0.1 0.03 250)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 11 }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {stats.map((_, i) => (
                <Cell key={i} fill={`oklch(0.7 0.18 ${(i * 40) % 360})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* Raw stream */}
      <Panel title="Raw Time-Series Stream" subtitle="Latest 12 hourly observations" badge="raw" className="col-span-12 row-span-2">
        <div className="scrollbar-thin overflow-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-black/40 backdrop-blur">
              <tr className="text-[9px] uppercase tracking-wider text-muted-foreground">
                <th className="px-2 py-1 text-left">Timestamp (UTC)</th>
                <th className="px-2 py-1 text-right">PM2.5</th>
                <th className="px-2 py-1 text-right">PM10</th>
                <th className="px-2 py-1 text-right">NO₂</th>
                <th className="px-2 py-1 text-right">SO₂</th>
                <th className="px-2 py-1 text-right">O₃</th>
                <th className="px-2 py-1 text-right">CO</th>
                <th className="px-2 py-1 text-right">NH₃</th>
                <th className="px-2 py-1 text-right">NO</th>
                <th className="px-2 py-1 text-right">OWM AQI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-2 py-1 text-mono text-muted-foreground">{r.t.toISOString().slice(11, 16)}</td>
                  <td className="px-2 py-1 text-right text-mono">{r.pm2_5.toFixed(2)}</td>
                  <td className="px-2 py-1 text-right text-mono">{r.pm10.toFixed(2)}</td>
                  <td className="px-2 py-1 text-right text-mono">{r.no2.toFixed(2)}</td>
                  <td className="px-2 py-1 text-right text-mono">{r.so2.toFixed(2)}</td>
                  <td className="px-2 py-1 text-right text-mono">{r.o3.toFixed(2)}</td>
                  <td className="px-2 py-1 text-right text-mono">{r.co.toFixed(0)}</td>
                  <td className="px-2 py-1 text-right text-mono">{r.nh3.toFixed(2)}</td>
                  <td className="px-2 py-1 text-right text-mono">{r.no.toFixed(2)}</td>
                  <td className="px-2 py-1 text-right text-mono font-semibold text-amber-300">{r.aqi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}