-- Add approval status to profiles
ALTER TABLE public.profiles ADD COLUMN approved BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN approved_by UUID REFERENCES auth.users(id);

-- Create events table for calendar
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_mandatory BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create event responses table (for players accepting/declining)
CREATE TABLE public.event_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('accepted', 'declined', 'pending')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for events
CREATE POLICY "Admins and coaches can create events"
ON public.events FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'coach'::app_role)
);

CREATE POLICY "Admins and coaches can update their events"
ON public.events FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'coach'::app_role) AND created_by = auth.uid())
);

CREATE POLICY "Admins and coaches can delete their events"
ON public.events FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'coach'::app_role) AND created_by = auth.uid())
);

CREATE POLICY "Everyone can view events"
ON public.events FOR SELECT
USING (true);

-- RLS policies for event responses
CREATE POLICY "Users can create their own responses"
ON public.event_responses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own responses"
ON public.event_responses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own responses"
ON public.event_responses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Event creators can view responses"
ON public.event_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_responses.event_id
    AND events.created_by = auth.uid()
  ) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_event_responses_updated_at
BEFORE UPDATE ON public.event_responses
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();