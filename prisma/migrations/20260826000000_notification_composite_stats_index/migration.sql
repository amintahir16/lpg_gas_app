-- Speed up notification stats, unread count and urgent badge queries
CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_priority_createdAt_idx"
  ON "notifications"("userId", "isRead", "priority", "createdAt");
