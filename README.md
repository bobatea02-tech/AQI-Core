# AQI Core — Predictive Atmospherics Dashboard

> Real-time air quality monitoring, forecasting, and analytics for Indian cities — powered by OpenWeather and built on a modern React + TanStack stack.

---

## Overview

AQI Core is a full-stack analytical dashboard that tracks, visualizes, and predicts air quality across 17 major Indian cities. It ingests live pollutant data from the OpenWeather Air Pollution API, computes US EPA AQI scores, and presents everything through a rich, animated dark-mode interface with six specialized analytical views.

When the OpenWeather API key is not yet active (new keys take up to 2 hours), the app automatically falls back to a high-fidelity simulation engine that generates physically plausible pollutant time-series with realistic diurnal variation — so the dashboard is always fully functional.

---

## Screenshots

> The dashboard runs entirely in the browser. Open `http://localhost:3000` after starting the dev server.

---

## Features

### Live Data & Smart Fallback
- Fetches current conditions, 24h history, and 24h forecast for any supported city
- Pulls weather context (temperature, humidity, wind, pressure) alongside pollutant data
- Gracefully falls back to a seeded simulation when the API key is inactive or the upstream is unreachable
- Auto-refreshes every 5 minutes with a manual refresh button

### Six Analytical Tabs

| Tab | Description |
|---|---|
| **Overview** | Live AQI gauge with animated orb, 24h trend sparkline, dominant pollutant, health advisory, pollutant burden pie chart, and smart recommendation |
| **Pipeline & EDA** | ETL stage visualization, full descriptive statistics table (mean, median, min, max, σ, gaps) for all 8 species, mean concentration bar chart, and raw time-series stream |
| **Forecast** | 24h AQI prediction with 95% confidence interval band, linear regression model stats (R², σ, slope), peak and cleanest hour callouts, next-6-hour hourly breakdown |
| **Correlations** | Pearson correlation heatmap across all 7 pollutant species, PM2.5 × O₃ bivariate scatter plot sized by AQI, top-5 strongest pollutant relationships |
| **Sources** | Heuristic source attribution (Traffic, Industry, Combustion, Photochemical, Agriculture) derived from chemical signatures, 24h source mix evolution chart, wind direction compass |
| **Validation** | WHO 2021 Air Quality Guideline compliance checks for all 6 key pollutants, global city benchmark ranking against world peers, pipeline integrity QA panel |

### AQI Engine
- Implements full US EPA breakpoint tables for PM2.5 and PM10
- Computes composite AQI as `max(PM2.5_AQI, PM10_AQI)`
- Maps AQI to six categories: Good → Moderate → Unhealthy for Sensitive Groups → Unhealthy → Very Unhealthy → Hazardous
- Provides personalized health advisories and color-coded visual indicators per category

### Analytics Library (`src/lib/aqi.ts`)
- `pm25ToAqi` / `pm10ToAqi` — EPA breakpoint interpolation
- `compositeAqi` — dominant pollutant AQI
- `aqiCategory` / `aqiColor` / `aqiGradient` — visual mapping
- `healthAdvice` — category-specific health guidance
- `pearson` — Pearson correlation coefficient
- `linreg` — linear regression with R² score
- `describePollutant` — human-readable pollutant metadata
- `WHO_LIMITS` — WHO 2021 24h guideline thresholds

---

## Supported Cities

| City | State/Region |
|---|---|
| Delhi | NCT |
| Mumbai | Maharashtra |
| Bengaluru | Karnataka |
| Kolkata | West Bengal |
| Chennai | Tamil Nadu |
| Hyderabad | Telangana |
| Pune | Maharashtra |
| Ahmedabad | Gujarat |
| Jaipur | Rajasthan |
| Lucknow | Uttar Pradesh |
| Kanpur | Uttar Pradesh |
| Patna | Bihar |
| Varanasi | Uttar Pradesh |
| Bhopal | Madhya Pradesh |
| Chandigarh | Punjab/Haryana |
| Gurgaon | Haryana |
| Noida | Uttar Pradesh |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [React 19](https://react.dev) |
| Routing | [TanStack Router](https://tanstack.com/router) + [TanStack Start](https://tanstack.com/start) |
| Data Fetching | [TanStack Query](https://tanstack.com/query) |
| Build Tool | [Vite 7](https://vitejs.dev) |
| Language | TypeScript 5 |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| UI Components | [shadcn/ui](https://ui.shadcn.com) (Radix UI primitives) |
| Charts | [Recharts](https://recharts.org) |
| Animations | [Framer Motion](https://www.framer.com/motion) |
| Icons | [Lucide React](https://lucide.dev) |
| Forms | React Hook Form + Zod |
| Deployment | [Cloudflare Workers](https://workers.cloudflare.com) via Wrangler |
| Data Source | [OpenWeather Air Pollution API](https://openweathermap.org/api/air-pollution) |

---

## Project Structure

```
AQI-Core/
├── src/
│   ├── components/
│   │   ├── aqi/
│   │   │   ├── Header.tsx          # Top bar — live AQI orb, city selector, weather KPIs
│   │   │   ├── Panel.tsx           # Reusable animated card container
│   │   │   ├── TabOverview.tsx     # Overview tab
│   │   │   ├── TabPipeline.tsx     # Pipeline & EDA tab
│   │   │   ├── TabPredict.tsx      # Forecast tab
│   │   │   ├── TabCorrelation.tsx  # Correlations tab
│   │   │   ├── TabSources.tsx      # Source attribution tab
│   │   │   └── TabValidation.tsx   # WHO validation & global ranking tab
│   │   └── ui/                     # shadcn/ui component library
│   ├── hooks/
│   │   └── use-mobile.tsx
│   ├── lib/
│   │   ├── aqi.ts                  # AQI engine, statistics, WHO limits
│   │   └── utils.ts                # Tailwind class utilities
│   ├── routes/
│   │   ├── __root.tsx              # Root layout
│   │   └── index.tsx               # Main dashboard page
│   ├── server/
│   │   └── aqi.ts                  # Server functions — OpenWeather API + simulation fallback
│   ├── router.tsx
│   ├── routeTree.gen.ts
│   └── styles.css                  # Global styles, design tokens, AQI color system
├── start.bat                       # One-click Windows startup script
├── vite.config.ts
├── wrangler.jsonc                  # Cloudflare Workers deployment config
├── tsconfig.json
└── package.json
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18 or later
- An [OpenWeather API key](https://openweathermap.org/api) (free tier works — sign up and activate the Air Pollution API)

> **Note:** New OpenWeather API keys take up to 2 hours to activate. The app runs in simulation mode until then.

### 1. Clone the repository

```bash
git clone https://github.com/bobatea02-tech/AQI-Core.git
cd AQI-Core
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure your API key

Create a `.env` file in the project root:

```env
OPENWEATHER_API_KEY=your_api_key_here
```

### 4. Start the development server

**Windows (one-click):**
```
start.bat
```

**Manual:**
```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Production build |
| `npm run build:dev` | Development build (unminified) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

---

## Deployment

AQI Core is configured for deployment to **Cloudflare Workers** via Wrangler.

```bash
# Install Wrangler globally
npm install -g wrangler

# Authenticate
wrangler login

# Set your API key as a secret
wrangler secret put OPENWEATHER_API_KEY

# Build and deploy
npm run build
wrangler deploy
```

The `wrangler.jsonc` is pre-configured with `nodejs_compat` compatibility flags for the TanStack Start server entry point.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENWEATHER_API_KEY` | Yes | Your OpenWeather API key. Get one free at [openweathermap.org](https://openweathermap.org/api) |

---

## How the Simulation Works

When the live API is unavailable, `simulateSnapshot()` generates realistic data using:

- **City baselines** — each city has a pollution baseline (e.g. Delhi: 180, Bengaluru: 55) reflecting real-world conditions
- **Diurnal variation** — PM2.5 peaks during morning and evening rush hours (7–10h, 18–21h) and troughs in the afternoon
- **Autocorrelation** — each hour's value is 60% influenced by the previous hour, preventing unrealistic jumps
- **Seeded randomness** — the seed is based on the current hour and city name, so values are consistent within a session but change each hour
- **Derived pollutants** — NO₂, SO₂, O₃, CO, NH₃, and NO are computed from PM2.5 using realistic chemical ratios

---

## AQI Color Scale

| AQI Range | Category | Color |
|---|---|---|
| 0 – 50 | Good | 🟢 Green |
| 51 – 100 | Moderate | 🟡 Yellow |
| 101 – 150 | Unhealthy for Sensitive Groups | 🟠 Orange |
| 151 – 200 | Unhealthy | 🔴 Red |
| 201 – 300 | Very Unhealthy | 🟣 Purple |
| 301 – 500 | Hazardous | 🟤 Maroon |

---

## WHO Pollutant Guidelines (2021)

| Pollutant | 24h Limit |
|---|---|
| PM2.5 | 15 µg/m³ |
| PM10 | 45 µg/m³ |
| NO₂ | 25 µg/m³ |
| SO₂ | 40 µg/m³ |
| O₃ | 100 µg/m³ |
| CO | 4000 µg/m³ |

---

## Design System

AQI Core uses a custom dark-mode-first design system built on Tailwind CSS v4 with OKLCH color space:

- **Background** — deep navy gradient with radial ambient orbs
- **Cards** — glassmorphism panels with backdrop blur and subtle top highlight
- **Typography** — tabular-nums monospace for all data values
- **Grid** — dot-grid background texture for depth
- **Animations** — spring-based entrance animations, pulse rings, floating orbs via Framer Motion

---

## License

This project is private. All rights reserved.

---

## Author

**bobatea02-tech** — [GitHub](https://github.com/bobatea02-tech)
