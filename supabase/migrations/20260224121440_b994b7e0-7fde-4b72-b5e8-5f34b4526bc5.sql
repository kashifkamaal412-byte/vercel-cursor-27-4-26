CREATE POLICY "Only admins can insert alerts"
ON public.ai_alerts
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));