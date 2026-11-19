BEGIN;

-- Les paiements électroniques doivent porter une référence de transaction.
ALTER TABLE public.paiements
  ADD CONSTRAINT paiements_reference_electronique_check
  CHECK (
    mode NOT IN ('wave','orange_money','virement')
    OR NULLIF(btrim(reference),'') IS NOT NULL
  );

-- Une référence électronique ne peut être comptabilisée deux fois pour un même canal.
CREATE UNIQUE INDEX paiements_reference_electronique_uq
  ON public.paiements (mode, lower(btrim(reference)))
  WHERE mode IN ('wave','orange_money','virement')
    AND reference IS NOT NULL;

-- Les écritures passent exclusivement par les RPC contrôlées (MFA + rôle plateforme).
REVOKE INSERT, UPDATE, DELETE ON TABLE
  public.factures,
  public.paiements,
  public.abonnements,
  public.plans
FROM authenticated;

COMMIT;