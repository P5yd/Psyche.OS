/* ============================================================
   PSYCHE.OS v3  ·  app.js
   Orchestrates dashboard.html: gate, cloud, clock, view router,
   toast, sidebar badges, settings, audit, risk + global views,
   backup wiring.
   ============================================================ */

const App = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let toastTimer;

  function boot() {
    Store.load();
    // gate: must come through login
    if (!Store.isUnlocked()) { window.location.replace('login.html'); return; }

    Cloud.init('cloud');
    startClock();

    // identity in chrome
    const s = Store.settings;
    if ($('topbarMeta')) $('topbarMeta').textContent =
      (s.counsellorName ? s.counsellorName.toUpperCase()+' · ' : '') + 'COUNSELLOR CONSOLE';
    if ($('sbSchool')) $('sbSchool').textContent = (s.schoolName||'SCHOOL').toUpperCase();

    // seed sample roster on first run, then render everything
    Store.seedIfEmpty().then(() => {
      Dashboard.refresh();
      Students.renderTable();
      buildClassFilter();
      refreshBadges();
      Reports.renderPicker();
    });

    // wire restore input
    const ri = $('restoreInput');
    if (ri) ri.addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { try { Store.importJSON(r.result); App.toast('Backup restored');
        Dashboard.refresh(); Students.renderTable(); buildClassFilter(); refreshBadges(); }
        catch (err) { App.toast('Invalid backup file', true); } };
      r.readAsText(f);
    });

    showView('dashboard');
  }

  /* ---- clock + HUD readouts ---- */
  function startClock() {
    const tick = () => {
      const now = new Date();
      if ($('topbarTime'))
        $('topbarTime').textContent = now.toLocaleTimeString('en-IN', { hour12: false });
      if ($('hudClock'))
        $('hudClock').textContent = now.toLocaleTimeString('en-IN', { hour12: false });
    };
    tick(); setInterval(tick, 1000);
  }

  /* ---- router ---- */
  function showView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const v = $('view-' + name); if (v) v.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const n = $('nav-' + name); if (n) n.classList.add('active');

    if (name === 'dashboard') Dashboard.refresh();
    if (name === 'students') Students.renderTable();
    if (name === 'risk') renderRisk();
    if (name === 'sessions') renderSessionsView();
    if (name === 'calendar') Calendar.render();
    if (name === 'guide') Guide.render();
    if (name === 'assessments') renderAssessView();
    if (name === 'reports') Reports.renderPicker();
    if (name === 'audit') renderAudit();
    if (name === 'settings') renderSettings();

    if (v && window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(v, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
    }
  }

  function buildClassFilter() {
    const sel = $('filterClass'); if (!sel) return;
    const classes = [...new Set(Store.db.students.map(s => s.class).filter(Boolean))]
      .sort((a,b) => (parseInt(a)||99)-(parseInt(b)||99));
    sel.innerHTML = '<option value="">ALL CLASSES</option>' +
      classes.map(c => `<option value="${esc(c)}">CLASS ${esc(c)}</option>`).join('');
  }

  function refreshBadges() {
    const d = Store.db;
    const set = (id, n, alert) => { const e = $(id); if (!e) return;
      e.textContent = n; e.classList.toggle('alert', !!alert && n>0); };
    const HIGH = ['Self-Harm','Suicidal Ideation','Violence Risk','Abuse','Neglect'];
    set('nb-students', d.students.length);
    set('nb-sessions', d.sessions.length);
    if (typeof Calendar !== 'undefined') set('nb-calendar', Calendar.upcomingCount(), true);
    if (typeof Guide !== 'undefined') set('nb-guide', Guide.termCount(), true);
    set('nb-assessments', d.assessments.length);
    set('nb-risk', d.students.filter(s => (s.riskFlags||[]).some(f => HIGH.includes(f))).length, true);
    if ($('sbRecords')) $('sbRecords').textContent = d.students.length + ' RECORDS';
    if ($('hudCount')) $('hudCount').textContent = String(d.students.length).padStart(4,'0');
  }

  /* ---- risk register view ---- */
  function renderRisk() {
    const HIGH = ['Self-Harm','Suicidal Ideation','Violence Risk','Abuse','Neglect'];
    const flagged = Store.db.students.filter(s => (s.riskFlags||[]).length);
    $('riskViewBody').innerHTML = flagged.length ? `
      <table class="table"><thead><tr><th>ID</th><th>Name</th><th>Class</th><th>Flags</th><th>Level</th></tr></thead>
      <tbody>${flagged.sort((a,b)=>{
        const ah=(a.riskFlags||[]).some(f=>HIGH.includes(f)), bh=(b.riskFlags||[]).some(f=>HIGH.includes(f));
        return (bh?1:0)-(ah?1:0);
      }).map(s => {
        const high = (s.riskFlags||[]).some(f => HIGH.includes(f));
        return `<tr onclick="Students.openProfile('${s.id}')">
          <td class="mono">${esc(s.id)}</td><td>${esc(s.name)}</td>
          <td class="mono">${esc(s.class)}${s.section?'-'+esc(s.section):''}</td>
          <td class="t-soft">${(s.riskFlags||[]).join(' · ')}</td>
          <td>${high?'<span class="chip is-risk"><span class="dot"></span>HIGH</span>':'<span class="chip is-monitoring"><span class="dot"></span>MOD</span>'}</td>
        </tr>`;
      }).join('')}</tbody></table>`
      : `<div class="empty">No flagged students</div>`;
  }

  /* ---- global sessions view ---- */
  function renderSessionsView() {
    const list = [...Store.db.sessions].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,40);
    const nameOf = id => (Store.db.students.find(s=>s.id===id)||{}).name || '—';
    $('sessionsViewBody').innerHTML = list.length ? list.map(se =>
      `<div class="row" onclick="Students.openProfile('${se.studentId}')">
        <div class="grow"><div class="row-name">${esc(nameOf(se.studentId))}</div>
          <div class="row-meta">${esc(se.type||'')} · ${(se.themes||[]).join(', ')}</div></div>
        <span class="t-mono t-dim">${new Date(se.date).toLocaleDateString('en-IN')}</span>
      </div>`).join('') : `<div class="empty">No sessions logged</div>`;
  }

  /* ---- global assessments view ---- */
  function renderAssessView() {
    const list = [...Store.db.assessments].sort((a,b)=>new Date(b.date||b.savedAt)-new Date(a.date||a.savedAt)).slice(0,40);
    const nameOf = id => (Store.db.students.find(s=>s.id===id)||{}).name || '—';
    $('assessViewBody').innerHTML = list.length ? list.map(a =>
      `<div class="row" onclick="Students.openProfile('${a.studentId}')">
        <div class="grow"><div class="row-name">${esc(nameOf(a.studentId))} · ${a.type.toUpperCase()}</div>
          <div class="row-meta">Score ${a.score??'—'} · ${esc(a.severity||'—')}</div></div>
        <span class="t-mono t-dim">${new Date(a.date||a.savedAt).toLocaleDateString('en-IN')}</span>
      </div>`).join('') : `<div class="empty">No assessments recorded</div>`;
  }

  /* ---- audit ---- */
  function renderAudit() {
    const log = Store.getAudit();
    $('auditBody').innerHTML = log.length ? log.map(e =>
      `<tr><td class="mono">${new Date(e.ts).toLocaleString('en-IN')}</td>
        <td class="t-label" style="color:var(--fg)">${esc(e.type)}</td>
        <td class="t-soft">${esc(e.detail)}</td></tr>`).join('')
      : `<tr><td colspan="3"><div class="empty">No activity logged</div></td></tr>`;
  }

  /* ---- settings ---- */
  function renderSettings() {
    $('set-counsellor').value = Store.settings.counsellorName || '';
    $('set-school').value = Store.settings.schoolName || '';
    const ls = Store.lastSaved();
    if ($('lastSaved')) $('lastSaved').textContent = ls ? new Date(ls).toLocaleString('en-IN') : 'NEVER';
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const lb = $('theme-light-btn'), db = $('theme-dark-btn');
    if (lb && db) {
      lb.classList.toggle('ghost', theme !== 'light');
      db.classList.toggle('ghost', theme !== 'dark');
    }
  }
  function setTheme(t) {
    const next = t === 'dark' ? 'dark' : 'light';
    localStorage.setItem('psycheos_theme', next);
    try { Store.settings = { ...Store.settings, theme: next }; Store.saveSettings(); } catch (e) {}
    document.documentElement.setAttribute('data-theme', next);
    // reload so the particle engine initialises (or stays off) for the new theme
    window.location.reload();
  }
  function saveSettings() {
    Store.settings = { ...Store.settings,
      counsellorName: $('set-counsellor').value.trim(),
      schoolName: $('set-school').value.trim() };
    Store.saveSettings();
    if ($('topbarMeta')) $('topbarMeta').textContent =
      (Store.settings.counsellorName ? Store.settings.counsellorName.toUpperCase()+' · ' : '') + 'COUNSELLOR CONSOLE';
    if ($('sbSchool')) $('sbSchool').textContent = (Store.settings.schoolName||'SCHOOL').toUpperCase();
    toast('Settings saved');
  }

  function lock() {
    Store.lock();
    Cloud.disperse(() => window.location.replace('login.html'));
    setTimeout(() => window.location.replace('login.html'), 1200);
  }

  function wipe() {
    if (!confirm('Delete ALL records permanently? This cannot be undone.')) return;
    Store.clearAll();
    Dashboard.refresh(); Students.renderTable(); buildClassFilter(); refreshBadges();
    toast('All records wiped', true);
  }

  /* ---- toast ---- */
  function toast(msg, alert) {
    const t = $('toast'); if (!t) return;
    t.textContent = msg;
    t.classList.toggle('alert', !!alert);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  return { boot, showView, refreshBadges, toast, lock, wipe,
           saveSettings, setTheme, buildClassFilter,
           exportJSON: () => Store.exportJSON(),
           exportCSV: () => Store.exportCSV(),
           triggerRestore: () => $('restoreInput').click() };
})();

document.addEventListener('DOMContentLoaded', App.boot);
