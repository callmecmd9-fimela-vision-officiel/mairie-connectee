/* Lot F — services configurables, personnel sans compte, affectations et indicateurs.
   Le serveur reste l'autorité : org_service_save / org_sa_* / org_kpi contrôlent les droits et la commune.
   Aucun accès direct en écriture aux tables n'est effectué depuis le navigateur. */
const ORGF = {
  data: null,
  roles: [],
  kpi: null,
  loading: false,
  error: "",
  tab: "services",
  editService: null,
  editAgent: null,
  editPost: null,
  editRole: null,
  roleModule: "personnel",
  roleSelected: null
};
const ORFF = ["direction", "division", "service", "bureau", "unite"];
const ORFK = [
  ["instr", "Instructions en cours"],
  ["cin", "Courriers en cours"],
  ["actes", "Actes en préparation"],
  ["dossiers", "Dossiers ouverts"],
  ["citoyens", "Demandes citoyennes"],
  ["marches", "Marchés en cours"],
  ["projets", "Projets actifs"],
  ["projets_retard", "Projets en retard"],
  ["conges", "Demandes de congés"],
  ["paie", "Paies à traiter"],
  ["personnel", "Agents actifs"],
  ["demandes_anciennes", "Demandes ouvertes depuis plus de 15 jours"],
  ["rdv", "Rendez-vous à confirmer"]
];
const ORFS = [
  ["services", "Services actifs"],
  ["postes", "Postes actifs"],
  ["affectations", "Affectations en cours"],
  ["roles", "Rôles actifs"]
];
const orgfKv = v => (v == null ? "—" : Number(v).toLocaleString("fr-FR"));
const orgfEsc = x => esc(x == null ? "" : String(x));
const orgfRpc = async (n, a) => {
  const r = await sb.rpc(n, a);
  if (r.error) throw new Error(r.error.message || "Opération refusée");
  return r.data;
};
async function orgfLoad() {
  if (ORGF.loading) return;
  ORGF.loading = true;
  ORGF.error = "";
  ORGF.kpiError = "";
  try {
    ORGF.data = (await orgfRpc("org_sa_organigramme", { p_commune: slug() })) || {};
    ORGF.roles = (await orgfRpc("org_sa_roles", { p_commune: slug() })) || [];
    try {
      ORGF.kpi = (await orgfRpc("org_kpi", {})) || {};
    } catch (k) {
      ORGF.kpi = null;
      ORGF.kpiError = k.message || "Indicateurs indisponibles.";
    }
  } catch (e) {
    ORGF.error = e.message || "Chargement impossible.";
  } finally {
    ORGF.loading = false;
    render();
  }
}
const orgfServices = () =>
  ((ORGF.data || {}).services || [])
    .slice()
    .sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || String(a.nom).localeCompare(String(b.nom), "fr"));
const orgfAgents = () => ((ORGF.data || {}).agents || []).filter(a => !a.fusionne_dans);
const orgfPostes = () => (ORGF.data || {}).postes || [];
const orgfAdjoints = () => ((ORGF.data || {}).adjoints || []).filter(a => a.actif !== false);
const orgfComptes = () => (ORGF.data || {}).comptes || [];
const orgfSvcName = id => (orgfServices().find(s => s.id === id) || {}).nom || "Sans service";
const orgfParentName = id => (orgfServices().find(s => s.id === id) || {}).nom || "Aucun";
const orgfDate = () => new Date().toISOString().slice(0, 10);
const orgfGet = id => (($("#" + id) || {}).value || "").trim();
const orgfTypeOpts = v =>
  ORFF.map(x => [x, { direction: "Direction", division: "Division", service: "Service", bureau: "Bureau", unite: "Unité" }[x]]);
function orgfServiceForm() {
  const e = ORGF.editService,
    n = !e || e === "new",
    s = n ? {} : orgfServices().find(x => x.code === e) || {};
  const parents = orgfServices()
    .filter(x => x.code !== s.code)
    .map(x => [x.code, x.nom]);
  const pcode = n ? "" : (orgfServices().find(x => x.id === s.parent_id) || {}).code || "";
  return pn(
    n ? "Créer un service" : "Modifier le service",
    "brief",
    frm(
      inp(
        "of_sc",
        "Code technique",
        "text",
        s.code || "",
        "ex. services_techniques",
        n ? 'required pattern="[a-z][a-z0-9_]{1,60}"' : "disabled"
      ) +
        inp("of_sn", "Nom du service", "text", s.nom || "", "Nom affiché", "required minlength=2") +
        sel("of_st", "Type", orgfTypeOpts(s.type || "service"), s.type || "service") +
        sel("of_sp", "Service parent", [["", "Aucun"], ...parents], pcode) +
        inp("of_sr", "Responsable (nom ou fonction)", "text", s.responsable || "", "Facultatif") +
        sel(
          "of_sa",
          "Statut",
          [
            ["1", "Actif"],
            ["0", "Inactif"]
          ],
          s.actif === false ? "0" : "1"
        )
    ) +
      `<p class="mut">Le code technique est stable après création. Un service désactivé reste conservé dans l'historique.</p><p><button class="bt" data-of="service-save">Enregistrer</button> <button class="bo" data-of="cancel">Annuler</button></p>`
  );
}
function orgfServicesView() {
  const rows = orgfServices()
    .map(s => {
      const p = orgfParentName(s.parent_id),
        n = orgfAgents().filter(a => a.service_id === s.id && a.actif !== false).length;
      return rw(
        `<b>${orgfEsc(s.nom)}</b><div class="mut" data-sty="font-size:13px">${orgfEsc({ direction: "Direction", division: "Division", service: "Service", bureau: "Bureau", unite: "Unité" }[s.type] || s.type)} · ${orgfEsc(s.code)} · Parent : ${orgfEsc(p)} · ${n} agent(s) · ${orgfEsc(s.responsable || "Responsable non renseigné")}</div>`,
        `${s.actif === false ? st2("Inactif", "rd") : st2("Actif", "ok")} <button class="tg" data-of="service-edit" data-code="${orgfEsc(s.code)}">Modifier</button>`
      );
    })
    .join("");
  return (
    pn(
      "Services de la commune",
      "brief",
      rows || emp("Aucun service configuré."),
      `<button class="bt" data-of="service-new">Nouveau service</button>`
    ) + (ORGF.editService ? orgfServiceForm() : "")
  );
}
function orgfAgentForm() {
  const e = ORGF.editAgent,
    n = !e || e === "new",
    a = n ? {} : e;
  const sc = orgfServices().find(s => s.id === a.service_id);
  return pn(
    n ? "Ajouter un agent" : "Modifier la fiche de l'agent",
    "user",
    frm(
      inp("of_ap", "Prénom", "text", a.prenom || "", "Prénom", "required") +
        inp("of_an", "Nom", "text", a.nom || "", "Nom", "required") +
        inp("of_af", "Fonction", "text", a.fonction || "", "Fonction occupée") +
        sel(
          "of_as",
          "Service",
          [
            ["", "Non affecté"],
            ...orgfServices()
              .filter(s => s.actif !== false || s.id === a.service_id)
              .map(s => [s.code, s.nom])
          ],
          sc ? sc.code : ""
        ) +
        sel(
          "of_au",
          "Compte de connexion associé",
          [
            ["", "Aucun compte"],
            ...orgfComptes()
              .filter(
                x =>
                  (x.actif !== false || x.id === a.user_id) &&
                  (x.id === a.user_id ||
                    (!orgfAgents().some(y => y.id !== a.id && y.user_id === x.id) && !orgfAdjoints().some(y => y.user_id === x.id)))
              )
              .map(x => [x.id, (x.nom || x.email || x.id) + " · " + x.role + (x.actif ? "" : " · inactif")])
          ],
          a.user_id || ""
        ) +
        inp("of_ac", "Type de contrat", "text", a.type_contrat || "Permanent", "Ex. Permanent, contractuel") +
        inp("of_am", "Matricule", "text", a.matricule || "", "Facultatif") +
        inp("of_at", "Téléphone", "tel", a.telephone || "", "Facultatif") +
        inp("of_ae", "E-mail", "email", a.email || "", "Facultatif") +
        sel(
          "of_aa",
          "Situation",
          [
            ["1", "Actif"],
            ["0", "Inactif"]
          ],
          a.actif === false ? "0" : "1"
        )
    ) +
      `<p class="mut">La fiche RH est indépendante du compte Auth. Le compte sélectionné est lié par une RPC serveur, uniquement dans cette commune. Un compte invité peut être lié avant son activation.</p><p><button class="bt" data-of="agent-save" data-id="${orgfEsc(a.id || "")}">Enregistrer</button> <button class="bo" data-of="cancel">Annuler</button></p>`
  );
}
function orgfAgentsView() {
  const rows = orgfAgents()
    .map(a =>
      rw(
        `<b>${orgfEsc(a.prenom)} ${orgfEsc(a.nom)}</b><div class="mut" data-sty="font-size:13px">${orgfEsc(a.fonction || "Fonction non renseignée")} · ${orgfEsc(orgfSvcName(a.service_id))}${a.matricule ? " · Matricule " + orgfEsc(a.matricule) : ""}</div>`,
        `<div data-sty="display:flex;gap:6px;align-items:center;flex-wrap:wrap">${a.actif === false ? st2("Inactif", "rd") : st2("Actif", "ok")}<button class="tg" data-of="agent-edit" data-id="${orgfEsc(a.id)}">Modifier</button></div>`
      )
    )
    .join("");
  return (
    pn(
      "Personnel communal",
      "user",
      rows || emp("Aucun agent enregistré."),
      `<button class="bt" data-of="agent-new">Ajouter un agent</button>`
    ) + (ORGF.editAgent ? orgfAgentForm() : "")
  );
}
function orgfAffectView() {
  const personnes = [
    ...orgfAgents()
      .filter(a => a.actif !== false)
      .map(a => ["agent:" + a.id, a.prenom + " " + a.nom + " (agent)"]),
    ...orgfAdjoints().map(a => ["adjoint:" + a.id, a.prenom + " " + a.nom + " (adjoint)"])
  ];
  const form = pn(
    "Affecter une personne à un poste",
    "users",
    frm(
      sel("of_xp", "Personne", personnes, "") +
        sel(
          "of_xo",
          "Poste",
          [
            ["", "Choisir un poste"],
            ...orgfPostes()
              .filter(p => p.actif !== false)
              .map(p => [p.code, p.nom])
          ],
          ""
        ) +
        sel(
          "of_xs",
          "Service",
          [
            ["", "Aucun"],
            ...orgfServices()
              .filter(s => s.actif !== false)
              .map(s => [s.code, s.nom])
          ],
          ""
        ) +
        inp("of_xd", "Date de début", "date", orgfDate()) +
        inp("of_xf", "Date de fin (facultative)", "date", "") +
        inp("of_xm", "Motif (facultatif)", "text", "", "Motif de l'affectation")
    ) +
      `<p><button class="bt" data-of="assign">Enregistrer l'affectation</button></p>` +
      emp("Une affectation est historisée. Une même personne ne peut pas occuper deux fois le même poste sur une période qui se chevauche.")
  );
  const history = orgfAgents()
    .flatMap(a =>
      (a.affectations || []).map(x => ({
        who: a.prenom + " " + a.nom,
        id: x.id,
        poste: x.poste_code,
        service: x.service_id,
        debut: x.debut,
        fin: x.fin
      }))
    )
    .concat(
      orgfAdjoints().flatMap(a =>
        (a.affectations || []).map(x => ({
          who: a.prenom + " " + a.nom,
          id: x.id,
          poste: x.poste_code,
          service: x.service_id,
          debut: x.debut,
          fin: x.fin
        }))
      )
    )
    .sort((a, b) => String(b.debut).localeCompare(String(a.debut)));
  const rows = history
    .map(x =>
      rw(
        `<b>${orgfEsc(x.who)}</b><div class="mut" data-sty="font-size:13px">${orgfEsc((orgfPostes().find(p => p.code === x.poste) || {}).nom || x.poste)} · ${orgfEsc(orgfSvcName(x.service))} · ${orgfEsc(x.debut)}${x.fin ? " → " + orgfEsc(x.fin) : " · En cours"}</div>`,
        (!x.fin || x.fin >= orgfDate()) && x.debut <= orgfDate()
          ? `<button class="tg rd" data-of="assign-end" data-id="${orgfEsc(x.id)}">Mettre fin</button>`
          : st2(x.debut > orgfDate() ? "À venir" : "Terminée", "")
      )
    )
    .join("");
  return form + pn("Historique des affectations", "users", rows || emp("Aucune affectation enregistrée."));
}
const ORFMODULES = [
  "cabinet",
  "instr",
  "rapports",
  "cin",
  "cout",
  "actes",
  "dossiers",
  "archives",
  "conseil",
  "citoyens",
  "pub",
  "med",
  "budget",
  "marches",
  "regie",
  "personnel",
  "conges",
  "paie",
  "remun",
  "projets",
  "territoire",
  "patrimoine",
  "civil",
  "params",
  "deleg",
  "org"
];
const ORFACTIONS = [
  "consulter",
  "creer",
  "modifier",
  "supprimer",
  "valider",
  "rejeter",
  "signer",
  "exporter",
  "imprimer",
  "partager",
  "administrer"
];
const orgfModuleName = k =>
  ({
    cabinet: "Cabinet",
    instr: "Instructions",
    rapports: "Rapports",
    cin: "Courrier entrant",
    cout: "Courrier sortant",
    actes: "Actes",
    dossiers: "Dossiers",
    archives: "Archives",
    conseil: "Conseil municipal",
    citoyens: "Citoyens",
    pub: "Publications",
    med: "Médiathèque",
    budget: "Budget",
    marches: "Marchés",
    regie: "Régie",
    personnel: "Personnel",
    conges: "Congés",
    paie: "Paie",
    remun: "Rémunérations",
    projets: "Projets",
    territoire: "Territoire",
    patrimoine: "Patrimoine",
    civil: "État civil",
    params: "Paramètres",
    deleg: "Délégations",
    org: "Organigramme"
  })[k] || k;
const orgfActionName = k =>
  ({
    consulter: "Consulter",
    creer: "Créer",
    modifier: "Modifier",
    supprimer: "Désactiver / supprimer",
    valider: "Valider",
    rejeter: "Rejeter",
    signer: "Signer",
    exporter: "Exporter",
    imprimer: "Imprimer",
    partager: "Partager",
    administrer: "Administrer"
  })[k] || k;
function orgfPosteForm() {
  const e = ORGF.editPost,
    n = !e || e === "new",
    p = n ? {} : orgfPostes().find(x => x.code === e) || {};
  return pn(
    n ? "Créer un poste" : "Modifier le poste",
    "brief",
    frm(
      inp(
        "of_pc",
        "Code technique",
        "text",
        p.code || "",
        "ex. chef_division_finances",
        n ? 'required pattern="[a-z][a-z0-9_]{1,40}"' : "disabled"
      ) +
        inp("of_pn", "Intitulé du poste", "text", p.nom || "", "Intitulé officiel", "required minlength=2") +
        inp("of_pf", "Famille / division", "text", p.famille || "", "Ex. Administration générale") +
        sel(
          "of_pr",
          "Rôle associé",
          ORGF.roles.filter(r => r.actif !== false || r.code === p.role_code).map(r => [r.code, r.nom]),
          p.role_code || ""
        ) +
        sel(
          "of_pp",
          "Poste supérieur",
          [
            ["", "Aucun"],
            ...orgfPostes()
              .filter(x => x.code !== p.code)
              .map(x => [x.code, x.nom])
          ],
          p.parent_code || ""
        ) +
        sel("of_ps", "Service", [["", "Aucun"], ...orgfServices().map(x => [x.code, x.nom])], p.service_code || "") +
        sel(
          "of_pa",
          "Statut",
          [
            ["1", "Actif"],
            ["0", "Inactif"]
          ],
          p.actif === false ? "0" : "1"
        )
    ) +
      `<p class="mut">Un poste vacant reste disponible pour une nomination ultérieure. Les affectations passées sont conservées.</p><p><button class="bt" data-of="post-save">Enregistrer le poste</button> <button class="bo" data-of="cancel">Annuler</button></p>`
  );
}
function orgfPostesView() {
  const rows = orgfPostes()
    .map(p => {
      const holders = p.titulaires || [],
        svc = orgfServices().find(s => s.code === p.service_code);
      return rw(
        `<b>${orgfEsc(p.nom)}</b><div class="mut" data-sty="font-size:13px">${orgfEsc(p.famille || "Sans division")} · ${orgfEsc(p.code)} · ${orgfEsc(svc?.nom || "Sans service")} · Rôle : ${orgfEsc((ORGF.roles.find(r => r.code === p.role_code) || {}).nom || p.role_code || "—")}</div><div class="mut" data-sty="font-size:13px">${holders.length ? holders.map(x => orgfEsc(x.nom)).join(", ") : "Poste vacant"}</div>`,
        `${p.actif === false ? st2("Inactif", "rd") : holders.length ? st2("Pourvu", "ok") : st2("Vacant", "or")} <button class="tg" data-of="post-edit" data-code="${orgfEsc(p.code)}">Modifier</button>`
      );
    })
    .join("");
  return (
    pn(
      "Postes de l’organigramme",
      "brief",
      rows || emp("Aucun poste configuré."),
      `<button class="bt" data-of="post-new">Nouveau poste</button>`
    ) + (ORGF.editPost ? orgfPosteForm() : "")
  );
}
function orgfRoleForm() {
  const e = ORGF.editRole,
    n = !e || e === "new",
    r = n ? {} : ORGF.roles.find(x => x.code === e) || {};
  return pn(
    n ? "Créer un rôle" : "Modifier le rôle",
    "shield",
    frm(
      inp(
        "of_rc",
        "Code du rôle",
        "text",
        r.code || "",
        "ex. responsable_technique",
        n ? 'required pattern="[a-z][a-z0-9_]{1,40}"' : "disabled"
      ) +
        inp("of_rn", "Nom du rôle", "text", r.nom || "", "Nom affiché", "required minlength=2") +
        inp("of_rd", "Description", "text", r.description || "", "Facultatif") +
        sel(
          "of_ra",
          "Statut",
          [
            ["1", "Actif"],
            ["0", "Inactif"]
          ],
          r.actif === false ? "0" : "1"
        )
    ) +
      (r.systeme
        ? emp("Rôle système : son identité est protégée. Ses droits peuvent être ajustés selon les autorisations serveur.")
        : `<p><button class="bt" data-of="role-save">Enregistrer le rôle</button> <button class="bo" data-of="cancel">Annuler</button></p>`)
  );
}
function orgfRolesView() {
  const rows = ORGF.roles
    .map(r =>
      rw(
        `<b>${orgfEsc(r.nom)}</b><div class="mut" data-sty="font-size:13px">${orgfEsc(r.code)} · ${(r.droits || []).length} droit(s) · ${orgfEsc(r.description || "")}</div>`,
        `${r.systeme ? st2("Système", "bl") : st2("Personnalisé", "")} ${r.actif === false ? st2("Inactif", "rd") : st2("Actif", "ok")} ${r.code === "maire" ? st2("Droits protégés") : `<button class="tg" data-of="role-pick" data-code="${orgfEsc(r.code)}">Droits</button>`} ${r.systeme ? "" : `<button class="tg" data-of="role-edit" data-code="${orgfEsc(r.code)}">Modifier</button>`}`
      )
    )
    .join("");
  const selected = ORGF.roles.find(r => r.code === (ORGF.roleSelected || "")) || ORGF.roles[0];
  const moduleSelect = sel(
    "of_rm",
    "Module",
    ORFMODULES.map(k => [k, orgfModuleName(k)]),
    ORGF.roleModule
  );
  const checks = selected
    ? ORFACTIONS.map(a => {
        const on = (selected.droits || []).some(d => d.module === ORGF.roleModule && d.action === a);
        return `<label data-sty="display:inline-flex;align-items:center;gap:7px;margin:5px 12px 5px 0"><input type="checkbox" data-of-right="${a}" ${on ? "checked" : ""}>${orgfEsc(orgfActionName(a))}</label>`;
      }).join("")
    : emp("Aucun rôle disponible.");
  return (
    pn("Rôles et permissions", "shield", rows || emp("Aucun rôle."), `<button class="bt" data-of="role-new">Créer un rôle</button>`) +
    (ORGF.editRole ? orgfRoleForm() : "") +
    (selected
      ? pn(
          "Droits du rôle : " + orgfEsc(selected.nom),
          "lock",
          selected.code === "maire"
            ? emp("Les droits du maire sont protégés et ne peuvent pas être modifiés depuis cet écran.")
            : `<p class="mut">Les changements sont contrôlés par les fonctions serveur. Un responsable ne peut pas s’accorder des droits qu’il ne détient pas.</p>${moduleSelect}<div data-sty="padding:8px 0">${checks}</div><button class="bt" data-of="role-rights-save" data-code="${orgfEsc(selected.code)}">Enregistrer les droits de ce module</button>`
        )
      : "")
  );
}
function orgfKpiView() {
  const adm = ORGF.kpi && ORGF.kpi.profil === "admin_mairie",
    card = ([k, l]) => `<div class="kc"><div class="kl">${l}</div><div class="kv">${orgfKv(ORGF.kpi[k])}</div></div>`;
  const cards = ORGF.kpi
    ? ORFS.map(card).join("") + (adm ? "" : ORFK.map(card).join(""))
    : emp(orgfEsc(ORGF.kpiError || "Les indicateurs ne sont pas disponibles pour le moment."));
  return pn(
    "Indicateurs de la commune",
    "chart",
    `${ORGF.kpi ? `<div class="kp">${cards}</div>` : cards}${adm ? `<p class="mut">Les indicateurs métier (demandes, courriers, paie…) ne sont pas accessibles à l'administrateur municipal : ils restent réservés aux postes concernés.</p>` : ""}<p class="mut">Ces chiffres sont agrégés au niveau communal et calculés par la fonction sécurisée org_kpi(). Ils ne constituent pas encore une ventilation individuelle par poste.</p>`,
    `<button class="tg" data-of="refresh">Actualiser</button>`
  );
}
function orgfView() {
  if (S.pr !== "admin_mairie" && !S.sa)
    return pn("Services et équipes", "shield", emp("Cette gestion est réservée à l’administrateur municipal ou au super-administrateur."));
  if (!ORGF.data && !ORGF.loading) {
    orgfLoad();
    return emp("Chargement des services et du personnel…");
  }
  if (ORGF.loading && !ORGF.data) return emp("Chargement…");
  if (ORGF.error && !ORGF.data)
    return pn("Services et équipes", "alert", emp(orgfEsc(ORGF.error)) + `<button class="bo" data-of="refresh">Réessayer</button>`);
  const t = S.tab.orgf || "services";
  const scope = S.sa
    ? pn(
        "Commune gérée",
        "home",
        sel(
          "of_commune",
          "Choisir une commune",
          S.cs.map(c => [c.slug, c.nom]),
          slug()
        )
      )
    : "";
  return (
    scope +
    tabs("orgf", [
      ["services", "Services"],
      ["postes", "Postes"],
      ["agents", "Personnel"],
      ["affect", "Affectations"],
      ["roles", "Rôles et droits"],
      ["kpi", "Indicateurs"]
    ]) +
    (ORGF.error ? `<div class="al" role="alert">${orgfEsc(ORGF.error)}</div>` : "") +
    (t === "services"
      ? orgfServicesView()
      : t === "postes"
        ? orgfPostesView()
        : t === "agents"
          ? orgfAgentsView()
          : t === "affect"
            ? orgfAffectView()
            : t === "roles"
              ? orgfRolesView()
              : orgfKpiView())
  );
}
SP.administration.subs.push(["orgf", "Services et équipes"]);
RP.orgf = ["admin_mairie"];
SPL.orgf = "Services, personnel et affectations";
SUB.orgf = orgfView;
const orgfClick = async e => {
  const t = e.target.closest("[data-of]");
  if (!t) return;
  const a = t.dataset.of,
    g = orgfGet;
  S.err = "";
  try {
    if (a === "refresh") {
      ORGF.data = null;
      ORGF.kpi = null;
      await orgfLoad();
      return;
    }
    if (a === "cancel") {
      ORGF.editService = null;
      ORGF.editAgent = null;
      ORGF.editPost = null;
      ORGF.editRole = null;
      render();
      return;
    }
    if (a === "service-new") {
      ORGF.editService = "new";
      render();
      return;
    }
    if (a === "service-edit") {
      ORGF.editService = t.dataset.code;
      render();
      return;
    }
    if (a === "service-save") {
      const code = g("of_sc").toLowerCase(),
        nom = g("of_sn"),
        type = g("of_st"),
        parent = g("of_sp") || null;
      if (!/^[a-z][a-z0-9_]{1,60}$/.test(code)) throw new Error("Code invalide : minuscules, chiffres et _ (2 à 61 caractères). ");
      if (nom.length < 2) throw new Error("Le nom du service doit contenir au moins 2 caractères.");
      if (parent === code) throw new Error("Un service ne peut pas être son propre parent.");
      const old = orgfServices().find(x => x.code === code),
        ordre = old ? old.ordre || 0 : Math.max(0, ...orgfServices().map(x => x.ordre || 0)) + 1;
      await orgfRpc("org_sa_service_save", {
        p_commune: slug(),
        p_code: code,
        p_nom: nom,
        p_type: type,
        p_parent: parent,
        p_responsable: g("of_sr") || null,
        p_ordre: ordre,
        p_actif: g("of_sa") === "1"
      });
      ORGF.editService = null;
      await orgfLoad();
      return;
    }
    if (a === "post-new") {
      ORGF.editPost = "new";
      render();
      return;
    }
    if (a === "post-edit") {
      ORGF.editPost = t.dataset.code;
      render();
      return;
    }
    if (a === "post-save") {
      const code = g("of_pc").toLowerCase(),
        nom = g("of_pn"),
        role = g("of_pr");
      if (!/^[a-z][a-z0-9_]{1,40}$/.test(code)) throw new Error("Code de poste invalide.");
      if (nom.length < 2 || !role) throw new Error("Intitulé et rôle obligatoires.");
      await orgfRpc("org_sa_poste_save", {
        p_commune: slug(),
        p_code: code,
        p_nom: nom,
        p_famille: g("of_pf") || null,
        p_role: role,
        p_parent: g("of_pp") || null,
        p_service: g("of_ps") || null,
        p_actif: g("of_pa") === "1"
      });
      ORGF.editPost = null;
      await orgfLoad();
      return;
    }
    if (a === "role-new") {
      ORGF.editRole = "new";
      render();
      return;
    }
    if (a === "role-edit") {
      ORGF.editRole = t.dataset.code;
      render();
      return;
    }
    if (a === "role-pick") {
      ORGF.roleSelected = t.dataset.code;
      ORGF.editRole = null;
      render();
      return;
    }
    if (a === "role-save") {
      const code = g("of_rc").toLowerCase(),
        nom = g("of_rn");
      if (!/^[a-z][a-z0-9_]{1,40}$/.test(code)) throw new Error("Code de rôle invalide.");
      if (nom.length < 2) throw new Error("Nom du rôle obligatoire.");
      await orgfRpc("org_sa_role_save", {
        p_commune: slug(),
        p_code: code,
        p_nom: nom,
        p_desc: g("of_rd") || null,
        p_actif: g("of_ra") === "1"
      });
      ORGF.editRole = null;
      ORGF.roleSelected = code;
      await orgfLoad();
      return;
    }
    if (a === "role-rights-save") {
      const code = t.dataset.code,
        module = g("of_rm"),
        checks = [...document.querySelectorAll("[data-of-right]")];
      for (const c of checks)
        await orgfRpc("org_sa_role_droit_set", {
          p_commune: slug(),
          p_role: code,
          p_module: module,
          p_action: c.dataset.ofRight,
          p_on: c.checked
        });
      ORGF.roleSelected = code;
      await orgfLoad();
      return;
    }
    if (a === "agent-new") {
      ORGF.editAgent = "new";
      render();
      return;
    }
    if (a === "agent-edit") {
      ORGF.editAgent = orgfAgents().find(x => x.id === t.dataset.id) || null;
      render();
      return;
    }
    if (a === "agent-save") {
      const id = t.dataset.id || null,
        svc = g("of_as") || null;
      if (g("of_ap").length < 1 || g("of_an").length < 1) throw new Error("Le prénom et le nom sont obligatoires.");
      let obs = null;
      if (id) {
        const old = await sb.from("personnel").select("observations").eq("id", id).eq("commune_id", S.cid).maybeSingle();
        if (old.error) throw new Error(old.error.message || "Lecture de la fiche impossible.");
        obs = old.data ? old.data.observations : null;
      }
      const savedId = await orgfRpc("org_sa_agent_save", {
        p_commune: slug(),
        p_id: id,
        p_prenom: g("of_ap"),
        p_nom: g("of_an"),
        p_fonction: g("of_af") || null,
        p_service: svc,
        p_contrat: g("of_ac") || "Permanent",
        p_tel: g("of_at") || null,
        p_email: g("of_ae") || null,
        p_matricule: g("of_am") || null,
        p_obs: obs,
        p_actif: g("of_aa") === "1"
      });
      const account = g("of_au") || null,
        oldAccount = id ? (orgfAgents().find(x => x.id === id) || {}).user_id || null : null;
      if (account !== oldAccount) await orgfRpc("org_sa_lier_compte", { p_commune: slug(), p_personnel: savedId, p_user: account });
      ORGF.editAgent = null;
      await orgfLoad();
      return;
    }
    if (a === "assign") {
      const who = g("of_xp").split(":"),
        post = g("of_xo"),
        svc = g("of_xs") || null,
        start = g("of_xd") || orgfDate(),
        end = g("of_xf") || null;
      if (!who[1] || !post) throw new Error("Choisissez une personne et un poste.");
      if (end && end < start) throw new Error("La date de fin doit être postérieure ou égale à la date de début.");
      await orgfRpc("org_sa_affecter", {
        p_commune: slug(),
        p_personnel: who[0] === "agent" ? who[1] : null,
        p_adjoint: who[0] === "adjoint" ? who[1] : null,
        p_poste: post,
        p_service: svc,
        p_debut: start,
        p_fin: end,
        p_motif: g("of_xm") || null
      });
      await orgfLoad();
      return;
    }
    if (a === "assign-end") {
      if (!confirm("Mettre fin à cette affectation à la date d'aujourd'hui ?")) {
        ORGF.annule = true;
        return;
      }
      await orgfRpc("org_sa_affectation_fin", { p_commune: slug(), p_id: t.dataset.id, p_fin: orgfDate() });
      await orgfLoad();
      return;
    }
  } catch (x) {
    S.err = x.message || "Opération impossible.";
    render();
  }
};
/* Retour visuel : le formulaire s'ouvre sous la liste et les messages sont en haut de page, hors écran sur mobile.
   On amène donc le formulaire à l'écran, on bloque le bouton pendant l'enregistrement et on affiche le résultat en bandeau. */
const ORGF_OUVRIR = [
    "service-new",
    "service-edit",
    "post-new",
    "post-edit",
    "role-new",
    "role-edit",
    "role-pick",
    "agent-new",
    "agent-edit"
  ],
  ORGF_ECRIRE = ["service-save", "post-save", "role-save", "role-rights-save", "agent-save", "assign", "assign-end"];
function orgfToast(msg, ok) {
  if (!document.getElementById || !document.body) return;
  const old = document.getElementById("of-toast");
  if (old && old.parentNode) old.parentNode.removeChild(old);
  const d = document.createElement("div");
  d.id = "of-toast";
  d.setAttribute("role", ok ? "status" : "alert");
  d.textContent = msg;
  d.style.cssText =
    "position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483100;max-width:92vw;padding:12px 18px;border-radius:10px;font-size:15px;font-weight:700;box-shadow:0 6px 24px rgba(0,0,0,.3);color:#fff;background:" +
    (ok ? "#0b5a2e" : "#a4161a");
  document.body.appendChild(d);
  setTimeout(
    () => {
      if (d.parentNode) d.parentNode.removeChild(d);
    },
    ok ? 4000 : 9000
  );
}
function orgfVoirFormulaire() {
  if (!document.querySelector) return;
  const b = document.querySelector(
    '[data-of="service-save"],[data-of="post-save"],[data-of="role-save"],[data-of="agent-save"],[data-of="role-rights-save"]'
  );
  const f = b && (b.closest("section") || b);
  if (f && f.scrollIntoView) f.scrollIntoView({ block: "start", behavior: "smooth" });
}
document.addEventListener("click", async e => {
  const t = e.target.closest("[data-of]");
  if (!t || t.disabled) return;
  const a = t.dataset.of,
    ecrit = ORGF_ECRIRE.includes(a);
  if (ecrit) t.disabled = true;
  await orgfClick(e);
  if (ecrit) t.disabled = false;
  if (ORGF_OUVRIR.includes(a)) orgfVoirFormulaire();
  else if (ecrit) {
    if (S.err) {
      orgfToast(S.err, false);
      if (typeof window !== "undefined" && window.scrollTo) window.scrollTo(0, 0);
    } else if (ORGF.annule) ORGF.annule = false;
    else orgfToast("Modifications enregistrées.", true);
  }
});

if (typeof SANAV !== "undefined" && !SANAV.some(x => x[0] === "sa_org"))
  SANAV.splice(2, 0, ["sa_org", "Organigramme et personnel", "users"]);
if (typeof V !== "undefined") V.sa_org = orgfView;
document.addEventListener("change", async e => {
  if (e.target?.id === "of_rm") {
    ORGF.roleModule = e.target.value;
    render();
    return;
  }
  if (e.target?.id === "of_commune") {
    const c = (S.cs || []).find(x => x.slug === e.target.value);
    if (!c) return;
    S.cid = c.id;
    S.co = c.nom;
    ORGF.data = null;
    ORGF.roles = [];
    ORGF.kpi = null;
    ORGF.roleSelected = null;
    await orgfLoad();
  }
});
