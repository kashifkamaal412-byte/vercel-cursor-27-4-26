
-- Make get_anonymized_analytics SECURITY DEFINER so it works without a SELECT policy
-- The function already checks v.user_id = auth.uid() internally and excludes viewer_id
CREATE OR REPLACE FUNCTION public.get_anonymized_analytics(p_video_id uuid)
 RETURNS TABLE(id uuid, video_id uuid, watch_hour integer, created_at timestamp with time zone, country text, region text, age_group text, gender text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    aa.id,
    aa.video_id,
    aa.watch_hour,
    aa.created_at,
    aa.country,
    aa.region,
    aa.age_group,
    aa.gender
  FROM public.audience_analytics aa
  INNER JOIN public.videos v ON v.id = aa.video_id
  WHERE aa.video_id = p_video_id
    AND v.user_id = auth.uid();
$function$;
