// js/manager.js — Manager dashboard (read-only, 4 tabs)

// Disable datalabels globally — only PDF export charts enable it explicitly
Chart.defaults.plugins.datalabels = { display: false };

const $ = id => document.getElementById(id);

let allResults = [];
let allEmployees = [];
let allDepts = [];

let managerDepts = [];

// ── TABS ──────────────────────────────────────────────────
function showTab(tabId) {
  if (!managerUser) return; // Wait until loaded
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  $(`panel-${tabId}`)?.classList.add('active');
  document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');

  const titles = {
    results:    'لوحة النتائج',
    notassessed:'غير المقيَّمين',
    analysis:   'تحليل الأسئلة',
    deptreport: 'تقارير الأقسام',
  };
  $('page-title').textContent = titles[tabId] || '';

  const loaders = {
    results:     loadResults,
    notassessed: loadNotAssessed,
    analysis:    loadAnalysis,
    deptreport:  loadDeptReport,
  };
  loaders[tabId]?.();
}

// Toast
function toast(msg, type = 'info') {
  const c = $('toast-container');
  const t = document.createElement('div');
  const icons = { success:'✓', error:'✗', warning:'⚠️', info:'ℹ' };
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]||'ℹ'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 350); }, 3500);
}

function skeletonRows(cols, count = 5) {
  return Array.from({ length: count }, () =>
    `<tr>${Array.from({ length: cols }, () =>
      `<td><div class="skeleton" style="height:18px;margin:auto;width:80%;"></div></td>`
    ).join('')}</tr>`
  ).join('');
}

function countUp(el, target, suffix = '') {
  if (!el) return;
  let cur = 0;
  const step = Math.max(1, Math.ceil(target / 40));
  const iv = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur + suffix;
    if (cur >= target) clearInterval(iv);
  }, 30);
}

// ────────────────────────────────────────────────────────────
// TAB 1: RESULTS DASHBOARD
// ────────────────────────────────────────────────────────────
let chartBar, chartLine, chartDonut;

let managerUser = null;

async function loadResults() {
  if (!managerUser) managerUser = await window.getCurrentUser();
  if (managerDepts.length === 0 && managerUser.department) {
    managerDepts = managerUser.department.split(',');
  }

  if ($('mgr-res-dept')) $('mgr-res-dept').textContent = managerDepts.length > 1 ? '(عدة أقسام)' : `(${managerDepts[0] || ''})`;

  const [{ data: results }, { data: emps }] = await Promise.all([
    db.from('results').select('*').in('department_name', managerDepts).order('submitted_at', { ascending: false }),
    db.from('employees').select('id, sap, name, department_id, departments(name)'),
  ]);

  allResults   = results   || [];
  allEmployees = (emps || []).filter(e => managerDepts.includes(e.departments?.name));
  allDepts     = managerDepts.map(name => ({ name }));

  applyGlobalDeptFilter(); // This will render everything based on the filter
}

window.applyGlobalDeptFilter = function() {
  const selectedDept = $('global-mgr-dept')?.value || '';
  
  const filteredResults = selectedDept ? allResults.filter(r => r.department_name === selectedDept) : allResults;
  const filteredEmployees = selectedDept ? allEmployees.filter(e => e.departments?.name === selectedDept) : allEmployees;

  // Refresh current tab data
  if (window.currentManagerTab === 'results' || !window.currentManagerTab) {
    renderResultsDashboard(filteredResults, filteredEmployees);
  } else if (window.currentManagerTab === 'notassessed') {
    // Need to trigger re-render of not assessed
    const assessedSaps = new Set(filteredResults.map(r => r.sap));
    const notAssessed = filteredEmployees.filter(e => !assessedSaps.has(e.sap)).map(e => ({
      sap: e.sap, name: e.name, dept_name: e.departments?.name || selectedDept || '-',
    }));
    renderNotAssessed(notAssessed);
    window._notAssessed = notAssessed;
  } else if (window.currentManagerTab === 'analysis') {
    // Reload analysis filtering
    window.filterAnalysis && window.filterAnalysis();
  } else if (window.currentManagerTab === 'deptreport') {
    // Reload dept report data
    if (window.loadDeptReportData) window.loadDeptReportData();
  }
};

function renderResultsDashboard(results, employees) {
  const total      = results.length;
  const passed     = results.filter(r => r.passed).length;
  const passRate   = total ? Math.round((passed / total) * 100) : 0;
  const avgScore   = total ? Math.round(results.reduce((s,r) => s + r.percent, 0) / total) : 0;
  const notAssessed = employees.length - total;

  countUp($('kpi-total'),    total);
  countUp($('kpi-pass'),     passRate, '%');
  countUp($('kpi-avg'),      avgScore, '%');
  countUp($('kpi-not'),      Math.max(0, notAssessed));

  renderResultsTable(results);
  renderBarChart(results, allDepts);
}

function filterResults() {
  const dept   = $('res-dept-filter')?.value || '';
  const passed = $('res-pass-filter')?.value || '';
  const from   = $('res-date-from')?.value;
  const to     = $('res-date-to')?.value;

  const selectedDept = $('global-mgr-dept')?.value || '';
  const listToFilter = selectedDept ? allResults.filter(r => r.department_name === selectedDept) : allResults;

  const filtered = listToFilter.filter(r => {
    const md = !dept || r.department_name === dept;
    const mp = !passed || String(r.passed) === passed;
    const mf = !from   || new Date(r.submitted_at) >= new Date(from);
    const mt = !to     || new Date(r.submitted_at) <= new Date(to + 'T23:59:59');
    return md && mp && mf && mt;
  });

  renderResultsTable(filtered);
}

window.exportManagerExcel = function() {
  const selectedDept = $('global-mgr-dept')?.value || '';
  const filteredResults = selectedDept ? allResults.filter(r => r.department_name === selectedDept) : allResults;
  if (window.exportResults) window.exportResults(filteredResults);
};

window.filterAnalysis = function() {
  const cat = $('analysis-cat-filter')?.value || '';
  const correctness = $('analysis-correctness-filter')?.value || '';
  const selectedDept = $('global-mgr-dept')?.value || '';

  const listToFilter = selectedDept ? window.allAnalysisResponses.filter(r => r.department_name === selectedDept) : window.allAnalysisResponses;

  const filtered = listToFilter.filter(r => {
    const mc = !cat || r.category === cat;
    let mCorr = true;
    if (correctness === 'true') mCorr = (String(r.is_correct) === 'true' || r.is_correct === true);
    if (correctness === 'false') mCorr = (String(r.is_correct) === 'false' || r.is_correct === false);
    return mc && mCorr;
  });

  renderAnalysisTable(filtered);
};

function renderResultsTable(list) {
  const tbody = $('res-tbody');
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
      <div class="empty-icon">📊</div><p>لا توجد نتائج</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(r => `
    <tr>
      <td>${r.name}</td>
      <td class="en">${r.sap}</td>
      <td>${r.department_name}</td>
      <td class="en">${r.score}/${r.total}</td>
      <td class="en">${r.percent}%</td>
      <td>
        <span class="badge ${r.passed ? 'badge-success' : 'badge-danger'}">
          ${r.passed ? 'ناجح' : 'راسب'}
        </span>
      </td>
      <td class="en" style="font-size:0.8rem;">${new Date(r.submitted_at).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' })}</td>
    </tr>
  `).join('');
}

function renderBarChart(results, depts) {
  const canvas = $('chart-bar');
  if (!canvas) return;
  if (chartBar) chartBar.destroy();

  const deptNames = depts.map(d => d.name);
  const passData  = deptNames.map(d => results.filter(r => r.department_name === d && r.passed).length);
  const failData  = deptNames.map(d => results.filter(r => r.department_name === d && !r.passed).length);

  chartBar = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: deptNames,
      datasets: [
        { label: 'ناجح', data: passData, backgroundColor: '#1a7a4a', borderRadius: 5 },
        { label: 'راسب', data: failData, backgroundColor: '#c0392b', borderRadius: 5 },
      ]
    },
    options: {
      responsive: true,
      animation: false,
      plugins: { legend: { position: 'top' } },
      scales: { x: { stacked: false }, y: { beginAtZero: true } }
    }
  });
}


// ────────────────────────────────────────────────────────────
// TAB 2: NOT ASSESSED
// ────────────────────────────────────────────────────────────
async function loadNotAssessed() {
  const tbody = $('not-tbody');
  if (!tbody) return;
  tbody.innerHTML = skeletonRows(3);

  if (!managerUser) managerUser = await window.getCurrentUser();
  if (managerDepts.length === 0 && managerUser.department) {
    managerDepts = managerUser.department.split(',');
  }

  if ($('mgr-not-dept')) $('mgr-not-dept').textContent = managerDepts.length > 1 ? '(عدة أقسام)' : `(${managerDepts[0] || ''})`;

  if (!allEmployees.length) {
    const [{ data: emps }, { data: results }] = await Promise.all([
      db.from('employees').select('id, sap, name, department_id, departments!inner(name)').in('departments.name', managerDepts),
      db.from('results').select('sap, department_name').in('department_name', managerDepts),
    ]);
    allEmployees = emps     || [];
    allResults   = results  || [];
  }

  applyGlobalDeptFilter();
}

function renderNotAssessed(list) {
  const tbody = $('not-tbody');
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state">
      <div class="empty-icon">✅</div><p>جميع الموظفين أجروا الاختبار!</p></div></td></tr>`;
    return;
  }

  const displayLimit = 200;
  const limitedList = list.slice(0, displayLimit);

  tbody.innerHTML = limitedList.map(e => `
    <tr><td>${e.name}</td><td class="en">${e.sap}</td><td>${e.dept_name}</td></tr>
  `).join('');

  if (list.length > displayLimit) {
    const extraRow = document.createElement('tr');
    extraRow.innerHTML = `<td colspan="3" style="text-align:center; padding:1rem; font-size:0.85rem; color:var(--text-muted);">
      تم عرض أول ${displayLimit} موظف لتسريع الأداء. يوجد ${list.length - displayLimit} موظف آخر. لتصفح الجميع يرجى استخدام زر التصدير (Excel).
    </td>`;
    tbody.appendChild(extraRow);
  }
}

function filterNotAssessed() {
  // Filters removed for manager, just render the list
  const list = window._notAssessed || [];
  renderNotAssessed(list);
}

// ────────────────────────────────────────────────────────────
// TAB 3: QUESTION ANALYSIS
// ────────────────────────────────────────────────────────────
let analysisData = [];
let analysisChartInst;

async function loadAnalysis() {
  const tbody = $('analysis-tbody');
  if (!tbody) return;
  tbody.innerHTML = skeletonRows(8);

  if (!managerUser) managerUser = await window.getCurrentUser();
  if (managerDepts.length === 0 && managerUser.department) {
    managerDepts = managerUser.department.split(',');
  }

  const selectStr = 'sap, q_id, question_text, category, type, employee_answer, correct_answer, is_correct, department_name, submitted_at, results(attempt_number, score, total, passed)';
  
  // Fetch first chunk of responses, employees, and questions in parallel
  const [ resObj, { data: emps }, { data: qs } ] = await Promise.all([
    db.from('responses')
      .select(selectStr)
      .in('department_name', managerDepts)
      .range(0, 999),
    db.from('employees').select('id, sap, name, department_id, departments(name)').range(0, 999),
    db.from('questions').select('q_id, type, opt_a, opt_b, opt_c, opt_d')
  ]);

  let allEmps = emps || [];
  if (allEmps.length === 1000) {
    let start = 1000;
    const limit = 1000;
    while (true) {
      const { data, error } = await db.from('employees')
        .select('id, sap, name, department_id, departments(name)')
        .range(start, start + limit - 1);
      if (error) {
        console.error('Error fetching more employees:', error);
        break;
      }
      if (!data || data.length === 0) break;
      allEmps = allEmps.concat(data);
      if (data.length < limit) break;
      start += limit;
    }
  }

  window.allQuestionsData = qs || [];

  // Update global allEmployees if not populated yet
  if (!allEmployees || allEmployees.length === 0) {
    allEmployees = allEmps.filter(e => managerDepts.includes(e.departments?.name));
  }

  let responses = resObj.data || [];
  if (responses.length === 1000) {
    let start = 1000;
    const limit = 1000;
    while (true) {
      const { data, error } = await db.from('responses')
        .select(selectStr)
        .in('department_name', managerDepts)
        .range(start, start + limit - 1);
      if (error) {
        console.error('Error fetching more responses:', error);
        break;
      }
      if (!data || data.length === 0) break;
      responses = responses.concat(data);
      if (data.length < limit) break;
      start += limit;
    }
  }

  window.allAnalysisResponses = responses;

  if (!responses?.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
      <div class="empty-icon">📉</div><p>لا توجد بيانات كافية</p></div></td></tr>`;
    return;
  }

  const qMap = {};
  responses.forEach(r => {
    if (!qMap[r.q_id]) {
      qMap[r.q_id] = { q_id: r.q_id, question: r.question_text, category: r.category, type: r.type, attempts: 0, correct: 0, wrong: 0, wrongAnswers: {} };
    }
    qMap[r.q_id].attempts++;
    if (r.is_correct) {
      qMap[r.q_id].correct++;
    } else {
      qMap[r.q_id].wrong++;
      if (r.type === 'mcq') {
        const wa = r.employee_answer;
        qMap[r.q_id].wrongAnswers[wa] = (qMap[r.q_id].wrongAnswers[wa] || 0) + 1;
      }
    }
  });

  analysisData = Object.values(qMap)
    .map(q => {
      let topWrong = '-';
      if (q.type === 'mcq' && Object.keys(q.wrongAnswers).length > 0) {
        let maxCount = 0;
        let maxKey = '';
        for (let k in q.wrongAnswers) {
          if (q.wrongAnswers[k] > maxCount) {
            maxCount = q.wrongAnswers[k];
            maxKey = k;
          }
        }
        let qq = (window.allQuestionsData || []).find(x => x.q_id === q.q_id);
        let topAnsText = maxKey;
        if (qq) {
          if (maxKey === 'A') topAnsText = qq.opt_a;
          else if (maxKey === 'B') topAnsText = qq.opt_b;
          else if (maxKey === 'C') topAnsText = qq.opt_c;
          else if (maxKey === 'D') topAnsText = qq.opt_d;
        }
        let pct = q.wrong > 0 ? Math.round((maxCount/q.wrong)*100) : 0;
        topWrong = topAnsText + ' (' + pct + '%)';
      }
      return { ...q, top_wrong: topWrong, success_rate: Math.round((q.correct / q.attempts) * 100) };
    })
    .sort((a, b) => a.success_rate - b.success_rate);

  renderAnalysisTable(analysisData);
  renderAnalysisBarChart(analysisData.slice(0, 10));
}

window.exportAnalysisReport = function() {
  const selectedDept = $('global-mgr-dept')?.value || '';
  const listToFilter = selectedDept ? window.allAnalysisResponses.filter(r => r.department_name === selectedDept) : window.allAnalysisResponses;

  const responses = listToFilter || [];

  const empMap = {};
  allEmployees.forEach(e => {
    empMap[e.sap] = e.name;
  });

  const qLookupMap = {};
  (window.allQuestionsData || []).forEach(q => {
    qLookupMap[q.q_id] = q;
  });

  const detailedAttempts = responses.map(r => {
    const empName = empMap[r.sap] || '-';
    const q = qLookupMap[r.q_id];
    let realEmpAns = r.employee_answer;
    let realCorrectAns = r.correct_answer;
    
    if (r.type === 'mcq' || (q && q.type === 'mcq')) {
      const map = {
        'A': q ? q.opt_a : 'A',
        'B': q ? q.opt_b : 'B',
        'C': q ? q.opt_c : 'C',
        'D': q ? q.opt_d : 'D',
      };
      realEmpAns = map[r.employee_answer] || r.employee_answer;
      realCorrectAns = map[r.correct_answer] || r.correct_answer;
    }

    return {
      sap: r.sap,
      name: empName,
      dept: r.department_name,
      q_id: r.q_id,
      question: r.question_text,
      category: r.category,
      type: r.type === 'mcq' ? 'MCQ' : 'صح/خطأ',
      emp_ans: realEmpAns,
      correct_ans: realCorrectAns,
      result: r.is_correct ? 'صح ✓' : 'خطأ ✗',
      date: new Date(r.submitted_at).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }),
      attempt: r.results?.attempt_number || 1,
      score: r.results?.score !== undefined ? `${r.results.score}/${r.results.total}` : '-',
      passed: r.results?.passed !== undefined ? (r.results.passed ? 'ناجح' : 'راسب') : '-',
    };
  });

  exportQuestionAnalysis(analysisData, detailedAttempts);
};

function renderAnalysisTable(list) {
  const tbody = $('analysis-tbody');
  if (!tbody) return;

  tbody.innerHTML = list.map(q => {
    const rateClass = q.success_rate < 50 ? 'rate-row-red' : q.success_rate < 70 ? 'rate-row-orange' : 'rate-row-green';
    const barClass  = q.success_rate < 50 ? 'low' : q.success_rate < 70 ? 'mid' : '';
    return `
      <tr class="${rateClass}">
        <td class="en">${q.q_id}</td>
        <td style="text-align:right;max-width:200px;font-size:0.85rem;">${q.question}</td>
        <td>${q.category}</td>
        <td>${q.type === 'mcq' ? 'MCQ' : 'صح/خطأ'}</td>
        <td class="en">${q.attempts}</td>
        <td class="en" style="color:var(--success);">${q.correct}</td>
        <td class="en" style="color:var(--danger);">${q.wrong}</td>
        <td>
          <div class="flex items-center gap-1" style="justify-content:center;">
            <span class="en" style="font-weight:700;min-width:36px;">${q.success_rate}%</span>
            <div class="rate-bar"><div class="rate-bar-fill ${barClass}" style="width:${q.success_rate}%;"></div></div>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function renderAnalysisBarChart(qs) {
  const canvas = $('analysis-chart');
  if (!canvas) return;
  if (analysisChartInst) analysisChartInst.destroy();

  analysisChartInst = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: qs.map(q => `س${q.q_id}`),
      datasets: [{
        label: 'نسبة النجاح %',
        data: qs.map(q => q.success_rate),
        backgroundColor: qs.map(q => q.success_rate < 50 ? '#c0392b' : q.success_rate < 70 ? '#e67e22' : '#1a7a4a'),
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      animation: false,
      plugins: { legend: { display: false } },
      scales: { y: { min: 0, max: 100, ticks: { callback: v => v + '%' } } }
    }
  });
}

// ────────────────────────────────────────────────────────────
// TAB 4: DEPARTMENT REPORTS
// ────────────────────────────────────────────────────────────
let deptReportChart1, deptReportChart2;

async function loadDeptReport() {
  if (!managerUser) managerUser = await window.getCurrentUser();
  const myDept = managerUser?.department || '';

  if ($('mgr-report-dept')) $('mgr-report-dept').textContent = myDept;
  loadDeptReportData();
}

async function loadDeptReportData() {


  const dept = $('global-mgr-dept')?.value || managerUser?.department?.split(',')[0] || '';
  if (!dept) return;

  const { data: results } = await db
    .from('results')
    .select('*')
    .eq('department_name', dept)
    .order('submitted_at', { ascending: false });

  const list = results || [];
  const total  = list.length;
  const passed = list.filter(r => r.passed).length;
  const failed = total - passed;

  // Update mini KPIs
  $('dr-total').textContent   = total;
  $('dr-pass').textContent    = passed;
  $('dr-fail').textContent    = failed;
  $('dr-rate').textContent    = total ? Math.round((passed/total)*100) + '%' : '—';

  // Table
  const tbody = $('dr-tbody');
  if (tbody) {
    tbody.innerHTML = list.map(r => `
      <tr>
        <td>${r.name}</td>
        <td class="en">${r.sap}</td>
        <td class="en">${r.score}/${r.total}</td>
        <td class="en">${r.percent}%</td>
        <td><span class="badge ${r.passed?'badge-success':'badge-danger'}">${r.passed?'ناجح':'راسب'}</span></td>
        <td class="en" style="font-size:0.8rem;">${new Date(r.submitted_at).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' })}</td>
      </tr>
    `).join('') || `<tr><td colspan="6" class="text-center text-muted">لا توجد نتائج</td></tr>`;
  }

  // Donut chart
  if ($('dr-donut')) {
    if (deptReportChart1) deptReportChart1.destroy();
    deptReportChart1 = new Chart($('dr-donut'), {
      type: 'doughnut',
      data: {
        labels: ['ناجح', 'راسب'],
        datasets: [{ data: [passed, failed], backgroundColor: ['#1a7a4a','#c0392b'], borderWidth: 2, borderColor: '#fff' }]
      },
      options: { 
        responsive: true, 
        animation: false,
        cutout: '60%', 
        plugins: { legend: { position: 'bottom' } } 
      }
    });
  }

  window._deptReportResults = { results: list, deptName: dept };
}

// ── INIT ──────────────────────────────────────────────────
let activityLogId = null;
let sessionClicks = 0;

(async () => {
  const user = await requireRole(['admin', 'manager']);
  if (!user) return;

  managerUser = user;

  // Track clicks
  document.addEventListener('click', () => { sessionClicks++; });

  // Init activity log for managers
  if (user.role === 'manager') {
    const { data: logData } = await db.from('activity_logs').insert({
      user_id: user.id,
      user_name: user.name,
      role: user.role,
      session_start: new Date().toISOString(),
      last_active: new Date().toISOString(),
      click_count: 0
    }).select('id').single();
    
    if (logData) {
      activityLogId = logData.id;
      // Heartbeat every 15s
      setInterval(async () => {
        await db.from('activity_logs').update({
          last_active: new Date().toISOString(),
          click_count: sessionClicks
        }).eq('id', activityLogId);
      }, 15000);
    }
  }

  // Format department display nicely
  let deptDisplay = user.department || '';
  if (deptDisplay && deptDisplay.includes(',')) {
    deptDisplay = 'عدة أقسام';
  }
  
  await renderUserHeader('#user-name', '#user-role');
  if ($('user-role')) {
    $('user-role').textContent = `مدير (${deptDisplay})`;
  }

  managerDepts = deptDisplay ? user.department.split(',') : [];

  // Populate global filter dropdown
  const globalFilter = $('global-mgr-dept');
  if (globalFilter) {
    globalFilter.innerHTML = '<option value="">جميع الأقسام المخصصة</option>' + 
      managerDepts.map(d => `<option value="${d}">${d}</option>`).join('');
  }

  showTab('results');
})();
