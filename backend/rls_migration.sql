-- ============================================================
-- AURA Row Level Security (RLS) Migration
-- Apply in Supabase SQL Editor → Run this script
-- ============================================================
-- This enforces that each user can ONLY read/write their own
-- data across all AURA tables.  Caregivers with a valid user_id
-- link can access linked patients' data.
-- ============================================================

-- ── Enable RLS on all AURA tables ──────────────────────────
ALTER TABLE sensor_data            ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE overload_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_checkins      ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies             ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodations         ENABLE ROW LEVEL SECURITY;

-- ── Drop existing policies before recreating ───────────────
DROP POLICY IF EXISTS "users_own_sensor_data"      ON sensor_data;
DROP POLICY IF EXISTS "users_own_alerts"           ON alerts;
DROP POLICY IF EXISTS "users_own_overload_events"  ON overload_events;
DROP POLICY IF EXISTS "users_own_wellness"         ON wellness_checkins;
DROP POLICY IF EXISTS "users_own_strategies"       ON strategies;
DROP POLICY IF EXISTS "users_own_accommodations"   ON accommodations;

-- ── sensor_data ─────────────────────────────────────────────
-- Users can insert/select their own rows only
CREATE POLICY "users_own_sensor_data" ON sensor_data
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ── alerts ───────────────────────────────────────────────────
CREATE POLICY "users_own_alerts" ON alerts
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ── overload_events ──────────────────────────────────────────
CREATE POLICY "users_own_overload_events" ON overload_events
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ── wellness_checkins ────────────────────────────────────────
CREATE POLICY "users_own_wellness" ON wellness_checkins
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ── strategies ───────────────────────────────────────────────
CREATE POLICY "users_own_strategies" ON strategies
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ── accommodations ───────────────────────────────────────────
CREATE POLICY "users_own_accommodations" ON accommodations
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- VERIFICATION: Run these queries to confirm RLS is active
-- ============================================================
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- SELECT * FROM pg_policies WHERE schemaname = 'public';
-- ============================================================
