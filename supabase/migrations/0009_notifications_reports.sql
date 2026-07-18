-- 0009_notifications_reports.sql
-- Notification preferences, deadline tracking, and report management

-- Create notification_preferences table
create table if not exists public.notification_preferences (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  notify_overdue boolean default true,
  notify_due_soon boolean default true,
  notify_on_finding boolean default true,
  days_before_due integer default 7 check (days_before_due > 0),
  email_frequency text default 'immediate', -- 'immediate', 'daily', 'weekly'
  quiet_hours_start time, -- Optional: don't send emails before this time
  quiet_hours_end time,   -- Optional: don't send emails after this time
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  constraint valid_frequency check (email_frequency in ('immediate', 'daily', 'weekly')),
  constraint unique_pref per user per org
    unique(org_id, user_id)
);

create index if not exists idx_notification_prefs_org_user on public.notification_preferences(org_id, user_id);

alter table public.notification_preferences enable row level security;

create policy "Users manage their own notification preferences"
  on public.notification_preferences for all
  using (auth.uid() = user_id);

-- Create deadline_notifications table (sent notification tracking)
create table if not exists public.deadline_notifications (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  asset_discipline_id uuid not null references public.asset_disciplines(id) on delete cascade,
  notification_type text not null, -- 'overdue', 'due_soon', 'finding_created'
  recipient_email text not null,
  recipient_user_id uuid references auth.users(id) on delete set null,
  sent_at timestamp with time zone default now(),
  status text default 'pending', -- 'pending', 'sent', 'failed', 'bounced'
  error_message text,
  metadata jsonb default '{}', -- Additional context

  constraint valid_notification_type check (notification_type in ('overdue', 'due_soon', 'finding_created'))
);

create index if not exists idx_deadline_notifs_org on public.deadline_notifications(org_id);
create index if not exists idx_deadline_notifs_asset_discipline on public.deadline_notifications(asset_discipline_id);
create index if not exists idx_deadline_notifs_sent_at on public.deadline_notifications(sent_at desc);
create index if not exists idx_deadline_notifs_status on public.deadline_notifications(status);

alter table public.deadline_notifications enable row level security;

create policy "Managers can read notification history for their org"
  on public.deadline_notifications for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.org_id = deadline_notifications.org_id
        and om.user_id = auth.uid()
        and om.role in ('manager', 'admin')
    )
  );

-- Create email_queue table (transient queue for batch processing)
create table if not exists public.email_queue (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  recipient_email text not null,
  subject text not null,
  body_html text not null,
  entity_type text, -- 'inspection_overdue', 'inspection_due_soon', 'finding_created', 'report_ready'
  entity_id uuid,
  created_at timestamp with time zone default now(),
  processed_at timestamp with time zone,
  status text default 'pending', -- 'pending', 'processing', 'sent', 'failed'
  retry_count integer default 0,
  error_message text,

  constraint valid_entity_type check (entity_type in ('inspection_overdue', 'inspection_due_soon', 'finding_created', 'report_ready'))
);

create index if not exists idx_email_queue_org on public.email_queue(org_id);
create index if not exists idx_email_queue_status on public.email_queue(status);
create index if not exists idx_email_queue_created_at on public.email_queue(created_at);

-- Add TTL trigger to auto-delete processed emails after 7 days
create or replace function public.cleanup_old_emails()
returns void as $$
begin
  delete from public.email_queue
  where status in ('sent', 'failed')
    and processed_at < now() - interval '7 days';
end;
$$ language plpgsql;

-- Create reports table
create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  report_type text not null, -- 'compliance_summary', 'findings_by_discipline', 'asset_audit', 'deadline_report'
  title text not null,
  description text,
  filters jsonb default '{}', -- {discipline, dateRange, status, assetId, etc.}
  status text default 'pending', -- 'pending', 'generating', 'generated', 'failed'
  file_size_bytes integer,
  storage_path text, -- Path in Supabase Storage (reports bucket)
  file_format text default 'pdf', -- 'pdf', 'csv', 'xlsx'
  generated_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  error_message text,

  constraint valid_report_type check (report_type in ('compliance_summary', 'findings_by_discipline', 'asset_audit', 'deadline_report')),
  constraint valid_status check (status in ('pending', 'generating', 'generated', 'failed')),
  constraint valid_format check (file_format in ('pdf', 'csv', 'xlsx'))
);

create index if not exists idx_reports_org on public.reports(org_id);
create index if not exists idx_reports_created_by on public.reports(created_by);
create index if not exists idx_reports_generated_at on public.reports(generated_at desc);
create index if not exists idx_reports_status on public.reports(status);

alter table public.reports enable row level security;

create policy "Users can read reports they created or their org admins created"
  on public.reports for select
  using (
    auth.uid() = created_by or
    exists (
      select 1 from public.organization_members om
      where om.org_id = reports.org_id
        and om.user_id = auth.uid()
        and om.role in ('manager', 'admin')
    )
  );

create policy "Users can create reports for their org"
  on public.reports for insert
  with check (
    exists (
      select 1 from public.organization_members om
      where om.org_id = reports.org_id
        and om.user_id = auth.uid()
        and om.role in ('manager', 'admin')
    )
  );

create policy "Users can delete their own reports"
  on public.reports for delete
  using (auth.uid() = created_by);

-- Function to seed default notification preferences for new users
create or replace function public.seed_notification_preferences_for_user()
returns trigger as $$
begin
  insert into public.notification_preferences (org_id, user_id)
  select org_id, new.user_id
  from public.organization_members
  where user_id = new.user_id;
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-create notification preferences when user joins org
drop trigger if exists seed_notification_prefs_trigger on public.organization_members;
create trigger seed_notification_prefs_trigger
after insert on public.organization_members
for each row execute function public.seed_notification_preferences_for_user();

-- View: Pending emails to send (filtered by frequency preferences)
create or replace view public.emails_to_send_immediate as
select
  eq.id,
  eq.org_id,
  eq.recipient_email,
  eq.subject,
  eq.body_html,
  eq.entity_type,
  eq.entity_id,
  np.email_frequency
from public.email_queue eq
left join public.notification_preferences np on np.org_id = eq.org_id
where eq.status = 'pending'
  and (np.email_frequency = 'immediate' or np.email_frequency is null);

-- Function to mark email as sent
create or replace function public.mark_email_sent(email_id uuid, message_id text default null)
returns void as $$
begin
  update public.email_queue
  set status = 'sent', processed_at = now()
  where id = email_id;

  -- Also create deadline_notification record if applicable
  -- (This will be enhanced when we have the actual notification sending logic)
end;
$$ language plpgsql;

-- Function to mark email as failed
create or replace function public.mark_email_failed(email_id uuid, error_msg text default null)
returns void as $$
begin
  update public.email_queue
  set status = 'failed', processed_at = now(), error_message = error_msg, retry_count = retry_count + 1
  where id = email_id;
end;
$$ language plpgsql;
