-- Create table for monthly evaluation summaries
CREATE TABLE public.monthly_evaluation_summary (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  average_score numeric(4,2),
  total_evaluations integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(player_id, month, year)
);

-- Create table for evolution evaluation categories
CREATE TABLE public.evolution_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(name)
);

-- Create table for evolution evaluations (monthly with multiple categories)
CREATE TABLE public.evolution_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid NOT NULL,
  evaluator_id uuid NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  category_scores jsonb NOT NULL, -- Store category scores as {category_id: score}
  average_score numeric(4,2),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.monthly_evaluation_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for monthly_evaluation_summary
CREATE POLICY "Players can view their own monthly summaries"
ON public.monthly_evaluation_summary
FOR SELECT
USING (auth.uid() = player_id);

CREATE POLICY "Admins can view all monthly summaries"
ON public.monthly_evaluation_summary
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches can view player monthly summaries"
ON public.monthly_evaluation_summary
FOR SELECT
USING (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for evolution_categories
CREATE POLICY "Everyone can view evolution categories"
ON public.evolution_categories
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage evolution categories"
ON public.evolution_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for evolution_evaluations
CREATE POLICY "Players can view their own evolution evaluations"
ON public.evolution_evaluations
FOR SELECT
USING (auth.uid() = player_id);

CREATE POLICY "Evaluators can view their evolution evaluations"
ON public.evolution_evaluations
FOR SELECT
USING (auth.uid() = evaluator_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches and admins can create evolution evaluations"
ON public.evolution_evaluations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Evaluators can update their own evolution evaluations"
ON public.evolution_evaluations
FOR UPDATE
USING (auth.uid() = evaluator_id);

-- Create trigger for updated_at
CREATE TRIGGER update_monthly_evaluation_summary_updated_at
BEFORE UPDATE ON public.monthly_evaluation_summary
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_evolution_evaluations_updated_at
BEFORE UPDATE ON public.evolution_evaluations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert default evolution categories
INSERT INTO public.evolution_categories (name, description) VALUES
('Mecânica', 'Habilidade mecânica e execução técnica'),
('Tomada de Decisão', 'Capacidade de tomar decisões estratégicas'),
('Comunicação', 'Comunicação com o time'),
('Posicionamento', 'Posicionamento no mapa e em teamfights'),
('Visão de Jogo', 'Consciência de mapa e objetivos');

-- Create function to update monthly summary
CREATE OR REPLACE FUNCTION public.update_monthly_evaluation_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month integer;
  current_year integer;
  avg_score numeric(4,2);
  eval_count integer;
BEGIN
  -- Get current month and year from the evaluation
  current_month := EXTRACT(MONTH FROM NEW.created_at);
  current_year := EXTRACT(YEAR FROM NEW.created_at);
  
  -- Calculate average score for the player in this month
  SELECT 
    COALESCE(AVG(score), 0),
    COUNT(*)
  INTO avg_score, eval_count
  FROM public.evaluations
  WHERE player_id = NEW.player_id
    AND EXTRACT(MONTH FROM created_at) = current_month
    AND EXTRACT(YEAR FROM created_at) = current_year
    AND score IS NOT NULL;
  
  -- Insert or update the monthly summary
  INSERT INTO public.monthly_evaluation_summary (player_id, month, year, average_score, total_evaluations)
  VALUES (NEW.player_id, current_month, current_year, avg_score, eval_count)
  ON CONFLICT (player_id, month, year) 
  DO UPDATE SET 
    average_score = avg_score,
    total_evaluations = eval_count,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update monthly summary when evaluation is added
CREATE TRIGGER update_monthly_summary_on_evaluation
AFTER INSERT OR UPDATE ON public.evaluations
FOR EACH ROW
WHEN (NEW.score IS NOT NULL)
EXECUTE FUNCTION public.update_monthly_evaluation_summary();