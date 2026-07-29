-- 0010_scheduled_jobs.sql
-- Setup pg_cron for scheduled notification and cleanup jobs

-- Enable pg_cron extension if not already enabled
create extension if not exists pg_cron;

-- Function to trigger deadline notifications for all orgs
create or replace function public.trigger_deadline_notifications()
returns void as $$
declare
  v_org_id uuid;
begin
  for v_org_id in select id from public.organisations loop
    perform public.queue_deadline_notifications_for_org(v_org_id);
  end loop;
end;
$$ language plpgsql;

-- Helper function: queue notifications for a specific org
create or replace function public.queue_deadline_notifications_for_org(org_id_param uuid)
returns table(queued int, skipped int) as $$
declare
  v_queued int := 0;
  v_skipped int := 0;
  deadline_item record;
  manager_email text;
  recent_notif_count int;
begin
  -- Find all overdue and due_soon items for this org
  for deadline_item in
    select
      ad.id,
      a.id as asset_id,
      a.name,
      d.id as discipline_id,
      d.name as discipline_name,
      ad.next_due_date,
      ad.last_inspection_at,
      case
        when ad.next_due_date < now() then 'overdue'
        else 'due_soon'
      end as status,
      case
        when ad.next_due_date < now() then (now()::date - ad.next_due_date::date)
        else (ad.next_due_date::date - now()::date)
      end as days_diff
    from public.asset_disciplines ad
    join public.assets a on a.id = ad.asset_id
    join public.disciplines d on d.id = ad.discipline_id
    where ad.org_id = org_id_param
      and (
        ad.next_due_date < now()  -- overdue
        or (ad.next_due_date between now() and now() + interval '7 days')  -- due soon (within 7 days)
      )
  loop
    -- Check if we already sent notification recently (within 24 hours)
    select count(*) into recent_notif_count
    from public.deadline_notifications
    where asset_discipline_id = deadline_item.id
      and notification_type = deadline_item.status
      and status = 'sent'
      and sent_at > now() - interval '24 hours';

    if recent_notif_count > 0 then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    -- Queue email for each manager/admin in org
    for manager_email in
      select users.email
      from public.memberships m
      join auth.users on users.id = m.user_id
      where m.org_id = org_id_param
        and m.role in ('owner', 'admin', 'manager')
    loop
      insert into public.email_queue (
        org_id,
        recipient_email,
        subject,
        body_html,
        entity_type,
        entity_id
      ) values (
        org_id_param,
        manager_email,
        case
          when deadline_item.status = 'overdue'
            then '⚠️ OVERDUE: ' || deadline_item.name || ' - ' || deadline_item.discipline_name
          else '📅 DUE SOON: ' || deadline_item.name || ' - ' || deadline_item.discipline_name
        end,
        '',  -- Body will be rendered by notification service
        case
          when deadline_item.status = 'overdue' then 'inspection_overdue'
          else 'inspection_due_soon'
        end,
        deadline_item.id
      );
    end loop;

    v_queued := v_queued + 1;
  end loop;

  return query select v_queued, v_skipped;
end;
$$ language plpgsql;

-- Schedule deadline notifications job: every day at 9 AM (UTC)
-- Note: pg_cron timezone is based on database timezone
-- Adjust the time based on your timezone (e.g., '09:00' for 9 AM)
select cron.schedule(
  'send-deadline-notifications',
  '0 9 * * *',  -- Every day at 9:00 AM
  'select public.trigger_deadline_notifications()'
);

-- Schedule email queue cleanup: every day at 2 AM (UTC)
-- Deletes emails that were processed more than 7 days ago
select cron.schedule(
  'cleanup-email-queue',
  '0 2 * * *',  -- Every day at 2:00 AM
  'delete from public.email_queue where status in (''sent'', ''failed'') and processed_at < now() - interval ''7 days'''
);

-- Schedule audit log cleanup: every Sunday at 3 AM (UTC)
-- Deletes logs older than retention policy allows
select cron.schedule(
  'cleanup-audit-logs',
  '0 3 * * 0',  -- Every Sunday at 3:00 AM
  'select public.purge_old_audit_logs()'
);

-- Schedule report cleanup: every day at 4 AM (UTC)
-- Deletes reports past their expiration date
select cron.schedule(
  'cleanup-expired-reports',
  '0 4 * * *',  -- Every day at 4:00 AM
  'delete from public.reports where expires_at < now() and status = ''generated'''
);

-- View to check scheduled jobs
create or replace view public.scheduled_jobs_status as
select
  jobname,
  schedule,
  command,
  active
from cron.job
where database = current_database()
order by jobname;
