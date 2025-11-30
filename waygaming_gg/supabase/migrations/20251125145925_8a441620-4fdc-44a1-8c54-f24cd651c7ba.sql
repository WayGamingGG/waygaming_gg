-- Add player_user_id column to reference the actual player user
ALTER TABLE public.players 
ADD COLUMN player_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_players_player_user_id ON public.players(player_user_id);