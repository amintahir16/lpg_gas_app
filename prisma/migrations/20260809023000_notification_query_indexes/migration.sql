-- Speed up notification badge aggregates and recent-list ordering.

CREATE INDEX IF NOT EXISTS "notifications_userId_createdAt_idx"
  ON "notifications"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "notifications_isRead_priority_createdAt_idx"
  ON "notifications"("isRead", "priority", "createdAt");
