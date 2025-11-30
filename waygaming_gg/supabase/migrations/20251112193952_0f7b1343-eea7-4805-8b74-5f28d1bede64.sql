-- Create players table for team management
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  nickname TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Top', 'Jungle', 'Mid', 'ADC', 'Support')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- RLS Policies for players
CREATE POLICY "Users can view their own players"
ON public.players FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own players"
ON public.players FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own players"
ON public.players FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own players"
ON public.players FOR DELETE
USING (auth.uid() = user_id);

-- Create matches table
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  match_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  opponent_team TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for matches
CREATE POLICY "Users can view their own matches"
ON public.matches FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own matches"
ON public.matches FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own matches"
ON public.matches FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own matches"
ON public.matches FOR DELETE
USING (auth.uid() = user_id);

-- Create player_match_stats table
CREATE TABLE public.player_match_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  champion_name TEXT NOT NULL,
  kills INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  cs INTEGER NOT NULL DEFAULT 0,
  damage INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(match_id, player_id)
);

-- Enable RLS
ALTER TABLE public.player_match_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_match_stats
CREATE POLICY "Users can view stats for their matches"
ON public.player_match_stats FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.matches
    WHERE matches.id = player_match_stats.match_id
    AND matches.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create stats for their matches"
ON public.player_match_stats FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.matches
    WHERE matches.id = player_match_stats.match_id
    AND matches.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update stats for their matches"
ON public.player_match_stats FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.matches
    WHERE matches.id = player_match_stats.match_id
    AND matches.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete stats for their matches"
ON public.player_match_stats FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.matches
    WHERE matches.id = player_match_stats.match_id
    AND matches.user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();