ALTER TABLE public.qr_codes
ADD COLUMN IF NOT EXISTS design jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.qr_codes.design IS 'Visual design config: fgColor, bgColor, frame (none|simple|rounded|label), shape (square|circle|smooth), pattern (classic|dots|lines), frameLabel.';