import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDown, ArrowUp, Trophy } from "lucide-react";
import { getMultiCity } from "@/server/aqi";
import { aqiCategory, aqiColor, compositeAqi } from "@/lib/aqi";
import { Panel } from "./Panel";

interface Props {
  primaryCity: string;
  cities: string[];
}

export function TabCompare({ primaryCity, cities }: Props) {
  const peers = cities.slice(0, 8);
  const compareSet = Array.from(new Set([primaryCity, ...peers])).slice(0, 8);

  const q = useQuery({
    queryKey: ["multi", compareSet.join(",")],
    queryFn: () => getMultiCity({ data: { cities: compareSet } }),
    refetchInterval: 5 * 60_000,
  });

  const rows = (q.data?.results ?? []).map((r) => ({
    city: r.city,
    aqi: compositeAqi(r.point.pm2_5, r.point.pm10),
    pm25: Number(r.point.pm2_5.toFixed(1)),
    pm10: Number(r.point.pm10.toFixed(1)),
    no2: Number(r.point.no2.toFixed(1)),
    o3: Number(r.point.o3.toFixed(1)),
    so2: Number(r.point.so2.toFixed(1)),
    co: Number((r.point.co / 100).toFixed(1)),
  })).sort((a, b) => a.aqi - b.aqi);

  const me = rows.find((r) => r.city === primaryCity);
  const myRank = me ? rows.findIndex((r) => r.city === primaryCity) + 1 : 0;
  const cleanest = rows[0];
  const worst = rows[rows.length - 1];

  const radarData = ["pm25", "pm10", "no2", "o3", "so2", "co"].map((k) => {
    const obj: Record<string, number | string> = { metric: k.toUpperCase() };
    rows.slice(0, 4).forEach((r) => {
      obj[r.city] = r[k as keyof typeof r] as number;
    });
    return obj;
  });

  const radarColors = ["var(--glow)", "var(--color-aqi-poor)", "var(--color-aqi-good)", "var(--color-aqi-moderate)"];

  return (
    <div className="grid h-full grid-cols-12 grid-rows-6 gap-4">
      <Panel title="City Ranking" subtitle={`${rows.length} cities · live`} badge="composite AQI" className="col-span-7 row-span-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} strokeDasharray="2 4" />
            <XAxis dataKey="city" stroke="oklch(0.7 0 0 / 0.5)" fontSize={10} angle={-20} textAnchor="end" height={50} />
            <YAxis stroke="oklch(0.7 0 0 / 0.5)" fontSize={10} width={32} />
            <Tooltip
              cursor={{ fill: "oklch(1 0 0 / 0.04)" }}
              contentStyle={{ background: "oklch(0.1 0.03 250)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 11 }}
            />
            <Bar dataKey="aqi" radius={[6, 6, 0, 0]} animationDuration={900}>
              {rows.map((r) => (
                <Cell
                  key={r.city}
                  fill={aqiColor(r.aqi)}
                  stroke={r.city === primaryCity ? "white" : "transparent"}
                  strokeWidth={r.city === primaryCity ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title={primaryCity} subtitle="Your city" badge={`Rank #${myRank}`} className="col-span-5 row-span-2">
        {me && (
          <div className="flex h-full items-center justify-between gap-4">
            <div>
              <div className="text-mono text-4xl font-bold" style={{ color: aqiColor(me.aqi) }}>{me.aqi}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{aqiCategory(me.aqi)}</div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
              <Stat label="PM2.5" value={me.pm25} />
              <Stat label="PM10" value={me.pm10} />
              <Stat label="NO₂" value={me.no2} />
              <Stat label="O₃" value={me.o3} />
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Cleanest" subtitle={cleanest?.city ?? "—"} className="col-span-3 row-span-2">
        {cleanest && (
          <div className="flex h-full flex-col justify-center">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-emerald-300" />
              <div className="text-mono text-3xl font-bold text-emerald-300">{cleanest.aqi}</div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <ArrowDown className="h-3 w-3 text-emerald-400" />
              {me ? `${me.aqi - cleanest.aqi} pts cleaner than you` : "—"}
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Worst" subtitle={worst?.city ?? "—"} className="col-span-2 row-span-2">
        {worst && (
          <div className="flex h-full flex-col justify-center">
            <div className="flex items-center gap-2">
              <ArrowUp className="h-5 w-5 text-rose-400" />
              <div className="text-mono text-3xl font-bold text-rose-300">{worst.aqi}</div>
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">{aqiCategory(worst.aqi)}</div>
          </div>
        )}
      </Panel>

      <Panel title="Pollutant Fingerprint" subtitle="Top 4 cities · multi-pollutant" badge="radar" className="col-span-7 row-span-2">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} outerRadius="78%">
            <PolarGrid stroke="oklch(1 0 0 / 0.1)" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: "oklch(0.75 0 0)", fontSize: 10 }} />
            <PolarRadiusAxis tick={{ fill: "oklch(0.6 0 0)", fontSize: 9 }} stroke="oklch(1 0 0 / 0.1)" />
            {rows.slice(0, 4).map((r, i) => (
              <Radar
                key={r.city}
                name={r.city}
                dataKey={r.city}
                stroke={radarColors[i]}
                fill={radarColors[i]}
                fillOpacity={0.18}
                animationDuration={900}
              />
            ))}
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "oklch(0.1 0.03 250)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 11 }} />
          </RadarChart>
        </ResponsiveContainer>
      </Panel>

      {q.isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-12 row-span-1 flex items-center justify-center text-xs text-muted-foreground">
          Sampling peer atmospheres…
        </motion.div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="text-mono text-sm font-semibold">{value}</div>
    </div>
  );
}