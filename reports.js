/* ============================================================
   PSYCHE.OS v3  ·  reports.js
   Builds a printable case summary for a student and exports it
   as standalone HTML (light, print-friendly — clinical docs
   should read on paper, so the report deliberately drops the
   black HUD theme).
   ============================================================ */

const Reports = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let lastHTML = '';

  function build(studentId) {
    const s = Store.db.students.find(x => x.id === studentId);
    if (!s) return '';
    const sessions = Store.db.sessions.filter(x => x.studentId === s.id)
      .sort((a,b) => new Date(a.date) - new Date(b.date));
    const assess = Store.db.assessments.filter(x => x.studentId === s.id)
      .sort((a,b) => new Date(a.date||a.savedAt) - new Date(b.date||b.savedAt));
    const form = AI.formulation(s);
    const risk = AI.riskRead(s);
    const cn = Store.settings.counsellorName || 'School Counsellor';
    const sn = Store.settings.schoolName || 'St. Thomas School';

    lastHTML = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Case Summary · ${esc(s.name)}</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.6}
  h1{font-size:22px;font-weight:600;margin:0 0 2px;letter-spacing:.5px}
  .sub{color:#666;font-size:12px;letter-spacing:1px;text-transform:uppercase;margin-bottom:24px}
  h2{font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#444;border-bottom:1px solid #ddd;padding-bottom:5px;margin:26px 0 10px}
  table{width:100%;border-collapse:collapse;font-size:13px;margin:6px 0}
  td{padding:5px 8px;border-bottom:1px solid #eee;vertical-align:top}
  td.k{width:150px;color:#777;font-size:11px;letter-spacing:.5px;text-transform:uppercase}
  .risk-high{color:#b00020;font-weight:600}
  .foot{margin-top:40px;font-size:11px;color:#888;border-top:1px solid #ddd;padding-top:12px}
  .form-row{margin:8px 0}.form-row b{display:inline-block;width:120px;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:.5px;vertical-align:top}
  @media print{body{margin:0}}
</style></head><body>
<h1>Confidential Case Summary</h1>
<div class="sub">${esc(sn)} · Counselling Services</div>

<h2>Identification</h2>
<table>
  <tr><td class="k">Record ID</td><td>${esc(s.id)}</td></tr>
  <tr><td class="k">Name</td><td>${esc(s.name)}${s.preferred?` (${esc(s.preferred)})`:''}</td></tr>
  <tr><td class="k">Class / Section</td><td>${esc(s.class)}${s.section?' - '+esc(s.section):''}</td></tr>
  <tr><td class="k">House</td><td>${esc(s.house||'—')}</td></tr>
  <tr><td class="k">Status</td><td>${esc(s.status||'—')}</td></tr>
  <tr><td class="k">Guardian</td><td>${esc(s.parentName||'—')} ${s.parentContact?'· '+esc(s.parentContact):''}</td></tr>
</table>

<h2>Presenting Concern</h2>
<p>${esc(s.concern||'Not documented.')}</p>

<h2>Risk Status</h2>
<p class="${risk.level==='HIGH'?'risk-high':''}">${risk.level}. ${esc(risk.note)}</p>

<h2>Case Formulation (5P)</h2>
${form.map(([k,v])=>`<div class="form-row"><b>${esc(k)}</b>${esc(v)}</div>`).join('')}

<h2>Assessments</h2>
${assess.length ? `<table>${assess.map(a=>
  `<tr><td class="k">${a.type.toUpperCase()}</td><td>Score ${a.score??'—'} · ${esc(a.severity||'—')} · ${new Date(a.date||a.savedAt).toLocaleDateString('en-IN')}</td></tr>`).join('')}</table>`
  : '<p>No standardised measures on file.</p>'}

<h2>Session History (${sessions.length})</h2>
${sessions.length ? sessions.map(se=>
  `<div class="form-row"><b>${new Date(se.date).toLocaleDateString('en-IN')}</b>${esc(se.type||'')}${se.presentingIssue?' — '+esc(se.presentingIssue):''}${se.nextSteps?'<br><span style="color:#777;font-size:12px">Next: '+esc(se.nextSteps)+'</span>':''}</div>`).join('')
  : '<p>No sessions recorded.</p>'}

<div class="foot">
  Prepared by ${esc(cn)} · ${new Date().toLocaleString('en-IN')}<br>
  This document contains confidential student information. Handle per POCSO / school safeguarding policy.
</div>
</body></html>`;
    return lastHTML;
  }

  function openFor(studentId) {
    App.showView('reports');
    const html = build(studentId);
    const frame = $('reportPreview');
    if (frame) frame.srcdoc = html;
    $('reportStudent').textContent = (Store.db.students.find(s=>s.id===studentId)||{}).name || '';
    Reports._current = studentId;
  }

  function renderPicker() {
    const sel = $('reportPicker'); if (!sel) return;
    sel.innerHTML = '<option value="">Select a student…</option>' +
      Store.db.students.map(s => `<option value="${s.id}">${esc(s.name)} · ${esc(s.id)}</option>`).join('');
  }

  function print() {
    if (!lastHTML) { App.toast('Build a report first', true); return; }
    const w = window.open('', '_blank');
    w.document.write(lastHTML); w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
  }
  function exportHTML() {
    if (!lastHTML) { App.toast('Build a report first', true); return; }
    const blob = new Blob([lastHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const name = (Store.db.students.find(s=>s.id===Reports._current)||{}).name || 'student';
    a.href = url; a.download = `case_summary_${name.replace(/\s+/g,'_')}.html`;
    a.click(); URL.revokeObjectURL(url);
    Store.logAudit('REPORT', `Exported summary · ${name}`);
  }

  return { build, openFor, renderPicker, print, exportHTML };
})();
