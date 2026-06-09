// js/auth.js
// Auth helpers — login, logout, role enforcement

/**
 * Get the current session user + role from users table.
 * Returns null if not authenticated.
 */
async function getCurrentUser() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return null;

  const { data: userRow } = await db
    .from('users')
    .select('id, email, role, name')
    .eq('id', session.user.id)
    .single();

  return userRow || null;
}

/**
 * Redirect to login if not authenticated, or if role doesn't match required.
 * @param {string|string[]} requiredRole - 'admin' | 'manager' | ['admin','manager']
 */
async function requireRole(requiredRole) {
  const user = await getCurrentUser();
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  if (!user || !roles.includes(user.role)) {
    window.location.href = '/login.html';
    return null;
  }
  return user;
}

/**
 * Login with email + password.
 * @returns {{ user, error }}
 */
async function login(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { user: null, error: error.message };

  const { data: userRow } = await db
    .from('users')
    .select('id, email, role, name')
    .eq('id', data.user.id)
    .single();

  if (!userRow) {
    await db.auth.signOut();
    return { user: null, error: 'المستخدم غير مسجل في النظام. تواصل مع المسؤول.' };
  }

  return { user: userRow, error: null };
}

/**
 * Logout and redirect to login page.
 */
async function logout() {
  await db.auth.signOut();
  window.location.href = '/login.html';
}

/**
 * Display current user info in the dashboard header.
 */
async function renderUserHeader(nameSelector, roleSelector) {
  const user = await getCurrentUser();
  if (!user) return;
  const nameEl = document.querySelector(nameSelector);
  const roleEl = document.querySelector(roleSelector);
  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = user.role === 'admin' ? 'مسؤول النظام' : 'مدير القسم';
}
