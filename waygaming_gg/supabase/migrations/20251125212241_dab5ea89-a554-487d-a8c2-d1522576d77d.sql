-- Create missions table
CREATE TABLE public.missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES auth.users(id),
  player_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Micro', 'Macro', 'Laning', 'TF', 'Rotação', 'Comportamental')),
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mission_responses table
CREATE TABLE public.mission_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'failed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  player_notes TEXT,
  match_data JSONB,
  screenshot_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mission_id, player_id)
);

-- Enable RLS
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for missions
CREATE POLICY "Coaches can create missions for their team"
  ON public.missions FOR INSERT
  WITH CHECK (
    auth.uid() = coach_id AND
    (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Coaches can view their missions"
  ON public.missions FOR SELECT
  USING (
    auth.uid() = coach_id OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Players can view their missions"
  ON public.missions FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Coaches can update their missions"
  ON public.missions FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their missions"
  ON public.missions FOR DELETE
  USING (auth.uid() = coach_id);

-- RLS Policies for mission_responses
CREATE POLICY "Players can create their responses"
  ON public.mission_responses FOR INSERT
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can view their responses"
  ON public.mission_responses FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Coaches can view responses to their missions"
  ON public.mission_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.missions
      WHERE missions.id = mission_responses.mission_id
      AND missions.coach_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Players can update their responses"
  ON public.mission_responses FOR UPDATE
  USING (auth.uid() = player_id);

-- Create trigger for updated_at
CREATE TRIGGER update_missions_updated_at
  BEFORE UPDATE ON public.missions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_mission_responses_updated_at
  BEFORE UPDATE ON public.mission_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for missions
ALTER PUBLICATION supabase_realtime ADD TABLE public.missions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mission_responses;