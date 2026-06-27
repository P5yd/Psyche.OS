/* ============================================================
   PSYCHE.OS v3  ·  assessments.js
   PHQ-9, GAD-7, SDQ. Item text and scoring bands ported
   faithfully from the v2 build.
   ============================================================ */

const Assess = (() => {

  const PHQ9 = [
    'Little interest or pleasure in doing things',
    'Feeling down, depressed, or hopeless',
    'Trouble falling/staying asleep, or sleeping too much',
    'Feeling tired or having little energy',
    'Poor appetite or overeating',
    'Feeling bad about yourself, or that you are a failure',
    'Trouble concentrating on things',
    'Moving or speaking slowly, or being restless/fidgety',
    'Thoughts that you would be better off dead or of hurting yourself'
  ];
  const GAD7 = [
    'Feeling nervous, anxious, or on edge',
    'Not being able to stop or control worrying',
    'Worrying too much about different things',
    'Trouble relaxing',
    'Being so restless that it is hard to sit still',
    'Becoming easily annoyed or irritable',
    'Feeling afraid as if something awful might happen'
  ];
  const OPTS = ['0', '1', '2', '3']; // Not at all / Several days / More than half / Nearly every day

  const SDQ = [
    { t: 'Considerate of others’ feelings', sub: 'prosocial' },
    { t: 'Restless, overactive, cannot stay still long', sub: 'hyperactivity' },
    { t: 'Often complains of headaches/stomach-aches', sub: 'emotional' },
    { t: 'Shares readily with others', sub: 'prosocial' },
    { t: 'Often loses temper', sub: 'conduct' },
    { t: 'Rather solitary, prefers to be alone', sub: 'peer' },
    { t: 'Generally well behaved, does what adults request', sub: 'conduct', reverse: true },
    { t: 'Many worries, often seems worried', sub: 'emotional' },
    { t: 'Helpful if someone is hurt/upset/ill', sub: 'prosocial' },
    { t: 'Constantly fidgeting or squirming', sub: 'hyperactivity' },
    { t: 'Has at least one good friend', sub: 'peer', reverse: true },
    { t: 'Often fights with or bullies other children', sub: 'conduct' },
    { t: 'Often unhappy, downhearted or tearful', sub: 'emotional' },
    { t: 'Generally liked by other children', sub: 'peer', reverse: true },
    { t: 'Easily distracted, concentration wanders', sub: 'hyperactivity' },
    { t: 'Nervous/clingy in new situations', sub: 'emotional' },
    { t: 'Kind to younger children', sub: 'prosocial' },
    { t: 'Often lies or cheats', sub: 'conduct' },
    { t: 'Picked on or bullied by other children', sub: 'peer' },
    { t: 'Often volunteers to help others', sub: 'prosocial' },
    { t: 'Thinks things out before acting', sub: 'hyperactivity', reverse: true },
    { t: 'Steals from home, school or elsewhere', sub: 'conduct' },
    { t: 'Gets on better with adults than children', sub: 'peer' },
    { t: 'Many fears, easily scared', sub: 'emotional' },
    { t: 'Sees tasks through, good attention span', sub: 'hyperactivity', reverse: true }
  ];

  /* ---- severity bands (verbatim from v2) ---- */
  function phq9Severity(s) {
    if (s <= 4)  return { label: 'Minimal',           cls: 'sev-min',    action: 'Monitor. No treatment indicated.' };
    if (s <= 9)  return { label: 'Mild',              cls: 'sev-mild',   action: 'Watchful waiting; repeat PHQ-9 at follow-up.' };
    if (s <= 14) return { label: 'Moderate',          cls: 'sev-mod',    action: 'Treatment plan, counselling, and follow-up.' };
    if (s <= 19) return { label: 'Moderately Severe', cls: 'sev-modsev', action: 'Active treatment and close monitoring.' };
    return         { label: 'Severe',                 cls: 'sev-sev',    action: 'Immediate intervention; consider referral.' };
  }
  function gad7Severity(s) {
    if (s <= 4)  return { label: 'Minimal',  cls: 'sev-min',  action: 'Monitor.' };
    if (s <= 9)  return { label: 'Mild',     cls: 'sev-mild', action: 'Monitor; self-help strategies.' };
    if (s <= 14) return { label: 'Moderate', cls: 'sev-mod',  action: 'Counselling intervention recommended.' };
    return         { label: 'Severe',        cls: 'sev-sev',  action: 'Active treatment; consider referral.' };
  }
  function sdqBand(sub, score) {
    const bands = {
      emotional:     { n: [0,3], b: [4,4],  a: [5,10] },
      conduct:       { n: [0,2], b: [3,3],  a: [4,10] },
      hyperactivity: { n: [0,5], b: [6,6],  a: [7,10] },
      peer:          { n: [0,2], b: [3,3],  a: [4,10] },
      prosocial:     { n: [6,10],b: [5,5],  a: [0,4]  }
    };
    const x = bands[sub]; if (!x) return { label: '—', cls: 'sev-min' };
    if (score >= x.n[0] && score <= x.n[1]) return { label: 'Normal',     cls: 'sev-min' };
    if (score >= x.b[0] && score <= x.b[1]) return { label: 'Borderline', cls: 'sev-mod' };
    return { label: 'Abnormal', cls: 'sev-sev' };
  }
  function sdqTotalBand(s) {
    if (s <= 13) return { label: 'Normal', cls: 'sev-min' };
    if (s <= 16) return { label: 'Borderline', cls: 'sev-mod' };
    return { label: 'Abnormal', cls: 'sev-sev' };
  }

  /* ============================================================
     DASS-Y · Depression Anxiety Stress Scales – Youth
     Szabo & Lovibond (2022). Public-domain instrument, ages 7-18.
     21 items, 3 subscales of 7, rated 0-3 over the past week.
     Scores are NOT doubled. Cut-offs from Szabo & Lovibond (2022).

     Items below are the official questionnaire in official
     administration order (subscales interleaved). Each item is
     tagged to its subscale (d=depression, a=anxiety, s=stress);
     subscale membership matches the adult DASS structure. No DASS-Y
     items are reverse-scored. Source: Szabo & Lovibond (2022),
     Front. Psychol. 13:766890 (public domain).
     ============================================================ */
  const DASSY_OPTS = ['0', '1', '2', '3']; // Not true / A little true / Fairly true / Very true
  const PASTE = '[paste official item]';
  const DASSY = [
    { t: 'I got upset about little things', sub: 'stress' },                                                            // 1
    { t: 'I felt dizzy, like I was about to faint', sub: 'anxiety' },                                                   // 2
    { t: 'I did not enjoy anything', sub: 'depression' },                                                              // 3
    { t: "I had trouble breathing (e.g. fast breathing), even though I wasn't exercising and I was not sick", sub: 'anxiety' }, // 4
    { t: 'I hated my life', sub: 'depression' },                                                                       // 5
    { t: 'I found myself over-reacting to situations', sub: 'stress' },                                                 // 6
    { t: 'My hands felt shaky', sub: 'anxiety' },                                                                       // 7
    { t: 'I was stressing about lots of things', sub: 'stress' },                                                       // 8
    { t: 'I felt terrified', sub: 'anxiety' },                                                                          // 9
    { t: 'There was nothing nice I could look forward to', sub: 'depression' },                                        // 10
    { t: 'I was easily irritated', sub: 'stress' },                                                                     // 11
    { t: 'I found it difficult to relax', sub: 'stress' },                                                              // 12
    { t: 'I could not stop feeling sad', sub: 'depression' },                                                          // 13
    { t: 'I got annoyed when people interrupted me', sub: 'stress' },                                                   // 14
    { t: 'I felt like I was about to panic', sub: 'anxiety' },                                                          // 15
    { t: 'I hated myself', sub: 'depression' },                                                                        // 16
    { t: 'I felt like I was no good', sub: 'depression' },                                                             // 17
    { t: 'I was easily annoyed', sub: 'stress' },                                                                       // 18
    { t: "I could feel my heart beating really fast, even though I hadn't done any hard exercise", sub: 'anxiety' },    // 19
    { t: 'I felt scared for no good reason', sub: 'anxiety' },                                                          // 20
    { t: 'I felt that life was terrible', sub: 'depression' }                                                          // 21
  ];
  function dassyBand(sub, s) {
    const B = {
      depression: [[6,'Normal','sev-min'],[8,'Mild','sev-mild'],[13,'Moderate','sev-mod'],[16,'Severe','sev-modsev']],
      anxiety:    [[5,'Normal','sev-min'],[7,'Mild','sev-mild'],[12,'Moderate','sev-mod'],[15,'Severe','sev-modsev']],
      stress:     [[11,'Normal','sev-min'],[13,'Mild','sev-mild'],[16,'Moderate','sev-mod'],[18,'Severe','sev-modsev']]
    }[sub] || [];
    for (const [max,label,cls] of B) if (s <= max) return { label, cls };
    return { label: 'Extremely Severe', cls: 'sev-sev' };
  }
  function dassyTotalBand(s) {
    if (s <= 23) return { label: 'Normal',   cls: 'sev-min' };
    if (s <= 29) return { label: 'Mild',     cls: 'sev-mild' };
    if (s <= 39) return { label: 'Moderate', cls: 'sev-mod' };
    if (s <= 46) return { label: 'Severe',   cls: 'sev-modsev' };
    return { label: 'Extremely Severe', cls: 'sev-sev' };
  }

  /* ============================================================
     YP-CORE · Young Person's CORE
     © CORE System Trust — coresystemtrust.org.uk
     Free for clinical use; do not modify item wording or remove
     this attribution. 10 items, ages 11-16, rated 0-4 over the
     last week. Raw score 0-40 (sum). Item 4 is the self-harm risk
     item and must be inspected individually. Items 3, 5 and 10 are
     positively keyed and reverse-scored (the app buttons capture
     frequency 0-4; reverse handling is applied in scoring).
     ============================================================ */
  const YPCORE_OPTS = ['0', '1', '2', '3', '4']; // Not at all / Only occasionally / Sometimes / Often / Most or all the time
  const YPCORE = [
    { t: "I've felt edgy or nervous" },                              // 1
    { t: "I haven't felt like talking to anyone" },                  // 2
    { t: "I've felt able to cope when things go wrong", reverse: true }, // 3 (positive)
    { t: "I've thought of hurting myself", risk: true },             // 4 (risk)
    { t: "There's been someone I felt able to ask for help", reverse: true }, // 5 (positive)
    { t: "My thoughts and feelings distressed me" },                 // 6
    { t: "My problems have felt too much for me" },                  // 7
    { t: "It's been hard to go to sleep or stay asleep" },           // 8
    { t: "I've felt unhappy" },                                      // 9
    { t: "I've done all the things I wanted to", reverse: true }     // 10 (positive)
  ];
  function ypcoreBand(s) {
    if (s <= 5)  return { label: 'Healthy',  cls: 'sev-min' };
    if (s <= 10) return { label: 'Low',      cls: 'sev-mild' };
    if (s <= 14) return { label: 'Mild',     cls: 'sev-mod' };
    if (s <= 19) return { label: 'Moderate', cls: 'sev-modsev' };
    return { label: 'Severe', cls: 'sev-sev' };
  }

  /* ---- instrument registry: drives the runner UI + scoring ---- */
  const DEFAULTS = { phq9: PHQ9, gad7: GAD7, sdq: SDQ, dassy: DASSY, ypcore: YPCORE };
  const INSTRUMENTS = {
    phq9:   { label: 'PHQ-9',   kind: 'total',     opts: OPTS,        max: 27, hint: '0 not at all · 3 nearly every day', severity: phq9Severity },
    gad7:   { label: 'GAD-7',   kind: 'total',     opts: OPTS,        max: 21, hint: '0 not at all · 3 nearly every day', severity: gad7Severity },
    sdq:    { label: 'SDQ',     kind: 'sdq',       opts: ['0','1','2'], hint: '0 not true · 1 somewhat · 2 certainly true' },
    dassy:  { label: 'DASS-Y',  kind: 'dassy',     opts: DASSY_OPTS,  hint: '0 not true · 3 very true · past week',
              cite: 'DASS-Y · Szabo & Lovibond (2022) · public domain',
              subs: ['depression','anxiety','stress'], band: dassyBand, totalBand: dassyTotalBand },
    ypcore: { label: 'YP-CORE', kind: 'ypcore',    opts: YPCORE_OPTS, max: 40, hint: '0 not at all · 4 most or all the time · last week',
              cite: 'YP-CORE · © CORE System Trust · coresystemtrust.org.uk · free for clinical use',
              band: ypcoreBand }
  };
  const ORDER = ['phq9', 'gad7', 'sdq', 'dassy', 'ypcore'];

  /* items resolver: a clinician-edited bank (in Store settings)
     overrides the seeded defaults so you can localise or complete
     an instrument without touching code. */
  function getItems(type) {
    const bank = (Store.settings && Store.settings.itemBanks) || {};
    const custom = bank[type];
    const def = DEFAULTS[type] || [];
    if (!Array.isArray(custom) || !custom.length) return def;
    // merge: keep structural flags (sub/reverse/risk) from default, text from custom
    return def.map((d, i) => {
      const txt = typeof custom[i] === 'string' ? custom[i] : (custom[i] && custom[i].t);
      return { ...d, t: (txt || d.t) };
    });
  }
  function saveItems(type, texts) {
    const s = Store.settings;
    s.itemBanks = s.itemBanks || {};
    s.itemBanks[type] = texts;
    Store.settings = s;
    Store.saveSettings();
  }

  return {
    PHQ9, GAD7, OPTS, SDQ, DASSY, YPCORE,
    phq9Severity, gad7Severity, sdqBand, sdqTotalBand,
    dassyBand, dassyTotalBand, ypcoreBand,
    INSTRUMENTS, ORDER, getItems, saveItems, DEFAULTS
  };
})();
