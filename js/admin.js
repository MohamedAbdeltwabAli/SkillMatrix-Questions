// js/admin.js — Admin dashboard logic (all 6 tabs)

// ── SHARED UTILS ──────────────────────────────────────────
const $ = id => document.getElementById(id);

function showTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  $(`panel-${tabId}`)?.classList.add('active');
  document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');

  const titles = {
    employees: 'إدارة الموظفين',
    questions:  'إدارة الأسئلة',
    depts:      'الأقسام والإعدادات',
    results:    'نتائج الاختبارات',
    analysis:   'تحليل الأسئلة',
    users:      'إدارة المستخدمين',
  };
  $('page-title').textContent = titles[tabId] || '';

  // Lazy load
  const loaders = {
    employees: loadEmployees,
    questions:  loadQuestions,
    depts:      loadDepts,
    results:    loadResults,
    analysis:   loadAnalysis,
    users:      loadUsers,
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

// Confirm dialog
function confirmDlg(msg) {
  return new Promise(res => {
    const ok = window.confirm(msg);
    res(ok);
  });
}

// Skeleton rows
function skeletonRows(cols, count = 5) {
  return Array.from({ length: count }, () =>
    `<tr>${Array.from({ length: cols }, () =>
      `<td><div class="skeleton" style="height:18px;margin:auto;width:80%;"></div></td>`
    ).join('')}</tr>`
  ).join('');
}

// ── COUNT-UP ANIMATION ────────────────────────────────────
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

// ── MODAL HELPERS ─────────────────────────────────────────
function openModal(id) { $(id)?.classList.add('open'); }
function closeModal(id) { $(id)?.classList.remove('open'); }

document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    const modal = btn.closest('.modal-backdrop');
    if (modal) modal.classList.remove('open');
  });
});

// ────────────────────────────────────────────────────────────
// TAB 1: EMPLOYEES
// ────────────────────────────────────────────────────────────
let allEmployees = [];
let deptMap = {};

async function loadEmployees() {
  const tbody = $('emp-tbody');
  if (!tbody) return;
  tbody.innerHTML = skeletonRows(7);

  const [{ data: depts }, { data: emps }] = await Promise.all([
    db.from('departments').select('id, name').order('name'),
    db.from('employees').select('*, departments(name)').order('name'),
  ]);

  deptMap = {};
  depts?.forEach(d => { deptMap[d.id] = d.name; });
  allEmployees = emps || [];

  populateDeptFilter('emp-dept-filter', depts || []);
  renderEmployees(allEmployees);
  updateKPIs();
}

function renderEmployees(list) {
  const tbody = $('emp-tbody');
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
      <div class="empty-icon">👥</div><p>لا يوجد موظفون</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(e => `
    <tr>
      <td><input type="checkbox" class="emp-check" data-id="${e.id}" /></td>
      <td class="en">${e.sap}</td>
      <td>${e.name}</td>
      <td>${e.departments?.name || '—'}</td>
      <td>
        <span class="badge ${e.status === 1 ? 'badge-success' : 'badge-danger'}">
          ${e.status === 1 ? 'نشط' : 'محظور'}
        </span>
      </td>
      <td>
        <span class="badge ${e.device_block ? 'badge-danger' : 'badge-muted'}">
          ${e.device_block ? 'محظور' : 'طبيعي'}
        </span>
      </td>
      <td>
        <div class="flex gap-1" style="justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" onclick="editEmployee('${e.id}')">تعديل</button>
          <button class="btn btn-sm ${e.status===1?'btn-danger':'btn-success'}"
                  onclick="toggleEmpBlock('${e.id}', ${e.status})">
            ${e.status===1?'إيقاف':'تفعيل'}
          </button>
          <button class="btn btn-sm ${e.device_block?'btn-success':'btn-ghost'}"
                  onclick="toggleDeviceBlock('${e.id}', ${e.device_block})">
            ${e.device_block?'فك الجهاز':'حظر الجهاز'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteEmployee('${e.id}')">حذف</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Checkbox listeners
  document.querySelectorAll('.emp-check').forEach(cb => {
    cb.addEventListener('change', updateBulkBar);
  });
}

function filterEmployees() {
  const search = $('emp-search')?.value?.toLowerCase() || '';
  const dept   = $('emp-dept-filter')?.value || '';
  const status = $('emp-status-filter')?.value || '';

  const filtered = allEmployees.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search) || e.sap.includes(search);
    const matchDept   = !dept || e.department_id === dept;
    const matchStatus = !status || String(e.status) === status;
    return matchSearch && matchDept && matchStatus;
  });

  renderEmployees(filtered);
}

async function editEmployee(id) {
  const emp = allEmployees.find(e => e.id === id);
  if (!emp) return;

  const [{ data: depts }] = await Promise.all([
    db.from('departments').select('id, name').order('name'),
  ]);

  $('emp-modal-title').textContent = 'تعديل بيانات الموظف';
  $('emp-form-id').value          = emp.id;
  $('emp-form-sap').value         = emp.sap;
  $('emp-form-name').value        = emp.name;
  $('emp-form-password').value    = emp.password;
  $('emp-form-national').value    = emp.national_id || '';
  $('emp-form-phone').value       = emp.phone || '';

  const deptSel = $('emp-form-dept');
  deptSel.innerHTML = depts?.map(d =>
    `<option value="${d.id}" ${d.id === emp.department_id ? 'selected' : ''}>${d.name}</option>`
  ).join('') || '';

  openModal('emp-modal');
}

function newEmployee() {
  $('emp-modal-title').textContent = 'إضافة موظف جديد';
  $('emp-form').reset();
  $('emp-form-id').value = '';

  db.from('departments').select('id, name').order('name').then(({ data }) => {
    $('emp-form-dept').innerHTML = data?.map(d =>
      `<option value="${d.id}">${d.name}</option>`
    ).join('') || '';
  });

  openModal('emp-modal');
}

async function saveEmployee() {
  const id       = $('emp-form-id').value;
  const sap      = $('emp-form-sap').value.trim();
  const name     = $('emp-form-name').value.trim();
  const deptId   = $('emp-form-dept').value;
  const password = $('emp-form-password').value.trim();
  const nationalId = $('emp-form-national').value.trim();
  const phone    = $('emp-form-phone').value.trim();

  if (!sap || !name || !password) {
    toast('يرجى ملء جميع الحقول المطلوبة', 'error'); return;
  }

  const payload = {
    sap, name,
    department_id: deptId || null,
    password, national_id: nationalId, phone,
  };

  let error;
  if (id) {
    ({ error } = await db.from('employees').update(payload).eq('id', id));
  } else {
    ({ error } = await db.from('employees').insert(payload));
  }

  if (error) { toast(error.message, 'error'); return; }

  toast(id ? 'تم تحديث الموظف' : 'تمت إضافة الموظف', 'success');
  closeModal('emp-modal');
  loadEmployees();
}

async function deleteEmployee(id) {
  if (!await confirmDlg('هل أنت متأكد من حذف هذا الموظف؟')) return;
  const { error } = await db.from('employees').delete().eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast('تم حذف الموظف', 'success');
  loadEmployees();
}

async function toggleEmpBlock(id, currentStatus) {
  const newStatus = currentStatus === 1 ? 0 : 1;
  const { error } = await db.from('employees').update({ status: newStatus }).eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast(newStatus === 1 ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب', 'success');
  loadEmployees();
}

async function toggleDeviceBlock(id, currentBlock) {
  const { error } = await db.from('employees').update({ device_block: !currentBlock }).eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast(!currentBlock ? 'تم حظر الجهاز' : 'تم فك حظر الجهاز', 'success');
  loadEmployees();
}

function updateBulkBar() {
  const checked = document.querySelectorAll('.emp-check:checked').length;
  const bar = $('bulk-actions-bar');
  if (bar) {
    $('bulk-count').textContent = checked;
    bar.classList.toggle('visible', checked > 0);
  }
}

async function bulkDeleteEmployees() {
  const ids = [...document.querySelectorAll('.emp-check:checked')].map(cb => cb.dataset.id);
  if (!ids.length) return;
  if (!await confirmDlg(`هل تريد حذف ${ids.length} موظف؟`)) return;
  const { error } = await db.from('employees').delete().in('id', ids);
  if (error) { toast(error.message, 'error'); return; }
  toast(`تم حذف ${ids.length} موظف`, 'success');
  loadEmployees();
}

// Excel upload for employees
async function uploadEmployeesFile(file) {
  if (!file) return;
  const cols = ['SAP', 'Name', 'Department', 'Password', 'NationalID', 'Phone', 'Status'];
  const { rows, errors } = await parseUploadedFile(file, cols);

  if (errors.length) { toast(errors[0], 'error'); return; }

  const { data: depts } = await db.from('departments').select('id, name');
  const deptNameToId = {};
  depts?.forEach(d => { deptNameToId[d.name] = d.id; });

  const progress = $('emp-upload-progress');
  const statusEl = $('emp-upload-status');
  if (progress) { progress.style.display = 'block'; }

  let done = 0;
  for (const row of rows) {
    const deptId = deptNameToId[row.Department] || null;
    const payload = {
      sap: row.SAP,
      name: row.Name,
      department_id: deptId,
      password: row.Password,
      national_id: row.NationalID,
      phone: row.Phone,
      status: row.Status === '0' ? 0 : 1,
    };
    await db.from('employees').upsert(payload, { onConflict: 'sap' });
    done++;
    if (progress) {
      $('emp-upload-bar').style.width = Math.round((done / rows.length) * 100) + '%';
      if (statusEl) statusEl.textContent = `تم معالجة ${done} من ${rows.length}`;
    }
  }

  toast(`تم رفع ${done} موظف`, 'success');
  if (progress) progress.style.display = 'none';
  loadEmployees();
}

// ────────────────────────────────────────────────────────────
// TAB 2: QUESTIONS
// ────────────────────────────────────────────────────────────
let allQuestions = [];

async function loadQuestions() {
  const tbody = $('q-tbody');
  if (!tbody) return;
  tbody.innerHTML = skeletonRows(6);

  const { data } = await db.from('questions').select('*').order('q_id');
  allQuestions = data || [];
  renderQuestions(allQuestions);
}

function renderQuestions(list) {
  const tbody = $('q-tbody');
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
      <div class="empty-icon">❓</div><p>لا توجد أسئلة</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(q => `
    <tr>
      <td class="en">${q.q_id}</td>
      <td>${q.category}</td>
      <td><span class="badge ${q.type==='mcq'?'badge-info':'badge-muted'}">
        ${q.type === 'mcq' ? 'اختيار متعدد' : 'صح/خطأ'}
      </span></td>
      <td style="text-align:right;max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        ${q.question}
      </td>
      <td class="en" style="font-weight:700;color:var(--success);">${q.answer}</td>
      <td>
        <div class="flex gap-1" style="justify-content:center;">
          <button class="btn btn-primary btn-sm" onclick="editQuestion('${q.id}')">تعديل</button>
          <button class="btn btn-danger btn-sm" onclick="deleteQuestion('${q.id}')">حذف</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterQuestions() {
  const search   = $('q-search')?.value?.toLowerCase() || '';
  const category = $('q-cat-filter')?.value || '';
  const type     = $('q-type-filter')?.value || '';

  const filtered = allQuestions.filter(q => {
    const ms = q.question.toLowerCase().includes(search) || String(q.q_id).includes(search);
    const mc = !category || q.category === category;
    const mt = !type || q.type === type;
    return ms && mc && mt;
  });
  renderQuestions(filtered);
}

function newQuestion() {
  $('q-modal-title').textContent = 'إضافة سؤال جديد';
  $('q-form').reset();
  $('q-form-id').value = '';
  toggleQType($('q-form-type').value);
  openModal('q-modal');
}

function editQuestion(id) {
  const q = allQuestions.find(q => q.id === id);
  if (!q) return;

  $('q-modal-title').textContent = 'تعديل السؤال';
  $('q-form-id').value       = q.id;
  $('q-form-qid').value      = q.q_id;
  $('q-form-category').value = q.category;
  $('q-form-type').value     = q.type;
  $('q-form-question').value = q.question;
  $('q-form-opta').value     = q.opt_a || '';
  $('q-form-optb').value     = q.opt_b || '';
  $('q-form-optc').value     = q.opt_c || '';
  $('q-form-optd').value     = q.opt_d || '';
  $('q-form-answer').value   = q.answer;
  toggleQType(q.type);
  openModal('q-modal');
}

function toggleQType(type) {
  const mcqFields = $('mcq-fields');
  if (mcqFields) mcqFields.style.display = type === 'mcq' ? 'block' : 'none';
  const answerEl = $('q-form-answer');
  if (answerEl) {
    if (type === 't/f') {
      answerEl.innerHTML = '<option value="1">صح (1)</option><option value="0">خطأ (0)</option>';
    } else {
      answerEl.innerHTML = '<option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>';
    }
  }
}

async function saveQuestion() {
  const id = $('q-form-id').value;
  const type = $('q-form-type').value;
  const payload = {
    q_id:     parseInt($('q-form-qid').value),
    category: $('q-form-category').value.trim(),
    type,
    question: $('q-form-question').value.trim(),
    answer:   $('q-form-answer').value,
    opt_a: type === 'mcq' ? $('q-form-opta').value.trim() : null,
    opt_b: type === 'mcq' ? $('q-form-optb').value.trim() : null,
    opt_c: type === 'mcq' ? $('q-form-optc').value.trim() : null,
    opt_d: type === 'mcq' ? $('q-form-optd').value.trim() : null,
  };

  if (!payload.category || !payload.question) {
    toast('يرجى ملء جميع الحقول المطلوبة', 'error'); return;
  }

  let error;
  if (id) {
    ({ error } = await db.from('questions').update(payload).eq('id', id));
  } else {
    ({ error } = await db.from('questions').insert(payload));
  }

  if (error) { toast(error.message, 'error'); return; }
  toast(id ? 'تم تحديث السؤال' : 'تمت إضافة السؤال', 'success');
  closeModal('q-modal');
  loadQuestions();
}

async function deleteQuestion(id) {
  if (!await confirmDlg('هل تريد حذف هذا السؤال؟')) return;
  const { error } = await db.from('questions').delete().eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast('تم حذف السؤال', 'success');
  loadQuestions();
}

// ────────────────────────────────────────────────────────────
// TAB 3: DEPARTMENTS & CONFIG
// ────────────────────────────────────────────────────────────
let deptList = [];

async function loadDepts() {
  const list = $('dept-list');
  if (!list) return;
  list.innerHTML = '<div class="skeleton" style="height:40px;margin-bottom:1rem;"></div>'.repeat(3);

  const [{ data: depts }, { data: configs }, { data: categories }] = await Promise.all([
    db.from('departments').select('*').order('name'),
    db.from('deptconfig').select('*'),
    db.from('questions').select('category').then(r => ({ data: [...new Set(r.data?.map(q => q.category) || [])] })),
  ]);

  deptList = depts || [];
  renderDeptList(deptList, configs || [], categories || []);
}

function renderDeptList(depts, configs, categories) {
  const list = $('dept-list');
  if (!list) return;

  list.innerHTML = depts.map(dept => {
    const deptConfigs = configs.filter(c => c.department_id === dept.id);
    const totalQ = deptConfigs.reduce((s, c) => s + c.count, 0);

    const configRows = deptConfigs.map(c => `
      <div class="dept-config-row">
        <span style="flex:1;">${c.category}</span>
        <span class="badge badge-info">${c.count} سؤال</span>
        <button class="btn btn-danger btn-sm" onclick="deleteDeptConfig('${c.id}')">×</button>
      </div>
    `).join('');

    const catOptions = categories.map(cat =>
      `<option value="${cat}">${cat}</option>`
    ).join('');

    return `
      <div class="card mb-2" style="margin-bottom:1rem;">
        <div class="flex items-center gap-2" style="justify-content:space-between;margin-bottom:0.75rem;">
          <h3 style="font-size:1rem;font-weight:700;">${dept.name}</h3>
          <div class="flex gap-1">
            <button class="btn btn-ghost btn-sm" onclick="renameDept('${dept.id}','${dept.name}')">تعديل</button>
            <button class="btn btn-danger btn-sm" onclick="deleteDept('${dept.id}')">حذف</button>
          </div>
        </div>

        <div>${configRows || '<p class="text-muted" style="font-size:0.85rem;">لم يتم تهيئة الاختبار بعد</p>'}</div>

        <div class="dept-summary">
          إجمالي الأسئلة: <strong>${totalQ}</strong>
          ${deptConfigs.map(c => `• ${c.category}: ${c.count}`).join('  ')}
        </div>

        <div class="flex gap-1 mt-2" style="flex-wrap:wrap;">
          <select id="cat-sel-${dept.id}" class="filter-select">
            <option value="">اختر الفئة</option>
            ${catOptions}
          </select>
          <input type="number" id="cnt-${dept.id}" placeholder="العدد" min="1"
                 style="width:90px;padding:0.5rem;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;" />
          <button class="btn btn-primary btn-sm" onclick="addDeptConfig('${dept.id}')">+ إضافة فئة</button>
        </div>
      </div>
    `;
  }).join('');
}

function newDept() {
  const name = prompt('اسم القسم الجديد:');
  if (!name?.trim()) return;
  db.from('departments').insert({ name: name.trim() }).then(({ error }) => {
    if (error) { toast(error.message, 'error'); return; }
    toast('تم إضافة القسم', 'success');
    loadDepts();
  });
}

async function renameDept(id, current) {
  const name = prompt('الاسم الجديد:', current);
  if (!name?.trim() || name === current) return;
  const { error } = await db.from('departments').update({ name: name.trim() }).eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast('تم تحديث اسم القسم', 'success');
  loadDepts();
}

async function deleteDept(id) {
  if (!await confirmDlg('هل تريد حذف هذا القسم؟ سيتم إزالة إعداداته أيضاً.')) return;
  const { error } = await db.from('departments').delete().eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast('تم حذف القسم', 'success');
  loadDepts();
}

async function addDeptConfig(deptId) {
  const category = $(`cat-sel-${deptId}`)?.value;
  const count    = parseInt($(`cnt-${deptId}`)?.value);

  if (!category || !count || count < 1) {
    toast('يرجى اختيار الفئة وعدد الأسئلة', 'error'); return;
  }

  const { error } = await db.from('deptconfig').upsert(
    { department_id: deptId, category, count },
    { onConflict: 'department_id,category' }
  );

  if (error) { toast(error.message, 'error'); return; }
  toast('تم حفظ إعداد الفئة', 'success');
  loadDepts();
}

async function deleteDeptConfig(id) {
  const { error } = await db.from('deptconfig').delete().eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast('تم حذف الفئة', 'success');
  loadDepts();
}

// ────────────────────────────────────────────────────────────
// TAB 4: RESULTS
// ────────────────────────────────────────────────────────────
let allResults = [];

async function loadResults() {
  const tbody = $('res-tbody');
  if (!tbody) return;
  tbody.innerHTML = skeletonRows(8);

  const { data } = await db
    .from('results')
    .select('*')
    .order('submitted_at', { ascending: false });

  allResults = data || [];
  renderResults(allResults);
}

function renderResults(list) {
  const tbody = $('res-tbody');
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
      <div class="empty-icon">📊</div><p>لا توجد نتائج حتى الآن</p></div></td></tr>`;
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
      <td class="en" style="font-size:0.8rem;">${new Date(r.submitted_at).toLocaleString('ar-EG')}</td>
      <td>
        <div class="flex gap-1" style="justify-content:center;">
          <button class="btn btn-ghost btn-sm" onclick="viewResponses('${r.id}')">عرض</button>
          <button class="btn btn-danger btn-sm" onclick="deleteResult('${r.id}','${r.sap}')">حذف</button>
        </div>
      </td>
    </tr>
  `).join('');
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

  renderResults(filtered);
}

async function deleteResult(id, sap) {
  if (!await confirmDlg(`هل تريد حذف نتيجة هذا الموظف؟ سيتمكن من إعادة الاختبار.`)) return;
  const { error } = await db.from('results').delete().eq('id', id);
  if (error) { toast(error.message, 'error'); return; }

  // Also unlink device
  await db.from('devices').delete().eq('sap', sap);
  toast('تم حذف النتيجة وإعادة تعيين الجهاز', 'success');
  loadResults();
}

async function viewResponses(resultId) {
  const modal = $('responses-modal');
  if (!modal) return;

  $('responses-body').innerHTML = '<tr><td colspan="5"><div class="skeleton" style="height:20px;"></div></td></tr>'.repeat(5);
  openModal('responses-modal');

  const { data } = await db
    .from('responses')
    .select('*')
    .eq('result_id', resultId)
    .order('q_id');

  if (!data?.length) {
    $('responses-body').innerHTML = `<tr><td colspan="5" class="text-center text-muted">لا توجد تفاصيل</td></tr>`;
    return;
  }

  $('responses-body').innerHTML = data.map(r => `
    <tr style="background:${r.is_correct ? 'var(--success-light)' : 'var(--danger-light)'};">
      <td class="en">${r.q_id}</td>
      <td style="text-align:right;font-size:0.85rem;">${r.question_text}</td>
      <td>${r.category}</td>
      <td class="en" style="font-weight:700;">${r.employee_answer}</td>
      <td class="en" style="font-weight:700;color:var(--success);">${r.correct_answer}</td>
      <td>
        <span class="badge ${r.is_correct ? 'badge-success' : 'badge-danger'}">
          ${r.is_correct ? '✓' : '✗'}
        </span>
      </td>
    </tr>
  `).join('');
}

// ────────────────────────────────────────────────────────────
// TAB 5: QUESTION ANALYSIS
// ────────────────────────────────────────────────────────────
async function loadAnalysis() {
  const tbody = $('analysis-tbody');
  if (!tbody) return;
  tbody.innerHTML = skeletonRows(7);

  const { data: responses } = await db
    .from('responses')
    .select('q_id, question_text, category, type, is_correct, department_name');

  if (!responses?.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
      <div class="empty-icon">📉</div><p>لا توجد بيانات كافية للتحليل</p></div></td></tr>`;
    return;
  }

  // Aggregate per question
  const qMap = {};
  responses.forEach(r => {
    if (!qMap[r.q_id]) {
      qMap[r.q_id] = { q_id: r.q_id, question: r.question_text, category: r.category, type: r.type, attempts: 0, correct: 0, wrong: 0 };
    }
    qMap[r.q_id].attempts++;
    if (r.is_correct) qMap[r.q_id].correct++;
    else qMap[r.q_id].wrong++;
  });

  const qs = Object.values(qMap)
    .map(q => ({ ...q, success_rate: Math.round((q.correct / q.attempts) * 100) }))
    .sort((a, b) => a.success_rate - b.success_rate);

  tbody.innerHTML = qs.map(q => {
    const rateClass = q.success_rate < 50 ? 'rate-row-red' : q.success_rate < 70 ? 'rate-row-orange' : 'rate-row-green';
    const barClass  = q.success_rate < 50 ? 'low' : q.success_rate < 70 ? 'mid' : '';
    return `
      <tr class="${rateClass}">
        <td class="en">${q.q_id}</td>
        <td style="text-align:right;max-width:220px;font-size:0.85rem;">${q.question}</td>
        <td>${q.category}</td>
        <td>${q.type === 'mcq' ? 'MCQ' : 'صح/خطأ'}</td>
        <td class="en">${q.attempts}</td>
        <td class="en" style="color:var(--success);">${q.correct}</td>
        <td class="en" style="color:var(--danger);">${q.wrong}</td>
        <td>
          <div class="flex items-center gap-1" style="justify-content:center;">
            <span class="en" style="font-weight:700;min-width:36px;">${q.success_rate}%</span>
            <div class="rate-bar">
              <div class="rate-bar-fill ${barClass}" style="width:${q.success_rate}%;"></div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Bar chart - top 10 worst
  renderAnalysisChart(qs.slice(0, 10));
}

let analysisChart;
function renderAnalysisChart(qs) {
  const canvas = $('analysis-chart');
  if (!canvas) return;
  if (analysisChart) analysisChart.destroy();

  analysisChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: qs.map(q => `س${q.q_id}`),
      datasets: [{
        label: 'نسبة النجاح %',
        data: qs.map(q => q.success_rate),
        backgroundColor: qs.map(q =>
          q.success_rate < 50 ? '#c0392b' : q.success_rate < 70 ? '#e67e22' : '#1a7a4a'
        ),
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100, ticks: { callback: v => v + '%' } }
      }
    }
  });
}

// ────────────────────────────────────────────────────────────
// TAB 6: USERS
// ────────────────────────────────────────────────────────────
let allUsers = [];
let currentUserId = null;

async function loadUsers() {
  const tbody = $('users-tbody');
  if (!tbody) return;
  tbody.innerHTML = skeletonRows(5);

  const { data } = await db.from('users').select('*').order('created_at');
  allUsers = data || [];
  renderUsers(allUsers);
}

function renderUsers(list) {
  const tbody = $('users-tbody');
  if (!tbody) return;

  tbody.innerHTML = list.map(u => `
    <tr>
      <td>${u.name}</td>
      <td class="en">${u.email}</td>
      <td>
        <span class="badge ${u.role === 'admin' ? 'badge-warning' : 'badge-info'}">
          ${u.role === 'admin' ? 'مسؤول' : 'مدير'}
        </span>
      </td>
      <td class="en" style="font-size:0.8rem;">${new Date(u.created_at).toLocaleDateString('ar-EG')}</td>
      <td>
        <div class="flex gap-1" style="justify-content:center;">
          <button class="btn btn-primary btn-sm" onclick="editUser('${u.id}')">تعديل</button>
          ${u.id !== currentUserId ? `<button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')">حذف</button>` : '<span class="badge badge-muted">أنت</span>'}
        </div>
      </td>
    </tr>
  `).join('');
}

function newUser() {
  $('user-modal-title').textContent = 'إضافة مستخدم جديد';
  $('user-form').reset();
  $('user-form-id').value = '';
  $('user-form-pass').required = true;
  $('user-pass-hint').style.display = 'none';
  openModal('user-modal');
}

function editUser(id) {
  const u = allUsers.find(u => u.id === id);
  if (!u) return;
  $('user-modal-title').textContent = 'تعديل بيانات المستخدم';
  $('user-form-id').value    = u.id;
  $('user-form-name').value  = u.name;
  $('user-form-email').value = u.email;
  $('user-form-role').value  = u.role;
  $('user-form-pass').value  = '';
  $('user-form-pass').required = false;
  $('user-pass-hint').style.display = 'block';
  openModal('user-modal');
}

async function saveUser() {
  const id    = $('user-form-id').value;
  const name  = $('user-form-name').value.trim();
  const email = $('user-form-email').value.trim();
  const role  = $('user-form-role').value;
  const pass  = $('user-form-pass').value;

  if (!name || !email || !role) {
    toast('يرجى ملء جميع الحقول المطلوبة', 'error'); return;
  }

  if (!id) {
    // Create new user in Supabase Auth
    if (!pass) { toast('يرجى إدخال كلمة المرور', 'error'); return; }
    const { data: authData, error: authErr } = await db.auth.admin?.createUser?.({
      email, password: pass, email_confirm: true
    });
    // Note: admin.createUser requires service_role key, not available client-side
    // Instruct admin to create via Supabase dashboard and then insert into users table
    toast('يرجى إنشاء المستخدم أولاً من لوحة Supabase Auth ثم إدراجه هنا', 'warning');
    return;
  }

  // Update existing user profile
  const { error } = await db.from('users').update({ name, role }).eq('id', id);
  if (error) { toast(error.message, 'error'); return; }

  toast('تم تحديث بيانات المستخدم', 'success');
  closeModal('user-modal');
  loadUsers();
}

async function deleteUser(id) {
  if (id === currentUserId) { toast('لا يمكنك حذف حسابك الخاص', 'error'); return; }
  if (!await confirmDlg('هل تريد حذف هذا المستخدم؟')) return;
  const { error } = await db.from('users').delete().eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast('تم حذف المستخدم', 'success');
  loadUsers();
}

// ── HELPERS ────────────────────────────────────────────────
async function updateKPIs() {
  const { count: totalEmps } = await db.from('employees').select('*', { count: 'exact', head: true });
  const { count: totalRes }  = await db.from('results').select('*', { count: 'exact', head: true });
  const { count: totalQs }   = await db.from('questions').select('*', { count: 'exact', head: true });

  countUp($('kpi-emps'), totalEmps || 0);
  countUp($('kpi-results'), totalRes || 0);
  countUp($('kpi-questions'), totalQs || 0);
}

function populateDeptFilter(selId, depts) {
  const sel = $(selId);
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = `<option value="">جميع الأقسام</option>` +
    depts.map(d => `<option value="${d.id}" ${d.id === current ? 'selected' : ''}>${d.name}</option>`).join('');
}

// ── INIT ──────────────────────────────────────────────────
(async () => {
  // Auth guard
  const { requireRole, renderUserHeader, getCurrentUser } = window;
  const user = await requireRole('admin');
  if (!user) return;
  currentUserId = user.id;

  await renderUserHeader('#user-name', '#user-role');
  showTab('employees');

  // Load initial KPIs
  updateKPIs();
})();
