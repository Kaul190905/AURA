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
  | 'caretaker-gate' | 'monitoring-mode' | 'caretaker' | 'caretaker-home'
  | 'teacher-home' | 'caretaker-students' | 'caretaker-track-student'
  | 'user_profile';

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
  profilePhoto: string | null;
  setProfilePhoto: (v: string | null) => void;
  // ── Backend / Auth ───────────────────────────────────────────────────────
  /** Supabase user UUID — null until signed in */
  userId: string | null;
  setUserId: (id: string | null) => void;
  /** Current Supabase JWT — null until signed in */
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  // ── Monitoring Modes ────────────────────────────────────────────────────
  caretakerType: 'teacher' | 'personal-caretaker' | null;
  setCaretakerType: (mode: 'teacher' | 'personal-caretaker' | null) => void;
  selectedStudent: string | null;
  setSelectedStudent: (id: string | null) => void;
  recentlyViewedIds: string[];
  setRecentlyViewedIds: (ids: string[]) => void;
  mockStudents: Array<{
    id: string;
    name: string;
    location: string;
    risk: number;
    isCrisis: boolean;
    rollNumber?: string;
    className?: string;
    recentActivity?: string;
    lastUpdated?: string;
    condition?: string;
    sensorValue?: string;
    latitude?: number;
    longitude?: number;
    wearableStatus?: string;
    battery?: number;
    trackingStatus?: 'Active' | 'Inactive';
    profileImage?: string;
    bluetoothStatus?: 'Connected' | 'Reconnecting' | 'Disconnected';
    locationHistory?: Array<{ time: string; location: string }>;
  }>;
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
  }>;
  setMockUsers: (users: AppState['mockUsers']) => void;
};

export const AppContext = React.createContext<AppState>({} as AppState);
