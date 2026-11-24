-- LOT 6 : trace des notifications WhatsApp (WAHA en test, API Meta plus tard). Idempotent.
-- NB : public.notifications existe déjà (notifications internes : user_id, titre, corps, lu). La nouvelle table s'appelle donc notifications_whatsapp.
create table if not exists public.notifications_whatsapp(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null references public.communes(id) on delete cascade,
 demande_id uuid references public.demandes(id) on delete set null,
 destinataire_telephone text not null check(destinataire_telephone ~ '^\+?[0-9 ]{8,16}$'),
 message text not null check(char_length(message) between 1 and 1000),
 canal text not null default 'waha' check(canal in('waha','meta')),
 statut text not null default 'en_attente' check(statut in('en_attente','succes','echec')),
 erreur text check(erreur is null or char_length(erreur)<=300),
 envoye_par uuid default auth.uid(),
 date_envoi timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists notif_wa_commune_idx on public.notifications_whatsapp(commune_id,created_at desc);
create index if not exists notif_wa_demande_idx on public.notifications_whatsapp(demande_id);

-- Garde : statut initial imposé, seule la transition en_attente -> envoye/echec est permise
create or replace function public.trg_notif_wa_garde() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  new.statut:='en_attente'; new.erreur:=null; new.date_envoi:=null; new.envoye_par:=auth.uid();
  if new.demande_id is not null and not exists(select 1 from public.demandes d where d.id=new.demande_id and d.commune_id=new.commune_id) then
   raise exception 'Demande hors commune';
  end if;
 else
  if old.statut<>'en_attente' or new.statut not in('succes','echec') then raise exception 'Transition de statut interdite'; end if;
  if new.statut='succes' then new.date_envoi:=now(); new.erreur:=null; end if;
 end if;
 return new;
end $$;
revoke all on function public.trg_notif_wa_garde() from public,anon,authenticated;
drop trigger if exists notif_wa_garde on public.notifications_whatsapp;
create trigger notif_wa_garde before insert or update on public.notifications_whatsapp for each row execute function public.trg_notif_wa_garde();

alter table public.notifications_whatsapp enable row level security;
drop policy if exists notif_wa_sel on public.notifications_whatsapp;
drop policy if exists notif_wa_ins on public.notifications_whatsapp;
drop policy if exists notif_wa_upd on public.notifications_whatsapp;
create policy notif_wa_sel on public.notifications_whatsapp for select to authenticated
 using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=notifications_whatsapp.commune_id and p.role in('maire','adjoint','cabinet','secretariat','agent','etat_civil')));
create policy notif_wa_ins on public.notifications_whatsapp for insert to authenticated
 with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=notifications_whatsapp.commune_id and p.role in('maire','adjoint','cabinet','secretariat','agent','etat_civil')));
create policy notif_wa_upd on public.notifications_whatsapp for update to authenticated
 using(envoye_par=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=notifications_whatsapp.commune_id))
 with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=notifications_whatsapp.commune_id));
revoke all on public.notifications_whatsapp from anon,authenticated;
grant select on public.notifications_whatsapp to authenticated;
grant insert(commune_id,demande_id,destinataire_telephone,message,canal) on public.notifications_whatsapp to authenticated;
grant update(statut,erreur) on public.notifications_whatsapp to authenticated;
