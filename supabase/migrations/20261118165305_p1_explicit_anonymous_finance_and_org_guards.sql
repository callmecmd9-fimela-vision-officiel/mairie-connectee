BEGIN;
DROP POLICY IF EXISTS bloque_anonymes_paiements ON public.paiements;
CREATE POLICY bloque_anonymes_paiements
ON public.paiements
AS RESTRICTIVE
FOR ALL TO authenticated
USING (COALESCE((auth.jwt()->>'is_anonymous')::boolean,false)=false)
WITH CHECK (COALESCE((auth.jwt()->>'is_anonymous')::boolean,false)=false);

DROP POLICY IF EXISTS bloque_anonymes_org_roles ON public.org_roles;
CREATE POLICY bloque_anonymes_org_roles
ON public.org_roles
AS RESTRICTIVE
FOR ALL TO authenticated
USING (COALESCE((auth.jwt()->>'is_anonymous')::boolean,false)=false)
WITH CHECK (COALESCE((auth.jwt()->>'is_anonymous')::boolean,false)=false);
COMMIT;