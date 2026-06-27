/* ============================================================
   PSYCHE.OS v3  ·  guide.js
   The documentation OS: a reference layer for new counsellors and
   interns. Three parts — Documentation (how to write notes),
   Frameworks (how to think), Glossary (what terms mean). The
   glossary is seeded and expandable, and exposes a lookup() API so
   the forms can later surface inline definitions.
   ============================================================ */

const Guide = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let tab = 'doc';
  let q = '';
  let cat = '';

  /* ---------------- DOCUMENTATION ---------------- */
  const NOTE_FORMATS = [
    ['SOAP', [
      ['S · Subjective', 'What the student reports, in their own words where possible.'],
      ['O · Objective', 'What you observed or measured: presentation, behaviour, scores.'],
      ['A · Assessment', 'Your working understanding of what the data means. Not a label.'],
      ['P · Plan', 'Next steps, who does what, and when you will review.']
    ], 'S: "I can\'t sleep and I\'m falling behind." O: tearful, PHQ-9 14 (moderate). A: low mood linked to exam pressure and sleep loss. P: sleep routine plan, review in 1 week.'],
    ['DAP', [
      ['D · Data', 'Subjective and objective together: what was said and what you saw.'],
      ['A · Assessment', 'Your interpretation of the data.'],
      ['P · Plan', 'Agreed actions and review point.']
    ], 'A leaner format when separating subjective and objective adds little.'],
    ['BIRP', [
      ['B · Behaviour', 'What the student presented with this session.'],
      ['I · Intervention', 'What you did: the technique, topic, or support offered.'],
      ['R · Response', 'How the student responded to it.'],
      ['P · Plan', 'What happens next.']
    ], 'Useful when you want the record to show the intervention clearly.']
  ];

  const PRINCIPLES = [
    ['Separate observation from interpretation', 'Write what you saw, then what you think it means, as two distinct things. "Avoided eye contact and spoke quietly" is observation; "appeared anxious" is interpretation.'],
    ['Use person-first, non-stigmatising language', 'Describe the person, not the label. "A student living with ADHD", not "the ADHD kid". Describe behaviour rather than character: "did not complete the task", not "lazy".'],
    ['Be factual and specific', 'Prefer concrete detail over vague judgement. "Missed 3 of the last 5 sessions" is more useful than "poor attendance".'],
    ['Write as if it may be read', 'Records can be shared with parents, leadership, or in safeguarding. Keep them respectful, accurate, and free of guesswork stated as fact.'],
    ['Document promptly', 'Write up while the session is fresh. Note the date, who was present, and the session number.'],
    ['Hold confidentiality and its limits', 'State at the first session what stays private and what does not. Record that you explained it.']
  ];

  const WEAK_STRONG = [
    ['Student was being manipulative and attention-seeking.',
     'Student raised concerns loudly in class and sought one-to-one time afterward. Behaviour settled once heard.'],
    ['Seems fine now, no issues.',
     'Reports mood improved this week; PHQ-9 down from 14 to 9. Sleeping better. No current thoughts of self-harm reported.'],
    ['Mum is difficult and uncooperative.',
     'Parent declined the proposed meeting time and asked for an evening slot. Alternative offered for next week.']
  ];

  const RISK_DOC = [
    ['Record disclosures in the child\'s own words', 'Quote what was said rather than paraphrasing or interpreting. Avoid leading language.'],
    ['Stick to facts, not conclusions', 'Note what was reported and observed. Do not speculate about who or why beyond what was said.'],
    ['Record actions and timing', 'Who you informed, when, and what was done. Note the next safeguarding step and review point.'],
    ['Follow the reporting duty', 'Where abuse is suspected, follow your safeguarding lead and the law. Under POCSO, reporting child sexual abuse is mandatory in India.']
  ];

  function renderDoc() {
    return `
      <div class="panel" style="margin-bottom:14px">
        <div class="panel-title" style="margin-bottom:12px">Note formats</div>
        <div class="t-soft" style="margin-bottom:14px;line-height:1.6">Pick one format and stay consistent. Each gives a record a clear shape so anyone reading it can follow what happened and why.</div>
        <div class="grid grid-2">
          ${NOTE_FORMATS.map(([name, rows, ex]) => `
            <div class="g-card">
              <div class="g-card-h">${name}</div>
              ${rows.map(([k, v]) => `<div class="kv g-kv"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`).join('')}
              <div class="g-ex">${esc(ex)}</div>
            </div>`).join('')}
        </div>
      </div>

      <div class="panel" style="margin-bottom:14px">
        <div class="panel-title" style="margin-bottom:12px">Principles</div>
        ${PRINCIPLES.map(([h, d]) => `<div class="g-row"><div class="g-row-h">${esc(h)}</div><div class="t-soft">${esc(d)}</div></div>`).join('')}
      </div>

      <div class="panel" style="margin-bottom:14px">
        <div class="panel-title" style="margin-bottom:12px">Weaker vs stronger entries</div>
        ${WEAK_STRONG.map(([w, s]) => `
          <div class="g-compare">
            <div class="g-bad"><span class="g-tag-bad">AVOID</span>${esc(w)}</div>
            <div class="g-good"><span class="g-tag-good">BETTER</span>${esc(s)}</div>
          </div>`).join('')}
      </div>

      <div class="panel">
        <div class="panel-title is-danger" style="margin-bottom:12px">Documenting risk &amp; disclosures</div>
        ${RISK_DOC.map(([h, d]) => `<div class="g-row"><div class="g-row-h">${esc(h)}</div><div class="t-soft">${esc(d)}</div></div>`).join('')}
      </div>`;
  }

  /* ---------------- FRAMEWORKS ---------------- */
  function renderFrameworks() {
    return `
      <div class="panel" style="margin-bottom:14px">
        <div class="panel-title" style="margin-bottom:12px">Formulation: the 5 Ps</div>
        <div class="t-soft" style="margin-bottom:12px;line-height:1.6">A formulation is a working explanation of how a difficulty developed and why it keeps going. It guides support. It is not a diagnosis or a label.</div>
        ${[['Presenting','What the difficulty looks like now.'],
            ['Predisposing','What made the student vulnerable: history, temperament, environment.'],
            ['Precipitating','What triggered this episode: a recent event or change.'],
            ['Perpetuating','What keeps it going now: avoidance, sleep loss, conflict.'],
            ['Protective','Strengths and supports that help: relationships, interests, reasons for hope.']
          ].map(([k,v]) => `<div class="kv g-kv"><span class="k">${k}</span><span class="v">${esc(v)}</span></div>`).join('')}
      </div>

      <div class="panel" style="margin-bottom:14px">
        <div class="panel-title" style="margin-bottom:12px">The CBT maintenance cycle</div>
        <div class="t-soft" style="margin-bottom:10px;line-height:1.6">A situation triggers a thought, which drives an emotion and a body response, which shapes behaviour, which feeds back into the thought. Interventions break the cycle at one point.</div>
        <div class="g-cycle">Situation &rarr; Thought &rarr; Emotion &amp; body &rarr; Behaviour &rarr; Consequence &#8635;</div>
      </div>

      <div class="panel" style="margin-bottom:14px">
        <div class="panel-title" style="margin-bottom:12px">Mood vs affect, and the MSE</div>
        ${[['Mood','The sustained emotional state the student reports, in their words.'],
            ['Affect','The emotion you observe in the room: its type, range, and whether it fits the situation.'],
            ['Congruence','Whether observed affect matches reported mood and what is being said.']
          ].map(([k,v]) => `<div class="kv g-kv"><span class="k">${k}</span><span class="v">${esc(v)}</span></div>`).join('')}
        <div class="t-dim" style="margin-top:10px;font-size:12px">The MSE walks through appearance, behaviour, speech, mood, affect, thought form and content, perception, cognition, insight, and judgement.</div>
      </div>

      <div class="panel">
        <div class="panel-title" style="margin-bottom:12px">Risk language, as a ladder</div>
        <div class="t-soft" style="margin-bottom:10px;line-height:1.6">These are different things and should be recorded separately, not collapsed into "at risk".</div>
        <div class="g-ladder">
          <span>Ideation</span><span class="g-ar">&rarr;</span>
          <span>Intent</span><span class="g-ar">&rarr;</span>
          <span>Plan</span><span class="g-ar">&rarr;</span>
          <span>Means</span><span class="g-ar">&rarr;</span>
          <span>Preparation</span>
        </div>
        <div class="t-dim" style="margin-top:12px;font-size:12px">Ideation can be passive (wishing not to be alive) or active (thoughts of acting). Weigh risk factors against protective factors, and note which are static (fixed history) and which are dynamic (changeable now).</div>
      </div>`;
  }

  /* ---------------- GLOSSARY ---------------- */
  const CATS = ['Assessment & MSE','Risk & safeguarding','CBT & intervention','Developmental','Clinical process','Diagnostic','Legal & policy (India)'];

  const GLOSSARY = [
    // Assessment & MSE
    ['Affect','Assessment & MSE','The observed, moment-to-moment expression of emotion (what you see), described by type, range, and fit to the situation.'],
    ['Mood','Assessment & MSE','The sustained, self-reported emotional state the person tells you about, ideally in their own words.'],
    ['Congruence','Assessment & MSE','Whether observed affect matches reported mood and the content of speech. Incongruence can be significant.'],
    ['Blunted / flat affect','Assessment & MSE','Markedly reduced (blunted) or near-absent (flat) emotional expression.'],
    ['Labile affect','Assessment & MSE','Rapid, abrupt shifts in emotional expression that may not fit the context.'],
    ['Insight','Assessment & MSE','The person\'s awareness and understanding of their own difficulties and need for support.'],
    ['Judgement','Assessment & MSE','Capacity to make safe, reasoned decisions, often inferred from recent choices.'],
    ['Rapport','Assessment & MSE','The quality of the working connection; how readily trust and communication form.'],
    ['Psychomotor activity','Assessment & MSE','Observable level of activity, from agitation (restless, sped up) to retardation (slowed).'],
    ['Thought form','Assessment & MSE','How thoughts are organised and connected (the structure), separate from their content.'],
    ['Thought content','Assessment & MSE','What the person is thinking about, including worries, preoccupations, or thoughts of harm.'],
    ['Circumstantial speech','Assessment & MSE','Speech with excessive detail and detours that eventually reaches the point.'],
    ['Tangential speech','Assessment & MSE','Speech that drifts off-topic and does not return to the original point.'],
    ['Flight of ideas','Assessment & MSE','Rapid speech jumping between loosely connected ideas, often with elevated mood.'],
    ['Perseveration','Assessment & MSE','Repeating the same word, idea, or response despite a change in topic.'],
    ['Orientation','Assessment & MSE','Awareness of time, place, and person; a basic cognitive check.'],
    ['Baseline','Assessment & MSE','A person\'s usual functioning, used as the reference point for judging change.'],
    ['Presenting problem','Assessment & MSE','The main concern in the person\'s or referrer\'s own words at first contact.'],
    // Risk & safeguarding
    ['Suicidal ideation','Risk & safeguarding','Thoughts about ending one\'s life. Passive is wishing not to be alive; active is thoughts of acting.'],
    ['Intent','Risk & safeguarding','How much the person actually means to act, separate from having the thoughts.'],
    ['Plan','Risk & safeguarding','Whether the person has thought through how, when, or where they might act.'],
    ['Means','Risk & safeguarding','Access to a method. Reducing access is a core part of safety planning.'],
    ['Lethality','Risk & safeguarding','How dangerous a method or act is likely to be; informs urgency.'],
    ['Non-suicidal self-injury (NSSI)','Risk & safeguarding','Deliberate self-harm without intent to die, often to cope with overwhelming feelings. Distinct from a suicide attempt, but both need care.'],
    ['Protective factors','Risk & safeguarding','Things that lower risk and support coping: connectedness, reasons for living, access to help.'],
    ['Risk factors','Risk & safeguarding','Things that raise risk; may be static (fixed history) or dynamic (current and changeable).'],
    ['Static vs dynamic risk','Risk & safeguarding','Static factors are historical and unchanging; dynamic factors are current and can be influenced now.'],
    ['Safety plan','Risk & safeguarding','A collaborative written plan of warning signs, coping steps, supports, and ways to make the environment safer.'],
    ['Means restriction','Risk & safeguarding','Reducing a person\'s access to methods of harm as a protective step.'],
    ['Safeguarding','Risk & safeguarding','Actions to protect a child\'s safety and wellbeing, especially where abuse, neglect, or exploitation is suspected.'],
    ['Disclosure','Risk & safeguarding','When a child shares information about harm. Record it factually, in their words, without leading.'],
    ['Mandatory reporting','Risk & safeguarding','A legal duty to report suspected child abuse to the authorities.','Under POCSO, reporting child sexual abuse is mandatory in India; failure to report is an offence.'],
    ['Duty of care','Risk & safeguarding','The responsibility to take reasonable steps to keep a student safe from foreseeable harm.'],
    ['Limits of confidentiality','Risk & safeguarding','The boundaries of privacy. Risk of harm and safeguarding override confidentiality. Explain this at the start.'],
    // CBT & intervention
    ['Cognitive distortion','CBT & intervention','A habitual, biased way of thinking that does not fit the facts, such as all-or-nothing thinking or catastrophising.'],
    ['Automatic thought','CBT & intervention','An immediate, often unnoticed thought that pops up in a situation and drives emotion and behaviour.'],
    ['Core belief','CBT & intervention','A deep, general belief about self, others, or the world that shapes how events are read.'],
    ['Schema','CBT & intervention','A stable pattern of beliefs and assumptions, formed early, that filters new experiences.'],
    ['Cognitive restructuring','CBT & intervention','Identifying, testing, and updating unhelpful thoughts against the evidence.'],
    ['Thought record','CBT & intervention','A worksheet linking a situation to thoughts, feelings, and more balanced alternatives.'],
    ['Behavioural activation','CBT & intervention','Scheduling meaningful or pleasant activity to lift mood and break withdrawal, used in depression.'],
    ['Exposure','CBT & intervention','Gradual, planned contact with a feared situation to reduce avoidance and anxiety over time. Needs training.'],
    ['Psychoeducation','CBT & intervention','Explaining a difficulty and how support works, in plain language, so the person understands what is happening.'],
    ['Decisional balance','CBT & intervention','Weighing the pros and cons of changing versus not changing, used to support motivation.'],
    ['Grounding','CBT & intervention','Techniques that bring attention to the present and the senses to manage distress or dissociation.'],
    ['Distress tolerance','CBT & intervention','Skills for getting through intense emotion safely without making things worse.'],
    ['SMART goals','CBT & intervention','Goals that are Specific, Measurable, Achievable, Relevant, and Time-bound.'],
    // Developmental
    ['Developmental milestone','Developmental','An age-typical skill (motor, language, social) used as a marker of development.'],
    ['Attachment','Developmental','The early bond between a child and caregivers that shapes later relationships and security.'],
    ['Executive function','Developmental','Mental skills for planning, focusing, holding instructions, and managing impulses.'],
    ['Emotional regulation','Developmental','The ability to notice, understand, and manage one\'s emotional responses.'],
    ['Theory of mind','Developmental','Understanding that others have their own thoughts, feelings, and perspectives.'],
    ['Internalising vs externalising','Developmental','Internalising difficulties turn inward (anxiety, low mood); externalising ones turn outward (defiance, aggression).'],
    // Clinical process
    ['Formulation','Clinical process','A working explanation of how a person\'s difficulties developed and are maintained. Guides support; not a label.'],
    ['Case conceptualisation','Clinical process','Another term for formulation: the clinician\'s structured understanding of the case.'],
    ['5 Ps','Clinical process','A formulation frame: Presenting, Predisposing, Precipitating, Perpetuating, and Protective factors.'],
    ['Biopsychosocial','Clinical process','Understanding a person across biological, psychological, and social factors together.'],
    ['Working alliance','Clinical process','The collaborative, trusting relationship and shared goals that support progress.'],
    ['Triage','Clinical process','Sorting referrals by urgency and need to decide who is seen first and how.'],
    ['Referral','Clinical process','Directing a student to another service or professional better suited to their needs.'],
    ['Informed consent','Clinical process','Agreement to support after understanding its purpose, limits, and confidentiality, by the person with authority to consent.'],
    ['Assent','Clinical process','A minor\'s own agreement to take part, sought alongside a guardian\'s consent.','Document both the guardian\'s consent and the student\'s assent where age-appropriate.'],
    ['Progress monitoring','Clinical process','Tracking change over time using repeated measures or agreed indicators.'],
    ['Reflective practice','Clinical process','Reviewing your own work and reactions to learn and improve, often in supervision.'],
    ['Supervision','Clinical process','Regular structured support from a more experienced practitioner to maintain safe, effective practice.'],
    ['Countertransference','Clinical process','The counsellor\'s own emotional reactions to a student; useful information when noticed and reflected on.'],
    ['Discharge / closure','Clinical process','Planned ending of counselling, with a summary and any onward steps recorded.'],
    // Diagnostic
    ['Comorbidity','Diagnostic','The presence of more than one condition at the same time.'],
    ['Differential','Diagnostic','The set of possible explanations being weighed before reaching an understanding.'],
    ['Prevalence','Diagnostic','How common a condition is in a population.'],
    ['Prognosis','Diagnostic','The likely course and outcome of a difficulty over time.'],
    ['Screening tool','Diagnostic','A brief standardised measure that flags possible difficulty and the need for fuller assessment. Not a diagnosis.'],
    // Legal & policy (India)
    ['POCSO','Legal & policy (India)','Protection of Children from Sexual Offences Act, 2012. Criminalises child sexual abuse and makes reporting mandatory.'],
    ['JJ Act','Legal & policy (India)','Juvenile Justice (Care and Protection of Children) Act, 2015, covering children in need of care and protection.'],
    ['RTE','Legal & policy (India)','Right of Children to Free and Compulsory Education Act, 2009.'],
    ['NEP 2020','Legal & policy (India)','National Education Policy 2020, which includes attention to student wellbeing and counselling.'],
    ['UMMEED','Legal & policy (India)','CBSE guidelines giving schools a framework to identify and respond to students at risk of self-harm or suicide, using a gatekeeper approach.'],
    ['DPDP Act','Legal & policy (India)','Digital Personal Data Protection Act, 2023, governing how personal data, including student records, is handled.'],
    ['Best interests of the child','Legal & policy (India)','The principle that the child\'s welfare is the primary consideration in any decision affecting them.']
  ];

  function allTerms() {
    const custom = (Store.settings && Store.settings.glossary) || [];
    const seed = GLOSSARY.map(g => ({ t: g[0], cat: g[1], d: g[2], note: g[3] || '', custom: false }));
    const extra = custom.map(c => ({ ...c, custom: true }));
    return seed.concat(extra).sort((a, b) => a.t.toLowerCase().localeCompare(b.t.toLowerCase()));
  }
  function termCount() { return allTerms().length; }

  function catClass(c) { return 'gc-' + (CATS.indexOf(c) + 1); }

  function termCard(e, i) {
    return `<div class="g-term">
      <div class="g-term-h">
        <span class="g-term-t">${esc(e.t)}</span>
        <span class="g-cat ${catClass(e.cat)}">${esc(e.cat)}</span>
        ${e.custom ? `<span class="g-cat gc-add">added</span><button class="g-del" title="Remove" onclick="Guide.deleteTerm(${i})">✕</button>` : ''}
      </div>
      <div class="t-soft" style="line-height:1.6">${esc(e.d)}</div>
      ${e.note ? `<div class="g-note">India · ${esc(e.note)}</div>` : ''}
    </div>`;
  }

  function filtered() {
    const needle = q.trim().toLowerCase();
    return allTerms().filter(e => {
      if (cat && e.cat !== cat) return false;
      if (!needle) return true;
      return e.t.toLowerCase().includes(needle) || e.d.toLowerCase().includes(needle);
    });
  }

  function updateList() {
    const box = $('glossaryList'); if (!box) return;
    const list = filtered();
    if (!list.length) { box.innerHTML = `<div class="empty">No terms match</div>`; return; }
    // index against allTerms for delete targeting
    const all = allTerms();
    box.innerHTML = list.map(e => termCard(e, all.indexOf(all.find(x => x.t === e.t && x.cat === e.cat)))).join('');
  }

  function renderGlossary() {
    return `
      <div class="g-glossary-bar">
        <input class="input" id="glossarySearch" placeholder="Search terms or definitions…" value="${esc(q)}" oninput="Guide.searchGlossary(this.value)">
        <button class="btn sm" onclick="Guide.addTermModal()">+ Add term</button>
      </div>
      <div class="g-cats">
        <span class="g-catchip ${cat===''?'on':''}" onclick="Guide.filterCat('')">All</span>
        ${CATS.map(c => `<span class="g-catchip ${catClass(c)} ${cat===c?'on':''}" onclick="Guide.filterCat('${c.replace(/'/g,"\\'")}')">${esc(c)}</span>`).join('')}
      </div>
      <div id="glossaryList" class="g-list"></div>`;
  }

  /* ---------------- shell ---------------- */
  function render() {
    const body = $('guideBody'); if (!body) return;
    const tabs = [['doc','Documentation'],['frameworks','Frameworks'],['glossary','Glossary']];
    body.innerHTML = `
      <div class="g-tabs">
        ${tabs.map(([k,l]) => `<div class="g-tab ${k===tab?'on':''}" onclick="Guide.setTab('${k}')">${l}</div>`).join('')}
      </div>
      <div id="guideTabBody">${tab==='doc'?renderDoc():tab==='frameworks'?renderFrameworks():renderGlossary()}</div>`;
    if (tab === 'glossary') updateList();
  }
  function setTab(t) { tab = t; render(); }
  function searchGlossary(v) { q = v; updateList(); }
  function filterCat(c) {
    cat = c;
    document.querySelectorAll('.g-catchip').forEach(e => e.classList.remove('on'));
    // re-mark active without full re-render
    render();
  }

  /* ---------------- add / remove custom terms ---------------- */
  function addTermModal() {
    const wrap = document.createElement('div'); wrap.id = 'gTermWrap';
    wrap.innerHTML = `
      <div class="overlay open" id="gTermModal">
        <div class="modal">
          <div class="modal-head"><span class="modal-title">Add glossary term</span>
            <span class="modal-x" onclick="Guide.closeTerm()">✕</span></div>
          <div class="modal-body">
            <div class="field"><label class="field-label">Term</label><input class="input" id="gt-term"></div>
            <div class="field"><label class="field-label">Category</label>
              <select class="select" id="gt-cat">${CATS.map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
            <div class="field"><label class="field-label">Definition</label><textarea class="textarea" id="gt-def"></textarea></div>
            <div class="field"><label class="field-label">India note (optional)</label><input class="input" id="gt-note"></div>
          </div>
          <div class="modal-foot">
            <span class="grow"></span>
            <button class="btn ghost sm" onclick="Guide.closeTerm()">Cancel</button>
            <button class="btn sm" onclick="Guide.saveTerm()">Add term</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
  }
  function closeTerm() { const w = $('gTermWrap'); if (w) w.remove(); }
  function saveTerm() {
    const t = $('gt-term').value.trim(), d = $('gt-def').value.trim();
    if (!t || !d) { App.toast('Term and definition are required', true); return; }
    const s = Store.settings; s.glossary = s.glossary || [];
    s.glossary.push({ t, cat: $('gt-cat').value, d, note: $('gt-note').value.trim() });
    Store.settings = s; Store.saveSettings();
    Store.logAudit('GUIDE', `Glossary term added · ${t}`);
    closeTerm(); App.toast('Term added'); render(); if (App.refreshBadges) App.refreshBadges();
  }
  function deleteTerm(idx) {
    const all = allTerms(); const e = all[idx];
    if (!e || !e.custom) return;
    const s = Store.settings;
    s.glossary = (s.glossary || []).filter(c => !(c.t === e.t && c.d === e.d));
    Store.settings = s; Store.saveSettings();
    Store.logAudit('GUIDE', `Glossary term removed · ${e.t}`);
    App.toast('Term removed'); render(); if (App.refreshBadges) App.refreshBadges();
  }

  /* ---------------- lookup API (for future inline help) ---------------- */
  function lookup(term) {
    const n = String(term || '').toLowerCase();
    return allTerms().find(e => e.t.toLowerCase() === n) || null;
  }
  function openTerm(term) {
    tab = 'glossary'; q = term || ''; cat = '';
    if (typeof App !== 'undefined') App.showView('guide');
    render();
  }

  return {
    render, setTab, searchGlossary, filterCat,
    addTermModal, closeTerm, saveTerm, deleteTerm,
    lookup, openTerm, termCount
  };
})();
