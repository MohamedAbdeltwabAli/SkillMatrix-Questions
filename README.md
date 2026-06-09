# نظام تقييم المهارات — Skill Matrix System
## El-Araby Group | WM Department

---

## 📁 Project Structure

```
skill-matrix/
│
├── index.html                  ← Worker exam page
├── login.html                  ← Admin / Manager login
├── vercel.json                 ← Vercel routing & headers
│
├── admin/
│   └── index.html              ← Admin dashboard (6 tabs)
│
├── manager/
│   └── index.html              ← Manager dashboard (4 tabs)
│
├── css/
│   ├── main.css                ← Shared design tokens & utilities
│   ├── exam.css                ← Worker exam styles
│   ├── admin.css               ← Admin/Manager dashboard styles
│   └── manager.css             ← Manager-specific overrides
│
├── js/
│   ├── supabase.js             ← DB client (set your credentials here)
│   ├── auth.js                 ← Login / logout / role guard
│   ├── fingerprint.js          ← Device fingerprinting
│   ├── exam.js                 ← Full exam flow logic
│   ├── export.js               ← Excel export helpers (SheetJS)
│   ├── admin.js                ← Admin CRUD logic
│   └── manager.js              ← Manager read-only logic
│
├── supabase/
│   ├── config.toml             ← Supabase CLI config
│   └── functions/
│       └── score-exam/
│           └── index.ts        ← Edge Function (server-side scoring)
│
├── assets/
│   ├── employees_template.csv  ← Upload template
│   └── questions_template.csv  ← Upload template
│
└── supabase_schema.sql         ← Full DB schema (run first in Supabase)
```

---

## 🚀 Deployment Guide

### Step 1 — Supabase Setup

1. Go to [supabase.com](https://supabase.com) → Create new project
2. In **SQL Editor**, paste and run the entire contents of `supabase_schema.sql`
3. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon public` key

### Step 2 — Configure Credentials

Open `js/supabase.js` and replace the placeholders:

```js
const SUPABASE_URL      = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

### Step 3 — Create First Admin User

1. In Supabase Dashboard → **Authentication → Users → Invite user**
2. Enter admin email address
3. After user is created, copy the UUID shown
4. In **SQL Editor**, run:
   ```sql
   INSERT INTO users (id, email, role, name)
   VALUES ('<paste-uuid-here>', 'admin@elaraby.com', 'admin', 'مسؤول النظام');
   ```

### Step 4 — Deploy Edge Function

Install Supabase CLI, then:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_ID
npx supabase functions deploy score-exam
```

### Step 5 — Deploy to Vercel

```bash
# Option A: Vercel CLI
npm i -g vercel
cd skill-matrix
vercel --prod

# Option B: GitHub
# Push to GitHub → Import in vercel.com → Deploy
# No build step needed (static HTML/CSS/JS)
```

---

## 👤 User Roles

| Role    | Access |
|---------|--------|
| **Worker**  | Exam page only (`/index.html`) |
| **Manager** | View results, not-assessed list, question analysis, dept reports + Excel export |
| **Admin**   | Full CRUD: employees, questions, departments, results, users |

---

## 🔑 Worker Password Format

Default password = last 2 digits of national ID + last 2 digits of phone number.

Example: National ID ends in `78`, phone ends in `56` → password: `7856`

---

## 📊 Exam Flow

1. Worker enters SAP number → name & department auto-fill
2. Worker enters password → verified against `employees` table
3. System checks: account active? device registered? already tested?
4. Questions fetched per department configuration (category × count)
5. Answers submitted to Edge Function for server-side scoring
6. Result saved to `results` + `responses` tables
7. Device fingerprint registered in `devices` table

---

## 🏢 Department Configuration

In Admin → Departments tab, for each department:
- Select a question category (e.g. "السلامة")
- Set the number of questions to draw from that category
- Repeat for multiple categories per department

Example for "البلاستيك":
- السلامة: 5 questions
- الجودة: 5 questions
- التشغيل: 10 questions
= 20 questions total for this department

---

## 📤 Bulk Upload Formats

### Employees CSV/Excel columns:
`SAP | Name | Department | Password | NationalID | Phone | Status`

- **Department**: must exactly match a department name in the database
- **Status**: 1 = active, 0 = blocked

### Questions CSV/Excel columns:
`Q_ID | Category | Type | Question | Opt_A | Opt_B | Opt_C | Opt_D | Answer`

- **Type**: `mcq` or `t/f`
- **Answer**: for MCQ use `A/B/C/D`; for T/F use `1` (صح) or `0` (خطأ)

---

## 🔒 Security Features

- **Device fingerprinting**: each device is bound to one SAP after first use
- **One attempt per SAP**: results table prevents re-taking
- **Server-side scoring**: Edge Function holds correct answers; browser never sees them
- **RLS policies**: Supabase Row Level Security restricts data per role
- **Account blocking**: admin can block specific employees or devices

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML5 + CSS3 + JavaScript (ES6+) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| Scoring | Supabase Edge Functions (Deno) |
| Charts | Chart.js |
| Excel | SheetJS (xlsx) |
| Hosting | Vercel (static) |
| Fonts | Google Fonts (Tajawal + Inter) |

---

## 📞 Support

For issues with deployment or configuration, check:
- Supabase Docs: [supabase.com/docs](https://supabase.com/docs)
- Vercel Docs: [vercel.com/docs](https://vercel.com/docs)
