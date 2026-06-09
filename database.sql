-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT departments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.employees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sap text NOT NULL UNIQUE,
  name text NOT NULL,
  department_id uuid,
  password text NOT NULL,
  national_id text,
  phone text,
  status integer DEFAULT 1,
  device_block boolean DEFAULT false,
  registered_email text DEFAULT ''::text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT employees_pkey PRIMARY KEY (id),
  CONSTRAINT employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id)
);
CREATE TABLE public.questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  q_id integer NOT NULL UNIQUE,
  category text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['mcq'::text, 't/f'::text])),
  question text NOT NULL,
  opt_a text,
  opt_b text,
  opt_c text,
  opt_d text,
  answer text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT questions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.deptconfig (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  department_id uuid,
  category text NOT NULL,
  count integer NOT NULL,
  CONSTRAINT deptconfig_pkey PRIMARY KEY (id),
  CONSTRAINT deptconfig_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id)
);
CREATE TABLE public.results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sap text NOT NULL,
  name text NOT NULL,
  department_id uuid,
  department_name text NOT NULL,
  score integer NOT NULL,
  total integer NOT NULL,
  percent numeric NOT NULL,
  passed boolean NOT NULL,
  suggestion text DEFAULT ''::text,
  submitted_at timestamp without time zone DEFAULT now(),
  device_hash text,
  CONSTRAINT results_pkey PRIMARY KEY (id),
  CONSTRAINT results_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id)
);
CREATE TABLE public.responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  result_id uuid,
  sap text NOT NULL,
  department_name text NOT NULL,
  q_id integer NOT NULL,
  question_text text NOT NULL,
  category text NOT NULL,
  type text NOT NULL,
  employee_answer text NOT NULL,
  correct_answer text NOT NULL,
  is_correct boolean NOT NULL,
  submitted_at timestamp without time zone DEFAULT now(),
  CONSTRAINT responses_pkey PRIMARY KEY (id),
  CONSTRAINT responses_result_id_fkey FOREIGN KEY (result_id) REFERENCES public.results(id)
);
CREATE TABLE public.devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_hash text NOT NULL UNIQUE,
  sap text NOT NULL,
  first_seen timestamp without time zone DEFAULT now(),
  blocked boolean DEFAULT false,
  CONSTRAINT devices_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'manager'::text])),
  name text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);