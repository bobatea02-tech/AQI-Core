import { createServerFn } from "@tanstack/react-start";

const OWM = "https://api.openweathermap.org";

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
}

function key() {
  const k = process.env.OPENWEATHER_API_KEY;
  if (!k) throw new Error("OPENWEATHER_API_KEY not configured");
  return k;
}

async function geocode(city: string) {
  const r = await fetch(
    `${OWM}/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${key()}`,
  );
  if (!r.ok) throw new Error(`Geocoding failed: ${r.status}`);
  const data = (await r.json()) as Array<{ name: string; country: string; lat: number; lon: number }>;
  if (!data.length) throw new Error(`City not found: ${city}`);
  return data[0];
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

export const getCitySnapshot = createServerFn({ method: "GET" })
  .inputValidator((d: { city: string }) => d)
  .handler(async ({ data }) => {
    try {
      const geo = await geocode(data.city);
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

      if (!currentRes.ok) throw new Error(`current ${currentRes.status}`);
      if (!forecastRes.ok) throw new Error(`forecast ${forecastRes.status}`);

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
      };
      return { ok: true as const, data: snapshot, error: null };
    } catch (e) {
      console.error("getCitySnapshot failed:", e);
      return {
        ok: false as const,
        data: null,
        error: e instanceof Error ? e.message : "Unknown error",
      };
    }
  });

export const getMultiCity = createServerFn({ method: "GET" })
  .inputValidator((d: { cities: string[] }) => d)
  .handler(async ({ data }) => {
    const results = await Promise.all(
      data.cities.map(async (c) => {
        try {
          const geo = await geocode(c);
          const r = await fetch(
            `${OWM}/data/2.5/air_pollution?lat=${geo.lat}&lon=${geo.lon}&appid=${key()}`,
          );
          if (!r.ok) return null;
          const j = (await r.json()) as { list: Array<Parameters<typeof toPoint>[0]> };
          return {
            city: geo.name,
            country: geo.country,
            lat: geo.lat,
            lon: geo.lon,
            point: toPoint(j.list[0]),
          };
        } catch {
          return null;
        }
      }),
    );
    return { results: results.filter((x): x is NonNullable<typeof x> => x !== null) };
  });