// js/export.js
// Excel export helpers using SheetJS (xlsx CDN)

/**
 * Apply color to a cell in a worksheet (requires XLSX loaded via CDN).
 */
function cellStyle(fgColor, bold = false, color = 'FFFFFFFF') {
  return {
    fill: { fgColor: { rgb: fgColor } },
    font: { bold, color: { rgb: color } },
    alignment: { horizontal: 'center', vertical: 'center', readingOrder: 2 }
  };
}

/**
 * Export results to Excel.
 * @param {Array} results - array of result objects
 * @param {string} deptName - department filter name
 */
function exportResults(results, deptName = 'الكل') {
  const sheetName = `النتائج - ${deptName}`.substring(0, 31);
  const headers = ['الاسم', 'رقم SAP', 'القسم', 'المحاولة', 'الدرجة', 'النسبة', 'النتيجة', 'التاريخ'];

  const rows = results.map(r => [
    r.name,
    r.sap,
    r.department_name,
    `المحاولة ${r.attempt_number || 1}`,
    `${r.score}/${r.total}`,
    `${r.percent}%`,
    r.passed ? 'ناجح ✓' : 'راسب ✗',
    new Date(r.submitted_at).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }),
  ]);

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [
    { wch: 30 }, { wch: 14 }, { wch: 20 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }
  ];

  // Header styling
  headers.forEach((_, i) => {
    const cell = XLSX.utils.encode_cell({ r: 0, c: i });
    if (!ws[cell]) return;
    ws[cell].s = cellStyle('1A3A6B', true);
  });

  // Row coloring
  rows.forEach((row, rowIdx) => {
    const passed = row[6].includes('ناجح');
    headers.forEach((_, colIdx) => {
      const cell = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx });
      if (!ws[cell]) return;
      ws[cell].s = {
        fill: { fgColor: { rgb: passed ? 'E8F5E9' : 'FFEBEE' } },
        alignment: { horizontal: 'center', readingOrder: 2 }
      };
    });
  });

  ws['!dir'] = 'rtl';

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `نتائج_${deptName}_${dateStamp()}.xlsx`);
}

/**
 * Export not-assessed employees list to Excel.
 */
function exportNotAssessed(employees, deptName = 'الكل') {
  const sheetName = `لم يؤدوا الاختبار - ${deptName}`.substring(0, 31);
  const headers = ['الاسم', 'رقم SAP', 'القسم'];
  const rows = employees.map(e => [e.name, e.sap, e.dept_name]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 20 }];

  headers.forEach((_, i) => {
    const cell = XLSX.utils.encode_cell({ r: 0, c: i });
    if (ws[cell]) ws[cell].s = cellStyle('1A3A6B', true);
  });

  ws['!dir'] = 'rtl';

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `لم_يؤدوا_الاختبار_${deptName}_${dateStamp()}.xlsx`);
}

/**
 * Export question analysis to Excel with two sheets.
 */
function exportQuestionAnalysis(questions, detailedAttempts = []) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Full analysis
  const headers1 = ['رقم السؤال', 'السؤال', 'الفئة', 'النوع', 'المحاولات', 'صح', 'خطأ', 'نسبة النجاح'];
  const rows1 = questions.map(q => [
    q.q_id,
    q.question,
    q.category,
    q.type === 'mcq' ? 'MCQ' : 'صح/خطأ',
    q.attempts,
    q.correct,
    q.wrong,
    `${q.success_rate}%`,
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet([headers1, ...rows1]);
  ws1['!cols'] = [
    { wch: 12 }, { wch: 50 }, { wch: 15 }, { wch: 10 },
    { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 14 }
  ];

  headers1.forEach((_, i) => {
    const cell = XLSX.utils.encode_cell({ r: 0, c: i });
    if (ws1[cell]) ws1[cell].s = cellStyle('1A3A6B', true);
  });

  rows1.forEach((row, rowIdx) => {
    const rate = parseFloat(row[7]);
    const bgColor = rate < 50 ? 'FFEBEE' : rate < 70 ? 'FFF3E0' : 'E8F5E9';
    headers1.forEach((_, colIdx) => {
      const cell = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx });
      if (ws1[cell]) ws1[cell].s = {
        fill: { fgColor: { rgb: bgColor } },
        alignment: { readingOrder: 2 }
      };
    });
  });

  ws1['!dir'] = 'rtl';
  XLSX.utils.book_append_sheet(wb, ws1, 'تحليل الأسئلة');

  // Sheet 2: Detailed Employee Attempts
  if (detailedAttempts.length) {
    const headers2 = ['رقم SAP', 'اسم الموظف', 'القسم', 'المحاولة', 'رقم السؤال', 'السؤال', 'الفئة', 'النوع', 'إجابة الموظف', 'الإجابة الصحيحة', 'النتيجة', 'التاريخ'];
    const rows2 = detailedAttempts.map(d => [
      d.sap,
      d.name,
      d.dept,
      `المحاولة ${d.attempt || 1}`,
      d.q_id,
      d.question,
      d.category,
      d.type,
      d.emp_ans,
      d.correct_ans,
      d.result,
      d.date,
    ]);

    const ws2 = XLSX.utils.aoa_to_sheet([headers2, ...rows2]);
    ws2['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 45 }, { wch: 15 }, { wch: 10 }, { wch: 14 },
      { wch: 14 }, { wch: 12 }, { wch: 12 }
    ];

    headers2.forEach((_, i) => {
      const cell = XLSX.utils.encode_cell({ r: 0, c: i });
      if (ws2[cell]) ws2[cell].s = cellStyle('1A3A6B', true);
    });

    rows2.forEach((row, rowIdx) => {
      const isCorrect = row[10].includes('صح');
      const bgColor = isCorrect ? 'E8F5E9' : 'FFEBEE';
      headers2.forEach((_, colIdx) => {
        const cell = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx });
        if (ws2[cell]) ws2[cell].s = {
          fill: { fgColor: { rgb: bgColor } },
          alignment: { readingOrder: 2 }
        };
      });
    });

    ws2['!dir'] = 'rtl';
    XLSX.utils.book_append_sheet(wb, ws2, 'إجابات الموظفين التفصيلية');
  }

  XLSX.writeFile(wb, `تحليل_الأسئلة_${dateStamp()}.xlsx`);
}

/**
 * Export questions bank to Excel.
 * @param {Array} questions - array of question objects
 */
function exportQuestions(questions) {
  const headers = ['رقم السؤال', 'الفئة', 'النوع', 'السؤال', 'الخيار A', 'الخيار B', 'الخيار C', 'الخيار D', 'الإجابة الصحيحة'];
  const rows = questions.map(q => [
    q.q_id,
    q.category,
    q.type === 'mcq' ? 'اختيار متعدد' : 'صح/خطأ',
    q.question,
    q.opt_a || '',
    q.opt_b || '',
    q.opt_c || '',
    q.opt_d || '',
    q.answer,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 12 }, { wch: 15 }, { wch: 14 }, { wch: 50 },
    { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 14 }
  ];

  headers.forEach((_, i) => {
    const cell = XLSX.utils.encode_cell({ r: 0, c: i });
    if (ws[cell]) ws[cell].s = cellStyle('1A3A6B', true);
  });

  ws['!dir'] = 'rtl';

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'بنك الأسئلة');
  XLSX.writeFile(wb, `الأسئلة_${dateStamp()}.xlsx`);
}

/**
 * Export employees list to Excel.
 */
function exportEmployees(employees) {
  const headers = ['رقم SAP', 'الاسم', 'القسم', 'الحالة', 'حظر الجهاز'];
  const rows = employees.map(e => [
    e.sap,
    e.name,
    e.departments?.name || e.dept_name || '',
    e.status === 1 ? 'نشط' : 'محظور',
    e.device_block ? 'نعم' : 'لا',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 12 }];

  headers.forEach((_, i) => {
    const cell = XLSX.utils.encode_cell({ r: 0, c: i });
    if (ws[cell]) ws[cell].s = cellStyle('1A3A6B', true);
  });

  ws['!dir'] = 'rtl';

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الموظفون');
  XLSX.writeFile(wb, `الموظفون_${dateStamp()}.xlsx`);
}

/**
 * Parse uploaded Excel/CSV file and return array of row objects.
 * @param {File} file
 * @param {string[]} expectedColumns
 * @returns {Promise<{rows: Array, errors: string[]}>}
 */
async function parseUploadedFile(file, expectedColumns) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (!raw.length) return resolve({ rows: [], errors: ['الملف فارغ'] });

        const fileHeaders = raw[0].map(h => String(h).trim());
        const errors = [];
        const rows = [];

        raw.slice(1).forEach((row, i) => {
          if (row.every(c => c === '')) return;
          const obj = {};
          expectedColumns.forEach((col, ci) => {
            obj[col] = String(row[ci] ?? '').trim();
          });
          rows.push(obj);
        });

        resolve({ rows, errors });
      } catch (err) {
        resolve({ rows: [], errors: [`خطأ في قراءة الملف: ${err.message}`] });
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

function dateStamp() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Export professional 3-page PDF report for manager.
 * Uses a hidden template (#pdf-report) instead of capturing the screen.
 */
window.exportResultsPDF = async function() {
  const report = document.getElementById('pdf-report');
  if (!report) { alert('قالب التقرير غير موجود'); return; }

  const globalFilterVal = document.getElementById('global-mgr-dept')?.value;
  let deptName = window.managerUser?.department || 'غير محدد';
  if (globalFilterVal) {
    deptName = globalFilterVal;
  } else if (deptName.includes(',')) {
    deptName = 'عدة أقسام';
  }

  // ── Ensure all data is loaded (user may not have visited all tabs) ──
  let results    = window.allResults   || [];
  let employees  = window.allEmployees || [];
  let responses  = window.allAnalysisResponses || [];
  let notAssessed = window._notAssessed || [];

  // Fetch results & employees if not loaded yet
  if (!results.length || !employees.length) {
    const rawDepts = window.managerUser?.department || '';
    const deptArray = rawDepts ? rawDepts.split(',') : [];
    
    const [{ data: r }, { data: e }] = await Promise.all([
      db.from('results').select('*').in('department_name', deptArray.length ? deptArray : ['']).order('submitted_at', { ascending: false }),
      db.from('employees').select('id, sap, name, department_id, departments(name)'),
    ]);
    results   = r || [];
    employees = (e || []).filter(emp => deptArray.includes(emp.departments?.name));
    window.allResults   = results;
    window.allEmployees = employees;
  }

  // Fetch responses if not loaded yet (for category/question analysis)
  if (!responses.length) {
    const rawDepts = window.managerUser?.department || '';
    const deptArray = rawDepts ? rawDepts.split(',') : [];
    const { data: resp } = await db.from('responses')
      .select('sap, q_id, question_text, category, type, employee_answer, correct_answer, is_correct, department_name, submitted_at, results(attempt_number)')
      .in('department_name', deptArray.length ? deptArray : ['']);
    responses = resp || [];
    window.allAnalysisResponses = responses;
  }

  // Calculate not-assessed if not loaded yet
  if (!notAssessed.length && employees.length) {
    const assessedSaps = new Set(results.map(r => typeof r === 'string' ? r : r.sap));
    notAssessed = employees.filter(e => !assessedSaps.has(e.sap)).map(e => ({
      sap: e.sap, name: e.name, dept_name: e.departments?.name || 'غير محدد'
    }));
    window._notAssessed = notAssessed;
  }

  const total      = results.length;
  const passed     = results.filter(r => r.passed).length;
  const failed     = total - passed;
  const passRate   = total ? Math.round((passed / total) * 100) : 0;
  const avgScore   = total ? Math.round(results.reduce((s,r) => s + r.percent, 0) / total) : 0;
  const totalEmps  = employees.length;
  const notCount   = notAssessed.length;

  // ── PAGE 1: Populate KPIs ────────────────────────────────
  document.getElementById('pdf-dept-name').textContent = deptName;
  document.getElementById('pdf-date').textContent = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  document.getElementById('pdf-total-emp').textContent    = totalEmps;
  document.getElementById('pdf-assessed').textContent     = total;
  document.getElementById('pdf-not-assessed').textContent = notCount;
  document.getElementById('pdf-pass-rate').textContent    = passRate + '%';
  document.getElementById('pdf-avg-score').textContent    = avgScore + '%';

  // ── PAGE 2: Category analysis ────────────────────────────
  const catMap = {};
  responses.forEach(r => {
    if (!r.category) return;
    if (!catMap[r.category]) catMap[r.category] = { attempts: 0, correct: 0 };
    catMap[r.category].attempts++;
    if (r.is_correct) catMap[r.category].correct++;
  });
  const catData = Object.entries(catMap)
    .map(([name, d]) => ({ name, rate: Math.round((d.correct / d.attempts) * 100) }))
    .sort((a, b) => b.rate - a.rate);

  const topCats  = catData.slice(0, 5);
  const weakCats = [...catData].sort((a, b) => a.rate - b.rate).slice(0, 5);

  document.getElementById('pdf-top-cats').innerHTML = topCats.length
    ? topCats.map(c => `<tr><td>${c.name}</td><td style="font-weight:700;color:#1a7a4a;">${c.rate}%</td></tr>`).join('')
    : '<tr><td colspan="2" style="text-align:center;color:#9ca3af;">لا توجد بيانات</td></tr>';

  document.getElementById('pdf-weak-cats').innerHTML = weakCats.length
    ? weakCats.map(c => `<tr><td>${c.name}</td><td style="font-weight:700;color:#c0392b;">${c.rate}%</td></tr>`).join('')
    : '<tr><td colspan="2" style="text-align:center;color:#9ca3af;">لا توجد بيانات</td></tr>';

  // Question analysis for hardest questions
  const qMap = {};
  responses.forEach(r => {
    if (!qMap[r.q_id]) qMap[r.q_id] = { q_id: r.q_id, question: r.question_text, category: r.category, attempts: 0, correct: 0 };
    qMap[r.q_id].attempts++;
    if (r.is_correct) qMap[r.q_id].correct++;
  });
  const hardQs = Object.values(qMap)
    .map(q => ({ ...q, rate: Math.round((q.correct / q.attempts) * 100) }))
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 5);

  document.getElementById('pdf-hard-questions').innerHTML = hardQs.length
    ? hardQs.map((q, i) => `<tr>
        <td style="font-weight:700;">${i + 1}</td>
        <td style="font-size:11px;max-width:350px;">${q.question}</td>
        <td>${q.category}</td>
        <td style="font-weight:700;color:${q.rate < 50 ? '#c0392b' : '#e67e22'};">${q.rate}%</td>
      </tr>`).join('')
    : '<tr><td colspan="4" style="text-align:center;color:#9ca3af;">لا توجد بيانات</td></tr>';

  // ── PAGE 3: Employee scorecard ───────────────────────────
  const sorted = [...results].sort((a, b) => b.percent - a.percent);
  const topEmps  = sorted.slice(0, 5);
  const weakEmps = results.filter(r => !r.passed || r.percent < 60).sort((a, b) => a.percent - b.percent);

  const empRow = (r) => `<tr>
    <td>${r.name}</td>
    <td style="font-family:'Inter',sans-serif;">${r.sap}</td>
    <td style="font-family:'Inter',sans-serif;">${r.score}/${r.total}</td>
    <td style="font-family:'Inter',sans-serif;font-weight:700;">${r.percent}%</td>
    <td><span class="pdf-badge ${r.passed ? 'pdf-badge-pass' : 'pdf-badge-fail'}">${r.passed ? 'ناجح ✓' : 'راسب ✗'}</span></td>
  </tr>`;

  document.getElementById('pdf-top-employees').innerHTML = topEmps.length
    ? topEmps.map(empRow).join('')
    : '<tr><td colspan="5" style="text-align:center;color:#9ca3af;">لا توجد بيانات</td></tr>';

  document.getElementById('pdf-weak-employees').innerHTML = weakEmps.length
    ? weakEmps.map(empRow).join('')
    : '<tr><td colspan="5" style="text-align:center;color:#1a7a4a;">لا يوجد موظفون يحتاجون دعم 🎉</td></tr>';

  document.getElementById('pdf-not-assessed-list').innerHTML = notAssessed.length
    ? notAssessed.map(e => `<tr><td>${e.name}</td><td style="font-family:'Inter',sans-serif;">${e.sap}</td></tr>`).join('')
    : '<tr><td colspan="2" style="text-align:center;color:#1a7a4a;">جميع الموظفين أجروا الاختبار ✅</td></tr>';

  // ── Show the template for rendering ───────────────────────
  // Use a wrapper to render at exact width on-screen (off-screen breaks html2canvas)
  report.style.display = 'block';
  report.style.position = 'fixed';
  report.style.left = '0';
  report.style.top = '0';
  report.style.zIndex = '-9999';
  report.style.opacity = '0';
  report.style.width = '1050px';

  // Small delay to let DOM paint
  await new Promise(r => setTimeout(r, 200));

  // ── Destroy any old PDF charts ───────────────────────────
  const pdfChartIds = ['pdf-chart-passrate', 'pdf-chart-dist', 'pdf-chart-timeline', 'pdf-chart-cats'];
  pdfChartIds.forEach(id => {
    const existing = Chart.getChart(id);
    if (existing) existing.destroy();
  });

  // Common datalabels config
  const dlDefaults = {
    color: '#1f2937',
    font: { weight: 'bold', size: 13, family: 'Tajawal' },
    anchor: 'end',
    align: 'top',
  };

  // ── CHART 1: Pass/Fail Doughnut ──────────────────────────
  new Chart(document.getElementById('pdf-chart-passrate'), {
    type: 'doughnut',
    data: {
      labels: ['ناجح', 'راسب'],
      datasets: [{ data: [passed, failed], backgroundColor: ['#1a7a4a', '#c0392b'], borderWidth: 3, borderColor: '#fff' }]
    },
    options: {
      responsive: false, animation: false, cutout: '55%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 12, family: 'Tajawal' }, color: '#374151' } },
        datalabels: {
          display: true,
          color: '#fff',
          font: { weight: 'bold', size: 16, family: 'Tajawal' },
          formatter: (val, ctx) => {
            const t = ctx.dataset.data.reduce((a, b) => a + b, 0);
            return t ? Math.round((val / t) * 100) + '%\n(' + val + ')' : '';
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });

  // ── CHART 2: Score Distribution Doughnut ─────────────────
  const low  = results.filter(r => r.percent < 50).length;
  const mid  = results.filter(r => r.percent >= 50 && r.percent < 70).length;
  const high = results.filter(r => r.percent >= 70).length;

  new Chart(document.getElementById('pdf-chart-dist'), {
    type: 'doughnut',
    data: {
      labels: ['أقل من 50%', '50% - 70%', 'أكثر من 70%'],
      datasets: [{ data: [low, mid, high], backgroundColor: ['#c0392b', '#e67e22', '#1a7a4a'], borderWidth: 3, borderColor: '#fff' }]
    },
    options: {
      responsive: false, animation: false, cutout: '55%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11, family: 'Tajawal' }, color: '#374151' } },
        datalabels: {
          display: true,
          color: '#fff',
          font: { weight: 'bold', size: 14, family: 'Tajawal' },
          formatter: (val) => val > 0 ? val : ''
        }
      }
    },
    plugins: [ChartDataLabels]
  });

  // ── CHART 3: Timeline (Line) ─────────────────────────────
  const byDate = {};
  results.forEach(r => {
    const d = new Date(r.submitted_at).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' });
    byDate[d] = (byDate[d] || 0) + 1;
  });
  const timeLabels = Object.keys(byDate).slice(-14);
  const timeData   = timeLabels.map(l => byDate[l]);

  new Chart(document.getElementById('pdf-chart-timeline'), {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: [{
        label: 'الاختبارات',
        data: timeData,
        borderColor: '#1a3a6b',
        backgroundColor: 'rgba(26,58,107,0.1)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#e8b84b',
        pointRadius: 6,
        pointBorderWidth: 2,
        pointBorderColor: '#1a3a6b',
      }]
    },
    options: {
      responsive: false, animation: false,
      plugins: {
        legend: { display: false },
        datalabels: {
          display: true,
          ...dlDefaults,
          formatter: (val) => val
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
        x: { ticks: { font: { size: 10 } } }
      }
    },
    plugins: [ChartDataLabels]
  });

  // ── CHART 4: Category Bar Chart ──────────────────────────
  if (catData.length) {
    new Chart(document.getElementById('pdf-chart-cats'), {
      type: 'bar',
      data: {
        labels: catData.map(c => c.name),
        datasets: [{
          label: 'نسبة النجاح',
          data: catData.map(c => c.rate),
          backgroundColor: catData.map(c => c.rate < 50 ? '#c0392b' : c.rate < 70 ? '#e67e22' : '#1a7a4a'),
          borderRadius: 6,
          barThickness: 30,
        }]
      },
      options: {
        responsive: false, animation: false, indexAxis: 'y',
        plugins: {
          legend: { display: false },
          datalabels: {
            display: true,
            anchor: 'end', align: 'end',
            color: '#1f2937',
            font: { weight: 'bold', size: 12, family: 'Tajawal' },
            formatter: (val) => val + '%'
          }
        },
        scales: {
          x: { min: 0, max: 100, ticks: { callback: v => v + '%', font: { size: 10 } } },
          y: { ticks: { font: { size: 11, family: 'Tajawal' } } }
        }
      },
      plugins: [ChartDataLabels]
    });
  }

  // ── Wait for charts to fully render ──────────────────────
  await new Promise(r => setTimeout(r, 500));

  // ── Generate PDF ─────────────────────────────────────────
  const opt = {
    margin:      [10, 10, 10, 10],
    filename:    `تقرير_أداء_${deptName}_${dateStamp()}.pdf`,
    image:       { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: 1050 },
    jsPDF:       { unit: 'mm', format: 'a4', orientation: 'landscape' },
    pagebreak:   { mode: ['css'], avoid: ['.pdf-table', '.pdf-chart-box', '.pdf-chart-full'] }
  };

  try {
    await window.html2pdf().set(opt).from(report).save();
  } catch (err) {
    console.error('PDF Export error:', err);
    alert('حدث خطأ أثناء تصدير الـ PDF');
  } finally {
    // Hide the template again
    report.style.display = 'none';
    report.style.position = '';
    report.style.left = '';
    report.style.zIndex = '';
    report.style.opacity = '';
    report.style.width = '';
    // Destroy PDF charts to free memory
    pdfChartIds.forEach(id => {
      const c = Chart.getChart(id);
      if (c) c.destroy();
    });
  }
};


