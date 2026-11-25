/* Tests du moteur de calcul — lancer avec :  npm test   (ou  node --test tests/) */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const cfg = require('../js/config.js');
const C = require('../js/calcul.js');

const AUJ = new Date(2026, 10, 24); // 24 novembre 2026 (date figée pour des tests reproductibles)

/* ---------------------------------------------------------------------
   Copie fidèle des formules de l'ANCIEN simulateur (avant refonte),
   utilisée comme référence. Seule correction : la pension trimestrielle
   FNP vaut bien 3 × la mensuelle (l'ancien code affichait la mensuelle).
   --------------------------------------------------------------------- */
const legacy = {
  arrondi(v) {
    const d = (v - Math.floor(v)).toFixed(1);
    if (d == 0.2 || d == 0.3 || d == 0.4) return parseInt(v) + 0.25;
    if (d == 0.5 || d == 0.6 || d == 0.7) return parseInt(v) + 0.5;
    if (d == 0.8 || d == 0.9) return parseInt(v) + 0.75;
    return parseInt(v) + 0.0;
  },
  fin(brutPlafonne, brut, plafonne) {
    if (plafonne) { const n = brutPlafonne - 0.03 * brutPlafonne; return { net: Math.round(n), tri: Math.round(3 * n) }; }
    const n = brut > 50000 ? brut - 0.03 * brut : brut;
    return { net: Math.round(n), tri: Math.round(3 * n) };
  },
  RG(a1, a2, a3, M) {
    if (parseInt(a1) + parseInt(a2) + parseInt(a3) < 25) return null;
    const taux = a1 * 0.02 + a2 * 0.018 + a3 * 0.015;
    return legacy.fin(M * 0.81, M * taux, taux > 0.81);
  },
  FCT(a1, a2, a3, a4, ind) {
    if (parseInt(a1) + parseInt(a2) + parseInt(a3) + parseInt(a4) < 25) return null;
    const p = [a1, a2, a3, a4].map(legacy.arrondi);
    const taux = p[0] > 15
      ? 15 * 0.03 + (p[0] - 15) * 0.02 + p[1] * 0.018 + p[2] * 0.015 + p[3] * 0.013
      : p[0] * 0.03 + p[1] * 0.018 + p[2] * 0.015 + p[3] * 0.013;
    return legacy.fin((0.81 * ind * 139667) / 1200, (taux * ind * 139667) / 1200, taux > 0.81);
  },
  DMG(a1, a2, ind) {
    if (parseInt(a1) + parseInt(a2) < 10) return null;
    const taux = a1 * 0.04 + a2 * 0.03;
    return legacy.fin((0.75 * ind * 139667) / 1200, (taux * ind * 139667) / 1200, taux > 0.75);
  }
};
legacy.FNP = legacy.FCT; // mêmes formules (seul l'âge de départ diffère)

/* Générateur pseudo-aléatoire déterministe */
function rng(seed) { return () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; }
const rand = rng(42);
const entier = (max) => Math.floor(rand() * (max + 1));
const dixieme = (max) => Math.round(rand() * max * 10) / 10;

function verifie(reg, annees, base, attendu) {
  const r = C.calculer(cfg, reg, annees, base, 0);
  if (attendu === null) { assert.equal(r.eligible, false, `${reg} ${annees} devrait être non éligible`); return; }
  assert.equal(r.eligible, true, `${reg} ${annees} devrait être éligible`);
  // tolérance d'1 FDJ : l'ordre des multiplications peut différer d'un arrondi
  assert.ok(Math.abs(r.netMensuel - attendu.net) <= 1, `${reg} ${annees} ${base} : net ${r.netMensuel} ≠ ${attendu.net}`);
  assert.ok(Math.abs(r.netTrimestriel - attendu.tri) <= 1, `${reg} ${annees} ${base} : trimestriel ${r.netTrimestriel} ≠ ${attendu.tri}`);
}

/* =====================================================================
   1. Cas calculés à la main
   ===================================================================== */
test('RG – exemple standard (retenue de 3 %)', () => {
  const r = C.calculer(cfg, 'RG', [6, 5, 16], 250000);
  assert.equal(Math.round(r.tauxApplique * 1000), 450);
  assert.equal(Math.round(r.brut), 112500);
  assert.equal(r.netMensuel, 109125);
  assert.equal(r.netTrimestriel, 327375);
});

test('RG – pension ≤ 50 000 FDJ : pas de retenue', () => {
  const r = C.calculer(cfg, 'RG', [10, 5, 10], 80000);
  assert.equal(Math.round(r.brut), 35200);
  assert.equal(r.retenue, 0);
  assert.equal(r.netMensuel, 35200);
  assert.equal(r.netTrimestriel, 105600);
});

test('RG – taux plafonné à 81 %', () => {
  const r = C.calculer(cfg, 'RG', [26, 5, 20], 300000);
  assert.equal(r.plafonne, true);
  assert.equal(r.tauxApplique, 0.81);
  assert.equal(r.netMensuel, 235710);
});

test('RG – plafonné même sous 50 000 FDJ : la retenue s’applique', () => {
  const r = C.calculer(cfg, 'RG', [26, 5, 20], 50000);
  assert.equal(r.plafonne, true);
  assert.equal(r.netMensuel, Math.round(50000 * 0.81 * 0.97));
});

test('RG – durée minimale de 25 ans', () => {
  assert.equal(C.calculer(cfg, 'RG', [0, 5, 19], 200000).eligible, false);
  assert.equal(C.calculer(cfg, 'RG', [0, 5, 19], 200000).anneesManquantes, 1);
  assert.equal(C.calculer(cfg, 'RG', [0, 5, 20], 200000).eligible, true);
});

test('FCT – palier 15 premières années à 3 %, puis 2 %, et plafond', () => {
  const r = C.calculer(cfg, 'FCT', [20, 5, 3, 10], 1000);
  assert.equal(Math.round(r.taux * 1000), 815); // 0,45 + 0,10 + 0,09 + 0,045 + 0,13
  assert.equal(r.plafonne, true);
  assert.equal(r.netMensuel, 91447);
  assert.equal(r.netTrimestriel, 274341);
});

test('FCT – arrondi des décimales au trimestre', () => {
  const r = C.calculer(cfg, 'FCT', [10.3, 5, 0, 14.6], 1200);
  assert.deepEqual(r.parts.map(p => p.annees), [10.25, 5, 0, 14.5]);
  assert.equal(r.netMensuel, Math.round((0.3075 + 0.09 + 0.1885) * 1200 * 139667 / 1200 * 0.97));
});

test('FCT – la durée minimale se contrôle sur les années entières saisies', () => {
  const r = C.calculer(cfg, 'FCT', [10.9, 5, 3, 5.9], 1000);
  assert.equal(r.dureeControle, 23);
  assert.equal(r.eligible, false);
});

test('DMG – plafond 75 % et minimum 10 ans (2 mandats)', () => {
  const r = C.calculer(cfg, 'DMG', [10, 15], 2500);
  assert.equal(r.tauxApplique, 0.75);
  assert.equal(r.netMensuel, 211683);
  assert.equal(C.calculer(cfg, 'DMG', [4, 5], 2500).eligible, false);
  assert.equal(C.calculer(cfg, 'DMG', [4, 6], 2500).eligible, true);
});

test('Projection – les années supplémentaires s’ajoutent à la période en cours', () => {
  const base = C.calculer(cfg, 'RG', [6, 5, 16], 250000, 0);
  const plus = C.calculer(cfg, 'RG', [6, 5, 16], 250000, 4);
  assert.equal(plus.parts[2].annees, 20);
  assert.ok(plus.netMensuel > base.netMensuel);
  assert.equal(C.calculer(cfg, 'RG', [0, 5, 17], 250000, 3).eligible, true);
});

test('Arrondi au trimestre – table complète', () => {
  const t = { 3.0: 3, 3.1: 3, 3.2: 3.25, 3.3: 3.25, 3.4: 3.25, 3.5: 3.5, 3.6: 3.5, 3.7: 3.5, 3.8: 3.75, 3.9: 3.75, 3.25: 3.25, 3.96: 3 };
  for (const [v, e] of Object.entries(t)) assert.equal(C.arrondiTrimestre(Number(v)), e, `arrondi(${v})`);
});

/* =====================================================================
   2. Comparaison avec l'ancien simulateur sur des milliers de saisies
   ===================================================================== */
test('Identique à l’ancien simulateur – RG (3 000 cas aléatoires)', () => {
  for (let k = 0; k < 3000; k++) {
    const a = [entier(26), entier(5), entier(40)], M = entier(1500) * 1000;
    verifie('RG', a, M, legacy.RG(a[0], a[1], a[2], M));
  }
});

test('Identique à l’ancien simulateur – FCT et FNP avec décimales (3 000 cas chacun)', () => {
  for (const reg of ['FCT', 'FNP']) {
    for (let k = 0; k < 3000; k++) {
      const a = [dixieme(26), dixieme(5), dixieme(4), dixieme(30)], ind = entier(3000);
      verifie(reg, a, ind, legacy[reg](a[0], a[1], a[2], a[3], ind));
    }
  }
});

test('Identique à l’ancien simulateur – DMG (3 000 cas aléatoires)', () => {
  for (let k = 0; k < 3000; k++) {
    const a = [entier(25), entier(30)], ind = entier(3000);
    verifie('DMG', a, ind, legacy.DMG(a[0], a[1], ind));
  }
});

/* =====================================================================
   3. Dates, limites selon l'âge, compte à rebours
   ===================================================================== */
test('Âge légal de départ : 60 ans (55 ans FNP)', () => {
  const n = new Date(1972, 2, 14);
  assert.equal(C.dateDepart(cfg, 'RG', n).getFullYear(), 2032);
  assert.equal(C.dateDepart(cfg, 'FNP', n).getFullYear(), 2027);
});

test('Validation de la date de naissance', () => {
  assert.ok(C.validerNaissance(cfg, 14, 2, 1972, AUJ).date);
  assert.equal(C.validerNaissance(cfg, 31, 1, 1980, AUJ).erreur, 'invalide'); // 31 février
  assert.equal(C.validerNaissance(cfg, 1, 0, 2030, AUJ).erreur, 'future');
  assert.equal(C.validerNaissance(cfg, 1, 0, 2015, AUJ).erreur, 'jeune');
  assert.equal(C.validerNaissance(cfg, 1, 0, 1900, AUJ).erreur, 'ancienne');
});

test('Limites d’années selon l’âge', () => {
  const l1 = C.limites(cfg, 'RG', new Date(1972, 2, 14), AUJ);
  assert.deepEqual(l1.map(x => x.max), [14, 5, 20]);         // travail possible à partir de 1988
  assert.deepEqual(l1.map(x => x.limiteParAge), [true, false, false]);
  const l2 = C.limites(cfg, 'RG', new Date(1995, 4, 10), AUJ);
  assert.deepEqual(l2.map(x => x.max), [0, 0, 16]);          // à partir de 2011
  const l3 = C.limites(cfg, 'RG', new Date(1960, 0, 1), AUJ);
  assert.equal(l3[2].max, 13);                                // retraite en 2020 : 2007 → 2019
  assert.deepEqual(C.limites(cfg, 'RG', null, AUJ).map(x => x.max), [26, 5, 20]);
});

test('Compte à rebours', () => {
  assert.deepEqual(C.compteARebours(new Date(2032, 2, 14), AUJ), { annees: 5, mois: 3, jours: 19 });
  assert.equal(C.compteARebours(new Date(2020, 0, 1), AUJ), null);
});

/* =====================================================================
   4. Calcul automatique des années depuis la carrière
   ===================================================================== */
const NE_1972 = new Date(1972, 2, 14);

test('Carrière continue – RG (années entières)', () => {
  const r = C.anneesDepuisCarriere(cfg, 'RG', { debut: { mois: 0, annee: 1995 }, fin: null, interruptions: [] }, NE_1972, AUJ);
  assert.deepEqual(r.mois, [84, 60, 239]);
  assert.deepEqual(r.annees, [7, 5, 19]);
  assert.deepEqual(r.avertissements, []);
});

test('Carrière avec interruption', () => {
  const r = C.anneesDepuisCarriere(cfg, 'RG', {
    debut: { mois: 0, annee: 1995 }, fin: null,
    interruptions: [{ debut: { mois: 0, annee: 2003 }, fin: { mois: 11, annee: 2003 } }]
  }, NE_1972, AUJ);
  assert.deepEqual(r.annees, [7, 4, 19]);
});

test('Carrière – FCT en années décimales, puis arrondi au trimestre', () => {
  const r = C.anneesDepuisCarriere(cfg, 'FCT', { debut: { mois: 0, annee: 1995 }, fin: null, interruptions: [] }, NE_1972, AUJ);
  assert.deepEqual(r.annees, [7, 5, 3, 16.92]);
  const res = C.calculer(cfg, 'FCT', r.annees, 1000);
  assert.equal(res.parts[3].annees, 16.75);
});

test('Carrière terminée', () => {
  const r = C.anneesDepuisCarriere(cfg, 'RG', { debut: { mois: 5, annee: 1990 }, fin: { mois: 4, annee: 2010 }, interruptions: [] }, NE_1972, AUJ);
  assert.deepEqual(r.mois, [139, 60, 41]);
  assert.deepEqual(r.annees, [11, 5, 3]);
});

test('Carrière – bornée à 16 ans et à l’âge légal, avec avertissements', () => {
  const tot = C.anneesDepuisCarriere(cfg, 'RG', { debut: { mois: 0, annee: 1980 }, fin: null, interruptions: [] }, NE_1972, AUJ);
  assert.ok(tot.avertissements.includes('debut_trop_tot'));
  assert.equal(tot.mois[0], (2001 - 1988) * 12 + 10); // de mars 1988 à décembre 2001
  const vieux = C.anneesDepuisCarriere(cfg, 'RG', { debut: { mois: 0, annee: 1985 }, fin: null, interruptions: [] }, new Date(1960, 1, 1), AUJ);
  assert.ok(vieux.avertissements.includes('fin_apres_depart'));
  assert.equal(vieux.mois[2], 13 * 12 + 1); // de janvier 2007 à janvier 2020
});

test('Carrière – les années calculées respectent les maximums de période', () => {
  const r = C.anneesDepuisCarriere(cfg, 'DMG', { debut: { mois: 0, annee: 1970 }, fin: null, interruptions: [] }, new Date(1950, 0, 1), AUJ);
  assert.ok(r.annees[0] <= 25);
});

/* =====================================================================
   5. Prévision à l'âge de départ
   ===================================================================== */
test('Prévision – années ajoutées jusqu’au départ (RG : années entières)', () => {
  const p = C.prevision(cfg, 'RG', [6, 5, 16], 250000, NE_1972, AUJ, 0);
  assert.equal(p.moisRestants, 63);                 // 24/11/2026 → 14/03/2032
  assert.equal(p.anneesAjoutees, 5);
  assert.equal(p.resultat.parts[2].annees, 21);
  assert.equal(p.resultat.netMensuel, C.calculer(cfg, 'RG', [6, 5, 16], 250000, 5).netMensuel);
  assert.ok(p.gainMensuel > 0);
  assert.equal(p.anneeEligibilite, null);           // déjà éligible
});

test('Prévision – non éligible aujourd’hui mais éligible au départ', () => {
  const p = C.prevision(cfg, 'FCT', [0, 5, 3, 10], 1000, new Date(1980, 0, 1), AUJ, 0);
  assert.equal(p.actuel.eligible, false);
  assert.equal(p.anneeEligibilite, 2026 + 7);
  assert.equal(p.anneesAjoutees, 13);               // 157 mois → 13,08 → arrondi trimestre 13
  assert.equal(p.resultat.eligible, true);
  assert.equal(p.gainMensuel, p.resultat.netMensuel);
});

test('Prévision – toujours non éligible au départ', () => {
  const p = C.prevision(cfg, 'RG', [0, 0, 5], 200000, new Date(1970, 0, 1), AUJ, 0);
  assert.equal(p.resultat.eligible, false);
  assert.equal(p.anneesAjoutees, 3);                // départ le 1er janvier 2030
  assert.equal(p.resultat.anneesManquantes, 25 - 5 - 3);
});

test('Prévision – évolution du revenu et plafond de l’indice', () => {
  const p = C.prevision(cfg, 'RG', [6, 5, 16], 250000, NE_1972, AUJ, 0.02);
  assert.ok(Math.abs(p.baseProjetee - 250000 * Math.pow(1.02, 63 / 12)) < 1e-6);
  const q = C.prevision(cfg, 'FCT', [8, 5, 3, 14], 2900, NE_1972, AUJ, 0.05);
  assert.equal(q.baseProjetee, cfg.indiceMax);
});

test('RG – évolution réglementaire : +4 % du salaire de base tous les 2 ans (non composée)', () => {
  const f = m => C.baseFuture(cfg, 'RG', 168500, m, 'statut');
  assert.equal(f(0), 168500);
  assert.equal(f(23), 168500);
  assert.equal(f(24), 175240);
  assert.equal(f(47), 175240);
  assert.equal(f(48), 181980);
  assert.equal(f(72), 188720);
  // Prévision : départ dans 63 mois → 2 augmentations
  const p = C.prevision(cfg, 'RG', [6, 5, 16], 168500, NE_1972, AUJ, 'statut');
  assert.equal(p.moisRestants, 63);
  assert.equal(p.baseProjetee, 181980);
  // Sursalaire (primes, heures sup.) : non augmenté, seul le salaire de base l'est
  assert.equal(C.baseFuture(cfg, 'RG', 200000, 48, 'statut', 31500), 200000 + 2 * 6740);
  assert.equal(C.prevision(cfg, 'RG', [6, 5, 16], 200000, NE_1972, AUJ, 'statut', 31500).baseProjetee, 213480);
  // Régime sans évolution réglementaire : base inchangée
  assert.equal(C.baseFuture(cfg, 'FCT', 1200, 60, 'statut'), 1200);
});

test('Prévision – aucune si l’âge légal est atteint ou sans date de naissance', () => {
  assert.equal(C.prevision(cfg, 'RG', [6, 5, 16], 250000, new Date(1960, 0, 1), AUJ, 0), null);
  assert.equal(C.prevision(cfg, 'RG', [6, 5, 16], 250000, null, AUJ, 0), null);
});
