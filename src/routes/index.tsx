import { createFileRoute } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, Tooltip, CartesianGrid,
} from "recharts";
import {
  Heart, Home, Library, LineChart as LineChartIcon, Settings, Bluetooth,
  Volume2, Sun, Users2, Hand, Wind, Sparkles, Plus, ChevronDown,
  X, Shield, Trash2, Eye, Zap, ArrowLeft, Lock, Play, Pause, MessageCircle, Star, Edit3,
  Waves,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: AuraApp });

// ---------- Types & mock data ----------
type TriggerKey = "sound" | "light" | "touch" | "crowd" | "movement" | "smell";
type Screen =
  | "welcome" | "profile" | "home" | "alert" | "crisis" | "library"
  | "history" | "caretaker-gate" | "caretaker" | "wearable" | "settings";

type HistoryEvent = {
  id: string; time: number; trigger: TriggerKey | "self"; score: number;
  action: "tried" | "dismissed" | "ok" | "crisis"; note?: string;
};

type Strategy = {
  id: string; title: string; note?: string; trigger: TriggerKey;
  helped: number; tried: number; custom?: boolean;
};

const TRIGGERS: { key: TriggerKey; label: string; icon: typeof Volume2 }[] = [
  { key: "sound", label: "Sound", icon: Volume2 },
  { key: "light", label: "Light", icon: Sun },
  { key: "touch", label: "Touch", icon: Hand },
  { key: "crowd", label: "Crowding", icon: Users2 },
  { key: "movement", label: "Movement", icon: Waves },
  { key: "smell", label: "Smell", icon: Wind },
];

const PRESETS: { name: string; triggers: Partial<Record<TriggerKey, number>> }[] = [
  { name: "Sound-sensitive", triggers: { sound: 5, crowd: 3 } },
  { name: "Light-sensitive", triggers: { light: 5, sound: 2 } },
  { name: "Crowd-sensitive", triggers: { crowd: 5, sound: 3, movement: 2 } },
];

const ENVIRONMENTS = ["Classroom", "Bus", "Mall", "Home", "Exam hall"];

const DEFAULT_STRATEGIES: Strategy[] = [
  { id: "s1", title: "Put on noise-cancelling headphones", trigger: "sound", helped: 8, tried: 10 },
  { id: "s2", title: "Step outside for 2 minutes", trigger: "crowd", helped: 7, tried: 9 },
  { id: "s3", title: "5-4-3-2-1 grounding", trigger: "sound", helped: 6, tried: 8 },
  { id: "s4", title: "Dim your screen & find shade", trigger: "light", helped: 9, tried: 10 },
  { id: "s5", title: "Wear sunglasses indoors", trigger: "light", helped: 5, tried: 7 },
  { id: "s6", title: "Slow box breathing", trigger: "movement", helped: 7, tried: 9 },
  { id: "s7", title: "Deep-pressure squeeze (hands together)", trigger: "touch", helped: 6, tried: 8 },
  { id: "s8", title: "Move to a quieter corner", trigger: "crowd", helped: 8, tried: 11 },
  { id: "s9", title: "Sip cool water slowly", trigger: "smell", helped: 4, tried: 6 },
];

const seedHistory = (): HistoryEvent[] => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return [
    { id: "h1", time: now - 6 * day, trigger: "sound", score: 6, action: "tried", note: "Bus ride home" },
    { id: "h2", time: now - 5 * day, trigger: "light", score: 4, action: "dismissed" },
    { id: "h3", time: now - 4 * day, trigger: "crowd", score: 7, action: "crisis", note: "School hallway" },
    { id: "h4", time: now - 3 * day, trigger: "sound", score: 5, action: "tried" },
    { id: "h5", time: now - 2 * day, trigger: "sound", score: 3, action: "ok" },
    { id: "h6", time: now - 1 * day, trigger: "crowd", score: 6, action: "tried", note: "Cafeteria" },
    { id: "h7", time: now - 3 * 60 * 60 * 1000, trigger: "self", score: 4, action: "tried" },
  ];
};

// ---------- Risk engine ----------
function computeRisk(noiseDb: number, lightLux: number, selfReport: number, profile: Partial<Record<TriggerKey, number>>) {
  const factors: { label: string; weight: number }[] = [];
  const soundSens = (profile.sound ?? 2) / 5;
  const noiseScore = Math.max(0, Math.min(5, ((noiseDb - 50) / 10))) * (0.5 + soundSens);
  if (noiseScore > 1.2) factors.push({ label: `Noise around ${Math.round(noiseDb)} dB`, weight: noiseScore });

  const lightSens = (profile.light ?? 2) / 5;
  const lightScore = Math.max(0, Math.min(5, ((lightLux - 300) / 200))) * (0.5 + lightSens);
  if (lightScore > 1) factors.push({ label: `Bright light (${Math.round(lightLux)} lux)`, weight: lightScore });

  const selfScore = (selfReport - 1) * 1.2;
  if (selfReport >= 3) factors.push({ label: `You said you feel ${selfReport}/5`, weight: selfScore });

  const raw = noiseScore + lightScore + selfScore;
  const score = Math.max(0, Math.min(10, Math.round(raw)));
  const level: "low" | "medium" | "high" = score <= 2 ? "low" : score <= 4 ? "medium" : "high";
  return { score, level, factors: factors.sort((a, b) => b.weight - a.weight).slice(0, 3) };
}

// ---------- Root app ----------
function AuraApp() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [profile, setProfile] = useState<Partial<Record<TriggerKey, number>>>({ sound: 4, crowd: 3, light: 2 });
  const [environments, setEnvironments] = useState<string[]>(["Classroom", "Bus"]);
  const [ageGroup, setAgeGroup] = useState("Teen");
  const [commStyle, setCommStyle] = useState<"text" | "emoji" | "visual">("text");

  const [noise, setNoise] = useState(55);
  const [light, setLight] = useState(350);
  const [selfReport, setSelfReport] = useState(2);
  const [bleConnected, setBleConnected] = useState(false);

  const [strategies, setStrategies] = useState<Strategy[]>(DEFAULT_STRATEGIES);
  const [history, setHistory] = useState<HistoryEvent[]>(seedHistory());
  const [accommodations, setAccommodations] = useState<{ id: string; time: number; text: string }[]>([
    { id: "a1", time: Date.now() - 2 * 86400000, text: "Allowed headphones during math class" },
    { id: "a2", time: Date.now() - 5 * 86400000, text: "Moved seat away from the window" },
  ]);

  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [sensitivity, setSensitivity] = useState(3);

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertShownForScore, setAlertShownForScore] = useState<number | null>(null);

  const risk = useMemo(() => computeRisk(noise, light, selfReport, profile), [noise, light, selfReport, profile]);

  useEffect(() => {
    if (risk.score >= 3 && alertShownForScore === null && screen !== "crisis" && screen !== "welcome" && screen !== "profile") {
      setAlertOpen(true);
      setAlertShownForScore(risk.score);
    }
    if (risk.score < 3) setAlertShownForScore(null);
  }, [risk.score, screen, alertShownForScore]);

  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", highContrast);
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
  }, [highContrast, reduceMotion]);

  const primaryTrigger: TriggerKey = useMemo(() => {
    const entries = Object.entries(profile) as [TriggerKey, number][];
    if (!entries.length) return "sound";
    return entries.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0][0];
  }, [profile]);

  const suggestions = useMemo(() => {
    const matched = strategies.filter((s) => s.trigger === primaryTrigger);
    const rest = strategies.filter((s) => s.trigger !== primaryTrigger);
    return [...matched, ...rest].slice(0, 3);
  }, [strategies, primaryTrigger]);

  const logEvent = (e: Omit<HistoryEvent, "id" | "time">) =>
    setHistory((h) => [{ id: Math.random().toString(36).slice(2), time: Date.now(), ...e }, ...h]);

  const goCrisis = () => { setAlertOpen(false); setScreen("crisis"); logEvent({ trigger: "self", score: risk.score, action: "crisis" }); };

  const showTabs = ["home", "library", "history", "wearable", "settings"].includes(screen);

  return (
    <div className="h-dvh bg-background text-foreground overflow-hidden">
      <main className="mx-auto flex h-dvh w-full max-w-[420px] flex-col bg-background sm:my-4 sm:h-[calc(100dvh-2rem)] sm:rounded-[2rem]" style={{ boxShadow: "12px 12px 30px rgba(163,177,198,0.35), -12px -12px 30px rgba(255,255,255,0.9)" }}>
        <div className="relative flex-1 overflow-hidden">
          {screen === "welcome" && <Welcome onNext={() => setScreen("profile")} />}
          {screen === "profile" && (
            <ProfileSetup
              profile={profile} setProfile={setProfile}
              environments={environments} setEnvironments={setEnvironments}
              ageGroup={ageGroup} setAgeGroup={setAgeGroup}
              commStyle={commStyle} setCommStyle={setCommStyle}
              onDone={() => setScreen("home")}
            />
          )}
          {screen === "home" && (
            <HomeDashboard
              risk={risk} selfReport={selfReport} setSelfReport={setSelfReport}
              history={history} onOverload={goCrisis}
              onOpenAlert={() => setAlertOpen(true)}
            />
          )}
          {screen === "crisis" && (
            <CrisisMode suggestions={suggestions} onExit={() => setScreen("home")} />
          )}
          {screen === "library" && (
            <StrategyLibrary strategies={strategies} setStrategies={setStrategies} />
          )}
          {screen === "history" && <HistoryInsights history={history} />}
          {screen === "caretaker-gate" && <CaretakerGate onUnlock={() => setScreen("caretaker")} />}
          {screen === "caretaker" && (
            <CaretakerDashboard
              history={history} strategies={strategies}
              accommodations={accommodations} setAccommodations={setAccommodations}
              onExit={() => setScreen("home")}
            />
          )}
          {screen === "wearable" && (
            <WearableConnection
              connected={bleConnected} setConnected={setBleConnected}
              noise={noise} setNoise={setNoise}
              light={light} setLight={setLight}
              onSimulatePress={goCrisis}
            />
          )}
          {screen === "settings" && (
            <SettingsScreen
              highContrast={highContrast} setHighContrast={setHighContrast}
              reduceMotion={reduceMotion} setReduceMotion={setReduceMotion}
              sensitivity={sensitivity} setSensitivity={setSensitivity}
              onEditProfile={() => setScreen("profile")}
              onOpenCaretaker={() => setScreen("caretaker-gate")}
              onResetData={() => { setHistory([]); }}
            />
          )}

          {showTabs && screen !== "crisis" && (
            <button
              onClick={goCrisis}
              className="absolute bottom-24 left-1/2 z-30 flex h-14 -translate-x-1/2 items-center gap-2 rounded-full px-6 text-base font-semibold text-white transition-all duration-300 active:scale-95"
              style={{ background: "var(--risk-high)", boxShadow: "6px 6px 14px rgba(163,177,198,0.55), -6px -6px 14px rgba(255,255,255,0.9)", maxWidth: "calc(100% - 32px)" }}
              aria-label="I'm overloaded — open crisis mode"
            >
              <Heart size={20} /> I'm Overloaded
            </button>
          )}
        </div>

        {showTabs && <TabBar screen={screen} setScreen={setScreen} />}

        {alertOpen && (
          <LiveAlert
            suggestions={suggestions} risk={risk}
            onTry={() => { logEvent({ trigger: primaryTrigger, score: risk.score, action: "tried" }); setAlertOpen(false); }}
            onDismiss={() => { logEvent({ trigger: primaryTrigger, score: risk.score, action: "dismissed" }); setAlertOpen(false); }}
            onOk={() => { logEvent({ trigger: primaryTrigger, score: risk.score, action: "ok" }); setAlertOpen(false); }}
            onCrisis={goCrisis}
          />
        )}
      </main>
    </div>
  );
}

// ---------- Shared UI ----------
function TabBar({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  const tabs: { key: Screen; label: string; icon: typeof Home }[] = [
    { key: "home", label: "Home", icon: Home },
    { key: "library", label: "Library", icon: Library },
    { key: "history", label: "Insights", icon: LineChartIcon },
    { key: "wearable", label: "Device", icon: Bluetooth },
    { key: "settings", label: "Settings", icon: Settings },
  ];
  return (
    <nav className="mx-3 mb-3 rounded-3xl bg-background p-2" style={{ boxShadow: "var(--shadow-neu-inset-sm)" }}>
      <ul className="flex items-center justify-between gap-1">
        {tabs.map((t) => {
          const Active = screen === t.key;
          const Icon = t.icon;
          return (
            <li key={t.key} className="flex-1">
              <button
                onClick={() => setScreen(t.key)}
                className={`flex min-h-12 w-full flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[11px] font-medium transition-all duration-200 ${
                  Active ? "text-primary" : "text-muted-foreground"
                }`}
                style={Active ? { boxShadow: "var(--shadow-neu-sm)", background: "var(--background)" } : {}}
              >
                <Icon size={22} strokeWidth={Active ? 2.4 : 1.8} />
                <span>{t.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Header({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 pt-5 pb-3">
      {onBack && (
        <button onClick={onBack} className="grid h-11 w-11 place-items-center rounded-full bg-background" style={{ boxShadow: "var(--shadow-neu-sm)" }} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        {subtitle && <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{subtitle}</div>}
        <h1 className="truncate text-xl font-bold tracking-tight">{title}</h1>
      </div>
      {right}
    </div>
  );
}

// ---------- Accordion (click-to-expand sections) ----------
const AccordionCtx = createContext<{ openId: string | null; setOpenId: (v: string | null) => void }>({ openId: null, setOpenId: () => {} });

function Accordion({ children, defaultOpen }: { children: ReactNode; defaultOpen?: string }) {
  const [openId, setOpenId] = useState<string | null>(defaultOpen ?? null);
  return (
    <AccordionCtx.Provider value={{ openId, setOpenId }}>
      <div className="space-y-3 px-4 pb-4">{children}</div>
    </AccordionCtx.Provider>
  );
}

function AccItem({ id, title, icon, badge, children }: { id: string; title: string; icon?: ReactNode; badge?: ReactNode; children: ReactNode }) {
  const ctx = useContext(AccordionCtx);
  const open = ctx.openId === id;
  return (
    <div className="rounded-2xl bg-background" style={{ boxShadow: open ? "var(--shadow-neu-inset-sm)" : "var(--shadow-neu-sm)" }}>
      <button
        onClick={() => ctx.setOpenId(open ? null : id)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        {icon && (
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-primary" style={{ boxShadow: "var(--shadow-neu-sm)" }}>
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{title}</div>
        </div>
        {badge}
        <ChevronDown size={18} className={`shrink-0 opacity-60 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="animate-accordion-open px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ---------- Screens ----------
function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-between px-6 pb-8 pt-12 text-center animate-gentle-fade">
      <div className="flex flex-col items-center gap-6 pt-6">
        <div className="relative grid h-32 w-32 place-items-center rounded-full" style={{ boxShadow: "var(--shadow-neu)" }}>
          <div className="animate-breathe absolute inset-3 rounded-full" style={{ background: "color-mix(in oklab, var(--primary) 20%, transparent)" }} />
          <Sparkles size={44} className="relative text-primary" strokeWidth={1.8} />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">AURA</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Your gentle early-warning companion for sensory overload.
          </p>
        </div>
        <div className="mt-2 flex items-start gap-3 rounded-2xl bg-background p-4 text-left text-sm text-muted-foreground" style={{ boxShadow: "var(--shadow-neu-inset-sm)" }}>
          <Shield size={20} className="mt-0.5 shrink-0 text-primary" />
          <span>Your data stays on your device unless you choose to share it.</span>
        </div>
      </div>
      <button
        onClick={onNext}
        className="mt-8 h-14 w-full rounded-2xl text-base font-semibold text-primary-foreground transition-all active:scale-[0.98]"
        style={{ background: "var(--primary)", boxShadow: "var(--shadow-neu-sm)" }}
      >
        Get Started
      </button>
    </div>
  );
}

function ProfileSetup({
  profile, setProfile, environments, setEnvironments, ageGroup, setAgeGroup, commStyle, setCommStyle, onDone,
}: {
  profile: Partial<Record<TriggerKey, number>>;
  setProfile: (p: Partial<Record<TriggerKey, number>>) => void;
  environments: string[]; setEnvironments: (e: string[]) => void;
  ageGroup: string; setAgeGroup: (a: string) => void;
  commStyle: "text" | "emoji" | "visual"; setCommStyle: (c: "text" | "emoji" | "visual") => void;
  onDone: () => void;
}) {
  const toggleTrigger = (k: TriggerKey) => {
    const next = { ...profile };
    if (k in next) delete next[k]; else next[k] = 3;
    setProfile(next);
  };
  const toggleEnv = (e: string) => setEnvironments(environments.includes(e) ? environments.filter((x) => x !== e) : [...environments, e]);

  return (
    <div className="flex h-full flex-col animate-gentle-fade">
      <Header title="Your sensory profile" subtitle="Setup" />
      <p className="px-5 pb-3 text-xs text-muted-foreground">Tap a section to open it.</p>

      <div className="flex-1 overflow-y-auto">
        <Accordion defaultOpen="triggers">
          <AccItem id="quick" title="Quick start presets" icon={<Sparkles size={18} />}>
            <div className="flex flex-wrap gap-2 pt-2">
              {PRESETS.map((p) => (
                <button key={p.name} onClick={() => setProfile(p.triggers)}
                  className="rounded-full bg-background px-4 py-2 text-xs font-medium transition active:scale-95"
                  style={{ boxShadow: "var(--shadow-neu-sm)" }}>
                  {p.name}
                </button>
              ))}
            </div>
          </AccItem>

          <AccItem id="triggers" title="Triggers" icon={<Volume2 size={18} />} badge={<span className="text-xs text-muted-foreground">{Object.keys(profile).length}</span>}>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {TRIGGERS.map((t) => {
                const selected = t.key in profile;
                const Icon = t.icon;
                return (
                  <button key={t.key} onClick={() => toggleTrigger(t.key)}
                    className="flex min-h-20 flex-col items-start gap-1 rounded-2xl p-3 text-left transition-all"
                    style={{ boxShadow: selected ? "var(--shadow-neu-inset-sm)" : "var(--shadow-neu-sm)", color: selected ? "var(--primary)" : undefined }}>
                    <Icon size={20} />
                    <span className="text-sm font-semibold text-foreground">{t.label}</span>
                    {selected && (
                      <div className="mt-1 w-full">
                        <input type="range" min={1} max={5} value={profile[t.key] ?? 3}
                          onChange={(e) => setProfile({ ...profile, [t.key]: Number(e.target.value) })}
                          onClick={(e) => e.stopPropagation()} className="w-full" />
                        <div className="text-[10px] text-muted-foreground">Intensity {profile[t.key]}/5</div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </AccItem>

          <AccItem id="env" title="Where does this happen?" icon={<Home size={18} />} badge={<span className="text-xs text-muted-foreground">{environments.length}</span>}>
            <div className="flex flex-wrap gap-2 pt-2">
              {ENVIRONMENTS.map((e) => {
                const on = environments.includes(e);
                return (
                  <button key={e} onClick={() => toggleEnv(e)}
                    className="rounded-full px-4 py-2 text-xs font-medium transition"
                    style={{ boxShadow: on ? "var(--shadow-neu-inset-sm)" : "var(--shadow-neu-sm)", color: on ? "var(--primary)" : undefined }}>
                    {e}
                  </button>
                );
              })}
            </div>
          </AccItem>

          <AccItem id="age" title="Age group" icon={<Users2 size={18} />} badge={<span className="text-xs text-muted-foreground">{ageGroup}</span>}>
            <div className="flex flex-wrap gap-2 pt-2">
              {["Child", "Teen", "Adult"].map((a) => (
                <button key={a} onClick={() => setAgeGroup(a)}
                  className="rounded-full px-4 py-2 text-xs font-medium transition"
                  style={{ boxShadow: ageGroup === a ? "var(--shadow-neu-inset-sm)" : "var(--shadow-neu-sm)", color: ageGroup === a ? "var(--primary)" : undefined }}>{a}</button>
              ))}
            </div>
          </AccItem>

          <AccItem id="comm" title="How should we talk to you?" icon={<MessageCircle size={18} />} badge={<span className="text-xs capitalize text-muted-foreground">{commStyle}</span>}>
            <div className="grid grid-cols-3 gap-2 pt-2">
              {(["text", "emoji", "visual"] as const).map((c) => (
                <button key={c} onClick={() => setCommStyle(c)}
                  className="rounded-2xl p-3 text-xs font-medium capitalize transition"
                  style={{ boxShadow: commStyle === c ? "var(--shadow-neu-inset-sm)" : "var(--shadow-neu-sm)", color: commStyle === c ? "var(--primary)" : undefined }}>{c}</button>
              ))}
            </div>
          </AccItem>
        </Accordion>
      </div>

      <div className="px-4 pb-4">
        <button onClick={onDone}
          className="h-14 w-full rounded-2xl text-base font-semibold text-primary-foreground transition active:scale-[0.98]"
          style={{ background: "var(--primary)", boxShadow: "var(--shadow-neu-sm)" }}>
          Continue
        </button>
      </div>
    </div>
  );
}

function RiskRing({ risk }: { risk: ReturnType<typeof computeRisk> }) {
  const color = risk.level === "low" ? "var(--risk-low)" : risk.level === "medium" ? "var(--risk-med)" : "var(--risk-high)";
  const label = risk.level === "low" ? "Calm" : risk.level === "medium" ? "Building" : "High";
  const pct = (risk.score / 10) * 100;
  return (
    <div className="mx-auto grid h-40 w-40 place-items-center rounded-full" style={{ boxShadow: "var(--shadow-neu-inset)" }}>
      <div className="grid h-32 w-32 place-items-center rounded-full"
        style={{ background: `conic-gradient(${color} ${pct}%, transparent ${pct}%)` }}>
        <div className="grid h-28 w-28 place-items-center rounded-full bg-background" style={{ boxShadow: "var(--shadow-neu-sm)" }}>
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color }}>{risk.score}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeDashboard({
  risk, selfReport, setSelfReport, history, onOpenAlert,
}: {
  risk: ReturnType<typeof computeRisk>;
  selfReport: number; setSelfReport: (n: number) => void;
  history: HistoryEvent[]; onOverload: () => void; onOpenAlert: () => void;
}) {
  const today = useMemo(() => {
    const rows = history.slice(0, 8).reverse().map((h, i) => ({ i, score: h.score }));
    rows.push({ i: rows.length, score: risk.score });
    return rows;
  }, [history, risk.score]);

  return (
    <div className="flex h-full flex-col animate-gentle-fade">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">AURA</div>
          <h1 className="truncate text-xl font-bold tracking-tight">Hi, how are you?</h1>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-primary" style={{ boxShadow: "var(--shadow-neu-sm)" }}>
          <Sparkles size={20} />
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-center gap-4 rounded-2xl bg-background p-4" style={{ boxShadow: "var(--shadow-neu-sm)" }}>
          <RiskRing risk={risk} />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">Current level</div>
            <div className="text-lg font-bold capitalize">{risk.level}</div>
            {risk.factors[0] && <div className="mt-1 text-xs text-foreground/70 line-clamp-2">{risk.factors[0].label}</div>}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Accordion defaultOpen="checkin">
          <AccItem id="checkin" title="Check in with yourself" icon={<Heart size={18} />} badge={<span className="text-xs font-semibold text-primary">{selfReport}/5</span>}>
            <div className="pt-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Calm</span>
                <input type="range" min={1} max={5} value={selfReport}
                  onChange={(e) => setSelfReport(Number(e.target.value))} className="flex-1" />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">A lot</span>
              </div>
              <div className="mt-2 text-center text-xs text-muted-foreground">Sliding updates your risk score live.</div>
            </div>
          </AccItem>

          <AccItem id="today" title="Today's trend" icon={<LineChartIcon size={18} />}>
            <div className="h-28 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={today} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2.5} dot={false} />
                  <YAxis hide domain={[0, 10]} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground"><span>Earlier</span><span>Now</span></div>
          </AccItem>

          <AccItem id="factors" title="What's affecting you" icon={<Zap size={18} />} badge={<span className="text-xs text-muted-foreground">{risk.factors.length}</span>}>
            <ul className="space-y-2 pt-2">
              {risk.factors.length === 0 && <li className="text-xs text-muted-foreground">Nothing standing out. You're doing great.</li>}
              {risk.factors.map((f, i) => (
                <li key={i} className="rounded-xl bg-background px-3 py-2 text-xs text-foreground/80" style={{ boxShadow: "var(--shadow-neu-inset-sm)" }}>
                  {f.label}
                </li>
              ))}
            </ul>
          </AccItem>

          {risk.level !== "low" && (
            <AccItem id="suggest" title="Coping suggestions" icon={<Sparkles size={18} />}>
              <button onClick={onOpenAlert}
                className="mt-2 flex w-full items-center gap-3 rounded-xl bg-background p-3 text-left text-sm font-medium"
                style={{ boxShadow: "var(--shadow-neu-sm)" }}>
                <MessageCircle size={18} className="text-primary" />
                <span>See gentle suggestions for right now</span>
              </button>
            </AccItem>
          )}

          <AccItem id="recent" title="Recent events" icon={<Waves size={18} />} badge={<span className="text-xs text-muted-foreground">{history.length}</span>}>
            <div className="space-y-2 pt-2">
              {history.slice(0, 4).map((h) => (
                <div key={h.id} className="flex items-center gap-3 rounded-xl bg-background p-2.5" style={{ boxShadow: "var(--shadow-neu-inset-sm)" }}>
                  <TriggerDot trigger={h.trigger} score={h.score} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium capitalize">{h.trigger} · {h.action}</div>
                    <div className="text-[10px] text-muted-foreground">{timeAgo(h.time)}</div>
                  </div>
                  <div className="text-sm font-semibold">{h.score}</div>
                </div>
              ))}
            </div>
          </AccItem>
        </Accordion>
        <div className="h-32" />
      </div>
    </div>
  );
}

function TriggerDot({ trigger, score }: { trigger: HistoryEvent["trigger"]; score: number }) {
  const T = TRIGGERS.find((t) => t.key === trigger);
  const Icon = T?.icon ?? Heart;
  const color = score <= 2 ? "var(--risk-low)" : score <= 4 ? "var(--risk-med)" : "var(--risk-high)";
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-background" style={{ boxShadow: "var(--shadow-neu-sm)", color }}>
      <Icon size={16} />
    </div>
  );
}

function LiveAlert({
  suggestions, risk, onTry, onDismiss, onOk, onCrisis,
}: {
  suggestions: Strategy[]; risk: ReturnType<typeof computeRisk>;
  onTry: () => void; onDismiss: () => void; onOk: () => void; onCrisis: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/20 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-[400px] rounded-3xl bg-background p-5 animate-gentle-fade" style={{ boxShadow: "var(--shadow-neu)" }}>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full text-primary" style={{ boxShadow: "var(--shadow-neu-sm)" }}>
            <Wind size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold">A gentle check-in</div>
            <div className="truncate text-xs text-muted-foreground">Because {risk.factors[0]?.label.toLowerCase() ?? "levels are rising"}</div>
          </div>
          <button onClick={onDismiss} className="grid h-9 w-9 place-items-center rounded-full" style={{ boxShadow: "var(--shadow-neu-sm)" }} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <p className="mt-3 text-sm text-foreground/80">Would any of these help right now?</p>
        <ul className="mt-3 space-y-2">
          {suggestions.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-background p-3" style={{ boxShadow: "var(--shadow-neu-inset-sm)" }}>
              <div className="grid h-8 w-8 place-items-center rounded-full text-primary" style={{ boxShadow: "var(--shadow-neu-sm)" }}>
                <Sparkles size={14} />
              </div>
              <span className="flex-1 text-sm">{s.title}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button onClick={onTry} className="h-12 rounded-2xl text-sm font-semibold text-primary-foreground" style={{ background: "var(--primary)", boxShadow: "var(--shadow-neu-sm)" }}>Try it</button>
          <button onClick={onOk} className="h-12 rounded-2xl text-sm font-medium" style={{ boxShadow: "var(--shadow-neu-sm)" }}>I'm OK</button>
          <button onClick={onDismiss} className="h-12 rounded-2xl text-sm font-medium" style={{ boxShadow: "var(--shadow-neu-sm)" }}>Dismiss</button>
        </div>
        <button onClick={onCrisis} className="mt-3 w-full text-center text-xs font-medium text-muted-foreground underline underline-offset-4">Open calm mode</button>
      </div>
    </div>
  );
}

function CrisisMode({ suggestions, onExit }: { suggestions: Strategy[]; onExit: () => void }) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => (s >= 300 ? 300 : s + 1)), 1000);
    return () => clearInterval(id);
  }, [running]);
  const remaining = 300 - seconds;
  const mm = String(Math.floor(remaining / 60)).padStart(1, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="flex h-full flex-col px-5 pb-4 pt-8 animate-gentle-fade">
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Calm mode</div>
        <h1 className="mt-1 text-xl font-semibold">Let's slow this down</h1>
      </div>

      <div className="mt-4 flex flex-col items-center">
        <div className="relative grid h-44 w-44 place-items-center rounded-full" style={{ boxShadow: "var(--shadow-neu-inset)" }}>
          <div className="animate-breathe absolute inset-4 rounded-full" style={{ background: "color-mix(in oklab, var(--primary) 25%, transparent)" }} />
          <div className="animate-breathe absolute inset-10 rounded-full" style={{ background: "color-mix(in oklab, var(--primary) 35%, transparent)", animationDelay: "0.5s" }} />
          <div className="relative text-center">
            <div className="text-xs text-foreground/70">Breathe</div>
            <div className="text-base font-semibold">In · Hold · Out</div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
        {suggestions.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-background p-3" style={{ boxShadow: "var(--shadow-neu-sm)" }}>
            <div className="grid h-9 w-9 place-items-center rounded-full text-primary" style={{ boxShadow: "var(--shadow-neu-sm)" }}>
              <Sparkles size={16} />
            </div>
            <span className="text-sm font-medium">{s.title}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-2xl bg-background p-3" style={{ boxShadow: "var(--shadow-neu-sm)" }}>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Reset timer</div>
          <div className="text-2xl font-semibold tabular-nums">{mm}:{ss}</div>
        </div>
        <button onClick={() => setRunning((r) => !r)}
          className="flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-primary-foreground"
          style={{ background: "var(--primary)", boxShadow: "var(--shadow-neu-sm)" }}>
          {running ? <Pause size={16} /> : <Play size={16} />}
          {running ? "Pause" : "Start 5 min"}
        </button>
      </div>

      <button onClick={onExit}
        className="mt-3 h-14 w-full rounded-2xl text-base font-semibold"
        style={{ background: "var(--foreground)", color: "var(--background)", boxShadow: "var(--shadow-neu-sm)" }}>
        I feel better
      </button>
    </div>
  );
}

function StrategyLibrary({ strategies, setStrategies }: { strategies: Strategy[]; setStrategies: (s: Strategy[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [trigger, setTrigger] = useState<TriggerKey>("sound");

  const grouped = useMemo(() => {
    const m = new Map<TriggerKey, Strategy[]>();
    TRIGGERS.forEach((t) => m.set(t.key, []));
    strategies.forEach((s) => m.get(s.trigger)?.push(s));
    return m;
  }, [strategies]);

  const remove = (id: string) => setStrategies(strategies.filter((s) => s.id !== id));

  return (
    <div className="flex h-full flex-col animate-gentle-fade">
      <Header title="Coping library" subtitle="Your toolkit" right={
        <button onClick={() => setAdding((v) => !v)}
          className="flex h-11 items-center gap-1 rounded-full px-4 text-sm font-semibold text-primary-foreground"
          style={{ background: "var(--primary)", boxShadow: "var(--shadow-neu-sm)" }}>
          <Plus size={16} /> Add
        </button>
      } />

      {adding && (
        <div className="mx-4 mb-3 rounded-2xl bg-background p-4 animate-gentle-fade" style={{ boxShadow: "var(--shadow-neu-inset-sm)" }}>
          <div className="text-sm font-semibold">New strategy</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Squeeze a stress ball"
            className="mt-3 w-full rounded-2xl bg-background px-4 py-3 text-sm outline-none"
            style={{ boxShadow: "var(--shadow-neu-inset-sm)" }} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note"
            className="mt-2 w-full rounded-2xl bg-background px-4 py-3 text-sm outline-none"
            style={{ boxShadow: "var(--shadow-neu-inset-sm)" }} />
          <div className="mt-3 flex flex-wrap gap-2">
            {TRIGGERS.map((t) => (
              <button key={t.key} onClick={() => setTrigger(t.key)}
                className="rounded-full px-3 py-1.5 text-xs font-medium"
                style={{ boxShadow: trigger === t.key ? "var(--shadow-neu-inset-sm)" : "var(--shadow-neu-sm)", color: trigger === t.key ? "var(--primary)" : undefined }}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => {
              if (!title.trim()) return;
              setStrategies([{ id: Math.random().toString(36).slice(2), title: title.trim(), note: note.trim() || undefined, trigger, helped: 0, tried: 0, custom: true }, ...strategies]);
              setTitle(""); setNote(""); setAdding(false);
            }}
              className="h-11 flex-1 rounded-2xl text-sm font-semibold text-primary-foreground"
              style={{ background: "var(--primary)", boxShadow: "var(--shadow-neu-sm)" }}>Save</button>
            <button onClick={() => setAdding(false)} className="h-11 flex-1 rounded-2xl text-sm font-medium" style={{ boxShadow: "var(--shadow-neu-sm)" }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <Accordion defaultOpen={TRIGGERS.find((t) => (grouped.get(t.key)?.length ?? 0) > 0)?.key}>
          {TRIGGERS.map((t) => {
            const list = grouped.get(t.key) ?? [];
            const Icon = t.icon;
            return (
              <AccItem key={t.key} id={t.key} title={t.label} icon={<Icon size={18} />} badge={<span className="text-xs text-muted-foreground">{list.length}</span>}>
                {list.length === 0 ? (
                  <div className="pt-2 text-xs text-muted-foreground">No strategies yet.</div>
                ) : (
                  <div className="space-y-2 pt-2">
                    {list.map((s) => (
                      <div key={s.id} className="flex items-start gap-3 rounded-xl bg-background p-3" style={{ boxShadow: "var(--shadow-neu-inset-sm)" }}>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{s.title}</div>
                          {s.note && <div className="mt-0.5 text-xs text-muted-foreground">{s.note}</div>}
                          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold text-foreground/70" style={{ boxShadow: "var(--shadow-neu-sm)" }}>
                            <Star size={10} /> Helped {s.helped}/{Math.max(s.tried, 1)}
                          </div>
                        </div>
                        {s.custom && (
                          <button onClick={() => remove(s.id)} className="grid h-8 w-8 place-items-center rounded-full" style={{ boxShadow: "var(--shadow-neu-sm)" }} aria-label="Delete">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </AccItem>
            );
          })}
        </Accordion>
        <div className="h-32" />
      </div>
    </div>
  );
}

function HistoryInsights({ history }: { history: HistoryEvent[] }) {
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const cutoff = Date.now() - (range === "7d" ? 7 : 30) * 86400000;
  const filtered = history.filter((h) => h.time >= cutoff);

  const perDay = useMemo(() => {
    const days = range === "7d" ? 7 : 14;
    return Array.from({ length: days }).map((_, i) => {
      const d = new Date(Date.now() - (days - 1 - i) * 86400000);
      const key = d.toLocaleDateString(undefined, { weekday: "short" });
      const hits = filtered.filter((h) => new Date(h.time).toDateString() === d.toDateString());
      const avg = hits.length ? Math.round((hits.reduce((a, b) => a + b.score, 0) / hits.length) * 10) / 10 : 0;
      return { day: key, score: avg };
    });
  }, [filtered, range]);

  const triggerBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((h) => m.set(h.trigger, (m.get(h.trigger) ?? 0) + 1));
    return Array.from(m.entries()).map(([name, count]) => ({ name, count }));
  }, [filtered]);

  return (
    <div className="flex h-full flex-col animate-gentle-fade">
      <Header title="Insights" subtitle="Your patterns" />
      <div className="mx-4 mb-3 flex gap-2 rounded-2xl bg-background p-1.5" style={{ boxShadow: "var(--shadow-neu-inset-sm)" }}>
        {(["7d", "30d"] as const).map((r) => (
          <button key={r} onClick={() => setRange(r)}
            className="flex-1 rounded-xl py-2 text-xs font-semibold"
            style={{ boxShadow: range === r ? "var(--shadow-neu-sm)" : "none", color: range === r ? "var(--primary)" : "var(--muted-foreground)" }}>
            Last {r === "7d" ? "7 days" : "30 days"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <Accordion defaultOpen="avg">
          <AccItem id="avg" title="Average risk" icon={<LineChartIcon size={18} />}>
            <div className="h-40 pt-2">
              <ResponsiveContainer>
                <LineChart data={perDay} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "var(--shadow-neu-sm)", background: "var(--background)" }} />
                  <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </AccItem>

          <AccItem id="top" title="Top triggers" icon={<Zap size={18} />} badge={<span className="text-xs text-muted-foreground">{triggerBreakdown.length}</span>}>
            <div className="h-40 pt-2">
              <ResponsiveContainer>
                <BarChart data={triggerBreakdown} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "var(--shadow-neu-sm)", background: "var(--background)" }} />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AccItem>

          <AccItem id="events" title="Past events" icon={<Waves size={18} />} badge={<span className="text-xs text-muted-foreground">{filtered.length}</span>}>
            <div className="space-y-2 pt-2">
              {filtered.length === 0 && <div className="rounded-xl bg-background p-3 text-xs text-muted-foreground" style={{ boxShadow: "var(--shadow-neu-inset-sm)" }}>No events in this range.</div>}
              {filtered.map((h) => (
                <div key={h.id} className="flex items-center gap-3 rounded-xl bg-background p-2.5" style={{ boxShadow: "var(--shadow-neu-inset-sm)" }}>
                  <TriggerDot trigger={h.trigger} score={h.score} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium capitalize">{h.trigger} · <span className="text-muted-foreground">{h.action}</span></div>
                    <div className="text-[10px] text-muted-foreground">{new Date(h.time).toLocaleString()}</div>
                    {h.note && <div className="mt-0.5 truncate text-[10px] italic text-foreground/70">"{h.note}"</div>}
                  </div>
                  <div className="text-sm font-semibold">{h.score}</div>
                </div>
              ))}
            </div>
          </AccItem>
        </Accordion>
        <div className="h-32" />
      </div>
    </div>
  );
}

function CaretakerGate({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const submit = () => { if (code.length === 4) onUnlock(); else setError(true); };
  return (
    <div className="flex h-full flex-col animate-gentle-fade">
      <Header title="Caretaker view" subtitle="Private" />
      <div className="px-4 pt-4">
        <div className="rounded-2xl bg-background p-6" style={{ boxShadow: "var(--shadow-neu-sm)" }}>
          <div className="grid h-14 w-14 place-items-center rounded-2xl text-primary" style={{ boxShadow: "var(--shadow-neu-sm)" }}>
            <Lock size={22} />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Enter your 4-digit code</h2>
          <p className="mt-1 text-sm text-muted-foreground">Only shared caretakers can see this view.</p>
          <input value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(false); }}
            inputMode="numeric" placeholder="••••"
            className="mt-5 w-full rounded-2xl bg-background px-5 py-4 text-center text-2xl tracking-[0.6em] outline-none"
            style={{ boxShadow: "var(--shadow-neu-inset-sm)" }} />
          {error && <div className="mt-2 text-sm" style={{ color: "var(--risk-high)" }}>Please enter 4 digits.</div>}
          <button onClick={submit} className="mt-4 h-14 w-full rounded-2xl text-base font-semibold text-primary-foreground"
            style={{ background: "var(--primary)", boxShadow: "var(--shadow-neu-sm)" }}>Unlock</button>
        </div>
      </div>
    </div>
  );
}

function CaretakerDashboard({
  history, strategies, accommodations, setAccommodations, onExit,
}: {
  history: HistoryEvent[]; strategies: Strategy[];
  accommodations: { id: string; time: number; text: string }[];
  setAccommodations: (a: { id: string; time: number; text: string }[]) => void;
  onExit: () => void;
}) {
  const weekAgo = Date.now() - 7 * 86400000;
  const week = history.filter((h) => h.time >= weekAgo);
  const highs = week.filter((h) => h.score >= 5).length;
  const triggerCounts = week.reduce<Record<string, number>>((acc, h) => { acc[h.trigger] = (acc[h.trigger] ?? 0) + 1; return acc; }, {});
  const topTrigger = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const hourly = useMemo(() => {
    const buckets = Array.from({ length: 6 }).map((_, i) => ({ label: `${i * 4}-${i * 4 + 4}`, count: 0 }));
    week.forEach((h) => {
      const hr = new Date(h.time).getHours();
      buckets[Math.floor(hr / 4)].count++;
    });
    return buckets;
  }, [week]);

  const [note, setNote] = useState("");

  return (
    <div className="flex h-full flex-col animate-gentle-fade">
      <Header title="Caretaker view" subtitle="Week overview" onBack={onExit} />
      <div className="grid grid-cols-3 gap-2 px-4 pb-3">
        <Stat label="High-risk" value={String(highs)} />
        <Stat label="Events" value={String(week.length)} />
        <Stat label="Top" value={topTrigger} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <Accordion defaultOpen="peak">
          <AccItem id="peak" title="Peak times this week" icon={<LineChartIcon size={18} />}>
            <div className="h-36 pt-2">
              <ResponsiveContainer>
                <BarChart data={hourly} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "var(--shadow-neu-sm)", background: "var(--background)" }} />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AccItem>

          <AccItem id="eff" title="Strategy effectiveness" icon={<Star size={18} />}>
            <div className="space-y-2 pt-2">
              {strategies.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl bg-background p-2.5" style={{ boxShadow: "var(--shadow-neu-inset-sm)" }}>
                  <div className="flex-1 text-xs font-medium">{s.title}</div>
                  <div className="text-[10px] text-muted-foreground"><span className="font-semibold" style={{ color: "var(--risk-low)" }}>{s.helped}</span> helped</div>
                </div>
              ))}
            </div>
          </AccItem>

          <AccItem id="acc" title="Accommodations log" icon={<Edit3 size={18} />} badge={<span className="text-xs text-muted-foreground">{accommodations.length}</span>}>
            <div className="space-y-2 pt-2">
              {accommodations.map((a) => (
                <div key={a.id} className="rounded-xl bg-background p-3" style={{ boxShadow: "var(--shadow-neu-inset-sm)" }}>
                  <div className="text-xs">{a.text}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{new Date(a.time).toLocaleDateString()}</div>
                </div>
              ))}
              <div className="rounded-xl bg-background p-2 flex items-center gap-2" style={{ boxShadow: "var(--shadow-neu-inset-sm)" }}>
                <Edit3 size={14} className="text-muted-foreground" />
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note"
                  className="flex-1 bg-transparent text-xs outline-none" />
                <button onClick={() => {
                  if (!note.trim()) return;
                  setAccommodations([{ id: Math.random().toString(36).slice(2), time: Date.now(), text: note.trim() }, ...accommodations]);
                  setNote("");
                }}
                  className="rounded-full px-3 py-1.5 text-[10px] font-semibold text-primary-foreground"
                  style={{ background: "var(--primary)", boxShadow: "var(--shadow-neu-sm)" }}>Add</button>
              </div>
            </div>
          </AccItem>
        </Accordion>
        <div className="h-8" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background p-3" style={{ boxShadow: "var(--shadow-neu-sm)" }}>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-base font-bold capitalize">{value}</div>
    </div>
  );
}

function WearableConnection({
  connected, setConnected, noise, setNoise, light, setLight, onSimulatePress,
}: {
  connected: boolean; setConnected: (v: boolean) => void;
  noise: number; setNoise: (n: number) => void;
  light: number; setLight: (n: number) => void;
  onSimulatePress: () => void;
}) {
  const [pairing, setPairing] = useState(false);
  const pair = () => { setPairing(true); setTimeout(() => { setPairing(false); setConnected(true); }, 1400); };
  return (
    <div className="flex h-full flex-col animate-gentle-fade">
      <Header title="Wearable" subtitle="AURA band" />
      <div className="px-4 pb-3">
        <div className="flex items-center gap-3 rounded-2xl bg-background p-4" style={{ boxShadow: "var(--shadow-neu-sm)" }}>
          <div className="grid h-12 w-12 place-items-center rounded-full text-primary" style={{ boxShadow: connected ? "var(--shadow-neu-inset-sm)" : "var(--shadow-neu-sm)" }}>
            <Bluetooth size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold">AURA band</div>
            <div className="text-xs text-muted-foreground">{pairing ? "Pairing…" : connected ? "Connected" : "Not paired"}</div>
          </div>
          <button onClick={connected ? () => setConnected(false) : pair} disabled={pairing}
            className="h-11 rounded-full px-4 text-sm font-semibold"
            style={connected ? { boxShadow: "var(--shadow-neu-sm)" } : { background: "var(--primary)", color: "var(--primary-foreground)", boxShadow: "var(--shadow-neu-sm)" }}>
            {connected ? "Disconnect" : pairing ? "…" : "Pair"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Accordion defaultOpen="sensors">
          <AccItem id="sensors" title="Simulated sensors" icon={<Zap size={18} />}>
            <p className="pt-2 text-xs text-muted-foreground">Move the sliders to see how your Home dashboard reacts in real time.</p>
            <div className="mt-3 space-y-3">
              <SliderCard icon={<Volume2 size={18} />} label="Noise" unit="dB" value={noise} min={40} max={100} onChange={setNoise}
                hint={noise < 60 ? "Quiet" : noise < 80 ? "Busy" : "Loud"} />
              <SliderCard icon={<Sun size={18} />} label="Light" unit="lux" value={light} min={100} max={1500} onChange={setLight}
                hint={light < 400 ? "Soft" : light < 900 ? "Bright" : "Very bright"} />
            </div>
          </AccItem>

          <AccItem id="btn" title="Simulate wearable button" icon={<Heart size={18} />}>
            <button onClick={onSimulatePress}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold text-primary-foreground"
              style={{ background: "var(--primary)", boxShadow: "var(--shadow-neu-sm)" }}>
              <Zap size={18} /> Press band button
            </button>
          </AccItem>

          <AccItem id="battery" title="Device status" icon={<Shield size={18} />}>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Stat label="Battery" value="82%" />
              <Stat label="Signal" value={connected ? "Strong" : "—"} />
            </div>
          </AccItem>
        </Accordion>
        <div className="h-32" />
      </div>
    </div>
  );
}

function SliderCard({
  icon, label, unit, value, min, max, onChange, hint,
}: {
  icon: ReactNode; label: string; unit: string;
  value: number; min: number; max: number; onChange: (n: number) => void; hint: string;
}) {
  return (
    <div className="rounded-2xl bg-background p-3" style={{ boxShadow: "var(--shadow-neu-inset-sm)" }}>
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full text-primary" style={{ boxShadow: "var(--shadow-neu-sm)" }}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{label}</div>
          <div className="text-[10px] text-muted-foreground">{hint}</div>
        </div>
        <div className="text-sm font-semibold tabular-nums">{value}<span className="ml-1 text-[10px] text-muted-foreground">{unit}</span></div>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-3 w-full" />
    </div>
  );
}

function SettingsScreen({
  highContrast, setHighContrast, reduceMotion, setReduceMotion, sensitivity, setSensitivity,
  onEditProfile, onOpenCaretaker, onResetData,
}: {
  highContrast: boolean; setHighContrast: (v: boolean) => void;
  reduceMotion: boolean; setReduceMotion: (v: boolean) => void;
  sensitivity: number; setSensitivity: (n: number) => void;
  onEditProfile: () => void; onOpenCaretaker: () => void; onResetData: () => void;
}) {
  return (
    <div className="flex h-full flex-col animate-gentle-fade">
      <Header title="Settings" subtitle="Personalize AURA" />
      <div className="flex-1 overflow-y-auto">
        <Accordion defaultOpen="profile">
          <AccItem id="profile" title="Profile" icon={<Users2 size={18} />}>
            <div className="space-y-2 pt-2">
              <button onClick={onEditProfile} className="flex w-full items-center justify-between rounded-xl bg-background p-3 text-left text-sm font-medium" style={{ boxShadow: "var(--shadow-neu-sm)" }}>
                Edit sensory profile <ChevronDown size={16} className="-rotate-90 opacity-60" />
              </button>
              <button onClick={onOpenCaretaker} className="flex w-full items-center justify-between rounded-xl bg-background p-3 text-left text-sm font-medium" style={{ boxShadow: "var(--shadow-neu-sm)" }}>
                Open caretaker view <ChevronDown size={16} className="-rotate-90 opacity-60" />
              </button>
            </div>
          </AccItem>

          <AccItem id="alerts" title="Alerts" icon={<Zap size={18} />} badge={<span className="text-xs text-muted-foreground">{sensitivity}/5</span>}>
            <div className="pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Alert sensitivity</span>
                <span className="text-sm text-muted-foreground">{sensitivity}/5</span>
              </div>
              <input type="range" min={1} max={5} value={sensitivity} onChange={(e) => setSensitivity(Number(e.target.value))} className="mt-3 w-full" />
              <div className="mt-1 text-[10px] text-muted-foreground">Higher = check in with you sooner.</div>
            </div>
          </AccItem>

          <AccItem id="a11y" title="Accessibility" icon={<Eye size={18} />}>
            <div className="space-y-2 pt-2">
              <Toggle icon={<Eye size={16} />} label="High contrast" value={highContrast} onChange={setHighContrast} />
              <Toggle icon={<Wind size={16} />} label="Reduce motion" value={reduceMotion} onChange={setReduceMotion} />
            </div>
          </AccItem>

          <AccItem id="privacy" title="Privacy" icon={<Shield size={18} />}>
            <div className="space-y-2 pt-2">
              <div className="rounded-xl bg-background p-3" style={{ boxShadow: "var(--shadow-neu-inset-sm)" }}>
                <div className="flex items-start gap-3">
                  <Shield size={16} className="mt-0.5 text-primary" />
                  <p className="text-xs text-foreground/80">Your data stays on this device. Nothing is uploaded unless you share it with a caretaker.</p>
                </div>
              </div>
              <button onClick={onResetData}
                className="flex w-full items-center justify-center gap-2 rounded-xl p-3 text-sm font-semibold"
                style={{ background: "var(--risk-high-soft)", color: "var(--risk-high)", boxShadow: "var(--shadow-neu-sm)" }}>
                <Trash2 size={14} /> Delete all my data
              </button>
            </div>
          </AccItem>
        </Accordion>
        <div className="h-32" />
      </div>
    </div>
  );
}

function Toggle({ icon, label, value, onChange }: { icon: ReactNode; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className="flex w-full items-center gap-3 rounded-xl bg-background p-3"
      style={{ boxShadow: "var(--shadow-neu-sm)" }}>
      <div className="grid h-9 w-9 place-items-center rounded-full text-primary" style={{ boxShadow: value ? "var(--shadow-neu-inset-sm)" : "var(--shadow-neu-sm)" }}>{icon}</div>
      <div className="flex-1 text-left text-sm font-medium">{label}</div>
      <div className="relative h-7 w-12 rounded-full bg-background" style={{ boxShadow: "var(--shadow-neu-inset-sm)" }}>
        <div className="absolute top-1 h-5 w-5 rounded-full transition-all duration-300"
          style={{ left: value ? "1.5rem" : "0.25rem", background: value ? "var(--primary)" : "var(--muted-foreground)", boxShadow: "var(--shadow-neu-sm)" }} />
      </div>
    </button>
  );
}

// ---------- Utils ----------
function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
