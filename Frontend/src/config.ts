// ── AURA Backend Configuration ─────────────────────────────────────────────
<<<<<<< HEAD
// Update RENDER_BASE_URL to your live Render deployment URL before going to
// production.  The SUPABASE_* values match the backend's own .env so they
// share the same project.

import { Platform } from 'react-native';

export const LOCAL_BACKEND_URL = 'http://192.168.137.1:8000'; // Uses your PC's USB Tethering IP

export const API_BASE_URL = `${LOCAL_BACKEND_URL}/api/v1`;
=======
// Backend is deployed on Render — reachable from any device, anywhere.
// To run locally, swap API_BASE_URL to LOCAL_BACKEND_URL.

export const LOCAL_BACKEND_URL = 'http://192.168.137.1:8000'; // USB Tethering IP (dev only)
export const RENDER_BACKEND_URL = 'https://aura-backend-yit7.onrender.com';

// ✅ Always point to Render (production)
export const API_BASE_URL = `${RENDER_BACKEND_URL}/api/v1`;
>>>>>>> origin/srinath-dev

// Supabase project credentials (same project used by the backend)
export const SUPABASE_URL = 'https://juamgvxqcjrnfgzemoof.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1YW1ndnhxY2pybmZnemVtb29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MTY5MDksImV4cCI6MjEwMDE5MjkwOX0.ezguuvemW3AG5eHpQxzi4BOXH2FwM-WZaTtO4CpT8mA';

// How often (ms) to push sensor readings to the backend
export const SENSOR_PUSH_INTERVAL_MS = 30_000;
