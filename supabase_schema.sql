  -- ============================================================
  -- SKILL MATRIX SYSTEM — Supabase Schema
  -- El-Araby Group | WM Department
  -- Run this entire file in Supabase SQL Editor
  -- ============================================================

  -- ── 1. TABLES ──────────────────────────────────────────────

  CREATE TABLE IF NOT EXISTS departments (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL UNIQUE,
    created_at timestamp DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS employees (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sap              text NOT NULL UNIQUE,
    name             text NOT NULL,
    department_id    uuid REFERENCES departments(id) ON DELETE SET NULL,
    password         text NOT NULL,
    national_id      text,
    phone            text,
    status           integer DEFAULT 1,       -- 1=active, 0=blocked
    device_block     boolean DEFAULT false,
    registered_email text DEFAULT '',
    created_at       timestamp DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS questions (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    q_id       integer NOT NULL UNIQUE,
    category   text NOT NULL,
    type       text NOT NULL CHECK (type IN ('mcq','t/f')),
    question   text NOT NULL,
    opt_a      text,
    opt_b      text,
    opt_c      text,
    opt_d      text,
    answer     text NOT NULL,
    created_at timestamp DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS deptconfig (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
    category      text NOT NULL,
    count         integer NOT NULL,
    UNIQUE(department_id, category)
  );

  CREATE TABLE IF NOT EXISTS results (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sap             text NOT NULL,
    name            text NOT NULL,
    department_id   uuid REFERENCES departments(id) ON DELETE SET NULL,
    department_name text NOT NULL,
    score           integer NOT NULL,
    total           integer NOT NULL,
    percent         numeric NOT NULL,
    passed          boolean NOT NULL,
    suggestion      text DEFAULT '',
    submitted_at    timestamp DEFAULT now(),
    device_hash     text
  );

  CREATE TABLE IF NOT EXISTS responses (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id       uuid REFERENCES results(id) ON DELETE CASCADE,
    sap             text NOT NULL,
    department_name text NOT NULL,
    q_id            integer NOT NULL,
    question_text   text NOT NULL,
    category        text NOT NULL,
    type            text NOT NULL,
    employee_answer text NOT NULL,
    correct_answer  text NOT NULL,
    is_correct      boolean NOT NULL,
    submitted_at    timestamp DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS devices (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_hash text NOT NULL UNIQUE,
    sap         text NOT NULL,
    first_seen  timestamp DEFAULT now(),
    blocked     boolean DEFAULT false
  );

  CREATE TABLE IF NOT EXISTS users (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email      text NOT NULL UNIQUE,
    role       text NOT NULL CHECK (role IN ('admin','manager')),
    name       text NOT NULL,
    created_at timestamp DEFAULT now()
  );

  -- ── 2. INDEXES ─────────────────────────────────────────────

  CREATE INDEX IF NOT EXISTS idx_employees_sap           ON employees(sap);
  CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
  CREATE INDEX IF NOT EXISTS idx_questions_category      ON questions(category);
  CREATE INDEX IF NOT EXISTS idx_questions_q_id          ON questions(q_id);
  CREATE INDEX IF NOT EXISTS idx_results_sap             ON results(sap);
  CREATE INDEX IF NOT EXISTS idx_results_department_id   ON results(department_id);
  CREATE INDEX IF NOT EXISTS idx_results_submitted_at    ON results(submitted_at);
  CREATE INDEX IF NOT EXISTS idx_responses_result_id     ON responses(result_id);
  CREATE INDEX IF NOT EXISTS idx_responses_sap           ON responses(sap);
  CREATE INDEX IF NOT EXISTS idx_devices_device_hash     ON devices(device_hash);
  CREATE INDEX IF NOT EXISTS idx_devices_sap             ON devices(sap);
  CREATE INDEX IF NOT EXISTS idx_deptconfig_dept         ON deptconfig(department_id);

  -- ── 3. ENABLE ROW LEVEL SECURITY ───────────────────────────

  ALTER TABLE departments  ENABLE ROW LEVEL SECURITY;
  ALTER TABLE employees    ENABLE ROW LEVEL SECURITY;
  ALTER TABLE questions    ENABLE ROW LEVEL SECURITY;
  ALTER TABLE deptconfig   ENABLE ROW LEVEL SECURITY;
  ALTER TABLE results      ENABLE ROW LEVEL SECURITY;
  ALTER TABLE responses    ENABLE ROW LEVEL SECURITY;
  ALTER TABLE devices      ENABLE ROW LEVEL SECURITY;
  ALTER TABLE users        ENABLE ROW LEVEL SECURITY;

  -- ── 4. RLS POLICIES ────────────────────────────────────────

  -- Helper: check if current user is admin
  CREATE OR REPLACE FUNCTION is_admin()
  RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    );
  $$;

  -- Helper: check if current user is admin or manager
  CREATE OR REPLACE FUNCTION is_admin_or_manager()
  RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin','manager')
    );
  $$;

  -- DEPARTMENTS: public read, admin write
  CREATE POLICY "departments_public_read"  ON departments FOR SELECT USING (true);
  CREATE POLICY "departments_admin_insert" ON departments FOR INSERT WITH CHECK (is_admin());
  CREATE POLICY "departments_admin_update" ON departments FOR UPDATE USING (is_admin());
  CREATE POLICY "departments_admin_delete" ON departments FOR DELETE USING (is_admin());

  -- EMPLOYEES: public read (SAP lookup — no sensitive fields returned by app), admin write
  CREATE POLICY "employees_public_read"    ON employees FOR SELECT USING (true);
  CREATE POLICY "employees_admin_insert"   ON employees FOR INSERT WITH CHECK (is_admin());
  CREATE POLICY "employees_admin_update"   ON employees FOR UPDATE USING (is_admin());
  CREATE POLICY "employees_admin_delete"   ON employees FOR DELETE USING (is_admin());

  -- QUESTIONS: public read (app never fetches answer column via anon), admin write
  CREATE POLICY "questions_public_read"    ON questions FOR SELECT USING (true);
  CREATE POLICY "questions_admin_insert"   ON questions FOR INSERT WITH CHECK (is_admin());
  CREATE POLICY "questions_admin_update"   ON questions FOR UPDATE USING (is_admin());
  CREATE POLICY "questions_admin_delete"   ON questions FOR DELETE USING (is_admin());

  -- DEPTCONFIG: public read, admin write
  CREATE POLICY "deptconfig_public_read"   ON deptconfig FOR SELECT USING (true);
  CREATE POLICY "deptconfig_admin_insert"  ON deptconfig FOR INSERT WITH CHECK (is_admin());
  CREATE POLICY "deptconfig_admin_update"  ON deptconfig FOR UPDATE USING (is_admin());
  CREATE POLICY "deptconfig_admin_delete"  ON deptconfig FOR DELETE USING (is_admin());

  -- RESULTS: workers can insert their own; admin/manager can read all; admin can delete
  CREATE POLICY "results_insert_own"       ON results FOR INSERT WITH CHECK (true);
  CREATE POLICY "results_staff_read"       ON results FOR SELECT USING (is_admin_or_manager());
  CREATE POLICY "results_admin_delete"     ON results FOR DELETE USING (is_admin());

  -- RESPONSES: workers can insert; admin/manager can read all
  CREATE POLICY "responses_insert_own"     ON responses FOR INSERT WITH CHECK (true);
  CREATE POLICY "responses_staff_read"     ON responses FOR SELECT USING (is_admin_or_manager());

  -- DEVICES: public can insert/read own; admin can read all and update
  CREATE POLICY "devices_public_insert"    ON devices FOR INSERT WITH CHECK (true);
  CREATE POLICY "devices_public_read"      ON devices FOR SELECT USING (true);
  CREATE POLICY "devices_admin_update"     ON devices FOR UPDATE USING (is_admin());
  CREATE POLICY "devices_admin_delete"     ON devices FOR DELETE USING (is_admin());

  -- USERS: admin only
  CREATE POLICY "users_admin_all"          ON users FOR ALL USING (is_admin());

  -- ── 5. SUPABASE EDGE FUNCTION (score-exam) ─────────────────
  -- Deploy separately via Supabase CLI:
  -- supabase functions deploy score-exam
  -- File content shown in supabase_edge_function.ts

  -- ── 6. SAMPLE SEED DATA ────────────────────────────────────

  -- Departments
  INSERT INTO departments (name) VALUES
    ('البلاستيك'),
    ('التجميع'),
    ('مراقبة الجودة'),
    ('المرتجعات'),
    ('المستودع')
  ON CONFLICT (name) DO NOTHING;

  -- Notes:
  -- 1. Create your first admin user via Supabase Auth Dashboard (Authentication > Users)
  -- 2. Then insert into users table:
  --    INSERT INTO users (id, email, role, name)
  --    VALUES ('<auth_user_id_from_dashboard>', 'admin@elaraby.com', 'admin', 'System Admin');
  -- 3. Upload employees and questions via the Admin Dashboard Excel upload feature.

  -- ── END OF SCHEMA ──────────────────────────────────────────
