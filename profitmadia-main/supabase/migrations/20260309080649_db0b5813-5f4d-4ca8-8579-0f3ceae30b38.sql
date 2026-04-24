
-- Create a trigger to prevent rerouting messages to different recipients/conversations
CREATE OR REPLACE FUNCTION public.prevent_message_reroute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.receiver_id IS DISTINCT FROM OLD.receiver_id THEN
    RAISE EXCEPTION 'Cannot change message receiver';
  END IF;
  IF NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN
    RAISE EXCEPTION 'Cannot change message conversation';
  END IF;
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id THEN
    RAISE EXCEPTION 'Cannot change message sender';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_message_reroute_trigger
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.prevent_message_reroute();
