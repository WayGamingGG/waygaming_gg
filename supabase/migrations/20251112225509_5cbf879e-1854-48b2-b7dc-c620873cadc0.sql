-- Create team_compositions table
CREATE TABLE public.team_compositions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  top_champion TEXT NOT NULL,
  jungle_champion TEXT NOT NULL,
  mid_champion TEXT NOT NULL,
  adc_champion TEXT NOT NULL,
  support_champion TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.team_compositions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own compositions" 
ON public.team_compositions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own compositions" 
ON public.team_compositions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own compositions" 
ON public.team_compositions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own compositions" 
ON public.team_compositions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_team_compositions_updated_at
BEFORE UPDATE ON public.team_compositions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();