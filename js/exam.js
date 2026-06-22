// js/exam.js — Full worker exam flow

// ── STATE ────────────────────────────────────────────────
const state = {
  employee: null,
  questions: [],
  answers: {},       // { q_id: answer }
  currentIdx: 0,
  deviceHash: null,
  deviceMode: 'strict', // read from settings at exam start
  timerInterval: null,
  timeLeft: 0,
  totalDuration: 1800, // default 30 mins in seconds
  submitted: false,
};

// (PASS_THRESHOLD is now dynamically loaded from DB into state.passThreshold)
// ── DOM REFS ─────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── PARTICLES ────────────────────────────────────────────
function createParticles() {
  const container = $('particles');
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 14 + 5;
    p.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${Math.random() * 100}%;
      animation-duration: ${Math.random() * 18 + 10}s;
      animation-delay: ${Math.random() * 15}s;
      opacity: ${Math.random() * 0.3 + 0.05};
    `;
    container.appendChild(p);
  }
}

// ── SCREEN MANAGEMENT ────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = $(id);
  if (el) el.classList.add('active');
}

// ── TOAST ────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const container = $('toast-container');
  const t = document.createElement('div');
  const icons = { success: '✓', error: '✗', warning: '⚠️', info: 'ℹ' };
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => {
    t.classList.add('removing');
    setTimeout(() => t.remove(), 350);
  }, 3500);
}

// ── SAP LOOKUP ───────────────────────────────────────────
async function lookupSAP(sap) {
  if (!sap || sap.length < 4) {
    hideEmpInfo();
    $('start-btn').disabled = true;
    return;
  }

  const { data, error } = await db
    .from('employees')
    .select('id, sap, name, department_id, status, device_block, exam_allowed, departments(name)')
    .eq('sap', sap)
    .maybeSingle();

  if (!data || error) {
    hideEmpInfo();
    $('start-btn').disabled = true;
    return;
  }

  state.employee = data;
  $('emp-name').textContent = data.name;
  $('emp-dept').textContent = data.departments?.name || 'غير محدد';
  $('emp-info').classList.add('visible');
  $('start-btn').disabled = false;
}

function hideEmpInfo() {
  $('emp-info').classList.remove('visible');
  state.employee = null;
}

// ── LOGIN / START EXAM ───────────────────────────────────
async function startExam() {
  const sap  = $('sap-input').value.trim();
  const pass = $('pass-input').value.trim();

  if (!sap || !pass) {
    showLoginError('يرجى إدخال رقم SAP وكلمة المرور.');
    return;
  }

  if (!state.employee || state.employee.sap !== sap) {
    showLoginError('رقم SAP غير موجود.');
    return;
  }

  // Show loading
  showScreen('loading-screen');
  $('loading-msg').textContent = 'جارٍ التحقق من بياناتك...';

  // 1. Verify password securely by selecting only the password column
  const { data: employeeData, error: dbErr } = await db
    .from('employees')
    .select('password')
    .eq('sap', sap)
    .maybeSingle();

  if (dbErr || !employeeData || employeeData.password !== pass) {
    showScreen('login-screen');
    showLoginError('كلمة المرور غير صحيحة.');
    return;
  }

  // 2. Check SAP status
  if (state.employee.status === 0) {
    showBlock('🔒', 'حساب موقوف', 'تم إيقاف حسابك مؤقتاً. يرجى التواصل مع المهندس المسؤول.');
    return;
  }

  if (state.employee.device_block) {
    showBlock('🚫', 'جهاز محظور', 'هذا الجهاز مرتبط بحساب آخر. يرجى التواصل مع المهندس المسؤول.');
    return;
  }

  // 3. Check if exam is allowed
  if (!state.employee.exam_allowed) {
    showBlock('✅', 'تم تسجيل اختبارك', 'لقد أجريت هذا الاختبار مسبقاً. لا يُسمح بأكثر من محاولة واحدة. يرجى مراجعة المسؤول.');
    return;
  }

  // 4. Device fingerprint
  $('loading-msg').textContent = 'جارٍ التحقق من الجهاز...';
  state.deviceHash = await getDeviceHash();

  // Read all admin settings
  const { data: settingsData } = await db
    .from('settings')
    .select('key, value');

  const settingsMap = {};
  (settingsData || []).forEach(s => { settingsMap[s.key] = s.value; });

  state.deviceMode = settingsMap.device_check_mode || 'strict';
  const durationMinutes = parseInt(settingsMap.exam_duration) || 30;
  state.totalDuration = durationMinutes * 60;
  state.timeLeft = state.totalDuration;
  state.passThreshold = parseInt(settingsMap.pass_threshold) || 70;

  const deviceCheck = await checkDevice(state.deviceHash, sap, state.deviceMode);
  if (!deviceCheck.allowed) {
    showBlock('🔒', 'جهاز غير مصرح', deviceCheck.reason);
    return;
  }

  // 5. Load questions
  $('loading-msg').textContent = 'جارٍ تحميل الأسئلة...';
  const loaded = await loadQuestions(state.employee.department_id);
  if (!loaded) {
    showScreen('login-screen');
    showLoginError('لم يتم تهيئة اختبار لقسمك. تواصل مع المسؤول.');
    return;
  }

  // 6. Start exam
  hideLoginError();
  renderExam();
  startTimer();
  showScreen('exam-screen');
}

function showLoginError(msg) {
  const el = $('login-error');
  el.textContent = msg;
  el.style.display = 'block';
}
function hideLoginError() {
  $('login-error').style.display = 'none';
}

function showBlock(icon, title, msg) {
  $('block-icon').textContent = icon;
  $('block-title').textContent = title;
  $('block-msg').textContent = msg;
  showScreen('block-screen');
}

// ── LOAD QUESTIONS ────────────────────────────────────────
async function loadQuestions(departmentId) {
  // Fetch department config (which categories and how many)
  const { data: configs } = await db
    .from('deptconfig')
    .select('category, count')
    .eq('department_id', departmentId);

  if (!configs || configs.length === 0) return false;

  const allQuestions = [];

  for (const cfg of configs) {
    // Fetch a capped pool for efficiency, then shuffle client-side.
    // Answers are never fetched here — the Edge Function handles scoring.
    const fetchLimit = Math.max(cfg.count * 3, 30);
    const { data: qs } = await db.rpc('get_random_questions_pool', {
      p_category: cfg.category,
      p_limit: fetchLimit
    });

    if (!qs || qs.length === 0) continue;

    // Shuffle and take required count
    const shuffled = qs.sort(() => Math.random() - 0.5);
    allQuestions.push(...shuffled.slice(0, cfg.count));
  }

  if (allQuestions.length === 0) return false;

  // Shuffle final set
  state.questions = allQuestions.sort(() => Math.random() - 0.5);
  return true;
}

// ── RENDER EXAM ──────────────────────────────────────────
function renderExam() {
  const container = $('questions-container');
  container.innerHTML = '';

  state.questions.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.id = `q-card-${idx}`;
    card.style.display = idx === 0 ? 'block' : 'none';

    let optionsHTML = '';
    if (q.type === 'mcq') {
      const opts = [
        { key: 'A', text: q.opt_a },
        { key: 'B', text: q.opt_b },
        { key: 'C', text: q.opt_c },
        { key: 'D', text: q.opt_d },
      ].filter(o => o.text);

      optionsHTML = `<div class="options-grid">
        ${opts.map(o => `
          <button class="option-btn" data-idx="${idx}" data-ans="${o.key}"
                  onclick="selectAnswer(${idx}, '${o.key}', this)">
            <span class="option-letter">${o.key}</span>
            <span>${o.text}</span>
          </button>
        `).join('')}
      </div>`;
    } else {
      optionsHTML = `<div class="tf-grid">
        <button class="tf-btn tf-true" data-idx="${idx}" data-ans="1"
                onclick="selectAnswer(${idx}, '1', this)">✔ صح</button>
        <button class="tf-btn tf-false" data-idx="${idx}" data-ans="0"
                onclick="selectAnswer(${idx}, '0', this)">✘ خطأ</button>
      </div>`;
    }

    card.innerHTML = `
      <div class="question-number">
        <span>السؤال ${idx + 1} من ${state.questions.length}</span>
        <span class="question-category-badge">${q.category}</span>
        <span class="question-category-badge" style="background:rgba(41,128,185,0.2);color:#7ec8e3;">
          ${q.type === 'mcq' ? 'اختيار متعدد' : 'صح / خطأ'}
        </span>
      </div>
      <div class="question-text">${q.question}</div>
      ${optionsHTML}
    `;

    container.appendChild(card);

    // Stagger animation
    setTimeout(() => card.classList.add('visible'), idx * 80);
  });

  updateExamNav();
}

function selectAnswer(idx, ans, btn) {
  state.answers[state.questions[idx].q_id] = ans;

  // Deselect all in this question
  const card = $(`q-card-${idx}`);
  card.querySelectorAll('.option-btn, .tf-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  $('unanswered-warning').style.display = 'none';
}

// ── EXAM NAVIGATION ──────────────────────────────────────
function updateExamNav() {
  const total = state.questions.length;
  const idx   = state.currentIdx;

  // Progress
  $('progress-label').textContent = `السؤال ${idx + 1} / ${total}`;
  const pct = ((idx + 1) / total) * 100;
  $('progress-bar').style.width = pct + '%';

  // Buttons
  $('prev-btn').disabled = idx === 0;
  const isLast = idx === total - 1;
  $('next-btn').style.display = isLast ? 'none' : 'inline-flex';
  $('submit-btn').style.display = isLast ? 'inline-flex' : 'none';
}

function showQuestion(idx) {
  const cards = document.querySelectorAll('.question-card');
  cards.forEach((c, i) => c.style.display = i === idx ? 'block' : 'none');
  state.currentIdx = idx;
  updateExamNav();
}

$('prev-btn').addEventListener('click', () => {
  if (state.currentIdx > 0) showQuestion(state.currentIdx - 1);
});

$('next-btn').addEventListener('click', () => {
  if (state.currentIdx < state.questions.length - 1) showQuestion(state.currentIdx + 1);
});

// ── TIMER ────────────────────────────────────────────────
function startTimer() {
  updateTimerDisplay();

  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    updateTimerDisplay();

    if (state.timeLeft <= 0) {
      clearInterval(state.timerInterval);
      submitExam(true);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const mins = Math.floor(state.timeLeft / 60).toString().padStart(2, '0');
  const secs = (state.timeLeft % 60).toString().padStart(2, '0');
  $('timer-display').textContent = `${mins}:${secs}`;

  // Arc
  const total   = state.totalDuration || 1800;
  const pct     = state.timeLeft / total;
  const circ    = 2 * Math.PI * 39;
  const offset  = circ * (1 - pct);
  $('timer-arc').style.strokeDashoffset = offset;

  // Color transitions
  const ring = $('timer-ring');
  ring.classList.remove('warning', 'critical');
  if (state.timeLeft < 120) ring.classList.add('critical');
  else if (state.timeLeft < 300) ring.classList.add('warning');
}

// ── SUBMIT ───────────────────────────────────────────────
$('submit-btn').addEventListener('click', () => submitExam(false));

async function submitExam(forced = false) {
  if (state.submitted) return;

  // Check unanswered
  const answered = Object.keys(state.answers).length;
  if (!forced && answered < state.questions.length) {
    $('unanswered-warning').style.display = 'block';
    // Jump to first unanswered
    const unansweredIdx = state.questions.findIndex(q => !state.answers[q.q_id]);
    if (unansweredIdx >= 0) showQuestion(unansweredIdx);
    return;
  }

  state.submitted = true;
  clearInterval(state.timerInterval);

  showScreen('loading-screen');
  $('loading-msg').textContent = 'جارٍ حساب النتيجة...';

  // Build responses payload
  const responses = state.questions.map(q => ({
    q_id: q.q_id,
    answer: state.answers[q.q_id] || '',
    department_name: state.employee.departments?.name || '',
  }));

  try {
    // Use Database RPC for secure scoring without Edge Function
    const { data: result, error: rpcErr } = await db.rpc('score_exam_db', {
      p_sap: state.employee.sap,
      p_password: document.getElementById('pass-input').value.trim(),
      p_department_id: state.employee.department_id,
      p_responses: responses,
      p_device_hash: state.deviceHash
    });

    if (rpcErr) {
      showBlock('⚠️', 'خطأ', rpcErr.message || 'حدث خطأ أثناء الإرسال. يرجى التواصل مع المسؤول.');
      return;
    }

    showResult(result);
  } catch (err) {
    console.error('Scoring request failed:', err);
    state.submitted = false; // Allow the worker to retry
    showScreen('login-screen');
    showLoginError('تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مجدداً.');
  }
}

async function scoreLocally(responses) {
  // Fetch answers for scored questions
  const q_ids = state.questions.map(q => q.q_id);
  const { data: qs } = await db
    .from('questions')
    .select('q_id, answer')
    .in('q_id', q_ids);

  if (!qs) {
    showBlock('⚠️', 'خطأ', 'تعذر احتساب النتيجة. يرجى التواصل مع المسؤول.');
    return;
  }

  const answerMap = new Map(qs.map(q => [q.q_id, q.answer]));
  let score = 0;
  const scoredResponses = [];
  const deptName = state.employee.departments?.name || '';

  for (const q of state.questions) {
    const employeeAnswer = state.answers[q.q_id] || '';
    const correctAnswer  = answerMap.get(q.q_id) || '';
    const is_correct     = employeeAnswer === correctAnswer;
    if (is_correct) score++;

    scoredResponses.push({
      sap: state.employee.sap,
      department_name: deptName,
      q_id: q.q_id,
      question_text: q.question,
      category: q.category,
      type: q.type === 'mcq' ? 'MCQ' : 'TF',
      employee_answer: employeeAnswer,
      correct_answer: correctAnswer,
      is_correct,
    });
  }

  const total   = state.questions.length;
  const percent = Math.round((score / total) * 100);
  const passed  = percent >= (state.passThreshold || 70);

  // Save result
  const { data: savedResult } = await db.from('results').insert({
    sap: state.employee.sap,
    name: state.employee.name,
    department_id: state.employee.department_id,
    department_name: deptName,
    score, total, percent, passed,
    device_hash: state.deviceHash,
  }).select().single();

  if (savedResult) {
    await db.from('responses').insert(
      scoredResponses.map(r => ({ ...r, result_id: savedResult.id }))
    );
    // Register device
    await db.from('devices').upsert({
      device_hash: state.deviceHash,
      sap: state.employee.sap,
    }, { onConflict: 'device_hash' });
  }

  showResult({ score, total, percent, passed, name: state.employee.name, department_name: deptName });
}

// ── RESULT DISPLAY ───────────────────────────────────────
function showResult(result) {
  const { score, total, percent, passed } = result;

  const circle  = $('score-circle');
  const verdict = $('result-verdict');
  const details = $('result-details');

  circle.className = `score-circle ${passed ? 'pass' : 'fail'}`;
  verdict.className = `result-verdict ${passed ? 'pass' : 'fail'}`;
  verdict.textContent = passed ? '🎉 ناجح' : '😔 لم تنجح هذه المرة';
  details.textContent = `أجبت على ${score} من ${total} سؤالاً بشكل صحيح`;

  // Animate percent counter
  let current = 0;
  const target = percent;
  const step   = Math.ceil(target / 40);
  const interval = setInterval(() => {
    current = Math.min(current + step, target);
    $('score-percent').textContent = current + '%';
    if (current >= target) clearInterval(interval);
  }, 35);

  showScreen('result-screen');

  if (passed) {
    setTimeout(launchConfetti, 400);
  }
}

// ── CONFETTI ─────────────────────────────────────────────
function launchConfetti() {
  const container = $('confetti-container');
  const colors = ['#e8b84b','#1a7a4a','#2980b9','#c0392b','#8e44ad','#ffffff'];

  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const color = colors[Math.floor(Math.random() * colors.length)];
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${color};
      width: ${Math.random() * 8 + 6}px;
      height: ${Math.random() * 12 + 8}px;
      animation: confettiFall ${Math.random() * 2 + 1.5}s ${Math.random() * 1}s ease-in forwards;
      transform: rotate(${Math.random() * 360}deg);
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    container.appendChild(piece);
  }

  setTimeout(() => container.innerHTML = '', 4000);
}

// ── SAP INPUT DEBOUNCE ───────────────────────────────────
let sapTimer = null;
$('sap-input').addEventListener('input', e => {
  clearTimeout(sapTimer);
  hideLoginError();
  sapTimer = setTimeout(() => lookupSAP(e.target.value.trim()), 500);
});

$('pass-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') startExam();
});

$('start-btn').addEventListener('click', startExam);

// ── INIT ─────────────────────────────────────────────────
createParticles();
