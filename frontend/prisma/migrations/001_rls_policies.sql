-- Row-Level Security policies for Supabase
-- Run this script against your Supabase/PostgreSQL database after running migrations.
-- auth.uid() is provided by Supabase's GoTrue JWT integration.

-- ── Enable RLS on all user-data tables ──────────────────────────────────────────

ALTER TABLE "User"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Analysis"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Team"         ENABLE ROW LEVEL SECURITY;

-- ── User ────────────────────────────────────────────────────────────────────────

-- Users may read and write only their own row.
CREATE POLICY "users_select_own" ON "User"
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "users_insert_own" ON "User"
  FOR INSERT WITH CHECK (auth.uid()::text = id);

CREATE POLICY "users_update_own" ON "User"
  FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "users_delete_own" ON "User"
  FOR DELETE USING (auth.uid()::text = id);

-- ── Analysis ────────────────────────────────────────────────────────────────────

-- Users may read and write only their own Analysis rows.
CREATE POLICY "analysis_select_own" ON "Analysis"
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "analysis_insert_own" ON "Analysis"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "analysis_update_own" ON "Analysis"
  FOR UPDATE USING (auth.uid()::text = "userId");

CREATE POLICY "analysis_delete_own" ON "Analysis"
  FOR DELETE USING (auth.uid()::text = "userId");

-- Public (unauthenticated) users may read shared analyses (for share pages).
CREATE POLICY "analysis_select_shared_public" ON "Analysis"
  FOR SELECT USING (shared = true);

-- ── Subscription ────────────────────────────────────────────────────────────────

-- Users may read and write only their own Subscription row.
CREATE POLICY "subscription_select_own" ON "Subscription"
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "subscription_insert_own" ON "Subscription"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "subscription_update_own" ON "Subscription"
  FOR UPDATE USING (auth.uid()::text = "userId");

CREATE POLICY "subscription_delete_own" ON "Subscription"
  FOR DELETE USING (auth.uid()::text = "userId");

-- ── AuditLog ────────────────────────────────────────────────────────────────────

-- Users may read and write only AuditLog rows where userId matches.
CREATE POLICY "auditlog_select_own" ON "AuditLog"
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "auditlog_insert_own" ON "AuditLog"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "auditlog_update_own" ON "AuditLog"
  FOR UPDATE USING (auth.uid()::text = "userId");

CREATE POLICY "auditlog_delete_own" ON "AuditLog"
  FOR DELETE USING (auth.uid()::text = "userId");

-- ── Team ────────────────────────────────────────────────────────────────────────

-- Team owners may manage their own team row.
CREATE POLICY "team_owner_all" ON "Team"
  FOR ALL USING (auth.uid()::text = "ownerId");

-- Team members may read the team row they belong to.
-- (Handled via application-layer join on User.teamId.)
