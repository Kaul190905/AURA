// ── AURA API Service Layer ─────────────────────────────────────────────────────
// All backend calls go through this file.  Every function uses authFetch()
// which automatically attaches the current Supabase JWT.

import { API_BASE_URL } from '../config';
import { getAccessToken } from './supabaseClient';

// ── Types mirroring backend Pydantic schemas ───────────────────────────────────

export interface SensorDataCreate {
  user_id: string;
  timestamp?: string; // ISO-8601; backend defaults to now()
  heart_rate?: number | null;
  blood_oxygen?: number | null;
  temperature?: number | null; // °F
  noise?: number | null; // dB
  latitude?: number | null;
  longitude?: number | null;
}

export interface SensorDataResponse extends SensorDataCreate {
  id: string;
  created_at: string;
}

export interface SensorDataAnalysisResponse {
  sensor_data: SensorDataResponse;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  risk_factors: { label: string; weight: number }[];
}

export interface AlertCreate {
  user_id: string;
  sensor_data_id?: string | null;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface AlertFeedback {
  confirmed: boolean;
  notes?: string;
}

export interface AlertResponse {
  id: string;
  user_id: string;
  sensor_data_id?: string | null;
  severity: string;
  message: string;
  confirmed?: boolean | null;
  notes?: string | null;
  created_at: string;
}

export interface OverloadEventCreate {
  user_id: string;
  trigger_metric: string; // e.g. 'noise', 'temp', 'self'
  trigger_value: number;
  duration_seconds: number;
}

export interface OverloadEventResponse extends OverloadEventCreate {
  id: string;
  created_at: string;
}

export interface RecommendationItem {
  title: string;
  description: string;
}

export interface PersonalizedRecommendationResponse {
  user_id: string;
  recommendations: RecommendationItem[];
  generated_at: string;
}

export interface AnomalyDetectionResponse {
  user_id: string;
  anomalies: {
    timestamp: string;
    metric: string;
    value: number;
    z_score: number;
  }[];
  analyzed_at: string;
}

export interface BehavioralPatternResponse {
  user_id: string;
  patterns: {
    label: string;
    description: string;
    confidence: number;
  }[];
  analyzed_at: string;
}

export interface OverloadForecastResponse {
  user_id: string;
  overload_probability: number;
  risk_trajectory: 'stable' | 'rising' | 'falling';
  forecast_horizon_minutes: number;
}

export interface WellnessCheckinCreate {
  mood_score: number; // 0-100
  notes?: string;
}

export interface WellnessCheckinResponse extends WellnessCheckinCreate {
  id: string;
  user_id: string;
  created_at: string;
}

export interface WellnessScoreResponse {
  user_id: string;
  wellness_score: number;
  label: string;
  computed_at: string;
}

export interface RiskTrendResponse {
  user_id: string;
  days: number;
  trend: {
    date: string;
    avg_risk_score: number;
    risk_level: string;
  }[];
}

// ── Auth fetch helper ─────────────────────────────────────────────────────────

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API ${init.method ?? 'GET'} ${path} → ${response.status}: ${text}`);
  }
  return response;
}

// ── Sensor Data ───────────────────────────────────────────────────────────────

/**
 * POST /sensor-data/
 * Submit a new sensor reading and get back the risk analysis.
 */
export async function submitSensorData(
  data: SensorDataCreate,
): Promise<SensorDataAnalysisResponse> {
  const res = await authFetch('/sensor-data/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * GET /sensor-data/
 * Fetch historical sensor readings for a user.
 */
export async function getSensorHistory(
  userId: string,
  limit = 100,
): Promise<SensorDataResponse[]> {
  // Backend route: GET /sensor-data/history?user_id=...&limit=...
  const res = await authFetch(`/sensor-data/history?user_id=${userId}&limit=${limit}&sort_by=desc`);
  return res.json();
}

// ── Alerts ────────────────────────────────────────────────────────────────────

/**
 * POST /alerts/
 * Create a new alert event.
 */
export async function createAlert(data: AlertCreate): Promise<AlertResponse> {
  const res = await authFetch('/alerts/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * GET /alerts/
 * Fetch alerts for a given user (optionally filtered by severity).
 */
export async function getAlerts(
  userId: string,
  severity?: string,
): Promise<AlertResponse[]> {
  const params = new URLSearchParams({ user_id: userId });
  if (severity) params.append('severity', severity);
  const res = await authFetch(`/alerts/?${params.toString()}`);
  return res.json();
}

/**
 * POST /alerts/{id}/feedback
 * Confirm or dismiss an alert.
 */
export async function confirmAlert(
  alertId: string,
  feedback: AlertFeedback,
): Promise<AlertResponse> {
  // Backend route: PATCH /alerts/{alert_id}/feedback
  const res = await authFetch(`/alerts/${alertId}/feedback`, {
    method: 'PATCH',
    body: JSON.stringify(feedback),
  });
  return res.json();
}

// ── Overload Events ───────────────────────────────────────────────────────────

/**
 * POST /overload-events/
 * Log a confirmed overload (crisis) event.
 */
export async function logOverloadEvent(
  data: OverloadEventCreate,
): Promise<OverloadEventResponse> {
  const res = await authFetch('/overload-events/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * GET /overload-events/
 * Fetch overload event history for a user.
 */
export async function getOverloadEvents(
  userId: string,
): Promise<OverloadEventResponse[]> {
  const res = await authFetch(`/overload-events/?user_id=${userId}`);
  return res.json();
}

// ── Recommendations ───────────────────────────────────────────────────────────

/**
 * GET /recommendations/{user_id}
 * Fetch AI-powered personalized coping strategy recommendations.
 */
export async function getRecommendations(
  userId: string,
): Promise<PersonalizedRecommendationResponse> {
  const res = await authFetch(`/recommendations/${userId}`);
  return res.json();
}

// ── Patterns ──────────────────────────────────────────────────────────────────

/**
 * GET /patterns/anomalies?user_id=...
 * Detect statistical anomalies in recent sensor data.
 */
export async function getAnomalies(
  userId: string,
  limit = 50,
): Promise<AnomalyDetectionResponse> {
  const res = await authFetch(`/patterns/anomalies?user_id=${userId}&limit=${limit}`);
  return res.json();
}

/**
 * GET /patterns/behavioral?user_id=...
 * Get ML-detected behavioral patterns.
 */
export async function getBehavioralPatterns(
  userId: string,
): Promise<BehavioralPatternResponse> {
  const res = await authFetch(`/patterns/behavioral?user_id=${userId}`);
  return res.json();
}

// ── Prediction ────────────────────────────────────────────────────────────────

/**
 * GET /prediction/overload-forecast?user_id=...
 * ML forecast: probability of a sensory overload in the near future.
 */
export async function getOverloadForecast(
  userId: string,
  window = 10,
): Promise<OverloadForecastResponse> {
  const res = await authFetch(
    `/prediction/overload-forecast?user_id=${userId}&window=${window}`,
  );
  return res.json();
}

// ── Risk Trend ────────────────────────────────────────────────────────────────

/**
 * GET /risk/trend?user_id=...
 * Retrieve per-day risk trend over N days.
 */
export async function getRiskTrend(
  userId: string,
  days = 7,
): Promise<RiskTrendResponse> {
  const res = await authFetch(`/risk/trend?user_id=${userId}&days=${days}`);
  return res.json();
}

// ── Wellness ──────────────────────────────────────────────────────────────────

/**
 * POST /wellness/{user_id}/checkins
 * Submit a self-reported wellness check-in (mood_score 0-100).
 */
export async function submitWellnessCheckin(
  userId: string,
  data: WellnessCheckinCreate,
): Promise<WellnessCheckinResponse> {
  const res = await authFetch(`/wellness/${userId}/checkins`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * GET /wellness/{user_id}/score
 * Get the computed wellness score for a user.
 */
export async function getWellnessScore(userId: string): Promise<WellnessScoreResponse> {
  const res = await authFetch(`/wellness/${userId}/score`);
  return res.json();
}

// ── AURA API Service Layer ─────────────────────────────────────────────────────
// All backend calls go through this file.  Every function uses authFetch()
// which automatically attaches the current Supabase JWT.

import { API_BASE_URL } from '../config';
import { getAccessToken } from './supabaseClient';

// ── Types mirroring backend Pydantic schemas ───────────────────────────────────

export interface SensorDataCreate {
  user_id: string;
  timestamp?: string; // ISO-8601; backend defaults to now()
  heart_rate?: number | null;
  blood_oxygen?: number | null;
  temperature?: number | null; // °F
  noise?: number | null; // dB
  latitude?: number | null;
  longitude?: number | null;
}

export interface SensorDataResponse extends SensorDataCreate {
  id: string;
  created_at: string;
}

export interface SensorDataAnalysisResponse {
  sensor_data: SensorDataResponse;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  risk_factors: { label: string; weight: number }[];
}

export interface AlertCreate {
  user_id: string;
  sensor_data_id?: string | null;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface AlertFeedback {
  confirmed: boolean;
  notes?: string;
}

export interface AlertResponse {
  id: string;
  user_id: string;
  sensor_data_id?: string | null;
  severity: string;
  message: string;
  confirmed?: boolean | null;
  notes?: string | null;
  created_at: string;
}

export interface OverloadEventCreate {
  user_id: string;
  trigger_metric: string; // e.g. 'noise', 'temp', 'self'
  trigger_value: number;
  duration_seconds: number;
}

export interface OverloadEventResponse extends OverloadEventCreate {
  id: string;
  created_at: string;
}

export interface RecommendationItem {
  title: string;
  description: string;
}

export interface PersonalizedRecommendationResponse {
  user_id: string;
  recommendations: RecommendationItem[];
  generated_at: string;
}

export interface AnomalyDetectionResponse {
  user_id: string;
  anomalies: {
    timestamp: string;
    metric: string;
    value: number;
    z_score: number;
  }[];
  analyzed_at: string;
}

export interface BehavioralPatternResponse {
  user_id: string;
  patterns: {
    label: string;
    description: string;
    confidence: number;
  }[];
  analyzed_at: string;
}

export interface OverloadForecastResponse {
  user_id: string;
  overload_probability: number;
  risk_trajectory: 'stable' | 'rising' | 'falling';
  forecast_horizon_minutes: number;
}

export interface WellnessCheckinCreate {
  mood_score: number; // 0-100
  notes?: string;
}

export interface WellnessCheckinResponse extends WellnessCheckinCreate {
  id: string;
  user_id: string;
  created_at: string;
}

export interface WellnessScoreResponse {
  user_id: string;
  wellness_score: number;
  label: string;
  computed_at: string;
}

export interface RiskTrendResponse {
  user_id: string;
  days: number;
  trend: {
    date: string;
    avg_risk_score: number;
    risk_level: string;
  }[];
}

// ── Auth fetch helper ─────────────────────────────────────────────────────────

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API ${init.method ?? 'GET'} ${path} → ${response.status}: ${text}`);
  }
  return response;
}

// ── Sensor Data ───────────────────────────────────────────────────────────────

/**
 * POST /sensor-data/
 * Submit a new sensor reading and get back the risk analysis.
 */
export async function submitSensorData(
  data: SensorDataCreate,
): Promise<SensorDataAnalysisResponse> {
  const res = await authFetch('/sensor-data/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * GET /sensor-data/
 * Fetch historical sensor readings for a user.
 */
export async function getSensorHistory(
  userId: string,
  limit = 100,
): Promise<SensorDataResponse[]> {
  const res = await authFetch(`/sensor-data/?user_id=${userId}&limit=${limit}`);
  return res.json();
}

// ── Alerts ────────────────────────────────────────────────────────────────────

/**
 * POST /alerts/
 * Create a new alert event.
 */
export async function createAlert(data: AlertCreate): Promise<AlertResponse> {
  const res = await authFetch('/alerts/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * GET /alerts/
 * Fetch alerts for a given user (optionally filtered by severity).
 */
export async function getAlerts(
  userId: string,
  severity?: string,
): Promise<AlertResponse[]> {
  const params = new URLSearchParams({ user_id: userId });
  if (severity) params.append('severity', severity);
  const res = await authFetch(`/alerts/?${params.toString()}`);
  return res.json();
}

/**
 * POST /alerts/{id}/feedback
 * Confirm or dismiss an alert.
 */
export async function confirmAlert(
  alertId: string,
  feedback: AlertFeedback,
): Promise<AlertResponse> {
  const res = await authFetch(`/alerts/${alertId}/feedback`, {
    method: 'POST',
    body: JSON.stringify(feedback),
  });
  return res.json();
}

// ── Overload Events ───────────────────────────────────────────────────────────

/**
 * POST /overload-events/
 * Log a confirmed overload (crisis) event.
 */
export async function logOverloadEvent(
  data: OverloadEventCreate,
): Promise<OverloadEventResponse> {
  const res = await authFetch('/overload-events/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * GET /overload-events/
 * Fetch overload event history for a user.
 */
export async function getOverloadEvents(
  userId: string,
): Promise<OverloadEventResponse[]> {
  const res = await authFetch(`/overload-events/?user_id=${userId}`);
  return res.json();
}

// ── Recommendations ───────────────────────────────────────────────────────────

/**
 * GET /recommendations/{user_id}
 * Fetch AI-powered personalized coping strategy recommendations.
 */
export async function getRecommendations(
  userId: string,
): Promise<PersonalizedRecommendationResponse> {
  const res = await authFetch(`/recommendations/${userId}`);
  return res.json();
}

// ── Patterns ──────────────────────────────────────────────────────────────────

/**
 * GET /patterns/anomalies?user_id=...
 * Detect statistical anomalies in recent sensor data.
 */
export async function getAnomalies(
  userId: string,
  limit = 50,
): Promise<AnomalyDetectionResponse> {
  const res = await authFetch(`/patterns/anomalies?user_id=${userId}&limit=${limit}`);
  return res.json();
}

/**
 * GET /patterns/behavioral?user_id=...
 * Get ML-detected behavioral patterns.
 */
export async function getBehavioralPatterns(
  userId: string,
): Promise<BehavioralPatternResponse> {
  const res = await authFetch(`/patterns/behavioral?user_id=${userId}`);
  return res.json();
}

// ── Prediction ────────────────────────────────────────────────────────────────

/**
 * GET /prediction/overload-forecast?user_id=...
 * ML forecast: probability of a sensory overload in the near future.
 */
export async function getOverloadForecast(
  userId: string,
  window = 10,
): Promise<OverloadForecastResponse> {
  const res = await authFetch(
    `/prediction/overload-forecast?user_id=${userId}&window=${window}`,
  );
  return res.json();
}

// ── Risk Trend ────────────────────────────────────────────────────────────────

/**
 * GET /risk/trend?user_id=...
 * Retrieve per-day risk trend over N days.
 */
export async function getRiskTrend(
  userId: string,
  days = 7,
): Promise<RiskTrendResponse> {
  const res = await authFetch(`/risk/trend?user_id=${userId}&days=${days}`);
  return res.json();
}

// ── Wellness ──────────────────────────────────────────────────────────────────

/**
 * POST /wellness/{user_id}/checkins
 * Submit a self-reported wellness check-in (mood_score 0-100).
 */
export async function submitWellnessCheckin(
  userId: string,
  data: WellnessCheckinCreate,
): Promise<WellnessCheckinResponse> {
  const res = await authFetch(`/wellness/${userId}/checkins`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * GET /wellness/{user_id}/score
 * Get the computed wellness score for a user.
 */
export async function getWellnessScore(userId: string): Promise<WellnessScoreResponse> {
  const res = await authFetch(`/wellness/${userId}/score`);
  return res.json();
}
