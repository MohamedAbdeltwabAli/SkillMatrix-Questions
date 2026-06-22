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
    new Date(r.submitted_at).toLocaleDateString('ar-EG'),
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
 * Export results panel to PDF using html2pdf.js
 */
window.exportResultsPDF = async function() {
  const element = document.getElementById('panel-results');
  if (!element) {
    alert('عذراً، لا يمكن تصدير هذه الصفحة.');
    return;
  }

  // Get actual background color from the page (body or .main)
  const bgColor = window.getComputedStyle(document.body).backgroundColor || '#f4f6f8';
  
  const opt = {
    margin:       0.2,
    filename:     `نتائج_الاختبار_${dateStamp()}.pdf`,
    image:        { type: 'jpeg', quality: 1 },
    html2canvas:  { scale: 3, useCORS: true, backgroundColor: bgColor },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
  };
  
  // Hide all buttons inside the panel before capturing
  const btns = element.querySelectorAll('button');
  const originalDisplays = [];
  btns.forEach(b => {
    originalDisplays.push(b.style.display);
    b.style.display = 'none';
  });
  
  try {
    // We assume html2pdf is loaded globally
    await window.html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.error("PDF Export error:", err);
    alert('حدث خطأ أثناء تصدير الـ PDF');
  } finally {
    // Restore buttons
    btns.forEach((b, i) => {
      b.style.display = originalDisplays[i];
    });
  }
};
