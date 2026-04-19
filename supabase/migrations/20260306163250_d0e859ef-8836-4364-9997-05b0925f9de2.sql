CREATE OR REPLACE FUNCTION public.check_rate_limit(_user_id uuid, _action_type text, _max_actions integer, _window_minutes integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE current_count integer; window_time timestamptz;
BEGIN
  -- Validate caller identity: only allow checking own rate limits
  -- Exception: SECURITY DEFINER triggers call this internally, so allow when auth.uid() is NULL (trigger context)
  IF auth.uid() IS NOT NULL AND _user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: cannot check rate limits for other users';
  END IF;

  -- Validate input bounds
  IF _max_actions < 1 OR _max_actions > 1000 THEN
    RAISE EXCEPTION 'Invalid _max_actions: must be between 1 and 1000';
  END IF;
  IF _window_minutes < 1 OR _window_minutes > 1440 THEN
    RAISE EXCEPTION 'Invalid _window_minutes: must be between 1 and 1440';
  END IF;
  IF length(_action_type) > 50 THEN
    RAISE EXCEPTION 'Invalid _action_type: must be 50 characters or fewer';
  END IF;

  SELECT action_count, window_start INTO current_count, window_time FROM rate_limits WHERE user_id = _user_id AND action_type = _action_type;
  IF current_count IS NULL THEN
    INSERT INTO rate_limits (user_id, action_type, action_count, window_start) VALUES (_user_id, _action_type, 1, now()) ON CONFLICT (user_id, action_type) DO UPDATE SET action_count = 1, window_start = now();
    RETURN true;
  END IF;
  IF now() - window_time > (_window_minutes || ' minutes')::interval THEN
    UPDATE rate_limits SET action_count = 1, window_start = now() WHERE user_id = _user_id AND action_type = _action_type;
    RETURN true;
  END IF;
  IF current_count >= _max_actions THEN RETURN false; END IF;
  UPDATE rate_limits SET action_count = action_count + 1 WHERE user_id = _user_id AND action_type = _action_type;
  RETURN true;
END;
$function$;