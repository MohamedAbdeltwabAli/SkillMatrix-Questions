// js/manager.js — Manager dashboard (read-only, 4 tabs)

const $ = id => document.getElementById(id);

let allResults = [];
let allEmployees = [];
let allDepts = [];

// ── TABS ──────────────────────────────────────────────────
function showTab(tabId) {
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

async function loadResults() {
  const [{ data: results }, { data: emps }, { data: depts }] = await Promise.all([
    db.from('results').select('*').order('submitted_at', { ascending: false }),
    db.from('employees').select('id, sap, name, department_id, departments(name)'),
    db.from('departments').select('id, name').order('name'),
  ]);

  allResults   = results   || [];
  allEmployees = emps      || [];
  allDepts     = depts     || [];

  // Populate dept filter
  const deptFilter = $('res-dept-filter');
  if (deptFilter) {
    deptFilter.innerHTML = `<option value="">جميع الأقسام</option>` +
      depts?.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
  }

  renderResultsDashboard(allResults, allEmployees);
}

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
  renderLineChart(results);
  renderDonutChart(results);
}

function filterResults() {
  const dept   = $('res-dept-filter')?.value || '';
  const passed = $('res-pass-filter')?.value || '';
  const from   = $('res-date-from')?.value;
  const to     = $('res-date-to')?.value;

  const filtered = allResults.filter(r => {
    const md = !dept   || r.department_name === dept;
    const mp = !passed || String(r.passed) === passed;
    const mf = !from   || new Date(r.submitted_at) >= new Date(from);
    const mt = !to     || new Date(r.submitted_at) <= new Date(to + 'T23:59:59');
    return md && mp && mf && mt;
  });

  renderResultsTable(filtered);
}

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
      <td class="en" style="font-size:0.8rem;">${new Date(r.submitted_at).toLocaleDateString('ar-EG')}</td>
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
      plugins: { legend: { position: 'top' } },
      scales: { x: { stacked: false }, y: { beginAtZero: true } }
    }
  });
}

function renderLineChart(results) {
  const canvas = $('chart-line');
  if (!canvas) return;
  if (chartLine) chartLine.destroy();

  // Group by date
  const byDate = {};
  results.forEach(r => {
    const d = new Date(r.submitted_at).toLocaleDateString('ar-EG');
    byDate[d] = (byDate[d] || 0) + 1;
  });
  const labels = Object.keys(byDate).slice(-14);
  const data   = labels.map(l => byDate[l]);

  chartLine = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'الاختبارات اليومية',
        data,
        borderColor: '#1a3a6b',
        backgroundColor: 'rgba(26,58,107,0.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#e8b84b',
        pointRadius: 4,
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

function renderDonutChart(results) {
  const canvas = $('chart-donut');
  if (!canvas) return;
  if (chartDonut) chartDonut.destroy();

  const low  = results.filter(r => r.percent < 50).length;
  const mid  = results.filter(r => r.percent >= 50 && r.percent < 70).length;
  const high = results.filter(r => r.percent >= 70).length;

  chartDonut = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['0–50%', '50–70%', '70%+'],
      datasets: [{
        data: [low, mid, high],
        backgroundColor: ['#c0392b', '#e67e22', '#1a7a4a'],
        borderWidth: 2,
        borderColor: '#fff',
      }]
    },
    options: { responsive: true, cutout: '65%', plugins: { legend: { position: 'bottom' } } }
  });
}

// ────────────────────────────────────────────────────────────
// TAB 2: NOT ASSESSED
// ────────────────────────────────────────────────────────────
async function loadNotAssessed() {
  const tbody = $('not-tbody');
  if (!tbody) return;
  tbody.innerHTML = skeletonRows(3);

  if (!allEmployees.length) {
    const [{ data: emps }, { data: results }, { data: depts }] = await Promise.all([
      db.from('employees').select('id, sap, name, department_id, departments(name)'),
      db.from('results').select('sap'),
      db.from('departments').select('id, name').order('name'),
    ]);
    allEmployees = emps     || [];
    allResults   = (results || []).map(r => r.sap);
    allDepts     = depts    || [];
  }

  const assessed = new Set(allResults.map ? allResults : allResults);
  const notAssessed = allEmployees.filter(e => !assessed.has(e.sap)).map(e => ({
    sap: e.sap, name: e.name, dept_name: e.departments?.name || '—',
  }));

  // Dept filter
  const deptFilter = $('not-dept-filter');
  if (deptFilter) {
    deptFilter.innerHTML = `<option value="">جميع الأقسام</option>` +
      allDepts.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
  }

  renderNotAssessed(notAssessed);
  window._notAssessed = notAssessed;
}

function renderNotAssessed(list) {
  const tbody = $('not-tbody');
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state">
      <div class="empty-icon">✅</div><p>جميع الموظفين أجروا الاختبار!</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(e => `
    <tr><td>${e.name}</td><td class="en">${e.sap}</td><td>${e.dept_name}</td></tr>
  `).join('');
}

function filterNotAssessed() {
  const dept = $('not-dept-filter')?.value || '';
  const list = (window._notAssessed || []).filter(e => !dept || e.dept_name === dept);
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

  const { data: responses } = await db
    .from('responses')
    .select('q_id, question_text, category, type, is_correct, department_name');

  if (!responses?.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
      <div class="empty-icon">📉</div><p>لا توجد بيانات كافية</p></div></td></tr>`;
    return;
  }

  const qMap = {};
  responses.forEach(r => {
    if (!qMap[r.q_id]) {
      qMap[r.q_id] = { q_id: r.q_id, question: r.question_text, category: r.category, type: r.type, attempts: 0, correct: 0, wrong: 0 };
    }
    qMap[r.q_id].attempts++;
    r.is_correct ? qMap[r.q_id].correct++ : qMap[r.q_id].wrong++;
  });

  analysisData = Object.values(qMap)
    .map(q => ({ ...q, success_rate: Math.round((q.correct / q.attempts) * 100) }))
    .sort((a, b) => a.success_rate - b.success_rate);

  renderAnalysisTable(analysisData);
  renderAnalysisBarChart(analysisData.slice(0, 10));
}

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
  if (!allDepts.length) {
    const { data } = await db.from('departments').select('id, name').order('name');
    allDepts = data || [];
  }

  const sel = $('dept-report-sel');
  if (sel) {
    sel.innerHTML = `<option value="">اختر القسم</option>` +
      allDepts.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
  }
}

async function loadDeptReportData() {
  const dept = $('dept-report-sel')?.value;
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
        <td class="en" style="font-size:0.8rem;">${new Date(r.submitted_at).toLocaleDateString('ar-EG')}</td>
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
      options: { responsive: true, cutout: '60%', plugins: { legend: { position: 'bottom' } } }
    });
  }

  window._deptReportResults = { results: list, deptName: dept };
}

// ── INIT ──────────────────────────────────────────────────
(async () => {
  const user = await requireRole(['admin', 'manager']);
  if (!user) return;

  await renderUserHeader('#user-name', '#user-role');
  showTab('results');
})();
