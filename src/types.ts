// ── Shared Types ──────────────────────────────────────────────────────────────
export type TriggerKey = 'sound' | 'temp' | 'touch' | 'crowd' | 'movement' | 'smell';

export type Screen =
  | 'welcome' | 'profile' | 'home' | 'alert' | 'crisis' | 'library'
  | 'history' | 'caretaker-gate' | 'caretaker' | 'wearable' | 'settings';

export type HistoryEvent = {
  id: string;
  time: number;
  trigger: TriggerKey | 'self';
  score: number;
  action: 'tried' | 'dismissed' | 'ok' | 'crisis';
  note?: string;
};

export type Strategy = {
  id: string;
  title: string;
  note?: string;
  trigger: TriggerKey;
  helped: number;
  tried: number;
  custom?: boolean;
};

export type Accommodation = {
  id: string;
  time: number;
  text: string;
};
