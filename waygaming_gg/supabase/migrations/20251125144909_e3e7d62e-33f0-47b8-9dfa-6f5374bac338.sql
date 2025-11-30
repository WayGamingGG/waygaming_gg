-- Allow coaches to view player roles (needed to list players when building team)
CREATE POLICY "Coaches can view player roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND role = 'player'::app_role
);