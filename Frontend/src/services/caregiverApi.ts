import { API_BASE_URL } from '../config';
import { getAccessToken } from './supabaseClient';

export interface CaregiverBase {
  can_view_preferences: boolean;
  can_view_speech_diary: boolean;
}

export interface CaregiverInviteRequest {
  email: string;
}

export interface CaregiverUpdate {
  can_view_preferences?: boolean;
  can_view_speech_diary?: boolean;
}

export interface CaregiverResponse extends CaregiverBase {
  id: string;
  user_id: string;
  caregiver_id: string;
  status: 'pending' | 'active' | 'revoked';
  created_at: string;
  updated_at: string;
}

/**
 * Core auth wrapper (duplicated securely from api.ts to ensure standalone capability,
 * or imported if we refactor api.ts, but here it's fine).
 */
async function authFetch(endpoint: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.detail || `API Error: ${response.status} ${response.statusText}`,
    );
  }

  return response;
}

// ── User Managing Caregivers ─────────────────────────────────────────────────

export async function inviteCaregiver(
  email: string,
): Promise<CaregiverResponse> {
  const res = await authFetch('/caregivers/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function getUserCaregivers(): Promise<CaregiverResponse[]> {
  const res = await authFetch('/caregivers/');
  return res.json();
}

export async function updateCaregiverPermissions(
  assignmentId: string,
  update: CaregiverUpdate,
): Promise<CaregiverResponse> {
  const res = await authFetch(`/caregivers/${assignmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  });
  return res.json();
}

export async function revokeCaregiver(assignmentId: string): Promise<CaregiverResponse> {
  const res = await authFetch(`/caregivers/${assignmentId}`, {
    method: 'DELETE',
  });
  return res.json();
}

// ── Caregiver Actions ────────────────────────────────────────────────────────

export async function getAssignedUsers(): Promise<CaregiverResponse[]> {
  const res = await authFetch('/caregivers/assigned');
  return res.json();
}

export async function getPendingInvitations(): Promise<CaregiverResponse[]> {
  const res = await authFetch('/caregivers/pending');
  return res.json();
}

export async function acceptInvitation(assignmentId: string): Promise<CaregiverResponse> {
  const res = await authFetch(`/caregivers/${assignmentId}/accept`, {
    method: 'POST',
  });
  return res.json();
}

export async function rejectInvitation(assignmentId: string): Promise<void> {
  await authFetch(`/caregivers/${assignmentId}/reject`, {
    method: 'POST',
  });
}

// ── Caregiver Data Access ────────────────────────────────────────────────────

export async function getCaregiverUserSensorData(userId: string) {
  const res = await authFetch(`/caregivers/users/${userId}/sensor-data`);
  return res.json();
}

export async function getCaregiverUserAlerts(userId: string) {
  const res = await authFetch(`/caregivers/users/${userId}/alerts`);
  return res.json();
}

export async function getCaregiverUserWellness(userId: string) {
  const res = await authFetch(`/caregivers/users/${userId}/wellness`);
  return res.json();
}

export async function getCaregiverUserStrategies(userId: string) {
  const res = await authFetch(`/caregivers/users/${userId}/strategies`);
  return res.json();
}

export async function getCaregiverUserAccommodations(userId: string) {
  const res = await authFetch(`/caregivers/users/${userId}/accommodations`);
  return res.json();
}

export async function getCaregiverUserPreferences(userId: string) {
  const res = await authFetch(`/caregivers/users/${userId}/preferences`);
  return res.json();
}

// ── Real-Time IoT Data (WebSocket) ───────────────────────────────────────────

export function connectCaregiverIoTData(userId: string, onMessage: (data: any) => void): WebSocket {
  // Convert http/https to ws/wss
  const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + `/caregivers/ws/${userId}`;
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('Error parsing IoT websocket data', e);
    }
  };

  ws.onerror = (error) => {
    console.error('Caregiver IoT WebSocket error:', error);
  };

  return ws;
}
