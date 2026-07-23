import 'react-native-gesture-handler';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, TouchableOpacity, Text, Modal } from 'react-native';
import { Home, Library, TrendingUp, Bluetooth, Settings, Heart } from 'lucide-react-native';

import { colors } from './src/theme';
import { TriggerKey, HistoryEvent, Strategy, Accommodation } from './src/types';
import { DEFAULT_STRATEGIES, seedHistory } from './src/data';
import { computeRisk } from './src/utils';

// ── API Services ───────────────────────────────────────────────────────────────
import { DEV_USER_ID } from './src/api/config';
import { submitSensorData, getSensorHistory } from './src/api/sensorService';
import { submitCheckin } from './src/api/wellnessService';
import { logOverloadEvent, getOverloadEvents } from './src/api/overloadService';
import { createAlert, submitAlertFeedback } from './src/api/alertService';
import { getRecommendations } from './src/api/recommendationService';

import WelcomeScreen from './src/screens/WelcomeScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import CrisisModeScreen from './src/screens/CrisisModeScreen';
import StrategyLibraryScreen from './src/screens/StrategyLibraryScreen';
import HistoryInsightsScreen from './src/screens/HistoryInsightsScreen';
import WearableScreen from './src/screens/WearableScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CaretakerGateScreen from './src/screens/CaretakerGateScreen';
import CaretakerDashboardScreen from './src/screens/CaretakerDashboardScreen';
import LiveAlertModal from './src/components/LiveAlertModal';

type AppScreen =
  | 'welcome' | 'profile' | 'home' | 'crisis'
  | 'caretaker-gate' | 'caretaker';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ── App State Context ─────────────────────────────────────────────────────────
export type AppState = {
  userId: string;
  profile: Partial<Record<TriggerKey, number>>;
  setProfile: (p: Partial<Record<TriggerKey, number>>) => void;
  environments: string[];
  setEnvironments: (e: string[]) => void;
  ageGroup: string;
  setAgeGroup: (a: string) => void;
  commStyle: 'text' | 'emoji' | 'visual';
  setCommStyle: (c: 'text' | 'emoji' | 'visual') => void;
  noise: number;
  setNoise: (n: number) => void;
  light: number;
  setLight: (n: number) => void;
  selfReport: number;
  setSelfReport: (n: number) => void;
  bleConnected: boolean;
  setBleConnected: (v: boolean) => void;
  strategies: Strategy[];
  setStrategies: (s: Strategy[]) => void;
  history: HistoryEvent[];
  logEvent: (e: Omit<HistoryEvent, 'id' | 'time'>) => void;
  accommodations: Accommodation[];
  setAccommodations: (a: Accommodation[]) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
  sensitivity: number;
  setSensitivity: (n: number) => void;
  risk: ReturnType<typeof computeRisk>;
  primaryTrigger: TriggerKey;
  suggestions: Strategy[];
  backendOnline: boolean;
  goCrisis: () => void;
  navigateTo: (s: AppScreen) => void;
};

export const AppContext = React.createContext<AppState>({} as AppState);

// ── Tab Navigator (main app) ──────────────────────────────────────────────────
function TabNavigator({ goCrisis }: { goCrisis: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Library"
        component={StrategyLibraryScreen}
        options={{ tabBarIcon: ({ color, size }) => <Library color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Insights"
        component={HistoryInsightsScreen}
        options={{ tabBarIcon: ({ color, size }) => <TrendingUp color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Device"
        component={WearableScreen}
        options={{ tabBarIcon: ({ color, size }) => <Bluetooth color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: ({ color, size }) => <Settings color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Map a backend recommendations string array to Strategy[] for CrisisMode/suggestions.
 * We synthesise stable IDs from index so React list keys don't thrash.
 */
function mapRecsToStrategies(recs: string[], primaryTrigger: TriggerKey): Strategy[] {
  return recs.map((title, i) => ({
    id: `rec_${i}`,
    title,
    trigger: primaryTrigger,
    helped: 0,
    tried: 0,
  }));
}

/**
 * Derive a TriggerKey from a backend trigger_metric string.
 * Backend stores metric names like 'noise', 'sound', 'light', 'crowd', etc.
 */
function toTriggerKey(metric: string): TriggerKey | 'self' {
  const map: Record<string, TriggerKey | 'self'> = {
    noise: 'sound',
    sound: 'sound',
    light: 'light',
    crowd: 'crowd',
    touch: 'touch',
    movement: 'movement',
    smell: 'smell',
    self: 'self',
  };
  return map[metric?.toLowerCase()] ?? 'sound';
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [appScreen, setAppScreen] = useState<AppScreen>('welcome');
  const [profile, setProfile] = useState<Partial<Record<TriggerKey, number>>>({ sound: 4, crowd: 3, light: 2 });
  const [environments, setEnvironments] = useState<string[]>(['Classroom', 'Bus']);
  const [ageGroup, setAgeGroup] = useState('Teen');
  const [commStyle, setCommStyle] = useState<'text' | 'emoji' | 'visual'>('text');
  const [noise, setNoise] = useState(55);
  const [light, setLight] = useState(350);
  const [selfReport, setSelfReport] = useState(2);
  const [bleConnected, setBleConnected] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>(DEFAULT_STRATEGIES);
  const [history, setHistory] = useState<HistoryEvent[]>(seedHistory());
  const [accommodations, setAccommodations] = useState<Accommodation[]>([
    { id: 'a1', time: Date.now() - 2 * 86400000, text: 'Allowed headphones during math class' },
    { id: 'a2', time: Date.now() - 5 * 86400000, text: 'Moved seat away from the window' },
  ]);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [sensitivity, setSensitivity] = useState(3);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertShownForScore, setAlertShownForScore] = useState<number | null>(null);

  // ── Backend integration state ─────────────────────────────────────────────
  const userId = DEV_USER_ID;
  const [backendOnline, setBackendOnline] = useState(true);
  // Backend-sourced risk overrides the local computation when available
  const [backendRisk, setBackendRisk] = useState<ReturnType<typeof computeRisk> | null>(null);
  // Backend-sourced suggestions override local ones when available
  const [backendSuggestions, setBackendSuggestions] = useState<Strategy[] | null>(null);

  // ── Derived / memoised ────────────────────────────────────────────────────
  const localRisk = useMemo(
    () => computeRisk(noise, light, selfReport, profile),
    [noise, light, selfReport, profile],
  );

  // Use backend risk when available, fall back to local computation
  const risk = backendRisk ?? localRisk;

  const primaryTrigger = useMemo<TriggerKey>(() => {
    const entries = Object.entries(profile) as [TriggerKey, number][];
    if (!entries.length) return 'sound';
    return entries.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0][0];
  }, [profile]);

  const localSuggestions = useMemo(() => {
    const matched = strategies.filter((s) => s.trigger === primaryTrigger);
    const rest = strategies.filter((s) => s.trigger !== primaryTrigger);
    return [...matched, ...rest].slice(0, 3);
  }, [strategies, primaryTrigger]);

  // Use backend suggestions when available
  const suggestions = backendSuggestions ?? localSuggestions;

  // ── Debounce ref for sensor submission ────────────────────────────────────
  const sensorDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── On mount: hydrate history from backend ────────────────────────────────
  useEffect(() => {
    async function hydrateHistory() {
      // Fetch both sources concurrently
      const [sensorHist, overloadEvents] = await Promise.all([
        getSensorHistory(userId, 100),
        getOverloadEvents(userId, 50),
      ]);

      const backendEvents: HistoryEvent[] = [];

      // Map sensor history → HistoryEvent
      for (const s of sensorHist) {
        backendEvents.push({
          id: s.id,
          time: new Date(s.created_at).getTime(),
          trigger: s.noise != null ? 'sound' : 'light',
          score: 0, // sensor data alone doesn't carry risk_score; use 0 as placeholder
          action: 'ok',
        });
      }

      // Map overload events → HistoryEvent (these are real crisis events)
      for (const oe of overloadEvents) {
        backendEvents.push({
          id: oe.id,
          time: new Date(oe.created_at).getTime(),
          trigger: toTriggerKey(oe.trigger_metric) as TriggerKey | 'self',
          score: oe.trigger_value,
          action: 'crisis',
        });
      }

      if (backendEvents.length > 0) {
        setBackendOnline(true);
        // Merge backend events with seed (backend wins on same ID)
        setHistory((prev) => {
          const prevIds = new Set(prev.map((h) => h.id));
          const newOnes = backendEvents.filter((e) => !prevIds.has(e.id));
          return [...newOnes, ...prev].sort((a, b) => b.time - a.time);
        });
      }
    }

    hydrateHistory().catch(() => {
      setBackendOnline(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── On mount: fetch initial recommendations ───────────────────────────────
  useEffect(() => {
    async function fetchInitialRecs() {
      const recResp = await getRecommendations(userId);
      if (recResp?.recommendations?.length) {
        setBackendSuggestions(mapRecsToStrategies(recResp.recommendations, primaryTrigger));
        setBackendOnline(true);
      }
    }
    fetchInitialRecs().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Debounced sensor submission on noise/light change ─────────────────────
  useEffect(() => {
    if (sensorDebounce.current) clearTimeout(sensorDebounce.current);

    sensorDebounce.current = setTimeout(async () => {
      const result = await submitSensorData(noise, light);
      if (result) {
        setBackendOnline(true);
        // Map backend risk to frontend shape
        const backendFactors = result.reasons.map((label, i) => ({
          label,
          weight: result.risk_score - i * 0.5, // synthetic descending weights
        }));
        setBackendRisk({
          score: Math.round(result.risk_score),
          level: result.risk_level,
          factors: backendFactors.slice(0, 3),
        });
        // Also refresh recommendations from the inline result
        if (result.recommendations?.length) {
          setBackendSuggestions(mapRecsToStrategies(result.recommendations, primaryTrigger));
        }
      } else {
        // Backend unreachable — fall back to local computation
        setBackendOnline(false);
        setBackendRisk(null);
      }
    }, 300);

    return () => {
      if (sensorDebounce.current) clearTimeout(sensorDebounce.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noise, light]);

  // ── Debounced self-report wellness check-in ───────────────────────────────
  const checkinDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (checkinDebounce.current) clearTimeout(checkinDebounce.current);

    checkinDebounce.current = setTimeout(async () => {
      // selfReport is 1-5, backend expects 0-100
      const moodScore = Math.round((selfReport / 5) * 100);
      await submitCheckin(userId, moodScore);
    }, 500);

    return () => {
      if (checkinDebounce.current) clearTimeout(checkinDebounce.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfReport]);

  // ── Event logging ─────────────────────────────────────────────────────────
  const logEvent = useCallback(
    (e: Omit<HistoryEvent, 'id' | 'time'>) => {
      const newEvent: HistoryEvent = {
        id: Math.random().toString(36).slice(2),
        time: Date.now(),
        ...e,
      };
      setHistory((h) => [newEvent, ...h]);

      // Persist crisis events to backend
      if (e.action === 'crisis') {
        logOverloadEvent(userId, e.trigger, e.score, 0).catch(() => {});
      }
    },
    [userId],
  );

  // ── Crisis mode ───────────────────────────────────────────────────────────
  const goCrisis = useCallback(() => {
    setAlertOpen(false);
    setAppScreen('crisis');
    logEvent({ trigger: primaryTrigger, score: risk.score, action: 'crisis' });
    // logOverloadEvent is already called inside logEvent for 'crisis' action
  }, [logEvent, primaryTrigger, risk.score]);

  // ── Auto-alert on elevated risk ───────────────────────────────────────────
  useEffect(() => {
    if (
      risk.score >= 3 &&
      alertShownForScore === null &&
      appScreen !== 'crisis' &&
      appScreen !== 'welcome' &&
      appScreen !== 'profile'
    ) {
      setAlertOpen(true);
      setAlertShownForScore(risk.score);
    }
    if (risk.score < 3) setAlertShownForScore(null);
  }, [risk.score, appScreen, alertShownForScore]);

  // ── Alert modal action handlers ───────────────────────────────────────────
  const handleAlertTry = useCallback(async () => {
    logEvent({ trigger: primaryTrigger, score: risk.score, action: 'tried' });
    setAlertOpen(false);
    // Fire-and-forget: create alert then record positive feedback
    const alertResp = await createAlert(
      userId,
      risk.level === 'high' ? 'critical' : 'warning',
      `Sensory overload risk at ${risk.score}/10 — user tried a strategy`,
    );
    if (alertResp?.id) {
      submitAlertFeedback(alertResp.id, true).catch(() => {});
    }
  }, [logEvent, primaryTrigger, risk, userId]);

  const handleAlertDismiss = useCallback(async () => {
    logEvent({ trigger: primaryTrigger, score: risk.score, action: 'dismissed' });
    setAlertOpen(false);
    // Fire-and-forget: create alert then record negative feedback (false positive)
    const alertResp = await createAlert(
      userId,
      risk.level === 'high' ? 'critical' : 'warning',
      `Sensory overload risk at ${risk.score}/10 — user dismissed`,
    );
    if (alertResp?.id) {
      submitAlertFeedback(alertResp.id, false).catch(() => {});
    }
  }, [logEvent, primaryTrigger, risk, userId]);

  const handleAlertOk = useCallback(() => {
    logEvent({ trigger: primaryTrigger, score: risk.score, action: 'ok' });
    setAlertOpen(false);
  }, [logEvent, primaryTrigger, risk.score]);

  // ── Assemble context value ────────────────────────────────────────────────
  const appState: AppState = {
    userId,
    profile, setProfile, environments, setEnvironments, ageGroup, setAgeGroup,
    commStyle, setCommStyle, noise, setNoise, light, setLight, selfReport, setSelfReport,
    bleConnected, setBleConnected, strategies, setStrategies, history, logEvent,
    accommodations, setAccommodations, highContrast, setHighContrast,
    reduceMotion, setReduceMotion, sensitivity, setSensitivity,
    risk, primaryTrigger, suggestions, backendOnline,
    goCrisis, navigateTo: setAppScreen,
  };

  return (
    <SafeAreaProvider>
      <AppContext.Provider value={appState}>
        <NavigationContainer>
          {appScreen === 'welcome' && <WelcomeScreen onNext={() => setAppScreen('profile')} />}
          {appScreen === 'profile' && <ProfileSetupScreen onDone={() => setAppScreen('home')} />}
          {appScreen === 'crisis' && <CrisisModeScreen onExit={() => setAppScreen('home')} />}
          {appScreen === 'caretaker-gate' && <CaretakerGateScreen onUnlock={() => setAppScreen('caretaker')} />}
          {appScreen === 'caretaker' && <CaretakerDashboardScreen onExit={() => setAppScreen('home')} />}
          {appScreen === 'home' && (
            <View style={{ flex: 1 }}>
              <TabNavigator goCrisis={goCrisis} />
              <TouchableOpacity
                onPress={goCrisis}
                style={styles.overloadBtn}
                activeOpacity={0.85}
              >
                <Heart color="#fff" size={18} />
                <Text style={styles.overloadBtnText}>I'm Overloaded</Text>
              </TouchableOpacity>
            </View>
          )}
        </NavigationContainer>

        <Modal visible={alertOpen} transparent animationType="slide" onRequestClose={handleAlertDismiss}>
          <LiveAlertModal
            suggestions={suggestions}
            risk={risk}
            onTry={handleAlertTry}
            onDismiss={handleAlertDismiss}
            onOk={handleAlertOk}
            onCrisis={goCrisis}
          />
        </Modal>
      </AppContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: 4,
    height: 62,
    elevation: 8,
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  overloadBtn: {
    position: 'absolute',
    bottom: 74,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.riskHigh,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    elevation: 8,
    shadowColor: colors.riskHigh,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 30,
  },
  overloadBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
