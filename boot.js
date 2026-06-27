/* ============================================================
   PSYCHE.OS v3  ·  boot.js
   Drives the index.html landing sequence: cloud assembles,
   the title resolves, a HUD log types out, ENTER appears.
   ============================================================ */

(function () {
  const LINES = [
    'INITIALISING POINT CLOUD',
    'MOUNTING LOCAL DATA STORE',
    'VERIFYING RECORD INTEGRITY',
    'CALIBRATING HUD',
    'SYSTEM NOMINAL'
  ];

  const HIGH_RISK = ['Self-Harm','Suicidal Ideation','Violence Risk','Abuse','Neglect'];

  function telemetry() {
    const db = Store.db || {};
    const students = db.students || [];
    const sessions = db.sessions || [];
    const atRisk = students.filter(s => (s.riskFlags || []).some(f => HIGH_RISK.includes(f))).length;
    const weekAgo = Date.now() - 7 * 864e5;
    const sess7 = sessions.filter(s => new Date(s.date || s.savedAt).getTime() >= weekAgo).length;
    return { roster: students.length, atRisk, sess7, lastSaved: localStorage.getItem('psycheos_v3_lastSaved') };
  }
  function relTime(iso) {
    if (!iso) return 'NEVER';
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'JUST NOW';
    if (m < 60) return m + 'M AGO';
    const h = Math.round(m / 60); if (h < 24) return h + 'H AGO';
    return Math.round(h / 24) + 'D AGO';
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(() => {
    Store.load();
    Cloud.init('cloud');
    const light = document.documentElement.getAttribute('data-theme') !== 'dark';

    const log   = document.getElementById('bootLog');
    const bar   = document.querySelector('.boot-bar i');
    const enter = document.getElementById('bootEnter');
    const title = document.getElementById('bootTitle');
    const sub   = document.getElementById('bootSub');
    const count = document.getElementById('bootCount');

    if (count) {
      const t = telemetry();
      count.classList.remove('boot-mark');
      count.innerHTML =
        '<div class="boot-tele">' +
          '<span class="tele"><b>' + t.roster + '</b><i>Roster</i></span>' +
          '<span class="tele ' + (t.atRisk ? 'is-alert' : '') + '"><b>' + t.atRisk + '</b><i>At-risk</i></span>' +
          '<span class="tele"><b>' + t.sess7 + '</b><i>Sessions·7d</i></span>' +
          '<span class="tele"><b>' + relTime(t.lastSaved) + '</b><i>Saved</i></span>' +
        '</div>';
    }

    // type the log lines, advancing the hairline bar
    let li = 0;
    function nextLine() {
      if (li >= LINES.length) { revealEnter(); return; }
      if (log) log.textContent = '> ' + LINES[li];
      if (bar) bar.style.width = ((li + 1) / LINES.length * 100) + '%';
      li++;
      setTimeout(nextLine, 360);
    }

    function revealEnter() {
      if (!enter) return;
      if (window.gsap) {
        gsap.to(enter, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' });
      } else {
        enter.style.opacity = '1';
      }
      enter.removeAttribute('hidden');
      enter.addEventListener('click', go);
      document.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    }

    let booting = false;
    function go() {
      if (booting) return; booting = true;
      const dest = Store.isUnlocked() ? 'dashboard.html' : 'login.html';
      if (light) { window.location.href = dest; return; }
      const seq = Store.isUnlocked()
        ? ['AUTH OK', 'MOUNTING LOCAL STORE', 'LOADING ROSTER', 'RENDERING CONSOLE', 'READY']
        : ['INITIALISING CONSOLE', 'SECURE GATE ONLINE', 'AWAITING IDENTITY'];
      if (enter) enter.setAttribute('hidden', '');
      Cloud.disperse(() => {});
      let si = 0;
      (function step() {
        if (log) log.textContent = '> ' + seq[si];
        if (bar) bar.style.width = ((si + 1) / seq.length * 100) + '%';
        si++;
        if (si < seq.length) setTimeout(step, 240);
        else setTimeout(() => { window.location.href = dest; }, 380);
      })();
      // safety: navigate even if the sequence is interrupted
      setTimeout(() => { window.location.href = dest; }, 2400);
    }

    // choreograph: assemble cloud, then resolve title, then log
    if (light) {
      if (title) title.style.opacity = '1';
      if (sub) sub.style.opacity = '1';
      revealEnter();
    } else if (window.gsap && title) {
      gsap.set([title, sub], { opacity: 0, y: 10 });
      Cloud.assemble(() => {
        gsap.to(title, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });
        gsap.to(sub, { opacity: 1, y: 0, duration: 0.8, delay: 0.15, ease: 'power3.out',
          onComplete: nextLine });
      });
    } else {
      Cloud.assemble(() => nextLine());
      if (title) title.style.opacity = '1';
      if (sub) sub.style.opacity = '1';
    }
  });
})();
