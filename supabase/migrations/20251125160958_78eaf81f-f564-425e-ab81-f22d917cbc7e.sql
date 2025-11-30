-- Add parent_message_id column to messages table for threading
ALTER TABLE public.messages ADD COLUMN parent_message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE;

-- Create index for better performance when querying threads
CREATE INDEX idx_messages_parent_id ON public.messages(parent_message_id);