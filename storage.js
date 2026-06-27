/* ============================================================
   PSYCHE.OS v3  ·  storage.js
   Local JSON database. Single source of truth shared across
   index / login / dashboard via localStorage.
   Auto-migrates a v2 (psycheos_data) payload if found.
   Designed to swap to a real backend later: every read/write
   goes through Store.*, so only this file changes.
   ============================================================ */

const Store = (() => {
  const KEY      = 'psycheos_v3';
  const LEGACY   = 'psycheos_data';     // v2 single-file payload
  const SETTINGS = 'psycheos_v3_settings';
  const AUDIT    = 'psycheos_v3_audit';
  const SESSION  = 'psycheos_v3_session'; // login gate flag

  const empty = () => ({
    students: [], sessions: [], assessments: [],
    referrals: [], tasks: [], parentMeetings: [],
    mse: [], riskAssessments: [], appointments: []
  });

  let db = empty();
  let audit = [];
  let settings = { counsellorName: '', schoolName: 'St. Thomas School', master: '' };

  function normalise(d) {
    const e = empty();
    return { ...e, ...(d || {}) };
  }

  /* ---- load: v3 first, else migrate v2, else seed file (dashboard hydrates) ---- */
  function load() {
    let raw = localStorage.getItem(KEY);
    if (raw) {
      try { db = normalise(JSON.parse(raw).db || JSON.parse(raw)); }
      catch (e) { db = empty(); }
    } else {
      const legacy = localStorage.getItem(LEGACY);
      if (legacy) {
        try {
          const p = JSON.parse(legacy);
          db = normalise(p.db || p);
          save();
          logAudit('MIGRATE', 'Imported v2 records into v3');
        } catch (e) { db = empty(); }
      }
    }
    const s = localStorage.getItem(SETTINGS);
    if (s) { try { settings = { ...settings, ...JSON.parse(s) }; } catch (e) {} }
    // one-time: DASS-Y & YP-CORE now ship complete & official in code, so drop
    // any stale saved item-bank overrides that would mask them. Guarded so a
    // future intentional edit (e.g. a Hindi translation) is preserved.
    if (!settings.officialItemsV1) {
      if (settings.itemBanks) { delete settings.itemBanks.dassy; delete settings.itemBanks.ypcore; }
      settings.officialItemsV1 = true;
      saveSettings();
    }
    const a = localStorage.getItem(AUDIT);
    if (a) { try { audit = JSON.parse(a); } catch (e) {} }
    return db;
  }

  function save() {
    const payload = JSON.stringify({ db, savedAt: new Date().toISOString(), v: 3 });
    try {
      localStorage.setItem(KEY, payload);
      localStorage.setItem('psycheos_v3_lastSaved', new Date().toISOString());
    } catch (e) { console.warn('save failed', e); }
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS, JSON.stringify(settings)); } catch (e) {}
  }

  /* ---- seed sample data from data/students.json (first run only) ---- */
  async function seedIfEmpty() {
    if (db.students.length) return false;
    if (localStorage.getItem('psycheos_v3_seeded')) return false;
    try {
      const res = await fetch('data/students.json');
      if (!res.ok) throw new Error('no seed');
      const seed = await res.json();
      db = normalise(seed);
      localStorage.setItem('psycheos_v3_seeded', '1');
      save();
      logAudit('SEED', 'Loaded sample roster');
      return true;
    } catch (e) { return false; }
  }

  /* ---- audit ---- */
  function logAudit(type, detail) {
    audit.unshift({ ts: new Date().toISOString(), type, detail });
    audit = audit.slice(0, 500);
    try { localStorage.setItem(AUDIT, JSON.stringify(audit)); } catch (e) {}
  }
  const getAudit = () => audit;

  /* ---- id generator (PSY-YYYY-NNNN, matches St. Thomas format) ---- */
  function nextStudentId() {
    const now = new Date();
    const yr = String(now.getFullYear()).slice(-2);
    const nx = String(now.getFullYear() + 1).slice(-2);
    const prefix = `PSY-${yr}${nx}`;
    const used = db.students
      .filter(s => (s.id || '').startsWith(prefix))
      .map(s => parseInt((s.id.split('-')[2] || '0'), 10))
      .filter(n => !isNaN(n));
    const next = (used.length ? Math.max(...used) : 0) + 1;
    return `${prefix}-${String(next).padStart(4, '0')}`;
  }

  /* ---- session gate (login.html sets, dashboard.html checks) ---- */
  function unlock(name) {
    sessionStorage.setItem(SESSION, JSON.stringify({ at: Date.now(), name }));
  }
  function isUnlocked() {
    try { return !!JSON.parse(sessionStorage.getItem(SESSION)); }
    catch (e) { return false; }
  }
  function lock() { sessionStorage.removeItem(SESSION); }

  /* ---- export / import ---- */
  function exportJSON() {
    const blob = new Blob([JSON.stringify({ db, savedAt: new Date().toISOString(), v: 3 }, null, 2)],
                          { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `psycheos_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logAudit('EXPORT', 'Full JSON backup downloaded');
  }

  function importJSON(text) {
    const p = JSON.parse(text);
    db = normalise(p.db || p);
    save();
    logAudit('IMPORT', 'Restored from JSON backup');
    return db;
  }

  function exportCSV() {
    const cols = ['id','name','class','section','status','concern','riskFlags','createdAt'];
    const head = cols.join(',');
    const rows = db.students.map(s => cols.map(c => {
      let v = s[c]; if (Array.isArray(v)) v = v.join('|');
      return `"${String(v ?? '').replace(/"/g,'""')}"`;
    }).join(','));
    const blob = new Blob([head + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `psycheos_students_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  function clearAll() {
    db = empty();
    save();
    localStorage.removeItem('psycheos_v3_seeded');
    logAudit('CLEAR', 'All records wiped');
  }

  /* ---- public api ---- */
  return {
    load, save, saveSettings, seedIfEmpty,
    logAudit, getAudit,
    nextStudentId,
    unlock, isUnlocked, lock,
    exportJSON, importJSON, exportCSV, clearAll,
    get db() { return db; },
    get settings() { return settings; },
    set settings(v) { settings = v; },
    lastSaved: () => localStorage.getItem('psycheos_v3_lastSaved')
  };
})();
