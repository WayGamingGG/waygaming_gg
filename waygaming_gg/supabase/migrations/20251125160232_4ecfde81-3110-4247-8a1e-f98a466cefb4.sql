-- Allow coaches to view evaluations where they are being evaluated
CREATE POLICY "Coaches can view evaluations about themselves"
ON public.evaluations
FOR SELECT
USING (auth.uid() = player_id AND has_role(auth.uid(), 'coach'::app_role));