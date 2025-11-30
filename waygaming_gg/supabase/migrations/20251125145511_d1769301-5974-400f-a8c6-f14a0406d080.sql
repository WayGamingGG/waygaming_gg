-- Allow coaches to view profiles of players
CREATE POLICY "Coaches can view player profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = profiles.id
      AND user_roles.role = 'player'::app_role
  )
  AND has_role(auth.uid(), 'coach'::app_role)
);