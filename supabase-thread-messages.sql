CREATE TABLE thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE thread_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read approved messages"
  ON thread_messages FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Anyone can submit messages"
  ON thread_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "No public updates"
  ON thread_messages FOR UPDATE
  USING (false);

CREATE POLICY "No public deletes"
  ON thread_messages FOR DELETE
  USING (false);
