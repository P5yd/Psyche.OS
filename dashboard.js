/* ============================================================
   PSYCHE.OS v3  ·  dashboard.js
   Stat tiles (GSAP count-up), recent records, risk register
   preview, class distribution bars.
   ============================================================ */

const Dashboard = (() => {
  const $ = id => document.getElementById(id);
  const HIGH_RISK = ['Self-Harm','Suicidal Ideation','Violence Risk','Abuse','Neglect'];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function countUp(el, to) {
    if (!el) return;
    if (!window.gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = to; return;
    }
    const o = { v: +el.textContent || 0 };
    gsap.to(o, { v: to, duration: 0.8, ease: 'power2.out',
      onUpdate() { el.textContent = Math.round(o.v); } });
  }

  function refresh() {
    const d = Store.db;
    const st = d.students;
    const counts = {
      total: st.length,
      active: st.filter(s => s.status === 'Active').length,
      monitor: st.filter(s => s.status === 'Monitoring').length,
      risk: st.filter(s => (s.riskFlags||[]).some(f => HIGH_RISK.includes(f))).length,
      newc: st.filter(s => s.status === 'New').length,
      closed: st.filter(s => s.status === 'Closed').length,
      sessions: d.sessions.length,
      assess: d.assessments.length
    };
    countUp($('st-total'), counts.total);
    countUp($('st-active'), counts.active);
    countUp($('st-monitor'), counts.monitor);
    countUp($('st-risk'), counts.risk);
    countUp($('st-new'), counts.newc);
    countUp($('st-closed'), counts.closed);
    countUp($('st-sessions'), counts.sessions);
    countUp($('st-assess'), counts.assess);

    // recent records
    const recent = [...st].sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0)).slice(0,6);
    $('recentList').innerHTML = recent.length ? recent.map(s =>
      `<div class="row" onclick="Students.openProfile('${s.id}')">
        <div class="grow"><div class="row-name">${esc(s.name)}</div>
          <div class="row-meta">${esc(s.id)} · ${esc(s.class)}${s.section?'-'+esc(s.section):''}</div></div>
        <span class="chip ${({New:'is-new',Active:'is-active',Monitoring:'is-monitoring',Closed:'is-closed'})[s.status]||''}"><span class="dot"></span>${esc(s.status||'—')}</span>
      </div>`).join('') : `<div class="empty">No records yet</div>`;

    // risk register
    const atRisk = st.filter(s => (s.riskFlags||[]).some(f => HIGH_RISK.includes(f)));
    $('riskList').innerHTML = atRisk.length ? atRisk.slice(0,6).map(s =>
      `<div class="row" onclick="Students.openProfile('${s.id}')">
        <div class="grow"><div class="row-name is-danger">${esc(s.name)}</div>
          <div class="row-meta">${(s.riskFlags||[]).filter(f=>HIGH_RISK.includes(f)).join(' · ')}</div></div>
        <span class="chip is-risk"><span class="dot"></span>FLAG</span>
      </div>`).join('') : `<div class="empty">No active risk flags</div>`;

    // upcoming sessions (scheduling)
    if (typeof Calendar !== 'undefined' && $('upcomingList'))
      $('upcomingList').innerHTML = Calendar.upcomingWidget();

    // class distribution
    const byClass = {};
    st.forEach(s => { const c = s.class || '—'; byClass[c] = (byClass[c]||0)+1; });
    const max = Math.max(1, ...Object.values(byClass));
    const sorted = Object.entries(byClass).sort((a,b) => {
      const na = parseInt(a[0]), nb = parseInt(b[0]);
      return (isNaN(na)?99:na) - (isNaN(nb)?99:nb);
    });
    $('classDist').innerHTML = sorted.length ? sorted.map(([c,n]) =>
      `<div class="bar-row"><span class="bar-label">Class ${esc(c)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${(n/max)*100}%"></span></span>
        <span class="bar-val">${n}</span></div>`).join('') : `<div class="empty">No data</div>`;

    // dash date
    const dd = $('dashDate');
    if (dd) dd.textContent = new Date().toLocaleDateString('en-IN',
      { weekday:'long', day:'numeric', month:'long', year:'numeric' }).toUpperCase();
  }

  return { refresh };
})();
