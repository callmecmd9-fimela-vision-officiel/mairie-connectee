/* Règles métier pures du lot 2 (aucun DOM, aucun réseau) : budget (DOB, tutelle), Conseil (quorum, procurations, convocation),
   marchés (appel d'offres), fiscalité (NINEA, circuit ordonnateur / comptable public), urbanisme (workflow, délai d'instruction).
   Mêmes règles que les migrations 20261207_budget_conseil.sql, 20261208_marches_fiscalite.sql et 20261209_urbanisme.sql :
   la base reste l'autorité, ces fonctions évitent un aller-retour réseau et donnent un message clair avant l'envoi.
   À charger avant budget.js, marches.js, deliberations.js, fiscalite.js, urbanisme.js et actions.js. */
const RM = (() => {
  const plein = v => typeof v == "string" && v.trim() != "",
    iso = d => typeof d == "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d + "T00:00:00Z")),
    jours = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);

  /* ---------- Budget : dob -> brouillon -> vote -> approuve -> cloture ---------- */
  const BUDGET_ETAPES = ["dob", "brouillon", "vote", "approuve", "cloture"],
    TUTELLE = ["en_attente", "approuve", "rejete"],
    budgetSuivant = s => BUDGET_ETAPES[BUDGET_ETAPES.indexOf(s) + 1] || null,
    dobRenseigne = b => !!(b && iso(b.date_dob) && plein(b.pv_dob_url)),
    transmissionProuvee = b => !!(b && iso(b.date_transmission_tutelle) && plein(b.preuve_transmission_url)),
    /* Retourne "" si la transition de statut est permise, sinon le motif du blocage. */
    budgetBlocage = (b, cible) => {
      if (!b) return "Budget introuvable.";
      if (cible != budgetSuivant(b.statut))
        return (
          "Transition interdite : « " +
          b.statut +
          " » → « " +
          cible +
          " » (étape suivante : « " +
          (budgetSuivant(b.statut) || "aucune") +
          " »)."
        );
      if (cible == "vote" && !dobRenseigne(b))
        return "Vote impossible : le Débat d’Orientation Budgétaire (date et procès-verbal) n’est pas renseigné.";
      if (cible == "approuve") {
        if (!transmissionProuvee(b)) return "Approbation impossible : la preuve de transmission à la tutelle n’est pas enregistrée.";
        if (b.statut_tutelle != "approuve") return "Approbation impossible : la tutelle n’a pas approuvé le budget.";
      }
      return "";
    },
    /* Transmission à la tutelle (au statut « voté ») puis décision de la tutelle. */
    tutelleBlocage = (b, action, d) => {
      if (!b) return "Budget introuvable.";
      if (b.statut != "vote") return "La tutelle ne concerne qu’un budget au statut « voté ».";
      if (action == "transmettre") {
        if (!iso(d.date) || !plein(d.preuve)) return "La date et la preuve de transmission (référence ou lien) sont obligatoires.";
        if (iso(b.date_dob) && d.date < b.date_dob) return "La transmission ne peut pas précéder le Débat d’Orientation Budgétaire.";
        return "";
      }
      if (action == "approuve" || action == "rejete")
        return transmissionProuvee(b) ? "" : "Décision impossible : la preuve de transmission à la tutelle n’est pas enregistrée.";
      return "Action inconnue.";
    };

  /* ---------- Conseil municipal : convocation, quorum, procurations ---------- */
  const CONVOCATION_MIN_JOURS = 3,
    delaiConvocation = (jourSeance, dateConvocation, min = CONVOCATION_MIN_JOURS) => {
      if (!iso(jourSeance) || !iso(dateConvocation))
        return { ok: false, jours: null, message: "Dates de convocation ou de séance invalides." };
      const j = jours(dateConvocation, jourSeance);
      return j >= min
        ? { ok: true, jours: j, message: "" }
        : {
            ok: false,
            jours: j,
            message:
              "Convocation refusée : " +
              (j < 0 ? "postérieure à la séance" : "envoyée " + j + " jour(s) avant la séance") +
              " ; délai minimum " +
              min +
              " jours."
          };
    },
    /* Membres en exercice : conseillers actifs au statut « titulaire » (les suppléants n’entrent pas dans le décompte tant qu’ils ne siègent pas). */
    enExercice = cn => (cn || []).filter(c => c.actif !== false && (c.statut || "titulaire") == "titulaire"),
    quorumMin = n => (n > 0 ? Math.floor(n / 2) + 1 : 0),
    statutPresence = p => p.statut_presence || (p.present ? "present" : "absent"),
    /* Quorum = majorité des membres en exercice PRÉSENTS ; les procurations comptent pour le vote, jamais pour le quorum. */
    quorum = (cn, pr) => {
      const ex = enExercice(cn),
        ids = new Set(ex.map(c => c.id)),
        L = (pr || []).filter(p => ids.has(p.conseiller_id)),
        presents = L.filter(p => statutPresence(p) == "present").length,
        procurations = L.filter(p => statutPresence(p) == "procuration").length,
        requis = quorumMin(ex.length);
      return { membres: ex.length, requis, presents, procurations, atteint: ex.length > 0 && presents >= requis };
    },
    quorumBlocage = (cn, pr) => {
      const q = quorum(cn, pr);
      if (!q.membres) return "Quorum impossible à vérifier : aucun conseiller en exercice enregistré.";
      return q.atteint
        ? ""
        : "Quorum non atteint : " + q.presents + " présent(s) sur " + q.membres + " membres en exercice (minimum " + q.requis + ").";
    },
    /* Un élu ne peut détenir qu’une seule procuration ; le mandataire doit être un conseiller en exercice présent, et ne peut être son propre mandant.
       rows : [{ conseiller_id, statut_presence, mandataire_id }] ; nom : id -> libellé (facultatif). Retourne la liste des erreurs. */
    validerProcurations = (rows, cn, nom) => {
      const n = nom || (id => id),
        ex = new Set(enExercice(cn).map(c => c.id)),
        st = new Map((rows || []).map(r => [r.conseiller_id, r.statut_presence])),
        tenues = new Map(),
        err = [];
      (rows || []).forEach(r => {
        if (r.statut_presence != "procuration") {
          if (r.mandataire_id) err.push(n(r.conseiller_id) + " : un mandataire n’est possible qu’avec le statut « procuration ».");
          return;
        }
        if (!r.mandataire_id) return err.push(n(r.conseiller_id) + " : procuration sans mandataire.");
        if (r.mandataire_id == r.conseiller_id)
          return err.push(n(r.conseiller_id) + " : un élu ne peut pas se donner procuration à lui-même.");
        if (!ex.has(r.mandataire_id)) return err.push(n(r.conseiller_id) + " : le mandataire doit être un conseiller en exercice.");
        if (st.get(r.mandataire_id) != "present")
          err.push(n(r.conseiller_id) + " : le mandataire " + n(r.mandataire_id) + " doit être présent à la séance.");
        tenues.set(r.mandataire_id, (tenues.get(r.mandataire_id) || 0) + 1);
      });
      tenues.forEach((k, id) => {
        if (k > 1) err.push(n(id) + " : un élu ne peut détenir qu’une seule procuration (" + k + " reçues).");
      });
      return err;
    };

  /* ---------- Marchés publics : mode de passation (enum) et références de l'appel ---------- */
  const MODES_PASSATION = [
      ["appel_offres_ouvert", "Appel d’offres ouvert"],
      ["appel_offres_restreint", "Appel d’offres restreint"],
      ["consultation", "Consultation (demande de renseignements et de prix)"],
      ["gre_a_gre", "Gré à gré"]
    ],
    MODES_AO = ["appel_offres_ouvert", "appel_offres_restreint"],
    ATTRIBUES = ["attribue", "approuve", "en_cours", "receptionne"],
    marcheBlocage = m => {
      if (m.mode && !MODES_PASSATION.some(x => x[0] == m.mode)) return "Mode de passation invalide.";
      if (m.seuil_passation != null && m.seuil_passation !== "" && !(+m.seuil_passation >= 0))
        return "Le seuil de passation doit être positif ou nul.";
      if (MODES_AO.includes(m.mode)) {
        if (!["preparation", "annule"].includes(m.statut) && !plein(m.ref_publication_appel))
          return "Appel d’offres : la référence de publication de l’appel est obligatoire dès que le marché est lancé.";
        if (ATTRIBUES.includes(m.statut) && !plein(m.ref_attribution_appel))
          return "Appel d’offres : la référence d’attribution est obligatoire pour un marché attribué.";
      }
      return "";
    };

  /* ---------- Fiscalité : NINEA et circuit ordonnateur / comptable public ---------- */
  const NINEA_RE = /^[0-9A-Z]{7,12}$/,
    normNinea = v =>
      String(v == null ? "" : v)
        .replace(/[\s.\-]/g, "")
        .toUpperCase(),
    contribuableBlocage = c => {
      const n = normNinea(c.ninea);
      if (c.type == "entreprise" && !n) return "Le NINEA est obligatoire pour une entreprise.";
      if (n && !NINEA_RE.test(n)) return "NINEA invalide : 7 à 12 caractères (chiffres et lettres).";
      return "";
    },
    ORDONNATEURS = ["maire"] /* engage et ordonnance la dépense */,
    COMPTABLES = ["finances"] /* enregistre le paiement et la quittance du Trésor (comptable public / Receveur municipal) */,
    ENG_SUITE = { engage: ["liquide", "annule"], liquide: ["ordonnance", "annule"], ordonnance: ["paye", "annule"], paye: [], annule: [] },
    engagementBlocage = (e, cible, role, uid, d) => {
      if (!e) return "Engagement introuvable.";
      if (!(ENG_SUITE[e.statut] || []).includes(cible)) return "Transition interdite : « " + e.statut + " » → « " + cible + " ».";
      if (cible == "ordonnance" && !ORDONNATEURS.includes(role)) return "Seul l’ordonnateur (le Maire) peut ordonnancer une dépense.";
      if (cible == "paye") {
        if (!COMPTABLES.includes(role))
          return "Le paiement relève du comptable public : il est enregistré par le service des finances, jamais par l’ordonnateur.";
        if (uid && e.ordonnateur_id && uid == e.ordonnateur_id)
          return "L’ordonnateur ne peut pas enregistrer le paiement qu’il a ordonnancé.";
        if (!d || !plein(d.comptable_public) || !plein(d.ref_quittance_tresor) || !iso(d.date_paiement_tresor))
          return "Paiement : comptable public, référence de quittance du Trésor et date de paiement obligatoires.";
      }
      return "";
    },
    TRESOR_STATUTS = ["a_verser", "verse", "rapproche"],
    tresorBlocage = (statut, ref) =>
      TRESOR_STATUTS.includes(statut)
        ? statut != "a_verser" && !plein(ref)
          ? "La référence de quittance du Trésor est obligatoire."
          : ""
        : "Statut Trésor invalide.";

  /* ---------- Urbanisme : permis de construire ---------- */
  const PERMIS_ETAPES = ["depot", "instruction_services_techniques", "avis_commission", "decision_maire", "delivrance"],
    PERMIS_DELAI_MOIS = 3,
    /* date_depot + 3 mois (fin de mois conservée : 30 novembre + 3 mois = 28 ou 29 février, comme PostgreSQL). */
    dateLimiteInstruction = dep => {
      if (!iso(dep)) return null;
      const [y, m, d] = dep.split("-").map(Number),
        t = new Date(Date.UTC(y, m - 1 + PERMIS_DELAI_MOIS, 1)),
        fin = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
      t.setUTCDate(Math.min(d, fin));
      return t.toISOString().slice(0, 10);
    },
    /* Retourne "" si le passage à l’étape « cible » est permis, sinon le motif du blocage (pas de saut, pas de retour en arrière). */
    permisBlocage = (p, cible) => {
      if (!p) return "Dossier introuvable.";
      const i = PERMIS_ETAPES.indexOf(p.statut),
        k = PERMIS_ETAPES.indexOf(cible);
      if (k < 0) return "Étape inconnue.";
      if (k != i + 1) return "Étape interdite : « " + p.statut + " » → « " + cible + " » (les étapes se suivent sans saut ni retour).";
      if (cible == "avis_commission" && !plein(p.avis_services_techniques))
        return "L’instruction par les services techniques doit être validée (avis technique) avant la commission.";
      if (cible == "decision_maire" && !(plein(p.avis_commission) && iso(p.date_avis_commission)))
        return "L’avis de la commission (avec sa date) doit être enregistré avant la décision du Maire.";
      if (cible == "delivrance") {
        if (p.decision_maire != "accorde" || !iso(p.date_decision)) return "Délivrance impossible : le Maire n’a pas accordé le permis.";
        if (!plein(p.numero_permis) || !iso(p.date_delivrance)) return "Délivrance : numéro de permis et date de délivrance obligatoires.";
      }
      return "";
    },
    /* Silence de l’administration : délai d’instruction dépassé sans décision. « proche » = échéance dans les 15 jours. */
    permisDelai = (p, auj) => {
      const lim = p && (p.date_limite_instruction || dateLimiteInstruction(p.date_depot));
      if (!lim || !iso(auj)) return { etat: "inconnu", jours: null };
      if (p.statut == "delivrance" || p.decision_maire) return { etat: "termine", jours: null };
      const r = jours(auj, lim);
      return r < 0 ? { etat: "silence", jours: -r } : r <= 15 ? { etat: "proche", jours: r } : { etat: "dans_les_delais", jours: r };
    };

  const api = {
    BUDGET_ETAPES,
    TUTELLE,
    budgetSuivant,
    dobRenseigne,
    transmissionProuvee,
    budgetBlocage,
    tutelleBlocage,
    CONVOCATION_MIN_JOURS,
    delaiConvocation,
    enExercice,
    quorumMin,
    quorum,
    quorumBlocage,
    validerProcurations,
    MODES_PASSATION,
    MODES_AO,
    marcheBlocage,
    NINEA_RE,
    normNinea,
    contribuableBlocage,
    ORDONNATEURS,
    COMPTABLES,
    ENG_SUITE,
    engagementBlocage,
    TRESOR_STATUTS,
    tresorBlocage,
    PERMIS_ETAPES,
    PERMIS_DELAI_MOIS,
    dateLimiteInstruction,
    permisBlocage,
    permisDelai
  };
  if (typeof module != "undefined" && module.exports) module.exports = api;
  return api;
})();
