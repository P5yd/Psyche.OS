/* ============================================================
   PSYCHE.OS v3  ·  calendar.js
   Scheduling for upcoming sessions. A month grid + day agenda,
   appointments stored in db.appointments. Completing an
   appointment can hand off to the session log so what was
   planned becomes what was recorded.
   ============================================================ */

const Calendar = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const TYPE_ALERT = ['Crisis'];           // rendered in alert colour
  const now = new Date();
  let viewY = now.getFullYear();
  let viewM = now.getMonth();
  let selDay = localYMD(now);
  let editId = null;

  /* ---------- date utils (local, TZ-safe) ---------- */
  function localYMD(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth()+1).padStart(2,'0') + '-' +
      String(d.getDate()).padStart(2,'0');
  }
  function todayStr() { return localYMD(new Date()); }
  function dt(a) { return new Date(a.date + 'T' + (a.time || '00:00')); }
  function appts() { return Store.db.appointments || []; }
  function apptsOn(ds) { return appts().filter(a => a.date === ds).sort((a,b)=>(a.time||'').localeCompare(b.time||'')); }
  function nameOf(id) { const s = Store.db.students.find(x => x.id === id); return s ? (s.preferred || s.name) : ''; }

  function upcoming(limit) {
    const floor = Date.now() - 3600e3; // keep things from the last hour visible
    return appts()
      .filter(a => a.status === 'Scheduled' && dt(a).getTime() >= floor)
      .sort((a,b) => dt(a) - dt(b))
      .slice(0, limit || 100);
  }
  function upcomingCount() { return upcoming(999).length; }

  function statusChip(st) {
    const map = { Scheduled:'is-active', Completed:'is-closed', Cancelled:'is-closed', 'No-show':'is-monitoring' };
    return `<span class="chip ${map[st]||''}"><span class="dot"></span>${esc(st)}</span>`;
  }
  function whenLabel(a) {
    const d = dt(a);
    const day = d.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
    return a.time ? `${day} · ${a.time}` : day;
  }

  /* ---------- month grid ---------- */
  function monthCells(y, m) {
    const first = new Date(y, m, 1);
    const startDow = (first.getDay() + 6) % 7; // 0 = Monday
    const cells = [];
    for (let i = 0; i < startDow; i++) {
      const d = new Date(y, m, 1 - (startDow - i));
      cells.push({ d, other: true });
    }
    const dim = new Date(y, m + 1, 0).getDate();
    for (let day = 1; day <= dim; day++) cells.push({ d: new Date(y, m, day), other: false });
    while (cells.length < 42) {
      const last = cells[cells.length - 1].d;
      const nd = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
      cells.push({ d: nd, other: nd.getMonth() !== m });
    }
    return cells;
  }

  function render() {
    const body = $('calendarBody'); if (!body) return;
    const t = todayStr();
    const cells = monthCells(viewY, viewM);

    const grid = `
      <div class="cal-grid cal-dow-row">
        ${DOW.map(d => `<div class="cal-dow">${d}</div>`).join('')}
      </div>
      <div class="cal-grid">
        ${cells.map(c => {
          const ds = localYMD(c.d);
          const list = apptsOn(ds).filter(a => a.status !== 'Cancelled');
          const chips = list.slice(0,3).map(a => {
            const alert = TYPE_ALERT.includes(a.type) || a.status === 'No-show';
            const done = a.status === 'Completed';
            return `<div class="cal-appt ${alert?'is-alert':''} ${done?'is-done':''}">${a.time?`<b>${esc(a.time)}</b> `:''}${esc(nameOf(a.studentId)||a.type)}</div>`;
          }).join('');
          const more = list.length > 3 ? `<div class="cal-more">+${list.length-3}</div>` : '';
          return `<div class="cal-cell ${c.other?'other':''} ${ds===t?'today':''} ${ds===selDay?'selected':''}"
                       onclick="Calendar.selectDay('${ds}')" ondblclick="Calendar.openNew('${ds}')">
            <div class="cal-daynum">${c.d.getDate()}</div>
            ${chips}${more}
          </div>`;
        }).join('')}
      </div>`;

    body.innerHTML = `
      <div class="cal-head">
        <div class="cal-nav">
          <button class="btn ghost sm" onclick="Calendar.prevMonth()">◂</button>
          <button class="btn ghost sm" onclick="Calendar.today()">Today</button>
          <button class="btn ghost sm" onclick="Calendar.nextMonth()">▸</button>
        </div>
        <div class="cal-month">${MONTHS[viewM]} ${viewY}</div>
        <button class="btn sm" onclick="Calendar.openNew()">+ Schedule</button>
      </div>
      <div class="grid grid-cal">
        <div class="panel cal-panel">${grid}</div>
        <div class="panel">
          <div class="panel-head"><span class="panel-title" id="agendaTitle">Agenda</span></div>
          <div id="agendaBody"></div>
        </div>
      </div>`;

    renderAgenda();
  }

  function renderAgenda() {
    const title = $('agendaTitle'), body = $('agendaBody');
    if (!body) return;
    const ds = selDay;
    const human = new Date(ds + 'T00:00').toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' });
    if (title) title.textContent = human;
    const list = apptsOn(ds);
    body.innerHTML = `
      <div style="margin-bottom:12px"><button class="btn sm ghost" onclick="Calendar.openNew('${ds}')">+ Add for this day</button></div>
      ${list.length ? list.map(a => apptRow(a)).join('') : `<div class="empty">Nothing scheduled</div>`}`;
  }

  function apptRow(a) {
    const alert = TYPE_ALERT.includes(a.type);
    const cancelled = a.status === 'Cancelled';
    return `
      <div class="appt-row ${cancelled?'is-cancelled':''}">
        <div class="appt-time">${esc(a.time||'--:--')}<span>${esc(a.duration||'')}</span></div>
        <div class="grow">
          <div class="row-name ${alert?'is-danger':''}">${esc(nameOf(a.studentId)||'General')}</div>
          <div class="row-meta">${esc(a.type||'')}${a.location?' · '+esc(a.location):''}</div>
          ${a.notes?`<div class="t-soft" style="margin-top:4px;font-size:12px">${esc(a.notes)}</div>`:''}
        </div>
        <div class="appt-side">
          ${statusChip(a.status)}
          <div class="appt-actions">
            ${a.status==='Scheduled'?`<button class="btn ghost sm" onclick="Calendar.done('${a.id}')">Done</button>` : ''}
            ${a.studentId?`<button class="btn ghost sm" onclick="Calendar.logSession('${a.id}')">Log ▸</button>`:''}
            <button class="btn ghost sm" onclick="Calendar.openEdit('${a.id}')">Edit</button>
          </div>
        </div>
      </div>`;
  }

  /* ---------- navigation ---------- */
  function prevMonth() { viewM--; if (viewM < 0) { viewM = 11; viewY--; } render(); }
  function nextMonth() { viewM++; if (viewM > 11) { viewM = 0; viewY++; } render(); }
  function today() { const n = new Date(); viewY = n.getFullYear(); viewM = n.getMonth(); selDay = localYMD(n); render(); }
  function selectDay(ds) { selDay = ds; render(); }

  /* ---------- appointment modal ---------- */
  function studentOptions(sel) {
    const opts = [...Store.db.students].sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    return `<option value="">General / no student</option>` +
      opts.map(s => `<option value="${s.id}" ${s.id===sel?'selected':''}>${esc(s.preferred||s.name)} · ${esc(s.class||'')}${s.section?'-'+esc(s.section):''}</option>`).join('');
  }
  function openNew(ds) {
    editId = null;
    $('apptModalTitle').textContent = 'Schedule Session';
    $('ap-student').innerHTML = studentOptions('');
    $('ap-date').value = ds || selDay || todayStr();
    $('ap-time').value = '09:00';
    setSel('ap-duration', '30 min'); setSel('ap-type', 'Individual');
    setSel('ap-location', 'Counselling room'); setSel('ap-status', 'Scheduled');
    $('ap-notes').value = '';
    $('apptDelete').style.display = 'none';
    $('apptModal').classList.add('open');
  }
  function openEdit(id) {
    const a = appts().find(x => x.id === id); if (!a) return;
    editId = id;
    $('apptModalTitle').textContent = 'Edit Session';
    $('ap-student').innerHTML = studentOptions(a.studentId);
    $('ap-date').value = a.date; $('ap-time').value = a.time || '';
    setSel('ap-duration', a.duration); setSel('ap-type', a.type);
    setSel('ap-location', a.location); setSel('ap-status', a.status);
    $('ap-notes').value = a.notes || '';
    $('apptDelete').style.display = '';
    $('apptModal').classList.add('open');
  }
  function setSel(id, val) { const e = $(id); if (!e) return; const i = [...e.options].findIndex(o => o.value === val || o.text === val); e.selectedIndex = i >= 0 ? i : 0; }
  function closeModal() { $('apptModal').classList.remove('open'); }

  function save() {
    const date = $('ap-date').value;
    if (!date) { App.toast('Pick a date', true); return; }
    const rec = {
      studentId: $('ap-student').value,
      date, time: $('ap-time').value,
      duration: $('ap-duration').value, type: $('ap-type').value,
      location: $('ap-location').value, status: $('ap-status').value,
      notes: $('ap-notes').value.trim(),
      updatedAt: new Date().toISOString()
    };
    if (editId) {
      const a = appts().find(x => x.id === editId);
      Object.assign(a, rec);
    } else {
      rec.id = 'apt_' + Date.now();
      rec.createdAt = new Date().toISOString();
      Store.db.appointments.push(rec);
    }
    Store.save();
    Store.logAudit('SCHEDULE', `${nameOf(rec.studentId)||'General'} · ${rec.date} ${rec.time||''} (${rec.status})`);
    selDay = date; viewY = +date.slice(0,4); viewM = +date.slice(5,7) - 1;
    closeModal(); render(); afterChange();
    App.toast(editId ? 'Appointment updated' : 'Session scheduled');
  }

  function done(id) {
    const a = appts().find(x => x.id === id); if (!a) return;
    a.status = 'Completed'; a.updatedAt = new Date().toISOString();
    Store.save(); Store.logAudit('SCHEDULE', `${nameOf(a.studentId)||'General'} · marked completed`);
    render(); afterChange();
    App.toast(a.studentId ? 'Marked done · log the session from the row' : 'Marked done');
  }

  function deleteAppt() {
    if (!editId) return;
    if (!confirm('Delete this appointment? This cannot be undone.')) return;
    Store.db.appointments = appts().filter(a => a.id !== editId);
    Store.save(); Store.logAudit('SCHEDULE', 'Appointment deleted');
    closeModal(); render(); afterChange();
    App.toast('Appointment deleted');
  }

  // hand off to the session log: jump to the student's profile so the
  // counsellor records what actually happened (keeps planned vs logged clean)
  function logSession(id) {
    const a = appts().find(x => x.id === id); if (!a || !a.studentId) return;
    if (a.status === 'Scheduled') { a.status = 'Completed'; a.updatedAt = new Date().toISOString(); Store.save(); }
    App.showView('students');
    Students.openProfile(a.studentId);
    setTimeout(() => { try { Students.tab('sessions'); Students.openSession(); } catch (e) {} }, 60);
    afterChange();
  }

  function afterChange() {
    if (typeof Dashboard !== 'undefined') Dashboard.refresh();
    if (App.refreshBadges) App.refreshBadges();
  }

  /* ---------- dashboard home widget ---------- */
  function upcomingWidget() {
    const list = upcoming(6);
    if (!list.length) return `<div class="empty">Nothing scheduled</div>`;
    return list.map(a => `
      <div class="row" onclick="App.showView('calendar')">
        <div class="grow">
          <div class="row-name ${TYPE_ALERT.includes(a.type)?'is-danger':''}">${esc(nameOf(a.studentId)||'General')}</div>
          <div class="row-meta">${esc(a.type||'')}${a.location?' · '+esc(a.location):''}</div>
        </div>
        <span class="t-mono t-dim">${esc(whenLabel(a))}</span>
      </div>`).join('');
  }

  return {
    render, renderAgenda, prevMonth, nextMonth, today, selectDay,
    openNew, openEdit, save, closeModal, done, deleteAppt, logSession,
    upcomingWidget, upcomingCount
  };
})();
