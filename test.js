/**
 * ============================================================
 *  TEAM OJAS RACING — RECRUITMENT TEST SUBMISSION LOGIC
 * ============================================================
 *  Handles collecting applicant answers, formatting into JSONB,
 *  and inserting the evaluation entry into Supabase `test_submissions`.
 * ============================================================
 */

(function () {
  'use strict';

  // Helper: Retrieve Supabase Client Instance
  function getSupabase() {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
    if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) return window.supabaseClient;
    if (typeof window.supabase !== 'undefined' && typeof window.supabase.from === 'function') return window.supabase;
    return null;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form            = document.getElementById('applicant-test-form');
    const formWrapper     = document.getElementById('test-form-wrapper');
    const successCard     = document.getElementById('test-success-card');
    const errorBox        = document.getElementById('test-error-box');
    const errorText       = document.getElementById('test-error-text');
    const submitBtn       = document.getElementById('btn-submit-assessment');
    const nameInput       = document.getElementById('applicant-name');
    const q1Input         = document.getElementById('q1');
    const q2Input         = document.getElementById('q2');
    const q3Input         = document.getElementById('q3');
    const successNameEl   = document.getElementById('success-candidate-name');

    // Pre-populate name if logged in via Gateway
    const savedName = localStorage.getItem('ojas_applicant_name') || sessionStorage.getItem('logged_in_user');
    if (savedName && nameInput && !nameInput.value) {
      nameInput.value = savedName;
    }

    function showError(msg) {
      if (errorText) errorText.textContent = msg;
      if (errorBox) errorBox.classList.add('visible');
    }

    function hideError() {
      if (errorBox) errorBox.classList.remove('visible');
    }

    [nameInput, q1Input, q2Input, q3Input].forEach(el => {
      if (el) el.addEventListener('input', hideError);
    });

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const applicantName = nameInput.value.trim();
      const ans1 = q1Input.value.trim();
      const ans2 = q2Input.value.trim();
      const ans3 = q3Input.value.trim();

      // Validation
      if (!applicantName || !ans1 || !ans2 || !ans3) {
        showError('Please provide your name and complete all 3 technical questions before submitting.');
        return;
      }

      // Structure answers into a clean JSONB payload
      const answersPayload = {
        question_1: {
          topic: 'Powertrain & High-Voltage Safety',
          question: 'Explain the core operational principle and safety compliance of an accumulator tractive system pre-charge circuit and active discharge circuit (Rule EV 4.11). What specific electrical hazards are mitigated?',
          answer: ans1
        },
        question_2: {
          topic: 'Vehicle Dynamics & Kinematics',
          question: 'How does roll center migration influence dynamic lateral load transfer distribution during cornering? Detail how you would tune front vs. rear anti-roll stiffness to alter steady-state understeer gradient.',
          answer: ans2
        },
        question_3: {
          topic: 'Systems Integration & Troubleshooting',
          question: 'During track testing, telemetry logs intermittent CAN bus error frames followed by unexpected shutdown under peak regenerative braking. Walk through your step-by-step diagnostic workflow.',
          answer: ans3
        },
        submitted_at: new Date().toISOString()
      };

      const client = getSupabase();

      if (!client) {
        showError('Supabase database client is not configured. Please contact the Team Ojas administrator.');
        return;
      }

      // Indicate loading state
      submitBtn.disabled = true;
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: spin 1s linear infinite;">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg>
        Transmitting Answers...
      `;

      try {
        const { data, error } = await client
          .from('test_submissions')
          .insert([
            {
              applicant_name: applicantName,
              answers: answersPayload
            }
          ]);

        if (error) {
          console.error('[Assessment] Supabase submission error:', error);
          showError(`Submission failed: ${error.message || 'Please check your connection and retry.'}`);
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        } else {
          // Successful submission
          if (formWrapper) formWrapper.style.display = 'none';
          if (successCard) successCard.style.display = 'block';
          if (successNameEl) successNameEl.textContent = applicantName;
          console.log('[Assessment] Submission recorded successfully.');
        }
      } catch (err) {
        console.error('[Assessment] Unexpected exception:', err);
        showError('A network error occurred while submitting. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
  });
})();
