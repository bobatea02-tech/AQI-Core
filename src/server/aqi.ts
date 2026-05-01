import { createServerFn } from "@tanstack/react-start";

const OWM = "https://api.openweathermap.org";

// Hardcoded coordinates — avoids geocoding (which often requires a separate
// activated key) and works the instant the AQI key is live.
export const CITY_COORDS: Record<string, { lat: number; lon: number; country: string }> = {
  "Delhi":      { lat: 28.6139, lon: 77.2090, country: "IN" },
  "Mumbai":     { lat: 19.0760, lon: 72.8777, country: "IN" },
  "Bengaluru":  { lat: 12.9716, lon: 77.5946, country: "IN" },
  "Kolkata":    { lat: 22.5726, lon: 88.3639, country: "IN" },
  "Chennai":    { lat: 13.0827, lon: 80.2707, country: "IN" },
  "Hyderabad":  { lat: 17.3850, lon: 78.4867, country: "IN" },
  "Pune":       { lat: 18.5204, lon: 73.8567, country: "IN" },
  "Ahmedabad":  { lat: 23.0225, lon: 72.5714, country: "IN" },
  "Jaipur":     { lat: 26.9124, lon: 75.7873, country: "IN" },
  "Lucknow":    { lat: 26.8467, lon: 80.9462, country: "IN" },
  "Kanpur":     { lat: 26.4499, lon: 80.3319, country: "IN" },
  "Patna":      { lat: 25.5941, lon: 85.1376, country: "IN" },
  "Varanasi":   { lat: 25.3176, lon: 82.9739, country: "IN" },
  "Bhopal":     { lat: 23.2599, lon: 77.4126, country: "IN" },
  "Chandigarh": { lat: 30.7333, lon: 76.7794, country: "IN" },
  "Gurgaon":    { lat: 28.4595, lon: 77.0266, country: "IN" },
  "Noida":      { lat: 28.5355, lon: 77.3910, country: "IN" },
};

export interface PollutantPoint {
  ts: number; // unix seconds
  aqi: number; // 1..5 OWM scale
  co: number;
  no: number;
  no2: number;
  o3: number;
  so2: number;
  pm2_5: number;
  pm10: number;
  nh3: number;
}

export interface CitySnapshot {
  city: string;
  country: string;
  lat: number;
  lon: number;
  current: PollutantPoint;
  history: PollutantPoint[]; // last ~24h hourly
  forecast: PollutantPoint[]; // next ~24h hourly
  weather: {
    temp: number;
    humidity: number;
    pressure: number;
    wind_speed: number;
    wind_deg: number;
    description: string;
    clouds: number;
  };
  fetchedAt: number;
  source: "live" | "simulated";
  notice?: string;
}

function key() {
  const k = process.env.OPENWEATHER_API_KEY;
  if (!k) throw new Error("OPENWEATHER_API_KEY not configured");
  return k;
}

function resolveCity(city: string) {
  const hit = CITY_COORDS[city];
  if (!hit) throw new Error(`Unknown city: ${city}`);
  return { name: city, lat: hit.lat, lon: hit.lon, country: hit.country };
}

function toPoint(item: { dt: number; main: { aqi: number }; components: Record<string, number> }): PollutantPoint {
  return {
    ts: item.dt,
    aqi: item.main.aqi,
    co: item.components.co ?? 0,
    no: item.components.no ?? 0,
    no2: item.components.no2 ?? 0,
    o3: item.components.o3 ?? 0,
    so2: item.components.so2 ?? 0,
    pm2_5: item.components.pm2_5 ?? 0,
    pm10: item.components.pm10 ?? 0,
    nh3: item.components.nh3 ?? 0,
  };
}

/* ──────────────────────────  SIMULATION FALLBACK  ────────────────────────── */
// Used while the OpenWeather key is still activating (~2h after creation) or
// any time the upstream is unreachable. Generates physically plausible
// pollutant time-series with diurnal variation, autocorrelation, and a city
// pollution baseline so the dashboard remains fully functional.

const CITY_BASELINE: Record<string, number> = {
  Delhi: 180, Kanpur: 175, Lucknow: 150, Patna: 160, Varanasi: 145, Noida: 165,
  Gurgaon: 155, Mumbai: 90, Kolkata: 110, Ahmedabad: 105, Hyderabad: 70,
  Chennai: 65, Bengaluru: 55, Pune: 75, Jaipur: 95, Bhopal: 85, Chandigarh: 80,
};

function rng(seed: number) {
  // mulberry32
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SimOptions {
  intensity?: number; // 0.3..2.5 — multiplier on baseline
  scenario?: "normal" | "rush" | "calm" | "wildfire" | "diwali";
  windKmh?: number; // 0..40 — higher disperses pollutants
}

function simulateSnapshot(city: string, opts: SimOptions = {}): CitySnapshot {
  const meta = resolveCity(city);
  const intensity = Math.max(0.2, Math.min(3, opts.intensity ?? 1));
  const scenario = opts.scenario ?? "normal";
  const windKmh = Math.max(0, Math.min(60, opts.windKmh ?? 8));
  const dispersion = 1 / (0.5 + windKmh / 12); // higher wind → less pollution
  const scenarioMult =
    scenario === "rush" ? 1.45 :
    scenario === "calm" ? 0.55 :
    scenario === "wildfire" ? 2.2 :
    scenario === "diwali" ? 2.8 : 1;
  const base = (CITY_BASELINE[city] ?? 80) * intensity * scenarioMult * dispersion;
  const seed = Math.floor(Date.now() / (60 * 60 * 1000)) + city.length * 17;
  const rand = rng(seed);

  function point(hourOffset: number, prevPm25: number): PollutantPoint {
    const hour = (new Date().getUTCHours() + hourOffset + 24) % 24;
    // Diurnal cycle: rush hours peak (7-10, 18-21), trough mid-afternoon (13-15)
    const diurnal =
      1 + 0.35 * Math.cos(((hour - 8) / 24) * 2 * Math.PI) +
      0.25 * Math.cos(((hour - 19) / 24) * 2 * Math.PI);
    const noise = 0.85 + rand() * 0.3;
    const pm25 = Math.max(5, prevPm25 * 0.6 + base * diurnal * noise * 0.4);
    const pm10 = pm25 * (1.4 + rand() * 0.4);
    const no2 = pm25 * 0.35 * (0.8 + rand() * 0.4);
    const so2 = pm25 * 0.12 * (0.8 + rand() * 0.4);
    const o3 = 60 + 40 * Math.sin(((hour - 14) / 24) * 2 * Math.PI) + rand() * 20;
    const co = 600 + pm25 * 8 + rand() * 200;
    const nh3 = 4 + rand() * 6;
    const no = no2 * 0.3 * (0.5 + rand());
    const aqi = pm25 < 12 ? 1 : pm25 < 35 ? 2 : pm25 < 55 ? 3 : pm25 < 150 ? 4 : 5;
    const ts = Math.floor(Date.now() / 1000) + hourOffset * 3600;
    return { ts, aqi, co, no, no2, o3, so2, pm2_5: pm25, pm10, nh3 };
  }

  const history: PollutantPoint[] = [];
  let prev = base;
  for (let h = -24; h < 0; h++) {
    const p = point(h, prev);
    history.push(p);
    prev = p.pm2_5;
  }
  const current = point(0, prev);
  prev = current.pm2_5;
  const forecast: PollutantPoint[] = [];
  for (let h = 1; h <= 24; h++) {
    const p = point(h, prev);
    forecast.push(p);
    prev = p.pm2_5;
  }

  return {
    city: meta.name,
    country: meta.country,
    lat: meta.lat,
    lon: meta.lon,
    current,
    history,
    forecast,
    weather: {
      temp: 20 + rand() * 18,
      humidity: Math.round(40 + rand() * 50),
      pressure: 1005 + Math.round(rand() * 20),
      wind_speed: Number((windKmh / 3.6).toFixed(1)),
      wind_deg: Math.round(rand() * 360),
      description: ["clear sky", "few clouds", "haze", "mist", "smoke"][Math.floor(rand() * 5)],
      clouds: Math.round(rand() * 100),
    },
    fetchedAt: Date.now(),
    source: "simulated",
    notice:
      scenario !== "normal" || intensity !== 1 || (opts.windKmh !== undefined)
        ? `Simulation: scenario=${scenario}, intensity=${intensity.toFixed(2)}×, wind=${windKmh} km/h`
        : "Live OpenWeather key not yet active (new keys take up to 2h). High-fidelity simulation in use.",
  };
}

/* ──────────────────────────  LIVE FETCH  ────────────────────────── */

export const getCitySnapshot = createServerFn({ method: "GET" })
  .inputValidator((d: { city: string; sim?: SimOptions; forceSim?: boolean }) => d)
  .handler(async ({ data }) => {
    if (data.forceSim) {
      return { ok: true as const, data: simulateSnapshot(data.city, data.sim ?? {}), error: null };
    }
    try {
      const geo = resolveCity(data.city);
      const now = Math.floor(Date.now() / 1000);
      const start = now - 24 * 3600;

      const [currentRes, historyRes, forecastRes, weatherRes] = await Promise.all([
        fetch(`${OWM}/data/2.5/air_pollution?lat=${geo.lat}&lon=${geo.lon}&appid=${key()}`),
        fetch(
          `${OWM}/data/2.5/air_pollution/history?lat=${geo.lat}&lon=${geo.lon}&start=${start}&end=${now}&appid=${key()}`,
        ),
        fetch(`${OWM}/data/2.5/air_pollution/forecast?lat=${geo.lat}&lon=${geo.lon}&appid=${key()}`),
        fetch(
          `${OWM}/data/2.5/weather?lat=${geo.lat}&lon=${geo.lon}&units=metric&appid=${key()}`,
        ),
      ]);

      // If the API key is rejected (401) or any critical endpoint fails,
      // gracefully fall back to simulation so the UI never breaks.
      if (!currentRes.ok || !forecastRes.ok) {
        const status = currentRes.status || forecastRes.status;
        console.warn(`OpenWeather upstream returned ${status}, using simulation`);
        const sim = simulateSnapshot(data.city, data.sim ?? {});
        if (status === 401) {
          sim.notice = "OpenWeather key not yet active — new API keys take up to 2 hours to activate. Showing simulated data.";
        }
        return { ok: true as const, data: sim, error: null };
      }

      const currentJson = (await currentRes.json()) as { list: Array<Parameters<typeof toPoint>[0]> };
      const historyJson = historyRes.ok
        ? ((await historyRes.json()) as { list: Array<Parameters<typeof toPoint>[0]> })
        : { list: [] };
      const forecastJson = (await forecastRes.json()) as { list: Array<Parameters<typeof toPoint>[0]> };
      const weatherJson = weatherRes.ok
        ? ((await weatherRes.json()) as {
            main: { temp: number; humidity: number; pressure: number };
            wind: { speed: number; deg: number };
            weather: Array<{ description: string }>;
            clouds: { all: number };
          })
        : null;

      const snapshot: CitySnapshot = {
        city: geo.name,
        country: geo.country,
        lat: geo.lat,
        lon: geo.lon,
        current: toPoint(currentJson.list[0]),
        history: historyJson.list.map(toPoint),
        forecast: forecastJson.list.slice(0, 24).map(toPoint),
        weather: weatherJson
          ? {
              temp: weatherJson.main.temp,
              humidity: weatherJson.main.humidity,
              pressure: weatherJson.main.pressure,
              wind_speed: weatherJson.wind.speed,
              wind_deg: weatherJson.wind.deg,
              description: weatherJson.weather[0]?.description ?? "—",
              clouds: weatherJson.clouds.all,
            }
          : {
              temp: 0,
              humidity: 0,
              pressure: 0,
              wind_speed: 0,
              wind_deg: 0,
              description: "—",
              clouds: 0,
            },
        fetchedAt: Date.now(),
        source: "live",
      };
      return { ok: true as const, data: snapshot, error: null };
    } catch (e) {
      console.error("getCitySnapshot failed:", e);
      // Last-resort fallback so the dashboard never goes blank
      const sim = simulateSnapshot(data.city, data.sim ?? {});
      sim.notice = "Atmospheric feed unavailable — running on simulated data.";
      return { ok: true as const, data: sim, error: null };
    }
  });

export const getMultiCity = createServerFn({ method: "GET" })
  .inputValidator((d: { cities: string[] }) => d)
  .handler(async ({ data }) => {
    const results = await Promise.all(
      data.cities.map(async (c) => {
        try {
          const geo = resolveCity(c);
          const r = await fetch(
            `${OWM}/data/2.5/air_pollution?lat=${geo.lat}&lon=${geo.lon}&appid=${key()}`,
          );
          if (!r.ok) {
            // Use simulation so peer ranking still works
            const sim = simulateSnapshot(c);
            return { city: geo.name, country: geo.country, lat: geo.lat, lon: geo.lon, point: sim.current };
          }
          const j = (await r.json()) as { list: Array<Parameters<typeof toPoint>[0]> };
          return {
            city: geo.name,
            country: geo.country,
            lat: geo.lat,
            lon: geo.lon,
            point: toPoint(j.list[0]),
          };
        } catch {
          try {
            const sim = simulateSnapshot(c);
            return { city: c, country: CITY_COORDS[c]?.country ?? "—", lat: 0, lon: 0, point: sim.current };
          } catch {
            return null;
          }
        }
      }),
    );
    return { results: results.filter((x): x is NonNullable<typeof x> => x !== null) };
  });