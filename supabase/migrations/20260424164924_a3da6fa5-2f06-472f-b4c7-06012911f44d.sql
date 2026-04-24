ALTER TABLE public.qr_codes
ADD COLUMN IF NOT EXISTS time_rules jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.qr_codes.time_rules IS 'Optional time-based redirect rules. Array of { start: "HH:mm", end: "HH:mm", url: string }. If current server time matches a rule, redirect to its URL instead of destination_url.';