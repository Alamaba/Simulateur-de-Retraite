/* =====================================================================
   CONFIGURATION RÉGLEMENTAIRE DU SIMULATEUR DE PENSION – Djibouti
   ---------------------------------------------------------------------
   Ce fichier est le SEUL endroit à modifier lorsque la législation change
   (valeur du point d'indice, taux, plafonds, âges, durées minimales…).

   Après toute modification :
     1. lancer les tests :  npm test
     2. incrémenter "version" ci-dessous (cela force la mise à jour de
        l'application installée sur les téléphones).
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PENSION_CONFIG = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  return {
    version: '2026.11.10',
    dateLegislation: '2026-11-24',

    /* Valeur mensuelle du point d'indice : numerateur / denominateur (FDJ) */
    pointIndice: { numerateur: 139667, denominateur: 1200 },

    /* Retenue appliquée sur la pension brute */
    retenue: {
      taux: 0.03,         // 3 %
      seuil: 50000,       // appliquée si la pension brute mensuelle dépasse ce montant (FDJ)
      siTauxPlafonne: true // appliquée aussi lorsque le taux de liquidation est plafonné
    },

    /* Âge minimal pour commencer à cotiser (contrôle de cohérence des saisies) */
    ageMinTravail: 16,

    /* Nombre maximal de barres (années) dans le graphique de prévision */
    projectionAnnees: 20,

    /* Nombre maximal de scénarios comparables */
    scenariosMax: 4,

    /* Bornes de saisie */
    salaireMaxCurseur: 1500000,  // FDJ
    indiceMax: 3000,             // points

    /* Montants jugés suspects : un avertissement invite à vérifier la saisie */
    vraisemblance: {
      salaireMin: 20000,    // FDJ / mois
      salaireMax: 3000000,  // FDJ / mois
      indiceMin: 100        // points
    },

    contact: {
      textesLoi: 'http://www.cnss.dj/index.php/telechargement/textes-legislatifs'
    },

    /* -----------------------------------------------------------------
       Régimes
       - age      : âge légal de départ
       - min      : durée minimale de cotisation (années)
       - plafond  : taux de liquidation maximal
       - base     : 'salaire' (salaire brut moyen) ou 'indice' (indice de solde)
       - trimestre: true = les années décimales sont arrondies au trimestre
       - periodes : debut / fin (null = jusqu'à aujourd'hui), taux annuel,
                    max = nombre d'années maximal saisissable (périodes closes)
                    palier = { annees, taux } : les N premières années à un
                    taux différent (ex. FCT : 15 premières années à 3 %, puis 2 %)
       - evolution: (facultatif) augmentation automatique du revenu utilisée
                    par la prévision : + taux × revenu de base tous les
                    « tousLesAnnees » ans, sans effet composé
                    (ex. RG : 168 500 → 175 240 → 181 980 …)
       - exemple  : valeurs utilisées par le bouton « Voir un exemple »
       ----------------------------------------------------------------- */
    regimes: {
      RG: {
        age: 60, min: 25, plafond: 0.81, base: 'salaire', trimestre: false,
        periodes: [
          { debut: 1976, fin: 2001, taux: 0.02,  max: 26 },
          { debut: 2002, fin: 2006, taux: 0.018, max: 5 },
          { debut: 2007, fin: null, taux: 0.015 }
        ],
        evolution: { taux: 0.04, tousLesAnnees: 2 },
        exemple: { annees: [6, 5, 16], base: 250000 }
      },
      FCT: {
        age: 60, min: 25, plafond: 0.81, base: 'indice', trimestre: true,
        periodes: [
          { debut: 1976, fin: 2001, taux: 0.02, max: 26, palier: { annees: 15, taux: 0.03 } },
          { debut: 2002, fin: 2006, taux: 0.018, max: 5 },
          { debut: 2007, fin: 2009, taux: 0.015, max: 4 },
          { debut: 2010, fin: null, taux: 0.013 }
        ],
        exemple: { annees: [8, 5, 3, 14], base: 1200 }
      },
      FNP: {
        age: 55, min: 25, plafond: 0.81, base: 'indice', trimestre: true,
        periodes: [
          { debut: 1976, fin: 2001, taux: 0.02, max: 26, palier: { annees: 15, taux: 0.03 } },
          { debut: 2002, fin: 2006, taux: 0.018, max: 6 },
          { debut: 2007, fin: 2009, taux: 0.015, max: 4 },
          { debut: 2010, fin: null, taux: 0.013 }
        ],
        exemple: { annees: [5, 5, 3, 13], base: 900 }
      },
      DMG: {
        age: 60, min: 10, plafond: 0.75, base: 'indice', trimestre: false,
        periodes: [
          { debut: 1976, fin: 2001, taux: 0.04, max: 25 },
          { debut: 2002, fin: null, taux: 0.03 }
        ],
        exemple: { annees: [0, 12], base: 2500 }
      }
    },

    /* Date de naissance utilisée par « Voir un exemple » (mois : 0 = janvier) */
    exempleNaissance: { jour: 14, mois: 2, annee: 1972 }
  };
});
