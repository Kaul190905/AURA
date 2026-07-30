import { TriggerKey, HistoryEvent, Strategy } from './types';

// ── Trigger definitions ───────────────────────────────────────────────────────
export const TRIGGERS: { key: TriggerKey; label: string }[] = [
  { key: 'sound', label: 'Sound' },
  { key: 'temp', label: 'Temperature' },
<<<<<<< HEAD
];

export const PRESETS: { name: string; triggers: Partial<Record<TriggerKey, number>> }[] = [
  { name: 'Sound-sensitive', triggers: { sound: 5 } },
  { name: 'Temperature-sensitive', triggers: { temp: 5, sound: 2 } },
];

export const DEFAULT_STRATEGIES: Strategy[] = [
  { id: 's1', title: 'Put on noise-cancelling headphones', trigger: 'sound', helped: 8, tried: 10 },
  { id: 's3', title: '5-4-3-2-1 grounding', trigger: 'sound', helped: 6, tried: 8 },
  { id: 's4', title: 'Drink cold water or remove a layer', trigger: 'temp', helped: 9, tried: 10 },
  { id: 's5', title: 'Move to a cooler area', trigger: 'temp', helped: 5, tried: 7 },
=======
  { key: 'touch', label: 'Touch' },
  { key: 'crowd', label: 'Crowding' },
  { key: 'movement', label: 'Movement' },
  { key: 'smell', label: 'Smell' },
];

export const PRESETS: { name: string; triggers: Partial<Record<TriggerKey, number>> }[] = [
  { name: 'Sound-sensitive', triggers: { sound: 5, crowd: 3 } },
  { name: 'Temperature-sensitive', triggers: { temp: 5, sound: 2 } },
  { name: 'Crowd-sensitive', triggers: { crowd: 5, sound: 3, movement: 2 } },
];

export const ENVIRONMENTS = ['Classroom', 'Bus', 'Mall', 'Home', 'Exam hall'];

export const DEFAULT_STRATEGIES: Strategy[] = [
  { id: 's1', title: 'Put on noise-cancelling headphones', trigger: 'sound', helped: 8, tried: 10 },
  { id: 's2', title: 'Step outside for 2 minutes', trigger: 'crowd', helped: 7, tried: 9 },
  { id: 's3', title: '5-4-3-2-1 grounding', trigger: 'sound', helped: 6, tried: 8 },
  { id: 's4', title: 'Drink cold water or remove a layer', trigger: 'temp', helped: 9, tried: 10 },
  { id: 's5', title: 'Move to a cooler area', trigger: 'temp', helped: 5, tried: 7 },
  { id: 's6', title: 'Slow box breathing', trigger: 'movement', helped: 7, tried: 9 },
  { id: 's7', title: 'Deep-pressure squeeze (hands together)', trigger: 'touch', helped: 6, tried: 8 },
  { id: 's8', title: 'Move to a quieter corner', trigger: 'crowd', helped: 8, tried: 11 },
  { id: 's9', title: 'Sip cool water slowly', trigger: 'smell', helped: 4, tried: 6 },
>>>>>>> origin/srinath-dev
];

export function seedHistory(): HistoryEvent[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return [
    { id: 'h1', time: now - 6 * day, trigger: 'sound', score: 6, action: 'tried', note: 'Bus ride home' },
    { id: 'h2', time: now - 5 * day, trigger: 'temp', score: 4, action: 'dismissed' },
<<<<<<< HEAD
    { id: 'h4', time: now - 3 * day, trigger: 'sound', score: 5, action: 'tried' },
    { id: 'h5', time: now - 2 * day, trigger: 'sound', score: 3, action: 'ok' },
=======
    { id: 'h3', time: now - 4 * day, trigger: 'crowd', score: 7, action: 'crisis', note: 'School hallway' },
    { id: 'h4', time: now - 3 * day, trigger: 'sound', score: 5, action: 'tried' },
    { id: 'h5', time: now - 2 * day, trigger: 'sound', score: 3, action: 'ok' },
    { id: 'h6', time: now - 1 * day, trigger: 'crowd', score: 6, action: 'tried', note: 'Cafeteria' },
>>>>>>> origin/srinath-dev
    { id: 'h7', time: now - 3 * 60 * 60 * 1000, trigger: 'self', score: 4, action: 'tried' },
  ];
}
