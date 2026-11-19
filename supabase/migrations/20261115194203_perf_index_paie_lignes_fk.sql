create index if not exists paie_lignes_commune_id_idx on public.paie_lignes(commune_id);
create index if not exists paie_lignes_personnel_id_idx on public.paie_lignes(personnel_id);
create index if not exists paie_lignes_paie_id_idx on public.paie_lignes(paie_id);