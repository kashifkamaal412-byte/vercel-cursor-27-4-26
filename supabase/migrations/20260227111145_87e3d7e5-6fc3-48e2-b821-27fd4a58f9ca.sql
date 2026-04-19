CREATE OR REPLACE FUNCTION public.get_or_create_conversation(user_one uuid, user_two uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  conv_id UUID;
  p1 UUID;
  p2 UUID;
BEGIN
  -- Validate caller is a participant
  IF auth.uid() != user_one AND auth.uid() != user_two THEN
    RAISE EXCEPTION 'Unauthorized: cannot create conversation for other users';
  END IF;

  -- Order participants consistently
  IF user_one < user_two THEN
    p1 := user_one;
    p2 := user_two;
  ELSE
    p1 := user_two;
    p2 := user_one;
  END IF;
  
  -- Try to find existing conversation
  SELECT id INTO conv_id
  FROM conversations
  WHERE participant_one = p1 AND participant_two = p2;
  
  -- Create if not exists
  IF conv_id IS NULL THEN
    INSERT INTO conversations (participant_one, participant_two, initiated_by)
    VALUES (p1, p2, auth.uid())
    RETURNING id INTO conv_id;
  END IF;
  
  RETURN conv_id;
END;
$function$;