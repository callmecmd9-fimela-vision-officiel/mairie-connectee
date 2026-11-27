create table if not exists public.permis_construire(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null default private.my_commune() references public.communes(id) on delete cascade,
  numero text not null check (char_length(btrim(numero)) between 1 and 60),
  demandeur text not null check (char_length(btrim(demandeur)) between 1 and 200),
  telephone text check (telephone is null or char_length(telephone) <= 30),
  parcelle text check (parcelle is null or char_length(parcelle) <= 200),
  objet text not null check (char_length(btrim(objet)) between 1 and 300),
  statut text not null default 'depot'
    check (statut in ('depot','instruction_services_techniques','avis_commission','decision_maire','delivrance')),
  date_depot date not null default current_date,
  date_limite_instruction date not null,
  date_instruction date,
  avis_services_techniques text check (avis_services_techniques is null or avis_services_techniques in ('favorable','defavorable','reserves')),
  date_avis_commission date,
  avis_commission text check (avis_commission is null or avis_commission in ('favorable','defavorable','reserves')),
  date_decision date,
  decision_maire text check (decision_maire is null or decision_maire in ('accorde','refuse')),
  date_delivrance date,
  numero_permis text check (numero_permis is null or char_length(btrim(numero_permis)) between 1 and 60),
  silence_constate_le date,
  observations text check (observations is null or char_length(observations) <= 3000),
  created_at timestamptz not null default now(),
  unique (id, commune_id),
  unique (commune_id, numero),
  check (date_limite_instruction >= date_depot),
  -- Pas d'étape sans les précédentes (valable pour tous les rôles, y compris postgres)
  check (statut = 'depot' or date_instruction is not null),
  check (statut in ('depot','instruction_services_techniques') or avis_services_techniques is not null),
  check (statut in ('depot','instruction_services_techniques','avis_commission')
         or (avis_commission is not null and date_avis_commission is not null)),
  check (decision_maire is null or (statut in ('decision_maire','delivrance') and date_decision is not null)),
  check (statut <> 'delivrance'
         or (decision_maire = 'accorde' and date_delivrance is not null and nullif(btrim(numero_permis), '') is not null))
);

create index if not exists permis_construire_commune_idx on public.permis_construire(commune_id, date_depot desc);
create index if not exists permis_construire_limite_idx on public.permis_construire(commune_id, date_limite_instruction) where statut <> 'delivrance';

-- Délai d'instruction : date_depot + 3 mois (calculé par le serveur, non modifiable) ; ordre des étapes ; rôles
create or replace function private.permis_construire_workflow()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_ordre text[] := array['depot','instruction_services_techniques','avis_commission','decision_maire','delivrance'];
  v_old int;
  v_new int;
  v_role text := (select private.my_role());
  v_uid uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    if new.statut <> 'depot' then
      raise exception 'Un dossier de permis naît à l''étape « depot ».' using errcode = '55000';
    end if;
    new.date_limite_instruction := (new.date_depot + interval '3 months')::date;
    return new;
  end if;

  if new.date_depot is distinct from old.date_depot or new.date_limite_instruction is distinct from old.date_limite_instruction then
    raise exception 'La date de dépôt et la date limite d''instruction (dépôt + 3 mois) ne sont pas modifiables.' using errcode = '55000';
  end if;

  if old.statut = 'delivrance' then
    raise exception 'Permis délivré : dossier clos, aucune modification.' using errcode = '55000';
  end if;

  v_old := array_position(v_ordre, old.statut);
  v_new := array_position(v_ordre, new.statut);
  if new.statut is distinct from old.statut and (v_new is null or v_new <> v_old + 1) then
    raise exception 'Étape interdite : « % » -> « % » (les étapes se suivent sans saut ni retour).', old.statut, new.statut using errcode = '55000';
  end if;

  -- La décision (accord / refus) est prise par le Maire seul ; la délivrance par le Maire ou le secrétariat
  if v_uid is not null then
    if (new.decision_maire is distinct from old.decision_maire or new.date_decision is distinct from old.date_decision)
       and v_role is distinct from 'maire' then
      raise exception 'Seul le Maire peut enregistrer la décision sur un permis de construire.' using errcode = '42501';
    end if;
    if new.statut = 'delivrance' and old.statut <> 'delivrance' and v_role not in ('maire','secretariat') then
      raise exception 'La délivrance du permis est réservée au Maire et au secrétariat.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.permis_construire_workflow() from public, anon, authenticated;

drop trigger if exists trg_permis_construire_workflow on public.permis_construire;
create trigger trg_permis_construire_workflow
  before insert or update on public.permis_construire
  for each row execute function private.permis_construire_workflow();

-- Silence de l'administration : marque les dossiers dont le délai d'instruction est dépassé sans décision (alerte côté application).
create or replace function public.constater_silences_permis()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_commune uuid := (select private.my_commune());
  v_n integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;
  if coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
     or v_commune is null or (select private.my_role()) not in ('maire','secretariat') then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  update public.permis_construire
     set silence_constate_le = current_date
   where commune_id = v_commune and silence_constate_le is null
     and statut <> 'delivrance' and decision_maire is null
     and date_limite_instruction < current_date;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
alter function public.constater_silences_permis() owner to postgres;
revoke all on function public.constater_silences_permis() from public, anon;
grant execute on function public.constater_silences_permis() to authenticated;

-- RLS : lecture maire / adjoint / secrétariat ; écriture maire / secrétariat ; aucune suppression (traçabilité)
alter table public.permis_construire enable row level security;
revoke all on public.permis_construire from public, anon, authenticated;
grant select, insert, update on public.permis_construire to authenticated;

drop policy if exists permis_construire_lecture on public.permis_construire;
create policy permis_construire_lecture on public.permis_construire for select to authenticated
  using ((select private.my_role()) in ('maire','adjoint','secretariat') and commune_id = (select private.my_commune()));
drop policy if exists permis_construire_creation on public.permis_construire;
create policy permis_construire_creation on public.permis_construire for insert to authenticated
  with check ((select private.my_role()) in ('maire','secretariat') and commune_id = (select private.my_commune()));
drop policy if exists permis_construire_modification on public.permis_construire;
create policy permis_construire_modification on public.permis_construire for update to authenticated
  using ((select private.my_role()) in ('maire','secretariat') and commune_id = (select private.my_commune()))
  with check ((select private.my_role()) in ('maire','secretariat') and commune_id = (select private.my_commune()));

drop policy if exists isolation_commune on public.permis_construire;
create policy isolation_commune on public.permis_construire as restrictive for all to authenticated
  using (commune_id = (select private.my_commune())) with check (commune_id = (select private.my_commune()));
drop policy if exists bloque_anonymes_permis_construire on public.permis_construire;
create policy bloque_anonymes_permis_construire on public.permis_construire as restrictive for all to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
  with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
drop policy if exists maintenance_serveur on public.permis_construire;
create policy maintenance_serveur on public.permis_construire as restrictive for all to authenticated
  using ((select private.hors_maintenance())) with check ((select private.hors_maintenance()));
drop policy if exists sa_no_insert on public.permis_construire;
create policy sa_no_insert on public.permis_construire as restrictive for insert to authenticated
  with check (not public.is_super_admin());
drop policy if exists sa_no_update on public.permis_construire;
create policy sa_no_update on public.permis_construire as restrictive for update to authenticated
  using (not public.is_super_admin()) with check (not public.is_super_admin());

drop trigger if exists audit_permis_construire on public.permis_construire;
create trigger audit_permis_construire after insert or update or delete on public.permis_construire
  for each row execute function private.audit();
