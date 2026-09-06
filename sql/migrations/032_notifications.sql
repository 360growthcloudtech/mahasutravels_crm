-- Per-user CRM notifications (lead assignment alerts).

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'lead'
    CHECK (kind IN ('lead', 'booking', 'comment', 'trip')),
  title text NOT NULL,
  detail text NOT NULL DEFAULT '',
  href text NOT NULL DEFAULT '/leads',
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications (user_id)
  WHERE read_at IS NULL;
