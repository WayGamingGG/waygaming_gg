-- Add duration_months column to way_points_settings table
ALTER TABLE public.way_points_settings 
ADD COLUMN duration_months integer NOT NULL DEFAULT 4;