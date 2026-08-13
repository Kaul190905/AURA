import 'react-native-gesture-handler';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, TouchableOpacity, Text, Modal, Linking } from 'react-native';
import { House, Library, TrendingUp, Bluetooth, Settings, Heart, User, AlertTriangle, CheckCircle2, Navigation, Users } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, fonts, applyColorVisionMode } from './src/theme';
import { TriggerKey, HistoryEvent, Strategy, Accommodation } from './src/types';
import { DEFAULT_STRATEGIES, seedHistory } from './src/data';
import { computeRisk } from './src/utils';

// Backend services
import { supabase } from './src/services/supabaseClient';
import { submitSensorData, logOverloadEvent, getRecommendations } from './src/services/api';
import { SENSOR_PUSH_INTERVAL_MS } from './src/config';

import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import CrisisModeScreen from './src/screens/CrisisModeScreen';
import StrategyLibraryScreen from './src/screens/StrategyLibraryScreen';
import HistoryInsightsScreen from './src/screens/HistoryInsightsScreen';
import WearableScreen from './src/screens/WearableScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import RecoverySummaryScreen from './src/screens/RecoverySummaryScreen';
import { NotificationModal } from './src/components/NotificationModal';
import SpeechDiaryScreen from './src/screens/SpeechDiaryScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import PlansScreen from './src/screens/PlansScreen';
import CaretakerGateScreen from './src/screens/CaretakerGateScreen';
import CaretakerDashboardScreen from './src/screens/CaretakerDashboardScreen';
import CaretakerUsersScreen from './src/screens/CaretakerUsersScreen';
import CaretakerUserHistoryScreen from './src/screens/CaretakerUserHistoryScreen';
import CaretakerProfileScreen from './src/screens/CaretakerProfileScreen';
import ProfileDetailsScreen from './src/screens/ProfileDetailsScreen';
import EmergencyContactsScreen from './src/screens/EmergencyContactsScreen';
import ConnectedUserDetailsScreen from './src/screens/ConnectedUserDetailsScreen';
import SensoryStatusScreen from './src/screens/SensoryStatusScreen';
import LocationMapScreen from './src/screens/LocationMapScreen';
import HeartRateHistoryScreen from './src/screens/HeartRateHistoryScreen';
import SoundHistoryScreen from './src/screens/SoundHistoryScreen';
import LiveAlertModal from './src/components/LiveAlertModal';

import { AppContext, AppNotification, AppScreen, AppState } from './src/AppContext';

const MainTab = createBottomTabNavigator();
const CaretakerTab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ── Tab Navigator (main app) ──────────────────────────────────────────────────
function TabNavigator({ goCrisis, initialRouteName = 'House' }: { goCrisis: () => void, initialRouteName?: string }) {
  return (
    <MainTab.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <MainTab.Screen
        name="House"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }}
      />
      <MainTab.Screen
        name="Library"
        component={StrategyLibraryScreen}
        options={{ tabBarIcon: ({ color, size }) => <Library color={color} size={size} /> }}
      />
      <MainTab.Screen
        name="Insights"
        component={HistoryInsightsScreen}
        options={{ tabBarIcon: ({ color, size }) => <TrendingUp color={color} size={size} /> }}
      />
      <MainTab.Screen
        name="Device"
        component={WearableScreen}
        options={{ tabBarIcon: ({ color, size }) => <Bluetooth color={color} size={size} /> }}
      />
      <MainTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: ({ color, size }) => <Settings color={color} size={size} /> }}
      />
      </MainTab.Navigator>
  );
}


// ── Caretaker Tab Navigator ──────────────────────────────────────────────────
function CaretakerTabNavigator() {
  const { darkMode } = React.useContext(AppContext);
  const bg = darkMode ? '#000000' : colors.background;
  const border = darkMode ? '#1c1c1e' : colors.border;
  return (
    <CaretakerTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: bg, borderTopColor: border }],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <CaretakerTab.Screen
        name="Dashboard"
        component={CaretakerDashboardScreen}
        options={{ tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }}
      />
      <CaretakerTab.Screen
        name="Users"
        component={CaretakerUsersScreen}
        options={{ tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }}
      />
      <CaretakerTab.Screen
        name="Settings"
        component={ProfileStackNavigator}
        options={{ tabBarIcon: ({ color, size }) => <Settings color={color} size={size} /> }}
      />
    </CaretakerTab.Navigator>
  );
}

const CaretakerStack = createStackNavigator();
function CaretakerRoot() {
  return (
    <CaretakerStack.Navigator screenOptions={{ headerShown: false }}>
      <CaretakerStack.Screen name="CaretakerTabs" component={CaretakerTabNavigator} />
      <CaretakerStack.Screen name="ConnectedUserDetails" component={ConnectedUserDetailsScreen} />
      <CaretakerStack.Screen name="LocationMap" component={LocationMapScreen} />
      <CaretakerStack.Screen name="SensoryStatus" component={SensoryStatusScreen} />
      <CaretakerStack.Screen name="HeartRateHistory" component={HeartRateHistoryScreen} />
      <CaretakerStack.Screen name="SoundHistory" component={SoundHistoryScreen} />
      <CaretakerStack.Screen name="UserHistory" component={CaretakerUserHistoryScreen} />
    </CaretakerStack.Navigator>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
const ProfileStack = createStackNavigator();
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMenu" component={CaretakerProfileScreen} />
      <ProfileStack.Screen name="ProfileDetails" component={ProfileDetailsScreen} />
      <ProfileStack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
      <ProfileStack.Screen name="ConnectedUserDetails" component={ConnectedUserDetailsScreen} />
      <ProfileStack.Screen name="LocationMap" component={LocationMapScreen} />
      <ProfileStack.Screen name="HeartRateHistory" component={HeartRateHistoryScreen} />
      <ProfileStack.Screen name="SoundHistory" component={SoundHistoryScreen} />
      <ProfileStack.Screen name="HistoryInsights" component={HistoryInsightsScreen} />
    </ProfileStack.Navigator>
  );
}

export default function App() {
  const [appScreen, setAppScreen] = useState<AppScreen>('welcome');
  const [primaryRole, setPrimaryRole] = useState<'user' | 'caretaker' | null>(null);
  const [isCrisisMode, setIsCrisisMode] = useState(false);
  const [crisisRiskBefore, setCrisisRiskBefore] = useState<number | null>(null);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [caregiver, setCaregiver] = useState({ name: '', relationship: '', phone: '', email: '' });
  const [notifications, setNotifications] = useState<AppNotification[]>([
    { id: '1', title: 'High Noise Detected', description: 'Environment exceeded 85dB.', time: Date.now() - 3600000, read: false, type: 'alert' },
    { id: '2', title: 'Risk Level Increased', description: 'Sensory overload risk is High.', time: Date.now() - 7200000, read: true, type: 'alert' },
    { id: '3', title: 'Suggestion Accepted', description: 'User started Deep Breathing.', time: Date.now() - 86400000, read: true, type: 'suggestion' },
    { id: '4', title: 'Wearable Battery Low', description: 'Device is at 15%.', time: Date.now() - 172800000, read: true, type: 'system' }
  ]);

  const [profile, setProfile] = useState<Partial<Record<TriggerKey, number>>>({ sound: 4, temp: 2 });
  const [dob, setDob] = useState('');
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
  const [colorVisionMode, setColorVisionMode] = useState<'default' | 'protanopia' | 'deuteranopia' | 'tritanopia'>('default');
  const [sensitivity, setSensitivity] = useState(3);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertShownForScore, setAlertShownForScore] = useState<number | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const [sosConfirmOpen, setSosConfirmOpen] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [currentTab, setCurrentTab] = useState('House');

  // ── Auth / Backend state ────────────────────────────────────────────────────
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // ── Monitoring Modes state ────────────────────────────────────────────────────
  const [recentlyViewedUserIds, setRecentlyViewedUserIds] = useState<string[]>([]);
  const [isCaregiverOnline, setIsCaregiverOnline] = useState(true);
  const [mockUsers, setMockUsers] = useState<AppState['mockUsers']>([
    { 
      id: 'u1', name: 'Rahul', risk: 9, isCrisis: true, condition: 'High Noise', sensorValue: '92 dB', phoneLocation: 'School Campus', locationSharingStatus: 'Active', lastUpdated: '2 min ago',
      sensoryProfile: { sound: true, temperature: true },
      currentSensorData: { heartRate: 112, soundDb: 92, temperatureC: 36.5 },
      aboutMe: 'I am sensitive to loud noises and extreme temperatures.',
      dob: '2010',
      emergencyCaregiver: { name: 'Dr. Smith', phone: '555-0192', email: 'smith@example.com' }
    },
    { 
      id: 'u2', name: 'Nisha', risk: 1, isCrisis: false, condition: 'Safe', phoneLocation: 'Home', locationSharingStatus: 'Active', lastUpdated: 'Just now',
      sensoryProfile: { sound: true, temperature: false },
      currentSensorData: { heartRate: 78, soundDb: 55, temperatureC: null },
      aboutMe: 'I prefer quiet environments.',
      dob: '2008',
      emergencyCaregiver: { name: 'Mrs. Davis', phone: '555-0188', email: 'davis@example.com' }
    },
    { 
      id: 'u3', name: 'Aarav', risk: 6, isCrisis: false, condition: 'High Temperature', sensorValue: '39°C', phoneLocation: 'Library', locationSharingStatus: 'Paused', lastUpdated: '15 min ago',
      sensoryProfile: { sound: false, temperature: true },
      currentSensorData: { heartRate: 95, soundDb: null, temperatureC: 39.0 },
      aboutMe: 'I get overwhelmed when it is too hot.',
      dob: '2012',
      emergencyCaregiver: { name: 'Mr. Patel', phone: '555-0211', email: 'patel@example.com' }
    },
  ]);

  // Handle Deep Links for Google OAuth Redirect
  useEffect(() => {
    const handleDeepLink = ({ url }: { url: string }) => {
      if (!url) return;
      // Supabase returns tokens as hash fragments (#access_token=...), replace with ? so searchParams can parse them
      const parsedUrl = new URL(url.replace('#', '?'));
      const accessToken = parsedUrl.searchParams.get('access_token');
      const refreshToken = parsedUrl.searchParams.get('refresh_token');
      if (accessToken && refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
    };

    const linkSubscription = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });
    return () => {
      linkSubscription.remove();
    };
  }, []);

  // Restore Supabase session on app boot
  useEffect(() => {
    const handleAuth = async (user: any) => {
      const storedRole = user?.user_metadata?.role;
      const roleSelected = user?.user_metadata?.roleSelected;
      
      if (roleSelected && storedRole === 'user') {
        setPrimaryRole('user');
        setAppScreen('home');
      } else if (roleSelected && storedRole === 'caretaker') {
        setPrimaryRole('caretaker');
        setAppScreen('caretaker-home');
      } else {
        setAppScreen('welcome');
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUserId(data.session.user.id);
        setAccessToken(data.session.access_token);
        handleAuth(data.session.user);
      }
      setSessionLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUserId(session?.user.id ?? null);
      setAccessToken(session?.access_token ?? null);
      if (!session) {
        setAppScreen('welcome');
        setPrimaryRole(null);
      } else if (_event === 'SIGNED_IN' && session.user) {
        await handleAuth(session.user);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const primaryTrigger = useMemo<TriggerKey>(() => {
    const entries = Object.entries(profile) as [TriggerKey, number][];
    if (!entries.length) return 'sound';
    return entries.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0][0];
  }, [profile]);

  // ── Periodic sensor data push ───────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const push = async () => {
      try {
        await submitSensorData({
          user_id: userId,
          noise,
          temperature,
          heart_rate: null,
          blood_oxygen: null,
        });
      } catch (e) {
        console.warn('[AURA] Sensor push failed:', e);
      }
    };
    // Push immediately on connect / userId change, then on interval
    push();
    const timer = setInterval(push, SENSOR_PUSH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [userId, noise, temperature]);

  const risk = useMemo(() => computeRisk(noise, temperature, selfReport, profile), [noise, temperature, selfReport, profile]);


  useEffect(() => {
    AsyncStorage.getItem('colorVisionMode').then(val => {
      if (val === 'protanopia' || val === 'deuteranopia' || val === 'tritanopia' || val === 'default') {
        setColorVisionMode(val);
        applyColorVisionMode(val);
      }
    });
    AsyncStorage.getItem('profilePhoto').then(val => {
      if (val) setProfilePhoto(val);
    });
  }, []);

  const handleSetProfilePhoto = (uri: string | null) => {
    setProfilePhoto(uri);
    if (uri) {
      AsyncStorage.setItem('profilePhoto', uri);
    } else {
      AsyncStorage.removeItem('profilePhoto');
    }
  };

  const handleSetColorVisionMode = (mode: 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia') => {
    setColorVisionMode(mode);
    applyColorVisionMode(mode);
    AsyncStorage.setItem('colorVisionMode', mode);
  };

  const suggestions = useMemo(() => {
    const matched = strategies.filter((s) => s.trigger === primaryTrigger);
    const rest = strategies.filter((s) => s.trigger !== primaryTrigger);
    return [...matched, ...rest].slice(0, 3);
  }, [strategies, primaryTrigger]);

  const logEvent = (e: Omit<HistoryEvent, 'id' | 'time'>) =>
    setHistory((h) => [{ id: Math.random().toString(36).slice(2), time: Date.now(), ...e }, ...h]);

  const goCrisis = useCallback(async () => {
    setAlertOpen(false);
    setCrisisRiskBefore(risk.score);
    setIsCrisisMode(true);
    logEvent({ trigger: 'self', score: risk.score, action: 'crisis' });
    // Log to backend
    if (userId) {
      try {
        await logOverloadEvent({
          user_id: userId,
          trigger_metric: primaryTrigger,
          trigger_value: risk.score,
          duration_seconds: 0, // updated when crisis ends
        });
      } catch (e) {
        console.warn('[AURA] Could not log overload event:', e);
      }
    }
  }, [risk.score, userId, primaryTrigger]);


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

  const handleSos = () => {
    setSosConfirmOpen(false);
    setSosSent(true);
    setTimeout(() => {
      setSosSent(false);
    }, 10000);
  };

    const appState: AppState = {
      primaryRole, setPrimaryRole,
      isCrisisMode, setIsCrisisMode,
      crisisRiskBefore, setCrisisRiskBefore,
      notifications, setNotifications,
      isNotificationCenterOpen, setIsNotificationCenterOpen,
      caregiver, setCaregiver,
      profile, setProfile, dob, setDob,
      noise, setNoise, temperature, setTemperature, selfReport, setSelfReport,
      bleConnected, setBleConnected, strategies, setStrategies, history, logEvent,
      accommodations, setAccommodations, highContrast, setHighContrast,
      reduceMotion, setReduceMotion, darkMode, setDarkMode, colorVisionMode, setColorVisionMode: handleSetColorVisionMode, sensitivity, setSensitivity,
      risk, primaryTrigger, suggestions, goCrisis,
      navigateTo: setAppScreen,
      profilePhoto, setProfilePhoto: handleSetProfilePhoto,
      userId, setUserId,
      accessToken, setAccessToken,
      recentlyViewedUserIds, setRecentlyViewedUserIds,
      mockUsers, setMockUsers,
      isCaregiverOnline, setIsCaregiverOnline,
    };


  return (
    <AppContext.Provider value={appState}>
      <SafeAreaProvider>
        <NavigationContainer 
          key={`${colorVisionMode}-${appScreen}`}
          onStateChange={(state) => {
            if (!state) return;
            const currentRoute = state.routes[state.index];
            if (currentRoute.state && currentRoute.state.routes) {
              const idx = currentRoute.state.index ?? 0;
              const nestedRoute = currentRoute.state.routes[idx];
              if (nestedRoute) setCurrentTab(nestedRoute.name);
            } else {
              setCurrentTab(currentRoute.name);
            }
          }}
        >
          {/* Route to Login if not authenticated, Welcome once signed in */}
          {!sessionLoading && !userId && (
            <LoginScreen onSuccess={() => {}} />
          )}
          {!sessionLoading && userId && appScreen === 'welcome' && <WelcomeScreen onNext={async (role) => {
            await supabase.auth.updateUser({ data: { role, roleSelected: true } });
            setPrimaryRole(role);
            setAppScreen(role === 'caretaker' ? 'caretaker-home' : 'home');
          }} />}
          {!sessionLoading && userId && appScreen === 'profile' && <ProfileSetupScreen onDone={() => setAppScreen('settings')} onBack={() => setAppScreen('settings')} />}

          {userId && appScreen === 'recovery' && <RecoverySummaryScreen onDone={() => setAppScreen('home')} />}
          {userId && appScreen === 'speech' && <SpeechDiaryScreen onBack={() => setAppScreen('home')} />}
          {userId && appScreen === 'plans' && <PlansScreen onBack={() => setAppScreen('home')} />}
          {userId && appScreen === 'user_profile' && <UserProfileScreen onBack={() => setAppScreen('home')} />}
          {userId && appScreen === 'caretaker-gate' && <CaretakerGateScreen onBack={() => setAppScreen('settings')} onSuccess={() => { setPrimaryRole('caretaker'); setAppScreen('caretaker-home'); }} />}
          {userId && appScreen === 'caretaker-home' && (
            <View style={{ flex: 1 }}>
              <CaretakerRoot />
            </View>
          )}
          {userId && (appScreen === 'home' || appScreen === 'settings') && (
            <View style={{ flex: 1 }}>
              <TabNavigator goCrisis={goCrisis} initialRouteName={appScreen === 'settings' ? 'Settings' : 'House'} />
              {currentTab === 'House' ? (
                <TouchableOpacity
                  onPress={() => setSosConfirmOpen(true)}
                  style={styles.sosBtn}
                  activeOpacity={0.85}
                >
                  <Text style={styles.sosBtnText}>SOS</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={goCrisis}
                  style={[styles.overloadBtn, {
                    backgroundColor: risk.score <= 2 ? '#4CAF82' : risk.score <= 4 ? '#E0A83A' : risk.score <= 6 ? '#E08A3A' : '#E06B3A',
                  }]}
                  activeOpacity={0.85}
                >
                  <Text style={styles.overloadBtnText}>
                    {risk.score <= 2 ? 'Calm' : risk.score <= 4 ? 'Stable' : risk.score <= 6 ? 'Elevated Response' : 'High Stress'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <NotificationModal />
        </NavigationContainer>

        {/* ── SOS Confirmation Modal ───────────────────────────────────────── */}
        <Modal visible={sosConfirmOpen} transparent animationType="fade" onRequestClose={() => setSosConfirmOpen(false)}>
          <View style={styles.popupOverlay}>
            <View style={[styles.popupCard, { paddingBottom: 32 }]}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <AlertTriangle size={32} color={colors.riskHigh} />
              </View>
              <Text style={styles.popupTitle}>Send Emergency Alert?</Text>
              <Text style={styles.popupText}>
                Are you sure you want to send an SOS alert to your contacts and caretaker?
              </Text>
              
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
                <TouchableOpacity onPress={() => setSosConfirmOpen(false)} style={[styles.modalBtn, { backgroundColor: colors.muted }]} activeOpacity={0.8}>
                  <Text style={[styles.modalBtnText, { color: colors.foreground }]}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSos} style={[styles.modalBtn, { backgroundColor: colors.riskHigh }]} activeOpacity={0.8}>
                  <Text style={styles.modalBtnText}>Yes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── SOS Sent Modal ───────────────────────────────────────── */}
        <Modal visible={sosSent} transparent animationType="fade" onRequestClose={() => setSosSent(false)}>
          <View style={styles.popupOverlay}>
            <View style={styles.popupCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <CheckCircle2 size={24} color={colors.riskHigh} />
                <Text style={styles.popupTitle}>SOS Sent</Text>
              </View>
              <Text style={styles.popupText}>
                An emergency alert has been dispatched to your contacts and caretaker. Help is on the way.
              </Text>
            </View>
          </View>
        </Modal>

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

      </SafeAreaProvider>
    </AppContext.Provider>
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
  sosBtn: {
    position: 'absolute',
    bottom: 74,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.riskHigh,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    elevation: 8,
    shadowColor: colors.riskHigh,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 30,
  },
  sosBtnText: {
    color: '#fff', ...fonts.bold, fontSize: 18,
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
  modalBtn: {
    flex: 1, height: 50, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: 16, color: '#fff', ...fonts.bold,
  },
});
