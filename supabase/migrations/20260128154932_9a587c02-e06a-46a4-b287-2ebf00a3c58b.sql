-- Add status column to conversations for chat request flow
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Add initiated_by column to track who started the conversation
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS initiated_by uuid;

-- Add message_count column to track messages sent before acceptance
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS request_message_count integer NOT NULL DEFAULT 0;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);

-- Update existing conversations to 'accepted' since they're already active
UPDATE public.conversations SET status = 'accepted' WHERE status = 'pending';

-- Add RLS policy for deleting conversations (for declining requests)
DROP POLICY IF EXISTS "Users can delete their conversations" ON public.conversations;
CREATE POLICY "Users can delete their conversations" 
ON public.conversations FOR DELETE 
USING (auth.uid() = participant_one OR auth.uid() = participant_two);