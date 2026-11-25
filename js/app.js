/* =====================================================================
   INTERFACE DU SIMULATEUR
   Dépend de : js/config.js (PENSION_CONFIG), js/calcul.js (PENSION_CALCUL),
               js/i18n.js (PENSION_I18N)
   ===================================================================== */
(function () {
'use strict';

var cfg = window.PENSION_CONFIG, C = window.PENSION_CALCUL, L = window.PENSION_I18N;
var R = cfg.regimes, KEYS = Object.keys(R), POINT = C.valeurPoint(cfg);

function $(id) { return document.getElementById(id); }
function store(k, v) {
  try {
    if (v === undefined) return localStorage.getItem(k);
    if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
  } catch (e) { return null; }
}

/* =================================================================
   Langue (français / anglais)
   ================================================================= */
var lang = store('pension-lang');
if (!L.STR[lang]) lang = 'fr';

var GLOBALS = {
  seuil: Number(cfg.retenue.seuil).toLocaleString('fr-FR'),
  ret: String(cfg.retenue.taux * 100).replace('.', ','),
  imax: Number(cfg.indiceMax).toLocaleString('fr-FR'),
  ptn: Number(cfg.pointIndice.numerateur).toLocaleString('fr-FR'),
  ptd: Number(cfg.pointIndice.denominateur).toLocaleString('fr-FR'),
  pt: POINT.toLocaleString('fr-FR', { maximumFractionDigits: 2 }),
  agemin: cfg.ageMinTravail,
  laws: cfg.contact.textesLoi
};
function t(k, v) {
  var s = L.STR[lang][k];
  if (s == null) s = L.STR.fr[k];
  if (s == null) return k;
  return s.replace(/\{(\w+)\}/g, function (m, x) {
    if (v && v[x] != null) return v[x];
    return GLOBALS[x] != null ? GLOBALS[x] : m;
  });
}
function months() { return L.MOIS[lang] || L.MOIS.fr; }
function D() { return L.DUREE[lang] || L.DUREE.fr; }
/* « 5 ans » */
function yrs(n) { n = Number(Number(n).toFixed(2)); return D().ans(n, n.toLocaleString('fr-FR')); }
/* « 16 ans 11 mois » à partir d'années décimales */
function ym(years) { var m = Math.round(C.num(years) * 12); return D().am(Math.floor(m / 12), m % 12); }
function regTxt(k) { return (L.REGIMES[lang] || L.REGIMES.fr)[k]; }

/* =================================================================
   État
   ================================================================= */
var S = {
  reg: 'RG', birth: null, y: {}, b: {}, example: false, mode: 'manual', growth: 0, evo: true, viewPick: null,
  car: { start: { m: '', y: '' }, active: true, end: { m: '', y: '' }, gaps: [] }
};
function blank() { KEYS.forEach(function (k) { S.y[k] = R[k].periodes.map(function () { return 0; }); S.b[k] = 0; }); }
blank();
var scenarios = [];
try { scenarios = JSON.parse(store('pension-scen') || '[]') || []; } catch (e) { scenarios = []; }

var fr = function (n, d) { return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: d || 0 }); };
var pc = function (n) { return (n * 100).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %'; };
var isMobile = function () { return matchMedia('(max-width:760px)').matches; };
function theme() { return document.documentElement.getAttribute('data-theme'); }
function COL() { return theme() === 'light' ? ['#0891b2', '#7c3aed', '#d97706', '#db2777'] : ['#22d3ee', '#a78bfa', '#fbbf24', '#f472b6']; }
function fmtDate(d) {
  if (lang === 'en') return months()[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  return (d.getDate() === 1 ? '1er' : d.getDate()) + ' ' + months()[d.getMonth()] + ' ' + d.getFullYear();
}
function periodLabel(p) { return p.debut + ' – ' + (p.fin || t('today')); }
function now() { return new Date(); }
function compute(extra, base) { return C.calculer(cfg, S.reg, S.y[S.reg], base == null ? S.b[S.reg] : base, extra || 0); }
/* Hypothèse d'évolution du revenu : règle du régime (RG : +4 % tous les 2 ans) ou curseur */
function growthArg() { return R[S.reg].evolution ? (S.evo ? 'statut' : 0) : S.growth; }
function prevision() { return C.prevision(cfg, S.reg, S.y[S.reg], S.b[S.reg], S.birth, now(), growthArg()); }
function baseWord() { return R[S.reg].base === 'salaire' ? t('base_sal') : t('base_ind'); }

/* =================================================================
   Sauvegarde automatique de la saisie
   ================================================================= */
var saveTimer;
function snapshotState() {
  return {
    reg: S.reg, y: S.y, b: S.b, mode: S.mode, car: S.car, growth: S.growth, evo: S.evo, example: S.example,
    birth: { d: $('bD').value, m: $('bM').value, y: $('bY').value }
  };
}
function hasData(o) {
  if (!o) return false;
  if (o.birth && (o.birth.d || o.birth.y)) return true;
  return KEYS.some(function (k) { return (o.b && o.b[k] > 0) || (o.y && o.y[k] && o.y[k].some(function (v) { return v > 0; })); });
}
function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function () { store('pension-state', JSON.stringify(snapshotState())); }, 300);
}
function applyState(o) {
  KEYS.forEach(function (k) {
    if (o.y && Array.isArray(o.y[k]) && o.y[k].length === R[k].periodes.length) S.y[k] = o.y[k].map(C.num);
    if (o.b && o.b[k] != null) S.b[k] = C.num(o.b[k]);
  });
  S.reg = R[o.reg] ? o.reg : 'RG';
  S.mode = o.mode === 'auto' ? 'auto' : 'manual';
  S.growth = C.num(o.growth);
  S.evo = o.evo !== false;
  S.example = !!o.example;
  if (o.car) S.car = o.car;
  $('bD').value = o.birth ? o.birth.d || '' : '';
  $('bM').value = o.birth ? o.birth.m : '';
  $('bY').value = o.birth ? o.birth.y || '' : '';
  $('csM').value = S.car.start.m; $('csY').value = S.car.start.y;
  $('ceM').value = S.car.end.m; $('ceY').value = S.car.end.y;
  $('cActive').checked = S.car.active; $('ceRow').hidden = S.car.active;
  $('growth').value = S.growth * 100; setFill($('growth'));
  $('evoRG').checked = S.evo;
  $('banner').classList.toggle('show', S.example);
  readBirth();
}

/* =================================================================
   Textes statiques
   ================================================================= */
function fillMonths(sel) {
  var cur = sel.value;
  sel.classList.add('mpick'); sel.setAttribute('aria-haspopup', 'dialog');
  sel.innerHTML = '<option value="">' + t('month_ph') + '</option>' +
    months().map(function (m, i) { return '<option value="' + i + '">' + m + '</option>'; }).join('');
  sel.value = cur;
}
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(function (el) { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.dataset.i18nAria)); el.title = t(el.dataset.i18nAria); });
  document.querySelectorAll('.tip').forEach(function (b) { b.setAttribute('aria-label', t('help')); });
  $('bD').placeholder = t('day_ph');
  ['bY', 'csY', 'ceY'].forEach(function (id) { $(id).placeholder = t('year_ph'); });
  ['bM', 'csM', 'ceM'].forEach(function (id) { fillMonths($(id)); });
  renderGaps(); syncMenu();
  document.title = t('app_title') + ' · Djibouti';
}

/* =================================================================
   Contrôles : régime, revenu, années
   ================================================================= */
function setFill(el) {
  var mx = Number(el.max) || 0, mn = Number(el.min) || 0, p = mx > mn ? (el.value - mn) / (mx - mn) * 100 : 0;
  el.style.setProperty('--p', p + '%');
}
function rateText(r, p) {
  var s = p.palier ? t('tier') : t('per_year', { v: fr(p.taux * 100, 1) });
  return r.trimestre ? s + t('quarter_note') : s;
}

function buildControls() {
  var r = R[S.reg], col = COL();
  $('pill').style.transform = 'translateX(' + (KEYS.indexOf(S.reg) * 100) + '%)';
  document.querySelectorAll('#seg button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.r === S.reg ? 'true' : 'false'); });
  $('regTag').textContent = S.reg;
  var rt = regTxt(S.reg);
  $('regInfo').innerHTML = (L.INFO_REGIME[lang] || L.INFO_REGIME.fr).replace('{n}', rt[0]).replace('{w}', rt[1]).replace('{a}', r.age).replace('{m}', r.min);
  $('capTag').textContent = t('cap_tag', { v: Math.round(r.plafond * 100) });

  var h = '';
  r.periodes.forEach(function (p, i) {
    h += '<div class="slider" id="sl' + i + '" style="--c:' + col[i] + '">' +
      '<div class="s-top"><span class="dot" style="background:' + col[i] + '"></span>' +
      '<div class="s-lbl"><b>' + periodLabel(p) + '</b><small id="sh' + i + '"></small></div>' +
      '<span class="s-contrib" id="ct' + i + '"></span>' +
      '<input class="mini" type="number" min="0" step="' + (r.trimestre ? 0.1 : 1) + '" data-i="' + i + '" id="yn' + i + '" aria-label="' + t('years_title') + ' ' + periodLabel(p) + '">' +
      '<span class="unit" id="un' + i + '">' + t('ans') + '</span></div>' +
      '<input type="range" min="0" step="' + (r.trimestre ? 0.25 : 1) + '" data-i="' + i + '" id="yr' + i + '" aria-label="' + t('years_title') + ' ' + periodLabel(p) + '">' +
      '<div class="ticks"><span>0</span><span id="tk' + i + '"></span></div></div>';
  });
  $('sliders').innerHTML = h;
  applyLimits();

  var br = $('baseRange');
  if (r.base === 'salaire') {
    $('baseTitle').textContent = t('pay_sal'); $('baseSub').textContent = t('per_month');
    $('baseLbl').textContent = t('sal_lbl'); $('baseHint').textContent = t('sal_hint');
    $('baseTip').dataset.tip = 'salary';
    br.max = cfg.salaireMaxCurseur; br.step = 5000;
    $('baseTicks').innerHTML = '<span>0</span><span>' + fr(cfg.salaireMaxCurseur / 2) + '</span><span>' + fr(cfg.salaireMaxCurseur) + '</span>';
  } else {
    $('baseTitle').textContent = t('pay_ind'); $('baseSub').textContent = t('point_val', { v: fr(POINT, 2) });
    $('baseLbl').textContent = t('ind_lbl'); $('baseHint').textContent = t('ind_hint');
    $('baseTip').dataset.tip = 'indice';
    br.max = cfg.indiceMax; br.step = 10;
    $('baseTicks').innerHTML = '<span>0</span><span>' + fr(cfg.indiceMax / 2) + '</span><span>' + fr(cfg.indiceMax) + '</span>';
  }
  br.setAttribute('aria-label', $('baseLbl').textContent);
  $('baseNum').setAttribute('aria-label', $('baseLbl').textContent);
  syncBase();
  document.querySelectorAll('#modeTabs button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.mode === S.mode ? 'true' : 'false'); });
  $('autoBox').hidden = S.mode !== 'auto';
}

function applyLimits() {
  var r = R[S.reg], lim = C.limites(cfg, S.reg, S.birth, now()), auto = S.mode === 'auto';
  r.periodes.forEach(function (p, i) {
    var yr = $('yr' + i), yn = $('yn' + i); if (!yr) return;
    var mx = lim[i].max;
    if (C.num(S.y[S.reg][i]) > mx) S.y[S.reg][i] = mx;
    yr.max = mx; yr.disabled = mx === 0 || auto;
    yr.value = S.y[S.reg][i];
    if (auto) {
      yn.type = 'text'; yn.readOnly = true; yn.disabled = mx === 0;
      yn.value = mx === 0 ? '' : ym(S.y[S.reg][i]);
      yn.classList.add('ym'); $('un' + i).hidden = true;
    } else {
      if (yn.type !== 'number') { yn.type = 'number'; }
      yn.readOnly = false; yn.disabled = mx === 0; yn.max = mx;
      yn.classList.remove('ym'); $('un' + i).hidden = false;
      if (document.activeElement !== yn) yn.value = S.y[S.reg][i] || '';
    }
    $('tk' + i).textContent = mx + ' ' + t('ans');
    $('sl' + i).classList.toggle('off', mx === 0);
    $('sl' + i).classList.toggle('locked', auto && mx > 0);
    var sh = $('sh' + i), base = rateText(r, p);
    if (auto && mx > 0) { sh.textContent = t('auto_locked'); sh.className = 'auto'; sh.title = base; }
    else if (lim[i].limiteParAge) { sh.textContent = mx === 0 ? t('lim_none') : t('lim_age', { n: mx }); sh.className = 'lim'; sh.title = base; }
    else { sh.textContent = base; sh.className = ''; sh.title = ''; }
    setFill(yr);
  });
}

function syncBase() {
  var v = S.b[S.reg], br = $('baseRange');
  $('baseNum').value = v ? fr(v) : '';
  br.value = Math.min(v, br.max); setFill(br);
}

function baseWarning() {
  var r = R[S.reg], v = C.num(S.b[S.reg]), w = cfg.vraisemblance, msg = '';
  if (v > 0) {
    if (r.base === 'salaire') { if (v < w.salaireMin) msg = t('warn_sal_low'); else if (v > w.salaireMax) msg = t('warn_sal_high'); }
    else if (v < w.indiceMin) msg = t('warn_ind_low');
  }
  $('baseWarn').textContent = msg; $('baseWarn').classList.toggle('show', !!msg);
}

function userEdit() { if (S.example) { S.example = false; $('banner').classList.remove('show'); } }

$('seg').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b || b.dataset.r === S.reg) return;
  S.reg = b.dataset.r; buildControls(); update();
});
$('seg').addEventListener('keydown', function (e) {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  var i = KEYS.indexOf(S.reg) + (e.key === 'ArrowRight' ? 1 : -1);
  S.reg = KEYS[(i + KEYS.length) % KEYS.length]; buildControls(); update();
  document.querySelector('#seg button[data-r="' + S.reg + '"]').focus();
});
$('sliders').addEventListener('input', function (e) {
  var i = e.target.dataset.i; if (i == null || S.mode === 'auto') return;
  var mx = Number($('yr' + i).max), v = e.target.value;
  if (e.target.type === 'number') {
    var c = Math.max(0, Math.min(mx, C.num(v)));
    if (v !== '' && c !== C.num(v)) e.target.value = v = c;
    $('yr' + i).value = C.num(v); setFill($('yr' + i));
  } else { $('yn' + i).value = v; setFill(e.target); }
  S.y[S.reg][i] = v === '' ? 0 : C.num(v);
  userEdit(); update();
});
$('baseRange').addEventListener('input', function () {
  S.b[S.reg] = C.num(this.value); $('baseNum').value = S.b[S.reg] ? fr(S.b[S.reg]) : ''; setFill(this); userEdit(); update();
});
$('baseNum').addEventListener('input', function () {
  var digits = this.value.replace(/\D/g, ''), v = digits ? parseInt(digits, 10) : 0;
  if (R[S.reg].base === 'indice' && v > cfg.indiceMax) v = cfg.indiceMax;
  if (v > 99999999) v = 99999999;
  S.b[S.reg] = v; this.value = digits ? fr(v) : '';
  var br = $('baseRange'); br.value = Math.min(v, br.max); setFill(br);
  userEdit(); update();
});

/* =================================================================
   Date de naissance
   ================================================================= */
function readBirth() {
  var d = $('bD').value.trim(), m = $('bM').value, y = $('bY').value.trim(), err = '', bad = '';
  S.birth = null;
  if (d && m !== '' && y.length === 4) {
    var v = C.validerNaissance(cfg, +d, +m, +y, now());
    if (v.erreur) { err = t('err_' + v.erreur); bad = v.erreur === 'invalide' ? 'bD' : 'bY'; }
    else S.birth = v.date;
  } else if (d && (+d < 1 || +d > 31)) { err = t('err_invalide'); bad = 'bD'; }
  $('birthErr').textContent = err; $('birthErr').classList.toggle('show', !!err);
  ['bD', 'bM', 'bY'].forEach(function (k) { $(k).classList.toggle('bad', k === bad); });
}
['bD', 'bY'].forEach(function (id) {
  $(id).addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '');
    if (id === 'bD' && this.value.length === 2) $('bM').focus();
    onBirth();
  });
});
$('bM').addEventListener('change', function () { if (this.value !== '' && !$('bY').value) $('bY').focus(); onBirth(); });
function onBirth() { readBirth(); userEdit(); applyLimits(); update(); }
function setBirthFields(o) {
  $('bD').value = o ? String(o.jour).padStart(2, '0') : '';
  $('bM').value = o ? o.mois : '';
  $('bY').value = o ? o.annee : '';
  readBirth();
}

/* =================================================================
   Mode « Depuis ma carrière »
   ================================================================= */
function monthYear(o) { return (o && o.m !== '' && o.m != null && /^\d{4}$/.test(String(o.y))) ? { mois: +o.m, annee: +o.y } : null; }

function setMode(m) {
  S.mode = m;
  document.querySelectorAll('#modeTabs button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.mode === m ? 'true' : 'false'); });
  $('autoBox').hidden = m !== 'auto';
  applyLimits(); update();
}
$('modeTabs').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b || b.dataset.mode === S.mode) return;
  userEdit(); setMode(b.dataset.mode);
});

function myHtml(prefix, o) {
  return '<div class="my"><select class="fld" data-k="' + prefix + 'm" aria-label="' + t('month') + '"></select>' +
    '<input class="fld num" data-k="' + prefix + 'y" type="text" inputmode="numeric" maxlength="4" placeholder="' + t('year_ph') + '" aria-label="' + t('year') + '" value="' + (o.y || '') + '"></div>';
}
function renderGaps() {
  var box = $('gaps'); if (!box) return;
  box.innerHTML = S.car.gaps.map(function (g, i) {
    return '<div class="gap" data-g="' + i + '">' +
      '<div><span class="fld-lbl">' + t('car_from') + '</span>' + myHtml('f', g.from) + '</div>' +
      '<div><span class="fld-lbl">' + t('car_to') + '</span>' + myHtml('t', g.to) + '</div>' +
      '<button type="button" class="gap-x" data-del="' + i + '" aria-label="' + t('car_del') + '">✕</button></div>';
  }).join('');
  box.querySelectorAll('.gap').forEach(function (row) {
    var g = S.car.gaps[+row.dataset.g];
    var fm = row.querySelector('[data-k="fm"]'), tm = row.querySelector('[data-k="tm"]');
    fillMonths(fm); fm.value = g.from.m; fillMonths(tm); tm.value = g.to.m;
  });
}
$('gaps').addEventListener('input', function (e) {
  var row = e.target.closest('.gap'); if (!row) return;
  var g = S.car.gaps[+row.dataset.g], k = e.target.dataset.k;
  if (k.charAt(1) === 'y') e.target.value = e.target.value.replace(/\D/g, '');
  (k.charAt(0) === 'f' ? g.from : g.to)[k.charAt(1)] = e.target.value;
  userEdit(); update();
});
$('gaps').addEventListener('click', function (e) {
  var d = e.target.closest('[data-del]'); if (!d) return;
  S.car.gaps.splice(+d.dataset.del, 1); renderGaps(); update();
});
$('addGap').addEventListener('click', function () {
  S.car.gaps.push({ from: { m: '', y: '' }, to: { m: '', y: '' } }); renderGaps();
  var sels = $('gaps').querySelectorAll('.gap:last-child select'); if (sels[0]) sels[0].focus();
});
function bindMY(mId, yId, target) {
  $(mId).addEventListener('change', function () { target().m = this.value; userEdit(); update(); });
  $(yId).addEventListener('input', function () { this.value = this.value.replace(/\D/g, ''); target().y = this.value; userEdit(); update(); });
}
bindMY('csM', 'csY', function () { return S.car.start; });
bindMY('ceM', 'ceY', function () { return S.car.end; });
$('cActive').addEventListener('change', function () { S.car.active = this.checked; $('ceRow').hidden = this.checked; userEdit(); update(); });

function syncAuto() {
  if (S.mode !== 'auto') return;
  var msg = $('carMsg'), r = R[S.reg];
  var start = monthYear(S.car.start);
  if (!S.birth || !start) {
    S.y[S.reg] = r.periodes.map(function () { return 0; });
    msg.className = 'car-msg idle';
    msg.textContent = !S.birth ? t('car_need_birth') : t('car_need_start');
    applyLimits(); return;
  }
  var gaps = S.car.gaps.map(function (g) {
    var a = monthYear(g.from), b = monthYear(g.to);
    return a && b ? { debut: a, fin: b } : null;
  }).filter(Boolean);
  var res = C.anneesDepuisCarriere(cfg, S.reg, {
    debut: start, fin: S.car.active ? null : monthYear(S.car.end), interruptions: gaps
  }, S.birth, now());
  S.y[S.reg] = res.annees;
  var h = '<b>' + t('car_total', { d: D().am(Math.floor(res.totalMois / 12), res.totalMois % 12) }) + '</b>';
  res.avertissements.forEach(function (w) { h += '<br>⚠ ' + t('w_' + w); });
  msg.className = 'car-msg ' + (res.avertissements.length ? 'warn' : 'ok');
  msg.innerHTML = h;
  applyLimits();
}

/* =================================================================
   Exemple, effacer (avec annulation), recommencer
   ================================================================= */
function loadExample() {
  KEYS.forEach(function (k) { S.y[k] = R[k].exemple.annees.slice(); S.b[k] = R[k].exemple.base; });
  setBirthFields(cfg.exempleNaissance);
  S.example = true; S.viewPick = null; $('banner').classList.add('show');
  S.mode = 'manual'; buildControls(); update();
}
function clearAll() {
  blank(); setBirthFields(null);
  S.car = { start: { m: '', y: '' }, active: true, end: { m: '', y: '' }, gaps: [] };
  ['csM', 'csY', 'ceM', 'ceY'].forEach(function (id) { $(id).value = ''; });
  $('cActive').checked = true; $('ceRow').hidden = true; renderGaps();
  S.example = false; S.viewPick = null; S.growth = 0; $('growth').value = 0; setFill($('growth'));
  S.evo = true; $('evoRG').checked = true;
  $('banner').classList.remove('show');
  buildControls(); update();
}
function clearWithUndo() {
  var before = JSON.parse(JSON.stringify(snapshotState()));
  if (!hasData(before)) { clearAll(); return; }
  clearAll();
  toast(t('undo_msg'), t('undo'), function () { applyState(before); buildControls(); update(); });
}
function focusStart() {
  if (isMobile()) openSheet();
  setTimeout(function () { $('bD').focus(); }, isMobile() ? 380 : 0);
}
function startOwn() { clearAll(); focusStart(); }
$('exBtn').addEventListener('click', loadExample);
$('clearBtn').addEventListener('click', clearWithUndo);
$('bannerBtn').addEventListener('click', startOwn);
$('gCta').addEventListener('click', focusStart);

/* Message temporaire avec action (annuler, recommencer…) */
var toastTimer;
function toast(msg, action, fn) {
  var el = $('toast');
  $('toastMsg').textContent = msg;
  var b = $('toastBtn'); b.textContent = action || ''; b.hidden = !action;
  b.onclick = function () { el.hidden = true; if (fn) fn(); };
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.hidden = true; }, 7000);
}

/* =================================================================
   Étapes repliables (mobile) et indicateurs de progression
   ================================================================= */
document.querySelectorAll('.step-h').forEach(function (h) {
  h.addEventListener('click', function () {
    if (!isMobile()) return;
    var st = h.parentNode, closed = !st.classList.contains('closed');
    st.classList.toggle('closed', closed); h.setAttribute('aria-expanded', closed ? 'false' : 'true');
  });
});
function stepDone(c) {
  return { step1: !!S.birth, step2: C.num(S.b[S.reg]) > 0, step3: c.dureeControle > 0 };
}
function renderSteps(c) {
  var d = stepDone(c);
  Object.keys(d).forEach(function (k) { $(k).classList.toggle('done', d[k]); });
}
function arrangeStepsForSheet() {
  var d = stepDone(compute(0)), all = d.step1 && d.step2 && d.step3;
  Object.keys(d).forEach(function (k) {
    var closed = !all && d[k];
    $(k).classList.toggle('closed', closed);
    $(k).querySelector('.step-h').setAttribute('aria-expanded', closed ? 'false' : 'true');
  });
}

/* =================================================================
   Jauge
   ================================================================= */
var CX = 150, CY = 150, RAD = 118, A0 = 150, SPAN = 240;
function pt(f, rad) { var a = (A0 + SPAN * f) * Math.PI / 180; return [CX + rad * Math.cos(a), CY + rad * Math.sin(a)]; }
function arc(f1, f2, rad) {
  rad = rad || RAD; f1 = Math.max(0, Math.min(1, f1)); f2 = Math.max(0, Math.min(1, f2));
  if (f2 - f1 < 0.0005) return '';
  var a = pt(f1, rad), b = pt(f2, rad), large = (f2 - f1) * SPAN > 180 ? 1 : 0;
  return 'M' + a[0].toFixed(2) + ' ' + a[1].toFixed(2) + ' A' + rad + ' ' + rad + ' 0 ' + large + ' 1 ' + b[0].toFixed(2) + ' ' + b[1].toFixed(2);
}
function drawGauge(rates, cap) {
  var col = COL();
  var h = '<defs><filter id="glow" filterUnits="userSpaceOnUse" x="-20" y="-20" width="340" height="300"><feGaussianBlur stdDeviation="' + (theme() === 'light' ? 2.5 : 4) + '" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
  for (var k = 0; k <= 20; k++) {
    var f = k / 20, a = pt(f, RAD + 20), b = pt(f, RAD + (k % 5 ? 15 : 11));
    h += '<line class="sv-tick' + (k % 5 ? '' : ' s') + '" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke-width="' + (k % 5 ? 1 : 2) + '" stroke-linecap="round"/>';
    if (k % 5 === 0 && Math.abs(f - cap) > 0.065) { var tp = pt(f, RAD + 32); h += '<text class="sv-lbl" x="' + tp[0] + '" y="' + (tp[1] + 4) + '" text-anchor="middle">' + (k * 5) + '%</text>'; }
  }
  h += '<path class="sv-track" d="' + arc(0, 1) + '" stroke-width="18" fill="none" stroke-linecap="round"/>';
  var cum = 0, ends = rates.map(function (x) { return cum += x; }), segs = '';
  for (var i = rates.length - 1; i >= 0; i--) {
    var d = rates[i] > 0.0005 ? arc(0, ends[i]) : '';
    if (d) segs += '<path d="' + d + '" stroke="' + col[i] + '" stroke-width="18" fill="none" stroke-linecap="round"/>';
  }
  h += '<g filter="url(#glow)">' + segs + '</g>';
  if (cum > cap) { var dz = arc(cap, cum); if (dz) h += '<path class="sv-over" d="' + dz + '" stroke-width="18" fill="none"/>'; }
  var c1 = pt(cap, RAD - 12), c2 = pt(cap, RAD + 22), cl = pt(cap, RAD + 38);
  h += '<line class="sv-cap" x1="' + c1[0] + '" y1="' + c1[1] + '" x2="' + c2[0] + '" y2="' + c2[1] + '" stroke-width="3" stroke-linecap="round"/>';
  h += '<text class="sv-captxt" x="' + cl[0] + '" y="' + (cl[1] + 4) + '" text-anchor="middle">' + t('max') + '</text>';
  if (cum > 0.0005) { var tip = pt(Math.min(cum, 1), RAD); h += '<circle class="sv-knob" cx="' + tip[0] + '" cy="' + tip[1] + '" r="7" stroke-width="3"/>'; }
  $('gauge').innerHTML = h;
}

/* =================================================================
   Animations
   ================================================================= */
var tweens = {};
function tween(key, to, dur, onStep) {
  var from = tweens[key] && tweens[key].cur != null ? tweens[key].cur : to;
  if (tweens[key]) cancelAnimationFrame(tweens[key].raf);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) dur = 1;
  var t0 = performance.now(), o = tweens[key] = { cur: from };
  (function step(n) {
    var k = Math.min(1, (n - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    o.cur = Array.isArray(to) ? to.map(function (v, i) { var f = (from[i] || 0); return f + (v - f) * e; }) : from + (to - from) * e;
    onStep(o.cur);
    if (k < 1) o.raf = requestAnimationFrame(step);
  })(t0);
}
function countTo(id, val, suffix) {
  if (val == null) { if (tweens[id]) cancelAnimationFrame(tweens[id].raf); tweens[id] = null; $(id).textContent = '—'; return; }
  tween(id, val, 600, function (v) { $(id).textContent = fr(Math.round(v)) + (suffix || ''); });
}

/* =================================================================
   Mise à jour générale
   ================================================================= */
var liveTimer;
function status(c) {
  var filled = S.birth && C.num(S.b[S.reg]) > 0 && c.dureeControle > 0;
  return !filled ? 'idle' : (c.eligible ? 'ok' : 'ko');
}
/* Vue affichée par la jauge : « aujourd'hui » ou « à mon départ » */
function currentView(c, pv) {
  if (!pv) return 'now';
  if (S.viewPick) return S.viewPick;
  return c.eligible ? 'now' : 'dep';
}

function update() {
  syncAuto();
  var r = R[S.reg], b = S.b[S.reg];
  var c = compute(0), st = status(c), miss = c.anneesManquantes;
  var pv = st === 'idle' ? null : prevision();
  var view = currentView(c, pv);
  var V = view === 'dep' ? pv.resultat : c;          // résultat affiché par la jauge
  var vOk = st !== 'idle' && V.eligible;

  c.parts.forEach(function (p, i) { var el = $('ct' + i); if (el) el.textContent = '+' + pc(p.taux); });
  $('yrsTxt').textContent = t('total_years', { v: S.mode === 'auto' ? ym(c.totalAnnees) : yrs(c.totalAnnees) });
  renderReq(r, c, miss);
  renderSteps(c);
  baseWarning();

  // Résumé en une phrase
  renderSummary(r, c, pv, st);

  // Bascule de vue
  document.querySelectorAll('#viewTabs button[data-view]').forEach(function (btn) {
    btn.setAttribute('aria-selected', btn.dataset.view === view ? 'true' : 'false');
    if (btn.dataset.view === 'dep') btn.disabled = !pv;
  });
  $('viewTabs').classList.toggle('hidden', st === 'idle');

  // Jauge
  tween('gauge', V.parts.map(function (p) { return p.taux; }), 700, function (v) { drawGauge(v, r.plafond); });
  var gz = $('gaugeZone'), gState = st === 'idle' ? 'idle' : (vOk ? 'ok' : 'ko');
  gz.classList.remove('ok', 'ko', 'idle'); gz.classList.add(gState);
  $('gCap').textContent = view === 'dep' ? t('g_cap_dep') : t('g_cap_now');
  $('gSub').textContent = view === 'dep' && pv ? t('g_sub_dep') + ' · ' + fmtDate(pv.dateDepart) : '';
  $('gMsg').className = 'g-msg ' + gState;
  $('gMsg').textContent = st === 'idle' ? t('msg_idle', { base: baseWord() }) : !vOk ? t('msg_ko', { ny: yrs(V.anneesManquantes) }) : '';
  countTo('amount', vOk ? V.netMensuel : (st === 'idle' ? null : 0));
  countTo('dAmount', vOk ? V.netMensuel : null);
  $('dockLbl').textContent = view === 'dep' ? t('g_cap_dep') : t('dock_lbl');
  $('rateTxt').textContent = pc(V.tauxApplique) + (V.plafonne ? ' · max' : '');
  var col = COL();
  $('legend').innerHTML = r.periodes.map(function (p, i) { return '<span><i style="background:' + col[i] + '"></i>' + periodLabel(p) + '</span>'; }).join('');

  // Indicateurs
  countTo('kQ', vOk ? V.netTrimestriel : null, ' FDJ');
  countTo('kA', vOk ? V.netMensuel * 12 : null);
  $('kR').textContent = vOk && V.reference > 0 ? Math.round(V.netMensuel / V.reference * 100) + ' %' : '—';
  $('kRsub').textContent = r.base === 'salaire' ? t('kr_sal') : t('kr_ind');

  renderCountdown(r);
  renderPrevision(r, c, pv, st);
  renderChart(r, c, pv, st);
  renderDetail(r, V, view, pv, st);
  renderScenarios(c, pv, st);
  saveState();
  if (typeof ctlProgress === 'function') requestAnimationFrame(ctlProgress);

  clearTimeout(liveTimer);
  liveTimer = setTimeout(function () {
    $('live').textContent = vOk ? t('live_msg', { v: fr(V.netMensuel), r: pc(V.tauxApplique) }) : st === 'ko' ? t('live_ko', { ny: yrs(miss) }) : '';
  }, 900);
}

function renderReq(r, c, miss) {
  var req = $('req');
  var icInfo = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>';
  if (c.dureeControle === 0) { req.className = 'req idle'; req.innerHTML = icInfo + '<span>' + t('req_idle') + '</span>'; }
  else if (c.eligible) { req.className = 'req ok'; req.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg><span>' + t('req_ok', { m: r.min }) + (c.plafonne ? t('req_capped') : '') + '</span>'; }
  else {
    var when = now().getFullYear() + miss, extra = '';
    if (S.birth) {
      var depY = S.birth.getFullYear() + r.age;
      extra = '<br><span style="font-weight:500">' + t('req_when', { y: when }) + (when > depY ? ' ' + t('req_late', { y: depY }) : '') + '</span>';
    }
    req.className = 'req ko';
    req.innerHTML = icInfo + '<span>' + t('req_ko', { ny: yrs(miss), m: r.min }) + (S.reg === 'DMG' ? t('dmg_mandates') : '') + extra + '</span>';
  }
}

function summaryText(r, c, pv, st) {
  if (st === 'idle') return { main: isMobile() ? t('sum_idle_m') : t('sum_idle'), sub: '', cls: 'idle' };
  if (!pv) {
    if (S.birth && c.eligible) return { main: t('sum_reached', { v: fr(c.netMensuel) }), sub: '', cls: 'ok' };
    return { main: t('sum_reached_ko', { ny: yrs(c.anneesManquantes) }), sub: '', cls: 'ko' };
  }
  var res = pv.resultat, date = fmtDate(pv.dateDepart);
  var sub = c.eligible ? t('sum_now_ok', { v: fr(c.netMensuel) }) : t('sum_now_ko', { ny: yrs(c.anneesManquantes) });
  if (res.eligible) return { main: t('sum_prev', { date: date, v: fr(res.netMensuel) }), sub: sub, cls: 'ok' };
  return { main: t('sum_never', { date: date, ny: yrs(res.anneesManquantes) }), sub: sub, cls: 'ko' };
}
/* Carte « estimation » : montant en vedette, pastille d'état, frise Aujourd'hui → Départ */
function renderSummary(r, c, pv, st) {
  var s = summaryText(r, c, pv, st), card = $('summary');
  card.className = 'card summary ' + s.cls;
  $('sumSr').innerHTML = s.main + (s.sub ? ' ' + s.sub : '');

  var eb, amt = null, when = '', text = '', chip = null, chipCls = '';
  if (st === 'idle') { eb = t('sum_eb_idle'); text = s.main; }
  else if (!pv) {
    eb = t('sum_eb_reached');
    if (c.eligible) { amt = c.netMensuel; when = t('sum_from_now'); chip = t('chip_reached'); chipCls = 'ok'; }
    else { text = s.main; chip = t('chip_never'); chipCls = 'ko'; }
  } else if (pv.resultat.eligible) {
    eb = t('sum_eb_prev'); amt = pv.resultat.netMensuel; when = t('sum_from', { date: fmtDate(pv.dateDepart) });
    if (c.eligible) { chip = t('chip_ok'); chipCls = 'ok'; }
    else { chip = t('chip_soon', { y: pv.anneeEligibilite }); chipCls = 'warn'; }
  } else { eb = t('sum_eb_never'); text = s.main; chip = t('chip_never'); chipCls = 'ko'; }

  $('sumEyebrow').textContent = eb;
  var ch = $('sumChip'); ch.hidden = !chip; ch.textContent = chip || ''; ch.className = 'sum-chip ' + chipCls;
  var A = $('sumAmt');
  if (amt != null) {
    A.hidden = false;
    tween('sumAmt', amt, 700, function (v) { A.innerHTML = fr(Math.round(v)) + '<small>FDJ</small>'; });
  } else { A.hidden = true; if (tweens.sumAmt) cancelAnimationFrame(tweens.sumAmt.raf); tweens.sumAmt = null; }
  $('sumWhen').innerHTML = when; $('sumWhen').hidden = !when;
  $('sumMain').innerHTML = text; $('sumMain').hidden = !text;

  var sub = st === 'idle' || !pv ? '' : s.sub;
  $('sumSub').textContent = sub;
  $('sumSubRow').hidden = !sub;
  $('sumSubRow').className = 'sum-sub ' + (c.eligible ? 'ok' : 'ko');

  var J = $('sumJourney');
  if (!S.birth) { J.hidden = true; card.classList.add('nojourney'); return; }
  J.hidden = false; card.classList.remove('nojourney');
  var age = C.age(S.birth, now()), dep = C.dateDepart(cfg, S.reg, S.birth), cd = C.compteARebours(dep, now());
  var a0 = cfg.ageMinTravail, frac = Math.max(0, Math.min(1, (age - a0) / (r.age - a0)));
  $('jFill').style.width = (frac * 100) + '%';
  $('jNow').style.left = (frac * 100) + '%';
  $('jA').textContent = t('age_v', { v: age });
  $('jB').textContent = fmtDate(dep);
  $('jMid').innerHTML = cd ? t('j_in', { d: D().am(cd.annees, cd.mois) }) : t('j_done');
}

$('viewTabs').addEventListener('click', function (e) {
  var b = e.target.closest('button[data-view]'); if (!b || b.disabled) return;
  S.viewPick = b.dataset.view; update();
});

function renderCountdown(r) {
  var box = $('count');
  if (!S.birth) { box.classList.add('flat'); $('countT').textContent = t('countdown'); $('countD').textContent = t('no_birth'); $('ageTxt').textContent = ''; return; }
  $('ageTxt').textContent = t('age_v', { v: C.age(S.birth, now()) });
  var dep = C.dateDepart(cfg, S.reg, S.birth), cd = C.compteARebours(dep, now());
  if (!cd) {
    box.classList.add('flat');
    $('countT').textContent = t('reached');
    $('countD').innerHTML = t('reached_d', { date: fmtDate(dep) });
    return;
  }
  box.classList.remove('flat');
  $('countT').textContent = t('countdown');
  countTo('cY', cd.annees); countTo('cM', cd.mois); countTo('cD', cd.jours);
  $('countD').innerHTML = t('depart_at', { age: r.age, date: fmtDate(dep) });
}

/* =================================================================
   Onglet « Prévision » : carte + graphique fusionné
   ================================================================= */
function renderPrevision(r, c, pv, st) {
  var card = $('prevCard'), msg = $('prevMsg'), delta = $('prevDelta');
  $('growthLbl').textContent = r.base === 'salaire' ? t('prev_growth_sal') : t('prev_growth_ind');
  $('growthTxt').textContent = fr(S.growth * 100, 1) + ' %';
  renderEvolution(r, pv);
  card.classList.remove('idle', 'reached', 'ok');
  var reached = S.birth && !C.compteARebours(C.dateDepart(cfg, S.reg, S.birth), now());

  if (!pv) {
    card.classList.add(reached && st !== 'idle' ? 'reached' : 'idle');
    $('prevLbl').textContent = S.birth ? t('prev_lbl', { date: fmtDate(C.dateDepart(cfg, S.reg, S.birth)) }) : t('tab_prev');
    countTo('prevAmt', null);
    ['prevRate', 'prevYears', 'prevQ'].forEach(function (id) { $(id).textContent = '—'; });
    delta.textContent = '';
    msg.className = 'prev-msg info';
    msg.innerHTML = reached && st !== 'idle' ? t('prev_reached') : t('prev_idle', { base: baseWord() });
    renderTimeline(r, c.totalAnnees, 0);
    return;
  }
  card.classList.add('ok');
  var res = pv.resultat;
  $('prevLbl').textContent = t('prev_lbl', { date: fmtDate(pv.dateDepart) });
  if (res.eligible) {
    tween('prevAmt', res.netMensuel, 600, function (v) { $('prevAmt').innerHTML = fr(Math.round(v)) + '<small>' + t('per_month') + '</small>'; });
    $('prevQ').textContent = fr(res.netTrimestriel) + ' FDJ';
  } else { countTo('prevAmt', null); $('prevQ').textContent = '—'; }
  $('prevRate').textContent = pc(res.tauxApplique);
  $('prevYears').textContent = ym(res.totalAnnees);

  if (res.eligible && c.eligible && pv.gainMensuel > 0) { delta.className = 'prev-delta'; delta.textContent = t('prev_up', { v: fr(pv.gainMensuel) }); }
  else if (res.eligible && !c.eligible) { delta.className = 'prev-delta neutral'; delta.textContent = t('prev_new'); }
  else { delta.className = 'prev-delta neutral'; delta.textContent = ''; }

  if (!res.eligible) { msg.className = 'prev-msg ko'; msg.innerHTML = t('prev_never', { ny: yrs(res.anneesManquantes) }); }
  else if (!c.eligible) { msg.className = 'prev-msg ok'; msg.innerHTML = t('prev_ok_soon', { y: pv.anneeEligibilite }); }
  else if (res.plafonne) { msg.className = 'prev-msg ok'; msg.innerHTML = t('prev_cap', { c: Math.round(r.plafond * 100) }); }
  else { msg.className = 'prev-msg ok'; msg.innerHTML = t('prev_already'); }

  renderTimeline(r, c.totalAnnees, pv.anneesAjoutees);
}
function renderTimeline(r, acquis, futur) {
  var scale = Math.max(acquis + futur, r.min) * 1.08 || 1;
  $('tlNow').style.width = (acquis / scale * 100) + '%';
  $('tlFut').style.left = (acquis / scale * 100) + '%';
  $('tlFut').style.width = (futur / scale * 100) + '%';
  $('tlNow').style.borderRadius = futur > 0 ? '99px 0 0 99px' : '99px';
  $('tlMin').style.left = 'calc(' + (r.min / scale * 100) + '% - 1px)';
  $('tlNowTxt').textContent = t('tl_now', { ny: ym(acquis) });
  $('tlFutTxt').textContent = t('tl_fut', { ny: ym(futur) });
  $('tlMinTxt').textContent = t('tl_min', { m: r.min });
}
$('growth').addEventListener('input', function () { S.growth = Number(this.value) / 100; setFill(this); update(); });

/* Évolution réglementaire du salaire (RG) : interrupteur + paliers */
function evoParams(r) { return { p: Math.round(r.evolution.taux * 100), n: r.evolution.tousLesAnnees }; }
function renderEvolution(r, pv) {
  var has = !!r.evolution;
  $('hypRG').hidden = !has; $('hypGrowth').hidden = has;
  if (!has) return;
  var ev = evoParams(r), b = C.num(S.b[S.reg]);
  $('evoT').textContent = t('evo_t', ev);
  $('evoSub').textContent = t('evo_sub', { p: ev.p, n: ev.n, inc: b > 0 ? fr(Math.round(b * r.evolution.taux)) : '—' });
  var box = $('evoSteps');
  box.classList.toggle('off', !S.evo);
  if (!(b > 0)) { box.innerHTML = '<span class="evo-empty">' + t('evo_empty') + '</span>'; return; }
  var mois = pv ? pv.moisRestants : 0, per = 12 * r.evolution.tousLesAnnees;
  var n = Math.floor(mois / per), pts = [{ k: t('today_short'), v: b }];
  // aujourd'hui, 1er palier, 2e palier, …, (ellipse), départ
  var show = Math.min(n, 3);
  for (var i = 1; i <= show; i++) pts.push({ k: '+' + (i * r.evolution.tousLesAnnees) + ' ' + t('yrs_short'), v: C.baseFuture(cfg, S.reg, b, i * per, 'statut') });
  if (n > show) pts.push({ gap: true });
  if (pv) pts.push({ k: t('dep_short'), v: pv.baseProjetee, dep: true });
  box.innerHTML = pts.map(function (p) {
    if (p.gap) return '<span class="evo-gap">…</span>';
    return '<span class="evo-pt' + (p.dep ? ' dep' : '') + '"><small>' + p.k + '</small><b class="num">' + fr(Math.round(p.v)) + '</b></span>';
  }).join('<i class="evo-ar" aria-hidden="true"></i>');
  $('evoNote').innerHTML = pv && S.evo ? t('evo_note', { n: n, v: fr(Math.round(pv.baseProjetee - b)) }) : '';
}
$('evoRG').addEventListener('change', function () { S.evo = this.checked; update(); });

/* Graphique : pension année après année, d'aujourd'hui jusqu'au départ */
function renderChart(r, c, pv, st) {
  var box = $('chartBox');
  if (!pv) { box.classList.add('empty'); $('bars').innerHTML = ''; $('xlab').innerHTML = ''; $('projNote').innerHTML = ''; return; }
  box.classList.remove('empty');
  var dep = pv.anneesAjoutees, maxN = cfg.projectionAnnees;
  var xs = [];
  for (var e = 0; e <= Math.min(Math.floor(dep), maxN); e++) xs.push(e);
  if (dep <= maxN && dep !== Math.floor(dep)) xs.push(dep);
  var data = xs.map(function (e) {
    if (e === dep) return pv.resultat;
    var base = C.baseFuture(cfg, S.reg, S.b[S.reg], e * 12, growthArg());
    return compute(e, base);
  });
  var max = 1, capAt = null, okAt = null;
  data.forEach(function (d, i) {
    if (d.eligible && d.netMensuel > max) max = d.netMensuel;
    if (capAt === null && d.plafonne) capAt = xs[i];
    if (okAt === null && d.eligible) okAt = xs[i];
  });
  $('bars').innerHTML = data.map(function (d, i) {
    var e = xs[i], isDep = e === dep;
    var cls = 'bar' + (i === 0 ? ' cur' : '') + (!d.eligible ? ' na' : '') + (d.eligible && d.plafonne && i > 0 && !isDep ? ' capd' : '') + (isDep ? ' dep' : '');
    var val = d.eligible ? fr(d.netMensuel) + ' FDJ' : t('bar_na');
    var title = t('bar_title', { x: i === 0 ? t('bar_today') : isDep ? t('leg_dep') : t('bar_plus', { ny: yrs(e) }), v: val });
    var hgt = d.eligible ? Math.max(4, d.netMensuel / max * 100) : 6;
    return '<div class="' + cls + '" title="' + title + '"><div class="b-wrap"><span class="v">' + val + '</span><div class="b" style="height:' + hgt + '%"></div></div></div>';
  }).join('');
  $('xlab').innerHTML = xs.map(function (e, i) {
    var lab = i === 0 ? t('today_short') : e === dep ? t('dep_short') : '+' + e;
    var hide = xs.length > 12 && i > 0 && e !== dep && e % 2 === 1;
    return '<span class="' + (e === dep ? 'dep' : '') + '">' + (hide ? '' : lab) + '</span>';
  }).join('');
  $('bars').setAttribute('aria-label', t('chart_t'));
  var notes = [];
  if (!c.eligible && okAt !== null && okAt > 0) notes.push(t('note_elig', { ny: yrs(okAt) }));
  if (capAt !== null && capAt > 0) notes.push(t('note_capat', { c: Math.round(r.plafond * 100), ny: yrs(capAt) }));
  $('projNote').innerHTML = notes.join(' ');
}

/* =================================================================
   Onglet « Détail du calcul »
   ================================================================= */
function renderDetail(r, V, view, pv, st) {
  var has = V.reference > 0, mx = Math.max(V.reference, 1), ok = st !== 'idle' && V.eligible;
  $('detailFor').textContent = view === 'dep' && pv ? t('detail_for_dep', { date: fmtDate(pv.dateDepart) }) : t('detail_for_now');
  $('refLbl').textContent = r.base === 'salaire' ? t('ref_sal') : t('ref_ind');
  $('fRef').textContent = has ? fr(Math.round(V.reference)) + ' FDJ' : '—';
  var baseShown = view === 'dep' && pv ? pv.baseProjetee : C.num(S.b[S.reg]);
  $('fRefSub').textContent = r.base === 'salaire' ? t('ref_sal_s') : fr(baseShown) + ' pts × ' + fr(POINT, 2) + ' FDJ';
  $('fBrut').textContent = has ? fr(Math.round(V.brut)) + ' FDJ' : '—';
  $('fBrutSub').textContent = t('brut_s', { v: pc(V.tauxApplique) });
  $('fRet').textContent = !has ? '—' : V.retenue ? '− ' + fr(Math.round(V.retenue)) + ' FDJ' : '0 FDJ';
  $('fRetSub').textContent = V.retenue ? t('ret_yes') : t('ret_no');
  $('tRef').style.width = has ? '100%' : '0';
  $('tBrut').style.width = (V.brut / mx * 100) + '%';
  $('tRet').style.left = ((V.brut - V.retenue) / mx * 100) + '%';
  $('tRet').style.width = (V.retenue / mx * 100) + '%';
  $('fNet').textContent = ok ? fr(V.netMensuel) + ' FDJ' : '—';
  var col = COL();
  $('detailTable').innerHTML = '<thead><tr><th>' + t('th_period') + '</th><th>' + t('th_years') + '</th><th>' + t('th_rate') + '</th></tr></thead><tbody>' +
    r.periodes.map(function (p, i) {
      return '<tr><td><i class="dot-i" style="background:' + col[i] + '"></i>' + periodLabel(p) + '</td><td class="n">' + ym(V.parts[i].annees) + '</td><td class="n">+' + pc(V.parts[i].taux) + '</td></tr>';
    }).join('') +
    '<tr class="tot"><td>' + t('total') + '</td><td class="n">' + ym(V.totalAnnees) + '</td><td class="n">' + pc(V.taux) + (V.plafonne ? ' → ' + pc(V.tauxApplique) : '') + '</td></tr></tbody>';
}

/* =================================================================
   Onglets
   ================================================================= */
function selectTab(name, focus) {
  document.querySelectorAll('#tabs [role="tab"]').forEach(function (b) {
    var on = b.dataset.tab === name;
    b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
    $('pan-' + b.dataset.tab).hidden = !on;
    if (on && focus) b.focus();
  });
}
$('tabs').addEventListener('click', function (e) { var b = e.target.closest('[role="tab"]'); if (b) selectTab(b.dataset.tab); });
$('tabs').addEventListener('keydown', function (e) {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  var tabs = Array.prototype.slice.call(document.querySelectorAll('#tabs [role="tab"]'));
  var i = tabs.findIndex(function (b) { return b.getAttribute('aria-selected') === 'true'; });
  i = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  selectTab(tabs[i].dataset.tab, true);
});

/* =================================================================
   Onglet « Comparer »
   ================================================================= */
function saveScenarios() { store('pension-scen', JSON.stringify(scenarios)); }
function baseTxt(reg, b) { return R[reg].base === 'salaire' ? fr(b) + ' FDJ' : fr(b) + ' pts'; }

function renderScenarios(c, pv, st) {
  var max = cfg.scenariosMax;
  $('scenCount').textContent = scenarios.length;
  $('scenCount').hidden = !scenarios.length;
  $('saveScen').disabled = st === 'idle' || scenarios.length >= max;
  $('saveScen').title = scenarios.length >= max ? t('scen_full', { n: max }) : '';
  if (!scenarios.length) { $('scenList').innerHTML = '<div class="scen-empty">' + t('scen_empty') + '</div>'; return; }
  var curNet = st === 'ok' ? c.netMensuel : null, curDep = pv && pv.resultat.eligible ? pv.resultat.netMensuel : null;
  var cell = function (v) { return v != null ? fr(v) + ' FDJ' : '—'; };
  var rows = '<tr class="cur"><td><b>' + t('scen_cur') + '</b></td><td>' + S.reg + '</td><td class="n">' + ym(c.totalAnnees) + '</td><td class="n">' + baseTxt(S.reg, S.b[S.reg]) + '</td><td class="n">' + pc(c.tauxApplique) + '</td><td class="n">' + cell(curNet) + '</td><td class="n">' + cell(curDep) + '</td><td></td><td></td></tr>';
  scenarios.forEach(function (s, i) {
    var diff = '', cls = '', ref = s.dep != null ? s.dep : s.net, cur = s.dep != null ? curDep : curNet;
    if (ref != null && cur != null) { var d = ref - cur; diff = (d > 0 ? '+' : d < 0 ? '−' : '') + fr(Math.abs(d)); cls = d > 0 ? 'up' : d < 0 ? 'down' : ''; }
    rows += '<tr><td>' + t('scen_name', { l: String.fromCharCode(65 + i) }) + '</td><td>' + s.reg + '</td><td class="n">' + ym(s.total) + '</td><td class="n">' + baseTxt(s.reg, s.b) + '</td><td class="n">' + pc(s.tA) + '</td><td class="n">' + cell(s.net) + '</td><td class="n">' + cell(s.dep) + '</td><td class="n ' + cls + '">' + diff + '</td>' +
      '<td><div class="act"><button type="button" data-load="' + i + '">' + t('load') + '</button><button type="button" class="x" data-del="' + i + '" aria-label="' + t('del') + '">✕</button></div></td></tr>';
  });
  $('scenList').innerHTML = '<div class="tbl-wrap"><table class="cmp"><thead><tr><th>' + t('th_name') + '</th><th>' + t('th_reg') + '</th><th>' + t('th_years') + '</th><th>' + t('th_base') + '</th><th>' + t('th_rate') + '</th><th>' + t('th_net') + '</th><th>' + t('th_dep') + '</th><th>' + t('th_diff') + '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}
$('saveScen').addEventListener('click', function () {
  if (scenarios.length >= cfg.scenariosMax) return;
  var c = compute(0), pv = prevision();
  scenarios.push({
    reg: S.reg, y: S.y[S.reg].slice(), b: S.b[S.reg],
    birth: S.birth ? { jour: S.birth.getDate(), mois: S.birth.getMonth(), annee: S.birth.getFullYear() } : null,
    total: c.totalAnnees, tA: c.tauxApplique, net: c.eligible ? c.netMensuel : null,
    dep: pv && pv.resultat.eligible ? pv.resultat.netMensuel : null
  });
  saveScenarios(); update();
});
$('scenList').addEventListener('click', function (e) {
  var l = e.target.closest('[data-load]'), d = e.target.closest('[data-del]');
  if (d) { scenarios.splice(+d.dataset.del, 1); saveScenarios(); update(); }
  if (l) {
    var s = scenarios[+l.dataset.load];
    S.reg = s.reg; S.y[s.reg] = s.y.slice(); S.b[s.reg] = s.b;
    setBirthFields(s.birth); userEdit();
    S.mode = 'manual'; buildControls(); update();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

/* =================================================================
   Fiche imprimable
   ================================================================= */
function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }
function myTxt(o) { var v = monthYear(o); return v ? months()[v.mois] + ' ' + v.annee : '—'; }
function buildPrint() {
  var r = R[S.reg], c = compute(0), st = status(c), ok = st === 'ok';
  var pv = st === 'idle' ? null : prevision();
  var dep = S.birth ? C.dateDepart(cfg, S.reg, S.birth) : null;
  var row = function (a, b) { return '<tr><td>' + a + '</td><td class="r">' + b + '</td></tr>'; };
  var sum = summaryText(r, c, pv, st);
  var h = '<div class="ph"><img src="icons/icon.svg" alt=""><div><h1>' + t('pr_title') + '</h1><p>' + t('pr_date', { d: fmtDate(now()) }) + '</p></div></div>';
  h += '<div class="psum"><b>' + t('pr_summary') + ' :</b> ' + sum.main.replace(/<a [^>]*>|<\/a>/g, '') + (sum.sub ? ' ' + sum.sub : '') + '</div>';
  var P = pv && pv.resultat.eligible ? pv.resultat : null;
  h += '<div class="hl"><div><small>' + t('g_cap_now') + '</small><b>' + (ok ? fr(c.netMensuel) + ' FDJ' : '—') + '</b></div>' +
    '<div><small>' + t('g_cap_dep') + '</small><b>' + (P ? fr(P.netMensuel) + ' FDJ' : '—') + '</b></div>' +
    '<div><small>' + t('pr_depart') + '</small><b>' + (dep ? fmtDate(dep) : '—') + '</b></div></div>';
  h += '<h2>' + t('pr_data') + '</h2><table>' +
    row(t('pr_regime'), esc(regTxt(S.reg)[0]) + ' (' + S.reg + ')') +
    row(t('pr_birth'), S.birth ? fmtDate(S.birth) : '—') +
    row(t('pr_depart'), dep ? fmtDate(dep) + ' (' + t('age_v', { v: r.age }) + ')' : '—') +
    row(r.base === 'salaire' ? t('sal_lbl') : t('ind_lbl'), baseTxt(S.reg, S.b[S.reg])) + '</table>';
  if (S.mode === 'auto' && monthYear(S.car.start)) {
    h += '<h2>' + t('pr_career') + '</h2><table>' + row(t('car_start'), myTxt(S.car.start)) +
      row(t('car_end'), S.car.active ? t('car_active') : myTxt(S.car.end));
    S.car.gaps.forEach(function (g) { h += row(t('car_gaps'), myTxt(g.from) + ' → ' + myTxt(g.to)); });
    h += '</table>';
  }
  h += '<h2>' + t('pr_years') + '</h2><table><tr><th>' + t('th_period') + '</th><th class="r">' + t('th_years') + '</th><th class="r">' + t('th_rate') + '</th></tr>' +
    r.periodes.map(function (p, i) { return '<tr><td>' + periodLabel(p) + '</td><td class="r">' + ym(c.parts[i].annees) + '</td><td class="r">+' + pc(c.parts[i].taux) + '</td></tr>'; }).join('') +
    '<tr><td><b>' + t('total') + '</b></td><td class="r">' + ym(c.totalAnnees) + '</td><td class="r">' + pc(c.taux) + '</td></tr></table>';
  h += '<h2>' + t('pr_res') + '</h2><table>' +
    row(t('pr_status'), c.eligible ? t('pr_ok') : t('pr_ko')) +
    row(t('pr_taux_acq'), pc(c.taux)) + row(t('pr_taux_app'), pc(c.tauxApplique)) +
    row(r.base === 'salaire' ? t('ref_sal') : t('ref_ind'), fr(Math.round(c.reference)) + ' FDJ') +
    row(t('brut'), fr(Math.round(c.brut)) + ' FDJ') +
    row(t('ret'), (c.retenue ? '− ' + fr(Math.round(c.retenue)) : '0') + ' FDJ') +
    row('<b>' + t('net_m') + '</b>', ok ? fr(c.netMensuel) + ' FDJ' : '—') +
    row(t('kq'), ok ? fr(c.netTrimestriel) + ' FDJ' : '—') +
    row(t('ka'), ok ? fr(c.netMensuel * 12) + ' FDJ' : '—') + '</table>';
  if (pv) {
    var pr = pv.resultat;
    h += '<h2>' + t('pr_prev') + '</h2><table>' +
      row(t('prev_lbl', { date: fmtDate(pv.dateDepart) }), pr.eligible ? fr(pr.netMensuel) + ' FDJ' : '—') +
      row(t('prev_q'), pr.eligible ? fr(pr.netTrimestriel) + ' FDJ' : '—') +
      row(t('prev_rate'), pc(pr.tauxApplique)) +
      row(t('prev_years'), ym(pr.totalAnnees)) +
      row(t('pr_growth'), R[S.reg].evolution ? (S.evo ? t('evo_t', evoParams(R[S.reg])) : t('evo_off')) : fr(S.growth * 100, 1) + ' ' + t('per_year_short')) + '</table>';
  }
  if (scenarios.length) {
    h += '<h2>' + t('pr_scen') + '</h2><table><tr><th>' + t('th_name') + '</th><th>' + t('th_reg') + '</th><th class="r">' + t('th_years') + '</th><th class="r">' + t('th_base') + '</th><th class="r">' + t('th_net') + '</th><th class="r">' + t('th_dep') + '</th></tr>';
    scenarios.forEach(function (s, i) { h += '<tr><td>' + t('scen_name', { l: String.fromCharCode(65 + i) }) + '</td><td>' + s.reg + '</td><td class="r">' + ym(s.total) + '</td><td class="r">' + baseTxt(s.reg, s.b) + '</td><td class="r">' + (s.net != null ? fr(s.net) + ' FDJ' : '—') + '</td><td class="r">' + (s.dep != null ? fr(s.dep) + ' FDJ' : '—') + '</td></tr>'; });
    h += '</table>';
  }
  h += '<div class="legal">' + t('pr_legal') + '</div>';
  h += '<div class="foot"><span>' + t('pr_page') + ' · v' + cfg.version + '</span><span>' + now().toLocaleDateString('fr-FR') + '</span></div>';
  $('printSheet').innerHTML = h;
}
$('printBtn').addEventListener('click', function () { buildPrint(); window.print(); });
window.addEventListener('beforeprint', buildPrint);

/* =================================================================
   Bulles d'aide (zone de clic agrandie, compatibles « grands caractères »)
   ================================================================= */
var pop = $('tipPop'), tipOwner = null, tipPinned = false;
function zoom() { return parseFloat(getComputedStyle(document.body).zoom) || 1; }
function showTip(btn) {
  var key = btn.dataset.tip;
  if (key === 'salary' && R[S.reg].base !== 'salaire') key = 'indice';
  pop.textContent = t('tip_' + key);
  pop.classList.add('show');
  btn.setAttribute('aria-describedby', 'tipPop'); btn.setAttribute('aria-expanded', 'true');
  var z = zoom(), b = btn.getBoundingClientRect(), w = pop.offsetWidth * z, h = pop.offsetHeight * z;
  var left = Math.min(Math.max(8, b.left + b.width / 2 - w / 2), innerWidth - w - 8);
  var top = b.bottom + 8; if (top + h > innerHeight - 8) top = b.top - h - 8;
  pop.style.left = (left / z) + 'px'; pop.style.top = (top / z) + 'px';
  if (tipOwner && tipOwner !== btn) tipOwner.setAttribute('aria-expanded', 'false');
  tipOwner = btn;
}
function hideTip() { pop.classList.remove('show'); if (tipOwner) { tipOwner.setAttribute('aria-expanded', 'false'); tipOwner.removeAttribute('aria-describedby'); } tipOwner = null; tipPinned = false; }
document.addEventListener('mouseover', function (e) { var b = e.target.closest && e.target.closest('.tip'); if (b && !tipPinned) showTip(b); });
document.addEventListener('mouseout', function (e) { var b = e.target.closest && e.target.closest('.tip'); if (b && !tipPinned) hideTip(); });
document.addEventListener('focusin', function (e) { var b = e.target.closest && e.target.closest('.tip'); if (b) showTip(b); });
document.addEventListener('focusout', function (e) { if (e.target.closest && e.target.closest('.tip') && !tipPinned) hideTip(); });
document.addEventListener('click', function (e) {
  var b = e.target.closest('.tip');
  if (b) { e.preventDefault(); e.stopPropagation(); if (tipOwner === b && tipPinned) hideTip(); else { showTip(b); tipPinned = true; } return; }
  if (!e.target.closest('#tipPop')) hideTip();
  if (!e.target.closest('.menu-wrap')) closeMenu();
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { hideTip(); closeSheet(); if (!$('setMenu').hidden) { closeMenu(); $('setBtn').focus(); } if (!$('tour').hidden) endTour(); }
});
window.addEventListener('scroll', function () { if (!tipPinned) hideTip(); else if (tipOwner) showTip(tipOwner); }, { passive: true });

/* =================================================================
   Ligne de progression du défilement du panneau « Paramètres »
   ================================================================= */
var ctl = $('controls');
function ctlProgress() {
  var m = ctl.scrollHeight - ctl.clientHeight;
  $('ctlProg').style.width = m > 4 ? (ctl.scrollTop / m * 100) + '%' : '0';
  ctl.classList.toggle('scrollable', m > 4);
}
ctl.addEventListener('scroll', ctlProgress, { passive: true });
window.addEventListener('resize', ctlProgress);

/* =================================================================
   Feuille mobile
   ================================================================= */
function openSheet() { arrangeStepsForSheet(); document.body.classList.add('sheet-open'); }
function closeSheet() { document.body.classList.remove('sheet-open'); }
$('dockEdit').addEventListener('click', openSheet);
$('sheetClose').addEventListener('click', closeSheet);
$('scrim').addEventListener('click', closeSheet);

/* =================================================================
   Menu « Réglages » : langue, taille du texte, thème
   ================================================================= */
$('langSeg').innerHTML = L.LANGS.map(function (l) { return '<button type="button" data-lang="' + l.code + '" title="' + l.nom + '">' + l.court + '</button>'; }).join('');
function syncMenu() {
  var pressed = function (sel, attr, val) { document.querySelectorAll(sel + ' button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset[attr] === val ? 'true' : 'false'); }); };
  pressed('#langSeg', 'lang', lang);
  pressed('#sizeSeg', 'size', document.documentElement.getAttribute('data-size'));
  pressed('#themeSeg', 'th', theme());
}
function openMenu() { $('setMenu').hidden = false; $('setBtn').setAttribute('aria-expanded', 'true'); syncMenu(); hideTip(); }
function closeMenu() { $('setMenu').hidden = true; $('setBtn').setAttribute('aria-expanded', 'false'); }
$('setBtn').addEventListener('click', function (e) { e.stopPropagation(); if ($('setMenu').hidden) openMenu(); else closeMenu(); });
$('langSeg').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b || b.dataset.lang === lang) return;
  lang = b.dataset.lang; store('pension-lang', lang);
  applyLang(); readBirth(); buildControls(); update();
});
$('sizeSeg').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  document.documentElement.setAttribute('data-size', b.dataset.size); store('pension-size', b.dataset.size); syncMenu();
});
$('themeSeg').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b || b.dataset.th === theme()) return;
  document.documentElement.setAttribute('data-theme', b.dataset.th); store('pension-theme', b.dataset.th); syncMenu();
  buildControls(); tweens.gauge = null; update();
});
$('tourBtn').addEventListener('click', function () { closeMenu(); startTour(); });

/* =================================================================
   Visite guidée (3 étapes)
   ================================================================= */
var tourI = 0, tourSteps = [];
function buildTour() {
  var m = isMobile();
  return [
    { el: m ? $('summary') : $('step1'), t: 'tour_1_t', p: m ? 'tour_2m' : 'tour_1' },
    { el: m ? $('dock') : $('step3'), t: 'tour_2_t', p: m ? 'tour_2m' : 'tour_2' },
    { el: $('gaugeZone'), t: 'tour_3_t', p: 'tour_3' }
  ].filter(function (s, i) { return !(m && i === 0); });
}
function placeTour() {
  var s = tourSteps[tourI]; if (!s) return;
  var z = zoom(), r = s.el.getBoundingClientRect(), pad = 8;
  var spot = $('tourSpot'), bub = $('tourBub');
  spot.style.left = (r.left - pad) / z + 'px'; spot.style.top = (r.top - pad) / z + 'px';
  spot.style.width = (r.width + pad * 2) / z + 'px'; spot.style.height = (r.height + pad * 2) / z + 'px';
  var bw = bub.offsetWidth * z, bh = bub.offsetHeight * z;
  var top = r.bottom + 16; if (top + bh > innerHeight - 12) top = Math.max(12, r.top - bh - 16);
  if (top + bh > innerHeight - 12) top = Math.max(12, innerHeight - bh - 12);
  var left = Math.min(Math.max(12, r.left), innerWidth - bw - 12);
  bub.style.left = left / z + 'px'; bub.style.top = top / z + 'px';
}
function showTourStep() {
  var s = tourSteps[tourI];
  $('tourStep').textContent = (tourI + 1) + ' / ' + tourSteps.length;
  $('tourT').textContent = t(s.t); $('tourP').textContent = t(s.p);
  $('tourNext').textContent = tourI === tourSteps.length - 1 ? t('tour_done') : t('tour_next');
  s.el.scrollIntoView({ block: 'center', behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
  setTimeout(placeTour, 60);
  $('tourNext').focus();
}
function startTour() { closeSheet(); tourSteps = buildTour(); tourI = 0; $('tour').hidden = false; showTourStep(); }
function endTour() { $('tour').hidden = true; store('pension-tour', '1'); }
$('tourNext').addEventListener('click', function () { if (tourI >= tourSteps.length - 1) { endTour(); return; } tourI++; showTourStep(); });
$('tourSkip').addEventListener('click', endTour);
window.addEventListener('resize', function () { if (!$('tour').hidden) placeTour(); });
window.addEventListener('scroll', function () { if (!$('tour').hidden) placeTour(); }, { passive: true });

/* =================================================================
   Application installable (PWA)
   ================================================================= */
var installEvt = null;
window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvt = e; $('installBtn').hidden = false; });
$('installBtn').addEventListener('click', function () {
  if (!installEvt) return;
  installEvt.prompt();
  installEvt.userChoice.then(function () { installEvt = null; $('installBtn').hidden = true; });
});
window.addEventListener('appinstalled', function () { $('installBtn').hidden = true; });
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
}

/* =================================================================
   Démarrage
   ================================================================= */
$('lawsLink').href = cfg.contact.textesLoi;
applyLang();
var saved = null;
try { saved = JSON.parse(store('pension-state') || 'null'); } catch (e) { saved = null; }
var restored = hasData(saved);
if (restored) applyState(saved);
setFill($('growth'));
buildControls();
renderGaps();
update();

var seen = false; try { seen = sessionStorage.getItem('pension-intro') === '1'; } catch (e) {}
var noIntro = /[?&]nointro/.test(location.search);
function closeIntro() { $('intro').classList.remove('show'); try { sessionStorage.setItem('pension-intro', '1'); } catch (e) {} }
function maybeTour() { if (store('pension-tour') !== '1' && !noIntro) setTimeout(startTour, 350); }
if (restored && !noIntro) {
  toast(t('restored'), t('restart'), function () { clearAll(); focusStart(); });
} else if (!seen && !noIntro) {
  $('intro').classList.add('show'); setTimeout(function () { $('introGo').focus(); }, 50);
}
$('introGo').addEventListener('click', function () { closeIntro(); clearAll(); maybeTour(); if (store('pension-tour') === '1') focusStart(); });
$('introEx').addEventListener('click', function () { closeIntro(); loadExample(); maybeTour(); });

/* Point d'accès pour les tests visuels (sans effet en usage normal) */
/* =================================================================
   Sélecteur de mois personnalisé (remplace la liste native du navigateur)
   La <select> reste la source de vérité : on change sa valeur puis on
   déclenche « change », le reste du code ne voit aucune différence.
   ================================================================= */
var mp = document.createElement('div'), mpSel = null;
mp.id = 'monthPop'; mp.hidden = true; mp.setAttribute('role', 'dialog');
document.body.appendChild(mp);
function mpLabel(sel) {
  var l = sel.id && document.querySelector('label[for="' + sel.id + '"]');
  var row = sel.closest('.gap > div'), lb = row && row.querySelector('.fld-lbl');
  return (l && l.textContent) || (lb ? t('month') + ' · ' + lb.textContent : sel.getAttribute('aria-label') || t('month'));
}
function openMonths(sel) {
  if (mpSel === sel && !mp.hidden) { closeMonths(true); return; }
  hideTip();
  mpSel = sel; sel.classList.add('open'); sel.setAttribute('aria-expanded', 'true');
  var cur = sel.value, now_ = new Date();
  mp.setAttribute('aria-label', mpLabel(sel));
  mp.innerHTML =
    '<div class="mp-h"><span class="mp-t">' + mpLabel(sel) + '</span>' +
    (cur !== '' ? '<button type="button" class="mp-clear" data-v="">' + t('month_clear') + '</button>' : '') + '</div>' +
    '<div class="mp-grid" role="listbox" aria-label="' + mpLabel(sel) + '">' +
    months().map(function (m, i) {
      var on = String(i) === cur;
      return '<button type="button" role="option" class="mp-m' + (on ? ' on' : '') + (i === now_.getMonth() ? ' today' : '') +
        '" data-v="' + i + '" aria-selected="' + on + '" tabindex="-1"><small>' + (i < 9 ? '0' : '') + (i + 1) + '</small><span>' + m + '</span></button>';
    }).join('') + '</div>';
  mp.hidden = false;
  // Positionnement sous le champ (au-dessus s'il n'y a pas la place), compatible « grands caractères »
  var z = zoom(), b = sel.getBoundingClientRect(), w = mp.offsetWidth * z, h = mp.offsetHeight * z;
  var left = Math.min(Math.max(8, b.left), innerWidth - w - 8);
  var top = b.bottom + 8, up = false;
  if (top + h > innerHeight - 8 && b.top - h - 8 > 8) { top = b.top - h - 8; up = true; }
  mp.classList.toggle('up', up);
  mp.style.left = (left / z) + 'px'; mp.style.top = (Math.max(8, top) / z) + 'px';
  requestAnimationFrame(function () { mp.classList.add('show'); });
  var f = mp.querySelector('.mp-m.on') || mp.querySelector('.mp-m');
  f.tabIndex = 0; f.focus({ preventScroll: true });
}
function closeMonths(refocus) {
  if (!mpSel) return;
  var s = mpSel; mpSel = null;
  mp.classList.remove('show'); mp.hidden = true;
  s.classList.remove('open'); s.setAttribute('aria-expanded', 'false');
  if (refocus) s.focus({ preventScroll: true });
}
function pickMonth(v) {
  var s = mpSel; closeMonths(true);
  // comme une liste native : « input » puis « change »
  if (s && s.value !== v) { s.value = v; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); }
}
function isMonthSel(el) { return el && el.tagName === 'SELECT' && el.classList.contains('mpick'); }
['mousedown', 'touchstart'].forEach(function (type) {
  document.addEventListener(type, function (e) {
    if (isMonthSel(e.target)) { e.preventDefault(); if (type === 'mousedown' || e.cancelable) { e.target.focus({ preventScroll: true }); openMonths(e.target); } return; }
    if (mpSel && !e.target.closest('#monthPop')) closeMonths(false);
  }, { capture: true, passive: false });
});
document.addEventListener('keydown', function (e) {
  if (!isMonthSel(e.target)) return;
  if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'F4') { e.preventDefault(); openMonths(e.target); }
});
mp.addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (b) pickMonth(b.dataset.v); });
mp.addEventListener('keydown', function (e) {
  var items = [].slice.call(mp.querySelectorAll('.mp-m')), i = items.indexOf(document.activeElement), n = i;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMonths(true); return; }
  if (e.key === 'Tab') { closeMonths(true); return; }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.v != null) { e.preventDefault(); pickMonth(e.target.dataset.v); return; }
  if (i < 0) return;
  if (e.key === 'ArrowRight') n = i + 1; else if (e.key === 'ArrowLeft') n = i - 1;
  else if (e.key === 'ArrowDown') n = i + 3; else if (e.key === 'ArrowUp') n = i - 3;
  else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = 11;
  else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); pickMonth(''); return; }
  else return;
  e.preventDefault();
  n = (n + 12) % 12;
  items[i].tabIndex = -1; items[n].tabIndex = 0; items[n].focus();
});
window.addEventListener('resize', function () { closeMonths(false); });
$('controls').addEventListener('scroll', function () { closeMonths(false); }, { passive: true });

window.PENSION_APP = { S: S, loadExample: loadExample, setMode: setMode, update: update, buildControls: buildControls, openSheet: openSheet, buildPrint: buildPrint, setBirthFields: setBirthFields, renderGaps: renderGaps, startTour: startTour, selectTab: selectTab, clearWithUndo: clearWithUndo };
})();
