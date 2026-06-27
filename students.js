/* ============================================================
   PSYCHE.OS v3  ·  students.js
   Roster table, filtering, student modal CRUD, profile view
   with tabs (overview / sessions / assessments / risk),
   session capture, and the assessment runner UI.
   ============================================================ */

const Students = (() => {
  let editingId = null;
  let currentId = null;
  let currentTab = 'overview';
  let runner = { type: 'phq9', answers: {} };

  const RISK_FLAGS = [
    'Self-Harm','Suicidal Ideation','Violence Risk',
    'Abuse','Neglect','Safeguarding Concern',
    'Substance Use','Runaway Risk','Online Safety',
    'Bullying (Victim)','Bullying (Perpetrator)','Peer Conflict',
    'Family Issues','Grief/Loss','Academic Failure Risk'
  ];
  const HIGH_RISK = ['Self-Harm','Suicidal Ideation','Violence Risk','Abuse','Neglect'];

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function statusClass(st) {
    return ({ New:'is-new', Active:'is-active', Monitoring:'is-monitoring',
      Closed:'is-closed' })[st] || '';
  }
  function isAtRisk(s) { return (s.riskFlags || []).some(f => HIGH_RISK.includes(f)); }

  /* ---------------- ROSTER TABLE ---------------- */
  function renderTable() {
    const q   = ($('studentSearch')?.value || '').toLowerCase();
    const fSt = $('filterStatus')?.value || '';
    const fCl = $('filterClass')?.value || '';
    const body = $('rosterBody');
    if (!body) return;

    let rows = Store.db.students.filter(s => {
      if (fSt && s.status !== fSt) return false;
      if (fCl && String(s.class) !== fCl) return false;
      if (q) {
        const hay = [s.name, s.id, s.class, s.section, (s.tags||[]).join(' '), s.concern]
          .join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));

    $('rosterCount').textContent = `${rows.length} / ${Store.db.students.length}`;

    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="6"><div class="empty">No records match</div></td></tr>`;
      return;
    }

    body.innerHTML = rows.map(s => {
      const risk = isAtRisk(s)
        ? `<span class="chip is-risk"><span class="dot"></span>RISK</span>` : '';
      return `<tr onclick="Students.openProfile('${s.id}')">
        <td class="mono">${esc(s.id)}</td>
        <td>${esc(s.name)}${s.preferred ? ` <span class="t-dim">(${esc(s.preferred)})</span>`:''}</td>
        <td class="mono">${esc(s.class)}${s.section ? '-'+esc(s.section):''}</td>
        <td><span class="chip ${statusClass(s.status)}"><span class="dot"></span>${esc(s.status||'—')}</span></td>
        <td>${risk || '<span class="t-faint">—</span>'}</td>
        <td class="t-soft">${esc((s.concern||'').slice(0,40))}${(s.concern||'').length>40?'…':''}</td>
      </tr>`;
    }).join('');
  }

  /* ---------------- MODAL ---------------- */
  function buildFlagGrid() {
    const g = $('flagGrid'); if (!g) return;
    g.innerHTML = RISK_FLAGS.map(f =>
      `<div class="flag" data-flag="${f}" onclick="Students.toggleFlag(this)">
        <span class="box"></span>${f}</div>`).join('');
  }
  function toggleFlag(el) { el.classList.toggle('checked');
    el.querySelector('.box').textContent = el.classList.contains('checked') ? '✕' : ''; }

  function openAdd() {
    editingId = null;
    $('modalTitle').textContent = 'New Record';
    ['f-name','f-preferred','f-class','f-section','f-house','f-status',
     'f-concern','f-parentName','f-parentContact','f-tags','f-notes','f-dob','f-gender']
      .forEach(id => { const e = $(id); if (e) e.value = ''; });
    $('f-id').value = Store.nextStudentId();
    $('f-status').value = 'New';
    buildFlagGrid();
    $('modalErr').textContent = '';
    $('studentModal').classList.add('open');
  }

  function openEdit(id) {
    const s = Store.db.students.find(x => x.id === id); if (!s) return;
    editingId = id;
    $('modalTitle').textContent = 'Edit Record';
    $('f-id').value = s.id;
    const set = (k,v) => { const e = $('f-'+k); if (e) e.value = v ?? ''; };
    set('name',s.name); set('preferred',s.preferred); set('class',s.class); set('section',s.section);
    set('house',s.house); set('status',s.status); set('concern',s.concern);
    set('parentName',s.parentName); set('parentContact',s.parentContact);
    set('tags',(s.tags||[]).join(', ')); set('notes',s.notes); set('dob',s.dob); set('gender',s.gender);
    buildFlagGrid();
    (s.riskFlags||[]).forEach(f => {
      const el = document.querySelector(`.flag[data-flag="${f}"]`);
      if (el) { el.classList.add('checked'); el.querySelector('.box').textContent='✕'; }
    });
    $('modalErr').textContent = '';
    $('studentModal').classList.add('open');
  }

  function closeModal() { $('studentModal').classList.remove('open'); }

  function save() {
    const name = $('f-name').value.trim();
    const cls  = $('f-class').value.trim();
    if (!name) { $('modalErr').textContent = 'Name is required.'; return; }
    if (!cls)  { $('modalErr').textContent = 'Class is required.'; return; }

    const flags = Array.from(document.querySelectorAll('.flag.checked')).map(e => e.dataset.flag);
    const tags  = $('f-tags').value.split(',').map(t => t.trim()).filter(Boolean);

    const rec = {
      id: $('f-id').value, name,
      preferred: $('f-preferred').value.trim(),
      class: cls, section: $('f-section').value.trim(),
      house: $('f-house').value, status: $('f-status').value,
      dob: $('f-dob').value, gender: $('f-gender').value,
      concern: $('f-concern').value.trim(),
      parentName: $('f-parentName').value.trim(),
      parentContact: $('f-parentContact').value.trim(),
      riskFlags: flags, tags, notes: $('f-notes').value.trim(),
      updatedAt: new Date().toISOString()
    };

    if (editingId) {
      const i = Store.db.students.findIndex(x => x.id === editingId);
      rec.createdAt = Store.db.students[i].createdAt;
      Store.db.students[i] = rec;
      Store.logAudit('UPDATE', `${rec.name} (${rec.id})`);
      App.toast('Record updated');
    } else {
      rec.createdAt = new Date().toISOString();
      Store.db.students.unshift(rec);
      Store.logAudit('CREATE', `${rec.name} (${rec.id})`);
      App.toast('Record saved');
    }
    Store.save();
    closeModal();
    renderTable();
    Dashboard.refresh();
    App.refreshBadges();
  }

  function remove(id) {
    if (!confirm('Permanently delete this record and its sessions/assessments?')) return;
    Store.db.students = Store.db.students.filter(s => s.id !== id);
    Store.db.sessions = Store.db.sessions.filter(s => s.studentId !== id);
    Store.db.assessments = Store.db.assessments.filter(a => a.studentId !== id);
    Store.save();
    Store.logAudit('DELETE', id);
    App.toast('Record deleted', true);
    App.showView('students');
    renderTable(); Dashboard.refresh(); App.refreshBadges();
  }

  /* ---------------- PROFILE ---------------- */
  function openProfile(id) {
    currentId = id; currentTab = 'overview';
    App.showView('profile');
    renderProfile();
  }

  function renderProfile() {
    const s = Store.db.students.find(x => x.id === currentId); if (!s) return;
    const sessions = Store.db.sessions.filter(x => x.studentId === s.id);
    const assess   = Store.db.assessments.filter(x => x.studentId === s.id);
    const risk = AI.riskRead(s);

    $('profileWrap').innerHTML = `
      <div class="profile">
        <div class="profile-card">
          <div class="t-label">${esc(s.id)}</div>
          <div class="profile-name">${esc(s.name)}</div>
          <div class="profile-id">${esc(s.class)}${s.section?'-'+esc(s.section):''} · ${esc(s.status||'—')}</div>
          <div style="margin:14px 0;">
            <span class="chip ${statusClass(s.status)}"><span class="dot"></span>${esc(s.status||'—')}</span>
            ${isAtRisk(s)?`<span class="chip is-risk" style="margin-left:6px"><span class="dot"></span>${risk.level}</span>`:''}
          </div>
          <div class="kv"><span class="k">House</span><span class="v">${esc(s.house||'—')}</span></div>
          <div class="kv"><span class="k">DOB</span><span class="v">${esc(s.dob||'—')}</span></div>
          <div class="kv"><span class="k">Guardian</span><span class="v">${esc(s.parentName||'—')}</span></div>
          <div class="kv"><span class="k">Contact</span><span class="v t-mono">${esc(s.parentContact||'—')}</span></div>
          <div class="kv"><span class="k">Sessions</span><span class="v t-data">${sessions.length}</span></div>
          <div class="kv"><span class="k">Measures</span><span class="v t-data">${assess.length}</span></div>
          <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn sm ghost" onclick="Students.openEdit('${s.id}')">Edit</button>
            <button class="btn sm danger" onclick="Students.remove('${s.id}')">Delete</button>
          </div>
        </div>
        <div>
          <div class="profile-tabs">
            ${[['overview','Overview'],['intake','Intake'],['sessions','Sessions'],['mse','MSE'],['assessments','Assessments'],['risk','Risk']].map(([t,lab]) =>
              `<div class="ptab ${t===currentTab?'active':''}" data-tab="${t}" onclick="Students.tab('${t}')">${lab}</div>`).join('')}
          </div>
          <div id="ptabBody"></div>
        </div>
      </div>`;
    renderTab();
  }

  function tab(t) { currentTab = t;
    document.querySelectorAll('.ptab').forEach(e =>
      e.classList.toggle('active', e.dataset.tab===t));
    renderTab();
  }

  function renderTab() {
    const s = Store.db.students.find(x => x.id === currentId); if (!s) return;
    const body = $('ptabBody');
    if (currentTab === 'overview') return renderOverview(s, body);
    if (currentTab === 'intake') return Clinical.renderIntake(s, body);
    if (currentTab === 'sessions') return renderSessions(s, body);
    if (currentTab === 'mse') return Clinical.renderMSE(s, body);
    if (currentTab === 'assessments') return renderRunner(s, body);
    if (currentTab === 'risk') return renderRisk(s, body);
  }

  function renderOverview(s, body) {
    body.innerHTML = `
      <div class="panel scan" style="margin-bottom:14px">
        <div class="panel-title">Presenting Concern</div>
        <div style="margin-top:8px;line-height:1.6">${esc(s.concern||'Not documented.')}</div>
      </div>
      <div class="grid grid-2">
        <div class="panel">
          <div class="panel-title">Formulation · 5P</div>
          <div class="ai-out" style="margin-top:10px">${AI.formulation(s).map(([k,v])=>
            `<span class="h">${k}</span>\n${esc(v)}\n\n`).join('')}</div>
        </div>
        <div class="panel">
          <div class="panel-title">Case Summary</div>
          <div class="ai-out" style="margin-top:10px">${esc(AI.summary(s))}</div>
          <div style="margin-top:10px"><button class="btn sm ghost" onclick="Reports.openFor('${s.id}')">Build report</button></div>
        </div>
      </div>
      ${(s.tags||[]).length ? `<div style="margin-top:14px">${(s.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>`:''}
      ${s.notes ? `<div class="panel" style="margin-top:14px"><div class="panel-title">Notes</div><div style="margin-top:8px;line-height:1.6;white-space:pre-wrap">${esc(s.notes)}</div></div>`:''}`;
  }

  /* ---- sessions ---- */
  function renderSessions(s, body) {
    const list = Store.db.sessions.filter(x => x.studentId === s.id)
      .sort((a,b) => new Date(b.date) - new Date(a.date));
    body.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
        <button class="btn sm" onclick="Students.openSession()">+ Log session</button>
      </div>
      ${list.length ? list.map(se => `
        <div class="panel" style="margin-bottom:10px">
          <div class="panel-head">
            <span class="panel-title">Session ${se.sessionNumber||''} · ${new Date(se.date).toLocaleDateString('en-IN')}</span>
            <span class="grow"></span>
            <span class="t-label">${esc(se.type||'')}</span>
          </div>
          ${se.presentingIssue?`<div style="margin-bottom:6px"><span class="t-dim">Issue</span> ${esc(se.presentingIssue)}</div>`:''}
          <div class="row-meta" style="margin-bottom:6px">
            ${se.location?esc(se.location):''}${se.duration?' · '+esc(se.duration):''}${se.mood?' · '+esc(se.mood):''}
            ${se.risk&&se.risk!=='None observed'?`<span class="t-mono is-warn"> · risk: ${esc(se.risk)}</span>`:''}
          </div>
          ${(se.themes||[]).length?`<div style="margin-bottom:6px">${se.themes.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>`:''}
          ${se.nextSteps?`<div><span class="t-dim">Next</span> ${esc(se.nextSteps)}</div>`:''}
        </div>`).join('')
      : `<div class="empty">No sessions logged</div>`}`;
  }

  function openSession() {
    $('sessionModal').classList.add('open');
    $('sf-date').value = new Date().toISOString().slice(0,10);
    ['sf-presentingIssue','sf-themes','sf-interventions','sf-nextSteps','sf-notes']
      .forEach(id => { const e=$(id); if(e) e.value=''; });
    [['sf-type',0],['sf-location',0],['sf-duration',1],['sf-mood',0],['sf-risk',0]]
      .forEach(([id,i]) => { const e=$(id); if(e) e.selectedIndex=i; });
  }
  function closeSession() { $('sessionModal').classList.remove('open'); }
  function saveSession() {
    const s = Store.db.students.find(x => x.id === currentId); if (!s) return;
    const n = Store.db.sessions.filter(x => x.studentId === s.id).length;
    const rec = {
      id: 'ses_'+Date.now(), studentId: s.id, sessionNumber: n+1,
      date: new Date($('sf-date').value || Date.now()).toISOString(),
      type: $('sf-type').value,
      location: $('sf-location').value,
      duration: $('sf-duration').value,
      mood: $('sf-mood').value,
      risk: $('sf-risk').value,
      presentingIssue: $('sf-presentingIssue').value.trim(),
      themes: $('sf-themes').value.split(',').map(t=>t.trim()).filter(Boolean),
      interventions: $('sf-interventions').value.split(',').map(t=>t.trim()).filter(Boolean),
      nextSteps: $('sf-nextSteps').value.trim(),
      freeNotes: $('sf-notes').value.trim(),
      savedAt: new Date().toISOString()
    };
    Store.db.sessions.push(rec);
    Store.save();
    Store.logAudit('SESSION', `${s.name} · session ${rec.sessionNumber}`);
    closeSession(); renderProfile(); Dashboard.refresh(); App.refreshBadges();
    App.toast($('sf-risk').value && $('sf-risk').value!=='None observed'
      ? 'Session logged · risk noted' : 'Session logged');
  }

  /* ---- risk tab ---- */
  function renderRisk(s, body) {
    const risk = AI.riskRead(s);
    const lvlClass = risk.level==='HIGH'?'is-danger':risk.level==='MODERATE'?'is-warn':'';
    body.innerHTML = `
      <div class="panel ${risk.level==='HIGH'?'pulse':''}" style="margin-bottom:14px;${risk.level==='HIGH'?'border-color:rgba(255,59,48,.4)':''}">
        <div class="panel-title">Risk Level</div>
        <div class="t-display ${lvlClass}" style="margin:8px 0">${risk.level}</div>
        <div class="t-soft">${esc(risk.note)}</div>
      </div>
      <div class="panel">
        <div class="panel-title">Active Flags</div>
        <div class="flag-grid" style="margin-top:12px">
          ${RISK_FLAGS.map(f => {
            const on = (s.riskFlags||[]).includes(f);
            return `<div class="flag ${on?'checked':''}" onclick="Students.toggleStudentFlag('${f}')">
              <span class="box">${on?'✕':''}</span>${f}</div>`;
          }).join('')}
        </div>
        <div class="t-dim" style="margin-top:10px;font-family:var(--font-mono);font-size:10px;letter-spacing:.1em">TAP TO TOGGLE · SAVES IMMEDIATELY</div>
      </div>
      <div id="riskMatrixMount">${Clinical.matrixSection(s)}</div>`;
  }
  function toggleStudentFlag(flag) {
    const s = Store.db.students.find(x => x.id === currentId); if (!s) return;
    s.riskFlags = s.riskFlags || [];
    const i = s.riskFlags.indexOf(flag);
    if (i >= 0) s.riskFlags.splice(i,1); else s.riskFlags.push(flag);
    s.updatedAt = new Date().toISOString();
    Store.save();
    Store.logAudit('RISK', `${s.name} · ${flag} ${i>=0?'cleared':'set'}`);
    renderProfile(); Dashboard.refresh(); App.refreshBadges();
  }

  /* ---------------- ASSESSMENT RUNNER ---------------- */
  function renderRunner(s, body) {
    runner = { type: 'phq9', answers: {} };
    const history = Store.db.assessments.filter(a => a.studentId === s.id)
      .sort((a,b) => new Date(b.date||b.savedAt) - new Date(a.date||a.savedAt));
    body.innerHTML = `
      <div class="assess-tabs">
        ${Assess.ORDER.map((k,i)=>
          `<div class="assess-tab ${i===0?'active':''}" data-at="${k}" onclick="Students.runType('${k}')">${Assess.INSTRUMENTS[k].label}</div>`).join('')}
      </div>
      <div class="assess-bar">
        <span class="t-dim t-mono" id="runnerHint" style="font-size:10px;letter-spacing:.08em">${Assess.INSTRUMENTS.phq9.hint}</span>
        <span class="grow"></span>
        <button class="btn sm ghost" onclick="Students.editItems()">Edit items</button>
      </div>
      <div id="runnerForm"></div>
      <div id="runnerResult"></div>
      ${history.length ? `<div class="rule"></div><div class="panel-title" style="margin-bottom:10px">History</div>
        ${history.map(a => {
          const sev = a.severity ? `<span class="t-mono">${esc(a.severity)}</span>` : '';
          return `<div class="row"><div class="grow"><div class="row-name">${(a.type||'').toUpperCase()}${a.score!==undefined?' · '+a.score:''}</div>
            <div class="row-meta">${new Date(a.date||a.savedAt).toLocaleDateString('en-IN')}</div></div>${sev}</div>`;
        }).join('')}` : ''}`;
    renderRunnerForm();
  }
  function runType(t) {
    runner = { type: t, answers: {} };
    document.querySelectorAll('.assess-tab').forEach(e => e.classList.toggle('active', e.dataset.at===t));
    const h = $('runnerHint'); if (h) h.textContent = Assess.INSTRUMENTS[t].hint;
    $('runnerResult').innerHTML = '';
    renderRunnerForm();
  }

  function renderRunnerForm() {
    const f = $('runnerForm');
    const inst = Assess.INSTRUMENTS[runner.type];
    const items = Assess.getItems(runner.type);
    f.innerHTML = items.map((q,i) => {
      const text = typeof q === 'string' ? q : q.t;
      const tag = q && q.sub ? `<span class="q-sub">${q.sub}</span>`
                : q && q.risk ? `<span class="q-sub is-danger">risk item</span>`
                : q && q.reverse ? `<span class="q-sub">reverse</span>` : '';
      return `<div class="q">
        <div class="q-text">${i+1}. ${esc(text)} ${tag}</div>
        <div class="q-opts">${inst.opts.map(o =>
          `<div class="q-opt" data-q="${i}" data-v="${o}" onclick="Students.answer(${i},${o})">${o}</div>`).join('')}</div>
      </div>`;
    }).join('') +
    `<div style="margin-top:16px"><button class="btn" onclick="Students.scoreRunner()">Score & preview</button>
      <span class="t-dim" style="margin-left:10px;font-size:11px">${inst.hint}</span></div>` +
    (inst.cite ? `<div class="t-faint t-mono" style="margin-top:10px;font-size:9px;letter-spacing:.06em">${inst.cite}</div>` : '');
  }

  function answer(qi, v) {
    runner.answers[qi] = v;
    document.querySelectorAll(`.q-opt[data-q="${qi}"]`).forEach(e =>
      e.classList.toggle('sel', +e.dataset.v === v));
  }

  function scoreCard(total, max, sev) {
    return `<div class="score-result scan">
      <div class="score-big ${sev.cls}">${total}</div>
      <div>
        <div class="score-sev ${sev.cls}">${sev.label}</div>
        <div class="t-dim t-mono" style="font-size:10px;margin-top:4px">${total} / ${max}</div>
        <div class="score-action">${sev.action || ''}</div>
      </div>
      <div style="margin-left:auto"><button class="btn" onclick='Students.saveRunner(${total},"${sev.label}")'>Save to record</button></div>
    </div>`;
  }

  function scoreRunner() {
    const inst = Assess.INSTRUMENTS[runner.type];
    const items = Assess.getItems(runner.type);
    const ans = runner.answers;
    if (Object.keys(ans).length < items.length) { App.toast('Answer every item', true); return; }

    if (inst.kind === 'total') {
      const total = Object.values(ans).reduce((a,b) => a+b, 0);
      const sev = inst.severity(total);
      runner._result = { score: total, severity: sev.label, max: inst.max };
      $('runnerResult').innerHTML = scoreCard(total, inst.max, sev);
    }
    else if (inst.kind === 'ypcore') {
      let total = 0;
      items.forEach((q,i) => { let v = ans[i]; if (q.reverse) v = 4 - v; total += v; });
      const band = inst.band(total);
      const riskIdx = items.findIndex(q => q.risk);
      const riskVal = riskIdx >= 0 ? ans[riskIdx] : 0;
      runner._result = { score: total, severity: band.label, max: inst.max, riskItem: riskVal };
      const riskNote = riskVal > 0
        ? `<div class="panel pulse" style="margin-top:12px;border-color:rgba(255,59,48,.4)">
             <div class="panel-title is-danger">Risk item flagged</div>
             <div class="t-soft" style="margin-top:6px">Self-harm item scored ${riskVal}/4. Inspect individually and follow safeguarding protocol.</div></div>`
        : '';
      $('runnerResult').innerHTML = scoreCard(total, inst.max, band) + riskNote;
    }
    else if (inst.kind === 'dassy') {
      const subs = { depression:0, anxiety:0, stress:0 };
      items.forEach((q,i) => { subs[q.sub] += ans[i]; });
      const total = subs.depression + subs.anxiety + subs.stress;
      const tBand = inst.totalBand(total);
      runner._result = { ...subs, score: total, severity: tBand.label };
      $('runnerResult').innerHTML = `
        <div class="panel scan" style="margin-top:18px">
          <div class="panel-head"><span class="panel-title">DASS-Y Subscales</span><span class="grow"></span>
            <span class="score-sev ${tBand.cls}">Total ${total} · ${tBand.label}</span></div>
          ${inst.subs.map(k => {
            const b = inst.band(k, subs[k]);
            const pct = Math.min(100,(subs[k]/21)*100);
            const fill = (b.cls==='sev-sev'||b.cls==='sev-modsev')?'danger':b.cls==='sev-mod'?'warn':'';
            return `<div class="bar-row"><span class="bar-label">${k}</span>
              <span class="bar-track"><span class="bar-fill ${fill}" style="width:${pct}%"></span></span>
              <span class="bar-val">${subs[k]}</span>
              <span class="score-sev ${b.cls}" style="font-size:10px;width:108px;text-align:right">${b.label}</span></div>`;
          }).join('')}
          <div class="t-dim" style="margin-top:10px;font-size:10px">Scores are not doubled. Cut-offs: Szabo & Lovibond (2022).</div>
          <div style="margin-top:14px"><button class="btn" onclick='Students.saveRunner(${total},"${tBand.label}")'>Save to record</button></div>
        </div>`;
    }
    else { // sdq
      const subs = { emotional:0, conduct:0, hyperactivity:0, peer:0, prosocial:0 };
      items.forEach((q,i) => { let v = ans[i]; if (q.reverse) v = 2 - v; subs[q.sub] += v; });
      const totalDiff = subs.emotional + subs.conduct + subs.hyperactivity + subs.peer;
      const band = Assess.sdqTotalBand(totalDiff);
      runner._result = { ...subs, score: totalDiff, totalScore: totalDiff, severity: band.label };
      $('runnerResult').innerHTML = `
        <div class="panel scan" style="margin-top:18px">
          <div class="panel-head"><span class="panel-title">SDQ Subscales</span><span class="grow"></span>
            <span class="score-sev ${band.cls}">Total ${totalDiff} · ${band.label}</span></div>
          ${['emotional','conduct','hyperactivity','peer','prosocial'].map(k => {
            const b = Assess.sdqBand(k, subs[k]);
            const pct = (subs[k]/10)*100;
            const fill = b.cls==='sev-sev'?'danger':b.cls==='sev-mod'?'warn':'';
            return `<div class="bar-row"><span class="bar-label">${k}</span>
              <span class="bar-track"><span class="bar-fill ${fill}" style="width:${pct}%"></span></span>
              <span class="bar-val">${subs[k]}</span>
              <span class="score-sev ${b.cls}" style="font-size:10px;width:74px;text-align:right">${b.label}</span></div>`;
          }).join('')}
          <div style="margin-top:14px"><button class="btn" onclick='Students.saveRunner(${totalDiff},"${band.label}")'>Save to record</button></div>
        </div>`;
    }
  }

  function saveRunner(score, severity) {
    const s = Store.db.students.find(x => x.id === currentId); if (!s) return;
    const rec = {
      id: 'asm_'+Date.now(), studentId: s.id, type: runner.type,
      items: runner.answers, score, severity,
      ...(runner._result || {}),
      date: new Date().toISOString(), savedAt: new Date().toISOString()
    };
    Store.db.assessments.push(rec);
    Store.save();
    Store.logAudit('ASSESS', `${s.name} · ${runner.type.toUpperCase()} ${score} (${severity})`);
    App.toast('Assessment saved');
    renderProfile(); Dashboard.refresh(); App.refreshBadges();
  }

  /* ---- editable item bank (paste official wording / localise) ---- */
  function editItems() {
    const type = runner.type;
    const items = Assess.getItems(type);
    const rows = items.map((q,i) =>
      `<div class="field"><label class="field-label">Item ${i+1}${q.sub?' · '+q.sub:''}${q.risk?' · RISK':''}${q.reverse?' · reverse':''}</label>
        <input class="input" data-ib="${i}" value="${esc(typeof q==='string'?q:q.t)}"></div>`).join('');
    const wrap = document.createElement('div');
    wrap.id = 'itemBankWrap';
    wrap.innerHTML = `
      <div class="overlay open" id="itemBankModal">
        <div class="modal">
          <div class="modal-head"><span class="modal-title">${Assess.INSTRUMENTS[type].label} · Items</span>
            <span class="modal-x" onclick="Students.closeItems()">✕</span></div>
          <div class="modal-body">
            <div class="t-soft" style="margin-bottom:14px;line-height:1.6">Paste the official wording for each item, or translate it. Subscale, reverse and risk structure plus all scoring stay fixed. Saved locally to this device only.</div>
            ${rows}
          </div>
          <div class="modal-foot">
            <button class="btn ghost sm" onclick="Students.resetItems()">Reset to default</button>
            <span class="grow"></span>
            <button class="btn ghost sm" onclick="Students.closeItems()">Cancel</button>
            <button class="btn sm" onclick="Students.saveItems()">Save items</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
  }
  function closeItems() { const w = $('itemBankWrap'); if (w) w.remove(); }
  function saveItems() {
    const texts = Array.from(document.querySelectorAll('#itemBankModal [data-ib]'))
      .sort((a,b) => +a.dataset.ib - +b.dataset.ib).map(e => e.value.trim());
    Assess.saveItems(runner.type, texts);
    Store.logAudit('ITEMS', `${runner.type.toUpperCase()} item bank edited`);
    closeItems(); App.toast('Items saved'); renderRunnerForm();
  }
  function resetItems() {
    const s = Store.settings; if (s.itemBanks) delete s.itemBanks[runner.type];
    Store.settings = s; Store.saveSettings();
    closeItems(); App.toast('Items reset'); renderRunnerForm();
  }

  return {
    renderTable, openAdd, openEdit, closeModal, save, remove, toggleFlag,
    openProfile, renderProfile, tab,
    openSession, closeSession, saveSession,
    toggleStudentFlag,
    runType, answer, scoreRunner, saveRunner,
    editItems, closeItems, saveItems, resetItems,
    RISK_FLAGS, isAtRisk
  };
})();
