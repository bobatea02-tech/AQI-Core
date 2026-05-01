import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Check, MapPin, Plus, Trophy, X } from "lucide-react";
import { getMultiCity } from "@/server/aqi";
import { aqiCategory, aqiColor, aqiGradient, compositeAqi, WHO_LIMITS } from "@/lib/aqi";
import { Panel } from "./Panel";
import { cn } from "@/lib/utils";

interface Props {
  primaryCity: string;
  cities: string[];
}

const POLLUTANTS = [
  { key: "pm2_5", label: "PM2.5", unit: "µg/m³" },
  { key: "pm10", label: "PM10", unit: "µg/m³" },
  { key: "no2", label: "NO₂", unit: "µg/m³" },
  { key: "o3", label: "O₃", unit: "µg/m³" },
  { key: "so2", label: "SO₂", unit: "µg/m³" },
  { key: "co", label: "CO", unit: "µg/m³" },
] as const;

export function TabCompare({ primaryCity, cities }: Props) {
  const [selected, setSelected] = useState<string[]>(() => {
    const defaults = [primaryCity, "Mumbai", "Bengaluru", "Chennai"];
    return Array.from(new Set(defaults.filter((c) => cities.includes(c)))).slice(0, 4);
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  const q = useQuery({
    queryKey: ["multi", selected.join(",")],
    queryFn: () => getMultiCity({ data: { cities: selected } }),
    refetchInterval: 5 * 60_000,
    enabled: selected.length > 0,
  });

  const rows = useMemo(() => {
    const map = new Map((q.data?.results ?? []).map((r) => [r.city, r]));
    return selected
      .map((c) => map.get(c))
      .filter((r): r is NonNullable<typeof r> => !!r)
      .map((r) => ({
        city: r.city,
        country: r.country,
        aqi: compositeAqi(r.point.pm2_5, r.point.pm10),
        pm2_5: r.point.pm2_5,
        pm10: r.point.pm10,
        no2: r.point.no2,
        o3: r.point.o3,
        so2: r.point.so2,
        co: r.point.co,
      }));
  }, [q.data, selected]);

  const ranked = useMemo(() => [...rows].sort((a, b) => a.aqi - b.aqi), [rows]);
  const cleanest = ranked[0];
  const dirtiest = ranked[ranked.length - 1];

  // Pollutant breakdown for grouped bar chart
  const breakdownData = POLLUTANTS.map((p) => {
    const obj: Record<string, number | string> = { pollutant: p.label };
    rows.forEach((r) => {
      obj[r.city] = Number((r[p.key as keyof typeof r] as number).toFixed(2));
    });
    return obj;
  });

  const cardColors = [
    "var(--glow)",
    "var(--color-aqi-poor)",
    "var(--color-aqi-good)",
    "var(--color-aqi-moderate)",
  ];

  function toggleCity(c: string) {
    setSelected((prev) => {
      if (prev.includes(c)) return prev.filter((x) => x !== c);
      if (prev.length >= 4) return prev;
      return [...prev, c];
    });
  }

  return (
    <div className="grid h-full grid-cols-12 grid-rows-6 gap-4">
      {/* Side-by-side AQI cards */}
      <Panel
        title="Side-by-Side"
        subtitle={`${rows.length}/4 cities · live composite AQI`}
        badge="EPA scale"
        className="col-span-12 row-span-3"
      >
        <div className="relative flex h-full items-stretch gap-3">
          <div className={cn("grid flex-1 gap-3", gridColsFor(rows.length || 1))}>
            <AnimatePresence mode="popLayout">
              {rows.map((r, i) => {
                const color = aqiColor(r.aqi);
                const grad = aqiGradient(r.aqi);
                const isCleanest = cleanest && r.city === cleanest.city && rows.length > 1;
                return (
                  <motion.div
                    key={r.city}
                    layout
                    initial={{ opacity: 0, scale: 0.92, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -8 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 }}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[oklch(0.12_0.03_260)]/80 p-4 transition hover:border-white/20"
                    style={{ boxShadow: `0 0 40px -20px ${color}` }}
                  >
                    {/* color bar */}
                    <div className="absolute inset-x-0 top-0 h-1" style={{ background: grad }} />
                    {isCleanest && (
                      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">
                        <Trophy className="h-2.5 w-2.5" /> Cleanest
                      </div>
                    )}

                    <button
                      onClick={() => toggleCity(r.city)}
                      className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/30 p-0.5 opacity-0 transition group-hover:opacity-100 hover:border-rose-400/40 hover:text-rose-300"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>

                    <div className="mt-4 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {r.city}
                    </div>

                    <div className="mt-2 flex items-baseline gap-2">
                      <motion.div
                        key={r.aqi}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 16 }}
                        className="text-mono text-5xl font-bold leading-none"
                        style={{ color }}
                      >
                        {r.aqi}
                      </motion.div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">AQI</div>
                    </div>
                    <div className="mt-1 text-xs font-semibold" style={{ color }}>
                      {aqiCategory(r.aqi)}
                    </div>

                    {/* Mini pollutant grid */}
                    <div className="mt-3 grid grid-cols-3 gap-x-2 gap-y-1.5">
                      {POLLUTANTS.slice(0, 6).map((p) => {
                        const v = r[p.key as keyof typeof r] as number;
                        const ratio = v / WHO_LIMITS[p.key as keyof typeof WHO_LIMITS];
                        const over = ratio > 1;
                        return (
                          <div key={p.key} className="leading-tight">
                            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{p.label}</div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-mono text-[11px] font-semibold">{v.toFixed(1)}</span>
                              <span
                                className={cn(
                                  "text-[9px] text-mono",
                                  over ? "text-rose-300" : "text-emerald-300/80",
                                )}
                              >
                                {over ? "↑" : "↓"}{ratio.toFixed(1)}×
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Color accent line */}
                    <div className="mt-auto pt-3">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (r.aqi / 300) * 100)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full"
                          style={{ background: grad }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {rows.length < 4 && (
              <motion.button
                layout
                onClick={() => setPickerOpen((v) => !v)}
                whileHover={{ scale: 1.02 }}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-muted-foreground transition hover:border-white/30 hover:text-foreground"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30">
                  <Plus className="h-4 w-4" />
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-wider">Add city</div>
              </motion.button>
            )}
          </div>

          {/* City picker drawer */}
          <AnimatePresence>
            {pickerOpen && (
              <motion.div
                initial={{ opacity: 0, x: 20, width: 0 }}
                animate={{ opacity: 1, x: 0, width: 200 }}
                exit={{ opacity: 0, x: 20, width: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur"
              >
                <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Select cities
                  </span>
                  <button onClick={() => setPickerOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="max-h-full overflow-y-auto p-1.5">
                  {cities.map((c) => {
                    const on = selected.includes(c);
                    const disabled = !on && selected.length >= 4;
                    return (
                      <button
                        key={c}
                        disabled={disabled}
                        onClick={() => toggleCity(c)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition",
                          on
                            ? "bg-gradient-accent text-white"
                            : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                          disabled && "cursor-not-allowed opacity-40",
                        )}
                      >
                        <span>{c}</span>
                        {on && <Check className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Panel>

      {/* Pollutant breakdown — grouped bars */}
      <Panel
        title="Pollutant Breakdown"
        subtitle="Concentration by city · µg/m³"
        badge="grouped bars"
        className="col-span-8 row-span-3"
      >
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdownData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} strokeDasharray="2 4" />
              <XAxis dataKey="pollutant" stroke="oklch(0.7 0 0 / 0.6)" fontSize={11} />
              <YAxis stroke="oklch(0.7 0 0 / 0.6)" fontSize={10} width={36} />
              <Tooltip
                cursor={{ fill: "oklch(1 0 0 / 0.04)" }}
                contentStyle={{
                  background: "oklch(0.1 0.03 250)",
                  border: "1px solid oklch(1 0 0 / 0.1)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {rows.map((r, i) => (
                <Bar
                  key={r.city}
                  dataKey={r.city}
                  fill={cardColors[i % cardColors.length]}
                  radius={[4, 4, 0, 0]}
                  animationDuration={800}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* Ranking summary */}
      <Panel
        title="Ranking"
        subtitle="Best → worst"
        badge="composite"
        className="col-span-4 row-span-3"
      >
        {ranked.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex h-full flex-col gap-2">
            {ranked.map((r, i) => {
              const color = aqiColor(r.aqi);
              const delta = i === 0 ? 0 : r.aqi - ranked[0].aqi;
              return (
                <motion.div
                  key={r.city}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-mono text-xs font-bold" style={{ background: color, color: "oklch(0.1 0 0)" }}>
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{r.city}</div>
                    <div className="text-[10px] text-muted-foreground">{aqiCategory(r.aqi)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-mono text-base font-bold" style={{ color }}>{r.aqi}</div>
                    {delta > 0 && (
                      <div className="text-[9px] text-mono text-rose-300">+{delta}</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
            {dirtiest && cleanest && rows.length > 1 && (
              <div className="mt-auto rounded-xl border border-white/5 bg-gradient-to-r from-emerald-500/10 to-rose-500/10 px-3 py-2 text-[10px]">
                <span className="text-emerald-300 font-semibold">{cleanest.city}</span>
                <span className="text-muted-foreground"> is </span>
                <span className="text-mono font-bold">{dirtiest.aqi - cleanest.aqi}</span>
                <span className="text-muted-foreground"> AQI pts cleaner than </span>
                <span className="text-rose-300 font-semibold">{dirtiest.city}</span>
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

function gridColsFor(n: number) {
  if (n >= 4) return "grid-cols-4";
  if (n === 3) return "grid-cols-3";
  if (n === 2) return "grid-cols-2";
  return "grid-cols-1";
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      Select cities to compare
    </div>
  );
}
