create index if not exists courrier_adjoint_id_idx on public.courrier (adjoint_id);
create index if not exists notifications_commune_id_idx on public.notifications (commune_id);
create index if not exists session_presences_conseiller_id_idx on public.session_presences (conseiller_id);