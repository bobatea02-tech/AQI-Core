import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { CitySnapshot } from "@/server/aqi";
import { compositeAqi, describePollutant, pearson } from "@/lib/aqi";
import { Panel } from "./Panel";

const SPECIES = ["pm2_5", "pm10", "no2", "so2", "o3", "co", "nh3"] as const;

export function TabCorrelation({ snapshot }: { snapshot: CitySnapshot }) {
  const series: Record<string, number[]> = {};
  SPECIES.forEach((s) => {
    series[s] = snapshot.history.map((p) => p[s]);
  });

  const matrix = SPECIES.map((a) => ({
    a,
    cells: SPECIES.map((b) => ({ b, r: pearson(series[a], series[b]) })),
  }));

  // PM2.5 vs O3 scatter
  const scatter = snapshot.history.map((p) => ({
    x: p.pm2_5,
    y: p.o3,
    z: compositeAqi(p.pm2_5, p.pm10),
  }));

  // Top correlations (excluding self)
  const pairs: Array<{ a: string; b: string; r: number }> = [];
  for (let i = 0; i < SPECIES.length; i++) {
    for (let j = i + 1; j < SPECIES.length; j++) {
      pairs.push({ a: SPECIES[i], b: SPECIES[j], r: pearson(series[SPECIES[i]], series[SPECIES[j]]) });
    }
  }
  const topPairs = [...pairs].sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 5);

  function colorFor(r: number) {
    const intensity = Math.min(1, Math.abs(r));
    return r >= 0
      ? `oklch(${0.4 + intensity * 0.4} ${0.05 + intensity * 0.2} 240)`
      : `oklch(${0.4 + intensity * 0.4} ${0.05 + intensity * 0.2} 20)`;
  }

  return (
    <div className="grid h-full grid-cols-12 grid-rows-6 gap-3">
      {/* Heatmap */}
      <Panel title="Pollutant Correlation Matrix" subtitle="Pearson r · 24h window" badge="EDA" className="col-span-7 row-span-6">
        <div className="flex h-full flex-col">
          <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: `60px repeat(${SPECIES.length}, 1fr)` }}>
            <div />
            {SPECIES.map((s) => (
              <div key={s} className="flex items-end justify-center pb-1 text-[10px] font-semibold">
                {describePollutant(s).name}
              </div>
            ))}
            {matrix.map((row) => (
              <>
                <div key={row.a + "-label"} className="flex items-center justify-end pr-2 text-[10px] font-semibold">
                  {describePollutant(row.a).name}
                </div>
                {row.cells.map((c) => (
                  <div
                    key={row.a + c.b}
                    className="flex items-center justify-center rounded-md border border-white/5 text-mono text-[11px] font-semibold transition hover:scale-105"
                    style={{ background: colorFor(c.r), color: Math.abs(c.r) > 0.5 ? "white" : "oklch(0.85 0 0)" }}
                    title={`${row.a} vs ${c.b}: ${c.r.toFixed(3)}`}
                  >
                    {c.r.toFixed(2)}
                  </div>
                ))}
              </>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: "oklch(0.7 0.25 20)" }} />Anti-correlated</div>
            <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: "oklch(0.4 0.05 240)" }} />Independent</div>
            <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: "oklch(0.7 0.25 240)" }} />Correlated</div>
          </div>
        </div>
      </Panel>

      {/* Scatter */}
      <Panel title="PM2.5 × O₃" subtitle="Bivariate scatter, sized by AQI" className="col-span-5 row-span-4">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid stroke="var(--grid)" strokeDasharray="2 4" />
            <XAxis type="number" dataKey="x" name="PM2.5" stroke="oklch(0.7 0 0 / 0.5)" fontSize={10} />
            <YAxis type="number" dataKey="y" name="O3" stroke="oklch(0.7 0 0 / 0.5)" fontSize={10} width={32} />
            <ZAxis type="number" dataKey="z" range={[40, 300]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "oklch(0.1 0.03 250)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 11 }} />
            <Scatter data={scatter}>
              {scatter.map((d, i) => (
                <Cell key={i} fill={`oklch(0.7 0.2 ${(d.z * 2) % 360})`} fillOpacity={0.7} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </Panel>

      {/* Top pairs */}
      <Panel title="Strongest Relationships" badge="|r|" className="col-span-5 row-span-2">
        <div className="flex flex-col gap-1.5">
          {topPairs.map((p) => (
            <div key={p.a + p.b} className="flex items-center gap-2 text-[11px]">
              <span className="w-24 font-semibold">
                {describePollutant(p.a).name} ↔ {describePollutant(p.b).name}
              </span>
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                <div
                  className="absolute h-full"
                  style={{
                    width: `${Math.abs(p.r) * 100}%`,
                    background: p.r >= 0 ? "var(--gradient-accent)" : "var(--gradient-danger)",
                    [p.r >= 0 ? "left" : "right"]: 0,
                  }}
                />
              </div>
              <span className="w-12 text-right text-mono font-semibold" style={{ color: p.r >= 0 ? "oklch(0.75 0.15 240)" : "oklch(0.75 0.2 20)" }}>
                {p.r.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}