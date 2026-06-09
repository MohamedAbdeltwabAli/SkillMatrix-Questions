// js/supabase.js
// Supabase client initialization
// Replace the placeholder values below with your actual Supabase project credentials.
// Find them in: Supabase Dashboard → Project Settings → API

const SUPABASE_URL      = 'https://rixbfbaclahauxxqconb.supabase.co';   // Project API URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGJmYmFjbGFoYXV4eHFjb25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5OTUxNzgsImV4cCI6MjA5NjU3MTE3OH0.j0SLzITq1VPHozPSJzhZfGyIWRF_pCtt1xZaGnuv2d0';  // public anon key — safe to expose

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Edge function base URL (Supabase functions endpoint)
const EDGE_URL = 'https://rixbfbaclahauxxqconb.functions.supabase.co';
