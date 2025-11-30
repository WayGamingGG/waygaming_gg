-- Create table for Way Points period settings
CREATE TABLE IF NOT EXISTS public.way_points_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  period_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.way_points_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage settings
CREATE POLICY "Admins can manage way points settings"
ON public.way_points_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Everyone can view settings
CREATE POLICY "Everyone can view way points settings"
ON public.way_points_settings
FOR SELECT
USING (true);

-- Add period_number to assignments table to track which period they belong to
ALTER TABLE public.way_point_assignments
ADD COLUMN IF NOT EXISTS period_number INTEGER DEFAULT 1;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_way_point_assignments_period
ON public.way_point_assignments(period_number);