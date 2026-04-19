
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
  other_user UUID;
  msg_pref TEXT;
BEGIN
  -- Validate caller is a participant
  IF auth.uid() != user_one AND auth.uid() != user_two THEN
    RAISE EXCEPTION 'Unauthorized: cannot create conversation for other users';
  END IF;

  -- Determine the other user
  IF auth.uid() = user_one THEN
    other_user := user_two;
  ELSE
    other_user := user_one;
  END IF;

  -- Check if caller is blocked by the other user
  IF EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE blocker_id = other_user AND blocked_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Cannot create conversation with this user';
  END IF;

  -- Check if caller blocked the other user
  IF EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE blocker_id = auth.uid() AND blocked_id = other_user
  ) THEN
    RAISE EXCEPTION 'Cannot create conversation with this user';
  END IF;

  -- Check recipient's messaging privacy settings
  SELECT who_can_message INTO msg_pref
  FROM public.privacy_settings
  WHERE user_id = other_user;

  -- Default to 'everyone' if no settings exist
  msg_pref := COALESCE(msg_pref, 'everyone');

  IF msg_pref = 'nobody' THEN
    RAISE EXCEPTION 'User has disabled messaging';
  ELSIF msg_pref = 'fans' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.follows
      WHERE follower_id = auth.uid() AND following_id = other_user
    ) THEN
      RAISE EXCEPTION 'User only accepts messages from fans';
    END IF;
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
