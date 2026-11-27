// Audit lot 2 (lots D, E, F) : non-régression statique + règles pures. node tests/audit-lot2-regression.test.js
// Vérifie : contraintes SQL (DOB, tutelle, quorum, procurations, convocation, enum marchés, NINEA, Trésor, urbanisme),
// blocage du vote sans DOB dans le JS, calcul du quorum et des procurations, blocage du workflow urbanisme, branchement dans mairie.html.
const fs = require("fs"),
  path = require("path");
const R = path.join(__dirname, "..");
const lire = p => fs.readFileSync(path.join(R, p), "utf8");
let f = 0;
const ok = (n, c) => {
  console.log(c ? "OK  " : "FAIL", n);
  if (!c) f++;
};
const RM = require(path.join(R, "js", "regles-municipales.js"));
const sqlD = lire("supabase/proposed/20261207_budget_conseil.sql"),
  sqlE = lire("supabase/proposed/20261208_marches_fiscalite.sql"),
  sqlF = lire("supabase/proposed/20261209_urbanisme.sql"),
  budgetJs = lire("js/budget.js"),
  delibJs = lire("js/deliberations.js"),
  actionsJs = lire("js/actions.js"),
  marchesJs = lire("js/marches.js"),
  mairieJs = lire("js/maire.js"),
  fiscJs = lire("js/fiscalite.js"),
  html = lire("mairie.html");
const re = (s, r) => r.test(s);

// ---------- LOT D : SQL
ok("D/SQL statut budget : dob ajouté avant brouillon", re(sqlD, /check \(statut in \('dob','brouillon','vote','approuve','cloture'\)\)/));
ok("D/SQL colonnes date_dob, pv_dob_url", re(sqlD, /add column if not exists date_dob date/) && re(sqlD, /add column if not exists pv_dob_url text/));
ok("D/SQL contrainte : pas de vote sans DOB (date + PV)", re(sqlD, /budgets_dob_avant_vote_chk[\s\S]{0,260}date_dob is not null and nullif\(btrim\(pv_dob_url\), ''\) is not null/));
ok("D/SQL colonnes date_transmission_tutelle, statut_tutelle", re(sqlD, /date_transmission_tutelle date/) && re(sqlD, /statut_tutelle text/));
ok("D/SQL statut_tutelle ∈ en_attente, approuve, rejete", re(sqlD, /statut_tutelle in \('en_attente','approuve','rejete'\)/));
ok("D/SQL approuvé exige preuve de transmission + tutelle approuvée", re(sqlD, /budgets_tutelle_avant_approbation_chk[\s\S]{0,400}date_transmission_tutelle is not null[\s\S]{0,120}statut_tutelle = 'approuve'/));
ok("D/SQL trigger parcours strict sans saut", re(sqlD, /private\.budgets_workflow/) && re(sqlD, /v_new <> v_old \+ 1/));
ok("D/SQL trigger refuse le vote sans DOB", re(sqlD, /new\.statut = 'vote' and \(new\.date_dob is null/));
ok("D/SQL RPC tutelle sécurisées (search_path vide, anon révoqué)", re(sqlD, /budget_transmettre_tutelle[\s\S]{0,200}security definer set search_path = ''/) && re(sqlD, /revoke all on function public\.budget_decider_tutelle\(uuid, text\) from public, anon/));
ok("D/SQL convocation >= 3 jours", re(sqlD, /sessions_conseil_delai_convocation_chk[\s\S]{0,260}\(jour - convocation_le::date\) >= 3/));
ok("D/SQL procurations : mandataire_id + statut cohérent", re(sqlD, /mandataire_id uuid references public\.conseillers/) && re(sqlD, /\(statut_presence = 'procuration'\) = \(mandataire_id is not null\)/));
ok("D/SQL procurations : pas d'auto-procuration", re(sqlD, /mandataire_id is distinct from conseiller_id/));
ok("D/SQL procurations : UNE seule procuration par mandataire et par session (index unique)", re(sqlD, /create unique index if not exists session_presences_une_procuration_uq\s+on public\.session_presences\(session_id, mandataire_id\) where mandataire_id is not null/));
ok("D/SQL procurations : mandataire présent et en exercice (trigger différé)", re(sqlD, /deferrable initially deferred/) && re(sqlD, /p\.statut_presence = 'present'[\s\S]{0,120}c\.statut = 'titulaire'/));
ok("D/SQL quorum = majorité des membres en exercice (n/2 + 1)", re(sqlD, /private\.quorum_session/) && re(sqlD, /v_membres \/ 2 \+ 1/));
ok("D/SQL quorum : trigger bloque adoption / rejet sans quorum", re(sqlD, /trg_deliberations_garde_quorum/) && re(sqlD, /new\.statut not in \('adoptee','rejetee'\)/) && re(sqlD, /Quorum non atteint/));
ok("D/SQL contraintes NOT VALID (historique conservé)", (sqlD.match(/not valid/g) || []).length >= 5);

// ---------- LOT E : SQL
ok("E/SQL enum mode_passation_marche (4 valeurs)", re(sqlE, /create type public\.mode_passation_marche as enum \('appel_offres_ouvert','appel_offres_restreint','consultation','gre_a_gre'\)/));
ok("E/SQL colonne marches.mode convertie en enum", re(sqlE, /alter column mode type public\.mode_passation_marche/));
ok("E/SQL seuil_passation numeric + références de l'appel", re(sqlE, /seuil_passation numeric\(15,2\)/) && re(sqlE, /ref_publication_appel text/) && re(sqlE, /ref_attribution_appel text/));
ok("E/SQL appel d'offres : références exigées selon le statut", re(sqlE, /marches_appel_publication_chk/) && re(sqlE, /marches_appel_attribution_chk/));
ok("E/SQL NINEA : colonne, format, unique par commune", re(sqlE, /add column if not exists ninea text/) && re(sqlE, /ninea ~ '\^\[0-9A-Z\]\{7,12\}\$'/) && re(sqlE, /create unique index if not exists contribuables_ninea_uidx on public\.contribuables\(commune_id, ninea\)/));
ok("E/SQL paiements : statut_tresor + ref_quittance_tresor", re(sqlE, /statut_tresor text not null default 'a_verser'/) && re(sqlE, /ref_quittance_tresor text/));
ok("E/SQL quittance Trésor obligatoire hors « à verser » + unique par commune", re(sqlE, /paiements_taxes_quittance_tresor_chk/) && re(sqlE, /paiements_taxes_quittance_tresor_uidx/));
ok("E/SQL quittance Trésor : RPC réservée aux finances (comptable public)", re(sqlE, /enregistrer_quittance_tresor[\s\S]{0,900}is distinct from 'finances'/));
ok("E/SQL séparation ordonnateur / comptable : ordonnancement = Maire", re(sqlE, /Seul l''ordonnateur \(le Maire\) peut ordonnancer/));
ok("E/SQL séparation : l'ordonnateur ne paie pas", re(sqlE, /ordonnateur ne peut pas enregistrer le paiement/) && re(sqlE, /old\.ordonnateur_id = v_uid/));
ok("E/SQL engagements : comptable_public, quittance et date de paiement obligatoires", re(sqlE, /engagements_paiement_tresor_chk[\s\S]{0,300}comptable_public[\s\S]{0,200}ref_quittance_tresor/));

// ---------- LOT F : SQL
ok("F/SQL workflow permis (5 étapes)", re(sqlF, /check \(statut in \('depot','instruction_services_techniques','avis_commission','decision_maire','delivrance'\)\)/));
ok("F/SQL date_limite_instruction = dépôt + 3 mois (serveur)", re(sqlF, /date_limite_instruction date not null/) && re(sqlF, /new\.date_depot \+ interval '3 months'/));
ok("F/SQL étapes non sautables (CHECK + trigger)", re(sqlF, /check \(statut = 'depot' or date_instruction is not null\)/) && re(sqlF, /v_new <> v_old \+ 1/));
ok("F/SQL avis commission exigé avant décision, décision accordée exigée avant délivrance", re(sqlF, /avis_commission is not null and date_avis_commission is not null/) && re(sqlF, /decision_maire = 'accorde' and date_delivrance is not null/));
ok("F/SQL décision réservée au Maire", re(sqlF, /Seul le Maire peut enregistrer la décision/));
ok("F/SQL silence de l'administration (RPC + colonne)", re(sqlF, /silence_constate_le date/) && re(sqlF, /constater_silences_permis/) && re(sqlF, /date_limite_instruction < current_date/));
ok("F/SQL RLS activée + isolation commune + anonymes bloqués", re(sqlF, /enable row level security/) && re(sqlF, /isolation_commune on public\.permis_construire as restrictive/) && re(sqlF, /bloque_anonymes_permis_construire/));

// ---------- Les migrations ne touchent à aucune RLS / table existante validée (état civil, hors-ligne)
const tout = sqlD + sqlE + sqlF;
ok("RLS existantes intactes : seules les policies de permis_construire sont créées / supprimées", (tout.match(/(?:create|drop) policy (?:if exists )?\w+ on (?:public\.)?(\w+)/g) || []).every(x => /permis_construire$/.test(x)));
ok("Aucune migration lot 2 ne touche l'état civil ni la file hors-ligne", !/etat_civil|actes_naissance|lgec|offline/i.test(tout.replace(/--.*$/gm, "")));

// ---------- JS : blocage du vote sans DOB
const bSansDob = { statut: "brouillon", date_dob: null, pv_dob_url: null },
  bDob = { statut: "brouillon", date_dob: "2026-10-05", pv_dob_url: "https://x/pv.pdf" };
ok("JS vote bloqué sans DOB (date + PV)", /Débat d.Orientation Budgétaire/.test(RM.budgetBlocage(bSansDob, "vote")));
ok("JS vote bloqué si PV manquant seul", RM.budgetBlocage({ ...bDob, pv_dob_url: "" }, "vote") != "");
ok("JS vote autorisé avec DOB", RM.budgetBlocage(bDob, "vote") == "");
ok("JS pas de saut : dob -> vote refusé", RM.budgetBlocage({ statut: "dob" }, "vote") != "");
ok("JS approuvé refusé sans preuve de transmission", /preuve de transmission/.test(RM.budgetBlocage({ ...bDob, statut: "vote", statut_tutelle: "approuve" }, "approuve")));
ok("JS approuvé refusé si la tutelle n'a pas approuvé", /tutelle/.test(RM.budgetBlocage({ ...bDob, statut: "vote", date_transmission_tutelle: "2026-11-01", preuve_transmission_url: "AR-123", statut_tutelle: "en_attente" }, "approuve")));
ok("JS approuvé autorisé avec preuve + tutelle approuvée", RM.budgetBlocage({ ...bDob, statut: "vote", date_transmission_tutelle: "2026-11-01", preuve_transmission_url: "AR-123", statut_tutelle: "approuve" }, "approuve") == "");
ok("JS transmission tutelle : date et preuve obligatoires, pas avant le DOB", RM.tutelleBlocage({ ...bDob, statut: "vote" }, "transmettre", { date: "2026-10-01", preuve: "AR" }) != "" && RM.tutelleBlocage({ ...bDob, statut: "vote" }, "transmettre", { date: "2026-11-01", preuve: "" }) != "" && RM.tutelleBlocage({ ...bDob, statut: "vote" }, "transmettre", { date: "2026-11-01", preuve: "AR" }) == "");
ok("JS budget.js applique RM.budgetBlocage et les RPC tutelle", /RM\.budgetBlocage\(b, cible\)/.test(budgetJs) && /budget_transmettre_tutelle/.test(budgetJs) && /budget_decider_tutelle/.test(budgetJs));
ok("JS nouveau budget créé à l'étape dob", /statut: "dob"/.test(budgetJs));

// ---------- JS : quorum et procurations
const cn = [1, 2, 3, 4, 5].map(i => ({ id: "c" + i, actif: true, statut: "titulaire" })).concat([{ id: "s1", actif: true, statut: "suppleant" }, { id: "x1", actif: false, statut: "titulaire" }]);
const pres = (...p) => p.map(([id, s, m]) => ({ conseiller_id: id, statut_presence: s, mandataire_id: m || null }));
ok("quorum : membres en exercice = titulaires actifs (5)", RM.quorum(cn, []).membres == 5 && RM.quorumMin(5) == 3 && RM.quorumMin(4) == 3 && RM.quorumMin(0) == 0);
ok("quorum atteint à 3 présents sur 5", RM.quorum(cn, pres(["c1", "present"], ["c2", "present"], ["c3", "present"])).atteint === true);
ok("quorum non atteint à 2 présents sur 5", RM.quorum(cn, pres(["c1", "present"], ["c2", "present"])).atteint === false && RM.quorumBlocage(cn, pres(["c1", "present"], ["c2", "present"])) != "");
ok("quorum : les procurations ne comptent pas pour le quorum", RM.quorum(cn, pres(["c1", "present"], ["c2", "present"], ["c3", "procuration", "c1"])).atteint === false && RM.quorum(cn, pres(["c1", "present"], ["c2", "present"], ["c3", "procuration", "c1"])).procurations == 1);
ok("quorum : suppléants et inactifs ignorés", RM.quorum(cn, pres(["c1", "present"], ["c2", "present"], ["s1", "present"], ["x1", "present"])).presents == 2);
ok("quorum : booléen present historique pris en charge", RM.quorum(cn, [{ conseiller_id: "c1", present: true }, { conseiller_id: "c2", present: true }, { conseiller_id: "c3", present: true }]).atteint === true);
ok("quorum : aucun conseiller -> vérification impossible (pas de quorum)", RM.quorum([], []).atteint === false && RM.quorumBlocage([], []) != "");
ok("procurations : cas valide (1 mandant -> 1 mandataire présent)", RM.validerProcurations(pres(["c1", "present"], ["c2", "procuration", "c1"]), cn).length == 0);
ok("procurations : un élu ne détient qu'UNE procuration", RM.validerProcurations(pres(["c1", "present"], ["c2", "procuration", "c1"], ["c3", "procuration", "c1"]), cn).some(e => /une seule procuration/.test(e)));
ok("procurations : pas d'auto-procuration", RM.validerProcurations(pres(["c1", "procuration", "c1"]), cn).length > 0);
ok("procurations : mandataire absent refusé", RM.validerProcurations(pres(["c1", "absent"], ["c2", "procuration", "c1"]), cn).length > 0);
ok("procurations : mandataire suppléant ou inactif refusé", RM.validerProcurations(pres(["s1", "present"], ["c2", "procuration", "s1"]), cn).length > 0 && RM.validerProcurations(pres(["x1", "present"], ["c2", "procuration", "x1"]), cn).length > 0);
ok("procurations : procuration sans mandataire refusée", RM.validerProcurations(pres(["c2", "procuration"]), cn).length > 0);
ok("JS actions.js valide les procurations avant l'écriture des présences", /RM\.validerProcurations\(rows, d\.cn/.test(actionsJs) && actionsJs.indexOf("RM.validerProcurations") < actionsJs.indexOf('from("session_presences").upsert'));
ok("JS deliberations.js : vote et clôture bloqués sans quorum", /Vote impossible\. " \+ qb/.test(delibJs) && /Clôture impossible\. " \+ qb/.test(delibJs) && /RM\.quorumBlocage/.test(delibJs));

// ---------- JS : délai de convocation
ok("convocation 3 jours avant la séance : acceptée", RM.delaiConvocation("2026-12-10", "2026-12-07").ok === true);
ok("convocation 2 jours avant : rejetée", RM.delaiConvocation("2026-12-10", "2026-12-08").ok === false && /3 jours/.test(RM.delaiConvocation("2026-12-10", "2026-12-08").message));
ok("convocation postérieure à la séance : rejetée", RM.delaiConvocation("2026-12-10", "2026-12-11").ok === false);
ok("convocation : dates invalides rejetées", RM.delaiConvocation("", "2026-12-08").ok === false);
ok("JS actions.js contrôle le délai de convocation avant écriture", /RM\.delaiConvocation\(/.test(actionsJs) && actionsJs.indexOf("RM.delaiConvocation") < actionsJs.indexOf('convocation_le: dc, statut: "convoquee"'));

// ---------- JS : marchés, fiscalité
ok("marchés : 4 modes (enum) exposés au JS", RM.MODES_PASSATION.map(x => x[0]).join() == "appel_offres_ouvert,appel_offres_restreint,consultation,gre_a_gre");
ok("marchés : mode libre refusé", RM.marcheBlocage({ mode: "Appel d'offres ouvert", statut: "preparation" }) != "");
ok("marchés : AO lancé sans référence de publication refusé", RM.marcheBlocage({ mode: "appel_offres_ouvert", statut: "lance" }) != "" && RM.marcheBlocage({ mode: "appel_offres_ouvert", statut: "lance", ref_publication_appel: "BOMP-12" }) == "");
ok("marchés : AO attribué sans référence d'attribution refusé", RM.marcheBlocage({ mode: "appel_offres_restreint", statut: "attribue", ref_publication_appel: "BOMP-12" }) != "" && RM.marcheBlocage({ mode: "appel_offres_restreint", statut: "attribue", ref_publication_appel: "BOMP-12", ref_attribution_appel: "ATT-1" }) == "");
ok("marchés : gré à gré sans références accepté", RM.marcheBlocage({ mode: "gre_a_gre", statut: "attribue" }) == "");
ok("marchés : seuil négatif refusé", RM.marcheBlocage({ mode: "consultation", statut: "preparation", seuil_passation: -1 }) != "");
ok("JS marches.js et maire.js appliquent RM.marcheBlocage", /RM\.marcheBlocage\(o\)/.test(marchesJs) && /RM\.marcheBlocage\(o\)/.test(mairieJs) && /mk_rp/.test(mairieJs));
ok("NINEA : obligatoire pour une entreprise, format contrôlé", RM.contribuableBlocage({ type: "entreprise", ninea: "" }) != "" && RM.contribuableBlocage({ type: "particulier", ninea: "12" }) != "" && RM.contribuableBlocage({ type: "entreprise", ninea: "00 123.456-7" }) == "" && RM.normNinea("00 123.456-7") == "001234567");
ok("JS fiscalite.js applique le NINEA, l'unicité et la quittance du Trésor", /RM\.contribuableBlocage\(o\)/.test(fiscJs) && /enregistrer_quittance_tresor/.test(fiscJs) && /RM\.tresorBlocage/.test(fiscJs));
const eng = s => ({ statut: s, ordonnateur_id: "u-maire" });
ok("circuit dépense : le Maire ordonnance, pas les finances", RM.engagementBlocage(eng("liquide"), "ordonnance", "maire", "u-maire") == "" && RM.engagementBlocage(eng("liquide"), "ordonnance", "finances", "u-fin") != "");
ok("circuit dépense : le paiement relève des finances (comptable public), jamais du Maire", RM.engagementBlocage(eng("ordonnance"), "paye", "maire", "u-maire", { comptable_public: "RM", ref_quittance_tresor: "Q1", date_paiement_tresor: "2026-12-01" }) != "");
ok("circuit dépense : paiement sans quittance du Trésor refusé", RM.engagementBlocage(eng("ordonnance"), "paye", "finances", "u-fin", { comptable_public: "RM", ref_quittance_tresor: "", date_paiement_tresor: "2026-12-01" }) != "");
ok("circuit dépense : paiement complet accepté", RM.engagementBlocage(eng("ordonnance"), "paye", "finances", "u-fin", { comptable_public: "RM", ref_quittance_tresor: "Q1", date_paiement_tresor: "2026-12-01" }) == "");
ok("circuit dépense : pas de saut engagé -> payé", RM.engagementBlocage(eng("engage"), "paye", "finances", "u-fin", { comptable_public: "RM", ref_quittance_tresor: "Q1", date_paiement_tresor: "2026-12-01" }) != "");
ok("circuit dépense : l'ordonnateur ne paie pas sa propre dépense", RM.engagementBlocage(eng("ordonnance"), "paye", "finances", "u-maire", { comptable_public: "RM", ref_quittance_tresor: "Q1", date_paiement_tresor: "2026-12-01" }) != "");
ok("Trésor : référence obligatoire dès « versé »", RM.tresorBlocage("verse", "") != "" && RM.tresorBlocage("verse", "Q-9") == "" && RM.tresorBlocage("a_verser", "") == "" && RM.tresorBlocage("autre", "x") != "");

// ---------- Urbanisme : workflow et délai
const et = RM.PERMIS_ETAPES;
ok("urbanisme : 5 étapes dans l'ordre", et.join(">") == "depot>instruction_services_techniques>avis_commission>decision_maire>delivrance");
ok("urbanisme : saut d'étape refusé (depot -> avis_commission, depot -> delivrance)", RM.permisBlocage({ statut: "depot" }, "avis_commission") != "" && RM.permisBlocage({ statut: "depot" }, "delivrance") != "");
ok("urbanisme : retour en arrière refusé", RM.permisBlocage({ statut: "avis_commission" }, "depot") != "");
ok("urbanisme : instruction technique sans avis -> commission bloquée", RM.permisBlocage({ statut: "instruction_services_techniques" }, "avis_commission") != "" && RM.permisBlocage({ statut: "instruction_services_techniques", avis_services_techniques: "favorable" }, "avis_commission") == "");
ok("urbanisme : décision du Maire bloquée sans avis (daté) de la commission", RM.permisBlocage({ statut: "avis_commission" }, "decision_maire") != "" && RM.permisBlocage({ statut: "avis_commission", avis_commission: "favorable", date_avis_commission: "2027-01-10" }, "decision_maire") == "");
ok("urbanisme : délivrance bloquée sans décision « accordé »", RM.permisBlocage({ statut: "decision_maire", numero_permis: "PC-1", date_delivrance: "2027-02-01" }, "delivrance") != "" && RM.permisBlocage({ statut: "decision_maire", decision_maire: "refuse", date_decision: "2027-02-01", numero_permis: "PC-1", date_delivrance: "2027-02-02" }, "delivrance") != "");
ok("urbanisme : délivrance bloquée sans numéro de permis", RM.permisBlocage({ statut: "decision_maire", decision_maire: "accorde", date_decision: "2027-02-01" }, "delivrance") != "" && RM.permisBlocage({ statut: "decision_maire", decision_maire: "accorde", date_decision: "2027-02-01", numero_permis: "PC-1", date_delivrance: "2027-02-02" }, "delivrance") == "");
ok("urbanisme : étape inconnue refusée", RM.permisBlocage({ statut: "depot" }, "archive") != "");
ok("urbanisme : date limite = dépôt + 3 mois", RM.dateLimiteInstruction("2026-12-09") == "2027-03-09" && RM.dateLimiteInstruction("2026-11-30") == "2027-02-28" && RM.dateLimiteInstruction("2027-11-30") == "2028-02-29" && RM.dateLimiteInstruction("n/a") == null);
const p = { statut: "instruction_services_techniques", date_depot: "2026-12-09" };
ok("urbanisme : délai respecté / échéance proche / silence de l'administration", RM.permisDelai(p, "2027-01-15").etat == "dans_les_delais" && RM.permisDelai(p, "2027-03-01").etat == "proche" && RM.permisDelai(p, "2027-03-10").etat == "silence" && RM.permisDelai(p, "2027-03-10").jours == 1);
ok("urbanisme : un dossier décidé ou délivré n'est jamais en silence", RM.permisDelai({ ...p, decision_maire: "accorde" }, "2028-01-01").etat == "termine" && RM.permisDelai({ ...p, statut: "delivrance" }, "2028-01-01").etat == "termine");
const urb = lire("js/urbanisme.js");
ok("JS urbanisme.js applique RM.permisBlocage avant chaque étape et la décision est réservée au Maire", /RM\.permisBlocage\(Object\.assign\(\{\}, p, patch\), cible\)/.test(urb) && /Seul le Maire peut enregistrer la décision/.test(urb));
ok("JS urbanisme.js : alerte silence + constat serveur", /Silence de l’administration/.test(urb) && /constater_silences_permis/.test(urb));

// ---------- Branchement dans mairie.html (ordre de chargement) et tests / smoke
const pos = n => html.indexOf('/js/' + n + '.js');
ok("mairie.html charge regles-municipales avant maire, secretariat, marches, deliberations, budget, fiscalite, urbanisme, actions", pos("regles-municipales") > 0 && ["maire", "secretariat", "marches", "deliberations", "budget", "fiscalite", "urbanisme", "actions"].every(n => pos("regles-municipales") < pos(n)));
ok("mairie.html charge urbanisme après maire (SP / SUB / SNAV définis)", pos("urbanisme") > pos("maire") && pos("urbanisme") > pos("core-ui"));
ok("smoke.js charge regles-municipales et urbanisme", /'regles-municipales'.*'urbanisme'/.test(lire("js/smoke.js")));

console.log(f ? "ECHECS: " + f : "TOUS OK");
process.exit(f ? 1 : 0);
