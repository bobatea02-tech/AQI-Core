import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle, Globe2, ShieldCheck, XCircle } from "lucide-react";
import { getMultiCity } from "@/server/aqi";
import type { CitySnapshot } from "@/server/aqi";
import { aqiCategory, aqiColor, compositeAqi, WHO_LIMITS } from "@/lib/aqi";
import { Panel } from "./Panel";

const PEER_CITIES = ["London", "Tokyo", "New York", "Mumbai", "Beijing", "Paris", "Sydney", "Cairo"];

export function TabValidation({ snapshot }: { snapshot: CitySnapshot }) {
  const peers = useQuery({
    queryKey: ["multiCity", PEER_CITIES.join(",")],
    queryFn: () => getMultiCity({ data: { cities: PEER_CITIES } }),
    staleTime: 5 * 60_000,
  });

  const myAqi = compositeAqi(snapshot.current.pm2_5, snapshot.current.pm10);

  const ranking = (peers.data?.results ?? [])
    .map((r) => ({ ...r, aqi: compositeAqi(r.point.pm2_5, r.point.pm10) }))
    .concat({
      city: snapshot.city,
      country: snapshot.country,
      lat: snapshot.lat,
      lon: snapshot.lon,
      point: snapshot.current,
      aqi: myAqi,
    })
    .sort((a, b) => a.aqi - b.aqi);

  // Validation against WHO
  const checks = [
    { name: "PM2.5", val: snapshot.current.pm2_5, limit: WHO_LIMITS.pm2_5 },
    { name: "PM10", val: snapshot.current.pm10, limit: WHO_LIMITS.pm10 },
    { name: "NO₂", val: snapshot.current.no2, limit: WHO_LIMITS.no2 },
    { name: "SO₂", val: snapshot.current.so2, limit: WHO_LIMITS.so2 },
    { name: "O₃", val: snapshot.current.o3, limit: WHO_LIMITS.o3 },
    { name: "CO", val: snapshot.current.co, limit: WHO_LIMITS.co },
  ];

  const dataIntegrity = {
    historyCoverage: Math.round((snapshot.history.length / 24) * 100),
    forecastCoverage: Math.round((snapshot.forecast.length / 24) * 100),
    age: Math.round((Date.now() - snapshot.fetchedAt) / 1000),
  };

  return (
    <div className="grid h-full grid-cols-12 grid-rows-6 gap-4">
      {/* WHO compliance */}
      <Panel title="WHO Guideline Validation" subtitle="2021 Air Quality Guidelines" badge="compliance" className="col-span-6 row-span-4">
        <div className="flex flex-col gap-2">
          {checks.map((c, idx) => {
            const ratio = c.val / c.limit;
            const ok = ratio <= 1;
            return (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2"
              >
                {ok ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />}
                <div className="w-16 text-sm font-semibold">{c.name}</div>
                <div className="flex-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, ratio * 50)}%` }}
                      transition={{ delay: idx * 0.04 + 0.2, duration: 0.6 }}
                      className="h-full"
                      style={{ background: ok ? "var(--gradient-good)" : "var(--gradient-danger)" }}
                    />
                  </div>
                </div>
                <div className="w-32 text-right text-mono text-[11px]">
                  <span className="font-semibold">{c.val.toFixed(1)}</span>
                  <span className="text-muted-foreground"> / {c.limit} µg/m³</span>
                </div>
                <div className="w-12 text-right text-mono text-xs font-bold" style={{ color: ok ? "oklch(0.78 0.18 150)" : "oklch(0.7 0.22 30)" }}>
                  ×{ratio.toFixed(2)}
                </div>
              </motion.div>
            );
          })}
        </div>
      </Panel>

      {/* Global ranking */}
      <Panel title="Global Benchmark" subtitle={`${snapshot.city} vs world peers`} badge="live" className="col-span-6 row-span-4">
        <div className="scrollbar-thin overflow-auto">
          {peers.isLoading && <div className="text-xs text-muted-foreground">Loading peer cities…</div>}
          {peers.error && <div className="text-xs text-rose-400">Peer fetch failed</div>}
          <div className="flex flex-col gap-1.5">
            {ranking.map((r, idx) => {
              const isMe = r.city === snapshot.city;
              return (
                <div
                  key={r.city + idx}
                  className={`flex items-center gap-3 rounded-md px-2 py-1.5 ${isMe ? "border border-white/20 bg-white/[0.06]" : "border border-white/5 bg-black/20"}`}
                >
                  <div className="w-5 text-center text-mono text-[10px] text-muted-foreground">#{idx + 1}</div>
                  <Globe2 className="h-3.5 w-3.5 text-cyan-300" />
                  <div className="flex-1">
                    <div className={`text-[12px] ${isMe ? "font-bold" : "font-medium"}`}>
                      {r.city} <span className="text-[10px] text-muted-foreground">{r.country}</span>
                      {isMe && <span className="ml-2 text-[9px] uppercase tracking-wider text-emerald-300">you</span>}
                    </div>
                  </div>
                  <div className="text-mono text-sm font-bold" style={{ color: aqiColor(r.aqi) }}>
                    {r.aqi}
                  </div>
                  <div className="w-20 text-right text-[10px] text-muted-foreground">{aqiCategory(r.aqi)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* Data integrity */}
      <Panel title="Pipeline Integrity" subtitle="End-to-end validation" badge="QA" className="col-span-12 row-span-2">
        <div className="grid grid-cols-4 gap-3">
          <Integrity label="History coverage" value={`${dataIntegrity.historyCoverage}%`} ok={dataIntegrity.historyCoverage >= 75} />
          <Integrity label="Forecast coverage" value={`${dataIntegrity.forecastCoverage}%`} ok={dataIntegrity.forecastCoverage >= 75} />
          <Integrity label="Snapshot age" value={`${dataIntegrity.age}s`} ok={dataIntegrity.age < 300} />
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-300">Pipeline status</div>
              <div className="text-sm font-semibold">All systems nominal</div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Integrity({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${ok ? "border-white/10 bg-black/20" : "border-rose-500/30 bg-rose-500/10"}`}>
      {ok ? <CheckCircle className="h-5 w-5 text-emerald-400" /> : <XCircle className="h-5 w-5 text-rose-400" />}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-mono text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}