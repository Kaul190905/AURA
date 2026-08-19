import React from 'react';
import { TriggerKey, HistoryEvent, Strategy, Accommodation } from './types';
import { computeRisk } from './utils';

export type AppNotification = {
  id: string;
  title: string;
  description: string;
  time: number;
  read: boolean;
  type: 'alert' | 'info' | 'suggestion' | 'system';
};

export type AppScreen =
  | 'login' | 'welcome' | 'profile' | 'home' | 'crisis'
  | 'recovery' | 'settings' | 'speech' | 'plans'
  | 'caretaker' | 'caretaker-home'
  | 'user_profile' | 'accessibility' | 'device' | 'privacy' | 'onboarding' | 'caregiver_manager';

export type AppState = {
  primaryRole: 'user' | 'caretaker' | null;
  setPrimaryRole: (role: 'user' | 'caretaker' | null) => void;
  isCrisisMode: boolean;
  setIsCrisisMode: (isCrisis: boolean) => void;
  crisisRiskBefore: number | null;
  setCrisisRiskBefore: (val: number | null) => void;
  notifications: AppNotification[];
  setNotifications: (n: AppNotification[]) => void;
  isNotificationCenterOpen: boolean;
  setIsNotificationCenterOpen: (val: boolean) => void;
  caregiver: { name: string; relationship: string; phone: string; email: string };
  setCaregiver: (c: { name: string; relationship: string; phone: string; email: string }) => void;
  profile: Partial<Record<TriggerKey, number>>;
  setProfile: (p: Partial<Record<TriggerKey, number>>) => void;

  dob: string;
  setDob: (d: string) => void;
  noise: number | null;
  setNoise: (n: number | null) => void;
  temperature: number | null;
  setTemperature: (v: number | null) => void;
  heartRate: number | null;
  setHeartRate: (v: number | null) => void;
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
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  colorVisionMode: 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  setColorVisionMode: (v: 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia') => void;
  sensitivity: number;
  setSensitivity: (n: number) => void;
  risk: ReturnType<typeof computeRisk>;
  primaryTrigger: TriggerKey;
  suggestions: Strategy[];
  goCrisis: () => void;
  triggerSos: () => void;
  navigateTo: (s: AppScreen) => void;
  profilePhoto: string | null;
  setProfilePhoto: (v: string | null) => void;
  // ── Backend / Auth ───────────────────────────────────────────────────────
  /** Supabase user UUID — null until signed in */
  userId: string | null;
  setUserId: (id: string | null) => void;
  /** Current Supabase JWT — null until signed in */
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;

  recentlyViewedUserIds: string[];
  setRecentlyViewedUserIds: (ids: string[]) => void;
  mockUsers: Array<{
    id: string;
    name: string;
    risk: number;
    isCrisis: boolean;
    condition?: string;
    sensorValue?: string;
    phoneLocation?: string;
    locationSharingStatus?: 'Active' | 'Paused' | 'Unavailable';
    lastUpdated?: string;
    profileImage?: string;
    sensoryProfile?: {
      sound: boolean;
      temperature: boolean;
    };
    currentSensorData?: {
      heartRate: number | null;
      soundDb: number | null;
      temperatureC: number | null;
    };
    email?: string;
    aboutMe?: string;
    dob?: string;
    emergencyCaregiver?: {
      name: string;
      phone: string;
      email: string;
    };
    assignment?: any;
  }>;
  setMockUsers: (users: AppState['mockUsers']) => void;
  isCaregiverOnline: boolean;
  setIsCaregiverOnline: (val: boolean) => void;
};

export const AppContext = React.createContext<AppState>({} as AppState);
