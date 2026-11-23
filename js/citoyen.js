const $ = s => document.querySelector(s);
const esc = s =>
  String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const NZ = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const fdt = t => new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const fdj = d =>
  new Date(String(d).slice(0, 10) + "T00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
/* Textes de l'interface : TX.fr est la référence. Pour le wolof ou le sereer, ajouter TX.wo / TX.sr avec des textes validés par un locuteur ; une clé absente retombe sur le français. */
const TX = {
  fr: {
    back: "← Retour",
    pick: "Que voulez-vous faire ?",
    delay: "Délai indicatif :",
    other: "Autre demande",
    otherSub: "Écrivez votre demande avec vos mots",
    found: "Démarches trouvées",
    none: "Aucun service ne correspond. Essayez un autre mot.",
    h_req: "Faire une demande",
    h_req_s: "Déposez votre dossier en ligne",
    h_trk: "Suivre ma demande",
    h_trk_s: "Consultez l’état d’avancement de votre dossier",
    h_rdv: "Prendre rendez-vous",
    h_rdv_s: "Avec le Maire ou un service",
    h_svc: "Nos services municipaux",
    h_trk_p: "Entrez le numéro de suivi reçu lors de votre demande",
    h_go: "Consulter",
    h_mine: "Mes demandes",
    h_dep: "Déposées",
    h_cur: "En cours",
    h_done: "Terminées",
    h_info: "Informations pratiques",
    h_contact: "Contact",
    h_call: "Appeler la mairie",
    h_mail: "Écrire un e-mail",
    h_actu: "Actualités de la commune",
    h_works: "Travaux et projets",
    h_trk_ph: "Numéro de suivi…",
    u_demande_enregistree: "Demande enregistrée.",
    u_votre_numero_de_suivi: "Votre numéro de suivi :",
    u_copier_le_numero: "Copier le numéro",
    u_reessayer: "Réessayer",
    u_espace_citoyen: "Espace citoyen",
    u_mairie_connectee: "Mairie connectée",
    u_les_services_de_votre: "Les services de votre mairie, en quelques clics",
    u_utilisez_le_lien_ou: "Utilisez le lien ou le QR code de votre mairie",
    u_pour_acceder_aux_services:
      "Pour accéder aux services de votre commune, ouvrez le lien officiel de votre mairie ou scannez le QR code affiché à la mairie.",
    u_j_ai_un_code: "J’ai un code de commune",
    u_code_de_la_commune: "Code de la commune",
    u_ouvrir: "Ouvrir",
    u_menu_principal: "Menu principal",
    u_aller_au_contenu: "Aller au contenu",
    u_menu: "Menu",
    u_bienvenue_sur_le: "Bienvenue sur le",
    u_portail_citoyen_de: "Portail Citoyen de",
    u_ma_mairie_a_portee: "Ma mairie, à portée de main !",
    u_effectuez_vos_demarches_suivez: "Effectuez vos démarches, suivez vos demandes et restez informé des services de votre mairie.",
    u_que_recherchez_vous: "Que recherchez-vous ?",
    u_rechercher_un_document_un: "Rechercher un document, un service ou une démarche",
    u_rechercher: "Rechercher",
    u_avancement: "Avancement",
    u_ajouter_les_pieces_demandees: "Ajouter les pièces demandées (3 maximum, photo ou PDF, 3 Mo)",
    u_envoyer_les_pieces: "Envoyer les pièces",
    u_service_responsable: "Service responsable :",
    u_historique: "Historique",
    u_service: "Service :",
    u_choisir: "Choisir",
    u_nous_n_avons_pas: "Nous n’avons pas trouvé ce document. Vous pouvez nous préciser votre besoin dans la rubrique Autres demandes.",
    u_autres_demandes: "Autres demandes",
    u_quel_document_recherchez_vous: "Quel document recherchez-vous ?",
    u_fermer: "Fermer",
    u_rechercher_un_document: "Rechercher un document…",
    u_rechercher_un_document2: "Rechercher un document",
    u_pieces_a_fournir: "Pièces à fournir",
    u_conditions: "Conditions :",
    u_frais: "Frais :",
    u_retrait: "Retrait :",
    u_la_mairie_vous_orientera: "La mairie vous orientera vers l’organisme compétent.",
    u_numero_de_l_acte: "Numéro de l’acte",
    u_annee_de_l_acte: "Année de l’acte",
    u_photo_ou_scan_de: "Photo ou scan de l’ancien extrait (3 maximum, photo ou PDF, 3 Mo)",
    u_nom_du_conjoint_facultatif: "Nom du conjoint (facultatif)",
    u_demande_en_ligne_le: "Demande en ligne. Le document se retire ensuite en mairie.",
    u_que_savez_vous: "Que savez-vous ?",
    u_nom_complet_de_la: "Nom complet de la personne concernée",
    u_verifier_ma_demande: "Vérifier ma demande",
    u_indiquez_le_nom_complet: "Indiquez le nom complet de la personne concernée.",
    u_indiquez_le_numero_de: "Indiquez le numéro de l’acte (chiffres et lettres).",
    u_indiquez_l_annee_de: "Indiquez l’année de l’acte (4 chiffres).",
    u_joignez_la_photo_ou: "Joignez la photo ou le scan de l’ancien extrait.",
    u_indiquez_votre_nom_complet: "Indiquez votre nom complet.",
    u_modifier: "← Modifier",
    u_verifiez_votre_demande: "Vérifiez votre demande",
    u_envoyer_ma_demande: "Envoyer ma demande",
    u_modifier2: "Modifier",
    u_joignez_les_pieces_demandees: "Joignez les pièces demandées.",
    u_demande_de_rendez_vous: "Demande de rendez-vous envoyée.",
    u_numero: "Numéro :",
    u_ce_n_est_pas: "Ce n’est pas encore une confirmation : le service vous répondra. Suivez-le dans « Mes rendez-vous ».",
    u_reponse: "Réponse :",
    u_annuler_ce_rendez_vous: "Annuler ce rendez-vous",
    u_mes_rendez_vous: "Mes rendez-vous",
    u_heure_souhaitee: "Heure souhaitée",
    u_impossible_de_lire_les: "Impossible de lire les heures libres. Vérifiez votre réseau puis choisissez à nouveau la date.",
    u_choisissez_le_service_et: "Choisissez le service et une date. Le rendez-vous n’est confirmé que lorsque le service vous répond.",
    u_avec_qui: "Avec qui ?",
    u_motif_du_rendez_vous: "Motif du rendez-vous",
    u_date_souhaitee: "Date souhaitée",
    u_indiquez_le_motif_en: "Indiquez le motif en quelques mots.",
    u_choisissez_une_date: "Choisissez une date.",
    u_choisissez_une_heure_parmi: "Choisissez une heure parmi les heures libres.",
    u_veuillez_valider_la_verification: "Veuillez valider la vérification anti-spam, puis réessayer.",
    u_verification_refusee_reessayez: "Vérification refusée. Réessayez.",
    u_modifier_mon_profil: "Modifier mon profil",
    u_votre_nom_complet: "Votre nom complet",
    u_telephone_facultatif_pour_vous: "Téléphone (facultatif, pour vous rappeler)",
    u_demarche: "Démarche",
    u_nature_de_la_demarche: "Nature de la démarche",
    u_objet_de_la_demande: "Objet de la demande",
    u_votre_message: "Votre message",
    u_pieces_justificatives_3_maximum: "Pièces justificatives (3 maximum, photo ou PDF, 3 Mo)",
    u_toutes_les_demandes_ne:
      "Toutes les demandes ne relèvent pas de la mairie. Si besoin, votre dossier sera réorienté vers le service de l’État ou l’organisme compétent.",
    u_mon_espace_citoyen: "Mon espace citoyen",
    u_votre_espace_personnel_prepare:
      "Votre espace personnel prépare son ouverture. Comme le baobab, il prend le temps de grandir avant d’offrir son ombre. En attendant, toutes vos démarches restent ouvertes, sans compte.",
    u_continuer_mes_demarches: "Continuer mes démarches",
    u_vous_etes_prevenu_des: "Vous êtes prévenu dès que votre dossier avance, même quand l’application est fermée.",
    u_desactiver_les_alertes: "Désactiver les alertes",
    u_les_notifications_sont_bloquees:
      "Les notifications sont bloquées dans votre navigateur. Autorisez-les dans ses réglages pour être prévenu.",
    u_recevez_une_alerte_quand: "Recevez une alerte quand votre dossier avance (titre seulement, sans détail personnel).",
    u_activer_les_alertes: "Activer les alertes",
    u_alertes_sur_ce_telephone: "Alertes sur ce téléphone",
    u_installer_l_application: "Installer l’application",
    u_sur_votre_telephone_acces: "sur votre téléphone : accès direct, sans passer par le navigateur.",
    u_installer: "Installer",
    u_plus_tard: "Plus tard",
    u_ajoutez_l_application_a: "Ajoutez l’application à votre écran d’accueil :",
    u_touchez_le_bouton_partager: "touchez le bouton Partager de Safari, puis « Sur l’écran d’accueil ».",
    u_masquer: "Masquer",
    u_langue: "Langue",
    u_accedez_a_votre_compte: "Accédez à votre compte pour gérer vos démarches.",
    u_se_connecter: "Se connecter",
    u_creer_un_compte: "Créer un compte",
    u_tel: "Tél. :",
    u_e_mail: "E-mail :",
    u_une_question_contactez_la: "Une question ? Contactez la mairie.",
    u_numero_de_suivi: "Numéro de suivi",
    u_service_gratuit_certaines_demarches:
      "Service gratuit. Certaines démarches nécessitent des pièces justificatives ou un passage en mairie.",
    u_ce_n_est_pas2: "Ce n’est pas votre commune ?",
    u_code_invalide: "Code invalide.",
    u_code_incorrect_ou_expire: "Code incorrect ou expiré.",
    u_indiquez_votre_prenom_et: "Indiquez votre prénom et votre nom.",
    u_enregistrement_impossible: "Enregistrement impossible.",
    u_entrez_votre_numero_de:
      "Entrez votre numéro de téléphone : vous recevrez un code par SMS. Si vous n’avez pas encore de compte, il est créé automatiquement. Vous retrouvez vos demandes sur tous vos appareils. Le compte est facultatif : vous pouvez aussi faire une demande sans compte.",
    u_valider: "Valider",
    u_changer_de_numero: "Changer de numéro",
    u_numero_de_telephone: "Numéro de téléphone",
    u_recevoir_le_code: "Recevoir le code",
    u_prenom: "Prénom",
    u_nom: "Nom",
    u_village_quartier_ou_adresse: "Village, quartier ou adresse",
    u_enregistrer: "Enregistrer",
    u_se_deconnecter: "Se déconnecter",
    u_tout_marquer_comme_lu: "Tout marquer comme lu",
    u_voir_le_dossier: "Voir le dossier",
    u_notifications: "Notifications",
    u_indiquez_votre_nom_et: "Indiquez votre nom et votre message.",
    u_choisissez_au_moins_une: "Choisissez au moins une pièce.",
    u_commune_introuvable_verifiez_le: "Commune introuvable. Vérifiez le code ou utilisez le lien de votre mairie.",
    u_ce_dossier_n_est: "Ce dossier n’est pas disponible dans cette commune.",
    u_annulation_impossible_ce_rendez: "Annulation impossible : ce rendez-vous n’est plus modifiable.",
    u_aucune_demande_avec_ce: "Aucune demande avec ce numéro. Vérifiez-le et réessayez.",
    u_erreur_reseau_reessayez: "Erreur réseau. Réessayez.",
    u_connexion_limitee_les_informations: "Connexion limitée : les informations affichées sont celles enregistrées sur cet appareil.",
    u_connexion_impossible_verifiez_votre: "Connexion impossible. Vérifiez votre réseau puis réessayez.",
    sl_nouvelle: "Demande envoyée",
    sl_orientee: "Transmise au service compétent",
    sl_en_cours: "En cours de traitement",
    sl_a_valider: "En cours de vérification",
    sl_en_attente_pieces: "Informations complémentaires nécessaires",
    sl_acceptee: "Demande acceptée",
    sl_pret_a_retirer: "Document prêt à retirer",
    sl_traitee: "Demande terminée",
    sl_redirigee: "Réorientée vers l’organisme compétent",
    sl_rejetee: "Demande rejetée",
    sl_cloturee: "Dossier clôturé",
    sx_nouvelle: "La mairie a bien reçu votre demande.",
    sx_orientee: "Votre demande a été confiée au service qui s’en occupe.",
    sx_en_cours: "Un agent de la mairie traite votre demande.",
    sx_a_valider: "Votre dossier est relu avant la décision.",
    sx_en_attente_pieces: "Il manque des informations ou des pièces. Envoyez-les ci-dessous.",
    sx_acceptee: "Votre demande est acceptée. La mairie prépare la suite.",
    sx_pret_a_retirer: "Votre document est prêt. Il se retire en mairie.",
    sx_traitee: "Votre demande est terminée. Lisez la réponse de la mairie.",
    sx_redirigee: "Cette demande relève d’un autre organisme. Lisez l’explication ci-dessous.",
    sx_rejetee: "Votre demande n’a pas pu être acceptée. Le motif est indiqué ci-dessous.",
    sx_cloturee: "Ce dossier est fermé.",
    sv_secretariat: "Secrétariat",
    sv_etat_civil: "Service de l’état civil",
    sv_technique: "Service technique",
    sv_finances: "Finances",
    sv_rh: "Ressources humaines",
    sv_maire: "Cabinet du Maire",
    sv_adjoint: "Adjoint au Maire",
    sv_externe: "Organisme compétent",
    rvs_demandee: "En attente de confirmation",
    rvs_confirmee: "Rendez-vous confirmé",
    rvs_refusee: "Créneau non disponible",
    rvs_annulee: "Annulé",
    rvx_demandee: "Le service a reçu votre demande. Vous serez prévenu dès qu’il confirme une date.",
    rvx_confirmee: "Présentez-vous à la date et à l’heure indiquées.",
    rvx_refusee: "Le service ne peut pas vous recevoir à cette date. Lisez sa réponse.",
    rvx_annulee: "Ce rendez-vous est annulé.",
    pcl_actualite: "Actualité",
    pcl_communique: "Communiqué",
    pcl_avis: "Avis",
    pcl_evenement: "Événement",
    pjl_programme: "Programmé",
    pjl_en_cours: "En cours",
    pjl_en_attente: "En attente",
    pjl_en_retard: "En retard",
    pjl_termine: "Terminé",
    st_0: "Envoyée",
    st_1: "Transmise",
    st_2: "Traitement",
    st_3: "Vérification",
    st_4: "Réponse",
    v_conservez_le_votre_dossier:
      "Conservez-le. Votre dossier est aussi dans votre espace, rubrique « Mes demandes », et vous serez notifié à chaque étape.",
    v_conservez_le_il_vous:
      "Conservez-le : il vous permet de suivre votre dossier. Il est aussi enregistré dans « Mes demandes » sur cet appareil.",
    v_votre_mairie_a_votre: "Votre mairie à votre service",
    v_en_cours_d_orientation: "En cours d’orientation",
    v_retrait_lieu_et_modalites: "Retrait : lieu et modalités",
    v_reponse_de_la_mairie: "Réponse de la mairie",
    v_je_connais_le_numero: "Je connais le numéro et l’année de l’acte",
    v_j_ai_un_ancien: "J’ai un ancien extrait ou une photocopie",
    v_personne_concernee: "Personne concernée",
    v_annee: "Année",
    v_pieces_jointes: "Pièces jointes",
    v_telephone: "Téléphone",
    v_vous_serez_prevenu_dans: "Vous serez prévenu dans votre espace.",
    v_gardez_le_numero_de: "Gardez le numéro de suivi qui vous sera donné.",
    v_cette_heure_n_est: "Cette heure n’est plus disponible. Choisissez une autre heure.",
    v_date_refusee_choisissez_un: "Date refusée : choisissez un jour dans les 90 prochains jours.",
    v_vous_avez_deja_3: "Vous avez déjà 3 demandes en attente.",
    v_envoi_impossible_verifiez_les: "Envoi impossible. Vérifiez les champs et réessayez.",
    v_notifications_non_autorisees_vous: "Notifications non autorisées : vous pouvez les activer dans les réglages du navigateur.",
    v_notifications_activees_sur_cet: "Notifications activées sur cet appareil.",
    v_notifications_desactivees_sur_cet: "Notifications désactivées sur cet appareil.",
    v_aucune_demande_deposee_sur: "Aucune demande déposée sur cet appareil.",
    v_numero_invalide_exemple_77: "Numéro invalide. Exemple : 77 123 45 67",
    v_la_connexion_par_sms: "La connexion par SMS n’est pas encore disponible. Vous pouvez quand même déposer une demande sans compte.",
    v_envoi_du_sms_impossible: "Envoi du SMS impossible. Réessayez plus tard.",
    v_connexion_reussie: "Connexion réussie.",
    v_compte_cree_completez_votre: "Compte créé. Complétez votre profil ci-dessous : vous ne le ressaisirez plus.",
    v_profil_enregistre: "Profil enregistré.",
    v_se_connecter_ou_creer: "Se connecter ou créer un compte",
    v_format_non_accepte_photo: "Format non accepté : photo ou PDF uniquement.",
    v_une_piece_depasse_3: "Une pièce dépasse 3 Mo.",
    v_piece_illisible_utilisez_une: "Pièce illisible. Utilisez une photo JPEG/PNG ou un PDF.",
    v_envoi_d_une_piece: "Envoi d’une pièce impossible. Utilisez une photo ou un PDF.",
    v_piece_illisible: "Pièce illisible.",
    v_envoi_d_une_piece2: "Envoi d’une pièce impossible.",
    v_envoi_impossible_le_dossier: "Envoi impossible : le dossier n’attend plus de pièces.",
    v_copie: "Copié",
    v_envoi_en_cours: "Envoi en cours…",
    v_annuler_ce_rendez_vous: "Annuler ce rendez-vous ?",
    v_rendez_vous_annule_le: "Rendez-vous annulé. Le service est prévenu."
  }
};
/* Langues supplémentaires (wolof, sereer) : fournies par js/i18n.js et activées seulement après validation linguistique complète. */
if (typeof window != "undefined" && window.MC_TX) for (const l in window.MC_TX) TX[l] = Object.assign({}, window.MC_TX[l]);
const tr = k => (TX[(typeof S != "undefined" && S.lang) || "fr"] || {})[k] || TX.fr[k];
/* Table de libellés dépendant de la langue courante : lk("sl_")[clé] → tr("sl_"+clé) (évalué à l’affichage). */
const lk = p => new Proxy({}, { get: (_, k) => (typeof k == "string" ? tr(p + k) : undefined) });
const URLS = "https://aiqegpijisspankpkwfj.supabase.co";
const sb = supabase.createClient(URLS, "sb_publishable__Zc0adl_eD_PyMkaR5ACzA_-_yjwmbI", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "mc-cit" }
});
const TS_KEY = "0x4AAAAAAF7OVwUkBsAvSANV";
/* Turnstile : (re)dessine le widget dans #ts sans refaire tout l'écran (les saisies sont conservées) */
function tsr() {
  const e = $("#ts");
  if (e && !e.firstChild && window.turnstile)
    try {
      turnstile.render("#ts", {
        sitekey: TS_KEY,
        language: "fr",
        callback: x => {
          S.tok = x;
        },
        "expired-callback": () => {
          S.tok = "";
        }
      });
    } catch (x) {}
}
window.tsReady = tsr;
const SL = lk("sl_");
const SX = lk("sx_");
const STEP = {
    nouvelle: 1,
    orientee: 2,
    en_cours: 3,
    a_valider: 4,
    acceptee: 4,
    traitee: 5,
    pret_a_retirer: 5,
    redirigee: 5,
    rejetee: 5,
    cloturee: 5,
    en_attente_pieces: 3
  },
  ST = { map: f => [0, 1, 2, 3, 4].map(i => tr("st_" + i)).map(f) };
const SV = lk("sv_");
const IC = {
  doc: '<path d="M6 2h8l5 5v15H6z"/><path d="M9 13h7M9 17h7"/>',
  docp: '<path d="M6 2h8l5 5v15H6z"/><path d="M12 11v7M8.5 14.5h7"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  heart: '<path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/>',
  tools: '<path d="M14 3l7 7-3 3-7-7zM3 21l8-8"/>',
  pin: '<path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.5"/>',
  leaf: '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15zM5 19l8-8"/>',
  cap: '<path d="M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H3v2a4 4 0 0 0 4 4M17 6h4v2a4 4 0 0 1-4 4M12 14v4M8 21h8"/>',
  shop: '<path d="M3 9l2-5h14l2 5M4 9v11h16V9M9 20v-6h6v6"/>',
  sprout: '<path d="M12 21v-9M12 12c0-4-3-6-7-6 0 4 3 6 7 6zM12 14c0-3 2-5 6-5 0 3-2 5-6 5z"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 7v6M12 16v1"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6M17 14c3 0 5 1.5 5 5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
  home: '<path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z"/>',
  chart: '<path d="M4 20V10h4v10zM10 20V4h4v16zM16 20v-7h4v7z"/>',
  chat: '<path d="M4 4h16v12H9l-5 4z"/>',
  phone: '<path d="M5 3h4l2 5-2 1c1 2 3 4 6 6l1-2 5 2v4c0 1-1 2-2 2C10 21 3 14 3 5c0-1 1-2 2-2z"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17v1"/>',
  arr: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  news: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h6M8 13h6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/>'
};
const ic = (n, s = 30) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;
/* [intitulé, icône, description courte, types de démarches (valeurs autorisées par la base)] */
const CATS = [
  ["État civil et documents", "doc", "Extraits de naissance, mariage, décès, certificats", ["État civil"]],
  ["Audiences et rendez-vous", "cal", "Rencontrer le Maire ou un responsable", ["Audience"]],
  ["Urbanisme et foncier", "home", "Parcelles, permis, autorisations", ["Urbanisme"]],
  ["Santé et aide sociale", "heart", "Aides et soutien aux personnes en difficulté", ["Aide sociale"]],
  ["Voirie et travaux", "tools", "Routes, éclairage, signaler un problème de voirie", ["Travaux publics"]],
  ["Environnement et assainissement", "leaf", "Déchets, hygiène, espaces verts", ["Environnement"]],
  ["Éducation et jeunesse", "cap", "Écoles, inscriptions, bourses", ["Éducation"]],
  ["Économie locale", "shop", "Commerce, agriculture, élevage et pêche", ["Commerce", "Agriculture et pêche"]],
  ["Sport, culture et associations", "trophy", "Équipements, événements, partenariats", ["Sport et culture", "Associations"]],
  ["Participation citoyenne et réclamations", "chat", "Signaler un problème, proposer une idée", ["Réclamations"]]
];
let S = {
  lst: false,
  ls: false,
  lang: "fr",
  cid: null,
  co: "",
  slug: "",
  slug0: "",
  info: {},
  idt: {},
  pt: {},
  cat: null,
  q: "",
  mine: [],
  err: "",
  ok: "",
  tr: "",
  res: null,
  pub: [],
  pj: [],
  dm: [],
  tok: "",
  d: {},
  menu: false,
  sc: "",
  from: "",
  prof: null,
  nt: [],
  au: {},
  rdv: false,
  rv: [],
  rok: "",
  rinf: "",
  plan: null
};
const KM = () => "mc_d_" + S.slug,
  getM = () => {
    try {
      return JSON.parse(localStorage.getItem(KM()) || "[]");
    } catch (e) {
      return [];
    }
  },
  addM = n => {
    try {
      const l = getM().filter(x => x != n);
      l.unshift(n);
      localStorage.setItem(KM(), JSON.stringify(l.slice(0, 30)));
    } catch (e) {}
  };
/* --- Identité de la commune : thème, manifest PWA propre à la commune, cache hors-ligne --- */
const SHIELD =
  '<svg width="56" height="56" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l9 3v6c0 5-4 9-9 11C7 20 3 16 3 11V5z"/></svg>';
const cnm = () => String(S.co || "").replace(/^Commune de\s+/i, "");
/* Le bucket « identite » est privé : blason et bannière sont lus par liens signés (lecture anonyme limitée par la politique identite_published_assets_read) ; repli sur l'URL publique si la signature échoue. */
const pubI = n => URLS + "/storage/v1/object/public/identite/" + S.cid + "/" + n;
async function signIdt() {
  const w = [];
  if (S.idt && S.idt.blason) w.push("blason.webp");
  w.push("bandeau.webp", "bandeau-m.webp");
  S.u = {};
  if (S.idt && S.idt.blason) S.u["blason.webp"] = pubI("blason.webp");
  if (S.pt && S.pt.bandeau) {
    S.u["bandeau.webp"] = pubI("bandeau.webp");
    S.u["bandeau-m.webp"] = pubI("bandeau-m.webp");
  }
  if (!S.cid || !sb.storage || !sb.storage.from) return;
  try {
    const r = await sb.storage.from("identite").createSignedUrls(
      w.map(n => S.cid + "/" + n),
      21600
    );
    (r.data || []).forEach(x => {
      if (x && x.signedUrl && !x.error) S.u[String(x.path).split("/").pop()] = x.signedUrl;
    });
  } catch (e) {}
}
const blUrl = () => (S.idt && S.idt.blason && S.cid ? (S.u || {})["blason.webp"] || pubI("blason.webp") : "");
/* photo de bannière : deux fichiers WebP publiés par la commune (bandeau.webp ordinateur, bandeau-m.webp mobile) */
const bnUrl = () => (S.cid && (S.u || {})["bandeau.webp"]) || "";
const bnM = () => (S.u || {})["bandeau-m.webp"] || bnUrl();
const okCol = c => {
  if (!/^#[0-9a-f]{6}$/i.test(c || "")) return false;
  const v = [1, 3, 5]
    .map(i => parseInt(c.slice(i, i + 2), 16) / 255)
    .map(x => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2] < 0.3;
};
function theme() {
  const c = S.idt && okCol(S.idt.couleur) ? S.idt.couleur : "";
  try {
    if (c) document.documentElement.style.setProperty("--g", c);
    else document.documentElement.style.removeProperty("--g");
    let m = document.querySelector('meta[name="theme-color"]');
    if (!m) {
      m = document.createElement("meta");
      m.name = "theme-color";
      document.head.appendChild(m);
    }
    m.content = c || "#0B5A2E";
  } catch (e) {}
}
let MF0 = null,
  MFU = null;
function touchIcon(u) {
  try {
    let l = document.querySelector('link[rel="apple-touch-icon"]');
    if (!l) {
      l = document.createElement("link");
      l.rel = "apple-touch-icon";
      document.head.appendChild(l);
    }
    l.href = u;
  } catch (e) {}
}
function manifest() {
  try {
    let l = document.querySelector('link[rel="manifest"]');
    if (!l) {
      l = document.createElement("link");
      l.rel = "manifest";
      document.head.appendChild(l);
    }
    if (MF0 === null) MF0 = l.getAttribute("href") || "/manifest-citoyen.webmanifest";
    if (MFU) {
      URL.revokeObjectURL(MFU);
      MFU = null;
    }
    if (!S.slug || !S.co) {
      l.removeAttribute("crossorigin");
      l.setAttribute("href", MF0);
      return;
    }
    /* Manifest serveur par commune (URL réelle, nécessaire à l'installation Android) ; repli sur le manifest local si indisponible */
    const fu = URLS + "/functions/v1/manifest-commune?c=" + encodeURIComponent(S.slug) + "&o=" + encodeURIComponent(location.origin);
    if (S.mfs === "ok:" + S.slug) {
      l.setAttribute("crossorigin", "anonymous");
      l.setAttribute("href", fu);
      return;
    }
    if (S.mfs !== "try:" + S.slug && typeof fetch == "function") {
      S.mfs = "try:" + S.slug;
      const sl = S.slug;
      fetch(fu).then(
        r => {
          if (r.ok && S.slug === sl) {
            S.mfs = "ok:" + sl;
            manifest();
          }
        },
        () => {}
      );
    }
    l.removeAttribute("crossorigin");
    const o = location.origin,
      st = o + "/?c=" + encodeURIComponent(S.slug),
      b = blUrl();
    let ic = [
      { src: o + "/icon-defaut-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: o + "/icon-defaut-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: o + "/icon-defaut-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ];
    const ib = URLS + "/storage/v1/object/public/icones-pwa/" + S.cid + "/";
    if (b && S.icn === undefined && typeof fetch == "function") {
      S.icn = null;
      try {
        fetch(ib + "icon-192.png", { method: "HEAD" }).then(
          r => {
            S.icn = !!r.ok;
            if (r.ok) manifest();
          },
          () => {
            S.icn = false;
          }
        );
      } catch (e) {
        S.icn = false;
      }
    }
    if (b && S.icn === true) {
      ic = [
        { src: ib + "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: ib + "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: ib + "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
      ];
      touchIcon(ib + "icon-192.png");
    }
    const m = {
      id: "/?c=" + S.slug,
      name: "Mairie de " + S.co,
      short_name:
        String(S.co)
          .replace(/^Commune de\s+/i, "")
          .slice(0, 12) || "Mairie",
      description: "Services municipaux de " + S.co,
      lang: "fr",
      start_url: st,
      scope: o + "/",
      display: "standalone",
      orientation: "portrait",
      theme_color: S.idt && okCol(S.idt.couleur) ? S.idt.couleur : "#0B5A2E",
      background_color: "#F3F6F1",
      icons: ic
    };
    MFU = URL.createObjectURL(new Blob([JSON.stringify(m)], { type: "application/manifest+json" }));
    l.setAttribute("href", MFU);
  } catch (e) {}
}
/* si la CSP interdit le manifest en blob:, on revient au manifest statique (jamais de PWA cassée) */
addEventListener("securitypolicyviolation", e => {
  if (/^blob:/.test(e.blockedURI || "") && /manifest/.test(e.violatedDirective || "")) {
    const l = document.querySelector('link[rel="manifest"]');
    if (l && MF0) l.setAttribute("href", MF0);
  }
});
/* images de l'identité : si le fichier public est introuvable, repli propre (écusson par défaut / bannière sans photo) */
addEventListener(
  "error",
  e => {
    const t = e.target;
    if (!t || t.tagName != "IMG") return;
    if (t.classList.contains("bz")) {
      S.idt = Object.assign({}, S.idt, { blason: false });
      t.outerHTML = SHIELD;
    } else if (t.classList.contains("bn")) {
      S.pt = Object.assign({}, S.pt, { bandeau: false });
      const p = t.closest("picture");
      if (p) p.remove();
    }
  },
  true
);
const CK = s => "mc_ci_" + s;
const cacheSet = () => {
  try {
    localStorage.setItem(
      CK(S.slug),
      JSON.stringify({ id: S.cid, nom: S.co, info: S.info, idt: S.idt, pt: S.pt, pub: S.pub, pj: S.pj, dm: S.dm })
    );
  } catch (e) {}
};
const cacheGet = s => {
  try {
    return JSON.parse(localStorage.getItem(CK(s)) || "null");
  } catch (e) {
    return null;
  }
};
/* Lot 4 : les dossiers du compte sont lus côté serveur à chaque fois et ne sont JAMAIS recopiés dans le stockage de l'appareil (appareil partagé : après déconnexion, ils disparaissent). Seuls les dossiers déposés sans compte restent mémorisés sur l'appareil. */
async function loadMine() {
  try {
    let acc = [];
    if (S.user && S.slug) {
      const r = await sb.rpc("mes_demandes_compte", { p_commune: S.slug });
      acc = (r.data || []).map(x => x.numero);
    }
    const l = [...new Set([...acc, ...getM()])];
    S.mine = l.length ? (await sb.rpc("suivre_demandes", { p_commune: S.slug, p_numeros: l })).data || [] : [];
  } catch (e) {
    S.mine = S.mine || [];
  }
}
async function choose(c) {
  S.slug = c.slug;
  S.err = "";
  S.ok = "";
  S.res = null;
  S.cat = null;
  S.slug0 = "";
  try {
    history.replaceState(null, "", "?c=" + c.slug);
    localStorage.setItem("mc_co", c.slug);
  } catch (e) {}
  let i, p, dm, id, pt, pl;
  try {
    [i, p, dm, id, pt, pl] = await Promise.all([
      sb.rpc("infos_commune", { p_commune: c.slug }),
      sb.rpc("actualites", { p_commune: c.slug }),
      sb.rpc("demarches_commune", { p_commune: c.slug }),
      sb.rpc("identite_commune", { p_commune: c.slug }),
      sb.rpc("portail_commune", { p_commune: c.slug }).then(
        r => r,
        () => ({ data: [] })
      ),
      sb.rpc("planning_rdv", { p_commune: c.slug }).then(
        r => r,
        () => ({ data: [] })
      )
    ]);
    if (i.error) throw i.error;
  } catch (e) {
    S.slug = "";
    throw e;
  }
  S.co = c.nom;
  S.cid = c.id;
  S.icn = undefined;
  S.dm = dm.data || [];
  S.info = (i.data || [])[0] || {};
  S.pub = p.data || [];
  S.pj = S.pj || [];
  S.idt = (id.data || [])[0] || {};
  S.pt = (pt && !pt.error && (pt.data || [])[0]) || {};
  {
    const q = pl && !pl.error && (pl.data || [])[0];
    S.plan = q && q.actif && Array.isArray(q.jours) && q.jours.length ? q : null;
  }
  await signIdt();
  cacheSet();
  /* Chargement en deux temps : l'accueil s'affiche dès les informations essentielles ; dossiers personnels, rendez-vous et projets arrivent ensuite (rendu relancé). */
  const cs = c.slug;
  S.l2 = Promise.all([
    loadMine(),
    loadRdv(),
    sb.rpc("projets_publics", { p_commune: cs }).then(
      r => r,
      () => ({ data: [] })
    )
  ])
    .then(([, , pj]) => {
      if (S.slug !== cs) return;
      S.pj = (pj && !pj.error && pj.data) || [];
      cacheSet();
      if (!S.cat && !S.res && !S.rdv && !S.esp) render();
    })
    .catch(() => {});
  await Promise.race([S.l2, new Promise(r => setTimeout(r, 1200))]);
}
const comp = async f => {
  const im = await createImageBitmap(f);
  let k = Math.min(1, 1800 / Math.max(im.width, im.height)),
    q = 0.82,
    b;
  for (let n = 0; n < 6; n++) {
    const c = document.createElement("canvas");
    c.width = Math.round(im.width * k);
    c.height = Math.round(im.height * k);
    c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
    b = await new Promise(r => c.toBlob(r, "image/webp", q));
    if (b.type != "image/webp") b = await new Promise(r => c.toBlob(r, "image/jpeg", q));
    if (b.size <= 500000) break;
    if (q > 0.7) q -= 0.04;
    else k *= 0.88;
  }
  return b;
};
const msgs = () =>
  (S.err ? `<div class="al" role="alert">${esc(S.err)}</div>` : "") +
  (S.rinf ? `<div class="okb" role="status">${esc(S.rinf)}</div>` : "") +
  (S.rok ? RKB() : "") +
  (S.ok
    ? `<div class="okb" role="status"><b>${tr("u_demande_enregistree")}</b><br>${tr("u_votre_numero_de_suivi")} <b class="c-fs20">${esc(S.ok)}</b><br><span class="sm">${S.user ? tr("v_conservez_le_votre_dossier") : tr("v_conservez_le_il_vous")}</span><p class="c-m10"><button class="bo" data-a="copy">${tr("u_copier_le_numero")}</button></p></div>`
    : "");
/* Sans commune : jamais de liste. Message clair + saisie du code discrète */
const pick = () =>
  `<div class="hd"><div class="in"><span class="pill">${tr("u_espace_citoyen")}</span><h1>${tr("u_mairie_connectee")}</h1><p class="sl">${tr("u_les_services_de_votre")}</p></div></div><main id="mc" class="mn">${msgs()}<div class="cd"><h2>${tr("u_utilisez_le_lien_ou")}</h2><p>${tr("u_pour_acceder_aux_services")}</p>${S.slug0 ? `<p><button class="bt" data-a="retry">${tr("u_reessayer")}</button></p>` : ""}<details class="c-mt14"><summary class="c-cpt">${tr("u_j_ai_un_code")}</summary><label for="cc">${tr("u_code_de_la_commune")}</label><input id="cc" autocapitalize="none" autocomplete="off" placeholder="Ex. fimela"><p class="c-mt12"><button class="bt" data-a="goc">${tr("u_ouvrir")}</button></p></details></div></main>`;
const unread = () => (S.nt || []).filter(n => !n.lu).length,
  btl = () => "Mon espace" + (S.user && unread() ? " (" + unread() + ")" : "");
const logo = () =>
  blUrl() ? `<img class="bz c-bz56" src="${esc(blUrl())}" alt="Blason de la commune de ${esc(cnm())}" width="56" height="56">` : SHIELD;
/* --- En-tête commun à tous les écrans : logo, nom, navigation, Mon espace, menu mobile --- */
const NAVL = [
  ["top", "Accueil"],
  ["services", "Nos services"],
  ["actus", "Actualités"],
  ["infos", "Informations pratiques"],
  ["contact", "Contact"]
];
const navb = c => NAVL.map(n => `<button class="${c}" data-a="goto" data-t="${n[0]}">${n[1]}</button>`).join("");
const head = () =>
  `<header class="tp" id="top"><a class="sk" href="#mc">${tr("u_aller_au_contenu")}</a><div class="in hdr">${logo()}<div class="hn"><b class="tn"><small>Commune de</small> ${esc(cnm())}</b><i class="ts">${esc(S.info.slogan || tr("v_votre_mairie_a_votre"))}</i></div><nav class="nv" aria-label="${tr("u_menu_principal")}">${navb("nl")}</nav><button class="bt tm" data-a="esp">${btl()}</button><button class="mb" data-a="mnu" aria-label="${tr("u_menu")}" aria-expanded="${S.menu ? "true" : "false"}" aria-controls="mnav">${ic(S.menu ? "x" : "menu", 26)}</button></div>${S.menu ? `<nav id="mnav" class="mnv" aria-label="${tr("u_menu_principal")}">${navb("ml")}</nav>` : ""}</header>`;
const bnP = () => {
  const u = bnUrl();
  return u
    ? `<picture class="hph"><source media="(max-width:720px)" srcset="${esc(bnM())}"><img class="bn" src="${esc(u)}" alt="Mairie de ${esc(cnm())}" fetchpriority="high" decoding="async"></picture>`
    : "";
};
const hero = () =>
  `<section class="hero${bnUrl() ? " ph" : ""}">${bnP()}<div class="in hc"><h1>${tr("u_bienvenue_sur_le")}<br>${tr("u_portail_citoyen_de")} <span class="gl">${esc(cnm())}</span></h1><p class="sg">${tr("u_ma_mairie_a_portee")}</p><p class="hsub">${tr("u_effectuez_vos_demarches_suivez")}</p><div class="sr2">${ic("search", 22)}<input id="q" type="search" placeholder="${tr("u_que_recherchez_vous")}" aria-label="${tr("u_rechercher_un_document_un")}" enterkeyhint="search" value="${esc(S.q)}"><button class="bt" data-a="srch">${tr("u_rechercher")}</button></div></div></section>`;
const dmt = c =>
  (S.dm || [])
    .filter(x => c[3].includes(x.type))
    .map(x => x.titre)
    .join(" ");
const tiles = () => {
  const t = CATS.filter(c => !S.q || NZ(c[0] + " " + c[2] + " " + dmt(c)).includes(NZ(S.q)))
      .map(
        c =>
          `<button class="tt" data-a="cat" data-c="${esc(c[0])}"><span class="ico">${ic(c[1], 28)}</span><span class="tx"><b>${esc(c[0])}</b><span>${esc(c[2])}</span></span></button>`
      )
      .join(""),
    h = hits();
  return (
    (t || h.length ? "" : `<p class="mu">${tr("none")}</p>`) +
    t +
    (h.length
      ? `<div class="c-hitg"><b>${tr("found")}</b>${h.map(x => `<button class="tt" data-a="hit" data-c="${esc(x.c)}" data-d="${esc(x.d || "")}" data-r="${esc(x.r || "")}"><span class="tx"><b>${esc(x.l)}</b><span>${esc(x.c)}</span></span></button>`).join("")}</div>`
      : "")
  );
};
const bd = s =>
  `<span class="bd ${["traitee", "redirigee", "cloturee", "acceptee", "pret_a_retirer"].includes(s) ? "ok" : ["en_cours", "orientee", "a_valider"].includes(s) ? "bl" : ""}">${SL[s] || s}</span>`;
const steps = s =>
  `<div class="stp" aria-label="${tr("u_avancement")}">${ST.map((x, i) => `<div><i class="${i < (STEP[s] || 1) ? "on" : ""}"></i><small>${x}</small></div>`).join("")}</div>`;
const detail = () => {
  const r = S.res;
  return `${head()}<main id="mc" class="mn nh">${msgs()}<div class="cd"><button class="lk c-cg" data-a="back">${tr("back")}</button><h1>${esc(r.type)}</h1><p class="mu sm">Dossier ${esc(r.numero)} · déposé le ${fdt(r.cree)}</p>${bd(r.statut)}${steps(r.statut)}<p>${esc(SX[r.statut] || "")}</p><p><b>${tr("u_service_responsable")}</b> ${esc(SV[r.service] || tr("v_en_cours_d_orientation"))}</p>${r.reponse ? `<div class="okb"><b>${r.statut == "rejetee" ? "Motif du rejet" : r.statut == "en_attente_pieces" ? tr("u_pieces_a_fournir") : r.statut == "pret_a_retirer" ? tr("v_retrait_lieu_et_modalites") : tr("v_reponse_de_la_mairie")}</b><br>${esc(r.reponse).replace(/\n/g, "<br>")}</div>${r.statut == "pret_a_retirer" ? retrait() : ""}` : '<p class="mu">Aucune réponse pour le moment. Revenez consulter ce dossier plus tard.</p>'}${r.statut == "en_attente_pieces" ? `<label for="cf">${tr("u_ajouter_les_pieces_demandees")}</label><input id="cf" type="file" multiple accept="image/*,application/pdf">${S.user ? "" : '<div id="ts"></div>'}<p><button class="bt" data-a="cmpl">${tr("u_envoyer_les_pieces")}</button></p>` : ""}<h3 class="c-fs16mt">${tr("u_historique")}</h3><ul class="hs">${(r.historique || []).map(h => `<li>${fdt(h.date)} : ${esc(SL[h.statut] || h.statut)}</li>`).join("")}</ul></div></main>`;
};
/* Raccourcis en mots simples : simples libellés d'une demande libre dans la rubrique (aucune donnée de mairie inventée). Les démarches configurées par la mairie passent en premier. */
const RAC = {
  "État civil et documents": [
    "Demander un extrait de naissance",
    "Demander un extrait de mariage",
    "Demander un extrait de décès",
    "Demander un certificat de résidence"
  ],
  "Voirie et travaux": ["Signaler un problème de voirie"],
  "Participation citoyenne et réclamations": ["Signaler un problème", "Faire une suggestion"]
};
const racL = () => RAC[S.cat] || [];
const hits = () => {
  const q = NZ(S.q || "");
  if (!q) return [];
  const o = [];
  CATS.forEach(c => {
    const D = (S.dm || []).filter(x => c[3].includes(x.type) && NZ(x.titre + " " + (x.description || "")).includes(q));
    D.forEach(x => o.push({ c: c[0], d: x.id, l: x.titre }));
    (RAC[c[0]] || []).filter(r => NZ(r).includes(q) && !D.some(x => NZ(x.titre) == NZ(r))).forEach(r => o.push({ c: c[0], r, l: r }));
  });
  return o.slice(0, 8);
};
/* Lots 1-2 : 4 grandes cartes + boîte de dialogue « Autres documents » */
const EC = "État civil et documents";
const ECC = [
  ["Demander un extrait de naissance", "Acte de naissance déjà enregistré", "docp"],
  ["Demander un extrait de mariage", "Acte de mariage déjà enregistré", "heart"],
  ["Demander un extrait de décès", "Acte de décès déjà enregistré", "doc"],
  ["Demander un certificat de résidence", "Attestation de votre domicile dans la commune", "home"]
];
const big = (a, at, t, u, i) =>
  `<button class="tt big" data-a="${a}" ${at}><span class="ico">${ic(i, 30)}</span><span class="tx"><b>${esc(t)}</b>${u ? `<span>${esc(u)}</span>` : ""}</span></button>`;
const lstv = () => {
  if (S.cat != EC) return lstv0();
  const c = CATS[0];
  return `${head()}<main id="mc" class="mn nh">${msgs()}<div class="cd"><button class="lk c-cg" data-a="back">${tr("back")}</button><h1>${ic(c[1], 26)} ${esc(c[0])}</h1><p class="mu">${tr("pick")}</p><div class="tl c-gc1">${ECC.map(x => big("rc", `data-r="${esc(x[0])}"`, x[0], x[1], x[2])).join("")}${big("dlgo", "", "Autres documents", "Vous recherchez un autre document ou une autre démarche municipale ? Consultez notre catalogue.", "search")}</div></div></main>`;
};
const fam = x => x.famille || x.type;
const svOf = x =>
  x.service && SV[x.service]
    ? SV[x.service]
    : x.autorite
      ? x.autorite
      : { "État civil": SV.etat_civil, "Travaux publics": SV.technique }[x.type] || SV.secretariat;
const dlgItems = () => {
  const q = NZ(S.dq || ""),
    c = S.dc || "";
  return (S.dm || []).filter(
    x =>
      x.statut != "archive" &&
      x.statut != "inactif" &&
      (!c || fam(x) == c) &&
      (!q || NZ(x.titre + " " + (x.description || "") + " " + fam(x) + " " + svOf(x)).includes(q))
  );
};
const dlgList = () => {
  const L = dlgItems();
  return L.length
    ? L.map(
        x =>
          `<div class="dli"><b>${esc(x.titre)}</b><p class="sm mu">${esc(String(x.description || "").slice(0, 140))}</p><p class="sm"><b>${tr("u_service")}</b> ${esc(svOf(x))}</p><button class="bt" data-a="dlgp" data-d="${esc(x.id)}">${tr("u_choisir")}</button></div>`
      ).join("")
    : `<p class="al" role="status">${tr("u_nous_n_avons_pas")}</p><p><button class="bo" data-a="dlgp" data-d="">${tr("u_autres_demandes")}</button></p>`;
};
const dlgChips = () =>
  [""]
    .concat([...new Set((S.dm || []).map(fam))])
    .map(c => `<button class="chp${(S.dc || "") == c ? " on" : ""}" data-a="dlgc" data-c="${esc(c)}">${c ? esc(c) : "Toutes"}</button>`)
    .join("");
const dlgHtml = () =>
  `<div class="dlb"><div class="dlh"><h2 id="dlt">${tr("u_quel_document_recherchez_vous")}</h2><button class="dlx" data-a="dlgx" aria-label="${tr("u_fermer")}">${ic("x", 26)}</button></div><div class="dsr">${ic("search", 22)}<input id="dq" type="search" placeholder="${tr("u_rechercher_un_document")}" aria-label="${tr("u_rechercher_un_document2")}" autocomplete="off" value="${esc(S.dq || "")}"></div><div class="dlc" id="dlcat">${dlgChips()}</div><div class="dll" id="dlr" aria-live="polite">${dlgList()}</div></div>`;
function dlgClose() {
  const d = $("#dlg");
  if (d) {
    d.hidden = true;
    d.innerHTML = "";
  }
  if (document.body) document.body.style.overflow = "";
}
function dlgAct(a, t) {
  if (a == "dlgo") {
    const d = $("#dlg");
    S.dq = "";
    S.dc = "";
    if (d) {
      d.innerHTML = dlgHtml();
      d.hidden = false;
      if (document.body) document.body.style.overflow = "hidden";
      const i = $("#dq");
      if (i) i.focus();
    }
    return false;
  }
  if (a == "dlgx") {
    dlgClose();
    return false;
  }
  if (a == "dlgc") {
    S.dc = t.dataset.c || "";
    const c = $("#dlcat"),
      r = $("#dlr");
    if (c) c.innerHTML = dlgChips();
    if (r) r.innerHTML = dlgList();
    return false;
  }
  if (a == "dlgp") {
    const x = (S.dm || []).find(y => y.id == t.dataset.d),
      k = x && CATS.find(z => z[3].includes(x.type));
    dlgClose();
    S.cat = k ? k[0] : EC;
    S.d = x ? { dm: x.id } : { dm: "", fo: "" };
    S.lst = false;
    S.ls = true;
    S.ok = "";
    S.menu = false;
    S.res = null;
    S.esp = false;
    S.rdv = false;
    return true;
  }
  return false;
}
const dmL = () => {
    const c = CATS.find(x => x[0] == S.cat);
    return (S.dm || []).filter(x => c[3].includes(x.type));
  },
  dmSel = () => (S.dm || []).find(x => x.id == S.d.dm);
const dmInfo = () => {
  const x = dmSel();
  if (!x) return "";
  const L = s =>
    String(s || "")
      .split("\n")
      .filter(Boolean);
  return `<div class="okb">${x.description ? `<p>${esc(x.description)}</p>` : ""}${
    x.pieces
      ? `<b>${tr("u_pieces_a_fournir")}</b><ul class="hs">${L(x.pieces)
          .map(p => `<li>${esc(p)}</li>`)
          .join("")}</ul>`
      : ""
  }${x.conditions ? `<p><b>${tr("u_conditions")}</b> ${esc(x.conditions)}</p>` : ""}${x.delai ? `<p><b>${tr("delay")}</b> ${esc(x.delai)}</p>` : ""}${frX(x) ? `<p><b>${tr("u_frais")}</b> ${esc(frX(x))}</p>` : ""}${x.retrait ? `<p><b>${tr("u_retrait")}</b> ${esc(x.retrait)}</p>` : ""}<p><b>${tr("u_service")}</b> ${esc(svOf(x))}</p>${x.autorite ? `<p><b>Cette démarche relève de : ${esc(x.autorite)}.</b> ${tr("u_la_mairie_vous_orientera")}</p>` : ""}</div>`;
};
/* Lot 5 : extrait d'acte déjà enregistré (naissance, mariage, décès). Méthode n = n° d'acte + année ; méthode f = ancien extrait joint. Retrait en mairie : jamais de téléchargement. Une déclaration/enregistrement initial n'est PAS un extrait (formulaire générique). */
const ECK = {
    "Demander un extrait de naissance": "naissance",
    "Demander un extrait de mariage": "mariage",
    "Demander un extrait de décès": "deces"
  },
  ECL = { naissance: "naissance", mariage: "mariage", deces: "décès" };
const val = id => (($("#" + id) || {}).value || "").trim();
const ecK = () => {
  if (S.d.ec) return S.d.ec;
  const x = dmSel();
  if (!x || x.type != "État civil") return "";
  const t = NZ(x.titre);
  if (/declar|enregistrement|reconnaissance/.test(t)) return "";
  return /naissance/.test(t) ? "naissance" : /mariage/.test(t) ? "mariage" : /deces/.test(t) ? "deces" : "";
};
/* Adresse de la mairie : texte libre et/ou lien Google Maps (seuls les liens Google Maps https sont reconnus et rendus cliquables). */
const MAPRE =
  /https:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|(?:www\.)?google\.[a-z]{2,3}(?:\.[a-z]{2})?\/maps|maps\.google\.[a-z]{2,3}(?:\.[a-z]{2})?)\/[^\s<>"']*/i;
const adr = I => {
  const a = String((I && I.adresse) || "").trim(),
    m = a.match(MAPRE);
  return { txt: (m ? a.replace(m[0], "") : a).replace(/\s+/g, " ").trim(), url: m ? m[0] : "" };
};
const mapLk = (c, I) => {
  const u = adr(I).url;
  return u
    ? `<a class="${c}" href="${esc(u)}" target="_blank" rel="noopener noreferrer" aria-label="Voir sur la carte (s’ouvre dans un nouvel onglet)">${ic("pin", 20)} Voir sur la carte</a>`
    : "";
};
const retrait = () => {
  const I = S.info || {},
    P = S.pt || {},
    l = [adr(I).txt && "Adresse : " + adr(I).txt, P.horaires && "Horaires : " + P.horaires].filter(Boolean);
  return `<p class="sm">Le document ne se télécharge pas : il se retire en mairie.${l.length ? "<br>" + l.map(esc).join("<br>") : ""}</p>`;
};
const ecBody = () => {
  const d = S.d;
  return (d.ecm || "n") == "n"
    ? `<label for="ecn">${tr("u_numero_de_l_acte")}</label><input id="ecn" autocomplete="off" maxlength="30" value="${esc(d.ecn)}"><label for="eca">${tr("u_annee_de_l_acte")}</label><input id="eca" inputmode="numeric" maxlength="4" value="${esc(d.eca)}">`
    : `<label for="ff">${tr("u_photo_ou_scan_de")}</label><input id="ff" type="file" multiple accept="image/*,application/pdf">${(d.files || []).length ? `<p class="sm">Déjà choisi : ${esc(d.files.map(f => f.name).join(", "))}</p>` : ""}`;
};
const ecSv = () => {
  ["ecn", "eca"].forEach(i => {
    if ($("#" + i)) S.d[i] = val(i);
  });
  const f = [...(($("#ff") || {}).files || [])].slice(0, 3);
  if (f.length) S.d.files = f;
};
const ecForm = () => {
  const c = CATS.find(x => x[0] == S.cat),
    d = S.d,
    k = ecK(),
    m = d.ecm || "n",
    rd = (v, t) =>
      `<label class="c-rad"><input type="radio" name="ecm" value="${v}" class="c-wa24"${m == v ? " checked" : ""}> ${t}</label>`;
  return `${head()}<main id="mc" class="mn nh">${msgs()}<div class="cd"><button class="lk c-cg" data-a="back">${tr("back")}</button><h1>${ic(c[1], 26)} Extrait d’acte de ${ECL[k]}</h1><p class="mu">${tr("u_demande_en_ligne_le")}</p>${dmSel() ? `<div id="dmi">${dmInfo()}</div>` : ""}<fieldset class="c-fs12"><legend class="c-lgd">${tr("u_que_savez_vous")}</legend>${rd("n", tr("v_je_connais_le_numero"))}${rd("f", tr("v_j_ai_un_ancien"))}</fieldset><div id="ecb">${ecBody()}</div><label for="ecp">${tr("u_nom_complet_de_la")}</label><input id="ecp" autocomplete="off" maxlength="120" value="${esc(d.ecp)}">${k == "mariage" ? `<label for="ecc">${tr("u_nom_du_conjoint_facultatif")}</label><input id="ecc" autocomplete="off" maxlength="120" value="${esc(d.ecc)}">` : ""}${idBlock(d)}<p><button class="bt" data-a="ecrev">${tr("u_verifier_ma_demande")}</button></p></div></main>`;
};
function ecRev() {
  const d = S.d,
    k = ecK(),
    m = d.ecm || "n",
    r = id => ($("#" + id) ? val(id) : d[id] || "");
  d.ecp = r("ecp");
  d.ecc = r("ecc");
  d.ecn = r("ecn");
  d.eca = r("eca");
  ecSv();
  d.fn = known() ? fullName() : val("fn") || d.fn || "";
  d.ft = known() ? myTel() : val("ft") || d.ft || "";
  const y = +d.eca;
  if (d.ecp.length < 2) {
    S.err = tr("u_indiquez_le_nom_complet");
    return;
  }
  if (m == "n") {
    if (!/^[A-Za-z0-9\/. -]{1,30}$/.test(d.ecn)) {
      S.err = tr("u_indiquez_le_numero_de");
      return;
    }
    if (!(/^\d{4}$/.test(d.eca) && y >= 1800 && y <= new Date().getFullYear())) {
      S.err = tr("u_indiquez_l_annee_de");
      return;
    }
  } else if (!(d.files || []).length) {
    S.err = tr("u_joignez_la_photo_ou");
    return;
  }
  if (d.fn.length < 2) {
    S.err = tr("u_indiquez_votre_nom_complet");
    return;
  }
  d.fo = "Extrait d’acte de " + ECL[k];
  if (m == "n") d.files = [];
  d.fm =
    d.fo +
    "\nPersonne concernée : " +
    d.ecp +
    (d.ecc ? "\nConjoint : " + d.ecc : "") +
    (m == "n" ? "\nN° d’acte : " + d.ecn + "\nAnnée : " + d.eca : "\nAncien extrait joint (" + d.files.length + " pièce(s))") +
    "\nRetrait en mairie";
  S.rec = true;
}
const ecRec = () => {
  const k = ecK(),
    d = S.d,
    m = d.ecm || "n",
    row = (a, b) => (b ? `<div class="rw c-cdf"><span class="mu">${a}</span><b class="c-tar">${esc(b)}</b></div>` : "");
  return `${head()}<main id="mc" class="mn nh">${msgs()}<div class="cd"><button class="lk c-cg" data-a="ecedit">${tr("u_modifier")}</button><h1>${tr("u_verifiez_votre_demande")}</h1>${row("Document", "Extrait d’acte de " + ECL[k])}${row(tr("v_personne_concernee"), d.ecp)}${row("Conjoint", d.ecc)}${m == "n" ? row("N° d’acte", d.ecn) + row(tr("v_annee"), d.eca) : row(tr("v_pieces_jointes"), (d.files || []).map(f => f.name).join(", "))}${row("Demandeur", d.fn)}${row(tr("v_telephone"), d.ft)}<p class="mu sm">Le document se retire en mairie. ${S.user ? tr("v_vous_serez_prevenu_dans") : tr("v_gardez_le_numero_de")}</p>${S.user ? "" : '<div id="ts"></div>'}<p><button class="bt" id="sd" data-a="send">${tr("u_envoyer_ma_demande")}</button> <button class="bo" data-a="ecedit">${tr("u_modifier2")}</button></p></div></main>`;
};
/* Lot 4 : formulaires par modèle (identite, legalisation, foncier, social ; libre = formulaire générique) */
const MD = {
  identite: {
    f: [
      ["pn", "Nom complet de la personne concernée", "text", 1],
      ["dn", "Date de naissance", "date", 1],
      ["ln", "Lieu de naissance", "text", 1],
      ["ad", "Adresse ou village de résidence", "text", 1],
      ["mo", "Motif de la demande", "text", 0]
    ],
    fl: "Pièce d’identité (photo ou PDF, 3 maximum, 3 Mo)",
    fr: 0
  },
  legalisation: {
    f: [
      ["dc", "Document à légaliser", "text", 1],
      ["nx", "Nombre d’exemplaires", "number", 1],
      ["mo", "Motif ou destination", "text", 0]
    ],
    fl: "Document et pièce d’identité (photo ou PDF, 3 maximum, 3 Mo)",
    fr: 1
  },
  foncier: {
    f: [
      ["lo", "Localisation (village, quartier)", "text", 1],
      ["pa", "Référence de la parcelle, si connue", "text", 0],
      ["ds", "Description de la demande", "ta", 1]
    ],
    fl: "Justificatifs : plan, ancien titre, délibération… (3 maximum, 3 Mo)",
    fr: 0
  },
  social: {
    f: [
      ["nf", "Nombre de personnes dans le foyer", "number", 1],
      ["ad", "Adresse ou village", "text", 1],
      ["ds", "Description de la situation", "ta", 1]
    ],
    fl: "Justificatifs (3 maximum, 3 Mo)",
    fr: 0
  }
};
const modK = () => {
  if (ecK()) return "";
  const x = dmSel();
  return x && MD[x.modele] ? x.modele : "";
};
const frX = x => {
  const v = x.frais;
  if (v == null || v === "") return "";
  const s = String(v).trim();
  return s == "0" ? "Gratuit" : /^\d+$/.test(s) ? Number(s).toLocaleString("fr-FR") + " FCFA" : s;
};
const cat4 = r => {
  if (!r || ECK[r]) return "";
  const k = NZ(r.replace(/^Demander (un|une) /, "")),
    m = (S.dm || []).find(x => MD[x.modele] && NZ(x.titre).includes(k));
  return m ? m.id : "";
};
const modForm = () => {
  const x = dmSel(),
    m = MD[x.modele],
    d = S.d,
    v = d.mf || {},
    c = CATS.find(z => z[0] == S.cat) || CATS[0];
  return `${head()}<main id="mc" class="mn nh">${msgs()}<div class="cd"><button class="lk c-cg" data-a="back">${tr("back")}</button><h1>${ic(c[1], 26)} ${esc(x.titre)}</h1><div id="dmi">${dmInfo()}</div>${m.f
    .map(f => {
      const id = "mf_" + f[0],
        val = esc(v[f[0]] || (f[0] == "pn" && x.modele == "identite" ? fullName() : ""));
      return (
        `<label for="${id}">${esc(f[1])}${f[3] ? "" : " (facultatif)"}</label>` +
        (f[2] == "ta"
          ? `<textarea id="${id}" rows="4" maxlength="1000">${val}</textarea>`
          : `<input id="${id}" type="${f[2]}" maxlength="200" value="${val}"${f[2] == "number" ? ` min="1" inputmode="numeric"` : ""}>`)
      );
    })
    .join(
      ""
    )}<label for="ff">${esc(m.fl)}${m.fr ? "" : " (facultatif)"}</label><input id="ff" type="file" multiple accept="image/*,application/pdf">${(d.files || []).length ? `<p class="sm">Déjà choisi : ${esc(d.files.map(f => f.name).join(", "))}</p>` : ""}${idBlock(d)}<p><button class="bt" data-a="mrev">${tr("u_verifier_ma_demande")}</button></p></div></main>`;
};
function modRev() {
  const x = dmSel(),
    m = MD[x.modele],
    d = S.d;
  d.mf = d.mf || {};
  m.f.forEach(f => {
    if ($("#mf_" + f[0])) d.mf[f[0]] = val("mf_" + f[0]);
  });
  const fl = [...(($("#ff") || {}).files || [])].slice(0, 3);
  if (fl.length) d.files = fl;
  d.fn = known() ? fullName() : val("fn") || d.fn || "";
  d.ft = known() ? myTel() : val("ft") || d.ft || "";
  for (const f of m.f)
    if (f[3] && !d.mf[f[0]]) {
      S.err = "Remplissez : " + f[1] + ".";
      return;
    }
  if (m.fr && !(d.files || []).length) {
    S.err = tr("u_joignez_les_pieces_demandees");
    return;
  }
  if (d.fn.length < 2) {
    S.err = tr("u_indiquez_votre_nom_complet");
    return;
  }
  d.fo = x.titre;
  d.fm =
    x.titre +
    "\n" +
    m.f
      .filter(f => d.mf[f[0]])
      .map(f => f[1] + " : " + d.mf[f[0]])
      .join("\n") +
    ((d.files || []).length ? "\nPièces jointes : " + d.files.length : "");
  S.rec = true;
}
const modRec = () => {
  const x = dmSel(),
    m = MD[x.modele],
    d = S.d,
    row = (a, b) => (b ? `<div class="rw c-cdf"><span class="mu">${esc(a)}</span><b class="c-tar">${esc(b)}</b></div>` : "");
  return `${head()}<main id="mc" class="mn nh">${msgs()}<div class="cd"><button class="lk c-cg" data-a="medit">${tr("u_modifier")}</button><h1>${tr("u_verifiez_votre_demande")}</h1>${row(tr("u_demarche"), x.titre)}${m.f.map(f => row(f[1], d.mf[f[0]])).join("")}${row(tr("v_pieces_jointes"), (d.files || []).map(f => f.name).join(", "))}${row("Frais", frX(x))}${row("Service", svOf(x))}${row("Demandeur", d.fn)}${row(tr("v_telephone"), d.ft)}${x.retrait ? `<p class="mu sm">${esc(x.retrait)}</p>` : ""}${S.user ? "" : '<div id="ts"></div>'}<p><button class="bt" id="sd" data-a="send">${tr("u_envoyer_ma_demande")}</button> <button class="bo" data-a="medit">${tr("u_modifier2")}</button></p></div></main>`;
};
/* Lot 6 : rendez-vous. Le citoyen propose une date ; le service confirme (jamais automatique). */
const RVS = lk("rvs_");
const RVX = lk("rvx_");
const RSV = [
  ["secretariat", "Secrétariat de la mairie"],
  ["maire", "Le Maire"],
  ["etat_civil", "Service de l’état civil"],
  ["technique", "Service technique"],
  ["finances", "Finances"]
];
const KR = () => "mc_r_" + S.slug,
  getR = () => {
    try {
      return JSON.parse(localStorage.getItem(KR()) || "[]");
    } catch (e) {
      return [];
    }
  },
  addR = n => {
    try {
      const l = getR().filter(x => x != n);
      l.unshift(n);
      localStorage.setItem(KR(), JSON.stringify(l.slice(0, 20)));
    } catch (e) {}
  };
async function loadRdv() {
  try {
    const ses = S.slug
      ? sb.auth && typeof sb.auth.getSession == "function"
        ? ((await sb.auth.getSession()).data || {}).session
        : true
      : null;
    S.rv = ses || (S.slug && getR().length) ? (await sb.rpc("mes_rdvs", { p_commune: S.slug, p_numeros: getR() })).data || [] : [];
  } catch (e) {
    S.rv = S.rv || [];
  }
}
const RKB = () =>
  `<div class="okb" role="status"><b>${tr("u_demande_de_rendez_vous")}</b><br>${tr("u_numero")} <b>${esc(S.rok)}</b><br><span class="sm">${tr("u_ce_n_est_pas")}</span></div>`;
const rvCan = x =>
  ["demandee", "confirmee"].includes(x.statut) &&
  String(x.statut == "confirmee" && x.date_confirmee ? x.date_confirmee : x.date_souhaitee).slice(0, 10) >=
    new Date().toISOString().slice(0, 10);
const rvRow = x =>
  `<div class="rw c-cdfb"><b>${esc((RSV.find(s => s[0] == x.service) || [0, x.service])[1])}</b> <span class="bd ${x.statut == "confirmee" ? "ok" : x.statut == "demandee" ? "bl" : ""}">${RVS[x.statut] || esc(x.statut)}</span><br><span class="mu sm">${esc(x.numero)} · date souhaitée : ${fdj(x.date_souhaitee)}${x.heure_souhaitee ? " à " + esc(String(x.heure_souhaitee).slice(0, 5)) : ""}</span>${x.statut == "confirmee" ? `<br><b>Le ${fdj(x.date_confirmee)} à ${esc(String(x.heure_confirmee || "").slice(0, 5))}</b>` : ""}<br><span class="sm">${esc(RVX[x.statut] || "")}</span>${x.reponse ? `<br><span class="sm"><b>${tr("u_reponse")}</b> ${esc(x.reponse)}</span>` : ""}${rvCan(x) ? `<br><button class="bo c-mt8" data-a="rcan" data-n="${esc(x.numero)}">${tr("u_annuler_ce_rendez_vous")}</button>` : ""}</div>`;
const rvCard = () => (S.rv.length ? `<div class="cd" id="rdvs"><h2>${tr("u_mes_rendez_vous")}</h2>${S.rv.map(rvRow).join("")}</div>` : "");
const JN = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
  hh = v =>
    String(v || "")
      .slice(0, 5)
      .replace(":", "h");
const rvOuv = () => {
  const p = S.plan,
    hs = v => hh(v).replace(/h00$/, "h"),
    J = (p.jours || []).slice().sort((a, b) => a - b),
    nm = J.map(n => JN[n % 7]),
    cons = J.every((n, k) => !k || n == J[k - 1] + 1);
  return (
    "La mairie reçoit " +
    (J.length > 1 && cons ? "du " + nm[0] + " au " + nm[nm.length - 1] : nm.join(", ")) +
    ", de " +
    hs(p.heure_debut) +
    " à " +
    hs(p.heure_fin) +
    (p.pause_debut ? " (pause de " + hs(p.pause_debut) + " à " + hs(p.pause_fin) + ")" : "") +
    "."
  );
};
/* Créneaux : lus côté serveur (creneaux_rdv). Radios : aucun rendu complet, la saisie et la vérification anti-spam sont conservées. */
const rvSlotsHtml = () => {
  const d = S.d;
  if (!d.rd) return '<p class="mu sm">Choisissez d’abord une date pour voir les heures libres.</p>';
  if (d.slmsg) return `<p class="al" role="alert">${esc(d.slmsg)}</p>`;
  if (!d.sl) return '<p class="mu sm">Chargement des heures libres…</p>';
  if (!d.sl.length) return '<p class="al" role="alert">Aucune heure libre ce jour-là. Choisissez une autre date.</p>';
  return `<fieldset class="c-fs8"><legend class="c-lgd">${tr("u_heure_souhaitee")}</legend><div class="c-slg">${d.sl.map(h => `<label class="c-slb"><input type="radio" name="rh" value="${esc(h)}" class="c-wa0"${h == d.rh ? " checked" : ""}> ${esc(hh(h))}</label>`).join("")}</div></fieldset>`;
};
async function rvSlots(v, keep) {
  const d = S.d;
  d.rd = v;
  d.rh = keep ? d.rh : "";
  d.sl = null;
  d.slmsg = "";
  const box = () => $("#rsb"),
    put = () => {
      const b = box();
      if (b) b.innerHTML = rvSlotsHtml();
    };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    put();
    return;
  }
  const w = new Date(v + "T00:00").getDay() || 7;
  if (!(S.plan.jours || []).includes(w)) {
    d.slmsg = "La mairie ne reçoit pas ce jour-là. " + rvOuv();
    put();
    return;
  }
  put();
  try {
    const r = await sb.rpc("creneaux_rdv", { p_commune: S.slug, p_service: d.rs || ($("#rs") || {}).value || "secretariat", p_date: v });
    if (d.rd !== v) return;
    if (r.error) throw r.error;
    d.sl = (r.data || []).map(x => (typeof x == "string" ? x : x.heure));
  } catch (e) {
    d.slmsg = tr("u_impossible_de_lire_les");
  }
  put();
}
const rdvForm = () => {
  const d = S.d,
    dd = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  return `${head()}<main id="mc" class="mn nh">${msgs()}<div class="cd"><button class="lk c-cg" data-a="back">${tr("back")}</button><h1>${ic("cal", 26)} Prendre rendez-vous</h1><p class="mu">${tr("u_choisissez_le_service_et")}</p>${(S.pt || {}).horaires ? `<p class="sm">Horaires de la mairie : ${esc(S.pt.horaires)}</p>` : ""}<label for="rs">${tr("u_avec_qui")}</label><select id="rs">${RSV.map(s => `<option value="${s[0]}"${s[0] == d.rs ? " selected" : ""}>${esc(s[1])}</option>`).join("")}</select><label for="rm">${tr("u_motif_du_rendez_vous")}</label><textarea id="rm" rows="3" maxlength="500">${esc(d.rm)}</textarea><label for="rd">${tr("u_date_souhaitee")}</label><input id="rd" type="date" min="${dd(1)}" max="${dd(90)}" value="${esc(d.rd)}">${S.plan ? `<p class="mu sm c-mt6">${esc(rvOuv())}</p><div id="rsb" aria-live="polite">${rvSlotsHtml()}</div>` : ""}${idBlock(d)}${S.user ? "" : '<div id="ts"></div>'}<p><button class="bt" data-a="rsend">${tr("u_envoyer_ma_demande")}</button></p></div></main>`;
};
async function rdvSend() {
  const g = id => (($("#" + id) || {}).value || "").trim(),
    d = S.d;
  d.rs = g("rs");
  d.rm = g("rm");
  d.rd = g("rd");
  if (S.plan) d.rh = ($('input[name="rh"]:checked') || {}).value || "";
  d.fn = known() ? fullName() : g("fn") || d.fn || "";
  d.ft = known() ? myTel() : g("ft") || d.ft || "";
  if (d.fn.length < 2) {
    S.err = tr("u_indiquez_votre_nom_complet");
    return;
  }
  if (d.rm.length < 5) {
    S.err = tr("u_indiquez_le_motif_en");
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.rd)) {
    S.err = tr("u_choisissez_une_date");
    return;
  }
  if (S.plan && !d.rh) {
    S.err = tr("u_choisissez_une_heure_parmi");
    return;
  }
  if (!S.tok && !S.user) {
    S.err = tr("u_veuillez_valider_la_verification");
    return;
  }
  const sg = S.user ? {} : await sb.auth.signInAnonymously({ options: { captchaToken: S.tok } });
  if (sg.error) {
    S.err = tr("u_verification_refusee_reessayez");
    return;
  }
  try {
    const r = await sb.rpc("creer_rdv", {
      p_commune: S.slug,
      p_service: d.rs,
      p_nom: d.fn,
      p_contact: d.ft || null,
      p_motif: d.rm,
      p_date: d.rd,
      ...(S.plan ? { p_heure: d.rh } : {})
    });
    if (r.error) {
      if (/creneau/i.test(r.error.message || "")) {
        d.sl = null;
        d.rh = "";
        rvSlots(d.rd, false);
      }
    }
    if (r.error)
      throw new Error(
        /creneau/i.test(r.error.message || "")
          ? tr("v_cette_heure_n_est")
          : /date/i.test(r.error.message || "")
            ? tr("v_date_refusee_choisissez_un")
            : /limite/i.test(r.error.message || "")
              ? tr("v_vous_avez_deja_3")
              : tr("v_envoi_impossible_verifiez_les")
      );
    if (!S.user) addR(r.data);
    S.rok = r.data;
    S.rdv = false;
    S.d = {};
    await loadRdv();
  } catch (e) {
    S.err = e.message || "Erreur réseau. Réessayez.";
  } finally {
    if (!S.user)
      try {
        await sb.auth.signOut();
      } catch (x) {}
  }
}
const lstv0 = () => {
  const c = CATS.find(x => x[0] == S.cat),
    D = dmL(),
    dn = D.map(x => NZ(x.titre)),
    it = (a, at, t, u) =>
      `<button class="tt" data-a="${a}" ${at}><span class="ico">${ic("arr", 24)}</span><span class="tx"><b>${esc(t)}</b>${u ? `<span>${esc(u)}</span>` : ""}</span></button>`;
  return `${head()}<main id="mc" class="mn nh">${msgs()}<div class="cd"><button class="lk c-cg" data-a="back">${tr("back")}</button><h1>${ic(c[1], 26)} ${esc(c[0])}</h1><p class="mu">${tr("pick")}</p><div class="tl c-gc1">${D.map(x => it("dm", `data-d="${esc(x.id)}"`, x.titre, x.delai ? tr("delay") + " " + x.delai : "")).join("")}${racL()
    .filter(r => !dn.includes(NZ(r)))
    .map(r => it("rc", `data-r="${esc(r)}"`, r, ""))
    .join("")}${it("rc", 'data-r=""', tr("other"), tr("otherSub"))}</div></div></main>`;
};
/* Lot 4 : identité du compte. Nom, prénom et téléphone ne sont plus redemandés à un citoyen connecté dont le profil est renseigné. */
const fullName = () => (((S.prof || {}).prenom || "") + " " + ((S.prof || {}).nom || "")).trim();
const myTel = () => (S.user && S.user.phone ? "+" + String(S.user.phone).replace(/^\+/, "") : "");
const known = () => !!(S.user && fullName().length >= 2);
const idBlock = d =>
  known()
    ? `<div class="okb c-okg"><b>Demande au nom de ${esc(fullName())}</b>${myTel() ? `<br><span class="sm">Téléphone : ${esc(myTel())}</span>` : ""}<br><button class="lk c-cg" data-a="esp">${tr("u_modifier_mon_profil")}</button></div>`
    : `<label for="fn">${tr("u_votre_nom_complet")}</label><input id="fn" autocomplete="name" value="${esc(d.fn || fullName())}"><label for="ft">${tr("u_telephone_facultatif_pour_vous")}</label><input id="ft" type="tel" autocomplete="tel" value="${esc(d.ft || myTel())}">`;
const form = () => {
  if (ecK()) return ecForm();
  if (modK()) return modForm();
  const c = CATS.find(x => x[0] == S.cat),
    d = S.d;
  return `${head()}<main id="mc" class="mn nh">${msgs()}<div class="cd"><button class="lk c-cg" data-a="back">${tr("back")}</button><h1>${ic(c[1], 26)} ${esc(c[0])}</h1><p class="mu">${esc(c[2])}</p>
${
  dmL().length
    ? `<label for="fdm">${tr("u_demarche")}</label><select id="fdm"><option value="">${tr("other")}</option>${dmL()
        .map(x => `<option value="${esc(x.id)}"${x.id == d.dm ? " selected" : ""}>${esc(x.titre)}</option>`)
        .join("")}</select><div id="dmi">${dmInfo()}</div>`
    : c[3].length > 1
      ? `<label for="fy">${tr("u_nature_de_la_demarche")}</label><select id="fy">${c[3].map(t => `<option${t == d.ty ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>`
      : ""
}${idBlock(d)}<label for="fo">${tr("u_objet_de_la_demande")}</label><input id="fo" maxlength="200" value="${esc(d.fo)}"><label for="fm">${tr("u_votre_message")}</label><textarea id="fm" rows="5" maxlength="2000">${esc(d.fm)}</textarea>
<label for="ff">${tr("u_pieces_justificatives_3_maximum")}</label><input id="ff" type="file" multiple accept="image/*,application/pdf">
<p class="mu sm c-mt12">${tr("u_toutes_les_demandes_ne")}</p>${S.user ? "" : '<div id="ts"></div>'}<p><button class="bt" id="sd" data-a="send">${tr("u_envoyer_ma_demande")}</button></p></div></main>`;
};
/* Passer à true quand le fournisseur SMS est actif */
const SMS_ON = false;
const espaceOff = () =>
  `${head()}<main id="mc" class="mn nh">${msgs()}<div class="cd c-tac"><button class="lk c-cgb" data-a="espx">${tr("back")}</button><span class="ico big">${ic("user", 30)}</span><h1>${tr("u_mon_espace_citoyen")}</h1><p class="mu">${tr("u_votre_espace_personnel_prepare")}</p><p><button class="bt" data-a="espx">${tr("u_continuer_mes_demarches")}</button></p></div></main>`;
/* Notifications push (Web Push/VAPID) : activées seulement si la clé publique est fournie (<meta name="mc-vapid">) et que le navigateur les gère. */
const VAPID = () => {
  try {
    const m = document.querySelector('meta[name="mc-vapid"]');
    return m ? m.content.trim() : "";
  } catch (e) {
    return "";
  }
};
const pushOk = () => {
  try {
    return !!VAPID() && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  } catch (e) {
    return false;
  }
};
const b64u = v => {
  const p = "=".repeat((4 - (v.length % 4)) % 4),
    r = atob((v + p).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(r, c => c.charCodeAt(0));
};
const b64e = b =>
  btoa(String.fromCharCode(...new Uint8Array(b)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
async function pushState() {
  if (!pushOk()) return;
  try {
    const r = await navigator.serviceWorker.ready,
      x = await r.pushManager.getSubscription();
    S.psh = x ? "on" : Notification.permission == "denied" ? "deny" : "off";
  } catch (e) {
    S.psh = "off";
  }
  render();
}
async function pushOn() {
  if (!pushOk()) return;
  const pm = await Notification.requestPermission();
  if (pm != "granted") {
    S.psh = pm == "denied" ? "deny" : "off";
    throw new Error(tr("v_notifications_non_autorisees_vous"));
  }
  const r = await navigator.serviceWorker.ready;
  let x = await r.pushManager.getSubscription();
  if (!x) x = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(VAPID()) });
  const j = x.toJSON(),
    k = j.keys || {};
  const e = await sb.rpc("push_enregistrer", {
    p_endpoint: j.endpoint,
    p_p256dh: k.p256dh,
    p_auth: k.auth,
    p_ua: navigator.userAgent.slice(0, 200)
  });
  if (e.error) {
    await x.unsubscribe().catch(() => {});
    throw new Error("Activation impossible pour le moment.");
  }
  S.psh = "on";
  S.rinf = tr("v_notifications_activees_sur_cet");
}
async function pushOff() {
  const r = await navigator.serviceWorker.ready,
    x = await r.pushManager.getSubscription();
  if (x) {
    await sb.rpc("push_supprimer", { p_endpoint: x.endpoint });
    await x.unsubscribe();
  }
  S.psh = "off";
  S.rinf = tr("v_notifications_desactivees_sur_cet");
}
const pushBox = () => {
  if (!S.user || !pushOk()) return "";
  if (S.psh === undefined) {
    S.psh = null;
    pushState();
  }
  if (!S.psh) return "";
  return `<div class="cd"><h2>${tr("u_alertes_sur_ce_telephone")}</h2>${S.psh == "on" ? `<p class="mu">${tr("u_vous_etes_prevenu_des")}</p><button class="bo" data-a="pshoff">${tr("u_desactiver_les_alertes")}</button>` : S.psh == "deny" ? `<p class="mu">${tr("u_les_notifications_sont_bloquees")}</p>` : `<p class="mu">${tr("u_recevez_une_alerte_quand")}</p><button class="bt" data-a="pshon">${tr("u_activer_les_alertes")}</button>`}</div>`;
};
/* Installation de l'application : bouton natif (Android/Chrome) ou consigne iPhone ; masquable (mémorisé) ; invisible une fois installée. */
let IP = null;
const lsg = k => {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  },
  lss = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch (e) {}
  };
try {
  addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    IP = e;
    if (typeof render == "function" && S.co && !S.res && !S.cat) render();
  });
  addEventListener("appinstalled", () => {
    IP = null;
    lss("mc_inst", "1");
  });
} catch (e) {}
const isIos = () => {
  try {
    return /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
  } catch (e) {
    return false;
  }
};
const standalone = () => {
  try {
    return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  } catch (e) {
    return false;
  }
};
const instCard = () => {
  if (standalone() || lsg("mc_inst") || !S.co) return "";
  if (IP)
    return `<div class="cd" role="region" aria-label="${tr("u_installer_l_application")}"><p class="mu"><b>Installez l’application de ${esc(cnm())}</b> ${tr("u_sur_votre_telephone_acces")}</p><p><button class="bt" data-a="inst">${tr("u_installer")}</button> <button class="lk2" data-a="instx">${tr("u_plus_tard")}</button></p></div>`;
  if (isIos())
    return `<div class="cd" role="region" aria-label="${tr("u_installer_l_application")}"><p class="mu"><b>${tr("u_ajoutez_l_application_a")}</b> ${tr("u_touchez_le_bouton_partager")}</p><p><button class="lk2" data-a="instx">${tr("u_masquer")}</button></p></div>`;
  return "";
};
/* Choix de langue : proposé seulement si une langue est « validée » ET traduit 100 % des textes (jamais de traduction partielle ou non validée affichée). */
const langsOk = () => {
  try {
    const L = window.MC_LANGS || {},
      ks = Object.keys(TX.fr);
    return Object.keys(L).filter(c => c != "fr" && L[c].statut == "valide" && TX[c] && ks.every(k => TX[c][k]));
  } catch (e) {
    return [];
  }
};
const langSel = () => {
  const l = langsOk();
  if (!l.length) return "";
  const L = window.MC_LANGS;
  return (
    `<div class="cd" role="group" aria-label="${tr("u_langue")}"><p class="mu sm">` +
    ["fr"]
      .concat(l)
      .map(c => `<button class="${(S.lang || "fr") == c ? "bt" : "bo"}" data-a="lang" data-l="${c}" lang="${c}">${esc(L[c].nom)}</button>`)
      .join(" ") +
    `</p></div>`
  );
};
try {
  const sv = lsg("mc_lang");
  if (sv && langsOk().includes(sv)) S.lang = sv;
} catch (e) {}
const acct = () =>
  `<aside class="cd ac" aria-label="${tr("u_mon_espace_citoyen")}"><span class="ico big">${ic("user", 30)}</span><h2>${tr("u_mon_espace_citoyen")}</h2>${S.user ? `<p class="mu">Bonjour${fullName() ? " " + esc(fullName()) : ""}. Retrouvez vos informations et vos notifications.</p><p><button class="bt" data-a="esp">${btl()}</button></p>` : `${SMS_ON ? `<p class="mu">${tr("u_accedez_a_votre_compte")}</p><p><button class="bt" data-a="esp">${tr("u_se_connecter")}</button></p><p><button class="lk2" data-a="esp">${tr("u_creer_un_compte")}</button></p>` : `<p class="mu">${tr("u_votre_espace_personnel_prepare")}</p>`}`}</aside>`;
const tel = () => String((S.info || {}).tel || "").replace(/[^0-9+]/g, "");
const home = () => {
  const m = S.mine,
    en = m.filter(x => ["orientee", "en_cours", "a_valider", "en_attente_pieces", "acceptee", "pret_a_retirer"].includes(x.statut)).length,
    fi = m.filter(x => ["traitee", "redirigee", "cloturee", "rejetee"].includes(x.statut)).length,
    I = S.info,
    P = S.pt || {};
  return `${head()}${hero()}${instCard()}${langSel()}<div class="in c3"><button class="a3 g" data-a="goto" data-t="services"><span class="ai">${ic("docp", 34)}</span><span class="at"><b>${tr("h_req")}</b><small>${tr("h_req_s")}</small></span><span class="ar">${ic("arr", 20)}</span></button><button class="a3 y" data-a="goto" data-t="suivi"><span class="ai">${ic("search", 34)}</span><span class="at"><b>${tr("h_trk")}</b><small>${tr("h_trk_s")}</small></span><span class="ar">${ic("arr", 20)}</span></button><button class="a3 g" data-a="rdv"><span class="ai">${ic("cal", 34)}</span><span class="at"><b>${tr("h_rdv")}</b><small>${tr("h_rdv_s")}</small></span><span class="ar">${ic("arr", 20)}</span></button></div>
<main id="mc" class="mn hm">${msgs()}<section id="services" class="sw"><div><h2 class="sh">${tr("h_svc")}</h2><div class="tl" id="tl">${tiles()}</div></div>${acct()}</section>
<div class="sv" id="suivi" data-f="tk"><div><b class="c-fs22">${tr("h_trk")}</b><br><span class="sm">${tr("h_trk_p")}</span></div><input id="tk" placeholder="${esc(tr("h_trk_ph"))}" aria-label="${tr("u_numero_de_suivi")}" autocapitalize="characters" value="${esc(S.tr)}"><button class="bg" data-a="track">${tr("h_go")}</button></div>
<div class="g2c"><div class="cd" id="mes"><h2>${tr("h_mine")}</h2>${m.length ? `<div class="rw c-cdf"><span>${tr("h_dep")}</span><span class="nb b1">${m.length}</span></div><div class="rw c-cdf"><span>${tr("h_cur")}</span><span class="nb b2">${en}</span></div><div class="rw c-cdf"><span>${tr("h_done")}</span><span class="nb b3">${fi}</span></div>${m.map(x => `<button class="rw" data-a="open" data-n="${esc(x.numero)}"><span><b>${esc(x.type)}</b><br><span class="mu sm">${esc(x.numero)}</span></span>${bd(x.statut)}</button>`).join("")}` : `<p class="mu">${S.user ? "Aucune demande dans votre compte pour le moment." : tr("v_aucune_demande_deposee_sur")}</p>`}</div>
${rvCard()}<div class="cd" id="infos"><h2><span class="ih">${ic("info", 24)}</span> ${tr("h_info")}</h2><p><b>Mairie de ${esc(cnm())}</b>${P.horaires ? `<br>Horaires : ${esc(P.horaires)}` : ""}${I.tel ? `<br>${tr("u_tel")} <a href="tel:${esc(tel())}">${esc(I.tel)}</a>` : ""}${adr(I).txt ? `<br>Adresse : ${esc(adr(I).txt)}` : ""}${adr(I).url ? `<br>${mapLk("lk c-cg", I)}` : ""}${P.email ? `<br>${tr("u_e_mail")} <a href="mailto:${esc(P.email)}">${esc(P.email)}</a>` : ""}</p><p class="mu sm">${tr("u_service_gratuit_certaines_demarches")}</p></div>
<div class="cd" id="contact"><h2><span class="ih">${ic("phone", 24)}</span> ${tr("h_contact")}</h2>${I.tel || P.email || adr(I).url ? `<p class="mu">${tr("u_une_question_contactez_la")}</p><p class="ctb">${I.tel ? `<a class="bt cl" href="tel:${esc(tel())}">${tr("h_call")}</a>` : ""}${P.email ? `<a class="bo cl" href="mailto:${esc(P.email)}">${tr("h_mail")}</a>` : ""}${mapLk("bo cl", I)}</p>` : '<p class="mu">Les coordonnées de la mairie seront bientôt disponibles.</p>'}</div></div>
<div class="cd" id="travaux"><h2><span class="ih">${ic("tools", 24)}</span> ${tr("h_works")}</h2>${(S.pj || []).length ? S.pj.map(x => `<p class="an"><b>${esc(x.titre)}</b><br><span class="mu sm">${esc([x.localite, PJL[x.statut] || x.statut, x.avancement != null ? x.avancement + " %" : "", x.date_fin ? "fin prévue " + fdj(x.date_fin) : ""].filter(Boolean).join(" · "))}</span></p>`).join("") : '<p class="mu">Aucun projet publié pour le moment.</p>'}</div>
<div class="cd" id="actus"><h2><span class="ih">${ic("news", 24)}</span> ${tr("h_actu")}</h2>${S.pub.length ? S.pub.map(p => `<p class="an">${p.jour ? `<span class="mu sm">${esc(fdj(p.jour))}</span>` : ""}${p.categorie && p.categorie != "actualite" ? ` <span class="bd bl">${esc(PCL[p.categorie] || "")}</span>` : ""}<br><i>${esc(p.texte)}</i></p>`).join("") : '<p class="mu">Aucune actualité pour le moment.</p>'}</div></main><footer class="ft"><i>${esc(I.devise || I.slogan || cnm())}</i><br><button class="lk c-cg" data-a="chg">${tr("u_ce_n_est_pas2")}</button></footer>`;
};
const PCL = lk("pcl_"),
  PJL = lk("pjl_");
const nph = v => {
  v = String(v || "").replace(/[\s.-]/g, "");
  if (/^7\d{8}$/.test(v)) return "+221" + v;
  if (/^221\d{9}$/.test(v)) return "+" + v;
  return /^\+\d{8,15}$/.test(v) ? v : "";
};
async function loadNt() {
  const r = await sb
    .from("citoyen_notifications")
    .select("id,titre,corps,lu,created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  S.nt = r.data || [];
}
async function loadAcc() {
  const p = await sb.from("citoyens").select("nom,prenom,village").maybeSingle();
  S.prof = p.data || {};
  await loadNt();
}
async function otp() {
  const p = nph(($("#ph") || {}).value);
  if (!p) {
    S.err = tr("v_numero_invalide_exemple_77");
    return;
  }
  if (!S.tok) {
    S.err = tr("u_veuillez_valider_la_verification");
    return;
  }
  const r = await sb.auth.signInWithOtp({ phone: p, options: { captchaToken: S.tok } });
  if (r.error) {
    S.err =
      r.error.code == "phone_provider_disabled" || /phone provider/i.test(r.error.message || "")
        ? tr("v_la_connexion_par_sms")
        : tr("v_envoi_du_sms_impossible");
    return;
  }
  S.au = { step: "code", phone: p };
}
/* Connexion = création de compte : au premier code valide, le compte et une fiche vide sont créés (la fiche est nécessaire pour recevoir les notifications). */
async function vfy() {
  const c = (($("#cd") || {}).value || "").trim();
  if (!/^\d{4,8}$/.test(c)) {
    S.err = tr("u_code_invalide");
    return;
  }
  const r = await sb.auth.verifyOtp({ phone: S.au.phone, token: c, type: "sms" });
  if (r.error || !r.data.user) {
    S.err = tr("u_code_incorrect_ou_expire");
    return;
  }
  S.user = r.data.user;
  S.au = {};
  await loadAcc();
  if (!S.prof || !Object.keys(S.prof).length) {
    try {
      await sb.from("citoyens").upsert({ user_id: S.user.id });
      S.prof = {};
    } catch (e) {}
  }
  await loadMine();
  await loadRdv();
  S.inf = fullName() ? tr("v_connexion_reussie") : tr("v_compte_cree_completez_votre");
}
async function psave() {
  const g = id => (($("#" + id) || {}).value || "").trim(),
    prenom = g("pp"),
    nom = g("pn"),
    v = g("pv");
  if (prenom.length < 2 || nom.length < 2) {
    S.err = tr("u_indiquez_votre_prenom_et");
    return;
  }
  const r = await sb.from("citoyens").upsert({ user_id: S.user.id, prenom, nom, village: v || null, updated_at: new Date().toISOString() });
  if (r.error) {
    S.err = tr("u_enregistrement_impossible");
    return;
  }
  S.prof = { prenom, nom, village: v };
  S.inf = tr("v_profil_enregistre");
}
const nnum = n => {
  const m = /^Demande\s+(\S+)/.exec(n.titre || "");
  return m ? m[1] : "";
};
async function openN(n) {
  const r = n ? (await sb.rpc("suivre_demande", { p_commune: S.slug, p_numero: n })).data : null;
  if (r && r[0]) {
    S.res = Object.assign({ numero: n }, r[0]);
    return true;
  }
  return false;
}
const espace = () => {
  const u = S.user,
    a = S.au || {},
    m = S.mine || [];
  if (!u && !SMS_ON) return espaceOff();
  return (
    `${head()}<main id="mc" class="mn nh">${msgs()}${S.inf ? `<div class="okb" role="status">${esc(S.inf)}</div>` : ""}${pushBox()}<div class="cd"><button class="lk c-cg" data-a="espx">${tr("back")}</button><h1>${u ? "Mon profil" : tr("v_se_connecter_ou_creer")}</h1>` +
    (!u
      ? `<p class="mu">${tr("u_entrez_votre_numero_de")}</p>` +
        (a.step == "code"
          ? `<label for="cd">Code reçu par SMS (${esc(a.phone)})</label><input id="cd" inputmode="numeric" autocomplete="one-time-code" maxlength="8"><p class="c-mt12"><button class="bt" data-a="vfy">${tr("u_valider")}</button> <button class="bo" data-a="otpx">${tr("u_changer_de_numero")}</button></p>`
          : `<label for="ph">${tr("u_numero_de_telephone")}</label><input id="ph" type="tel" autocomplete="tel" placeholder="77 123 45 67"><div id="ts"></div><p><button class="bt" data-a="otp">${tr("u_recevoir_le_code")}</button></p>`)
      : `<p class="mu">Téléphone vérifié : +${esc(String(u.phone || "").replace(/^\+/, ""))}</p><label for="pp">${tr("u_prenom")}</label><input id="pp" autocomplete="given-name" maxlength="120" value="${esc((S.prof || {}).prenom)}"><label for="pn">${tr("u_nom")}</label><input id="pn" autocomplete="family-name" maxlength="120" value="${esc((S.prof || {}).nom)}"><label for="pv">${tr("u_village_quartier_ou_adresse")}</label><input id="pv" autocomplete="street-address" maxlength="120" value="${esc((S.prof || {}).village)}"><p class="c-mt12"><button class="bt" data-a="psave">${tr("u_enregistrer")}</button> <button class="bo" data-a="lout">${tr("u_se_deconnecter")}</button></p>`) +
    `</div>` +
    (u
      ? `<div class="cd"><h2>${tr("h_mine")}</h2>${m.length ? m.map(x => `<button class="rw" data-a="open" data-n="${esc(x.numero)}"><span><b>${esc(x.type)}</b><br><span class="mu sm">${esc(x.numero)}</span></span>${bd(x.statut)}</button>`).join("") : '<p class="mu">Aucune demande dans votre compte pour le moment.</p>'}</div><div class="cd"><h2>${tr("u_notifications")}</h2>${S.nt.length ? (unread() ? `<p><button class="bo" data-a="nrd">${tr("u_tout_marquer_comme_lu")}</button></p>` : "") + S.nt.map(n => `<p class="c-ntf"><b>${n.lu ? "" : "● "}${esc(n.titre)}</b><br>${esc(n.corps || "")}<br><span class="mu sm">${fdt(n.created_at)}</span>${nnum(n) ? `<br><button class="bo" data-a="nopen" data-i="${esc(n.id)}" data-n="${esc(nnum(n))}">${tr("u_voir_le_dossier")}</button>` : ""}</p>`).join("") : '<p class="mu">Aucune notification.</p>'}</div>` +
        rvCard()
      : "") +
    `</main>`
  );
};
function render() {
  $("#app").innerHTML = !S.co
    ? pick()
    : S.esp
      ? espace()
      : S.res
        ? detail()
        : S.rdv
          ? rdvForm()
          : S.cat
            ? S.lst
              ? lstv()
              : S.rec && (ecK() || modK())
                ? ecK()
                  ? ecRec()
                  : modRec()
                : form()
            : home();
  S.tok = "";
  theme();
  manifest();
  if ($("#ts")) {
    tsr();
    setTimeout(tsr, 800);
    setTimeout(tsr, 2500);
  }
}
/* après un rendu : défilement vers la section demandée (menu, cartes) ou retour en haut */
function go() {
  const id = S.sc;
  S.sc = "";
  const e = id && document.getElementById(id);
  if (e && e.scrollIntoView) {
    const rm = typeof matchMedia == "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      e.scrollIntoView({ behavior: rm ? "auto" : "smooth", block: "start" });
    } catch (x) {
      e.scrollIntoView();
    }
    const f = e.dataset && e.dataset.f && $("#" + e.dataset.f);
    if (f)
      try {
        f.focus({ preventScroll: true });
      } catch (x) {}
  } else window.scrollTo(0, 0);
}
async function send() {
  const g = id => (($("#" + id) || {}).value || "").trim(),
    rec = S.rec && (ecK() || modK());
  if (!rec)
    S.d = {
      ty: g("fy"),
      dm: g("fdm"),
      fn: g("fn") || (known() ? fullName() : ""),
      ft: g("ft") || (known() ? myTel() : ""),
      fo: g("fo"),
      fm: g("fm")
    };
  if (!S.d.fn || !S.d.fm) {
    S.err = tr("u_indiquez_votre_nom_et");
    return;
  }
  if (!S.tok && !S.user) {
    S.err = tr("u_veuillez_valider_la_verification");
    return;
  }
  const files = rec ? (S.d.files || []).slice(0, 3) : [...($("#ff").files || [])].slice(0, 3),
    blobs = [];
  try {
    for (const f of files) {
      if (f.type != "application/pdf" && !/^image\//.test(f.type)) throw new Error(tr("v_format_non_accepte_photo"));
      const bl = f.type == "application/pdf" ? f : await comp(f);
      if (bl.size > 3145728) throw new Error(tr("v_une_piece_depasse_3"));
      blobs.push(bl);
    }
  } catch (e) {
    S.err = e.message && !/bitmap|decode|source/i.test(e.message) ? e.message : tr("v_piece_illisible_utilisez_une");
    return;
  }
  const sg = S.user ? {} : await sb.auth.signInAnonymously({ options: { captchaToken: S.tok } });
  if (sg.error) {
    S.err = tr("u_verification_refusee_reessayez");
    return;
  }
  try {
    const cid = S.cid,
      paths = [];
    for (const bl of blobs) {
      const p =
          cid +
          "/" +
          crypto.randomUUID() +
          "." +
          (bl.type == "application/pdf" ? "pdf" : bl.type == "image/png" ? "png" : bl.type == "image/webp" ? "webp" : "jpg"),
        u = await sb.storage.from("pieces").upload(p, bl, { contentType: bl.type });
      if (u.error) throw new Error(tr("v_envoi_d_une_piece"));
      paths.push(p);
    }
    const r = await sb.rpc("creer_demande", {
      p_commune: S.slug,
      p_type: (dmSel() || {}).type || S.d.ty || CATS.find(x => x[0] == S.cat)[3][0],
      p_nom: S.d.fn,
      p_message: S.d.fm,
      p_objet: S.d.fo || (dmSel() || {}).titre || null,
      p_contact: S.d.ft || null,
      p_pieces: paths,
      ...(dmSel() ? { p_demarche: dmSel().id } : {})
    });
    if (r.error) throw new Error(tr("v_envoi_impossible_verifiez_les"));
    if (!S.user) addM(r.data);
    S.ok = r.data;
    S.cat = null;
    S.lst = false;
    S.ls = false;
    S.rec = false;
    S.d = {};
    await loadMine();
  } catch (e) {
    S.err = e.message || "Erreur réseau. Réessayez.";
  } finally {
    if (!S.user)
      try {
        await sb.auth.signOut();
      } catch (e) {}
  }
}
async function cmpl() {
  const fs = [...(($("#cf") || {}).files || [])].slice(0, 3),
    bl = [];
  if (!fs.length) {
    S.err = tr("u_choisissez_au_moins_une");
    return;
  }
  if (!S.tok && !S.user) {
    S.err = tr("u_veuillez_valider_la_verification");
    return;
  }
  try {
    for (const f of fs) {
      if (f.type != "application/pdf" && !/^image\//.test(f.type)) throw new Error(tr("v_format_non_accepte_photo"));
      const b = f.type == "application/pdf" ? f : await comp(f);
      if (b.size > 3145728) throw new Error(tr("v_une_piece_depasse_3"));
      bl.push(b);
    }
  } catch (e) {
    S.err = e.message && !/bitmap|decode|source/i.test(e.message) ? e.message : tr("v_piece_illisible");
    return;
  }
  const sg = S.user ? {} : await sb.auth.signInAnonymously({ options: { captchaToken: S.tok } });
  if (sg.error) {
    S.err = tr("u_verification_refusee_reessayez");
    return;
  }
  try {
    const ps = [];
    for (const b of bl) {
      const p =
          S.cid +
          "/" +
          crypto.randomUUID() +
          "." +
          (b.type == "application/pdf" ? "pdf" : b.type == "image/png" ? "png" : b.type == "image/webp" ? "webp" : "jpg"),
        u = await sb.storage.from("pieces").upload(p, b, { contentType: b.type });
      if (u.error) throw new Error(tr("v_envoi_d_une_piece2"));
      ps.push(p);
    }
    const r = await sb.rpc("completer_demande", { p_commune: S.slug, p_numero: S.res.numero, p_pieces: ps });
    if (r.error || !r.data) throw new Error(tr("v_envoi_impossible_le_dossier"));
    const q = (await sb.rpc("suivre_demande", { p_commune: S.slug, p_numero: S.res.numero })).data;
    if (q && q[0]) S.res = Object.assign({ numero: S.res.numero }, q[0]);
  } catch (e) {
    S.err = e.message || "Erreur réseau.";
  } finally {
    if (!S.user)
      try {
        await sb.auth.signOut();
      } catch (e) {}
  }
}
document.addEventListener("change", e => {
  if (e.target.id == "fdm") {
    S.d.dm = e.target.value;
    const i = $("#dmi");
    if (i) i.innerHTML = dmInfo();
  } else if (e.target.id == "rs" && S.rdv && S.plan && S.d.rd) {
    S.d.rs = e.target.value;
    rvSlots(S.d.rd, false);
  } else if (e.target.id == "rd" && S.rdv && S.plan) {
    rvSlots(e.target.value, false);
  } else if (e.target.name == "ecm") {
    ecSv();
    S.d.ecm = e.target.value;
    const b = $("#ecb");
    if (b) b.innerHTML = ecBody();
  }
});
document.addEventListener("keydown", e => {
  if (e.key == "Escape") dlgClose();
  if (e.key == "Enter" && e.target && e.target.id == "q") {
    e.preventDefault();
    const b = $('[data-a="srch"]');
    if (b) b.click();
  }
});
document.addEventListener("click", async e => {
  if (e.target && e.target.id == "dlg") {
    dlgClose();
    return;
  }
  const t = e.target.closest("[data-a]");
  if (!t) return;
  const a = t.dataset.a;
  if (a.slice(0, 3) == "dlg" && !dlgAct(a, t)) return;
  S.err = "";
  S.inf = "";
  S.rinf = "";
  if (a != "rsend") S.rok = "";
  if (!["ecrev", "ecedit", "mrev", "medit", "send", "copy", "back"].includes(a)) S.rec = false;
  try {
    if (a == "goc") {
      const c = await findC((($("#cc") || {}).value || "").trim());
      if (c) await choose(c);
      else S.err = tr("u_commune_introuvable_verifiez_le");
    } else if (a == "retry") {
      await boot();
    } else if (a == "ecrev") {
      ecRev();
    } else if (a == "mrev") {
      modRev();
    } else if (a == "medit") {
      S.rec = false;
    } else if (a == "ecedit") {
      S.rec = false;
    } else if (a == "chg") {
      S.co = "";
      S.slug = "";
      S.slug0 = "";
      S.cid = null;
      S.icn = undefined;
      S.idt = {};
      S.pt = {};
      S.info = {};
      S.cat = null;
      S.lst = false;
      S.ls = false;
      S.res = null;
      S.ok = "";
      S.esp = false;
      S.menu = false;
      S.from = "";
      try {
        history.replaceState(null, "", location.pathname);
        localStorage.removeItem("mc_co");
      } catch (x) {}
    } else if (a == "mnu") {
      S.menu = !S.menu;
    } else if (a == "goto") {
      S.menu = false;
      S.rdv = false;
      S.cat = null;
      S.lst = false;
      S.ls = false;
      S.res = null;
      S.esp = false;
      S.ok = "";
      S.from = "";
      S.sc = t.dataset.t;
    } else if (a == "srch") {
      S.cat = null;
      S.lst = false;
      S.ls = false;
      S.res = null;
      S.esp = false;
      S.sc = "services";
    } else if (a == "cat" && t.dataset.c == "Audiences et rendez-vous") {
      S.rdv = true;
      S.cat = null;
      S.lst = false;
      S.ls = false;
      S.ok = "";
      S.d = {};
      S.menu = false;
    } else if (a == "rdv") {
      S.rdv = true;
      S.cat = null;
      S.lst = false;
      S.ls = false;
      S.ok = "";
      S.d = {};
      S.menu = false;
      S.res = null;
      S.esp = false;
    } else if (a == "cat") {
      S.cat = t.dataset.c;
      S.ok = "";
      S.d = {};
      S.menu = false;
      S.ls = dmL().length + racL().length > 0;
      S.lst = S.ls;
    } else if (a == "dm") {
      S.d = { dm: t.dataset.d };
      S.lst = false;
      S.ok = "";
    } else if (a == "rc") {
      S.d = { dm: cat4(t.dataset.r), fo: t.dataset.r, ec: ECK[t.dataset.r] || "" };
      S.lst = false;
      S.ok = "";
    } else if (a == "hit") {
      S.cat = t.dataset.c;
      S.d = { dm: t.dataset.d || "", fo: t.dataset.r || "", ec: ECK[t.dataset.r || ""] || "" };
      S.lst = false;
      S.ls = true;
      S.ok = "";
      S.menu = false;
      S.q = "";
    } else if (a == "back") {
      if (S.rdv) S.rdv = false;
      else if (S.rec) S.rec = false;
      else if (S.res) {
        S.res = null;
        if (S.from == "esp") {
          S.esp = true;
          S.from = "";
        }
      } else if (S.cat && !S.lst && S.ls) S.lst = true;
      else {
        S.cat = null;
        S.lst = false;
        S.ls = false;
      }
    } else if (a == "esp") {
      S.rdv = false;
      S.esp = true;
      S.au = {};
      S.menu = false;
      S.cat = null;
      S.lst = false;
      S.ls = false;
      S.ok = "";
      if (S.user)
        try {
          await loadNt();
          await loadMine();
          await loadRdv();
        } catch (x) {}
    } else if (a == "espx") {
      S.esp = false;
    } else if (a == "lang") {
      const l = t.dataset.l;
      if (l == "fr" || langsOk().includes(l)) {
        S.lang = l;
        lss("mc_lang", l);
        document.documentElement.lang = l == "sr" ? "sr" : l;
      }
    } else if (a == "inst") {
      if (IP) {
        IP.prompt();
        try {
          await IP.userChoice;
        } catch (x) {}
        IP = null;
      }
    } else if (a == "instx") {
      lss("mc_inst", "1");
    } else if (a == "pshon") {
      await pushOn();
    } else if (a == "pshoff") {
      await pushOff();
    } else if (a == "otpx") {
      S.au = {};
    } else if (a == "otp") {
      await otp();
    } else if (a == "vfy") {
      await vfy();
    } else if (a == "psave") {
      await psave();
    } else if (a == "nrd") {
      await sb.from("citoyen_notifications").update({ lu: true }).eq("lu", false);
      await loadNt();
    } else if (a == "nopen") {
      await sb.from("citoyen_notifications").update({ lu: true }).eq("id", t.dataset.i);
      await loadNt();
      if (await openN(t.dataset.n)) {
        S.from = "esp";
        S.esp = false;
      } else S.err = tr("u_ce_dossier_n_est");
    } else if (a == "lout") {
      await sb.auth.signOut();
      S.user = null;
      S.prof = null;
      S.nt = [];
      S.esp = false;
      S.res = null;
      S.from = "";
      S.d = {};
      S.ok = "";
      try {
        await loadMine();
        await loadRdv();
      } catch (x) {}
    } else if (a == "copy") {
      try {
        await navigator.clipboard.writeText(S.ok);
        t.textContent = tr("v_copie");
      } catch (x) {}
      return;
    } else if (a == "rsend") {
      t.disabled = true;
      t.textContent = tr("v_envoi_en_cours");
      await rdvSend();
    } else if (a == "rcan") {
      if (!confirm(tr("v_annuler_ce_rendez_vous"))) return;
      t.disabled = true;
      const r = await sb.rpc("annuler_rdv", { p_commune: S.slug, p_numero: t.dataset.n });
      if (r.error || !r.data) S.err = tr("u_annulation_impossible_ce_rendez");
      else S.rinf = tr("v_rendez_vous_annule_le");
      await loadRdv();
    } else if (a == "send") {
      t.disabled = true;
      t.textContent = tr("v_envoi_en_cours");
      await send();
    } else if (a == "cmpl") {
      t.disabled = true;
      t.textContent = tr("v_envoi_en_cours");
      await cmpl();
    } else if (a == "open" || a == "track") {
      const n = a == "open" ? t.dataset.n : (($("#tk") || {}).value || "").trim().toUpperCase();
      S.tr = n;
      const r = n ? (await sb.rpc("suivre_demande", { p_commune: S.slug, p_numero: n })).data : null;
      if (r && r[0]) {
        S.from = a == "open" && S.esp ? "esp" : "";
        S.esp = false;
        S.res = Object.assign({ numero: n }, r[0]);
        if (!S.user) addM(n);
        await loadMine();
      } else S.err = tr("u_aucune_demande_avec_ce");
    }
  } catch (x) {
    S.err = tr("u_erreur_reseau_reessayez");
  }
  render();
  go();
});
document.addEventListener("input", e => {
  if (e.target.id == "dq") {
    S.dq = e.target.value;
    const r = $("#dlr");
    if (r) r.innerHTML = dlgList();
    return;
  }
  if (e.target.id == "q") {
    S.q = e.target.value;
    const tl = $("#tl");
    if (tl) tl.innerHTML = tiles();
  }
});
/* null = commune introuvable ; lève une erreur si le réseau/serveur échoue */
async function findC(s) {
  s = String(s || "")
    .toLowerCase()
    .trim();
  if (!/^[a-z0-9-]{1,40}$/.test(s)) return null;
  const r = await sb.rpc("commune_par_slug", { p_slug: s });
  if (r.error) throw r.error;
  return (r.data || [])[0] || null;
}
/* sous-domaine / domaine propre à la commune (ignoré sur workers.dev, pages.dev, localhost, IP) */
async function findH() {
  const h = location.hostname;
  if (!/\./.test(h) || /(^|\.)(workers|pages)\.dev$|^\d+\.\d+\.\d+\.\d+$/.test(h)) return null;
  try {
    const r = await sb.rpc("commune_par_hote", { p_hote: h });
    return (r.data || [])[0] || null;
  } catch (e) {
    return null;
  }
}
/* Ordre : ?c=slug > mémorisé (localStorage) > sous-domaine. Réseau KO : copie locale si elle existe. */
async function boot() {
  let q = null,
    sl = null;
  try {
    q = new URLSearchParams(location.search).get("c");
  } catch (e) {}
  sl = q;
  try {
    sl = sl || localStorage.getItem("mc_co");
  } catch (e) {}
  sl = sl && /^[a-z0-9-]{1,40}$/i.test(sl) ? sl.toLowerCase() : null;
  try {
    let c = sl ? await findC(sl) : null;
    if (!c && !sl) c = await findH();
    if (c) {
      await choose(c);
    } else if (sl) {
      S.err = q ? "Commune introuvable. Utilisez le lien ou le QR code de votre mairie." : "";
      try {
        localStorage.removeItem("mc_co");
      } catch (e) {}
    }
  } catch (e) {
    const k = sl && cacheGet(sl);
    if (k) {
      S.co = k.nom;
      S.slug = sl;
      S.cid = k.id;
      S.icn = undefined;
      S.info = k.info || {};
      S.idt = k.idt || {};
      S.pt = k.pt || {};
      S.pub = k.pub || [];
      S.pj = k.pj || [];
      S.dm = k.dm || [];
      S.err = tr("u_connexion_limitee_les_informations");
    } else {
      S.slug0 = sl || "";
      S.err = tr("u_connexion_impossible_verifiez_votre");
    }
  }
}
(async () => {
  try {
    const s0 = (await sb.auth.getSession()).data.session;
    if (s0 && s0.user.is_anonymous) await sb.auth.signOut();
    else if (s0) S.user = s0.user;
  } catch (e) {}
  await boot();
  try {
    if (S.user) await loadAcc();
  } catch (e) {}
  render();
})();
setInterval(async () => {
  if (S.user && !document.hidden && navigator.onLine !== false) {
    try {
      await loadNt();
      const b = $(".tm");
      if (b) b.textContent = btl();
    } catch (e) {}
  }
}, 60000);

// ==========================================
// MODULE : SIGNALEMENT CITOYEN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal-signalement');
  const btnOuvrir = document.getElementById('btn-ouvrir-signalement');
  const btnFermer = document.getElementById('btn-fermer-signalement');
  const form = document.getElementById('form-signalement');
  const btnEnvoyer = document.getElementById('btn-envoyer-signalement');
  
  let map = null;
  let marker = null;
  let latSelectionnee = null;
  let lngSelectionnee = null;

  if (!btnOuvrir) return; // Sécurité si le HTML n'est pas encore là

  btnOuvrir.addEventListener('click', () => {
    modal.style.display = 'flex';
    if (!map) {
      map = L.map('map-signalement').setView([14.4974, -14.4524], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          map.setView([lat, lng], 16);
          placerMarqueur(lat, lng);
        });
      }
      map.on('click', (e) => { placerMarqueur(e.latlng.lat, e.latlng.lng); });
    } else {
      setTimeout(() => { map.invalidateSize(); }, 200);
    }
  });

  function placerMarqueur(lat, lng) {
    latSelectionnee = lat;
    lngSelectionnee = lng;
    if (marker) {
      marker.setLatLng([lat, lng]);
    } else {
      marker = L.marker([lat, lng]).addTo(map);
    }
  }

  btnFermer.addEventListener('click', () => { modal.style.display = 'none'; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!latSelectionnee || !lngSelectionnee) {
      alert("Veuillez sélectionner un emplacement sur la carte.");
      return;
    }

    btnEnvoyer.disabled = true;
    btnEnvoyer.textContent = "Envoi en cours...";

    try {
      const categorie = document.getElementById('signalement-categorie').value;
      const description = document.getElementById('signalement-description').value;
      const photoFile = document.getElementById('signalement-photo').files[0];

      // ⚠️ TODO : REMPLACEZ PAR VOTRE LOGIQUE DE RÉCUPÉRATION D'ID
      const communeId = window.currentCommuneId || "98002283-4fc0-4eff-8182-af1eec9a321d"; 
      const citoyenId = window.currentUserId || "98002283-4fc0-4eff-8182-af1eec9a321d"; 

      let photoUrl = null;

      if (photoFile) {
        const fileName = `signalement_${Date.now()}_${photoFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const { error: uploadError } = await supabase.storage.from('signalements-photos').upload(`public/${fileName}`, photoFile);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('signalements-photos').getPublicUrl(`public/${fileName}`);
        photoUrl = publicUrlData.publicUrl;
      }

      const { error: dbError } = await supabase.from('signalements_citoyens').insert([{
        commune_id: communeId,
        citoyen_id: citoyenId,
        categorie: categorie,
        description: description,
        photo_url: photoUrl,
        latitude: latSelectionnee,
        longitude: lngSelectionnee
      }]);

      if (dbError) throw dbError;

      alert("✅ Signalement envoyé avec succès !");
      form.reset();
      modal.style.display = 'none';
      if (marker) { map.removeLayer(marker); marker = null; }
      latSelectionnee = null; lngSelectionnee = null;

    } catch (error) {
      console.error(error);
      alert("❌ Erreur lors de l'envoi : " + error.message);
    } finally {
      btnEnvoyer.disabled = false;
      btnEnvoyer.textContent = "Envoyer le signalement";
    }
  });
});
