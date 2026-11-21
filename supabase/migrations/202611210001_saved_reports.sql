begin;

create table public.saved_reports (
    user_id uuid not null references auth.users(id) on delete cascade,
    report_date text not null,
    report jsonb not null,
    primary key (user_id, report_date),
    constraint saved_reports_date_format check (
        report_date = 'Tidak Diketahui' or
        report_date ~ '^(0[1-9]|[12][0-9]|3[01]) (Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agt|Sep|Okt|Nov|Des) [0-9]{4}$'
    ),
    constraint saved_reports_payload check (
        jsonb_typeof(report) = 'object' and
        (report ->> 'tanggal' = report_date) is true
    )
);

alter table public.saved_reports enable row level security;
revoke all on public.saved_reports from public, anon, authenticated;
grant select, insert, update, delete on public.saved_reports to authenticated;

create policy "Users manage their own reports"
    on public.saved_reports
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

commit;
