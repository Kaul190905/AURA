// ── AURA Backend Configuration ─────────────────────────────────────────────
// Update RENDER_BASE_URL to your live Render deployment URL before going to
// production.  The SUPABASE_* values match the backend's own .env so they
// share the same project.

import { Platform } from 'react-native';

export const BACKEND_URL = 'https://aura-backend-av7z.onrender.com';

export const API_BASE_URL = `${BACKEND_URL}/api/v1`;

// Supabase project credentials (same project used by the backend)
export const SUPABASE_URL = 'https://juamgvxqcjrnfgzemoof.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1YW1ndnhxY2pybmZnemVtb29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MTY5MDksImV4cCI6MjEwMDE5MjkwOX0.ezguuvemW3AG5eHpQxzi4BOXH2FwM-WZaTtO4CpT8mA';

// IMPORTANT: Replace this with your actual Web Client ID from Google Cloud Console
export const GOOGLE_WEB_CLIENT_ID = '1037564116836-6qdf3alsge95a69pivdjtkrdvaiotion.apps.googleusercontent.com';

// How often (ms) to push sensor readings to the backend
export const SENSOR_PUSH_INTERVAL_MS = 30_000;
