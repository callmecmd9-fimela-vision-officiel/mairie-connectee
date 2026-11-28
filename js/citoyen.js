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
      "Conservez-le : il vous permet de suivre votre dossier. Connectez-vous pour le retrouver dans « Mes demandes ».",
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
  /* Anciennes versions : numéros de dossiers mémorisés sur l'appareil. Plus utilisés (P0 sécurité) : effacés pour qu'aucun autre utilisateur de l'appareil ne puisse les exploiter. */
  purgeM = () => {
    try {
      localStorage.removeItem(KM());
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
/* P0 sécurité (Loi 2008-12) : « Mes demandes » = uniquement les dossiers du compte connecté. La RPC mes_demandes_compte filtre côté serveur sur auth.uid() (citoyen_id) et ne renvoie que numero/type/statut ; suivre_demandes est appelée avec ces seuls numéros. Sans connexion : aucune liste, aucun appel serveur (le suivi d'un dossier précis passe par le numéro de suivi : suivre_demande / suivi_public). Les numéros mémorisés sur l'appareil ne sont plus fusionnés : sur un appareil partagé, un autre compte ne doit jamais les voir. */
async function loadMine() {
  try {
    S.mine = [];
    S.quit = [];
    S.taxes = [];
    S.taxErr = "";
    if (S.slug) purgeM();
    if (!S.user || !S.user.id || !S.slug) return;
    const r = await rpcTel("mes_demandes_par_tel", "mes_demandes_compte", { p_commune: S.slug });
    const acc = [...new Set((r.data || []).filter(x => !x.commune_slug || x.commune_slug === S.slug).map(x => x.numero))];
    S.mine = acc.length ? (await sb.rpc("suivre_demandes", { p_commune: S.slug, p_numeros: acc })).data || [] : [];
    /* Lot 7 : « Mes quittances » (paiements du compte, RLS : citoyen_id = utilisateur) */
    {
      const q = await sb
        .from("paiements_taxes")
        .select("reference_paiement,type_taxe,montant,date_paiement,created_at")
        .eq("statut", "paye")
        .order("created_at", { ascending: false })
        .limit(50);
      S.quit = q.data || [];
    }
    await loadTaxes();
  } catch (e) {
    S.mine = S.mine || [];
  }
}
/* « Mes Taxes » : la RPC filtre sur le compte connecté ; on n'affiche que la commune ouverte. */
/* RPC « par téléphone » (mes_roles_imposition_par_tel, mes_demandes_par_tel) : on envoie le numéro du compte connecté ; le serveur le compare au téléphone vérifié par SMS du JWT et renvoie une liste VIDE (jamais une erreur, jamais le dossier d'un tiers) si le numéro est inconnu ou n'est pas celui du compte. Sans numéro vérifié : liste vide, aucun appel. Repli sur la RPC historique tant que la migration 20261204000100 n'est pas appliquée. */
const telCompte = () => nph(S.user && S.user.phone);
const RPC_ABSENTE = /PGRST202|42883|could not find the function|does not exist/i;
async function rpcTel(nom, repli, argsRepli) {
  const tel = telCompte();
  if (!tel) return { data: [] };
  let r;
  try {
    r = await sb.rpc(nom, { p_telephone: tel });
  } catch (e) {
    r = { error: e };
  }
  if (r && r.error && RPC_ABSENTE.test(String(r.error.code || "") + " " + String(r.error.message || ""))) {
    try {
      r = await sb.rpc(repli, argsRepli);
    } catch (e) {
      r = { error: e };
    }
  }
  return r || { data: [] };
}
async function loadTaxes() {
  const uid = S.user && S.user.id,
    slug = S.slug;
  S.taxes = [];
  S.taxErr = "";
  if (!uid || !slug) return;
  let r;
  try {
    r = await rpcTel("mes_roles_imposition_par_tel", "mes_roles_imposition");
  } catch (e) {
    r = { error: e };
  }
  if (!S.user || S.user.id !== uid || S.slug !== slug) return;
  if (r.error) S.taxErr = "Vos taxes sont indisponibles pour le moment.";
  else S.taxes = (Array.isArray(r.data) ? r.data : []).filter(x => x && x.commune_slug === slug);
  /* Fournisseurs de paiement en ligne actifs pour la commune et leur mode (sandbox = test). Échec : pas de paiement en ligne. */
  S.txm = {};
  try {
    const m = await sb.rpc("modes_paiement_commune", { p_commune: slug });
    if (S.user && S.user.id === uid && S.slug === slug)
      (m.data || []).forEach(z => {
        if (TXP[z.fournisseur] && (z.mode == "sandbox" || z.mode == "production")) S.txm[z.fournisseur] = z.mode;
      });
  } catch (e) {}
}
/* « Payer en ligne » : génère (ou rappelle) la référence PAY-TAXE-AAAA-NNNNNN du rôle via initier_paiement_taxe, puis rafraîchit l'écran quelques secondes plus tard pour refléter une confirmation reçue par le webhook. */
const TX_SBX_MSG = "Mode Sandbox : simulation de paiement. Présentez cette référence au guichet.";
const TX_REF_OK = /^[A-Z0-9-]{10,60}$/;
const TX_REF_FIRST_MS = 5000,
  TX_REF_NEXT_MS = 10000,
  TX_REF_MAX = 4;
let txRefTimer = null;
function txRefStop() {
  if (txRefTimer) clearTimeout(txRefTimer);
  txRefTimer = null;
}
function txRefreshLater(n) {
  txRefStop();
  n = n || 0;
  if (n >= TX_REF_MAX) return;
  txRefTimer = setTimeout(
    async () => {
      txRefTimer = null;
      const w = S.txr;
      if (!w || !S.user || S.user.id !== w.uid || S.slug !== w.slug) return;
      await loadTaxes();
      if (S.txr !== w) return;
      const x = (S.taxes || []).find(z => z.id == w.id);
      if (!x || x.statut != "en_attente_paiement") S.txr = null;
      txRender();
      if (S.txr) txRefreshLater(n + 1);
    },
    n ? TX_REF_NEXT_MS : TX_REF_FIRST_MS
  );
}
async function payTaxe(id) {
  S.err = "";
  let r;
  try {
    r = await sb.rpc("initier_paiement_taxe", { p_role_id: id });
  } catch (e) {
    r = { error: e };
  }
  const ref = r && r.data ? String(r.data.reference || "") : "";
  if (!r || r.error || !TX_REF_OK.test(ref)) {
    S.err = "Impossible de générer la référence de paiement. Réessayez ou contactez la mairie.";
    await loadTaxes();
    return;
  }
  S.txr = { id, ref, uid: S.user && S.user.id, slug: S.slug };
  await loadTaxes();
  txRefreshLater(0);
}
/* Paiement en ligne (Wave / Orange Money). Le citoyen n'a aucun pouvoir sur le statut : le lien est généré par la RPC
   initier_paiement_en_ligne ; seule la confirmation du fournisseur (webhook → service_role) passe le rôle à « payée ».
   L'écran d'attente interroge la RPC statut_paiement_en_ligne (polling) jusqu'à confirmation, échec ou délai dépassé. */
const TXP = { wave: "Wave", orange_money: "Orange Money" };
const TX_POLL_MS = 4000,
  TX_MAX_MS = 600000;
const TX_URL_OK = /^https:\/\/(?:[a-z0-9-]+\.)*(?:wave\.com|orange\.com|orange-sonatel\.com|sonatel\.com)(?:[/?#]|$)/i;
let txTimer = null;
const txRender = () => {
  if (typeof render == "function") render();
};
function txStop() {
  if (txTimer) clearInterval(txTimer);
  txTimer = null;
}
function txReset() {
  txStop();
  txRefStop();
  S.txw = null;
  S.txc = "";
  S.txr = null;
}
async function txPoll() {
  const w = S.txw;
  if (!w || w.etat != "attente") return txStop();
  if (!S.user || !S.user.id || S.user.id !== w.uid || S.slug !== w.slug) return txReset();
  if (Date.now() - w.t0 > TX_MAX_MS) {
    w.etat = "delai";
    txStop();
    return txRender();
  }
  let r;
  try {
    r = await sb.rpc("statut_paiement_en_ligne", { p_role_id: w.id });
  } catch (e) {
    return;
  }
  if (S.txw !== w || w.etat != "attente" || r.error || !r.data) return;
  if (r.data.role_statut == "payee" || r.data.paiement_statut == "paye") {
    w.etat = "ok";
    w.qref = r.data.quittance_ref || "";
    txStop();
    await loadTaxes();
    txRender();
  } else if (r.data.paiement_statut == "echoue") {
    w.etat = "echec";
    txStop();
    txRender();
  }
}
async function payEnLigne(id, prov) {
  if (!TXP[prov]) return;
  S.err = "";
  let r;
  try {
    r = await sb.rpc("initier_paiement_en_ligne", { p_role_id: id, p_provider: prov });
  } catch (e) {
    r = { error: e };
  }
  const d = r && r.data;
  const sbx = !!d && d.mode == "sandbox";
  /* Sandbox : lien factice, jamais ouvert. Production : uniquement un lien HTTPS d'un hôte de fournisseur autorisé. */
  const bon = !!d && !!d.payment_url && (sbx || (d.mode == "production" && TX_URL_OK.test(String(d.payment_url))));
  if (r.error || !bon) {
    S.err = "Le paiement en ligne est indisponible pour le moment. Payez au guichet ou réessayez plus tard.";
    return;
  }
  txStop();
  S.txc = "";
  S.txw = {
    id,
    prov,
    mode: d.mode,
    ref: String(d.reference || ""),
    url: sbx ? "" : String(d.payment_url),
    etat: "attente",
    t0: Date.now(),
    uid: S.user && S.user.id,
    slug: S.slug,
    qref: ""
  };
  txTimer = setInterval(txPoll, TX_POLL_MS);
  await loadTaxes();
}
function txOpen() {
  const w = S.txw;
  if (w && w.mode == "production" && w.url && TX_URL_OK.test(w.url)) window.open(w.url, "_blank", "noopener");
}
const TXTEST = "Mode test : le paiement sera simulé";
const TXS = { emise: "À payer", en_attente_paiement: "En attente de paiement", payee: "Payée" };
const txWait = w => {
  const pn = esc(TXP[w.prov] || "");
  if (w.etat == "ok")
    return `<div class="okb" role="status"><b>Paiement confirmé.</b> Merci !${
      /^[A-Z0-9-]{10,60}$/.test(w.qref) ? `<br><button class="bo" data-a="txquit" data-ref="${esc(w.qref)}">Voir la quittance</button>` : ""
    }</div><button class="bo" data-a="txwx">Fermer</button>`;
  if (w.etat == "echec")
    return `<p class="al" role="alert">Le paiement ${pn} a échoué ou a été annulé. Aucun montant n’est dû si vous n’avez pas été débité.</p><button class="bt" data-a="txol" data-id="${esc(w.id)}" data-p="${esc(w.prov)}">Réessayer</button> <button class="bo" data-a="txwx">Fermer</button>`;
  if (w.etat == "delai")
    return `<p class="mu" role="status">Confirmation pas encore reçue. Si vous avez payé, votre quittance apparaîtra ici dès que ${pn} nous aura confirmé le paiement (référence <b>${esc(w.ref)}</b>).</p><button class="bo" data-a="txwx">Fermer</button>`;
  if (w.mode == "sandbox")
    return `<div role="status" aria-live="polite"><p><b>En attente de confirmation…</b></p><p class="okb">${TXTEST}. Aucun argent réel n’est prélevé : la validation est simulée par l’équipe de test et cette page se met à jour automatiquement.<br>Référence : <b>${esc(w.ref)}</b></p><button class="bo" data-a="txwx">Annuler l’attente</button></div>`;
  return `<div role="status" aria-live="polite"><p><b>En attente de confirmation…</b></p><p class="mu">Ouvrez ${pn}, validez le paiement, puis revenez ici : cette page se met à jour automatiquement.<br>Référence : <b>${esc(w.ref)}</b></p><button class="bt" data-a="txopen">Ouvrir ${pn} pour payer</button> <button class="bo" data-a="txwx">Annuler l’attente</button></div>`;
};
const txChoix = x => {
  const fr = Object.keys(S.txm || {}).filter(k => TXP[k]);
  const test = fr.filter(k => S.txm[k] == "sandbox").map(k => TXP[k]);
  return `<div class="c-m10">${x.statut == "emise" ? `<button class="bt" data-a="txpay" data-id="${esc(x.id)}">Payer en ligne</button>` : ""}${
    fr.length ? ` <button class="bt" data-a="txonl" data-id="${esc(x.id)}">Payer par Wave/OM</button>` : ""
  }${
    fr.length && S.txc == x.id
      ? `<p class="mu">Choisissez votre moyen de paiement :</p>${fr
          .map(k => `<button class="bt" data-a="txol" data-id="${esc(x.id)}" data-p="${esc(k)}">${esc(TXP[k])}</button>`)
          .join(" ")}${test.length ? `<p class="okb">${TXTEST} (${esc(test.join(", "))}).</p>` : ""}`
      : ""
  }</div>`;
};
/* Sandbox = aucun fournisseur actif en production pour cette commune : la référence se présente au guichet. */
const txSandbox = () => !Object.keys(S.txm || {}).some(k => S.txm[k] == "production");
const taxCard = () =>
  `<div class="cd" id="taxes"><h2>Mes Taxes</h2>${
    S.taxErr
      ? `<p class="mu" role="alert">${esc(S.taxErr)}</p>`
      : (S.taxes || []).length
        ? S.taxes
            .map(
              x =>
                `<div class="c-m10"><p><b>${esc(x.libelle)}</b> · ${esc(x.annee)}<br>${esc(pfm(x.montant_du))} · ${esc(TXS[x.statut] || x.statut)}</p>${
                  S.txw && S.txw.id == x.id
                    ? txWait(S.txw)
                    : x.statut == "emise"
                      ? txChoix(x)
                      : x.statut == "en_attente_paiement"
                        ? `<p class="okb" role="status">Référence : <b>${esc(x.reference_avis)}</b><br>${esc(txSandbox() ? TX_SBX_MSG : "Présentez cette référence au guichet ou payez en ligne ci-dessous.")}</p>${txChoix(x)}`
                        : x.statut == "payee" && x.quittance_ref
                          ? `<button class="bo" data-a="txquit" data-ref="${esc(x.quittance_ref)}">Voir la quittance</button>`
                          : ""
                }</div>`
            )
            .join("")
        : '<p class="mu">Aucune taxe à votre nom. En cas d’erreur, contactez la mairie.</p>'
  }</div>`;
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
  let i, p, dm, id, pt, pl, tf;
  try {
    [i, p, dm, id, pt, pl, tf] = await Promise.all([
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
      ),
      sb.rpc("tarifs_commune", { p_commune: c.slug }).then(
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
  S.tf = (tf && tf.data) || [];
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
    ? `<div class="okb" role="status"><b>${tr("u_demande_enregistree")}</b><br>${tr("u_votre_numero_de_suivi")} <b class="c-fs20">${esc(S.ok)}</b><br><span class="sm">${S.user ? tr("v_conservez_le_votre_dossier") : tr("v_conservez_le_il_vous")}</span><p class="c-m10"><button class="bo" data-a="copy">${tr("u_copier_le_numero")}</button></p>${payOk()}</div>`
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
const navb = c => NAVL.map(n => `<button class="${c}" data-a="goto" data-t="${n[0]}">${n[1]}</button>`).join("") + `<button class="${c}" data-a="mtx">Mes Taxes</button>`;
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
  return `${head()}<main id="mc" class="mn nh">${msgs()}<div class="cd"><button class="lk c-cg" data-a="back">${tr("back")}</button><h1>${esc(r.type)}</h1><p class="mu sm">Dossier ${esc(r.numero)} · déposé le ${fdt(r.cree)}</p>${bd(r.statut)}${steps(r.statut)}<p>${esc(SX[r.statut] || "")}</p><p><b>${tr("u_service_responsable")}</b> ${esc(SV[r.service] || tr("v_en_cours_d_orientation"))}</p>${r.reponse ? `<div class="${r.statut == "rejetee" || r.statut == "en_attente_pieces" ? "al" : "okb"}"><b>${r.statut == "rejetee" ? "Motif du rejet" : r.statut == "en_attente_pieces" ? tr("u_pieces_a_fournir") : r.statut == "pret_a_retirer" ? tr("v_retrait_lieu_et_modalites") : tr("v_reponse_de_la_mairie")}</b><br>${esc(r.reponse).replace(/\n/g, "<br>")}</div>${r.statut == "pret_a_retirer" ? retrait() : ""}` : '<p class="mu">Aucune réponse pour le moment. Revenez consulter ce dossier plus tard.</p>'}${r.statut == "en_attente_pieces" ? `<label for="cf">${tr("u_ajouter_les_pieces_demandees")}</label><input id="cf" type="file" multiple accept="image/*,application/pdf">${S.user ? "" : '<div id="ts"></div>'}<p><button class="bt" data-a="cmpl">${tr("u_envoyer_les_pieces")}</button></p>` : ""}${payDet(r)}<h3 class="c-fs16mt">${tr("u_historique")}</h3><ul class="hs">${(r.historique || []).map(h => `<li>${fdt(h.date)} : ${esc(SL[h.statut] || h.statut)}</li>`).join("")}</ul></div></main>`;
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
/* Paiement des démarches : le montant est calculé par le serveur ; ici affichage indicatif (tarif par démarche puis par catégorie). */
const pfm = m => (+m || 0).toLocaleString("fr-FR") + " FCFA";
const tfOf = () => {
  const dm = dmSel() || {},
    c = CATS.find(x => x[0] == S.cat) || [],
    ty = String(dm.type || S.d.ty || (c[3] || [])[0] || "").toLowerCase(),
    ob = String(S.d.fo || dm.titre || "").trim().toLowerCase(),
    L = S.tf || [],
    f = k => k && L.find(x => String(x.type_service).toLowerCase() == k),
    t = f(ob) || f(ty);
  return t ? +t.montant || 0 : 0;
};
/* Paiement mobile (Wave / Orange Money). simulation=true tant que les comptes marchands (Wave Business, Orange Money Business) n'existent pas :
   aucun argent n'est débité. À l'ouverture des comptes : renseigner "marchand", brancher l'API via une Edge Function, puis passer simulation à false. */
const PAYCFG = { simulation: true, operateurs: [{ id: "wave", nom: "Wave", marchand: "" }, { id: "om", nom: "Orange Money", marchand: "" }] };
const payOpNom = id => (PAYCFG.operateurs.find(o => o.id == id) || {}).nom || "";
/* Conformité (loi 2008-12) : consentement explicite avant tout dépôt. Case jamais pré-cochée (jamais mémorisée d’un écran à l’autre) ; refus = aucun envoi. */
const CONS_FINALITE = "depot_demande",
  CONS_VERSION = "2026-12-11";
const consBlock = () =>
  `<p class="c-mt12"><label for="fcons"><input type="checkbox" id="fcons"> J’accepte que mes données soient utilisées pour traiter ma demande. <a href="/confidentialite.html" target="_blank" rel="noopener">Politique de confidentialité</a></label></p>`;
const consRpc = accorde =>
  sb.rpc("enregistrer_consentement", { p_commune: S.slug, p_finalite: CONS_FINALITE, p_version: CONS_VERSION, p_accorde: accorde });
const payBlock = () => {
  const m = tfOf();
  if (!(m > 0)) return "";
  const pm = S.pmod || "",
    op = S.pop || "";
  return `<div class="cd" id="payb"><h3>Paiement : ${esc(pfm(m))}</h3><p class="mu sm">Cette démarche est payante : un numéro de téléphone est obligatoire (champ « Téléphone »).</p><div class="pmg"><button type="button" class="pmb${pm == "en_ligne" ? " on" : ""}" data-pm="en_ligne">Payer en ligne<small>Wave ou Orange Money${PAYCFG.simulation ? " (simulation)" : ""}</small></button><div class="pmo" id="pmo"${pm == "en_ligne" ? "" : " hidden"}>${PAYCFG.operateurs.map(o => `<button type="button" class="pmb${op == o.id ? " on" : ""}" data-op="${esc(o.id)}">${esc(o.nom)}</button>`).join("")}</div><button type="button" class="pmb${pm == "guichet" ? " on" : ""}" data-pm="guichet">Payer au guichet<small>En espèces à la mairie</small></button></div><p class="pmn" id="pmn" role="status">${pm == "guichet" ? "Vous réglerez en espèces à la mairie." : pm == "en_ligne" ? (op ? "Paiement " + esc(payOpNom(op)) + (PAYCFG.simulation ? " simulé : aucun argent n’est débité." : ".") : "Choisissez Wave ou Orange Money.") : "Choisissez un mode de paiement."}</p></div>`;
};
document.addEventListener("click", e => {
  const b = e.target && e.target.closest && e.target.closest("[data-pm],[data-op]");
  if (!b || !$("#payb")) return;
  if (b.dataset.pm) {
    S.pmod = b.dataset.pm;
    if (S.pmod != "en_ligne") S.pop = null;
  } else S.pop = b.dataset.op;
  document.querySelectorAll("#payb [data-pm]").forEach(x => x.classList.toggle("on", x.dataset.pm == S.pmod));
  document.querySelectorAll("#payb [data-op]").forEach(x => x.classList.toggle("on", x.dataset.op == S.pop));
  const o = $("#pmo"),
    n = $("#pmn");
  if (o) o.hidden = S.pmod != "en_ligne";
  if (n) n.textContent = S.pmod == "guichet" ? "Vous réglerez en espèces à la mairie." : S.pop ? "Paiement " + payOpNom(S.pop) + (PAYCFG.simulation ? " simulé : aucun argent n’est débité." : ".") : "Choisissez Wave ou Orange Money.";
});
const payOk = () => {
  const p = S.pm;
  if (!p || p.statut_paiement == "gratuit") return "";
  return p.statut_paiement == "paye" && p.reference
    ? `<p class="c-m10"><b>Paiement reçu : ${esc(pfm(p.montant))}</b> (simulation${p.op ? " · " + esc(payOpNom(p.op)) : ""}) <button class="bo" data-a="quit" data-ref="${esc(p.reference)}">Voir ma quittance</button></p>`
    : `<p class="c-m10"><b>À régler au guichet : ${esc(pfm(p.montant))}</b>. Présentez votre numéro de dossier ; la mairie délivrera le document après encaissement.</p>`;
};
const payDet = r => {
  const p = r.pay;
  if (!p || p.statut_paiement == "gratuit") return "";
  const late = p.date_limite && new Date(p.date_limite) < new Date() && p.statut_paiement != "paye";
  return `<div class="cd"><h3>Paiement</h3><p>${esc(pfm(p.montant))} · ${p.statut_paiement == "paye" ? "Payé" : "À régler au guichet"}${p.date_limite && p.statut_paiement != "paye" ? " avant le " + esc(new Date(p.date_limite).toLocaleDateString("fr-FR")) + (late ? " (délai dépassé)" : "") : ""}</p>${p.reference ? `<button class="bo" data-a="quit" data-ref="${esc(p.reference)}">Voir ma quittance</button>` : ""}${p.document_url ? ` <button class="bt" data-a="dldoc" data-p="${esc(p.document_url)}">Télécharger mon document</button>` : ""}</div>`;
};
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
  d.ft = val("ft") || myTel() || d.ft || "";
  if (!TELRE.test(String(d.ft).replace(/\s+/g, " ").trim())) {
    S.err = TELMSG;
    return;
  }
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
  return `${head()}<main id="mc" class="mn nh">${msgs()}<div class="cd"><button class="lk c-cg" data-a="ecedit">${tr("u_modifier")}</button><h1>${tr("u_verifiez_votre_demande")}</h1>${row("Document", "Extrait d’acte de " + ECL[k])}${row(tr("v_personne_concernee"), d.ecp)}${row("Conjoint", d.ecc)}${m == "n" ? row("N° d’acte", d.ecn) + row(tr("v_annee"), d.eca) : row(tr("v_pieces_jointes"), (d.files || []).map(f => f.name).join(", "))}${row("Demandeur", d.fn)}${row(tr("v_telephone"), d.ft)}<p class="mu sm">Le document se retire en mairie. ${S.user ? tr("v_vous_serez_prevenu_dans") : tr("v_gardez_le_numero_de")}</p>${S.user ? "" : '<div id="ts"></div>'}${payBlock()}${consBlock()}<p><button class="bt" id="sd" data-a="send">${tr("u_envoyer_ma_demande")}</button> <button class="bo" data-a="ecedit">${tr("u_modifier2")}</button></p></div></main>`;
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
  d.ft = val("ft") || myTel() || d.ft || "";
  if (!TELRE.test(String(d.ft).replace(/\s+/g, " ").trim())) {
    S.err = TELMSG;
    return;
  }
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
  return `${head()}<main id="mc" class="mn nh">${msgs()}<div class="cd"><button class="lk c-cg" data-a="medit">${tr("u_modifier")}</button><h1>${tr("u_verifiez_votre_demande")}</h1>${row(tr("u_demarche"), x.titre)}${m.f.map(f => row(f[1], d.mf[f[0]])).join("")}${row(tr("v_pieces_jointes"), (d.files || []).map(f => f.name).join(", "))}${row("Frais", frX(x))}${row("Service", svOf(x))}${row("Demandeur", d.fn)}${row(tr("v_telephone"), d.ft)}${x.retrait ? `<p class="mu sm">${esc(x.retrait)}</p>` : ""}${S.user ? "" : '<div id="ts"></div>'}${payBlock()}${consBlock()}<p><button class="bt" id="sd" data-a="send">${tr("u_envoyer_ma_demande")}</button> <button class="bo" data-a="medit">${tr("u_modifier2")}</button></p></div></main>`;
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
  d.ft = g("ft") || myTel() || d.ft || "";
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
const TELRE = /^\+?[0-9 ]{8,16}$/,
  TELMSG = "Indiquez un numéro de téléphone valide (WhatsApp) : il permet à la mairie de vous prévenir de l’avancement de votre demande.",
  telField = d =>
    `<label for="ft">Téléphone WhatsApp (pour être prévenu(e) de l’avancement)</label><input id="ft" type="tel" inputmode="tel" autocomplete="tel" placeholder="77 123 45 67" required value="${esc(d.ft || myTel())}">`;
const idBlock = d =>
  known()
    ? `<div class="okb c-okg"><b>Demande au nom de ${esc(fullName())}</b>${myTel() ? `<br><span class="sm">Téléphone : ${esc(myTel())}</span>` : ""}<br><button class="lk c-cg" data-a="esp">${tr("u_modifier_mon_profil")}</button></div>${myTel() ? "" : telField(d)}`
    : `<label for="fn">${tr("u_votre_nom_complet")}</label><input id="fn" autocomplete="name" value="${esc(d.fn || fullName())}">${telField(d)}`;
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
<p class="mu sm c-mt12">${tr("u_toutes_les_demandes_ne")}</p>${S.user ? "" : '<div id="ts"></div>'}${payBlock()}${consBlock()}<p><button class="bt" id="sd" data-a="send">${tr("u_envoyer_ma_demande")}</button></p></div></main>`;
};
/* Connexion « Mon Espace » par téléphone + code SMS (OTP). Si le fournisseur SMS de Supabase n'est pas activé, otp() affiche « pas encore disponible » (aucun faux succès). Mettre false pour fermer l'espace. */
const SMS_ON = true;
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
<div class="g2c"><div class="cd" id="mes"><h2>${tr("h_mine")}</h2>${m.length ? `<div class="rw c-cdf"><span>${tr("h_dep")}</span><span class="nb b1">${m.length}</span></div><div class="rw c-cdf"><span>${tr("h_cur")}</span><span class="nb b2">${en}</span></div><div class="rw c-cdf"><span>${tr("h_done")}</span><span class="nb b3">${fi}</span></div>${m.map(x => `<button class="rw" data-a="open" data-n="${esc(x.numero)}"><span><b>${esc(x.type)}</b><br><span class="mu sm">${esc(x.numero)}</span></span>${bd(x.statut)}</button>`).join("")}` : `<p class="mu">${S.user ? "Aucune demande dans votre compte pour le moment." : "Connectez-vous pour voir vos demandes."}</p>`}</div>
${rvCard()}<div class="cd" id="infos"><h2><span class="ih">${ic("info", 24)}</span> ${tr("h_info")}</h2><p><b>Mairie de ${esc(cnm())}</b>${P.horaires ? `<br>Horaires : ${esc(P.horaires)}` : ""}${I.tel ? `<br>${tr("u_tel")} <a href="tel:${esc(tel())}">${esc(I.tel)}</a>` : ""}${adr(I).txt ? `<br>Adresse : ${esc(adr(I).txt)}` : ""}${adr(I).url ? `<br>${mapLk("lk c-cg", I)}` : ""}${P.email ? `<br>${tr("u_e_mail")} <a href="mailto:${esc(P.email)}">${esc(P.email)}</a>` : ""}</p><p class="mu sm">${tr("u_service_gratuit_certaines_demarches")}</p></div>
<div class="cd" id="contact"><h2><span class="ih">${ic("phone", 24)}</span> ${tr("h_contact")}</h2>${I.tel || P.email || adr(I).url ? `<p class="mu">${tr("u_une_question_contactez_la")}</p><p class="ctb">${I.tel ? `<a class="bt cl" href="tel:${esc(tel())}">${tr("h_call")}</a>` : ""}${P.email ? `<a class="bo cl" href="mailto:${esc(P.email)}">${tr("h_mail")}</a>` : ""}${mapLk("bo cl", I)}</p>` : '<p class="mu">Les coordonnées de la mairie seront bientôt disponibles.</p>'}</div></div>
<div class="cd" id="travaux"><h2><span class="ih">${ic("tools", 24)}</span> ${tr("h_works")}</h2>${(S.pj || []).length ? S.pj.map(x => `<p class="an"><b>${esc(x.titre)}</b><br><span class="mu sm">${esc([x.localite, PJL[x.statut] || x.statut, x.avancement != null ? x.avancement + " %" : "", x.date_fin ? "fin prévue " + fdj(x.date_fin) : ""].filter(Boolean).join(" · "))}</span></p>`).join("") : '<p class="mu">Aucun projet publié pour le moment.</p>'}</div>
<div class="cd" id="actus"><h2><span class="ih">${ic("news", 24)}</span> ${tr("h_actu")}</h2>${S.pub.length ? S.pub.map(p => `<p class="an">${p.jour ? `<span class="mu sm">${esc(fdj(p.jour))}</span>` : ""}${p.categorie && p.categorie != "actualite" ? ` <span class="bd bl">${esc(PCL[p.categorie] || "")}</span>` : ""}<br><i>${esc(p.texte)}</i></p>`).join("") : '<p class="mu">Aucune actualité pour le moment.</p>'}</div></main><footer class="ft"><i>${esc(I.devise || I.slogan || cnm())}</i><br><button class="lk c-cg" data-a="chg">${tr("u_ce_n_est_pas2")}</button></footer>`;
};
const PCL = lk("pcl_"),
  PJL = lk("pjl_");
/* Numéro sénégalais : mobiles 70, 75, 76, 77, 78 (9 chiffres), avec ou sans +221 / 00221. Autre format : "" (refusé côté client ET côté serveur). */
const nph = v => {
  v = String(v == null ? "" : v)
    .replace(/[\s.()-]/g, "")
    .replace(/^\+/, "")
    .replace(/^00/, "");
  if (/^7[05678]\d{7}$/.test(v)) return "+221" + v;
  if (/^2217[05678]\d{7}$/.test(v)) return "+" + v;
  return "";
};
/* tel_citoyen : simple confort (pré-remplir le champ). Ce n'est JAMAIS une preuve d'identité : l'accès aux données repose sur le téléphone vérifié par SMS du compte. */
const TEL_KEY = "tel_citoyen";
const telSave = p => {
  try {
    if (nph(p)) localStorage.setItem(TEL_KEY, nph(p));
  } catch (e) {}
};
const telPref = () => {
  try {
    const p = nph(localStorage.getItem(TEL_KEY));
    return p ? p.slice(4, 6) + " " + p.slice(6, 9) + " " + p.slice(9, 11) + " " + p.slice(11, 13) : "";
  } catch (e) {
    return "";
  }
};
/* Déconnexion : efface le numéro et tout ce qui est propre à la personne sur l'appareil (numéros de dossiers, de rendez-vous). Le choix de la commune et la langue sont conservés. */
function purgeLocal() {
  try {
    const k = [];
    for (let i = 0; i < localStorage.length; i++) {
      const n = localStorage.key(i);
      if (n == TEL_KEY || /^mc_(d|r)_/.test(n || "")) k.push(n);
    }
    k.forEach(n => localStorage.removeItem(n));
  } catch (e) {
    try {
      localStorage.removeItem(TEL_KEY);
    } catch (x) {}
  }
}
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
  const ph = S.au.phone;
  const r = await sb.auth.verifyOtp({ phone: ph, token: c, type: "sms" });
  if (r.error || !r.data.user) {
    S.err = tr("u_code_incorrect_ou_expire");
    return;
  }
  S.user = r.data.user;
  telSave(ph);
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
    try {
      const pp = await sb.rpc("paiement_demande", { p_commune: S.slug, p_numero: n });
      S.res.pay = pp && pp.data && pp.data[0];
    } catch (e) {}
    return true;
  }
  return false;
}
/* Lot 7 : section « Mes quittances » (reçu HTML avec QR code : /quittance?ref=…, impression window.print()) */
const quitCard = () =>
  `<div class="cd" id="quits"><h2>Mes quittances</h2>${
    (S.quit || []).length
      ? S.quit
          .map(
            x =>
              `<button class="rw" data-a="quit" data-ref="${esc(x.reference_paiement)}"><span><b>${esc(x.type_taxe)}</b><br><span class="mu sm">${esc(x.reference_paiement)} · ${esc(new Date(x.date_paiement || x.created_at).toLocaleDateString("fr-FR"))}</span></span><span>${esc(pfm(x.montant))}</span></button>`
          )
          .join("")
      : '<p class="mu">Aucune quittance pour le moment.</p>'
  }</div>`;
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
          : `<label for="ph">${tr("u_numero_de_telephone")}</label><input id="ph" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="77 123 45 67" value="${esc(telPref())}"><p class="mu sm">Un code SMS confirme que ce numéro est le vôtre : vos taxes et vos demandes restent privées.</p><div id="ts"></div><p><button class="bt" data-a="otp">${tr("u_recevoir_le_code")}</button></p>`)
      : `<p class="mu">Téléphone vérifié : +${esc(String(u.phone || "").replace(/^\+/, ""))}</p><label for="pp">${tr("u_prenom")}</label><input id="pp" autocomplete="given-name" maxlength="120" value="${esc((S.prof || {}).prenom)}"><label for="pn">${tr("u_nom")}</label><input id="pn" autocomplete="family-name" maxlength="120" value="${esc((S.prof || {}).nom)}"><label for="pv">${tr("u_village_quartier_ou_adresse")}</label><input id="pv" autocomplete="street-address" maxlength="120" value="${esc((S.prof || {}).village)}"><p class="c-mt12"><button class="bt" data-a="psave">${tr("u_enregistrer")}</button> <button class="bo" data-a="lout">${tr("u_se_deconnecter")}</button></p>`) +
    `</div>` +
    (u
      ? `<div class="cd"><h2>${tr("h_mine")}</h2>${m.length ? m.map(x => `<button class="rw" data-a="open" data-n="${esc(x.numero)}"><span><b>${esc(x.type)}</b><br><span class="mu sm">${esc(x.numero)}</span></span>${bd(x.statut)}</button>`).join("") : '<p class="mu">Aucune demande dans votre compte pour le moment.</p>'}</div><div class="cd"><h2>${tr("u_notifications")}</h2>${S.nt.length ? (unread() ? `<p><button class="bo" data-a="nrd">${tr("u_tout_marquer_comme_lu")}</button></p>` : "") + S.nt.map(n => `<p class="c-ntf"><b>${n.lu ? "" : "● "}${esc(n.titre)}</b><br>${esc(n.corps || "")}<br><span class="mu sm">${fdt(n.created_at)}</span>${nnum(n) ? `<br><button class="bo" data-a="nopen" data-i="${esc(n.id)}" data-n="${esc(nnum(n))}">${tr("u_voir_le_dossier")}</button>` : ""}</p>`).join("") : '<p class="mu">Aucune notification.</p>'}</div>` +
        taxCard() +
        quitCard() +
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
      ft: g("ft") || myTel() || (S.d && S.d.ft) || "",
      fo: g("fo"),
      fm: g("fm")
    };
  if (!($("#fcons") || {}).checked) {
    if (S.user)
      try {
        await consRpc(false);
      } catch (e) {}
    S.err = "Pour envoyer votre demande, vous devez accepter l’utilisation de vos données (case à cocher ci-dessus).";
    return;
  }
  if (!S.d.fn || !S.d.fm) {
    S.err = tr("u_indiquez_votre_nom_et");
    return;
  }
  const payM = tfOf(),
    payTel = String(S.d.ft || "").replace(/\s+/g, " ").trim(),
    payMode = S.pmod == "en_ligne" ? "en_ligne" : "guichet",
    payOp = S.pop;
  if (!TELRE.test(payTel)) {
    S.err = TELMSG;
    return;
  }
  if (payM > 0 && !S.pmod) {
    S.err = "Choisissez un mode de paiement : en ligne ou au guichet.";
    return;
  }
  if (payM > 0 && payMode == "en_ligne" && !PAYCFG.operateurs.some(o => o.id == payOp)) {
    S.err = "Choisissez Wave ou Orange Money pour payer en ligne.";
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
    const cr = await consRpc(true);
    if (cr.error) throw new Error("Votre consentement n’a pas pu être enregistré : la demande n’a pas été envoyée. Réessayez.");
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
    S.pm = null;
    if (payM > 0 || /^\+?[0-9 ]{8,16}$/.test(payTel)) {
      const q = await sb.rpc("choisir_paiement_demande", { p_commune: S.slug, p_numero: r.data, p_telephone: payTel, p_mode: payMode });
      if (!q.error && q.data && q.data[0]) S.pm = Object.assign({}, q.data[0], payMode == "en_ligne" ? { op: payOp } : {});
      else if (payM > 0) S.pm = { statut_paiement: "non_paye", montant: payM };
    }
    S.ok = r.data;
    S.cat = null;
    S.lst = false;
    S.ls = false;
    S.rec = false;
    S.d = {};
    S.pmod = null;
    S.pop = null;
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
    } else if (a == "esp" || a == "mtx") {
      S.sc = a == "mtx" ? "taxes" : "";
      if (a == "mtx" && S.user) await loadTaxes();
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
      txReset();
      purgeLocal();
      await sb.auth.signOut();
      S.user = null;
      S.prof = null;
      S.nt = [];
      S.quit = [];
      S.taxes = [];
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
    } else if (a == "txpay") {
      t.disabled = true;
      await payTaxe(t.dataset.id);
    } else if (a == "txonl") {
      S.txc = S.txc == t.dataset.id ? "" : t.dataset.id;
    } else if (a == "txol") {
      t.disabled = true;
      await payEnLigne(t.dataset.id, t.dataset.p);
    } else if (a == "txopen") {
      txOpen();
      return;
    } else if (a == "txwx") {
      txReset();
      await loadTaxes();
    } else if (a == "txquit") {
      const rf = String(t.dataset.ref || "");
      if (/^[A-Z0-9-]{10,60}$/.test(rf)) location.assign("/quittance.html?ref=" + encodeURIComponent(rf));
      return;
    } else if (a == "quit") {
      const rf = String(t.dataset.ref || "");
      if (/^[A-Z0-9-]{10,60}$/.test(rf)) window.open("/quittance?ref=" + encodeURIComponent(rf), "_blank", "noopener");
    } else if (a == "dldoc") {
      const pt = String(t.dataset.p || "");
      if (!S.user) S.err = "Connectez-vous (Mon espace) pour télécharger votre document.";
      else {
        const u = await sb.storage.from("documents-delivres").createSignedUrl(pt, 120);
        if (u.error || !u.data) S.err = "Document indisponible pour le moment.";
        else window.open(u.data.signedUrl, "_blank", "noopener");
      }
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

/* Signalement citoyen : bouton flottant + modale + carte 3D Mapbox GL JS.
   Mapbox GL JS est chargé à la demande depuis api.mapbox.com (version épinglée, hôtes autorisés dans la CSP de _headers).
   Jeton public (pk.…) lu dans <meta name="mc-mapbox"> de index.html. */
const SIG_COMMUNE = "98002283-4fc0-4eff-8182-af1eec9a321d", SIG_SLUG = "fimela";
const MBX = { v: "3.10.0", style: "mapbox://styles/mapbox/streets-v12", centre: [-16.95, 14.4], pitch: 45, bearing: -10, zoom: 15, cluster: 50, clusterMax: 15 };
const SIG_COL = { nouveau: "#D91E18", en_cours: "#F59E0B", resolu: "#16A34A" };
const SIG_LIB = { nouveau: "Nouveau", en_cours: "En cours", resolu: "Résolu" };
const SIG = { map: null, mk: null, pos: null, rows: [], ready: false, lib: null, geo: false, fit: false };
const sigCid = () => S.cid || SIG_COMMUNE, sigSlug = () => S.slug || SIG_SLUG;
/* Géographie de la commune active (LOT A : js/communes-geo.js, [lat,lng]) → format Mapbox [lng,lat]. */
function sigGeo() {
  try {
    const g = typeof COMMUNES_GEO != "undefined" ? COMMUNES_GEO.get(sigSlug()) : null;
    if (!g) return null;
    const [[s, w], [n, e]] = g.maxBounds;
    return { centre: [g.center[1], g.center[0]], zoom: g.zoom, maxBounds: [[w, s], [e, n]], bbox: g.bbox, localites: g.localites || [] };
  } catch (e) { return null; }
}
/* Vrai si (lat, lng) est dans la bbox de la commune {south, west, north, east}. */
function sigDansBbox(lat, lng, b) { return !b || (lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east); }
function sigMsg(t, k) { const m = $("#sig-msg"); if (m) { m.textContent = t; m.className = "sig-msg " + (k || ""); } }
function sigToken() {
  const m = document.querySelector('meta[name="mc-mapbox"]'), t = ((m && m.content) || "").trim();
  return /^pk\.[\w.-]+$/.test(t) ? t : "";
}
/* Charge la feuille de style et le script Mapbox GL JS une seule fois. */
function sigLib() {
  if (window.mapboxgl) return Promise.resolve();
  if (SIG.lib) return SIG.lib;
  const base = "https://api.mapbox.com/mapbox-gl-js/v" + MBX.v + "/";
  SIG.lib = new Promise((ok, ko) => {
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = base + "mapbox-gl.css"; document.head.appendChild(l);
    const s = document.createElement("script"); s.src = base + "mapbox-gl.js"; s.async = true;
    s.onload = () => (window.mapboxgl ? ok() : ko(new Error("lib")));
    s.onerror = () => { SIG.lib = null; ko(new Error("lib")); };
    document.head.appendChild(s);
  });
  return SIG.lib;
}
/* Signalements de la commune : RPC publique sans description ni photo (20261202_signalements_carte_publique.sql) ; repli sur la table (agents connectés). */
async function sigFetch() {
  const r = await sb.rpc("signalements_carte", { p_commune: sigSlug() });
  if (!r.error && Array.isArray(r.data)) return r.data;
  const q = await sb.from("signalements_citoyens").select("id,categorie,statut,latitude,longitude,created_at").eq("commune_id", sigCid()).limit(1000);
  return !q.error && Array.isArray(q.data) ? q.data : null;
}
function sigFeat(rows) {
  const f = [];
  (rows || []).forEach(x => {
    if (!x || x.latitude == null || x.longitude == null) return;
    const la = Number(x.latitude), lo = Number(x.longitude);
    if (!isFinite(la) || !isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180 || x.statut == "rejete") return;
    f.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lo, la] },
      properties: { id: String(x.id || ""), statut: SIG_COL[x.statut] ? x.statut : "nouveau", categorie: String(x.categorie || "Autre"), date: x.created_at || "" }
    });
  });
  return { type: "FeatureCollection", features: f };
}
function sigDraw(fit) {
  const m = SIG.map, src = m && SIG.ready && m.getSource("sig-src");
  if (!src) return;
  const g = sigFeat(SIG.rows);
  src.setData(g);
  if (fit && !SIG.fit && !SIG.geo && g.features.length) {
    SIG.fit = true;
    const b = new mapboxgl.LngLatBounds();
    g.features.forEach(x => b.extend(x.geometry.coordinates));
    m.fitBounds(b, { padding: 50, maxZoom: 16, pitch: MBX.pitch, duration: 0 });
  }
}
/* (Re)charge les signalements ; extra = point à ajouter si le serveur ne le renvoie pas encore (marqueur optimiste). */
async function sigRefresh(extra) {
  const rows = await sigFetch();
  if (rows) SIG.rows = rows;
  if (extra && !SIG.rows.some(x => extra.id && String(x.id) == extra.id)) SIG.rows = SIG.rows.concat([extra]);
  sigDraw(true);
}
/* Bâtiments extrudés (couche « building » du style streets-v12), sous les étiquettes. */
function sigBuildings(m) {
  try {
    const lab = m.getStyle().layers.find(l => l.type == "symbol" && l.layout && l.layout["text-field"]);
    m.addLayer({
      id: "sig-3d", type: "fill-extrusion", source: "composite", "source-layer": "building", filter: ["==", ["get", "extrude"], "true"], minzoom: 14,
      paint: {
        "fill-extrusion-color": "#c9d3cb",
        "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 14, 0, 14.5, ["get", "height"]],
        "fill-extrusion-base": ["interpolate", ["linear"], ["zoom"], 14, 0, 14.5, ["get", "min_height"]],
        "fill-extrusion-opacity": 0.85
      }
    }, lab && lab.id);
  } catch (e) {}
}
/* Source GeoJSON avec clustering natif Mapbox + couches : pastilles par statut, grappes avec compteur. */
function sigLayers(m) {
  const stat = ["get", "statut"], col = ["match", stat, "nouveau", SIG_COL.nouveau, "en_cours", SIG_COL.en_cours, "resolu", SIG_COL.resolu, SIG_COL.nouveau];
  m.addSource("sig-src", {
    type: "geojson", data: sigFeat([]), cluster: true, clusterRadius: MBX.cluster, clusterMaxZoom: MBX.clusterMax,
    clusterProperties: { n: ["+", ["case", ["==", stat, "nouveau"], 1, 0]], e: ["+", ["case", ["==", stat, "en_cours"], 1, 0]] }
  });
  m.addLayer({
    id: "sig-cl", type: "circle", source: "sig-src", filter: ["has", "point_count"],
    paint: {
      "circle-color": ["case", [">", ["get", "n"], 0], SIG_COL.nouveau, [">", ["get", "e"], 0], SIG_COL.en_cours, SIG_COL.resolu],
      "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 50, 26], "circle-stroke-width": 3, "circle-stroke-color": "#ffffff", "circle-pitch-alignment": "map"
    }
  });
  m.addLayer({
    id: "sig-cl-n", type: "symbol", source: "sig-src", filter: ["has", "point_count"],
    layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"], "text-size": 13, "text-allow-overlap": true },
    paint: { "text-color": "#ffffff" }
  });
  m.addLayer({
    id: "sig-pt", type: "circle", source: "sig-src", filter: ["!", ["has", "point_count"]],
    paint: { "circle-color": col, "circle-radius": 9, "circle-stroke-width": 3, "circle-stroke-color": "#ffffff", "circle-pitch-alignment": "map" }
  });
}
/* Fenêtre d'information (texte uniquement, sans HTML injecté). */
function sigPopup(m, f) {
  const p = f.properties || {}, box = document.createElement("div"), b = document.createElement("b"), s = document.createElement("div"), d = document.createElement("div"), t = p.date ? new Date(p.date) : null;
  b.textContent = p.categorie || "Autre";
  s.textContent = SIG_LIB[p.statut] || SIG_LIB.nouveau;
  box.appendChild(b); box.appendChild(s);
  if (t && !isNaN(t)) { d.textContent = t.toLocaleDateString("fr-FR"); box.appendChild(d); }
  new mapboxgl.Popup({ offset: 14, closeButton: false }).setLngLat(f.geometry.coordinates.slice()).setDOMContent(box).addTo(m);
}
/* Clic citoyen : coordonnées (lng, lat) → marqueur + formulaire pré-rempli. */
function sigPick(lng, lat) {
  SIG.pos = { lat, lng };
  if (SIG.mk) SIG.mk.setLngLat([lng, lat]);
  else {
    const el = document.createElement("div"); el.className = "sig-pin";
    SIG.mk = new mapboxgl.Marker({ element: el, anchor: "bottom" }).setLngLat([lng, lat]).addTo(SIG.map);
  }
  const f = $("#sig-form"), p = $("#sig-pos"), h = $("#sig-hint");
  if (p) p.value = lat.toFixed(5) + ", " + lng.toFixed(5);
  if (h) h.hidden = true;
  if (f) { f.hidden = false; try { f.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) {} }
  sigMsg("");
}
/* Coordonnées d'une localité : lat/lng connus, sinon géocodage Mapbox borné à la commune (mis en cache). */
const SIG_LOC = {};
async function sigLocate(x, geo) {
  if (x.lat != null && x.lng != null) return [x.lng, x.lat];
  const k = sigSlug() + "|" + x.nom;
  if (SIG_LOC[k]) return SIG_LOC[k];
  try {
    const [[w, s], [e, n]] = geo.maxBounds, c = geo.centre;
    const u = "https://api.mapbox.com/search/geocode/v6/forward?q=" + encodeURIComponent(x.nom) + "&country=sn&limit=1&bbox=" + [w, s, e, n].join(",") + "&proximity=" + c.join(",") + "&access_token=" + encodeURIComponent(sigToken());
    const r = await fetch(u), j = await r.json(), f = j && j.features && j.features[0];
    if (f && f.geometry && f.geometry.coordinates) return (SIG_LOC[k] = f.geometry.coordinates);
  } catch (err) {}
  return null;
}
/* Menu « Aller à un village/quartier » au-dessus de la carte (DOM, texte uniquement). */
function sigLocMenu(m, geo) {
  const el = $("#sig-map"), old = $("#sig-loc-wrap");
  if (old) old.remove();
  if (!el || !geo.localites.length) return;
  const w = document.createElement("p"), l = document.createElement("label"), sl = document.createElement("select"), o0 = document.createElement("option");
  w.id = "sig-loc-wrap"; l.htmlFor = sl.id = "sig-loc"; l.textContent = "Aller à un village/quartier "; o0.value = ""; o0.textContent = "— Choisir —"; sl.appendChild(o0);
  sl.style.maxWidth = "100%";
  geo.localites.forEach((x, i) => { const o = document.createElement("option"); o.value = String(i); o.textContent = x.nom + (x.type ? " (" + x.type + ")" : ""); sl.appendChild(o); });
  sl.addEventListener("change", async () => {
    const x = geo.localites[+sl.value];
    if (!x || sl.value === "") return;
    sigMsg("Recherche de " + x.nom + "…");
    const c = await sigLocate(x, geo);
    if (!c) { m.flyTo({ center: geo.centre, zoom: Math.max(geo.zoom, 14), pitch: MBX.pitch }); sigMsg("Position exacte de « " + x.nom + " » introuvable : carte centrée sur la commune. Touchez la carte pour placer le point.", "err"); return; }
    if (SIG.loc) SIG.loc.setLngLat(c); else SIG.loc = new mapboxgl.Marker({ color: "#0B5A2E" }).setLngLat(c).addTo(m);
    SIG.loc.setPopup(new mapboxgl.Popup({ offset: 24, closeButton: false }).setText(x.nom)).togglePopup();
    m.flyTo({ center: c, zoom: 16, pitch: MBX.pitch });
    sigMsg(x.nom + (x.type ? " (" + x.type + ")" : "") + " affiché sur la carte. Touchez la carte pour signaler.", "ok");
  });
  w.appendChild(l); w.appendChild(sl); el.parentNode.insertBefore(w, el);
}
/* Contrôle « Recentrer sur ma commune » : fitBounds(maxBounds). */
function sigRecentre(m, geo) {
  let box = null;
  return {
    onAdd() {
      box = document.createElement("div"); box.className = "mapboxgl-ctrl mapboxgl-ctrl-group";
      const b = document.createElement("button"); b.type = "button"; b.textContent = "◎ Recentrer sur ma commune";
      b.title = "Recentrer sur ma commune"; b.setAttribute("aria-label", "Recentrer sur ma commune");
      b.style.width = "auto"; b.style.padding = "0 10px"; b.style.fontSize = "13px";
      b.addEventListener("click", () => m.fitBounds(geo.maxBounds, { padding: 20, pitch: MBX.pitch, duration: 600 }));
      box.appendChild(b); return box;
    },
    onRemove() { if (box && box.parentNode) box.parentNode.removeChild(box); box = null; }
  };
}
function sigInit() {
  const tok = sigToken();
  if (!tok) { sigMsg("Carte indisponible (jeton Mapbox absent).", "err"); return; }
  mapboxgl.accessToken = tok;
  const geo = sigGeo();
  SIG.slug = sigSlug();
  const m = (SIG.map = new mapboxgl.Map({ container: "sig-map", style: MBX.style, center: geo ? geo.centre : MBX.centre, zoom: geo ? geo.zoom : MBX.zoom, pitch: MBX.pitch, bearing: MBX.bearing, antialias: true, ...(geo ? { maxBounds: geo.maxBounds } : {}) }));
  m.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
  if (geo) { sigLocMenu(m, geo); m.addControl(sigRecentre(m, geo), "top-left"); }
  m.on("error", ev => { if (!SIG.ready && ev && ev.error && /40[13]/.test(String(ev.error.status || ev.error.message))) sigMsg("Carte indisponible (jeton Mapbox refusé).", "err"); });
  m.on("load", () => {
    sigBuildings(m); sigLayers(m);
    SIG.ready = true;
    sigRefresh().catch(() => {});
  });
  m.on("click", ev => {
    const hit = m.queryRenderedFeatures(ev.point, { layers: ["sig-cl", "sig-pt"] })[0];
    if (hit && hit.layer.id == "sig-cl") {
      m.getSource("sig-src").getClusterExpansionZoom(hit.properties.cluster_id, (err, z) => { if (!err) m.easeTo({ center: hit.geometry.coordinates, zoom: z + 0.5 }); });
    } else if (hit) sigPopup(m, hit);
    else sigPick(ev.lngLat.lng, ev.lngLat.lat);
  });
  ["sig-cl", "sig-pt"].forEach(id => {
    m.on("mouseenter", id, () => { m.getCanvas().style.cursor = "pointer"; });
    m.on("mouseleave", id, () => { m.getCanvas().style.cursor = ""; });
  });
  if (navigator.geolocation) navigator.geolocation.getCurrentPosition(p => { SIG.geo = true; m.easeTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 16, pitch: MBX.pitch }); }, () => {});
}
function sigOpen() {
  const d = $("#sig"); if (!d) return;
  d.hidden = false; document.body.style.overflow = "hidden"; sigMsg("");
  /* Commune changée depuis la dernière ouverture : on reconstruit la carte (centre, limites, menu). */
  if (SIG.map && SIG.slug !== sigSlug()) {
    try { SIG.map.remove(); } catch (e) {}
    SIG.map = SIG.mk = SIG.pos = SIG.loc = null; SIG.ready = false; SIG.fit = false;
  }
  setTimeout(async () => {
    if (SIG.map) { SIG.map.resize(); if (SIG.ready) sigRefresh().catch(() => {}); return; }
    try { await sigLib(); } catch (e) { sigMsg("Carte indisponible.", "err"); return; }
    if (!SIG.map) { try { sigInit(); } catch (e) { SIG.map = null; sigMsg("Carte indisponible : " + (e.message || e), "err"); } }
  }, 50);
}
function sigClose() { const d = $("#sig"); if (d) d.hidden = true; document.body.style.overflow = ""; }
async function sigSend() {
  const g = id => (($("#" + id) || {}).value || "").trim(), txt = g("sig-txt"), b = $("#sig-send");
  if (txt.length < 5) { sigMsg("Décrivez le problème en quelques mots.", "err"); return; }
  if (!SIG.pos) { sigMsg("Touchez la carte pour indiquer l’endroit.", "err"); return; }
  const gz = sigGeo();
  if (gz && !sigDansBbox(SIG.pos.lat, SIG.pos.lng, gz.bbox) && !window.confirm("Vous êtes hors du périmètre de la commune, voulez-vous continuer ?")) return;
  b.disabled = true; sigMsg("Envoi en cours…");
  try {
    let url = null;
    const f = $("#sig-ph").files && $("#sig-ph").files[0];
    if (f) {
      if (!/^image\//.test(f.type)) throw new Error("Photo uniquement.");
      const bl = await comp(f), p = sigCid() + "/" + crypto.randomUUID() + "." + (bl.type == "image/webp" ? "webp" : "jpg"),
        u = await sb.storage.from("signalements-photos").upload(p, bl, { contentType: bl.type });
      if (u.error) throw new Error("Envoi de la photo impossible.");
      url = sb.storage.from("signalements-photos").getPublicUrl(p).data.publicUrl;
    }
    /* RPC verrouillée par commune (20261124_signalements_insertion_multitenant.sql) ; repli sur l'insertion directe tant qu'elle n'est pas déployée. */
    const cat = g("sig-cat"), pos = SIG.pos;
    let r = await sb.rpc("creer_signalement", { p_commune: sigSlug(), p_categorie: cat, p_description: txt, p_photo_url: url, p_latitude: pos.lat, p_longitude: pos.lng });
    if (r.error) r = await sb.from("signalements_citoyens").insert({ commune_id: sigCid(), categorie: cat, description: txt, photo_url: url, latitude: pos.lat, longitude: pos.lng });
    if (r.error) throw new Error("Enregistrement impossible. Réessayez.");
    sigMsg("Signalement envoyé. Merci !", "ok");
    $("#sig-txt").value = ""; $("#sig-ph").value = ""; SIG.pos = null;
    if (SIG.mk) { SIG.mk.remove(); SIG.mk = null; }
    const fm = $("#sig-form"), ht = $("#sig-hint");
    if (fm) fm.hidden = true;
    if (ht) ht.hidden = false;
    /* La carte se rafraîchit et affiche le nouveau marqueur (ajouté localement si la lecture serveur ne le renvoie pas). */
    await sigRefresh({ id: typeof r.data == "string" ? r.data : "", statut: "nouveau", categorie: cat, latitude: pos.lat, longitude: pos.lng, created_at: new Date().toISOString() }).catch(() => {});
    if (SIG.map) SIG.map.easeTo({ center: [pos.lng, pos.lat], zoom: Math.max(SIG.map.getZoom(), 16) });
  } catch (e) { sigMsg(e.message || "Erreur réseau.", "err"); }
  b.disabled = false;
}
document.addEventListener("click", e => {
  const id = e.target && e.target.id;
  if (id == "sig-open") sigOpen();
  else if (id == "sig-x" || id == "sig") sigClose();
  else if (id == "sig-send") sigSend();
});
document.addEventListener("keydown", e => { if (e.key == "Escape") sigClose(); });

(function () {
  // En-tête compact au défilement. Le gain de hauteur est mesuré puis compensé (--tp-d) : pas de saut de mise en page.
  const hdr = () => {
    const h = document.querySelector ? document.querySelector(".tp") : null;
    return h && h.classList && h.style && h.style.setProperty ? h : null;
  };
  const delta = (h, want) => {
    const had = h.classList.contains("is-scrolled");
    h.style.transition = "none";
    h.classList.remove("is-scrolled");
    const full = h.offsetHeight;
    h.classList.add("is-scrolled");
    h.style.setProperty("--tp-d", "0px");
    const small = h.offsetHeight;
    h.classList.toggle("is-scrolled", had);
    h.offsetHeight;
    h.style.transition = "";
    return Math.max(0, full - small);
  };
  const setH = h => {
    if (h.classList.contains("is-scrolled")) return;
    const v = h.offsetHeight;
    if (v > 0) document.documentElement.style.setProperty("--header-height", v + "px");
  };
  const sync = () => {
    const h = hdr();
    if (!h) return;
    setH(h);
    const want = window.scrollY > 10;
    if (want === h.classList.contains("is-scrolled")) return;
    h.style.setProperty("--tp-d", want ? delta(h) + "px" : "0px");
    h.classList.toggle("is-scrolled", want);
  };
  let raf = 0;
  const later = () => { if (!raf) raf = (window.requestAnimationFrame || setTimeout)(() => { raf = 0; sync(); }); };
  if (!window.addEventListener) return;
  window.addEventListener("scroll", later, { passive: true });
  window.addEventListener("resize", () => {
    const h = hdr();
    if (!h) return;
    const was = h.classList.contains("is-scrolled");
    if (was) { h.style.transition = "none"; h.classList.remove("is-scrolled"); }
    setH(h);
    if (was) { h.classList.add("is-scrolled"); h.offsetHeight; h.style.transition = ""; }
  });
  const app = document.getElementById ? document.getElementById("app") : null;
  if (app && window.MutationObserver) new MutationObserver(later).observe(app, { childList: true, subtree: true });
  sync();
})();
