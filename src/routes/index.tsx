import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, BarChart3, Brain, GitCompareArrows, GitMerge, ShieldCheck, Wind } from "lucide-react";
import { getCitySnapshot, type SimOptions } from "@/server/aqi";
import { Header } from "@/components/aqi/Header";
import { TabOverview } from "@/components/aqi/TabOverview";
import { TabPipeline } from "@/components/aqi/TabPipeline";
import { TabPredict } from "@/components/aqi/TabPredict";
import { TabCorrelation } from "@/components/aqi/TabCorrelation";
import { TabSources } from "@/components/aqi/TabSources";
import { TabValidation } from "@/components/aqi/TabValidation";
import { TabCompare } from "@/components/aqi/TabCompare";

const CITIES = [
  "Delhi", "Mumbai", "Bengaluru", "Kolkata", "Chennai", "Hyderabad",
  "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Kanpur", "Patna",
  "Varanasi", "Bhopal", "Chandigarh", "Gurgaon", "Noida",
];

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "pipeline", label: "Pipeline & EDA", icon: GitMerge },
  { id: "predict", label: "Forecast", icon: Brain },
  { id: "correlate", label: "Correlations", icon: BarChart3 },
  { id: "compare", label: "Compare Cities", icon: GitCompareArrows },
  { id: "sources", label: "Sources", icon: Wind },
  { id: "validate", label: "Validation", icon: ShieldCheck },
] as const;

function Dashboard() {
  const router = useRouter();
  const [city, setCity] = useState("Delhi");
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("overview");
  const [forceSim, setForceSim] = useState(false);
  const [simOptions, setSimOptions] = useState<SimOptions>({ intensity: 1, windKmh: 8, scenario: "normal" });

  const query = useQuery({
    queryKey: ["aqi", city, forceSim, simOptions],
    queryFn: () => getCitySnapshot({ data: { city, forceSim, sim: simOptions } }),
    refetchInterval: 5 * 60_000,
  });

  return (
    <div className="bg-app grid-dots relative flex h-screen w-screen flex-col overflow-hidden text-foreground">
      {/* ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-violet-500/15 blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 30, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-0 bottom-0 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[140px]"
        />
      </div>

      {query.data?.ok && query.data.data ? (
        <Header
          snapshot={query.data.data}
          city={city}
          cities={CITIES}
          onCityChange={setCity}
          onRefresh={() => router.invalidate().then(() => query.refetch())}
          refreshing={query.isFetching}
          forceSim={forceSim}
          onForceSim={setForceSim}
          simOptions={simOptions}
          onSimChange={setSimOptions}
        />
      ) : (
        <SkeletonHeader city={city} cities={CITIES} onCityChange={setCity} loading={query.isLoading} error={query.data?.error || (query.error instanceof Error ? query.error.message : null)} />
      )}

      {/* Source notice banner */}
      <AnimatePresence>
        {query.data?.ok && query.data.data?.notice && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 overflow-hidden border-b border-amber-500/20 bg-amber-500/5"
          >
            <div className="flex items-center gap-2.5 px-6 py-2 text-[11px]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
              <span className="font-semibold uppercase tracking-[0.16em] text-amber-300">
                {query.data.data.source === "simulated" ? "Simulation Mode" : "Notice"}
              </span>
              <span className="text-amber-100/80">{query.data.data.notice}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 px-6 pb-5 pt-4">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
        <TabsList className="h-11 w-fit gap-1 rounded-2xl border border-white/5 bg-black/40 p-1.5 backdrop-blur-xl shadow-card">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className="group relative flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-gradient-accent data-[state=active]:text-white data-[state=active]:shadow-glow"
            >
              <t.icon className="h-3.5 w-3.5 transition-transform group-data-[state=active]:scale-110" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        </motion.div>

        <div className="relative min-h-0 flex-1">
          <AnimatePresence mode="wait">
            {!query.data?.ok || !query.data.data ? (
              <motion.div key="empty" className="flex h-full items-center justify-center">
                <div className="text-sm text-muted-foreground">
                  {query.isLoading ? "Loading atmospheric data…" : query.data?.error || "No data"}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 14, scale: 0.985, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, scale: 0.99, filter: "blur(4px)" }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                <TabsContent value="overview" className="m-0 h-full data-[state=inactive]:hidden">
                  {tab === "overview" && <TabOverview snapshot={query.data.data} />}
                </TabsContent>
                <TabsContent value="pipeline" className="m-0 h-full data-[state=inactive]:hidden">
                  {tab === "pipeline" && <TabPipeline snapshot={query.data.data} />}
                </TabsContent>
                <TabsContent value="predict" className="m-0 h-full data-[state=inactive]:hidden">
                  {tab === "predict" && <TabPredict snapshot={query.data.data} />}
                </TabsContent>
                <TabsContent value="correlate" className="m-0 h-full data-[state=inactive]:hidden">
                  {tab === "correlate" && <TabCorrelation snapshot={query.data.data} />}
                </TabsContent>
                <TabsContent value="compare" className="m-0 h-full data-[state=inactive]:hidden">
                  {tab === "compare" && <TabCompare primaryCity={city} cities={CITIES} />}
                </TabsContent>
                <TabsContent value="sources" className="m-0 h-full data-[state=inactive]:hidden">
                  {tab === "sources" && <TabSources snapshot={query.data.data} />}
                </TabsContent>
                <TabsContent value="validate" className="m-0 h-full data-[state=inactive]:hidden">
                  {tab === "validate" && <TabValidation snapshot={query.data.data} />}
                </TabsContent>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  );
}

function SkeletonHeader({
  city,
  cities,
  onCityChange,
  loading,
  error,
}: {
  city: string;
  cities: string[];
  onCityChange: (c: string) => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <header className="relative flex items-center gap-4 border-b border-white/5 bg-card-gradient px-5 py-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-accent">
          <Wind className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-[15px] font-semibold">AQI Core</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Predictive Atmospherics</div>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <select value={city} onChange={(e) => onCityChange(e.target.value)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-sm outline-none [&>option]:bg-neutral-900">
          {cities.map((c) => (<option key={c} value={c}>{c}</option>))}
        </select>
        <div className={`text-xs ${error ? "text-rose-400" : "text-muted-foreground"}`}>
          {loading ? "Connecting to atmospheric feed…" : error || "Idle"}
        </div>
      </div>
    </header>
  );
}
