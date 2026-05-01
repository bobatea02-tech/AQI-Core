import { motion } from "framer-motion";
import { Activity, MapPin, RefreshCw, Wind } from "lucide-react";
import { aqiCategory, aqiColor, aqiGradient, compositeAqi } from "@/lib/aqi";
import type { CitySnapshot } from "@/server/aqi";

interface Props {
  snapshot: CitySnapshot;
  city: string;
  cities: string[];
  onCityChange: (c: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export function Header({ snapshot, city, cities, onCityChange, onRefresh, refreshing }: Props) {
  const aqi = compositeAqi(snapshot.current.pm2_5, snapshot.current.pm10);
  const category = aqiCategory(aqi);
  const color = aqiColor(aqi);
  const gradient = aqiGradient(aqi);

  const since = Math.floor((Date.now() - snapshot.fetchedAt) / 1000);

  return (
    <header className="relative z-20 flex items-center gap-5 border-b border-white/5 bg-card-gradient px-7 py-4 shadow-card">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <motion.div
          initial={{ rotate: -10, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-accent shadow-glow"
        >
          <Wind className="h-5 w-5 text-white" />
          <span className="absolute inset-0 rounded-lg animate-pulse-ring" />
        </motion.div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight">AQI Core</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Predictive Atmospherics</div>
        </div>
      </div>

      <div className="mx-2 h-10 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />

      {/* Live AQI orb */}
      <motion.div
        key={aqi}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="flex items-center gap-3"
      >
        <div
          className="relative flex h-14 w-14 items-center justify-center rounded-full text-mono font-bold text-[20px] text-black/85"
          style={{ background: gradient, boxShadow: `0 0 28px -4px ${color}` }}
        >
          {aqi}
          <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-background animate-pulse" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Composite AQI · US EPA</div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold" style={{ color }}>
              {category}
            </span>
            <span className="text-[11px] text-mono text-muted-foreground">
              PM2.5 {snapshot.current.pm2_5.toFixed(1)} · PM10 {snapshot.current.pm10.toFixed(1)} µg/m³
            </span>
          </div>
        </div>
      </motion.div>

      <div className="ml-auto flex items-center gap-4">
        {/* Mini KPI row */}
        <MiniStat label="Temp" value={`${snapshot.weather.temp.toFixed(1)}°`} />
        <MiniStat label="Humidity" value={`${snapshot.weather.humidity}%`} />
        <MiniStat label="Wind" value={`${snapshot.weather.wind_speed.toFixed(1)} m/s`} />
        <MiniStat label="OWM AQI" value={`${snapshot.current.aqi}/5`} />

        <div className="h-10 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />

        {/* City selector */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3.5 py-2 transition hover:border-white/20 hover:bg-black/40">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            className="cursor-pointer bg-transparent text-sm font-medium outline-none [&>option]:bg-neutral-900"
          >
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onRefresh}
          className="group flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3.5 py-2 text-xs font-medium transition hover:border-white/20 hover:bg-white/5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : "group-hover:rotate-90 transition-transform"}`} />
          <span className="text-mono text-muted-foreground">{since}s ago</span>
        </button>

        <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 shadow-[0_0_20px_-5px_oklch(0.78_0.18_150_/_0.5)]">
          <Activity className="h-3 w-3 text-emerald-400 animate-pulse" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Live</span>
        </div>
      </div>
    </header>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <span className="text-mono text-[13px] font-semibold">{value}</span>
    </div>
  );
}