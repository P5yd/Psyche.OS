/* ============================================================
   PSYCHE.OS v3  ·  ai.js
   Clinical-assist helpers. Runs fully offline by default using
   deterministic heuristics over the record. An optional hook
   (AI.remote) is left for wiring a real model later; it is OFF
   unless a key is configured, so nothing leaves the device.
   ============================================================ */

const AI = (() => {

  function latestAssessment(studentId, type) {
    return Store.db.assessments
      .filter(a => a.studentId === studentId && (!type || a.type === type))
      .sort((a, b) => new Date(b.date || b.savedAt) - new Date(a.date || a.savedAt))[0];
  }

  /* ---- 5P-style formulation skeleton from the record ---- */
  function formulation(student) {
    const sessions = Store.db.sessions.filter(s => s.studentId === student.id);
    const phq = latestAssessment(student.id, 'phq9');
    const gad = latestAssessment(student.id, 'gad7');
    const flags = student.riskFlags || [];

    const presenting = student.concern || 'Concern not yet documented.';
    const predisp = [
      student.dob ? 'Developmental stage relevant to age.' : null,
      flags.includes('Family Issues') ? 'Family/home stressors noted.' : null,
      'Premorbid history to be gathered at intake.'
    ].filter(Boolean);
    const precip = sessions[0]?.presentingIssue || 'Trigger to be clarified in session.';
    const perpet = [
      phq && phq.score > 9 ? `Depressive symptoms persisting (PHQ-9 ${phq.score}).` : null,
      gad && gad.score > 9 ? `Anxiety maintaining the cycle (GAD-7 ${gad.score}).` : null,
      flags.includes('Peer Conflict') ? 'Ongoing peer conflict.' : null
    ].filter(Boolean);
    const protect = [
      (student.tags || []).length ? 'Identified strengths/interests on file.' : 'Strengths inventory pending.',
      student.parentName ? 'Engaged guardian contact available.' : null
    ].filter(Boolean);

    return [
      ['Presenting', presenting],
      ['Predisposing', predisp.join(' ')],
      ['Precipitating', precip],
      ['Perpetuating', perpet.length ? perpet.join(' ') : 'No maintaining factors scored yet.'],
      ['Protective', protect.join(' ')]
    ];
  }

  /* ---- one-paragraph session-trend summary ---- */
  function summary(student) {
    const sessions = Store.db.sessions
      .filter(s => s.studentId === student.id)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!sessions.length) return 'No sessions recorded yet for this student.';
    const themes = {};
    sessions.forEach(s => (s.themes || []).forEach(t => themes[t] = (themes[t] || 0) + 1));
    const top = Object.entries(themes).sort((a, b) => b[1] - a[1]).slice(0, 3).map(t => t[0]);
    const phqs = Store.db.assessments
      .filter(a => a.studentId === student.id && a.type === 'phq9')
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    let trend = '';
    if (phqs.length >= 2) {
      const d = phqs[phqs.length - 1].score - phqs[0].score;
      trend = d < 0 ? ` PHQ-9 down ${Math.abs(d)} points since first measure.`
            : d > 0 ? ` PHQ-9 up ${d} points since first measure.`
            : ' PHQ-9 stable across measures.';
    }
    return `${sessions.length} session(s) on record. `
         + (top.length ? `Recurring themes: ${top.join(', ')}.` : 'Themes not yet tagged.')
         + trend
         + (sessions[sessions.length - 1].nextSteps
            ? ` Current plan: ${sessions[sessions.length - 1].nextSteps}` : '');
  }

  /* ---- risk read-out ---- */
  function riskRead(student) {
    const flags = student.riskFlags || [];
    const high = ['Self-Harm', 'Suicidal Ideation', 'Violence Risk', 'Abuse', 'Neglect'];
    const active = flags.filter(f => high.includes(f));
    if (active.length) return { level: 'HIGH', note: `Active safeguarding flags: ${active.join(', ')}. Follow protocol.` };
    if (flags.length) return { level: 'MODERATE', note: `Flags present: ${flags.join(', ')}.` };
    return { level: 'LOW', note: 'No active risk flags on file.' };
  }

  /* optional remote hook (disabled unless a key is set in settings) */
  async function remote(prompt) {
    const key = (Store.settings && Store.settings.apiKey) || null;
    if (!key) return null; // stays offline
    // Intentionally not implemented here to avoid sending data without
    // an explicit, user-configured key + endpoint. Wire your own proxy.
    return null;
  }

  return { formulation, summary, riskRead, remote, latestAssessment };
})();
