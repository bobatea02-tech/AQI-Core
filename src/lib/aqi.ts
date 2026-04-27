// US EPA AQI breakpoints for PM2.5, PM10, O3 (1h), NO2 (1h), SO2 (1h), CO (8h)
// Concentrations are in µg/m³ (OpenWeather native unit) -> convert where needed.

export type AqiCategory =
  | "Good"
  | "Moderate"
  | "Unhealthy for SG"
  | "Unhealthy"
  | "Very Unhealthy"
  | "Hazardous";

const PM25_BP: Array<[number, number, number, number]> = [
  [0.0, 12.0, 0, 50],
  [12.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 150.4, 151, 200],
  [150.5, 250.4, 201, 300],
  [250.5, 500.4, 301, 500],
];
const PM10_BP: Array<[number, number, number, number]> = [
  [0, 54, 0, 50],
  [55, 154, 51, 100],
  [155, 254, 101, 150],
  [255, 354, 151, 200],
  [355, 424, 201, 300],
  [425, 604, 301, 500],
];

function calcAqi(conc: number, bp: typeof PM25_BP) {
  for (const [cl, ch, il, ih] of bp) {
    if (conc >= cl && conc <= ch) {
      return Math.round(((ih - il) / (ch - cl)) * (conc - cl) + il);
    }
  }
  return conc > bp[bp.length - 1][1] ? 500 : 0;
}

export function pm25ToAqi(c: number) {
  return calcAqi(c, PM25_BP);
}
export function pm10ToAqi(c: number) {
  return calcAqi(c, PM10_BP);
}

export function compositeAqi(pm25: number, pm10: number) {
  return Math.max(pm25ToAqi(pm25), pm10ToAqi(pm10));
}

export function aqiCategory(aqi: number): AqiCategory {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for SG";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

export function aqiColor(aqi: number) {
  if (aqi <= 50) return "var(--color-aqi-good)";
  if (aqi <= 100) return "var(--color-aqi-fair)";
  if (aqi <= 150) return "var(--color-aqi-moderate)";
  if (aqi <= 200) return "var(--color-aqi-poor)";
  if (aqi <= 300) return "var(--color-aqi-very-poor)";
  return "var(--color-aqi-hazard)";
}

export function aqiGradient(aqi: number) {
  if (aqi <= 50) return "var(--gradient-good)";
  if (aqi <= 100) return "linear-gradient(135deg, oklch(0.85 0.17 95), oklch(0.78 0.18 65))";
  if (aqi <= 150) return "var(--gradient-warn)";
  return "var(--gradient-danger)";
}

// Health advisory per category
export function healthAdvice(aqi: number) {
  if (aqi <= 50)
    return { headline: "Air quality is excellent", detail: "Ideal for outdoor activity. No precautions needed." };
  if (aqi <= 100)
    return { headline: "Acceptable for most", detail: "Sensitive groups should limit prolonged outdoor exertion." };
  if (aqi <= 150)
    return { headline: "Unhealthy for sensitive groups", detail: "Children, elderly, and those with respiratory conditions should reduce outdoor activity." };
  if (aqi <= 200)
    return { headline: "Unhealthy for everyone", detail: "Limit outdoor exposure. Consider wearing N95 masks outdoors." };
  if (aqi <= 300)
    return { headline: "Very unhealthy", detail: "Avoid outdoor activity. Run air purifiers indoors." };
  return { headline: "Hazardous — health emergency", detail: "Stay indoors with windows sealed. Use HEPA filtration." };
}

// Simple WHO-style pollutant guidelines (24h or 1h targets)
export const WHO_LIMITS = {
  pm2_5: 15, // 24h µg/m³
  pm10: 45,
  no2: 25,
  so2: 40,
  o3: 100,
  co: 4000,
};

// Pearson correlation coefficient
export function pearson(xs: number[], ys: number[]) {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let num = 0,
    dx = 0,
    dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

// Linear regression y = a + b*x
export function linreg(xs: number[], ys: number[]) {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return { a: 0, b: 0, r2: 0 };
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0,
    den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const b = den === 0 ? 0 : num / den;
  const a = my - b * mx;
  let ssRes = 0,
    ssTot = 0;
  for (let i = 0; i < n; i++) {
    const yhat = a + b * xs[i];
    ssRes += (ys[i] - yhat) ** 2;
    ssTot += (ys[i] - my) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { a, b, r2 };
}

export function describePollutant(k: string) {
  const map: Record<string, { name: string; unit: string; desc: string }> = {
    pm2_5: { name: "PM2.5", unit: "µg/m³", desc: "Fine particulate matter" },
    pm10: { name: "PM10", unit: "µg/m³", desc: "Coarse particulate matter" },
    no2: { name: "NO₂", unit: "µg/m³", desc: "Nitrogen dioxide — traffic" },
    so2: { name: "SO₂", unit: "µg/m³", desc: "Sulfur dioxide — industry" },
    o3: { name: "O₃", unit: "µg/m³", desc: "Ground-level ozone" },
    co: { name: "CO", unit: "µg/m³", desc: "Carbon monoxide" },
    nh3: { name: "NH₃", unit: "µg/m³", desc: "Ammonia — agriculture" },
    no: { name: "NO", unit: "µg/m³", desc: "Nitric oxide" },
  };
  return map[k] ?? { name: k, unit: "µg/m³", desc: "" };
}