/* ============================================================
   PSYCHE.OS v3  ·  clinical.js
   Three structured clinical instruments that hang off the
   student profile:
     · Intake      — extensive, dropdown-driven, one per student
     · MSE         — Mental State Examination, multiple over time
     · Risk Matrix — likelihood x consequence + factors + plan
   All forms are schema-driven so dropdowns stay consistent and
   the code stays small. Everything saves locally through Store.
   ============================================================ */

const Clinical = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const today = () => new Date().toISOString().slice(0,10);
  let currentId = null;

  /* ---------- generic field renderer ---------- */
  function field(f, val) {
    val = (val == null) ? '' : val;
    if (f.type === 'select') {
      return `<div class="field"><label class="field-label">${f.label}</label>
        <select class="select" data-k="${f.k}">
          <option value="">—</option>
          ${f.opts.map(o => `<option ${o===val?'selected':''}>${esc(o)}</option>`).join('')}
        </select></div>`;
    }
    if (f.type === 'textarea') {
      return `<div class="field full"><label class="field-label">${f.label}</label>
        <textarea class="textarea" data-k="${f.k}">${esc(val)}</textarea></div>`;
    }
    if (f.type === 'date') {
      return `<div class="field"><label class="field-label">${f.label}</label>
        <input class="input" type="date" data-k="${f.k}" value="${esc(val)}"></div>`;
    }
    return `<div class="field"><label class="field-label">${f.label}</label>
      <input class="input" data-k="${f.k}" value="${esc(val)}"></div>`;
  }
  function section(title, fields, data) {
    return `<div class="panel" style="margin-bottom:14px">
      <div class="panel-title" style="margin-bottom:14px">${title}</div>
      <div class="form-grid">${fields.map(f => field(f, data[f.k])).join('')}</div>
    </div>`;
  }
  function collect(scopeId) {
    const out = {};
    document.querySelectorAll(`#${scopeId} [data-k]`).forEach(e => { out[e.dataset.k] = e.value.trim(); });
    return out;
  }

  /* ============================================================
     INTAKE  (stored on student.intake)
     ============================================================ */
  const INTAKE = [
    ['Referral', [
      { k:'referralSource', label:'Referral source', type:'select', opts:['Self','Parent / Guardian','Class teacher','Form tutor','House master / mistress','Principal / Head','Medical / School nurse','Peer','External agency','Court / Police','Other'] },
      { k:'referralDate', label:'Referral date', type:'date' },
      { k:'urgency', label:'Urgency', type:'select', opts:['Routine','Soon (this week)','Urgent (24-48h)','Crisis (immediate)'] },
      { k:'referralReason', label:'Reason for referral', type:'textarea' }
    ]],
    ['Presenting picture', [
      { k:'presentingConcern', label:'Presenting concern', type:'textarea' },
      { k:'onsetDuration', label:'Duration', type:'select', opts:['Less than 1 week','1-4 weeks','1-3 months','3-6 months','6-12 months','Over 1 year','Longstanding'] },
      { k:'frequency', label:'Frequency', type:'select', opts:['Constant','Daily','Several times a week','Weekly','Occasional'] },
      { k:'impactSchool', label:'Impact: school', type:'select', opts:['None','Mild','Moderate','Severe'] },
      { k:'impactHome', label:'Impact: home', type:'select', opts:['None','Mild','Moderate','Severe'] },
      { k:'impactSocial', label:'Impact: social', type:'select', opts:['None','Mild','Moderate','Severe'] }
    ]],
    ['Family & home', [
      { k:'familyStructure', label:'Family structure', type:'select', opts:['Both parents','Single parent','Blended / step','Guardian / kinship','Adoptive','Foster','Boarding / hostel','Other'] },
      { k:'livingWith', label:'Currently lives with', type:'text' },
      { k:'siblings', label:'Siblings (number / order)', type:'text' },
      { k:'caregiverPrimary', label:'Primary caregiver', type:'text' },
      { k:'languagesHome', label:'Languages at home', type:'text' },
      { k:'familyMentalHealth', label:'Family mental-health history', type:'select', opts:['None known','Yes','Unknown'] },
      { k:'recentChanges', label:'Recent changes / losses', type:'textarea' }
    ]],
    ['Developmental & medical', [
      { k:'birthConcerns', label:'Pregnancy / birth concerns', type:'select', opts:['None reported','Yes','Unknown'] },
      { k:'milestones', label:'Developmental milestones', type:'select', opts:['On track','Some delay','Significant delay','Unknown'] },
      { k:'medicalConditions', label:'Medical conditions', type:'text' },
      { k:'medications', label:'Current medications', type:'text' },
      { k:'allergies', label:'Allergies', type:'text' },
      { k:'sleep', label:'Sleep', type:'select', opts:['No issues','Difficulty falling asleep','Frequent waking','Oversleeping','Nightmares','Irregular'] },
      { k:'appetite', label:'Appetite / eating', type:'select', opts:['Normal','Reduced','Increased','Irregular','Restrictive pattern'] }
    ]],
    ['Academic', [
      { k:'academicPerformance', label:'Performance', type:'select', opts:['Above expected','At expected','Below expected','Significantly below','Variable'] },
      { k:'attendance', label:'Attendance', type:'select', opts:['Regular','Occasional absence','Frequent absence','Chronic absence','School refusal'] },
      { k:'learningSupport', label:'Learning support', type:'select', opts:['None','Informal support','IEP / learning plan','External tuition','Assessed need'] },
      { k:'favSubjects', label:'Preferred subjects', type:'text' },
      { k:'difficultSubjects', label:'Difficult subjects', type:'text' }
    ]],
    ['Social & peer', [
      { k:'friendships', label:'Friendships', type:'select', opts:['Several friends','A few close friends','One close friend','Few / none','Socially isolated'] },
      { k:'bullying', label:'Bullying', type:'select', opts:['None reported','Current victim','Past victim','Perpetrator','Bystander concern','Cyber'] },
      { k:'extracurricular', label:'Activities / interests', type:'text' },
      { k:'peerNotes', label:'Peer & social notes', type:'textarea' }
    ]],
    ['History', [
      { k:'priorCounselling', label:'Prior counselling', type:'select', opts:['None','School counselling','External therapy','Psychiatric care','Inpatient'] },
      { k:'priorDiagnoses', label:'Prior diagnoses', type:'text' },
      { k:'riskHistory', label:'Risk history', type:'select', opts:['None known','Past self-harm','Past suicidal ideation','Past harm to others','Safeguarding history'] },
      { k:'substanceScreen', label:'Substance screen', type:'select', opts:['Not applicable','None reported','Experimental','Regular','Concern flagged'] }
    ]],
    ['Strengths, goals & consent', [
      { k:'strengths', label:'Strengths', type:'textarea' },
      { k:'goals', label:'Hopes / goals for support', type:'textarea' },
      { k:'consentType', label:'Consent', type:'select', opts:['Verbal (student)','Written (student)','Parental verbal','Parental written','Pending','Not obtained'] },
      { k:'consentBy', label:'Consent given by', type:'text' },
      { k:'consentDate', label:'Consent date', type:'date' },
      { k:'intakeBy', label:'Intake completed by', type:'text' },
      { k:'intakeDate', label:'Intake date', type:'date' }
    ]]
  ];

  function renderIntake(s, body) {
    currentId = s.id;
    const d = s.intake || {};
    if (!d.intakeBy) d.intakeBy = Store.settings.counsellorName || '';
    if (!d.intakeDate) d.intakeDate = today();
    body.innerHTML = `
      <div id="intakeForm">
        <div class="view-head" style="margin-bottom:14px">
          <div class="grow"><div class="t-label">Intake assessment</div></div>
          ${s.intake ? `<span class="chip is-active"><span class="dot"></span>ON FILE</span>` : `<span class="chip is-new"><span class="dot"></span>NOT STARTED</span>`}
        </div>
        ${INTAKE.map(([title, fields]) => section(title, fields, d)).join('')}
        <div style="display:flex;gap:10px;margin-top:4px">
          <button class="btn" onclick="Clinical.saveIntake()">Save intake</button>
          ${s.intake ? `<button class="btn ghost" onclick="Reports.openFor('${s.id}')">Build report</button>` : ''}
        </div>
      </div>`;
  }
  function saveIntake() {
    const s = Store.db.students.find(x => x.id === currentId); if (!s) return;
    s.intake = { ...collect('intakeForm'), savedAt: new Date().toISOString() };
    s.updatedAt = new Date().toISOString();
    Store.save();
    Store.logAudit('INTAKE', `${s.name} · intake saved`);
    App.toast('Intake saved');
    if (typeof Dashboard !== 'undefined') Dashboard.refresh();
  }

  /* ============================================================
     MSE  (stored in db.mse[], multiple per student)
     ============================================================ */
  const MSE = [
    ['Presentation', [
      { k:'appearance', label:'Appearance', type:'select', opts:['Well-groomed / appropriate','Casual / appropriate','Dishevelled','Poor hygiene','Inappropriate dress','Appears younger than age','Appears older than age'] },
      { k:'behaviour', label:'Behaviour', type:'select', opts:['Calm / cooperative','Restless','Agitated','Psychomotor retardation','Guarded','Withdrawn','Hyperactive','Oppositional'] },
      { k:'eyeContact', label:'Eye contact', type:'select', opts:['Appropriate','Reduced','Avoidant','Intense','Variable'] },
      { k:'rapport', label:'Rapport', type:'select', opts:['Easily established','Established with effort','Difficult','Not established'] }
    ]],
    ['Speech & mood', [
      { k:'speech', label:'Speech', type:'select', opts:['Normal rate / volume','Slow / quiet','Rapid','Pressured','Loud','Minimal / monosyllabic','Mutism'] },
      { k:'mood', label:'Mood (stated)', type:'select', opts:['Euthymic','Low','Anxious','Irritable','Elevated','Angry','Labile'] },
      { k:'affect', label:'Affect (observed)', type:'select', opts:['Full / congruent','Restricted','Blunted','Flat','Labile','Incongruent','Anxious','Tearful'] }
    ]],
    ['Thinking & perception', [
      { k:'thoughtForm', label:'Thought form', type:'select', opts:['Logical / goal-directed','Circumstantial','Tangential','Flight of ideas','Loosening of associations','Perseveration','Poverty of thought'] },
      { k:'thoughtContent', label:'Thought content', type:'select', opts:['Unremarkable','Worries / ruminations','Obsessions','Suicidal ideation','Self-harm thoughts','Thoughts of harm to others','Delusional ideas','Paranoia','Guilt / worthlessness','Hopelessness'] },
      { k:'perception', label:'Perception', type:'select', opts:['No abnormality','Auditory hallucinations','Visual hallucinations','Illusions','Dissociation / derealisation','Suspected'] }
    ]],
    ['Cognition & insight', [
      { k:'cognition', label:'Cognition', type:'select', opts:['Grossly intact','Inattentive','Disoriented','Memory concerns','Below age expectation'] },
      { k:'insight', label:'Insight', type:'select', opts:['Good','Fair','Limited','Poor','Absent'] },
      { k:'judgement', label:'Judgement', type:'select', opts:['Good','Fair','Impaired','Poor'] }
    ]],
    ['Risk at examination', [
      { k:'suicidalIdeation', label:'Suicidal ideation', type:'select', opts:['None','Passive','Active without plan','Active with plan','Active with intent'] },
      { k:'selfHarm', label:'Self-harm', type:'select', opts:['None','Historical','Recent','Current urges','Active'] },
      { k:'riskToOthers', label:'Risk to others', type:'select', opts:['None','Ideation','History','Current concern'] }
    ]]
  ];
  const MSE_HIGH = { suicidalIdeation:['Active with plan','Active with intent'], selfHarm:['Current urges','Active'], riskToOthers:['Current concern'] };

  function renderMSE(s, body) {
    currentId = s.id;
    const history = Store.db.mse.filter(m => m.studentId === s.id)
      .sort((a,b) => new Date(b.date) - new Date(a.date));
    body.innerHTML = `
      <div id="mseForm">
        <div class="view-head" style="margin-bottom:14px">
          <div class="grow"><div class="t-label">Mental State Examination</div></div>
        </div>
        <div class="panel" style="margin-bottom:14px">
          <div class="form-grid">
            <div class="field"><label class="field-label">Examination date</label>
              <input class="input" type="date" data-k="date" value="${today()}"></div>
            <div class="field"><label class="field-label">Examiner</label>
              <input class="input" data-k="examiner" value="${esc(Store.settings.counsellorName||'')}"></div>
          </div>
        </div>
        ${MSE.map(([title, fields]) => section(title, fields, {})).join('')}
        <div class="field full"><label class="field-label">Clinical notes</label>
          <textarea class="textarea" data-k="notes"></textarea></div>
        <div style="margin-top:4px"><button class="btn" onclick="Clinical.saveMSE()">Save MSE</button></div>
      </div>
      ${history.length ? `<div class="rule"></div>
        <div class="panel-title" style="margin-bottom:10px">Previous examinations (${history.length})</div>
        ${history.map(m => {
          const flagged = Object.keys(MSE_HIGH).some(k => (MSE_HIGH[k]||[]).includes(m[k]));
          return `<div class="panel" style="margin-bottom:10px;${flagged?'border-color:rgba(255,59,48,.4)':''}">
            <div class="panel-head"><span class="panel-title">${new Date(m.date).toLocaleDateString('en-IN')}</span>
              <span class="grow"></span>
              ${flagged?'<span class="chip is-risk"><span class="dot"></span>RISK NOTED</span>':''}
              <span class="t-label">${esc(m.examiner||'')}</span></div>
            <div class="mse-grid">
              ${['mood','affect','thoughtContent','suicidalIdeation','selfHarm','insight'].map(k => {
                const v = m[k]; if (!v) return '';
                const hi = (MSE_HIGH[k]||[]).includes(v);
                return `<span class="kv"><span class="k">${k}</span><span class="v ${hi?'is-danger':''}">${esc(v)}</span></span>`;
              }).join('')}
            </div>
            ${m.notes?`<div class="t-soft" style="margin-top:8px;white-space:pre-wrap;line-height:1.6">${esc(m.notes)}</div>`:''}
          </div>`;
        }).join('')}` : ''}`;
  }
  function saveMSE() {
    const s = Store.db.students.find(x => x.id === currentId); if (!s) return;
    const data = collect('mseForm');
    const rec = { id:'mse_'+Date.now(), studentId:s.id, ...data,
      date: data.date || today(), savedAt: new Date().toISOString() };
    Store.db.mse.push(rec);
    Store.save();
    Store.logAudit('MSE', `${s.name} · MSE recorded`);
    const flagged = Object.keys(MSE_HIGH).some(k => (MSE_HIGH[k]||[]).includes(rec[k]));
    App.toast(flagged ? 'MSE saved · risk noted, follow protocol' : 'MSE saved', flagged);
    renderMSE(s, $('ptabBody'));
  }

  /* ============================================================
     RISK ASSESSMENT MATRIX  (stored in db.riskAssessments[])
     likelihood (1-5) x consequence (1-5) = rating 1-25
     ============================================================ */
  const LIKELIHOOD = ['1 · Rare','2 · Unlikely','3 · Possible','4 · Likely','5 · Almost certain'];
  const CONSEQUENCE = ['1 · Negligible','2 · Minor','3 · Moderate','4 · Major','5 · Severe'];
  const RISK_DOMAINS = ['Suicide / self-harm','Harm to others','Neglect','Abuse / exploitation','Absconding / running away','Substance use','Online safety','Eating / health','Other'];

  function ratingBand(n) {
    if (n <= 4)  return { label:'LOW',     cls:'m-low',  sev:'sev-min' };
    if (n <= 9)  return { label:'MODERATE',cls:'m-mod',  sev:'sev-mod' };
    if (n <= 14) return { label:'HIGH',    cls:'m-high', sev:'sev-modsev' };
    return { label:'EXTREME', cls:'m-ext', sev:'sev-sev' };
  }

  function matrixGrid() {
    // rows: consequence 5..1 (top to bottom); cols: likelihood 1..5
    let html = '<div class="rmatrix">';
    html += '<div class="rm-corner"></div>';
    for (let l = 1; l <= 5; l++) html += `<div class="rm-axis">${l}</div>`;
    for (let c = 5; c >= 1; c--) {
      html += `<div class="rm-axis">${c}</div>`;
      for (let l = 1; l <= 5; l++) {
        const n = l * c;
        html += `<div class="rm-cell ${ratingBand(n).cls}" data-cell="${l}-${c}">${n}</div>`;
      }
    }
    html += '</div>';
    return html;
  }

  function matrixSection(s) {
    currentId = s.id;
    const history = Store.db.riskAssessments.filter(r => r.studentId === s.id)
      .sort((a,b) => new Date(b.date) - new Date(a.date));
    const last = history[0];
    return `
      <div class="rule"></div>
      <div id="riskMatrixForm">
        <div class="panel-head" style="margin-top:4px">
          <span class="panel-title">Risk Assessment Matrix</span>
          <span class="grow"></span>
          ${last?`<span class="score-sev ${ratingBand(last.rating).sev}">Last: ${last.rating} ${ratingBand(last.rating).label}</span>`:''}
        </div>

        <div class="grid grid-2" style="margin-top:6px">
          <div class="panel">
            <div class="form-grid">
              <div class="field full"><label class="field-label">Primary risk domain</label>
                <select class="select" data-k="domain">
                  <option value="">—</option>
                  ${RISK_DOMAINS.map(o=>`<option>${esc(o)}</option>`).join('')}
                </select></div>
              <div class="field"><label class="field-label">Likelihood</label>
                <select class="select" data-k="likelihood" onchange="Clinical.previewMatrix()">
                  <option value="">—</option>
                  ${LIKELIHOOD.map((o,i)=>`<option value="${i+1}">${esc(o)}</option>`).join('')}
                </select></div>
              <div class="field"><label class="field-label">Consequence</label>
                <select class="select" data-k="consequence" onchange="Clinical.previewMatrix()">
                  <option value="">—</option>
                  ${CONSEQUENCE.map((o,i)=>`<option value="${i+1}">${esc(o)}</option>`).join('')}
                </select></div>
            </div>
            <div class="rm-readout">
              <span class="t-label">Rating</span>
              <span class="rm-score" id="rmScore">—</span>
              <span class="score-sev" id="rmBand">SELECT L &amp; C</span>
            </div>
          </div>
          <div class="panel">
            <div class="panel-title" style="margin-bottom:10px">Likelihood &rarr; / Consequence &uarr;</div>
            ${matrixGrid()}
          </div>
        </div>

        <div class="panel" style="margin-top:14px">
          <div class="form-grid">
            <div class="field full"><label class="field-label">Static factors (history, fixed)</label><textarea class="textarea" data-k="staticFactors"></textarea></div>
            <div class="field full"><label class="field-label">Dynamic factors (current, changeable)</label><textarea class="textarea" data-k="dynamicFactors"></textarea></div>
            <div class="field full"><label class="field-label">Protective factors</label><textarea class="textarea" data-k="protectiveFactors"></textarea></div>
            <div class="field full"><label class="field-label">Warning signs</label><textarea class="textarea" data-k="warningSigns"></textarea></div>
            <div class="field full"><label class="field-label">Triggers</label><textarea class="textarea" data-k="triggers"></textarea></div>
            <div class="field full"><label class="field-label">Immediate actions taken</label><textarea class="textarea" data-k="immediateActions"></textarea></div>
            <div class="field full"><label class="field-label">Management / safety plan</label><textarea class="textarea" data-k="managementPlan"></textarea></div>
            <div class="field"><label class="field-label">People informed (DSL, parents…)</label><input class="input" data-k="peopleInformed"></div>
            <div class="field"><label class="field-label">Review date</label><input class="input" type="date" data-k="reviewDate"></div>
            <div class="field"><label class="field-label">Assessed by</label><input class="input" data-k="assessedBy" value="${esc(Store.settings.counsellorName||'')}"></div>
          </div>
          <div style="margin-top:6px"><button class="btn" onclick="Clinical.saveRiskAssessment()">Save risk assessment</button></div>
        </div>

        ${history.length ? `<div class="panel-title" style="margin:16px 0 10px">Assessment history (${history.length})</div>
          ${history.map(r => {
            const b = ratingBand(r.rating);
            return `<div class="row">
              <div class="grow"><div class="row-name">${esc(r.domain||'General')} · L${r.likelihood} × C${r.consequence}</div>
                <div class="row-meta">${new Date(r.date).toLocaleDateString('en-IN')}${r.reviewDate?' · review '+new Date(r.reviewDate).toLocaleDateString('en-IN'):''}</div></div>
              <span class="score-sev ${b.sev}">${r.rating} ${b.label}</span></div>`;
          }).join('')}` : ''}
      </div>`;
  }

  function previewMatrix() {
    const l = +(document.querySelector('#riskMatrixForm [data-k="likelihood"]')||{}).value || 0;
    const c = +(document.querySelector('#riskMatrixForm [data-k="consequence"]')||{}).value || 0;
    document.querySelectorAll('#riskMatrixForm .rm-cell').forEach(e => e.classList.remove('hit'));
    const scoreEl = $('rmScore'), bandEl = $('rmBand');
    if (!l || !c) { if (scoreEl) scoreEl.textContent='—'; if (bandEl){ bandEl.textContent='SELECT L & C'; bandEl.className='score-sev'; } return; }
    const n = l * c, b = ratingBand(n);
    const cell = document.querySelector(`#riskMatrixForm .rm-cell[data-cell="${l}-${c}"]`);
    if (cell) cell.classList.add('hit');
    if (scoreEl) scoreEl.textContent = n;
    if (bandEl) { bandEl.textContent = b.label; bandEl.className = 'score-sev ' + b.sev; }
  }

  function saveRiskAssessment() {
    const s = Store.db.students.find(x => x.id === currentId); if (!s) return;
    const d = collect('riskMatrixForm');
    const l = +d.likelihood || 0, c = +d.consequence || 0;
    if (!l || !c) { App.toast('Set likelihood and consequence', true); return; }
    const rating = l * c;
    const rec = { id:'risk_'+Date.now(), studentId:s.id, ...d,
      likelihood:l, consequence:c, rating,
      date: new Date().toISOString(), savedAt: new Date().toISOString() };
    Store.db.riskAssessments.push(rec);
    Store.save();
    Store.logAudit('RISKASSESS', `${s.name} · ${d.domain||'risk'} rated ${rating} (${ratingBand(rating).label})`);
    const high = rating >= 10;
    App.toast(high ? `Saved · ${ratingBand(rating).label} risk, follow protocol` : 'Risk assessment saved', high);
    if (typeof Students !== 'undefined') Students.renderProfile();
    if (typeof Dashboard !== 'undefined') Dashboard.refresh();
  }

  return {
    renderIntake, saveIntake,
    renderMSE, saveMSE,
    matrixSection, previewMatrix, saveRiskAssessment,
    ratingBand
  };
})();
