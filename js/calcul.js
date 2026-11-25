/* =====================================================================
   MOTEUR DE CALCUL – Simulateur de pension
   ---------------------------------------------------------------------
   Fonctions pures, sans accès à la page : elles reçoivent la configuration
   (js/config.js) et les données saisies, et renvoient des résultats.
   Couvert par les tests automatiques : tests/calcul.test.js (npm test).
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PENSION_CALCUL = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function num(v) {
    var n = parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }

  /* Valeur mensuelle du point d'indice */
  function valeurPoint(cfg) {
    return cfg.pointIndice.numerateur / cfg.pointIndice.denominateur;
  }

  /* Arrondi au trimestre (FCT / FNP), à partir du premier chiffre décimal :
     ,0–,1 → ,0 · ,2–,4 → ,25 · ,5–,7 → ,5 · ,8–,9 → ,75 */
  function arrondiTrimestre(v) {
    var i = Math.floor(v), d = Math.round((v - i) * 10);
    if (d >= 2 && d <= 4) return i + 0.25;
    if (d >= 5 && d <= 7) return i + 0.5;
    if (d >= 8 && d <= 9) return i + 0.75;
    return i;
  }

  /* Taux acquis sur une période pour un nombre d'années donné */
  function tauxPeriode(p, annees) {
    if (p.palier) {
      return Math.min(annees, p.palier.annees) * p.palier.taux +
             Math.max(annees - p.palier.annees, 0) * p.taux;
    }
    return annees * p.taux;
  }

  /* -------------------------------------------------------------------
     Calcul principal
     reg    : code du régime ('RG', 'FCT', 'FNP', 'DMG')
     annees : tableau des années saisies par période
     base   : salaire brut moyen (RG) ou indice de solde (autres)
     extra  : années supplémentaires ajoutées à la dernière période (projection)
     ------------------------------------------------------------------- */
  function calculer(cfg, reg, annees, base, extra) {
    var r = cfg.regimes[reg];
    extra = extra || 0;
    var parts = r.periodes.map(function (p, i) {
      var y = num(annees[i]);
      if (r.trimestre) y = arrondiTrimestre(y);
      if (i === r.periodes.length - 1) y += extra;
      return { annees: y, taux: tauxPeriode(p, y) };
    });
    // La condition de durée se vérifie sur les années entières saisies
    var dureeControle = r.periodes.reduce(function (s, _, i) { return s + Math.trunc(num(annees[i])); }, 0) + extra;
    var total = parts.reduce(function (s, p) { return s + p.annees; }, 0);
    var taux = parts.reduce(function (s, p) { return s + p.taux; }, 0);
    var plafonne = taux > r.plafond;
    var tauxApplique = plafonne ? r.plafond : taux;
    var reference = r.base === 'salaire' ? num(base) : num(base) * valeurPoint(cfg);
    var brut = tauxApplique * reference;
    var avecRetenue = (cfg.retenue.siTauxPlafonne && plafonne) || brut > cfg.retenue.seuil;
    var retenue = avecRetenue ? brut * cfg.retenue.taux : 0;
    var net = brut - retenue;
    return {
      parts: parts,
      dureeControle: dureeControle,
      totalAnnees: total,
      taux: taux,
      tauxApplique: tauxApplique,
      plafonne: plafonne,
      reference: reference,
      brut: brut,
      retenue: retenue,
      netMensuel: Math.round(net),
      netTrimestriel: Math.round(3 * net),
      eligible: dureeControle >= r.min,
      anneesManquantes: Math.max(0, r.min - dureeControle)
    };
  }

  /* -------------------------------------------------------------------
     Dates
     ------------------------------------------------------------------- */
  function age(naissance, aujourdhui) {
    var a = aujourdhui.getFullYear() - naissance.getFullYear();
    if (aujourdhui < new Date(aujourdhui.getFullYear(), naissance.getMonth(), naissance.getDate())) a--;
    return a;
  }

  function dateDepart(cfg, reg, naissance) {
    return new Date(naissance.getFullYear() + cfg.regimes[reg].age, naissance.getMonth(), naissance.getDate());
  }

  /* Contrôle d'une date de naissance saisie (jour 1–31, mois 0–11, année)
     Renvoie { date } ou { erreur: 'invalide' | 'ancienne' | 'future' | 'jeune' } */
  function validerNaissance(cfg, jour, mois, annee, aujourdhui) {
    var d = new Date(annee, mois, jour);
    if (!jour || d.getDate() !== jour || d.getMonth() !== mois || d.getFullYear() !== annee) return { erreur: 'invalide' };
    if (annee < 1920) return { erreur: 'ancienne' };
    if (d > aujourdhui) return { erreur: 'future' };
    if (age(d, aujourdhui) < cfg.ageMinTravail) return { erreur: 'jeune' };
    return { date: d };
  }

  /* -------------------------------------------------------------------
     Nombre d'années maximal saisissable par période, selon l'âge :
     pas de cotisation avant ageMinTravail, ni après l'âge légal de départ.
     ------------------------------------------------------------------- */
  function limites(cfg, reg, naissance, aujourdhui) {
    var r = cfg.regimes[reg], an = aujourdhui.getFullYear();
    var premiereAnnee = naissance ? naissance.getFullYear() + cfg.ageMinTravail : null;
    var depart = naissance ? naissance.getFullYear() + r.age : null;
    return r.periodes.map(function (p) {
      var fin = p.fin == null ? an : p.fin;
      var base = p.fin == null ? Math.max(0, fin - p.debut + 1) : p.max;
      if (premiereAnnee == null) return { max: base, limiteParAge: false };
      var lim = base - Math.max(0, premiereAnnee - p.debut) - Math.max(0, fin - Math.max(depart - 1, p.debut - 1));
      lim = Math.max(0, Math.min(base, lim));
      return { max: lim, limiteParAge: lim < base };
    });
  }

  /* -------------------------------------------------------------------
     Calcul automatique des années par période à partir de la carrière
     carriere = {
       debut: { mois: 0-11, annee },
       fin:   { mois, annee } | null  (null = toujours en activité),
       interruptions: [ { debut:{mois,annee}, fin:{mois,annee} }, … ]
     }
     Comptage au mois près. La carrière est bornée à ageMinTravail et à
     l'âge légal de départ. Années entières pour RG / DMG ; décimales
     (arrondies ensuite au trimestre par calculer()) pour FCT / FNP.
     Renvoie { annees: [...], mois: [...], totalMois, avertissements: [...] }
     ------------------------------------------------------------------- */
  function idx(o) { return o.annee * 12 + o.mois; }

  function anneesDepuisCarriere(cfg, reg, carriere, naissance, aujourdhui) {
    var r = cfg.regimes[reg], avert = [];
    var auj = aujourdhui.getFullYear() * 12 + aujourdhui.getMonth();
    var debut = idx(carriere.debut);
    var fin = carriere.fin ? idx(carriere.fin) : auj;

    if (naissance) {
      var minDebut = (naissance.getFullYear() + cfg.ageMinTravail) * 12 + naissance.getMonth();
      var maxFin = (naissance.getFullYear() + r.age) * 12 + naissance.getMonth() - 1;
      if (debut < minDebut) { avert.push('debut_trop_tot'); debut = minDebut; }
      if (fin > maxFin) { avert.push('fin_apres_depart'); fin = maxFin; }
    }
    if (fin > auj) { avert.push('fin_future'); fin = auj; }
    if (fin < debut) { avert.push('fin_avant_debut'); fin = debut - 1; }

    var exclus = {};
    (carriere.interruptions || []).forEach(function (g) {
      if (!g || !g.debut || !g.fin) return;
      var a = idx(g.debut), b = idx(g.fin);
      if (b < a) { avert.push('interruption_inversee'); var t = a; a = b; b = t; }
      for (var m = a; m <= b; m++) exclus[m] = true;
    });

    var mois = r.periodes.map(function (p) {
      var pa = p.debut * 12, pb = (p.fin == null ? Math.floor(auj / 12) : p.fin) * 12 + 11;
      var a = Math.max(pa, debut), b = Math.min(pb, fin), n = 0;
      for (var m = a; m <= b; m++) if (!exclus[m]) n++;
      return n;
    });

    var annees = mois.map(function (n, i) {
      var y = r.trimestre ? Math.round(n / 12 * 100) / 100 : Math.floor(n / 12);
      var p = r.periodes[i];
      if (p.max != null && y > p.max) y = p.max;
      return y;
    });

    return {
      annees: annees,
      mois: mois,
      totalMois: mois.reduce(function (s, n) { return s + n; }, 0),
      avertissements: avert
    };
  }

  /* -------------------------------------------------------------------
     Prévision à l'âge légal de départ
     Hypothèse : la personne continue à cotiser sans interruption jusqu'à
     son départ ; les années ajoutées comptent sur la période en cours.
     croissance : 'statut' = évolution réglementaire du régime (voir
                  regimes.X.evolution dans config.js), sinon évolution
                  annuelle composée (0.02 = 2 %)
     Renvoie null si la date de naissance manque ou si l'âge est atteint.
     ------------------------------------------------------------------- */

  /* Revenu de base dans « mois » mois.
     Évolution réglementaire : + taux × salaire brut DE BASE tous les N ans
     (non composée), ex. RG 168 500 → 175 240 (2 ans) → 181 980 (4 ans) …
     sursalaire : primes, heures supplémentaires… inclus dans « base » mais
     NON concernés par l'augmentation (restent constants). */
  function baseFuture(cfg, reg, base, mois, croissance, sursalaire) {
    var r = cfg.regimes[reg], b = num(base), v;
    if (croissance === 'statut') {
      var ev = r.evolution, sb = Math.max(0, b - Math.min(num(sursalaire), b));
      // augmentation fixe (ex. 4 % de 168 500 = 6 740 FDJ) × nombre de paliers
      v = ev ? b + Math.round(sb * ev.taux * 100) / 100 * Math.floor(mois / (12 * ev.tousLesAnnees)) : b;
    } else {
      v = b * Math.pow(1 + (num(croissance) || 0), mois / 12);
    }
    if (r.base === 'indice' && cfg.indiceMax) v = Math.min(v, cfg.indiceMax);
    return v;
  }
  function prevision(cfg, reg, annees, base, naissance, aujourdhui, croissance, sursalaire) {
    if (!naissance) return null;
    var r = cfg.regimes[reg], dep = dateDepart(cfg, reg, naissance);
    var auj = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate());
    if (dep <= auj) return null;
    var mois = (dep.getFullYear() - auj.getFullYear()) * 12 + dep.getMonth() - auj.getMonth() - (dep.getDate() < auj.getDate() ? 1 : 0);
    mois = Math.max(0, mois);
    var extra = r.trimestre ? arrondiTrimestre(mois / 12) : Math.floor(mois / 12);
    var baseProjetee = baseFuture(cfg, reg, base, mois, croissance, sursalaire);
    var actuel = calculer(cfg, reg, annees, base, 0);
    var res = calculer(cfg, reg, annees, baseProjetee, extra);
    // Année où la durée minimale sera atteinte en continuant à cotiser
    var anneeEligibilite = actuel.eligible ? null : auj.getFullYear() + actuel.anneesManquantes;
    return {
      dateDepart: dep,
      moisRestants: mois,
      anneesAjoutees: extra,
      baseProjetee: baseProjetee,
      actuel: actuel,
      resultat: res,
      anneeEligibilite: anneeEligibilite,
      gainMensuel: res.eligible ? res.netMensuel - (actuel.eligible ? actuel.netMensuel : 0) : 0
    };
  }

  /* Compte à rebours (années, mois, jours) jusqu'à une date */
  function compteARebours(depart, aujourdhui) {
    var now = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate());
    if (depart <= now) return null;
    var y = depart.getFullYear() - now.getFullYear(), m = depart.getMonth() - now.getMonth(), d = depart.getDate() - now.getDate();
    if (d < 0) { m--; d += new Date(depart.getFullYear(), depart.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    return { annees: y, mois: m, jours: d };
  }

  return {
    num: num,
    valeurPoint: valeurPoint,
    arrondiTrimestre: arrondiTrimestre,
    tauxPeriode: tauxPeriode,
    calculer: calculer,
    age: age,
    dateDepart: dateDepart,
    validerNaissance: validerNaissance,
    limites: limites,
    anneesDepuisCarriere: anneesDepuisCarriere,
    baseFuture: baseFuture,
    prevision: prevision,
    compteARebours: compteARebours
  };
});
