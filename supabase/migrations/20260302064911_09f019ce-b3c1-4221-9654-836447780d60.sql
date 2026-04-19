-- 1. Add INSERT policy for admins on ai_alerts
CREATE POLICY "Only admins can create alerts"
ON public.ai_alerts FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Add input validation to check_rate_limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit(_user_id uuid, _action_type text, _max_actions integer, _window_minutes integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_count integer;
  window_time timestamp with time zone;
BEGIN
  -- Input validation
  IF _max_actions <= 0 OR _max_actions > 1000 THEN
    RAISE EXCEPTION 'Invalid max_actions: must be 1-1000';
  END IF;
  IF _window_minutes <= 0 OR _window_minutes > 1440 THEN
    RAISE EXCEPTION 'Invalid window_minutes: must be 1-1440';
  END IF;
  IF LENGTH(_action_type) > 50 THEN
    RAISE EXCEPTION 'Invalid action_type length';
  END IF;

  -- Get current count and window start
  SELECT action_count, window_start INTO current_count, window_time
  FROM rate_limits
  WHERE user_id = _user_id AND action_type = _action_type;
  
  -- No record exists, create one and allow
  IF current_count IS NULL THEN
    INSERT INTO rate_limits (user_id, action_type, action_count, window_start)
    VALUES (_user_id, _action_type, 1, now())
    ON CONFLICT (user_id, action_type) 
    DO UPDATE SET action_count = 1, window_start = now();
    RETURN true;
  END IF;
  
  -- Window expired, reset and allow
  IF now() - window_time > (_window_minutes || ' minutes')::interval THEN
    UPDATE rate_limits
    SET action_count = 1, window_start = now()
    WHERE user_id = _user_id AND action_type = _action_type;
    RETURN true;
  END IF;
  
  -- Check if limit exceeded
  IF current_count >= _max_actions THEN
    RETURN false;
  END IF;
  
  -- Increment count and allow
  UPDATE rate_limits
  SET action_count = action_count + 1
  WHERE user_id = _user_id AND action_type = _action_type;
  
  RETURN true;
END;
$function$;