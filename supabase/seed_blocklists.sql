-- Seed global blocklist with high-severity patterns
INSERT INTO public.global_blocklists (pattern, is_regex, severity, created_at)
VALUES
  ('kys', false, 'dangerous', NOW()),
  ('kill yourself', false, 'dangerous', NOW()),
  ('go kill yourself', false, 'dangerous', NOW()),
  ('i will kill you', false, 'dangerous', NOW());
