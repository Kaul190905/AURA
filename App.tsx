import 'react-native-gesture-handler';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, TouchableOpacity, Text, Modal } from 'react-native';
import { House, Library, TrendingUp, Bluetooth, Settings, Heart, User, Sparkles } from 'lucide-react-native';

import { colors, fonts } from './src/theme';
import { TriggerKey, HistoryEvent, Strategy, Accommodation } from './src/types';
import { DEFAULT_STRATEGIES, seedHistory } from './src/data';
import { computeRisk } from './src/utils';

import WelcomeScreen from './src/screens/WelcomeScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import CrisisModeScreen from './src/screens/CrisisModeScreen';
import StrategyLibraryScreen from './src/screens/StrategyLibraryScreen';
import HistoryInsightsScreen from './src/screens/HistoryInsightsScreen';
import WearableScreen from './src/screens/WearableScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import RecoverySummaryScreen from './src/screens/RecoverySummaryScreen';
import { NotificationModal } from './src/components/NotificationModal';
import { AuraAIPanel } from './src/components/AuraAIPanel';
import SpeechDiaryScreen from './src/screens/SpeechDiaryScreen';
import PlansScreen from './src/screens/PlansScreen';
import CaretakerGateScreen from './src/screens/CaretakerGateScreen';
import CaretakerDashboardScreen from './src/screens/CaretakerDashboardScreen';
import CaretakerAnalysisScreen from './src/screens/CaretakerAnalysisScreen';
import CaretakerProfileScreen from './src/screens/CaretakerProfileScreen';
import LiveAlertModal from './src/components/LiveAlertModal';

import { AppContext, AppNotification, AppScreen, AppState } from './src/AppContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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
        name="House"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }}
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

// ── Caretaker Tab Navigator ──────────────────────────────────────────────────
function CaretakerTabNavigator() {
  const { darkMode } = React.useContext(AppContext);
  const bg = darkMode ? '#000000' : colors.background;
  const border = darkMode ? '#1c1c1e' : colors.border;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: bg, borderTopColor: border }],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={CaretakerDashboardScreen}
        options={{ tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Analysis"
        component={CaretakerAnalysisScreen}
        options={{ tabBarIcon: ({ color, size }) => <TrendingUp color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={CaretakerProfileScreen}
        options={{ tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [appScreen, setAppScreen] = useState<AppScreen>('welcome');
  const [userRole, setUserRole] = useState<'user' | 'caregiver' | null>(null);
  const [isCrisisMode, setIsCrisisMode] = useState(false);
  const [crisisRiskBefore, setCrisisRiskBefore] = useState<number | null>(null);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  
  const [notifications, setNotifications] = useState<AppNotification[]>([
    { id: '1', title: 'High Noise Detected', description: 'Environment exceeded 85dB.', time: Date.now() - 3600000, read: false, type: 'alert' },
    { id: '2', title: 'Risk Level Increased', description: 'Sensory overload risk is High.', time: Date.now() - 7200000, read: true, type: 'alert' },
    { id: '3', title: 'Suggestion Accepted', description: 'User started Deep Breathing.', time: Date.now() - 86400000, read: true, type: 'suggestion' },
    { id: '4', title: 'Wearable Battery Low', description: 'Device is at 15%.', time: Date.now() - 172800000, read: true, type: 'system' }
  ]);

  const [profile, setProfile] = useState<Partial<Record<TriggerKey, number>>>({ sound: 4, crowd: 3, temp: 2 });
  const [environments, setEnvironments] = useState<string[]>(['Classroom', 'Bus']);
  const [ageGroup, setAgeGroup] = useState('Teen');
  const [commStyle, setCommStyle] = useState<'text' | 'emoji' | 'visual'>('text');
  const [noise, setNoise] = useState(55);
  const [temperature, setTemperature] = useState(98);
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
  const [darkMode, setDarkMode] = useState(false);
  const [sensitivity, setSensitivity] = useState(3);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertShownForScore, setAlertShownForScore] = useState<number | null>(null);

  const risk = useMemo(() => computeRisk(noise, temperature, selfReport, profile), [noise, temperature, selfReport, profile]);

  const primaryTrigger = useMemo<TriggerKey>(() => {
    const entries = Object.entries(profile) as [TriggerKey, number][];
    if (!entries.length) return 'sound';
    return entries.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0][0];
  }, [profile]);

  const suggestions = useMemo(() => {
    const matched = strategies.filter((s) => s.trigger === primaryTrigger);
    const rest = strategies.filter((s) => s.trigger !== primaryTrigger);
    return [...matched, ...rest].slice(0, 3);
  }, [strategies, primaryTrigger]);

  const logEvent = (e: Omit<HistoryEvent, 'id' | 'time'>) =>
    setHistory((h) => [{ id: Math.random().toString(36).slice(2), time: Date.now(), ...e }, ...h]);

  const goCrisis = useCallback(() => {
    setAlertOpen(false);
    setCrisisRiskBefore(risk.score);
    setIsCrisisMode(true);
    logEvent({ trigger: 'self', score: risk.score, action: 'crisis' });
  }, [risk.score]);

  useEffect(() => {
    if (risk.score >= 3 && alertShownForScore === null && appScreen !== 'welcome' && appScreen !== 'profile' && !isCrisisMode) {
      setAlertOpen(true);
      setAlertShownForScore(risk.score);
    }
    if (risk.score < 3) setAlertShownForScore(null);
  }, [risk.score, appScreen, alertShownForScore, isCrisisMode]);

  const [highNoiseAlerted, setHighNoiseAlerted] = useState(false);
  const [dangerousTempAlerted, setDangerousTempAlerted] = useState(false);
  const [popupState, setPopupState] = useState({ visible: false, message: '' });
  
  useEffect(() => {
    if (noise > 75 && !highNoiseAlerted) {
      setHighNoiseAlerted(true);
      setNotifications(prev => [{
        id: Math.random().toString(),
        title: 'High Noise Alert',
        description: `Noise level reached ${noise}dB, exceeding safe limits.`,
        time: Date.now(),
        read: false,
        type: 'alert'
      }, ...prev]);
      
      setPopupState({ visible: true, message: `Noise level reached ${noise}dB. An alert has been sent to your caretaker.` });
      setTimeout(() => setPopupState(prev => ({ ...prev, visible: false })), 3000);
    } else if (noise <= 75 && highNoiseAlerted) {
      setHighNoiseAlerted(false);
    }
  }, [noise, highNoiseAlerted]);

  useEffect(() => {
    const isDangerousTemp = temperature >= 104 || temperature <= 95;
    if (isDangerousTemp && !dangerousTempAlerted) {
      setDangerousTempAlerted(true);
      const condition = temperature >= 104 ? 'Overheating (Heat Stroke)' : 'Hypothermia (Extreme Cold)';
      setNotifications(prev => [{
        id: Math.random().toString(),
        title: 'Dangerous Temperature Alert',
        description: `Core body temperature is ${temperature}°F (${condition}).`,
        time: Date.now(),
        read: false,
        type: 'alert'
      }, ...prev]);
      
      setPopupState({ visible: true, message: `Core temperature is ${temperature}°F. An alert has been sent to your caretaker.` });
      setTimeout(() => setPopupState(prev => ({ ...prev, visible: false })), 3000);
    } else if (!isDangerousTemp && dangerousTempAlerted) {
      setDangerousTempAlerted(false);
    }
  }, [temperature, dangerousTempAlerted]);

    const appState: AppState = {
      userRole, setUserRole,
      isCrisisMode, setIsCrisisMode,
      crisisRiskBefore, setCrisisRiskBefore,
      notifications, setNotifications,
      isNotificationCenterOpen, setIsNotificationCenterOpen,
      isAIPanelOpen, setIsAIPanelOpen,
      profile, setProfile, environments, setEnvironments, ageGroup, setAgeGroup,
      commStyle, setCommStyle, noise, setNoise, temperature, setTemperature, selfReport, setSelfReport,
      bleConnected, setBleConnected, strategies, setStrategies, history, logEvent,
      accommodations, setAccommodations, highContrast, setHighContrast,
      reduceMotion, setReduceMotion, darkMode, setDarkMode, sensitivity, setSensitivity,
      risk, primaryTrigger, suggestions, goCrisis,
      navigateTo: setAppScreen,
    };

  return (
    <SafeAreaProvider>
      <AppContext.Provider value={appState}>
        <NavigationContainer>
          {appScreen === 'welcome' && <WelcomeScreen onNext={(role) => {
            setUserRole(role);
            setAppScreen(role === 'caregiver' ? 'caretaker-home' : 'profile');
          }} />}
          {appScreen === 'profile' && <ProfileSetupScreen onDone={() => setAppScreen('home')} />}
          {appScreen === 'recovery' && <RecoverySummaryScreen onExit={() => setAppScreen('home')} />}
          {appScreen === 'speech' && <SpeechDiaryScreen onBack={() => setAppScreen('home')} />}
          {appScreen === 'plans' && <PlansScreen onBack={() => setAppScreen('home')} />}
          {appScreen === 'caretaker-gate' && <CaretakerGateScreen onBack={() => setAppScreen('settings')} onSuccess={() => { setUserRole('caregiver'); setAppScreen('caretaker-home'); }} />}
          {appScreen === 'caretaker-home' && (
            <View style={{ flex: 1 }}>
              <CaretakerTabNavigator />
            </View>
          )}
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
              
              <TouchableOpacity
                onPress={() => setIsAIPanelOpen(true)}
                style={styles.aiFab}
                activeOpacity={0.85}
              >
                <Sparkles color={colors.primary} size={24} />
              </TouchableOpacity>
            </View>
          )}
          <NotificationModal />
          <AuraAIPanel visible={isAIPanelOpen} onClose={() => setIsAIPanelOpen(false)} />
        </NavigationContainer>

        <Modal visible={alertOpen} transparent animationType="slide" onRequestClose={() => setAlertOpen(false)}>
          <LiveAlertModal
            suggestions={suggestions}
            risk={risk}
            onTry={() => { logEvent({ trigger: 'auto', score: risk.score, action: 'tried' }); setAlertOpen(false); }}
            onDismiss={() => { logEvent({ trigger: 'auto', score: risk.score, action: 'dismissed' }); setAlertOpen(false); }}
            onOk={() => { logEvent({ trigger: 'auto', score: risk.score, action: 'ok' }); setAlertOpen(false); }}
            onCrisis={goCrisis}
          />
        </Modal>

        <Modal visible={popupState.visible} transparent animationType="fade">
          <View style={styles.popupOverlay}>
            <View style={styles.popupCard}>
              <Text style={styles.popupTitle}>Caretaker Notified</Text>
              <Text style={styles.popupText}>{popupState.message}</Text>
            </View>
          </View>
        </Modal>

        <Modal visible={isCrisisMode} animationType="fade" onRequestClose={() => setIsCrisisMode(false)}>
          <CrisisModeScreen onExit={() => setIsCrisisMode(false)} />
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
    color: '#fff', ...fonts.bold, fontSize: 16,
  },
  aiFab: {
    position: 'absolute', bottom: 100, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupCard: {
    backgroundColor: colors.background,
    padding: 24,
    borderRadius: 24,
    width: '80%',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  popupTitle: {
    fontSize: 18,
    color: colors.foreground,
    ...fonts.bold,
    marginBottom: 8,
  },
  popupText: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
});
