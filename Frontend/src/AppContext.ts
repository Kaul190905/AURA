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
  | 'welcome' | 'profile' | 'home' | 'crisis'
  | 'recovery' | 'settings' | 'speech' | 'plans'
  | 'caretaker-gate' | 'caretaker' | 'caretaker-home';

export type AppState = {
  userRole: 'user' | 'caregiver' | null;
  setUserRole: (role: 'user' | 'caregiver' | null) => void;
  isCrisisMode: boolean;
  setIsCrisisMode: (isCrisis: boolean) => void;
  crisisRiskBefore: number | null;
  setCrisisRiskBefore: (val: number | null) => void;
  notifications: AppNotification[];
  setNotifications: (n: AppNotification[]) => void;
  isNotificationCenterOpen: boolean;
  setIsNotificationCenterOpen: (val: boolean) => void;
  caregiver: { name: string; relationship: string; phone: string };
  setCaregiver: (c: { name: string; relationship: string; phone: string }) => void;
  profile: Partial<Record<TriggerKey, number>>;
  setProfile: (p: Partial<Record<TriggerKey, number>>) => void;

  dob: string;
  setDob: (d: string) => void;
  noise: number;
  setNoise: (n: number) => void;
  temperature: number;
  setTemperature: (v: number) => void;
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
  navigateTo: (s: AppScreen) => void;
  // ── Backend / Auth ───────────────────────────────────────────────────────
  /** Supabase user UUID — null until signed in */
  userId: string | null;
  setUserId: (id: string | null) => void;
  /** Current Supabase JWT — null until signed in */
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
};

export const AppContext = React.createContext<AppState>({} as AppState);
