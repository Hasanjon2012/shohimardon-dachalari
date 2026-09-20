CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feedback: anyone insert"
ON public.feedback
FOR INSERT
WITH CHECK (
  length(trim(email)) BETWEEN 3 AND 255
  AND length(trim(message)) BETWEEN 1 AND 2000
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);

CREATE POLICY "Feedback: super read"
ON public.feedback
FOR SELECT
USING (has_role(auth.uid(), 'super_owner'::app_role));

CREATE POLICY "Feedback: super delete"
ON public.feedback
FOR DELETE
USING (has_role(auth.uid(), 'super_owner'::app_role));