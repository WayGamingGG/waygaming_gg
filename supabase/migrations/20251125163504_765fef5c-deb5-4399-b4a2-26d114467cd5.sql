-- Create way_point_categories table
CREATE TABLE public.way_point_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  points_value INTEGER NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create way_point_assignments table
CREATE TABLE public.way_point_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.profiles(id),
  category_id UUID NOT NULL REFERENCES public.way_point_categories(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_points INTEGER NOT NULL,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.way_point_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.way_point_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for way_point_categories
CREATE POLICY "Everyone can view categories"
  ON public.way_point_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.way_point_categories
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for way_point_assignments
CREATE POLICY "Admins can manage assignments"
  ON public.way_point_assignments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Players can view their own assignments"
  ON public.way_point_assignments
  FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Coaches can view their team assignments"
  ON public.way_point_assignments
  FOR SELECT
  USING (
    has_role(auth.uid(), 'coach'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.players
      WHERE players.player_user_id = way_point_assignments.player_id
        AND players.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_way_point_assignments_player_month_year 
  ON public.way_point_assignments(player_id, year, month);

CREATE INDEX idx_way_point_assignments_month_year 
  ON public.way_point_assignments(year, month);

-- Trigger for updated_at on categories
CREATE TRIGGER update_way_point_categories_updated_at
  BEFORE UPDATE ON public.way_point_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();