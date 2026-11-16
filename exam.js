/**
 * ============================================================
 *  TEAM OJAS RACING — CANDIDATE EXAM EXECUTION SCRIPT
 * ============================================================
 *  - Dynamic active exam rendering
 *  - Configurable countdown timer set by team members
 *  - Enforced single-submission rule per candidate username
 *  - Safe logout & auto-submission on expiration
 * ============================================================
 */

(function () {
  'use strict';

  let examData = {
    title: 'Formula Student Electric Engineering Recruitment Exam',
    description: 'Complete the technical inquiries below. Answers are logged directly to the team database upon submission.',
    duration_minutes: 45,
    questions: [
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
    ]
  };

  let timerInterval = null;
  let remainingSeconds = 45 * 60;
  const currentUsername = (sessionStorage.getItem('logged_in_user') || 'Candidate').trim();

  function getSupabase() {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
    if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) return window.supabaseClient;
    if (typeof window.supabase !== 'undefined' && typeof window.supabase.from === 'function') return window.supabase;
    return null;
  }

  // ── 1. Check If Already Submitted ───────────────────────────
  async function checkSubmissionStatus() {
    const userLower = currentUsername.toLowerCase();
    
    // Check if permission to continue was granted by team member
    const isResumed = localStorage.getItem(`ojas_resumed_${userLower}`) === 'true';
    if (isResumed) {
      console.log(`[Exam] Permission to continue active for ${currentUsername}. Session unlocked.`);
      return false; // Allowed to continue!
    }

    let hasSubmitted = localStorage.getItem(`ojas_submitted_${userLower}`) === 'true';

    const client = getSupabase();
    if (!hasSubmitted && client && currentUsername !== 'Candidate') {
      try {
        const { data } = await client
          .from('exam_submissions')
          .select('id, created_at, status')
          .ilike('username', currentUsername)
          .eq('status', 'Submitted');

        if (data && data.length > 0) {
          hasSubmitted = true;
          localStorage.setItem(`ojas_submitted_${userLower}`, 'true');
        }
      } catch (err) {
        console.warn('Could not verify submission history:', err);
      }
    }

    if (hasSubmitted) {
      document.getElementById('exam-form-wrapper').style.display = 'none';
      document.getElementById('timer-bar').style.display = 'none';
      document.getElementById('screen-already-submitted').style.display = 'block';
      const blockedEl = document.getElementById('blocked-cand-user');
      if (blockedEl) blockedEl.textContent = currentUsername;
      return true;
    }
    return false;
  }

  // ── 2. Fetch Active Exam & Time Setting ──────────────────────
  async function fetchActiveExam() {
    // Check localStorage cache first
    const cachedExam = localStorage.getItem('ojas_active_exam');
    if (cachedExam) {
      try {
        const parsed = JSON.parse(cachedExam);
        if (parsed.questions && parsed.questions.length > 0) examData = parsed;
      } catch (e) {}
    }

    // Fetch live exam configuration from Supabase
    const client = getSupabase();
    if (client) {
      try {
        const { data, error } = await client
          .from('exams')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          examData.title = data.title || examData.title;
          examData.description = data.description || examData.description;
          examData.duration_minutes = data.duration_minutes || examData.duration_minutes;
          if (Array.isArray(data.questions) && data.questions.length > 0) {
            examData.questions = data.questions;
          }
        }
      } catch (err) {
        console.warn('Active exam fetch failed, using default questions:', err);
      }
    }

    // Render Title & Description
    const titleEl = document.getElementById('active-exam-title');
    const descEl  = document.getElementById('active-exam-desc');
    if (titleEl) titleEl.textContent = examData.title;
    if (descEl) descEl.textContent = examData.description;

    renderQuestions();
    initTimer();
  }

  // ── 3. Render Question Inputs ───────────────────────────────
  function renderQuestions() {
    const container = document.getElementById('dynamic-questions-container');
    if (!container) return;

    container.innerHTML = examData.questions.map((q, idx) => `
      <div class="q-block">
        <div class="q-label">Question #${idx + 1} &middot; ${escapeHtml(q.topic || 'Engineering')}</div>
        <div class="q-prompt">${escapeHtml(q.prompt || '')}</div>
        <textarea
          id="exam-q-${idx}"
          data-topic="${escapeHtml(q.topic || '')}"
          data-prompt="${escapeHtml(q.prompt || '')}"
          rows="5"
          placeholder="Enter your technical response, calculations, or engineering methodology..."
          required
        ></textarea>
      </div>
    `).join('');

    restorePreviousAnswers();
    attachDraftAutoSave();
  }

  // Restore previously saved answers or draft when resuming
  function restorePreviousAnswers() {
    const userLower = currentUsername.toLowerCase();
    let prevSubmission = null;
    let draft = null;

    try {
      const stored = localStorage.getItem(`ojas_submission_${userLower}`);
      if (stored) prevSubmission = JSON.parse(stored);
    } catch (e) {}

    try {
      const storedDraft = localStorage.getItem(`ojas_draft_${userLower}`);
      if (storedDraft) draft = JSON.parse(storedDraft);
    } catch (e) {}

    const source = draft || (prevSubmission ? prevSubmission.answers : null);

    if (source) {
      // Pre-fill candidate full name
      const nameInput = document.getElementById('candidate-full-name');
      if (nameInput && prevSubmission && prevSubmission.candidate_name) {
        nameInput.value = prevSubmission.candidate_name;
      }

      // Pre-fill each textarea
      examData.questions.forEach((q, idx) => {
        const ta = document.getElementById(`exam-q-${idx}`);
        if (!ta) return;
        const key = `question_${idx + 1}`;
        const prevAnswer = (source[key] && source[key].answer) ? source[key].answer : (source[key] || '');
        if (prevAnswer && typeof prevAnswer === 'string') {
          ta.value = prevAnswer;
        }
      });

      // Show resume alert banner if permission was granted
      const isResumed = localStorage.getItem(`ojas_resumed_${userLower}`) === 'true';
      const resumeNotice = document.getElementById('resume-notice-banner');
      if (resumeNotice && isResumed) {
        resumeNotice.style.display = 'block';
      }
    }
  }

  // Real-time draft auto-save
  function attachDraftAutoSave() {
    const userLower = currentUsername.toLowerCase();
    examData.questions.forEach((q, idx) => {
      const ta = document.getElementById(`exam-q-${idx}`);
      if (ta) {
        ta.addEventListener('input', () => {
          const draftAnswers = {};
          examData.questions.forEach((qInner, innerIdx) => {
            const innerTa = document.getElementById(`exam-q-${innerIdx}`);
            draftAnswers[`question_${innerIdx + 1}`] = {
              topic: qInner.topic || 'Engineering',
              question: qInner.prompt || '',
              answer: innerTa ? innerTa.value : ''
            };
          });
          localStorage.setItem(`ojas_draft_${userLower}`, JSON.stringify(draftAnswers));
        });
      }
    });
  }

  // ── 4. Countdown Timer Engine ───────────────────────────────
  function initTimer() {
    const totalMinutes = parseInt(examData.duration_minutes, 10) || 45;

    // Check if session had a stored start
    const storedRemaining = sessionStorage.getItem(`ojas_exam_remaining_${currentUsername.toLowerCase()}`);
    if (storedRemaining !== null && !isNaN(parseInt(storedRemaining, 10))) {
      remainingSeconds = parseInt(storedRemaining, 10);
    } else {
      remainingSeconds = totalMinutes * 60;
    }

    updateTimerDisplay();

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      remainingSeconds--;
      sessionStorage.setItem(`ojas_exam_remaining_${currentUsername.toLowerCase()}`, remainingSeconds.toString());
      updateTimerDisplay();

      if (remainingSeconds <= 0) {
        clearInterval(timerInterval);
        handleAutoSubmit();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const displayEl = document.getElementById('timer-countdown');
    const pillEl    = document.getElementById('timer-display-pill');
    if (!displayEl) return;

    const clampedSec = Math.max(0, remainingSeconds);
    const hrs = Math.floor(clampedSec / 3600);
    const mins = Math.floor((clampedSec % 3600) / 60);
    const secs = clampedSec % 60;

    const formatted = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    displayEl.textContent = formatted;

    // Warning styling when under 5 minutes
    if (pillEl) {
      pillEl.classList.toggle('warning', clampedSec <= 300);
    }
  }

  // ── 5. Submit Handler ───────────────────────────────────────
  async function submitExam(e, isAutoSubmit = false) {
    if (e) e.preventDefault();

    const fullNameInput = document.getElementById('candidate-full-name');
    let fullName = fullNameInput ? fullNameInput.value.trim() : '';
    if (!fullName) {
      fullName = (currentUsername && currentUsername !== 'Candidate') ? currentUsername : 'Candidate';
    }

    if (!isAutoSubmit && !fullNameInput?.value?.trim()) {
      alert('Please enter your full name before submitting.');
      if (fullNameInput) fullNameInput.focus();
      return;
    }

    const answersPayload = {};
    let hasUnanswered = false;

    examData.questions.forEach((q, idx) => {
      const ta = document.getElementById(`exam-q-${idx}`);
      let val = ta ? ta.value.trim() : '';

      // If field was untouched or empty, check if saved in draft
      if (!val) {
        try {
          const draftObj = JSON.parse(localStorage.getItem(`ojas_draft_${currentUsername.toLowerCase()}`) || '{}');
          if (draftObj[`question_${idx + 1}`] && draftObj[`question_${idx + 1}`].answer) {
            val = draftObj[`question_${idx + 1}`].answer.trim();
          }
        } catch (err) {}
      }

      if (!val) hasUnanswered = true;

      answersPayload[`question_${idx + 1}`] = {
        topic: q.topic || 'Engineering',
        question: q.prompt || '',
        answer: val
      };
    });

    if (hasUnanswered && e && !isAutoSubmit) {
      if (!confirm('You have one or more blank answers. Are you sure you want to submit your examination now?')) {
        return;
      }
    }

    const submitBtn = document.getElementById('btn-submit-exam');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = isAutoSubmit ? 'Auto-Submitting Responses...' : 'Transmitting Responses...';
    }

    clearInterval(timerInterval);

    const client = getSupabase();
    const submissionRecord = {
      id: 'sub_' + Date.now(),
      username: currentUsername,
      candidate_name: fullName,
      answers: answersPayload,
      time_spent_seconds: (examData.duration_minutes * 60) - Math.max(0, remainingSeconds),
      status: 'Submitted',
      created_at: new Date().toISOString()
    };

    // ── 1. ALWAYS persist to LocalStorage first (Guarantees no data loss) ──
    try {
      let localSubs = [];
      try {
        localSubs = JSON.parse(localStorage.getItem('ojas_local_submissions') || '[]');
      } catch (e) {
        localSubs = [];
      }
      // Remove any prior entry by this username and append newest
      localSubs = localSubs.filter(s => (s.username || '').toLowerCase() !== currentUsername.toLowerCase());
      localSubs.unshift(submissionRecord);
      localStorage.setItem('ojas_local_submissions', JSON.stringify(localSubs));
      localStorage.setItem(`ojas_submission_${currentUsername.toLowerCase()}`, JSON.stringify(submissionRecord));
      localStorage.setItem(`ojas_submitted_${currentUsername.toLowerCase()}`, 'true');
      localStorage.removeItem(`ojas_resumed_${currentUsername.toLowerCase()}`);
      localStorage.removeItem(`ojas_draft_${currentUsername.toLowerCase()}`);
    } catch (err) {
      console.warn('LocalStorage write error:', err);
    }

    // ── 2. Sync to Supabase Database ──────────────────────────
    if (client) {
      try {
        await client.from('exam_submissions').insert([submissionRecord]);
        // Also update candidate status if present in candidates table
        await client
          .from('exam_candidates')
          .update({ has_submitted: true })
          .ilike('username', currentUsername);
      } catch (err) {
        console.warn('Supabase submission log error (saved locally):', err);
      }
    }

    sessionStorage.removeItem(`ojas_exam_remaining_${currentUsername.toLowerCase()}`);

    if (isAutoSubmit) {
      // Automatic submit upon timer expiration: log out candidate immediately
      sessionStorage.clear();
      localStorage.removeItem('ojas_access');
      alert('Examination time has expired! Your responses have been automatically submitted, and your session has ended.');
      window.location.replace('index.html?reason=time_expired');
      return;
    }

    // Show Success Screen for manual submit
    document.getElementById('exam-form-wrapper').style.display = 'none';
    document.getElementById('timer-bar').style.display = 'none';
    document.getElementById('screen-success').style.display = 'block';
    const candNameEl = document.getElementById('success-cand-name');
    if (candNameEl) candNameEl.textContent = fullName;
  }

  function handleAutoSubmit() {
    submitExam(null, true);
  }

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
    const badge = document.getElementById('examinee-user-badge');
    if (badge) badge.textContent = currentUsername;

    const nameInput = document.getElementById('candidate-full-name');
    if (nameInput && currentUsername && currentUsername !== 'Candidate') {
      nameInput.value = currentUsername;
    }

    const alreadySubmitted = await checkSubmissionStatus();
    if (!alreadySubmitted) {
      await fetchActiveExam();
      const form = document.getElementById('candidate-exam-form');
      if (form) form.addEventListener('submit', submitExam);
    }
  });
})();
