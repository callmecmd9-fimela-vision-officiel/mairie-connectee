/* Langues de l'application citoyenne. Le français est la référence.
   RÈGLE : aucune traduction wolof/sereer n'est inventée ni publiée sans validation par un locuteur compétent.
   Procédure : exporter docs/i18n/textes_a_valider.csv (npm run … / node scripts/i18n-export.js), faire remplir et valider,
   saisir les textes dans MC_TX.wo / MC_TX.sr ci-dessous, puis passer statut à "valide". La langue n'apparaît dans l'application
   que si statut = "valide" ET 100 % des textes sont traduits (contrôle dans citoyen.js : langsOk, et tests/i18n.test.js). */
window.MC_LANGS={fr:{nom:"Français",statut:"valide"},wo:{nom:"Wolof",statut:"a_valider"},sr:{nom:"Sereer",statut:"a_valider"}};
window.MC_TX={wo:{},sr:{}};
