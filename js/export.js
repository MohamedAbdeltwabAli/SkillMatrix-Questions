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
  const headers = ['الاسم', 'رقم SAP', 'القسم', 'الدرجة', 'النسبة', 'النتيجة', 'التاريخ'];

  const rows = results.map(r => [
    r.name,
    r.sap,
    r.department_name,
    `${r.score}/${r.total}`,
    `${r.percent}%`,
    r.passed ? 'ناجح ✓' : 'راسب ✗',
    new Date(r.submitted_at).toLocaleDateString('ar-EG'),
  ]);

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [
    { wch: 30 }, { wch: 14 }, { wch: 20 },
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
    const passed = row[5].includes('ناجح');
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
function exportQuestionAnalysis(questions, deptBreakdown = []) {
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

  // Sheet 2: Department breakdown (if provided)
  if (deptBreakdown.length) {
    const ws2 = XLSX.utils.aoa_to_sheet(deptBreakdown);
    ws2['!dir'] = 'rtl';
    XLSX.utils.book_append_sheet(wb, ws2, 'تفاصيل الأقسام');
  }

  XLSX.writeFile(wb, `تحليل_الأسئلة_${dateStamp()}.xlsx`);
}

/**
 * Export employees list to Excel.
 */
function exportEmployees(employees) {
  const headers = ['رقم SAP', 'الاسم', 'القسم', 'الحالة', 'حظر الجهاز'];
  const rows = employees.map(e => [
    e.sap,
    e.name,
    e.dept_name || '',
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
