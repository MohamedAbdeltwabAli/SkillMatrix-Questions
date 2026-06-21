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
    settings:   'إعدادات النظام',
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
    settings:   loadSettings,
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
  tbody.innerHTML = skeletonRows(8);

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

  const selectAll = $('select-all-emp');
  if (selectAll) selectAll.checked = false;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
      <div class="empty-icon">👥</div><p>لا يوجد موظفون</p></div></td></tr>`;
    updateBulkBar();
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
        <span class="badge ${e.exam_allowed ? 'badge-success' : 'badge-danger'}">
          ${e.exam_allowed ? 'مسموح' : 'غير مسموح'}
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
          <button class="btn btn-sm ${e.exam_allowed?'btn-warning':'btn-success'}"
                  onclick="toggleExamPermission('${e.id}', ${e.exam_allowed})">
            ${e.exam_allowed?'إلغاء الإذن':'السماح بالاختبار'}
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
  updateBulkBar();
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

async function toggleExamPermission(id, currentExamAllowed) {
  const { error } = await db.from('employees').update({ exam_allowed: !currentExamAllowed }).eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast(!currentExamAllowed ? 'تم السماح بدخول الاختبار للموظف' : 'تم إلغاء إذن الاختبار للموظف', 'success');
  loadEmployees();
}

async function bulkAllowExam() {
  const ids = [...document.querySelectorAll('.emp-check:checked')].map(cb => cb.dataset.id);
  if (!ids.length) return;
  if (!await confirmDlg(`هل تريد السماح بدخول الاختبار لـ ${ids.length} موظف؟`)) return;
  const { error } = await db.from('employees').update({ exam_allowed: true }).in('id', ids);
  if (error) { toast(error.message, 'error'); return; }
  toast(`تم السماح بدخول الاختبار لـ ${ids.length} موظف`, 'success');
  loadEmployees();
}

async function bulkBlockExam() {
  const ids = [...document.querySelectorAll('.emp-check:checked')].map(cb => cb.dataset.id);
  if (!ids.length) return;
  if (!await confirmDlg(`هل تريد إلغاء إذن الاختبار لـ ${ids.length} موظف؟`)) return;
  const { error } = await db.from('employees').update({ exam_allowed: false }).in('id', ids);
  if (error) { toast(error.message, 'error'); return; }
  toast(`تم إلغاء إذن الاختبار لـ ${ids.length} موظف`, 'success');
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

// Arabic and case-insensitive string normalization helper
function normalizeDeptName(str) {
  if (!str) return '';
  return str.trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

// Excel upload for employees
async function uploadEmployeesFile(file) {
  if (!file) return;
  const cols = ['SAP', 'Name', 'Department', 'Password', 'NationalID', 'Phone', 'Status'];
  const { rows, errors } = await parseUploadedFile(file, cols);

  if (errors.length) { toast(errors[0], 'error'); return; }

  const { data: depts } = await db.from('departments').select('id, name');
  const deptNameToId = {};
  depts?.forEach(d => {
    deptNameToId[normalizeDeptName(d.name)] = d.id;
  });

  const progress = $('emp-upload-progress');
  const statusEl = $('emp-upload-status');
  if (progress) { progress.style.display = 'block'; }

  let done = 0;
  for (const row of rows) {
    const deptName = row.Department ? row.Department.trim() : '';
    const deptKey = normalizeDeptName(deptName);
    let deptId = deptNameToId[deptKey] || null;

    if (deptName && !deptId) {
      // Department does not exist, insert it on the fly
      const { data: newDept, error: deptErr } = await db
        .from('departments')
        .insert({ name: deptName })
        .select('id')
        .single();
      if (!deptErr && newDept) {
        deptId = newDept.id;
        deptNameToId[deptKey] = deptId; // Cache it
      } else {
        console.error('Failed to auto-create department:', deptName, deptErr);
      }
    }

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

// Excel upload for questions
async function uploadQuestionsFile(file) {
  if (!file) return;
  const cols = ['Q_ID', 'Category', 'Type', 'Question', 'Opt_A', 'Opt_B', 'Opt_C', 'Opt_D', 'Answer'];
  const { rows, errors } = await parseUploadedFile(file, cols);

  if (errors.length) { toast(errors[0], 'error'); return; }
  if (!rows.length)  { toast('لا توجد بيانات في الملف', 'error'); return; }

  const progress = $('q-upload-progress');
  const statusEl = $('q-upload-status');
  if (progress) progress.style.display = 'block';

  let done = 0;
  for (const row of rows) {
    const qId = parseInt(row.Q_ID);
    if (!qId || !row.Question || !row.Category || !row.Type || !row.Answer) continue;

    const type = row.Type.toLowerCase().trim();
    const payload = {
      q_id:     qId,
      category: row.Category.trim(),
      type:     (type === 'mcq' || type === 't/f') ? type : 'mcq',
      question: row.Question.trim(),
      opt_a:    row.Opt_A  || null,
      opt_b:    row.Opt_B  || null,
      opt_c:    row.Opt_C  || null,
      opt_d:    row.Opt_D  || null,
      answer:   row.Answer.trim(),
    };

    await db.from('questions').upsert(payload, { onConflict: 'q_id' });
    done++;
    if (progress) {
      $('q-upload-bar').style.width = Math.round((done / rows.length) * 100) + '%';
      if (statusEl) statusEl.textContent = `تم معالجة ${done} من ${rows.length}`;
    }
  }

  toast(`تم رفع ${done} سؤال`, 'success');
  if (progress) progress.style.display = 'none';
  loadQuestions();
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

  // Populate category filter
  const cats = [...new Set(allQuestions.map(q => q.category))].sort();
  const catFilter = $('q-cat-filter');
  if (catFilter) {
    const current = catFilter.value;
    catFilter.innerHTML = `<option value="">جميع الفئات</option>` +
      cats.map(c => `<option value="${c}" ${c === current ? 'selected' : ''}>${c}</option>`).join('');
  }

  renderQuestions(allQuestions);
}

function renderQuestions(list) {
  const tbody = $('q-tbody');
  if (!tbody) return;

  const selectAll = $('select-all-q');
  if (selectAll) selectAll.checked = false;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
      <div class="empty-icon">❓</div><p>لا توجد أسئلة</p></div></td></tr>`;
    updateQBulkBar();
    return;
  }

  tbody.innerHTML = list.map(q => `
    <tr>
      <td><input type="checkbox" class="q-check" data-id="${q.id}" onchange="updateQBulkBar()" /></td>
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
  updateQBulkBar();
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

function updateQBulkBar() {
  const checked = document.querySelectorAll('.q-check:checked').length;
  const bar = $('q-bulk-actions-bar');
  if (bar) {
    $('q-bulk-count').textContent = checked;
    bar.classList.toggle('visible', checked > 0);
  }
}

async function bulkDeleteQuestions() {
  const ids = [...document.querySelectorAll('.q-check:checked')].map(cb => cb.dataset.id);
  if (!ids.length) return;
  if (!await confirmDlg(`هل تريد حذف ${ids.length} سؤال؟`)) return;
  const { error } = await db.from('questions').delete().in('id', ids);
  if (error) { toast(error.message, 'error'); return; }
  toast(`تم حذف ${ids.length} سؤال`, 'success');
  loadQuestions();
}

function exportSelectedEmployees() {
  const ids = [...document.querySelectorAll('.emp-check:checked')].map(cb => cb.dataset.id);
  const selected = allEmployees.filter(e => ids.includes(e.id));
  exportEmployees(selected);
}

function exportSelectedQuestions() {
  const ids = [...document.querySelectorAll('.q-check:checked')].map(cb => cb.dataset.id);
  const selected = allQuestions.filter(q => ids.includes(q.id));
  exportQuestions(selected);
}

// ────────────────────────────────────────────────────────────
// TAB 3: DEPARTMENTS & CONFIG
// ────────────────────────────────────────────────────────────
let deptList = [];
let allCategories = [];

async function loadDepts(preserveState = false) {
  const list = $('dept-list');
  if (!list) return;
  
  let scrollPos = 0;
  const contentEl = document.querySelector('.content');
  if (preserveState && contentEl) {
    scrollPos = contentEl.scrollTop;
  } else {
    list.innerHTML = '<div class="skeleton" style="height:120px;margin-bottom:1rem;"></div>'.repeat(3);
  }

  const [{ data: depts }, { data: configs }, { data: categories }] = await Promise.all([
    db.from('departments').select('*').order('name'),
    db.from('deptconfig').select('*'),
    db.from('questions').select('category').then(r => ({ data: [...new Set(r.data?.map(q => q.category) || [])] })),
  ]);

  deptList = depts || [];
  allCategories = categories || [];
  renderDeptList(deptList, configs || [], allCategories);

  if (preserveState && contentEl) {
    contentEl.scrollTop = scrollPos;
  }
}

function renderDeptList(depts, configs, categories) {
  const list = $('dept-list');
  if (!list) return;

  list.innerHTML = depts.map(dept => {
    const deptConfigs = configs.filter(c => c.department_id === dept.id);
    const totalQ = deptConfigs.reduce((s, c) => s + c.count, 0);

    const configRows = deptConfigs.map(c => `
      <div class="form-group config-item" data-cat="${c.category}" style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
        <span style="flex:1; font-size:0.88rem; font-weight:600;">${c.category}</span>
        <input type="number" class="cat-count-input" value="${c.count}" min="1"
               style="width:70px;padding:0.4rem;border:1.5px solid var(--border);border-radius:6px;text-align:center;" />
        <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" style="padding:0.3rem 0.5rem;">×</button>
      </div>
    `).join('');

    const catOptions = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

    return `
      <div class="card" style="display:flex; flex-direction:column; padding:1.25rem;">
        <div class="flex items-center gap-2" style="justify-content:space-between;margin-bottom:1rem;border-bottom:1px solid var(--border);padding-bottom:0.75rem;">
          <h3 style="font-size:1.1rem;font-weight:800;color:var(--text);margin:0;">${dept.name}</h3>
          <div class="flex gap-1">
            <button class="btn btn-ghost btn-sm" onclick="renameDept('${dept.id}','${dept.name}')" title="تعديل الاسم">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteDept('${dept.id}')" title="حذف القسم">🗑️</button>
          </div>
        </div>

        <div class="dept-summary" style="margin-top:0; margin-bottom:1.25rem; background:var(--primary-light); color:#fff; border:none; text-align:center; padding:0.5rem; border-radius:8px;">
          إجمالي الأسئلة: <strong style="font-size:1.1rem; color:#fff;">${totalQ}</strong>
        </div>

        <div style="flex:1; margin-bottom: 1rem;">
          <h4 style="font-size:0.85rem; margin-bottom:0.75rem; color:var(--text-muted);">الفئات المحددة للاختبار:</h4>
          <div id="cat-list-${dept.id}">
            ${configRows}
          </div>
          
          <select class="filter-select mt-2" style="width:100%;" onchange="addCategoryRow('${dept.id}', this)">
            <option value="">+ إضافة فئة للقسم</option>
            ${catOptions}
          </select>
        </div>

        <button class="btn btn-primary w-full" style="margin-top:auto;" onclick="saveDeptConfigBulk('${dept.id}', event)">💾 حفظ الإعدادات</button>
      </div>
    `;
  }).join('');
}

window.addCategoryRow = function(deptId, selectEl) {
  const cat = selectEl.value;
  if (!cat) return;
  
  const list = $(`cat-list-${deptId}`);
  if (list.querySelector(\`[data-cat="\${cat}"]\`)) {
    toast('هذه الفئة مضافة بالفعل', 'warning');
    selectEl.value = '';
    return;
  }
  
  const div = document.createElement('div');
  div.className = 'form-group config-item';
  div.dataset.cat = cat;
  div.style.cssText = 'display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;';
  
  div.innerHTML = \`
    <span style="flex:1; font-size:0.88rem; font-weight:600;">\${cat}</span>
    <input type="number" class="cat-count-input" value="1" min="1" style="width:70px;padding:0.4rem;border:1.5px solid var(--border);border-radius:6px;text-align:center;" />
    <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" style="padding:0.3rem 0.5rem;">×</button>
  \`;
  
  list.appendChild(div);
  selectEl.value = '';
};



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
  loadDepts(true);
}

async function deleteDept(id) {
  if (!await confirmDlg('هل تريد حذف هذا القسم؟ سيتم إزالة إعداداته أيضاً.')) return;
  const { error } = await db.from('departments').delete().eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast('تم حذف القسم', 'success');
  loadDepts(true);
}

async function saveDeptConfigBulk(deptId, event) {
  const list = $(`cat-list-${deptId}`);
  if (!list) return;

  const items = list.querySelectorAll('.config-item');
  const updates = [];

  items.forEach(item => {
    const cat = item.dataset.cat;
    const input = item.querySelector('.cat-count-input');
    const count = parseInt(input.value) || 0;
    if (count > 0) {
      updates.push({ department_id: deptId, category: cat, count });
    }
  });

  const btn = event ? event.currentTarget : null;
  let originalText = '';
  if (btn) {
    originalText = btn.innerHTML;
    btn.innerHTML = '⏳ جاري الحفظ...';
    btn.disabled = true;
  }

  try {
    // Delete all existing configs for this dept
    await db.from('deptconfig').delete().eq('department_id', deptId);
    
    // Insert the new updated list
    if (updates.length > 0) {
      const { error } = await db.from('deptconfig').insert(updates);
      if (error) throw error;
    }

    toast('تم حفظ إعدادات القسم بنجاح', 'success');
    await loadDepts(true);
  } catch (err) {
    toast(err.message, 'error');
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
}

// ────────────────────────────────────────────────────────────
// TAB 4: RESULTS
// ────────────────────────────────────────────────────────────
let allResults = [];

async function loadResults() {
  const tbody = $('res-tbody');
  if (!tbody) return;
  tbody.innerHTML = skeletonRows(9);

  const [{ data }, { data: depts }] = await Promise.all([
    db.from('results').select('*').order('submitted_at', { ascending: false }),
    db.from('departments').select('name').order('name'),
  ]);

  allResults = data || [];

  // Populate department filter
  const deptFilter = $('res-dept-filter');
  if (deptFilter) {
    const current = deptFilter.value;
    deptFilter.innerHTML = `<option value="">جميع الأقسام</option>` +
      (depts || []).map(d => `<option value="${d.name}" ${d.name === current ? 'selected' : ''}>${d.name}</option>`).join('');
  }

  renderResults(allResults);
}

function renderResults(list) {
  const tbody = $('res-tbody');
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state">
      <div class="empty-icon">📊</div><p>لا توجد نتائج حتى الآن</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(r => `
    <tr>
      <td>${r.name}</td>
      <td class="en">${r.sap}</td>
      <td>${r.department_name}</td>
      <td class="en">المحاولة ${r.attempt_number || 1}</td>
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
  tbody.innerHTML = skeletonRows(9);

  const { data: responses } = await db
    .from('responses')
    .select('sap, q_id, question_text, category, type, employee_answer, correct_answer, is_correct, department_name, submitted_at, results(attempt_number)');

  allAnalysisResponses = responses || [];

  if (!responses?.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state">
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

  analysisData = Object.values(qMap)
    .map(q => ({ ...q, success_rate: Math.round((q.correct / q.attempts) * 100) }))
    .sort((a, b) => a.success_rate - b.success_rate);

  tbody.innerHTML = analysisData.map(q => {
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
        <td>
          <button class="btn btn-ghost btn-sm" onclick="viewQuestionAttempts(${q.q_id})">التفاصيل</button>
        </td>
      </tr>
    `;
  }).join('');

  // Bar chart - top 10 worst
  renderAnalysisChart(analysisData.slice(0, 10));
}

let analysisChart;
let analysisData = []; // module-level so the export button can access it
let allAnalysisResponses = [];

function exportAnalysisReport() {
  const detailedAttempts = allAnalysisResponses.map(r => {
    const emp = allEmployees.find(e => e.sap === r.sap);
    const empName = emp ? emp.name : '—';
    return {
      sap: r.sap,
      name: empName,
      dept: r.department_name,
      q_id: r.q_id,
      question: r.question_text,
      category: r.category,
      type: r.type === 'mcq' ? 'MCQ' : 'صح/خطأ',
      emp_ans: r.employee_answer,
      correct_ans: r.correct_answer,
      result: r.is_correct ? 'صح ✓' : 'خطأ ✗',
      date: new Date(r.submitted_at).toLocaleDateString('ar-EG'),
      attempt: r.results?.attempt_number || 1,
    };
  });

  exportQuestionAnalysis(analysisData, detailedAttempts);
}

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

async function viewQuestionAttempts(qId) {
  const modal = $('q-details-modal');
  if (!modal) return;

  const qData = analysisData.find(q => q.q_id === qId);
  const questionText = qData ? qData.question : '';

  $('q-details-title').textContent = `تفاصيل الإجابات على السؤال رقم ${qId}`;
  $('q-details-text').textContent = questionText;
  $('q-details-body').innerHTML = '<tr><td colspan="7"><div class="skeleton" style="height:20px;"></div></td></tr>'.repeat(5);
  openModal('q-details-modal');

  // Load all employees in memory if not already done
  if (!allEmployees || allEmployees.length === 0) {
    const { data } = await db.from('employees').select('sap, name');
    allEmployees = data || [];
  }

  const { data: responses, error } = await db
    .from('responses')
    .select('sap, department_name, employee_answer, correct_answer, is_correct, submitted_at, results(attempt_number)')
    .eq('q_id', qId)
    .order('submitted_at', { ascending: false });

  if (error || !responses?.length) {
    $('q-details-body').innerHTML = `<tr><td colspan="7" class="text-center text-muted">لا توجد إجابات مسجلة لهذا السؤال</td></tr>`;
    return;
  }

  $('q-details-body').innerHTML = responses.map(r => {
    const emp = allEmployees.find(e => e.sap === r.sap);
    const empName = emp ? emp.name : '—';
    const attemptNum = r.results?.attempt_number || 1;
    return `
      <tr style="background:${r.is_correct ? 'var(--success-light)' : 'var(--danger-light)'};">
        <td class="en">${r.sap}</td>
        <td>${empName}</td>
        <td>${r.department_name}</td>
        <td class="en" style="font-weight:700;">${r.employee_answer}</td>
        <td class="en" style="font-weight:700;color:var(--success);">${r.correct_answer}</td>
        <td>
          <span class="badge ${r.is_correct ? 'badge-success' : 'badge-danger'}">
            ${r.is_correct ? '✓' : '✗'}
          </span>
        </td>
        <td class="en" style="font-size:0.8rem;">المحاولة ${attemptNum} - ${new Date(r.submitted_at).toLocaleDateString('ar-EG')}</td>
      </tr>
    `;
  }).join('');
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
    // Use a temporary client so we don't disrupt the current admin session
    if (!pass) { toast('يرجى إدخال كلمة المرور', 'error'); return; }

    // Use isolated storage so signUp() doesn't overwrite the admin's session
    const tempClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storageKey: 'temp-signup-' + Date.now(),
        autoRefreshToken: false,
        persistSession: false,
      }
    });
    const { data: authData, error: authErr } = await tempClient.auth.signUp({
      email,
      password: pass,
    });

    if (authErr) { toast(authErr.message, 'error'); return; }

    const newUserId = authData.user?.id;
    if (!newUserId) { toast('فشل إنشاء المستخدم في نظام المصادقة', 'error'); return; }

    // Insert profile row — admin RLS policy allows this
    const { error: insertErr } = await db.from('users').insert({
      id: newUserId,
      email,
      role,
      name,
    });

    if (insertErr) { toast(insertErr.message, 'error'); return; }

    toast('تم إنشاء المستخدم بنجاح', 'success');
    closeModal('user-modal');
    loadUsers();
    return;
  }

  // Update existing user profile
  const { error } = await db.from('users').update({ name, role }).eq('id', id);
  if (error) { toast(error.message, 'error'); return; }

  // Update Auth password if a new one was entered
  if (pass) {
    const { error: pwErr } = await db.rpc('admin_update_user_password', {
      target_user_id: id,
      new_password: pass,
    });
    if (pwErr) { toast(pwErr.message, 'error'); return; }
  }

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
  const [
    { count: totalEmps  },
    { count: totalRes   },
    { count: totalQs    },
    { count: totalDepts },
  ] = await Promise.all([
    db.from('employees').select('*',   { count: 'exact', head: true }),
    db.from('results').select('*',     { count: 'exact', head: true }),
    db.from('questions').select('*',   { count: 'exact', head: true }),
    db.from('departments').select('*', { count: 'exact', head: true }),
  ]);

  countUp($('kpi-emps'),      totalEmps   || 0);
  countUp($('kpi-results'),   totalRes    || 0);
  countUp($('kpi-questions'), totalQs     || 0);
  countUp($('kpi-depts'),     totalDepts  || 0);
}

function populateDeptFilter(selId, depts) {
  const sel = $(selId);
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = `<option value="">جميع الأقسام</option>` +
    depts.map(d => `<option value="${d.id}" ${d.id === current ? 'selected' : ''}>${d.name}</option>`).join('');
}

// ────────────────────────────────────────────────────────────
// TAB: SETTINGS
// ────────────────────────────────────────────────────────────
async function loadSettings() {
  const { data, error } = await db.from('settings').select('key, value');
  if (error) { toast('تعذر تحميل الإعدادات', 'error'); return; }

  const map = {};
  (data || []).forEach(s => { map[s.key] = s.value; });

  const modeEl = $('device-check-mode');
  if (modeEl && map.device_check_mode) modeEl.value = map.device_check_mode;

  const durationEl = $('exam-duration');
  if (durationEl && map.exam_duration) durationEl.value = map.exam_duration;
}

async function saveSettings() {
  const mode = $('device-check-mode')?.value;
  const duration = $('exam-duration')?.value;
  if (!mode || !duration) {
    toast('يرجى ملء جميع الحقول المطلوبة', 'error'); return;
  }

  const { error: err1 } = await db.from('settings').upsert(
    { key: 'device_check_mode', value: mode, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );

  const { error: err2 } = await db.from('settings').upsert(
    { key: 'exam_duration', value: duration, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );

  if (err1 || err2) {
    toast((err1 || err2).message, 'error'); return;
  }
  toast('تم حفظ الإعدادات بنجاح', 'success');
}

// ────────────────────────────────────────────────────────────
// ── INIT ────────────────────────────────────────────────────
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
