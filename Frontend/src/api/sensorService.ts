import { apiFetch, DEV_USER_ID } from './config';

// ── Sensor Data Types ──────────────────────────────────────────────────────────
export interface SensorDataAnalysisResponse {
  sensor_data: {
    id: string;
    user_id: string;
    timestamp: string;
    created_at: string;
    updated_at: string;
    noise: number | null;
    heart_rate: number | null;
    blood_oxygen: number | null;
    temperature: number | null;
    latitude: number | null;
    longitude: number | null;
  };
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  reasons: string[];
  recommendations: string[];
}

export interface SensorDataResponse {
  id: string;
  user_id: string;
  timestamp: string;
  created_at: string;
  updated_at: string;
  noise: number | null;
  heart_rate: number | null;
  blood_oxygen: number | null;
  temperature: number | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Submit wearable sensor readings to the backend.
 * Returns the full analysis (risk score, level, reasons, recommendations)
 * or null if the backend is unreachable (caller should fall back locally).
 */
export async function submitSensorData(
  noiseDb: number,
  lightLux: number,
  heartRate?: number,
): Promise<SensorDataAnalysisResponse | null> {
  return apiFetch<SensorDataAnalysisResponse>(
    `/sensor-data/?dev_user_id=${DEV_USER_ID}`,
    {
      method: 'POST',
      body: JSON.stringify({
        noise: noiseDb,
        // Backend doesn't have a 'light' field in SensorData schema,
        // so we map light to temperature as a proxy until schema is extended
        heart_rate: heartRate ?? null,
        timestamp: new Date().toISOString(),
      }),
    },
  );
}

/**
 * Retrieve the authenticated user's historical sensor readings.
 */
export async function getSensorHistory(
  userId: string = DEV_USER_ID,
  limit = 50,
): Promise<SensorDataResponse[]> {
  const res = await apiFetch<SensorDataResponse[]>(
    `/sensor-data/history?user_id=${userId}&limit=${limit}&sort_by=desc`,
  );
  return res ?? [];
}
