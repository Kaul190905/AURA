import { TriggerKey, HistoryEvent } from './types';

// ── Risk engine ───────────────────────────────────────────────────────────────
export function computeRisk(
  noiseDb: number,
  lightLux: number,
  selfReport: number,
  profile: Partial<Record<TriggerKey, number>>,
) {
  const factors: { label: string; weight: number }[] = [];

  const soundSens = (profile.sound ?? 2) / 5;
  const noiseScore = Math.max(0, Math.min(5, (noiseDb - 50) / 10)) * (0.5 + soundSens);
  if (noiseScore > 1.2) factors.push({ label: `Noise around ${Math.round(noiseDb)} dB`, weight: noiseScore });

  const lightSens = (profile.light ?? 2) / 5;
  const lightScore = Math.max(0, Math.min(5, (lightLux - 300) / 200)) * (0.5 + lightSens);
  if (lightScore > 1) factors.push({ label: `Bright light (${Math.round(lightLux)} lux)`, weight: lightScore });

  const selfScore = (selfReport - 1) * 1.2;
  if (selfReport >= 3) factors.push({ label: `You said you feel ${selfReport}/5`, weight: selfScore });

  const raw = noiseScore + lightScore + selfScore;
  const score = Math.max(0, Math.min(10, Math.round(raw)));
  const level: 'low' | 'medium' | 'high' = score <= 2 ? 'low' : score <= 4 ? 'medium' : 'high';
  return { score, level, factors: factors.sort((a, b) => b.weight - a.weight).slice(0, 3) };
}

// ── Time formatting ───────────────────────────────────────────────────────────
export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ── Risk colors ───────────────────────────────────────────────────────────────
export function riskColor(score: number) {
  if (score <= 2) return '#4CAF82';
  if (score <= 4) return '#E0A83A';
  return '#E06B3A';
}

export function riskLabel(level: 'low' | 'medium' | 'high') {
  return level === 'low' ? 'Calm' : level === 'medium' ? 'Building' : 'High';
}
