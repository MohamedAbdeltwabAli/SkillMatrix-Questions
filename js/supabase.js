// js/supabase.js
// Supabase client initialization
// Replace the placeholder values below with your actual Supabase project credentials.
// Find them in: Supabase Dashboard → Project Settings → API

const SUPABASE_URL      = 'https://db.rixbfbaclahauxxqconb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeGJmYmFjbGFoYXV4eHFjb25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5OTUxNzgsImV4cCI6MjA5NjU3MTE3OH0.j0SLzITq1VPHozPSJzhZfGyIWRF_pCtt1xZaGnuv2d0';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Edge function base URL (same project)
const EDGE_URL = `${SUPABASE_URL}/functions/v1`;
