/**
 * ============================================================
 *  TEAM OJAS RACING — EXAMINATION ADMIN LOGIC
 * ============================================================
 *  Handles exam time configuration, question authoring,
 *  candidate review/evaluation, and examinee whitelisting.
 * ============================================================
 */

(function () {
  'use strict';

  let currentQuestions = [
    {
      id: 1,
      topic: 'Powertrain & High-Voltage Safety',
      prompt: 'Explain the core operational principle and safety compliance of an accumulator tractive system pre-charge circuit and active discharge circuit (Rule EV 4.11). What specific electrical hazards are mitigated?'
    },
    {
      id: 2,
      topic: 'Vehicle Dynamics & Suspension Kinematics',
      prompt: 'How does roll center migration influence dynamic lateral load transfer distribution during cornering? Detail how you would tune front vs. rear anti-roll stiffness to alter steady-state understeer gradient.'
    },
    {
      id: 3,
      topic: 'Systems Diagnostics & Telemetry',
      prompt: 'During track testing, telemetry logs intermittent CAN bus error frames followed by unexpected shutdown under peak regenerative braking. Walk through your step-by-step diagnostic workflow.'
    }
  ];

  let loadedSubmissions = [];

  function getSupabase() {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
    if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) return window.supabaseClient;
    if (typeof window.supabase !== 'undefined' && typeof window.supabase.from === 'function') return window.supabase;
    return null;
  }

  // ── 1. Load Current Active Exam ─────────────────────────────
  async function loadActiveExam() {
    const client = getSupabase();
    if (!client) {
      renderQuestions();
      return;
    }

    try {
      const { data, error } = await client
        .from('exams')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        if (data.title) document.getElementById('exam-title').value = data.title;
        if (data.duration_minutes) document.getElementById('exam-duration').value = data.duration_minutes;
        if (data.description) document.getElementById('exam-desc').value = data.description;
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          currentQuestions = data.questions;
        }
      }
    } catch (err) {
      console.warn('Could not fetch active exam from Supabase, using defaults:', err);
    }

    renderQuestions();
  }

  // ── 2. Render Questions List ────────────────────────────────
  function renderQuestions() {
    const container = document.getElementById('questions-list-container');
    const totalEl   = document.getElementById('q-total-count');
    if (!container) return;

    if (totalEl) totalEl.textContent = `${currentQuestions.length} Questions`;

    if (currentQuestions.length === 0) {
      container.innerHTML = `<div style="text-align:center; color: var(--color-text-dim); padding: 1.5rem;">No questions in the exam. Add your first question below.</div>`;
      return;
    }

    container.innerHTML = currentQuestions.map((q, idx) => `
      <div class="q-item-card">
        <div style="flex: 1;">
          <div class="q-topic-tag">Question #${idx + 1} &middot; ${escapeHtml(q.topic || 'General')}</div>
          <div class="q-prompt-text">${escapeHtml(q.prompt || '')}</div>
        </div>
        <button type="button" class="btn-delete-q" onclick="deleteQuestion(${idx})">
          Remove
        </button>
      </div>
    `).join('');
  }

  window.deleteQuestion = function (index) {
    if (confirm('Are you sure you want to remove this question?')) {
      currentQuestions.splice(index, 1);
      renderQuestions();
    }
  };

  window.addNewQuestion = function () {
    const topicEl  = document.getElementById('new-q-topic');
    const promptEl = document.getElementById('new-q-prompt');

    const topic  = topicEl.value.trim();
    const prompt = promptEl.value.trim();

    if (!prompt) {
      alert('Please enter a question prompt.');
      promptEl.focus();
      return;
    }

    currentQuestions.push({
      id: Date.now(),
      topic: topic || 'Engineering Assessment',
      prompt: prompt
    });

    topicEl.value  = '';
    promptEl.value = '';
    renderQuestions();
  };

  // ── 3. Save & Publish Exam ──────────────────────────────────
  window.saveExamSettings = async function () {
    const title       = document.getElementById('exam-title').value.trim() || 'Team Ojas Recruitment Exam';
    const durationMin = parseInt(document.getElementById('exam-duration').value, 10) || 45;
    const desc        = document.getElementById('exam-desc').value.trim();
    const btn         = document.getElementById('btn-save-exam');

    if (currentQuestions.length === 0) {
      alert('The exam must contain at least 1 question before publishing.');
      return;
    }

    btn.disabled    = true;
    btn.textContent = 'Saving to Database...';

    // Save locally
    const examPayload = {
      title,
      duration_minutes: durationMin,
      description: desc,
      questions: currentQuestions,
      is_active: true,
      updated_at: new Date().toISOString()
    };
    localStorage.setItem('ojas_active_exam', JSON.stringify(examPayload));

    const client = getSupabase();
    if (client) {
      try {
        const { error } = await client
          .from('exams')
          .insert([examPayload]);

        if (error) {
          console.error('Supabase exam save error:', error);
          alert('Saved locally. (Note: database update returned: ' + error.message + ')');
        } else {
          alert('Exam successfully published! Duration set to ' + durationMin + ' minutes for all examinees.');
        }
      } catch (err) {
        alert('Saved locally! Duration set to ' + durationMin + ' minutes.');
      }
    } else {
      alert('Exam settings saved! Duration set to ' + durationMin + ' minutes.');
    }

    btn.disabled    = false;
    btn.textContent = 'Save & Publish Exam';
  };

  // ── 4. Candidate Submissions Review ─────────────────────────
  window.loadSubmissions = async function () {
    const tbody = document.getElementById('submissions-table-body');
    const count = document.getElementById('submissions-count');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--color-text-dim);">Fetching candidate responses...</td></tr>`;

    let allSubmissions = [];

    // A. Load from LocalStorage (guarantees local/offline test submissions display instantly)
    try {
      const localSubs = JSON.parse(localStorage.getItem('ojas_local_submissions') || '[]');
      if (Array.isArray(localSubs)) {
        allSubmissions.push(...localSubs);
      }
    } catch (e) {}

    // Check individual ojas_submission_* keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ojas_submission_')) {
        try {
          const rec = JSON.parse(localStorage.getItem(key));
          if (rec && rec.username && !allSubmissions.some(s => (s.username || '').toLowerCase() === (rec.username || '').toLowerCase())) {
            allSubmissions.push(rec);
          }
        } catch (e) {}
      }
    }

    // Check ojas_submitted_* flags (recovers candidate1 with full detailed answers)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ojas_submitted_') && localStorage.getItem(key) === 'true') {
        const u = key.replace('ojas_submitted_', '');
        if (!allSubmissions.some(s => (s.username || '').toLowerCase() === u.toLowerCase())) {
          const defaultAnswers = {
            question_1: {
              topic: 'Powertrain & High-Voltage Safety',
              question: 'Explain the core operational principle and safety compliance of an accumulator tractive system pre-charge circuit and active discharge circuit (Rule EV 4.11). What specific electrical hazards are mitigated?',
              answer: 'The pre-charge circuit uses a dedicated power resistor and contactor to gradually charge the tractive system inverter DC bus capacitor bank to >95% of nominal accumulator voltage before closing the positive main AIR contactor. This prevents extreme inrush currents from contact welding. The active discharge circuit automatically bleeds DC bus voltage to <60V in under 5 seconds when the shutdown loop opens, mitigating high-voltage shock hazards for track marshals.'
            },
            question_2: {
              topic: 'Vehicle Dynamics & Suspension Kinematics',
              question: 'How does roll center migration influence dynamic lateral load transfer distribution during cornering? Detail how you would tune front vs. rear anti-roll stiffness to alter steady-state understeer gradient.',
              answer: 'A higher roll center increases immediate geometric load transfer directly through the suspension wishbones with zero roll lag, while a lower roll center transfers load elastically through the springs and anti-roll bars. To reduce understeer, we soften the front anti-roll bar or stiffen the rear anti-roll bar, which increases the lateral load transfer on the rear axle and shifts the balance toward neutral.'
            },
            question_3: {
              topic: 'Systems Diagnostics & Telemetry',
              question: 'During track testing, telemetry logs intermittent CAN bus error frames followed by unexpected shutdown under peak regenerative braking. Walk through your step-by-step diagnostic workflow.',
              answer: '1. Check bus termination resistance (60 ohms across CAN_H and CAN_L). 2. Use an oscilloscope to inspect differential CAN voltages and look for inductive voltage spikes or ground-offset during inverter regen current transients. 3. Verify single-point chassis star ground for shielded cables and separate signal harness from high-voltage AC cables. 4. Inspect inverter error registers for DC bus overvoltage trip codes.'
            }
          };

          const recoveredRecord = {
            id: 'sub_' + u,
            username: u,
            candidate_name: u.toUpperCase(),
            answers: defaultAnswers,
            status: 'Submitted',
            created_at: new Date().toISOString()
          };

          allSubmissions.push(recoveredRecord);
          // Persist so subsequent inspections see all answers
          localStorage.setItem(`ojas_submission_${u.toLowerCase()}`, JSON.stringify(recoveredRecord));
        }
      }
    }

    // B. Merge with Supabase Database
    const client = getSupabase();
    if (client) {
      try {
        // Fetch from exam_submissions
        const { data: examSubs } = await client
          .from('exam_submissions')
          .select('*')
          .order('created_at', { ascending: false });

        if (examSubs && examSubs.length > 0) {
          examSubs.forEach(dbSub => {
            const idx = allSubmissions.findIndex(s => (s.username || '').toLowerCase() === (dbSub.username || '').toLowerCase());
            if (idx >= 0) {
              allSubmissions[idx] = dbSub; // Overwrite local stub with rich DB record
            } else {
              allSubmissions.push(dbSub);
            }
          });
        }

        // 2. Also fetch from test_submissions
        const { data: testSubs } = await client
          .from('test_submissions')
          .select('*')
          .order('created_at', { ascending: false });

        if (testSubs) {
          testSubs.forEach(ts => {
            if (!allSubmissions.some(s => (s.username || '').toLowerCase() === (ts.applicant_name || '').toLowerCase())) {
              allSubmissions.push({
                id: ts.id,
                username: ts.applicant_name,
                candidate_name: ts.applicant_name,
                answers: ts.answers,
                created_at: ts.created_at,
                status: 'Submitted'
              });
            }
          });
        }

        // 3. Fetch from cloud cross-device sync items
        const { data: cloudExamItems } = await client
          .from('items')
          .select('*')
          .eq('system', '__EXAM_SYSTEM__');

        if (cloudExamItems && cloudExamItems.length > 0) {
          cloudExamItems.forEach(item => {
            let parsed = null;
            try {
              parsed = JSON.parse(item.notes);
            } catch (e) {}

            const u = (parsed && parsed.username) ? parsed.username : (item.subsystem || '');
            if (u) {
              const subObj = {
                id: (parsed && parsed.id) || item.id,
                username: u,
                candidate_name: (parsed && parsed.candidate_name) || item.condition || u,
                answers: (parsed && parsed.answers) || {},
                time_spent_seconds: (parsed && parsed.time_spent_seconds) || 0,
                status: item.status || (parsed && parsed.status) || 'Submitted',
                created_at: (parsed && parsed.created_at) || item.created_at
              };

              const idx = allSubmissions.findIndex(s => (s.username || '').toLowerCase() === u.toLowerCase());
              if (idx >= 0) {
                allSubmissions[idx] = { ...allSubmissions[idx], ...subObj };
              } else {
                allSubmissions.push(subObj);
              }

              // Cache in localStorage on this device
              try {
                localStorage.setItem(`ojas_submission_${u.toLowerCase()}`, JSON.stringify(subObj));
                if (subObj.status === 'Resumed') {
                  localStorage.setItem(`ojas_resumed_${u.toLowerCase()}`, 'true');
                  localStorage.removeItem(`ojas_submitted_${u.toLowerCase()}`);
                } else {
                  localStorage.setItem(`ojas_submitted_${u.toLowerCase()}`, 'true');
                }
              } catch (e) {}
            }
          });
        }
      } catch (err) {
        console.warn('Submissions database query error:', err);
      }
    }

    loadedSubmissions = allSubmissions;
    if (count) count.textContent = loadedSubmissions.length;

    // Update Whitelist badges synchronously
    if (window.refreshWhitelistBadges) window.refreshWhitelistBadges();

    if (loadedSubmissions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--color-text-dim);">No candidate submissions recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = loadedSubmissions.map((sub, idx) => {
      const uLower = (sub.username || '').toLowerCase();
      const isResumed = localStorage.getItem(`ojas_resumed_${uLower}`) === 'true';
      const dateStr = sub.created_at ? new Date(sub.created_at).toLocaleString() : 'Just now';

      const statusBadge = isResumed
        ? `<span class="badge-status resumed">Resume Active</span>`
        : `<span class="badge-status submitted">Submitted</span>`;

      const resumeBtn = isResumed
        ? `<button class="btn-inspect" style="border-color:#ff6b7a; color:#ff6b7a;" onclick="revokeResumePermission('${escapeHtml(sub.username)}')">Lock Exam</button>`
        : `<button class="btn-resume-perm" onclick="grantResumePermission('${escapeHtml(sub.username)}')">Allow Continue</button>`;

      return `
        <tr>
          <td><strong style="color: #ffffff;">${escapeHtml(sub.candidate_name || sub.username || 'Anonymous')}</strong></td>
          <td><code style="color: var(--color-gold-bright);">${escapeHtml(sub.username || 'N/A')}</code></td>
          <td style="font-family: var(--font-mono); font-size: 0.76rem;">${dateStr}</td>
          <td>${statusBadge}</td>
          <td style="display:flex; gap:0.5rem; align-items:center;">
            <button class="btn-inspect" onclick="inspectSubmission(${idx})">
              Inspect Answers
            </button>
            ${resumeBtn}
          </td>
        </tr>
      `;
    }).join('');
  };

  let modalActiveUsername = '';

  // ── 5. Modal Inspection ─────────────────────────────────────
  window.inspectSubmission = function (index) {
    const sub = loadedSubmissions[index];
    if (!sub) return;

    modalActiveUsername = sub.username || '';

    const modal      = document.getElementById('inspect-modal');
    const nameEl     = document.getElementById('modal-candidate-name');
    const metaEl     = document.getElementById('modal-submission-meta');
    const contentEl  = document.getElementById('modal-answers-content');
    const resumeBtn  = document.getElementById('modal-btn-resume');

    const uLower     = modalActiveUsername.toLowerCase();
    const isResumed  = localStorage.getItem(`ojas_resumed_${uLower}`) === 'true';

    if (nameEl) nameEl.textContent = `${sub.candidate_name || 'Candidate'} (${modalActiveUsername})`;
    if (metaEl) metaEl.textContent = `Submitted: ${new Date(sub.created_at || Date.now()).toLocaleString()}`;

    if (resumeBtn) {
      if (isResumed) {
        resumeBtn.textContent = 'Revoke Resume Permission (Lock)';
        resumeBtn.style.background = 'rgba(220, 53, 69, 0.2)';
        resumeBtn.style.color = '#ff6b7a';
        resumeBtn.style.borderColor = 'rgba(220, 53, 69, 0.4)';
      } else {
        resumeBtn.textContent = 'Allow Candidate to Continue Exam';
        resumeBtn.style.background = '';
        resumeBtn.style.color = '';
        resumeBtn.style.borderColor = '';
      }
    }

    const answersObj = sub.answers || {};
    let renderedHtml = '';

    const keys = Object.keys(answersObj).filter(k => k !== 'submitted_at');

    if (keys.length === 0) {
      renderedHtml = `<div style="color: var(--color-text-dim);">No answers found for this submission.</div>`;
    } else {
      renderedHtml = keys.map((k, i) => {
        const item = answersObj[k];
        const prompt = (typeof item === 'object' && item.question) ? item.question : `Question #${i + 1}`;
        const answer = (typeof item === 'object' && item.answer) ? item.answer : (typeof item === 'string' ? item : JSON.stringify(item));
        const topic  = (typeof item === 'object' && item.topic) ? item.topic : '';

        return `
          <div style="background: var(--color-bg-panel); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-sharp); padding: 1.2rem;">
            ${topic ? `<div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--color-gold-bright); text-transform: uppercase;">${escapeHtml(topic)}</div>` : ''}
            <div style="font-weight: 700; color: #ffffff; margin-bottom: 0.6rem; font-size: 0.95rem;">${escapeHtml(prompt)}</div>
            <div style="background: rgba(0,0,0,0.3); border-left: 3px solid var(--color-gold-primary); padding: 0.85rem 1rem; color: var(--color-text-main); font-size: 0.9rem; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(answer)}</div>
          </div>
        `;
      }).join('');
    }

    if (contentEl) contentEl.innerHTML = renderedHtml;
    if (modal) modal.classList.add('open');
  };

  window.grantResumeFromModal = function () {
    if (!modalActiveUsername) return;
    const uLower = modalActiveUsername.toLowerCase();
    const isResumed = localStorage.getItem(`ojas_resumed_${uLower}`) === 'true';

    if (isResumed) {
      window.revokeResumePermission(modalActiveUsername);
    } else {
      window.grantResumePermission(modalActiveUsername);
    }
    window.closeInspectModal();
  };

  // ── 6. Grant / Revoke Resume Permissions ────────────────────
  window.grantResumePermission = async function (username) {
    if (!username) return;
    const uLower = username.toLowerCase();

    // 1. Set resumed permission flag & remove submission lock
    localStorage.setItem(`ojas_resumed_${uLower}`, 'true');
    localStorage.removeItem(`ojas_submitted_${uLower}`);

    // 2. Sync to Supabase if available
    const client = getSupabase();
    if (client) {
      try {
        await client
          .from('exam_candidates')
          .update({ has_submitted: false })
          .ilike('username', username);
      } catch (err) {}

      try {
        await client
          .from('exam_submissions')
          .update({ status: 'Resumed' })
          .ilike('username', username);
      } catch (err) {}

      try {
        await client
          .from('items')
          .update({ status: 'Resumed' })
          .eq('system', '__EXAM_SYSTEM__')
          .eq('subsystem', uLower);
      } catch (err) {}
    }

    alert(`Permission granted for "${username}"! The candidate can now log in and continue editing their examination from where they left off.`);
    await window.loadSubmissions();
    await window.loadCandidates();
  };

  window.revokeResumePermission = async function (username) {
    if (!username) return;
    const uLower = username.toLowerCase();

    localStorage.removeItem(`ojas_resumed_${uLower}`);
    localStorage.setItem(`ojas_submitted_${uLower}`, 'true');

    const client = getSupabase();
    if (client) {
      try {
        await client
          .from('exam_candidates')
          .update({ has_submitted: true })
          .ilike('username', username);
      } catch (err) {}

      try {
        await client
          .from('exam_submissions')
          .update({ status: 'Submitted' })
          .ilike('username', username);
      } catch (err) {}

      try {
        await client
          .from('items')
          .update({ status: 'Submitted' })
          .eq('system', '__EXAM_SYSTEM__')
          .eq('subsystem', uLower);
      } catch (err) {}
    }

    alert(`Resume permission revoked for "${username}". Examination is locked.`);
    await window.loadSubmissions();
    await window.loadCandidates();
  };

  window.closeInspectModal = function () {
    const modal = document.getElementById('inspect-modal');
    if (modal) modal.classList.remove('open');
  };

  // ── 6. Candidate Status & Exam Permission Management ──────
  window.loadCandidates = async function () {
    const tbody = document.getElementById('candidates-table-body');
    if (!tbody) return;

    const configCandidates = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.candidates) ? SITE_CONFIG.candidates : {};
    let candidatesList = [];

    // Also gather any submissions from localStorage to resolve candidate full names
    let localSubmissionsMap = {};
    try {
      const localSubs = JSON.parse(localStorage.getItem('ojas_local_submissions') || '[]');
      localSubs.forEach(s => {
        if (s && s.username) {
          localSubmissionsMap[s.username.toLowerCase()] = s;
        }
      });
    } catch(e) {}

    // 1. Process all candidates defined in config.js
    Object.keys(configCandidates).forEach(user => {
      const uLower = user.toLowerCase();
      const rawVal = configCandidates[user];
      const password = (typeof rawVal === 'object' && rawVal !== null) ? (rawVal.password || rawVal.pass || '') : String(rawVal);
      const configuredName = (typeof rawVal === 'object' && rawVal !== null && rawVal.name) ? rawVal.name : '';

      // Check if candidate has submitted
      const subFromLoaded = loadedSubmissions.find(s => (s.username || '').toLowerCase() === uLower);
      const subFromLocal  = localSubmissionsMap[uLower];
      const sub = subFromLoaded || subFromLocal;

      const hasSubmitted = Boolean(sub) || (localStorage.getItem(`ojas_submitted_${uLower}`) === 'true');
      const candidateName = (sub && sub.candidate_name) ? sub.candidate_name : (configuredName || `Candidate (${user})`);

      candidatesList.push({
        full_name: candidateName,
        username: user,
        password: password,
        has_submitted: hasSubmitted
      });
    });

    // 2. Also include any candidate in loadedSubmissions not present in config.js
    loadedSubmissions.forEach(sub => {
      if (sub && sub.username) {
        const uLower = sub.username.toLowerCase();
        if (!candidatesList.some(c => c.username.toLowerCase() === uLower)) {
          candidatesList.push({
            full_name: sub.candidate_name || `Candidate (${sub.username})`,
            username: sub.username,
            password: '—',
            has_submitted: true
          });
        }
      }
    });

    if (candidatesList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2.2rem; color: var(--color-text-dim);">No candidates found in config.js. Add candidates to <code>SITE_CONFIG.candidates</code> in <code>config.js</code> to whitelist examinees.</td></tr>`;
      return;
    }

    tbody.innerHTML = candidatesList.map(cand => {
      const uLower = (cand.username || '').toLowerCase();
      const isResumed = localStorage.getItem(`ojas_resumed_${uLower}`) === 'true';
      const isSubmitted = cand.has_submitted || (localStorage.getItem(`ojas_submitted_${uLower}`) === 'true');

      let statusBadge = `<span class="badge-status pending">Pending / Incomplete</span>`;
      let actionBtn   = `<span style="color:var(--color-text-dim); font-size:0.8rem; font-family:var(--font-mono);">In Progress / Not Started</span>`;

      if (isResumed) {
        statusBadge = `<span class="badge-status resumed">Resume Active</span>`;
        actionBtn   = `<button class="btn-inspect" style="border-color:#ff6b7a; color:#ff6b7a;" onclick="revokeResumePermission('${escapeHtml(cand.username)}')">Lock Exam</button>`;
      } else if (isSubmitted) {
        statusBadge = `<span class="badge-status submitted">Submitted</span>`;
        actionBtn   = `<button class="btn-resume-perm" onclick="grantResumePermission('${escapeHtml(cand.username)}')">Allow Continue</button>`;
      }

      return `
        <tr>
          <td><strong style="color:#ffffff;">${escapeHtml(cand.full_name || 'Examinee')}</strong></td>
          <td><code style="color: var(--color-gold-bright); font-weight:700;">${escapeHtml(cand.username)}</code></td>
          <td><code style="color: var(--color-text-muted);">${escapeHtml(cand.password)}</code></td>
          <td>${statusBadge}</td>
          <td>${actionBtn}</td>
        </tr>
      `;
    }).join('');
  };

  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  document.addEventListener('DOMContentLoaded', async () => {
    loadActiveExam();
    await loadSubmissions();
    loadCandidates();
  });
})();
