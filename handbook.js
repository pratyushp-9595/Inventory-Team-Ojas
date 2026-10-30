/**
 * ============================================================
 *  TEAM OJAS RACING — HANDBOOK CLIENT-SIDE LOGIC
 * ============================================================
 *  - Supabase client data fetching for 'handbook_tasks'
 *  - Grouping and filtering by department
 *  - Interactive accordion expansion for unlocked tasks
 *  - Locked visual states and interaction guards
 * ============================================================
 */

(function () {
  'use strict';

  // ── Global State ──────────────────────────────────────────
  const DEPARTMENTS = [
    'Vehicle Dynamics',
    'Powertrain',
    'Aerodynamics',
    'Chassis',
    'Electrical',
    'Extras'
  ];

  let currentDepartment = 'Vehicle Dynamics';
  let allTasks = [];
  let tasksByDept = {};

  // ── Fallback Dataset (Used if offline or table unseeded) ───
  const FALLBACK_TASKS = [
    {
      id: 'fb-vd-1',
      department: 'Vehicle Dynamics',
      task_number: 1,
      title: 'Double Wishbone Suspension Geometry & Roll Center',
      questions: '1. Define the instant center of rotation for front and rear suspension.\n2. How does the roll center migration impact dynamic weight transfer?\n3. Calculate the front roll center height for a track width of 1200mm with 3° camber gain.',
      links: 'https://www.racecar-engineering.com/tech-explained/suspension-kinematics/\nhttps://en.wikipedia.org/wiki/Roll_center',
      is_unlocked: true
    },
    {
      id: 'fb-vd-2',
      department: 'Vehicle Dynamics',
      task_number: 2,
      title: 'Tire Data Analysis & Pacejka Magic Formula',
      questions: '1. Explain the coefficients B, C, D, and E in the Pacejka model.\n2. How do tire inflation pressures affect relaxation length and cornering stiffness?\n3. Derive slip angle curves from TTC (Tire Test Consortium) raw test data.',
      links: 'https://www.millikenresearch.com/rcvd.html',
      is_unlocked: true
    },
    {
      id: 'fb-vd-3',
      department: 'Vehicle Dynamics',
      task_number: 3,
      title: 'Damper Dyno Testing & Frequency Response',
      questions: '1. Differentiate between low-speed damping and high-speed damping for kerb strikes.\n2. Calculate the sprung mass natural frequency for front and rear axles (target: 2.2 Hz - 2.5 Hz).\n3. What is the effect of asymmetric bump/rebound ratio on chassis pitch?',
      links: 'https://kaztechnologies.com/damper-basics/',
      is_unlocked: false
    },
    {
      id: 'fb-pt-1',
      department: 'Powertrain',
      task_number: 1,
      title: 'Tractive System Inverter Selection & DC Bus Sizing',
      questions: '1. Calculate root-mean-square (RMS) phase current requirements for peak acceleration.\n2. Evaluate DC-link capacitor ripple current rating and thermal degradation.\n3. Verify gate drive isolation voltage rating meets FS rules (> 2x max tractive system voltage).',
      links: 'https://www.sevcon.com/\nhttps://www.ti.com/lit/wp/slyy112/slyy112.pdf',
      is_unlocked: true
    },
    {
      id: 'fb-pt-2',
      department: 'Powertrain',
      task_number: 2,
      title: 'Accumulator Cell Chemistry & Cooling Loop Design',
      questions: '1. Compare pouch cells vs cylindrical 21700 cells in terms of gravimetric energy density.\n2. Design the forced-air or liquid cold plate jacket for 400V 8kWh pack under continuous 120A discharge.\n3. Explain the battery thermal runaway containment compliance per Rule EV 4.5.',
      links: 'https://batteryuniversity.com/article/bu-204-how-do-lithium-batteries-work',
      is_unlocked: true
    },
    {
      id: 'fb-pt-3',
      department: 'Powertrain',
      task_number: 3,
      title: 'Planetary vs Spur Gear Reduction Optimization',
      questions: '1. Calculate target total reduction ratio considering motor maximum RPM and vehicle top speed.\n2. Perform AGMA bending and contact stress calculations for pinion and crown gears.\n3. Model driveline backlash and impact on regenerative braking stability.',
      links: null,
      is_unlocked: false
    },
    {
      id: 'fb-aero-1',
      department: 'Aerodynamics',
      task_number: 1,
      title: 'Multi-Element Front Wing Ground Effect Modeling',
      questions: '1. Explain slot gap and flap overlap optimization for preventing boundary layer separation.\n2. How does ride height variation in pitch and roll affect downforce balance?\n3. Run ANSYS Fluent mesh independence study with k-omega SST turbulence model.',
      links: 'https://www.cfd-online.com/Wiki/SST_k-omega_model\nhttps://www.simscale.com/blog/aerodynamics-formula-student/',
      is_unlocked: true
    },
    {
      id: 'fb-aero-2',
      department: 'Aerodynamics',
      task_number: 2,
      title: 'Diffuser Expansion Angle & Venturi Geometry',
      questions: '1. What is the critical diffuser ramp angle before onset of stall?\n2. How do side skirt vortex generators isolate underfloor low pressure from wheel wake?\n3. Calculate ground effect downforce contribution relative to total vehicle aerodynamic package.',
      links: 'https://www.racecar-engineering.com/articles/f1/diffusers-explained/',
      is_unlocked: true
    },
    {
      id: 'fb-aero-3',
      department: 'Aerodynamics',
      task_number: 3,
      title: 'Active DRS Wing Actuation & Fail-Safe Mechanism',
      questions: '1. Detail the pneumatic or servo mechanical linkage for DRS flap deployment.\n2. How must the default mechanical spring return guarantee high-downforce position upon power loss (FS Rule EV 3.1)?\n3. Quantify aerodynamic drag reduction percentage and straight-line time delta.',
      links: null,
      is_unlocked: false
    },
    {
      id: 'fb-ch-1',
      department: 'Chassis',
      task_number: 1,
      title: 'Tubular Spaceframe Torsional Rigidity FEA',
      questions: '1. Formulate the boundary conditions and torque couple application for torsional stiffness testing.\n2. What is the target torsional rigidity (Nm/degree) relative to the roll stiffness of suspension?\n3. Perform beam element vs shell element correlation in SolidWorks / ANSYS Mechanical.',
      links: 'https://www.fsaeonline.com/',
      is_unlocked: true
    },
    {
      id: 'fb-ch-2',
      department: 'Chassis',
      task_number: 2,
      title: 'Impact Attenuator Structural Testing & SES Validation',
      questions: '1. Review the Structural Equivalency Spreadsheet (SES) requirements for front bulkhead.\n2. Calculate the average and peak deceleration during a 7 m/s impact with a 300kg total test vehicle mass.\n3. Present test coupon crush energy absorption curves.',
      links: 'https://www.formulabharat.com/downloads/',
      is_unlocked: true
    },
    {
      id: 'fb-ch-3',
      department: 'Chassis',
      task_number: 3,
      title: 'Carbon Fiber Monocoque Laminate Schedule & Sandwich Core',
      questions: '1. Determine the ply layup schedule (0/90, ±45 biaxial) and prepreg cure cycle.\n2. Calculate shear strength of Rohacell / Nomex honeycomb core under 3-point bend test.\n3. Detail hard-point suspension mounting insert pull-out shear strength analysis.',
      links: null,
      is_unlocked: false
    },
    {
      id: 'fb-el-1',
      department: 'Electrical',
      task_number: 1,
      title: 'BMS (Battery Management System) Voltage & Temp Sensing',
      questions: '1. Explain isolation barrier requirements between high voltage tractive system and low voltage ground.\n2. Configure LTC6811/LTC6813 daisy-chain SPI communications with optocouplers/isoSPI.\n3. How does the BMS trigger the Shutdown Circuit via AMS fault detection?',
      links: 'https://www.analog.com/en/products/ltc6811-1.html',
      is_unlocked: true
    },
    {
      id: 'fb-el-2',
      department: 'Electrical',
      task_number: 2,
      title: 'Tractive System Pre-Charge & Discharge Circuitry',
      questions: '1. Calculate precharge resistor power rating and thermal mass for 400V bus within 2.0 seconds.\n2. Design the automatic passive/active tractive system discharge circuit (must discharge < 60V in under 5 seconds).\n3. Detail the safety interlock and status LED indicator circuit compliance.',
      links: 'https://www.ti.com/lit/an/slyt734/slyt734.pdf',
      is_unlocked: false
    },
    {
      id: 'fb-el-3',
      department: 'Electrical',
      task_number: 3,
      title: 'CAN Bus Architecture, Baud Rate & Telemetry Sniffing',
      questions: '1. Structure CAN DBC files for wheel speed sensors, throttle APPS, inverter RPM, and cell voltages.\n2. Calculate bus load utilization at 500kbps vs 1Mbps with 20Hz and 100Hz priority nodes.\n3. Configure termination resistors and differential transceiver protection against EMI.',
      links: 'https://www.kvaser.com/can-protocol-tutorial/',
      is_unlocked: false
    },
    {
      id: 'fb-ex-1',
      department: 'Extras',
      task_number: 1,
      title: 'Formula Bharat / FSAE Cost Report & BOM Strategy',
      questions: '1. How is the Real Cost table structured according to the latest Cost Understanding regulations?\n2. Document machining and manufacturing process multipliers for custom fabricated suspension bellcranks.\n3. Prepare tooling, fast-turn prototyping, and supplier audit documentation.',
      links: 'https://www.formulastudent.de/events/rules/',
      is_unlocked: true
    },
    {
      id: 'fb-ex-2',
      department: 'Extras',
      task_number: 2,
      title: 'Driver Ergonomics, Pedal Box APPS Calibration & E-Kill Switches',
      questions: '1. Explain dual sensor APPS (Accelerator Pedal Position Sensor) plausibility check rule (<10% deviation).\n2. What are the biomechanical angles for formula cockpit seating per 95th percentile male driver template?\n3. Design mechanical interlock for brake pedal over-travel switch (BOTS).',
      links: null,
      is_unlocked: false
    }
  ];

  // ── Helper: Resolve Supabase Client Instance ──────────────
  function getSupabase() {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
    if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) return window.supabaseClient;
    if (typeof window.supabase !== 'undefined' && typeof window.supabase.from === 'function') return window.supabase;
    return null;
  }

  // ── 1. Fetch Handbook Tasks from Supabase ─────────────────
  async function fetchHandbookTasks() {
    const client = getSupabase();
    const tasksContainer = document.getElementById('handbook-tasks-container');

    // Show initial skeleton loaders while fetching
    if (tasksContainer) {
      renderSkeleton(tasksContainer);
    }

    if (!client) {
      console.warn('[Handbook] Supabase client not initialized or running in fallback mode. Using local seed curriculum.');
      processTasks(FALLBACK_TASKS);
      return;
    }

    try {
      const { data, error } = await client
        .from('handbook_tasks')
        .select('*')
        .order('task_number', { ascending: true });

      if (error) {
        console.warn('[Handbook] Supabase query returned error:', error.message);
        processTasks(FALLBACK_TASKS);
      } else if (!data || data.length === 0) {
        console.info('[Handbook] No handbook rows found in Supabase. Rendering default curriculum.');
        processTasks(FALLBACK_TASKS);
      } else {
        console.log(`[Handbook] Loaded ${data.length} tasks successfully from Supabase.`);
        processTasks(data);
      }
    } catch (err) {
      console.error('[Handbook] Unexpected fetch exception:', err);
      processTasks(FALLBACK_TASKS);
    }
  }

  // ── 2. Group & Process Tasks ──────────────────────────────
  function processTasks(tasks) {
    allTasks = tasks || [];
    tasksByDept = {};

    // Initialize map for all expected departments
    DEPARTMENTS.forEach(dept => {
      tasksByDept[dept] = [];
    });

    // Populate tasks
    allTasks.forEach(task => {
      const dept = task.department || 'Extras';
      if (!tasksByDept[dept]) {
        tasksByDept[dept] = [];
      }
      tasksByDept[dept].push(task);
    });

    // Sort each department by task_number ascending
    Object.keys(tasksByDept).forEach(dept => {
      tasksByDept[dept].sort((a, b) => (a.task_number || 0) - (b.task_number || 0));
    });

    updateSidebarBadges();
    renderDepartmentTasks(currentDepartment);
  }

  // ── 3. Update Sidebar Task Counts ─────────────────────────
  function updateSidebarBadges() {
    DEPARTMENTS.forEach(dept => {
      const badge = document.querySelector(`.sidebar-count-badge[data-dept="${dept}"]`);
      if (badge) {
        const deptTasks = tasksByDept[dept] || [];
        const unlockedCount = deptTasks.filter(t => t.is_unlocked).length;
        badge.textContent = `${unlockedCount}/${deptTasks.length}`;
        badge.title = `${unlockedCount} of ${deptTasks.length} tasks unlocked`;
      }
    });
  }

  // ── 4. Render Tasks for Selected Department ───────────────
  function renderDepartmentTasks(department) {
    currentDepartment = department;

    // Update section banner titles & stats
    const titleEl = document.getElementById('current-dept-title');
    const countEl = document.getElementById('current-dept-stats');
    if (titleEl) {
      titleEl.innerHTML = `<span class="gold-accent">${escapeHtml(department)}</span> MODULE`;
    }

    const tasks = tasksByDept[department] || [];
    const unlockedCount = tasks.filter(t => t.is_unlocked).length;

    if (countEl) {
      countEl.innerHTML = `<strong>${unlockedCount}</strong> of <strong>${tasks.length}</strong> Tasks Unlocked`;
    }

    // Update active class on sidebar department buttons
    document.querySelectorAll('.sidebar-btn[data-dept]').forEach(btn => {
      const isActive = btn.getAttribute('data-dept') === department;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    const container = document.getElementById('handbook-tasks-container');
    if (!container) return;

    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="handbook-empty-state">
          <div class="empty-state-title">No Modules Published Yet</div>
          <p class="empty-state-desc">There are currently no tasks listed under the ${escapeHtml(department)} department. Check back soon or verify Supabase handbook_tasks table.</p>
        </div>
      `;
      return;
    }

    // Render interactive accordion components
    container.innerHTML = tasks.map(task => renderTaskAccordion(task)).join('');

    // Attach click events for unlocked tasks
    attachAccordionListeners(container);
  }

  // ── 5. HTML Template for Task Accordion ───────────────────
  function renderTaskAccordion(task) {
    const isUnlocked = Boolean(task.is_unlocked);
    const lockedClass = isUnlocked ? '' : 'is-locked';
    const taskNumFormatted = String(task.task_number || 1).padStart(2, '0');

    // Status Badge & Padlock icon for locked tasks
    const statusBadge = isUnlocked
      ? `
        <span class="badge-status unlocked">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          UNLOCKED
        </span>
      `
      : `
        <span class="badge-status locked" title="Module locked. Prerequisite tasks required.">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          LOCKED
        </span>
      `;

    // Parse links string into clickable pill buttons
    const linksHtml = parseLinksToHtml(task.links);

    return `
      <article class="task-accordion-card ${lockedClass}" data-task-id="${escapeHtml(task.id || '')}" data-unlocked="${isUnlocked}">
        <header class="task-accordion-header" role="button" tabindex="${isUnlocked ? '0' : '-1'}" aria-expanded="false">
          <div class="task-header-left">
            <span class="task-num-badge">#${taskNumFormatted}</span>
            <h2 class="task-title" title="${escapeHtml(task.title || '')}">${escapeHtml(task.title || 'Untitled Task')}</h2>
          </div>
          <div class="task-header-right">
            ${statusBadge}
            <svg class="accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </header>

        <div class="task-accordion-body">
          <div class="task-content-inner">
            <div class="task-section-block">
              <div class="task-block-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Study Questions & Technical Milestones
              </div>
              <div class="task-questions-box">${formatQuestions(task.questions)}</div>
            </div>

            <div class="task-section-block">
              <div class="task-block-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
                Engineering References & Links
              </div>
              <div class="task-links-group">
                ${linksHtml}
              </div>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  // ── 6. Accordion Interactivity & Locked Guards ────────────
  function attachAccordionListeners(container) {
    const cards = container.querySelectorAll('.task-accordion-card');

    cards.forEach(card => {
      const isUnlocked = card.getAttribute('data-unlocked') === 'true';
      const header = card.querySelector('.task-accordion-header');

      if (!isUnlocked) {
        // Locked tasks cannot be expanded: click is disabled
        return;
      }

      const toggleAccordion = () => {
        const isOpen = card.classList.contains('is-open');

        // Toggle open state on clicked card
        card.classList.toggle('is-open', !isOpen);
        if (header) {
          header.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
        }
      };

      if (header) {
        header.addEventListener('click', toggleAccordion);
        header.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleAccordion();
          }
        });
      }
    });
  }

  // ── 7. Helper: Format Questions & Links ────────────────────
  function formatQuestions(text) {
    if (!text) return '<span class="task-links-empty">No specific questions entered for this task.</span>';
    return escapeHtml(text);
  }

  function parseLinksToHtml(rawLinks) {
    if (!rawLinks || !rawLinks.trim()) {
      return '<span class="task-links-empty">No external reference links provided for this module.</span>';
    }

    // Split on newlines, commas, or spaces containing URLs
    const urls = rawLinks
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (urls.length === 0) {
      return '<span class="task-links-empty">No reference links provided.</span>';
    }

    return urls.map(url => {
      const safeUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
      let displayLabel = url.replace(/^https?:\/\/(www\.)?/, '');
      if (displayLabel.length > 40) {
        displayLabel = displayLabel.slice(0, 37) + '...';
      }

      return `
        <a class="task-link-pill" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(url)}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
          <span>${escapeHtml(displayLabel)}</span>
        </a>
      `;
    }).join('');
  }

  function renderSkeleton(container) {
    container.innerHTML = `
      <div class="tasks-accordion-list">
        <div class="handbook-skeleton"></div>
        <div class="handbook-skeleton" style="opacity: 0.7;"></div>
        <div class="handbook-skeleton" style="opacity: 0.4;"></div>
      </div>
    `;
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

  // ── 8. Initialize Sidebar Event Listeners ──────────────────
  function setupSidebarNavigation() {
    // Department switch buttons
    document.querySelectorAll('.sidebar-btn[data-dept]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const dept = btn.getAttribute('data-dept');
        if (dept && dept !== currentDepartment) {
          renderDepartmentTasks(dept);

          // On mobile, scroll smoothly to content area
          if (window.innerWidth <= 960) {
            const contentBanner = document.getElementById('handbook-content-anchor');
            if (contentBanner) {
              contentBanner.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }
      });
    });

    // Rulebook navigation button
    const rulebookNav = document.getElementById('sidebar-nav-rulebook');
    if (rulebookNav) {
      rulebookNav.addEventListener('click', (e) => {
        e.preventDefault();
        const section = document.getElementById('rulebook-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'center' });
          section.style.transition = 'outline 0.3s ease, transform 0.2s ease';
          section.style.outline = '2px solid var(--color-gold-bright)';
          setTimeout(() => {
            section.style.outline = 'none';
          }, 1500);
        }
      });
    }

    // Rulebook Download placeholder button
    const downloadBtn = document.getElementById('btn-download-rulebook');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Formula Student Electric Rulebook 2025 (Official Team Ojas Edition) — Downloading PDF package...');
      });
    }
  }

  // ── 9. DOM Ready Initialization ───────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    setupSidebarNavigation();
    fetchHandbookTasks();
  });

})();
