CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE (
  jobid bigint,
  jobname text,
  schedule text,
  active boolean,
  command text,
  nodename text,
  nodeport integer,
  database text,
  username text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron
AS $$
  SELECT j.jobid, j.jobname, j.schedule, j.active, j.command,
         j.nodename, j.nodeport, j.database, j.username
  FROM cron.job j
  ORDER BY j.jobname;
$$;

CREATE OR REPLACE FUNCTION public.toggle_cron_job(_jobid bigint, _active boolean)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron
AS $$
  UPDATE cron.job SET active = _active WHERE jobid = _jobid;
$$;