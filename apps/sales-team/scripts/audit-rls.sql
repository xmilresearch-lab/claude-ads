-- CHECK 5: RLS Coverage Audit
-- Run this in Supabase SQL Editor to verify Row Level Security is enabled.
-- Expected: rowsecurity = true for ALL tables.

SELECT
  schemaname,
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity THEN 'PASS' ELSE 'FAIL — missing RLS' END AS status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ── If any table shows FAIL, run the remediation below ───────────────────────

-- Enable RLS on any missing tables
ALTER TABLE IF EXISTS "User"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Analysis"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AuditLog"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Team"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Account"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Session"      ENABLE ROW LEVEL SECURITY;

-- ── Policies (from 001_rls_policies.sql) — re-run if missing ─────────────────

-- Users: can only read/update their own row
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='User' AND policyname='user_self_access') THEN
    CREATE POLICY "user_self_access" ON "User"
      USING (id::text = auth.uid()::text);
  END IF;
END $$;

-- Analyses: owner access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='Analysis' AND policyname='analysis_owner_access') THEN
    CREATE POLICY "analysis_owner_access" ON "Analysis"
      USING ("userId"::text = auth.uid()::text);
  END IF;
END $$;

-- Analyses: public read for shared
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='Analysis' AND policyname='analysis_public_shared') THEN
    CREATE POLICY "analysis_public_shared" ON "Analysis"
      FOR SELECT USING (shared = true);
  END IF;
END $$;

-- Subscriptions: owner only
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='Subscription' AND policyname='subscription_owner_access') THEN
    CREATE POLICY "subscription_owner_access" ON "Subscription"
      USING ("userId"::text = auth.uid()::text);
  END IF;
END $$;

-- AuditLog: owner only
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='AuditLog' AND policyname='auditlog_owner_access') THEN
    CREATE POLICY "auditlog_owner_access" ON "AuditLog"
      USING ("userId"::text = auth.uid()::text);
  END IF;
END $$;

-- Teams: owner and members access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='Team' AND policyname='team_member_access') THEN
    CREATE POLICY "team_member_access" ON "Team"
      USING (
        "ownerId"::text = auth.uid()::text
        OR EXISTS (
          SELECT 1 FROM "User" u WHERE u.id::text = auth.uid()::text AND u."teamId" = "Team".id
        )
      );
  END IF;
END $$;
