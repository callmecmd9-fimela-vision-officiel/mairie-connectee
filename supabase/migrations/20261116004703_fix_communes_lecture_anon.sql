alter policy communes_lecture on public.communes to authenticated;
create policy communes_lecture_anon on public.communes for select to anon using (statut in ('essai','actif'));