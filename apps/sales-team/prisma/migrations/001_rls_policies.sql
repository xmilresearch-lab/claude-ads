-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Analysis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own row
CREATE POLICY "user_self_access" ON "User"
  USING (id::text = auth.uid()::text);

-- Users can only access their own analyses
CREATE POLICY "analysis_owner_access" ON "Analysis"
  USING ("userId"::text = auth.uid()::text);

-- Public read for shared analyses
CREATE POLICY "analysis_public_shared" ON "Analysis"
  FOR SELECT USING (shared = true);

-- Users can only see their own subscription
CREATE POLICY "subscription_owner_access" ON "Subscription"
  USING ("userId"::text = auth.uid()::text);

-- Users can only see their own audit logs
CREATE POLICY "auditlog_owner_access" ON "AuditLog"
  USING ("userId"::text = auth.uid()::text);

-- Team members can see their team; owners have full access
CREATE POLICY "team_member_access" ON "Team"
  USING (
    "ownerId"::text = auth.uid()::text
    OR id IN (
      SELECT "teamId" FROM "User" WHERE id::text = auth.uid()::text AND "teamId" IS NOT NULL
    )
  );
