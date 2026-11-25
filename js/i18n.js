/* =====================================================================
   TRADUCTIONS – français (référence) et anglais
   ---------------------------------------------------------------------
   Toute clé absente de l'anglais s'affiche en français.
   Variables : {v}, {n}, {ny}, {date}… sont remplacées à l'affichage ;
   {seuil}, {ret}, {imax}, {pt}, {ptn}, {ptd}, {agemin}, {laws}
   viennent automatiquement de js/config.js.
   ===================================================================== */
(function (root) {
  'use strict';

  var LANGS = [
    { code: 'fr', nom: 'Français', court: 'FR' },
    { code: 'en', nom: 'English', court: 'EN' }
  ];

  var MOIS = {
    fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  };

  /* Durées : « 3 ans », « 16 ans 11 mois » */
  var DUREE = {
    fr: {
      ans: function (n, s) { return s + ' an' + (Math.abs(n) >= 2 ? 's' : ''); },
      am: function (a, m) { return (a ? a + ' an' + (a >= 2 ? 's' : '') : '') + (a && m ? ' ' : '') + (m ? m + ' mois' : '') || '0 an'; }
    },
    en: {
      ans: function (n, s) { return s + ' year' + (Math.abs(n) === 1 ? '' : 's'); },
      am: function (a, m) { return (a ? a + ' yr' + (a === 1 ? '' : 's') : '') + (a && m ? ' ' : '') + (m ? m + ' mo' : '') || '0 yrs'; }
    }
  };

  var REGIMES = {
    fr: { RG: ['Régime Général', 'Conventionnés du secteur public, privé ou semi-privé'], FCT: ['Fonctionnaires', 'Agents titulaires de la fonction publique'], FNP: ['Force Nationale de Police', 'Personnels de la Police nationale'], DMG: ['Députés & membres du Gouvernement', "Élus de l'Assemblée nationale et ministres"] },
    en: { RG: ['General Scheme', 'Contract staff in the public, private or semi-private sector'], FCT: ['Civil Servants', 'Tenured civil service employees'], FNP: ['National Police Force', 'National Police personnel'], DMG: ['MPs & Government members', 'Members of the National Assembly and ministers'] }
  };

  var INFO_REGIME = {
    fr: '<b>{n}</b> — {w}. Départ à <b>{a} ans</b>, minimum <b>{m} ans</b> de cotisation.',
    en: '<b>{n}</b> — {w}. Retirement at <b>{a}</b>, minimum <b>{m} years</b> of contributions.'
  };

  var STR = {};

  /* ------------------------------------------------------------------ */
  STR.fr = {
    app_title: 'Simulateur de pension', app_sub: 'République de Djibouti', live: 'Calcul en temps réel',
    laws: 'Textes de loi', print: 'Fiche PDF', install: "Installer l'application",
    settings: 'Réglages', set_lang: 'Langue', set_size: 'Taille du texte', size_md: 'Normale', size_lg: 'Grande',
    set_theme: 'Thème', th_light: 'Clair', th_dark: 'Sombre', set_tour: 'Revoir la visite guidée',

    params: 'Paramètres', step1: 'Régime et naissance', step2: 'Revenu', step3: 'Années cotisées',
    birth: 'Date de naissance', day: 'Jour', month: 'Mois', year: 'Année', month_ph: 'Mois…', month_clear: 'Effacer', day_ph: 'JJ', year_ph: 'AAAA',
    years_title: 'Années cotisées', pay_sal: 'Rémunération', pay_ind: 'Indice de solde',
    sal_lbl: 'Salaire brut moyen', sal_hint: 'Moyenne mensuelle des 10 dernières années',
    ind_lbl: 'Indice des 2 dernières années', ind_hint: 'Maximum {imax} points',
    per_month: 'FDJ / mois', point_val: '1 pt = {v} FDJ', reset_ex: 'Voir un exemple', clear: 'Tout effacer',
    warn_sal_low: "Ce salaire semble très bas : vérifiez qu'il s'agit bien du salaire mensuel brut, en FDJ.",
    warn_sal_high: 'Ce salaire semble très élevé : vérifiez le montant saisi.',
    warn_ind_low: 'Cet indice semble très bas : vérifiez votre bulletin de solde.',
    example_banner: 'Mode exemple : ces valeurs sont fictives, ce ne sont pas les vôtres.', example_cta: 'Saisir mes informations',

    mode_manual: 'Par période', mode_auto: 'Depuis ma carrière',
    car_hint: 'Indiquez vos dates : les années sont comptées au mois près et réparties automatiquement entre les périodes.',
    car_start: 'Début de carrière', car_end: 'Fin de carrière', car_active: 'Je travaille toujours',
    car_gaps: 'Interruptions (chômage, études, disponibilité…)', car_add_gap: '+ Ajouter une interruption',
    car_from: 'Du', car_to: 'Au', car_del: "Supprimer l'interruption",
    car_need_birth: "Renseignez d'abord votre date de naissance.", car_need_start: "Indiquez le mois et l'année de début de carrière.",
    car_total: 'Total : {d} validés', auto_locked: 'Calculé depuis votre carrière',
    w_debut_trop_tot: 'Début avant vos {agemin} ans : la carrière est comptée à partir de vos {agemin} ans.',
    w_fin_apres_depart: "La carrière est comptée jusqu'à l'âge légal de départ.",
    w_fin_future: 'La fin de carrière ne peut pas être dans le futur.',
    w_fin_avant_debut: 'La fin de carrière est avant le début.',
    w_interruption_inversee: "Une interruption a des dates inversées : elles ont été remises dans l'ordre.",

    sum_idle: 'Renseignez vos informations pour obtenir votre estimation.',
    sum_idle_m: 'Appuyez sur « Modifier » en bas de l’écran pour saisir vos informations.',
    sum_prev: 'Si vous continuez à cotiser jusqu’à votre départ le <b>{date}</b>, vous toucherez environ <b>{v} FDJ par mois</b>.',
    sum_now_ok: 'Vos droits acquis à ce jour représentent {v} FDJ par mois.',
    sum_now_ko: "Aujourd'hui, la durée minimale n'est pas encore atteinte (il manque {ny}).",
    sum_reached: "Vous avez atteint l'âge légal de départ : vous pouvez toucher environ <b>{v} FDJ par mois</b>.",
    sum_reached_ko: "Vous avez atteint l'âge légal, mais il manque <b>{ny}</b> de cotisation pour une pension normale. Renseignez-vous auprès de votre caisse de retraite.",
    sum_never: 'Même en cotisant jusqu’à votre départ le <b>{date}</b>, il vous manquerait <b>{ny}</b> de cotisation. Renseignez-vous auprès de votre caisse de retraite pour étudier vos options.',
    sum_eb_idle: 'Votre estimation', sum_eb_prev: 'Si vous continuez à cotiser', sum_eb_reached: 'Âge légal atteint', sum_eb_never: 'Projection à votre départ',
    sum_from: 'par mois, à partir du <b>{date}</b>', sum_from_now: 'par mois, dès maintenant',
    chip_ok: 'Éligible aujourd’hui', chip_soon: 'Minimum atteint en {y}', chip_never: 'Durée insuffisante', chip_reached: 'Départ possible',
    j_today: "Aujourd'hui", j_dep: 'Départ', j_in: 'Encore <b>{d}</b> de cotisation avant le départ', j_done: 'Âge légal atteint',

    view_now: "Aujourd'hui", view_dep: 'À mon départ',
    g_cap_now: 'Droits acquis aujourd’hui', g_cap_dep: 'Prévue à votre départ', g_sub_dep: 'si vous continuez à cotiser',
    gauge_title: 'Pension mensuelle nette', cap_tag: 'Plafond {v} %', rate: 'Taux', max: 'MAX',
    msg_idle: 'Complétez votre date de naissance, votre {base} et vos années pour lancer le calcul.',
    base_sal: 'salaire', base_ind: 'indice',
    msg_ko: 'Il vous manque {ny} de cotisation.',
    countdown: 'Compte à rebours retraite', years_u: 'Années', months_u: 'Mois', days_u: 'Jours',
    depart_at: 'Départ à <b>{age} ans</b>, le <b>{date}</b>',
    reached: 'Âge légal atteint', reached_d: 'Départ possible depuis le <b>{date}</b>.',
    no_birth: 'Renseignez votre date de naissance pour connaître votre date de départ.',
    kq: 'Pension trimestrielle nette', kq_s: 'versée chaque trimestre', ka: 'Pension annuelle', ka_s: 'FDJ nets',
    kr: 'Taux de remplacement', kr_sal: 'du salaire de référence', kr_ind: 'du traitement indiciaire',

    tab_prev: 'Prévision', tab_detail: 'Détail du calcul', tab_cmp: 'Comparer',
    prev_lbl: 'Pension nette prévue au {date}', prev_up: "+{v} FDJ / mois par rapport à aujourd'hui",
    prev_new: "Alors qu'aujourd'hui la durée minimale n'est pas encore atteinte",
    prev_rate: 'Taux prévu', prev_years: 'Années au départ', prev_q: 'Trimestrielle prévue',
    tl_now: 'Acquis : {ny}', tl_fut: "D'ici le départ : +{ny}", tl_min: 'Minimum : {m} ans',
    prev_growth_sal: 'Évolution du salaire par an', prev_growth_ind: "Évolution de l'indice par an",
    prev_growth_hint: "Hypothèse : vous cotisez sans interruption jusqu'à l'âge légal, avec cette évolution de revenu.",
    prev_ok_soon: 'Vous remplirez la durée minimale en <b>{y}</b>, avant votre départ.',
    prev_never: 'Même en cotisant jusqu\'à votre départ, il vous manquera <b>{ny}</b>. Renseignez-vous auprès de votre caisse de retraite pour étudier vos options.',
    prev_already: 'Vous remplissez déjà la durée minimale : chaque année de plus augmente votre taux.',
    prev_cap: 'Votre taux atteindra le plafond de <b>{c} %</b> avant votre départ.',
    prev_idle: 'Complétez votre date de naissance, votre {base} et vos années pour voir la prévision.',
    prev_reached: "Vous avez atteint l'âge légal de départ : votre pension est calculée à ce jour.",
    chart_t: 'Votre pension année après année jusqu’au départ',
    note_capat: 'Plafond de {c} % atteint après <b>+{ny}</b>.', note_elig: 'Vous devenez éligible après <b>+{ny}</b>.',
    leg_cur: "Aujourd'hui", leg_more: 'Années à venir', leg_dep: 'Votre départ', leg_cap: 'Plafond atteint', leg_na: 'Durée insuffisante',
    today_short: 'Auj.', dep_short: 'Départ',
    yrs_short: 'ans',
    evo_t: 'Augmentation de {p} % tous les {n} ans',
    evo_sub: "Calculée sur le salaire brut de base, sans cumul : +{inc} FDJ à chaque palier.",
    evo_empty: 'Saisissez votre salaire pour voir son évolution.',
    evo_note: "Jusqu'au départ : <b>{n}</b> augmentation(s), soit <b>+{v} FDJ</b> par mois. Hypothèse : vous cotisez sans interruption jusqu'à l'âge légal.",
    evo_off: 'Aucune (salaire constant)',
    bar_title: '{x} : {v}', bar_na: 'durée insuffisante', bar_today: "Aujourd'hui", bar_plus: '+{ny} de cotisation',

    detail_for_now: "Calcul de vos droits acquis aujourd'hui", detail_for_dep: 'Calcul prévu à votre départ ({date})',
    ref_sal: 'Salaire de référence', ref_ind: 'Traitement indiciaire',
    ref_sal_s: 'Moyenne mensuelle brute', brut: 'Pension brute', brut_s: 'Référence × taux de {v}',
    ret: 'Retenue {ret} %', ret_yes: 'Appliquée : pension brute > {seuil} FDJ ou taux plafonné', ret_no: 'Non appliquée : pension brute ≤ {seuil} FDJ',
    net_m: 'Net mensuel', th_period: 'Période', th_years: 'Années', th_rate: 'Taux', total: 'Total',

    scen_save: 'Enregistrer ce scénario',
    scen_help: 'Enregistrez la simulation, changez un paramètre (régime, salaire, années…) puis enregistrez à nouveau pour comparer.',
    scen_empty: "Aucun scénario enregistré pour l'instant.", scen_name: 'Scénario {l}', scen_cur: 'Simulation en cours',
    th_name: 'Scénario', th_reg: 'Régime', th_base: 'Base', th_net: 'Net / mois', th_dep: 'Au départ', th_diff: 'Écart',
    load: 'Charger', del: 'Supprimer', scen_full: 'Maximum {n} scénarios : supprimez-en un pour continuer.',

    req_idle: 'Indiquez vos années de cotisation sur chaque période.',
    req_ok: 'Durée minimale de {m} ans atteinte', req_capped: ' · taux plafonné',
    req_ko: 'Encore {ny} pour atteindre le minimum de {m} ans', dmg_mandates: ' (2 mandats)',
    req_when: "En continuant à cotiser, vous l'atteindrez en <b>{y}</b>.",
    req_late: "C'est après votre âge légal de départ ({y}). Renseignez-vous auprès de votre caisse de retraite pour étudier vos options.",
    per_year: '{v} % par an', tier: '3 %/an (15 premières) puis 2 %', quarter_note: ' · arrondi au trimestre',
    lim_age: 'Maximum {n} ans selon votre âge', lim_none: 'Aucune année possible selon votre âge',
    ans: 'ans', total_years: '{v} au total', age_v: '{v} ans', today: "aujourd'hui", help: 'Aide',
    err_invalide: "Cette date n'existe pas.", err_future: 'La date ne peut pas être dans le futur.',
    err_jeune: 'Vous devez avoir au moins {agemin} ans.', err_ancienne: "Vérifiez l'année de naissance.",

    dock_lbl: 'Pension nette / mois', dock_edit: 'Modifier', sheet_close: 'Voir le résultat',
    undo_msg: 'Simulation effacée.', undo: 'Annuler', restored: 'Votre simulation précédente a été restaurée.', restart: 'Recommencer',
    tour_1_t: '1. Votre profil', tour_1: 'Choisissez votre régime et indiquez votre date de naissance.',
    tour_2_t: '2. Revenu et carrière', tour_2: 'Indiquez votre salaire (ou indice) puis vos années de cotisation — ou laissez le simulateur les calculer depuis votre carrière.',
    tour_2m: 'Appuyez sur « Modifier » pour saisir votre régime, votre revenu et vos années.',
    tour_3_t: '3. Votre résultat', tour_3: "Votre pension s'affiche ici en temps réel. Basculez entre « Aujourd'hui » et « À mon départ ».",
    tour_next: 'Suivant', tour_skip: 'Passer', tour_done: "C'est parti !",

    intro_badge: 'Simulation indicative', intro_t: 'Pilotez votre future retraite',
    intro_p: 'Renseignez vos informations : votre pension, votre date de départ et la prévision se mettent à jour instantanément.<br><br>Les résultats reposent sur vos déclarations et sur la législation actuelle en République de Djibouti ; ils n\'ont qu\'une <b>valeur indicative</b>.',
    disclaimer: 'Simulation <strong>purement indicative</strong>, établie sur la base de vos déclarations et de la législation en vigueur en République de Djibouti à la date du jour. Consulter les <a href="{laws}" target="_blank" rel="noopener">textes législatifs</a>.',
    live_msg: 'Pension estimée : {v} FDJ par mois, taux {r}.', live_ko: 'Durée de cotisation insuffisante : il manque {ny}.',

    tip_rate: 'Pourcentage appliqué à votre revenu de référence. Il dépend des années cotisées sur chaque période et ne peut pas dépasser le plafond du régime (81 %, ou 75 % pour les DMG).',
    tip_salary: "Moyenne de vos salaires bruts mensuels sur les 10 dernières années d'activité.",
    tip_indice: 'Nombre de points de votre indice de solde (bulletin de solde des 2 dernières années). Chaque point vaut {ptn} / {ptd} ≈ {pt} FDJ par mois.',
    tip_ret: 'Une retenue de {ret} % est prélevée si la pension brute dépasse {seuil} FDJ par mois, ou si votre taux est plafonné.',
    tip_repl: 'Part de votre revenu de référence que représente votre pension nette.',
    tip_min: 'Durée minimale pour avoir droit à une pension normale : 25 ans de cotisation (10 ans, soit 2 mandats, pour les DMG). Pour FCT et FNP, les décimales sont arrondies au trimestre : ,2–,4 → ,25 · ,5–,7 → ,5 · ,8–,9 → ,75.',
    tip_auto: 'Le simulateur compte vos mois de travail sur chaque période de la loi, en retirant les interruptions. Pour le RG et les DMG, seules les années entières sont retenues.',
    tip_prev: "Estimation de votre pension si vous continuez à cotiser sans interruption jusqu'à l'âge légal de départ. Les années ajoutées comptent sur la période en cours ; le revenu évolue selon l'hypothèse choisie.",
    tip_view: "« Aujourd'hui » : vos droits acquis à ce jour. « À mon départ » : la pension prévue si vous continuez à cotiser jusqu'à l'âge légal.",

    pr_title: 'Fiche de simulation de pension', pr_date: 'Simulation réalisée le {d}', pr_data: 'Vos données', pr_res: "Résultats (droits acquis aujourd'hui)",
    pr_regime: 'Régime', pr_birth: 'Date de naissance', pr_depart: 'Date de départ prévue', pr_taux_acq: 'Taux acquis',
    pr_taux_app: 'Taux appliqué', pr_years: 'Années cotisées', pr_scen: 'Scénarios comparés', pr_status: 'Situation',
    pr_ok: 'Durée minimale atteinte', pr_ko: 'Durée minimale non atteinte', pr_career: 'Carrière déclarée',
    pr_prev: "Prévision à l'âge de départ", pr_growth: "Hypothèse d'évolution du revenu", pr_summary: 'En résumé',
    pr_legal: 'Cette simulation est purement indicative. Elle est établie sur la base des informations déclarées et de la législation en vigueur à la date de la simulation. Elle ne constitue pas un droit.',
    pr_page: 'Simulateur de pension · Djibouti', per_year_short: '% / an'
  };

  /* ------------------------------------------------------------------ */
  STR.en = {
    app_title: 'Pension Simulator', app_sub: 'Republic of Djibouti', live: 'Real-time calculation',
    laws: 'Legal texts', print: 'PDF summary', install: 'Install the app',
    settings: 'Settings', set_lang: 'Language', set_size: 'Text size', size_md: 'Normal', size_lg: 'Large',
    set_theme: 'Theme', th_light: 'Light', th_dark: 'Dark', set_tour: 'Replay the guided tour',

    params: 'Your details', step1: 'Scheme and birth date', step2: 'Income', step3: 'Contribution years',
    birth: 'Date of birth', day: 'Day', month: 'Month', year: 'Year', month_ph: 'Month…', month_clear: 'Clear', day_ph: 'DD', year_ph: 'YYYY',
    years_title: 'Contribution years', pay_sal: 'Salary', pay_ind: 'Salary index',
    sal_lbl: 'Average gross salary', sal_hint: 'Monthly average over the last 10 years',
    ind_lbl: 'Index over the last 2 years', ind_hint: 'Maximum {imax} points',
    per_month: 'FDJ / month', point_val: '1 pt = {v} FDJ', reset_ex: 'See an example', clear: 'Clear all',
    warn_sal_low: 'This salary looks very low: make sure it is the gross monthly salary, in FDJ.',
    warn_sal_high: 'This salary looks very high: please check the amount.',
    warn_ind_low: 'This index looks very low: please check your pay slip.',
    example_banner: 'Example mode: these values are fictitious, they are not yours.', example_cta: 'Enter my details',

    mode_manual: 'By period', mode_auto: 'From my career',
    car_hint: 'Enter your dates: years are counted to the month and split automatically across the periods.',
    car_start: 'Career start', car_end: 'Career end', car_active: 'I am still working',
    car_gaps: 'Breaks (unemployment, studies, leave…)', car_add_gap: '+ Add a break',
    car_from: 'From', car_to: 'To', car_del: 'Remove this break',
    car_need_birth: 'Please enter your date of birth first.', car_need_start: 'Enter the month and year your career started.',
    car_total: 'Total: {d} counted', auto_locked: 'Calculated from your career',
    w_debut_trop_tot: 'Start before age {agemin}: the career is counted from your {agemin}th birthday.',
    w_fin_apres_depart: 'The career is counted up to the legal retirement age.',
    w_fin_future: 'The career end cannot be in the future.',
    w_fin_avant_debut: 'The career end is before its start.',
    w_interruption_inversee: 'A break had its dates reversed: they have been put back in order.',

    sum_idle: 'Enter your details to get your estimate.',
    sum_idle_m: 'Tap “Edit” at the bottom of the screen to enter your details.',
    sum_prev: 'If you keep contributing until you retire on <b>{date}</b>, you will receive about <b>{v} FDJ per month</b>.',
    sum_now_ok: 'Your entitlements to date amount to {v} FDJ per month.',
    sum_now_ko: 'Today, the minimum contribution period is not reached yet ({ny} missing).',
    sum_reached: 'You have reached the legal retirement age: you can receive about <b>{v} FDJ per month</b>.',
    sum_reached_ko: 'You have reached the legal age, but <b>{ny}</b> of contributions are missing for a normal pension. Please check with your pension fund.',
    sum_never: 'Even if you contribute until you retire on <b>{date}</b>, <b>{ny}</b> of contributions would be missing. Check with your pension fund to review your options.',
    sum_eb_idle: 'Your estimate', sum_eb_prev: 'If you keep contributing', sum_eb_reached: 'Legal age reached', sum_eb_never: 'Forecast at retirement',
    sum_from: 'per month, from <b>{date}</b>', sum_from_now: 'per month, from now on',
    chip_ok: 'Eligible today', chip_soon: 'Minimum reached in {y}', chip_never: 'Not enough years', chip_reached: 'Can retire now',
    j_today: 'Today', j_dep: 'Retirement', j_in: '<b>{d}</b> of contributions left before retirement', j_done: 'Legal age reached',

    view_now: 'Today', view_dep: 'At retirement',
    g_cap_now: 'Entitlements to date', g_cap_dep: 'Expected at retirement', g_sub_dep: 'if you keep contributing',
    gauge_title: 'Net monthly pension', cap_tag: 'Cap {v} %', rate: 'Rate', max: 'MAX',
    msg_idle: 'Enter your date of birth, your {base} and your years to start the calculation.',
    base_sal: 'salary', base_ind: 'index',
    msg_ko: '{ny} of contributions missing.',
    countdown: 'Retirement countdown', years_u: 'Years', months_u: 'Months', days_u: 'Days',
    depart_at: 'Retirement at <b>{age}</b>, on <b>{date}</b>',
    reached: 'Legal age reached', reached_d: 'Retirement possible since <b>{date}</b>.',
    no_birth: 'Enter your date of birth to know your retirement date.',
    kq: 'Net quarterly pension', kq_s: 'paid every quarter', ka: 'Annual pension', ka_s: 'net FDJ',
    kr: 'Replacement rate', kr_sal: 'of the reference salary', kr_ind: 'of the index-based pay',

    tab_prev: 'Forecast', tab_detail: 'Calculation details', tab_cmp: 'Compare',
    prev_lbl: 'Expected net pension on {date}', prev_up: '+{v} FDJ / month compared with today',
    prev_new: 'While today the minimum period is not reached yet',
    prev_rate: 'Expected rate', prev_years: 'Years at retirement', prev_q: 'Expected quarterly',
    tl_now: 'Acquired: {ny}', tl_fut: 'Until retirement: +{ny}', tl_min: 'Minimum: {m} years',
    prev_growth_sal: 'Salary growth per year', prev_growth_ind: 'Index growth per year',
    prev_growth_hint: 'Assumption: you contribute without interruption until the legal age, with this income growth.',
    prev_ok_soon: 'You will reach the minimum period in <b>{y}</b>, before you retire.',
    prev_never: 'Even contributing until you retire, <b>{ny}</b> will be missing. Check with your pension fund to review your options.',
    prev_already: 'You already meet the minimum period: each extra year increases your rate.',
    prev_cap: 'Your rate will reach the <b>{c} %</b> cap before you retire.',
    prev_idle: 'Enter your date of birth, your {base} and your years to see the forecast.',
    prev_reached: 'You have reached the legal retirement age: your pension is calculated as of today.',
    chart_t: 'Your pension year by year until retirement',
    note_capat: '{c} % cap reached after <b>+{ny}</b>.', note_elig: 'You become eligible after <b>+{ny}</b>.',
    leg_cur: 'Today', leg_more: 'Coming years', leg_dep: 'Your retirement', leg_cap: 'Cap reached', leg_na: 'Not enough years',
    today_short: 'Now', dep_short: 'Retire',
    yrs_short: 'yrs',
    evo_t: '{p}% raise every {n} years',
    evo_sub: 'Based on the basic gross salary, not compounded: +{inc} FDJ at each step.',
    evo_empty: 'Enter your salary to see how it evolves.',
    evo_note: 'Until retirement: <b>{n}</b> raise(s), i.e. <b>+{v} FDJ</b> per month. Assumption: you contribute without interruption until the legal age.',
    evo_off: 'None (constant salary)',
    bar_title: '{x}: {v}', bar_na: 'not enough years', bar_today: 'Today', bar_plus: '+{ny} of contributions',

    detail_for_now: 'Calculation of your entitlements to date', detail_for_dep: 'Expected calculation at retirement ({date})',
    ref_sal: 'Reference salary', ref_ind: 'Index-based pay',
    ref_sal_s: 'Gross monthly average', brut: 'Gross pension', brut_s: 'Reference × rate of {v}',
    ret: '{ret} % deduction', ret_yes: 'Applied: gross pension > {seuil} FDJ or capped rate', ret_no: 'Not applied: gross pension ≤ {seuil} FDJ',
    net_m: 'Net monthly', th_period: 'Period', th_years: 'Years', th_rate: 'Rate', total: 'Total',

    scen_save: 'Save this scenario',
    scen_help: 'Save the simulation, change a parameter (scheme, salary, years…) then save again to compare.',
    scen_empty: 'No saved scenario yet.', scen_name: 'Scenario {l}', scen_cur: 'Current simulation',
    th_name: 'Scenario', th_reg: 'Scheme', th_base: 'Base', th_net: 'Net / month', th_dep: 'At retirement', th_diff: 'Difference',
    load: 'Load', del: 'Delete', scen_full: 'Maximum {n} scenarios: delete one to continue.',

    req_idle: 'Enter your contribution years for each period.',
    req_ok: 'Minimum of {m} years reached', req_capped: ' · capped rate',
    req_ko: '{ny} more to reach the minimum of {m} years', dmg_mandates: ' (2 terms)',
    req_when: 'If you keep contributing, you will reach it in <b>{y}</b>.',
    req_late: 'That is after your legal retirement age ({y}). Check with your pension fund to review your options.',
    per_year: '{v} % per year', tier: '3 %/yr (first 15) then 2 %', quarter_note: ' · rounded to the quarter',
    lim_age: 'Maximum {n} years given your age', lim_none: 'No years possible given your age',
    ans: 'yrs', total_years: '{v} in total', age_v: '{v} years old', today: 'today', help: 'Help',
    err_invalide: 'This date does not exist.', err_future: 'The date cannot be in the future.',
    err_jeune: 'You must be at least {agemin} years old.', err_ancienne: 'Please check the year of birth.',

    dock_lbl: 'Net pension / month', dock_edit: 'Edit', sheet_close: 'See the result',
    undo_msg: 'Simulation cleared.', undo: 'Undo', restored: 'Your previous simulation has been restored.', restart: 'Start over',
    tour_1_t: '1. Your profile', tour_1: 'Choose your scheme and enter your date of birth.',
    tour_2_t: '2. Income and career', tour_2: 'Enter your salary (or index), then your contribution years — or let the simulator calculate them from your career.',
    tour_2m: 'Tap “Edit” to enter your scheme, income and years.',
    tour_3_t: '3. Your result', tour_3: 'Your pension is shown here in real time. Switch between “Today” and “At retirement”.',
    tour_next: 'Next', tour_skip: 'Skip', tour_done: "Let's go!",

    intro_badge: 'Indicative simulation', intro_t: 'Plan your future retirement',
    intro_p: 'Enter your details: your pension, retirement date and forecast update instantly.<br><br>Results are based on your statements and on the current legislation of the Republic of Djibouti; they are <b>indicative only</b>.',
    disclaimer: '<strong>Indicative</strong> simulation only, based on your statements and on the legislation in force in the Republic of Djibouti as of today. See the <a href="{laws}" target="_blank" rel="noopener">legal texts</a>.',
    live_msg: 'Estimated pension: {v} FDJ per month, rate {r}.', live_ko: 'Not enough contribution years: {ny} missing.',

    tip_rate: 'Percentage applied to your reference income. It depends on the years contributed in each period and cannot exceed the scheme cap (81 %, or 75 % for MPs and Government members).',
    tip_salary: 'Average of your gross monthly salaries over your last 10 years of work.',
    tip_indice: 'Number of points of your salary index (pay slips of the last 2 years). Each point is worth {ptn} / {ptd} ≈ {pt} FDJ per month.',
    tip_ret: 'A {ret} % deduction applies if the gross pension exceeds {seuil} FDJ per month, or if your rate is capped.',
    tip_repl: 'Share of your reference income represented by your net pension.',
    tip_min: 'Minimum period for a normal pension: 25 years of contributions (10 years, i.e. 2 terms, for MPs and Government members). For FCT and FNP, decimals are rounded to the quarter: .2–.4 → .25 · .5–.7 → .5 · .8–.9 → .75.',
    tip_auto: 'The simulator counts your months of work in each legal period, minus breaks. For RG and DMG, only full years count.',
    tip_prev: 'Estimate of your pension if you keep contributing without interruption until the legal retirement age. Added years count in the current period; income grows according to the chosen assumption.',
    tip_view: '“Today”: your entitlements to date. “At retirement”: the expected pension if you keep contributing until the legal age.',

    pr_title: 'Pension simulation summary', pr_date: 'Simulation made on {d}', pr_data: 'Your details', pr_res: 'Results (entitlements to date)',
    pr_regime: 'Scheme', pr_birth: 'Date of birth', pr_depart: 'Expected retirement date', pr_taux_acq: 'Acquired rate',
    pr_taux_app: 'Applied rate', pr_years: 'Contribution years', pr_scen: 'Compared scenarios', pr_status: 'Status',
    pr_ok: 'Minimum period reached', pr_ko: 'Minimum period not reached', pr_career: 'Declared career',
    pr_prev: 'Forecast at retirement age', pr_growth: 'Income growth assumption', pr_summary: 'Summary',
    pr_legal: 'This simulation is indicative only. It is based on the information declared and on the legislation in force on the date of the simulation. It does not create any entitlement.',
    pr_page: 'Pension Simulator · Djibouti', per_year_short: '% / yr'
  };

  root.PENSION_I18N = { LANGS: LANGS, MOIS: MOIS, DUREE: DUREE, REGIMES: REGIMES, INFO_REGIME: INFO_REGIME, STR: STR };
})(typeof self !== 'undefined' ? self : this);
