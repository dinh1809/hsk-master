import { createClient } from '@supabase/supabase-js'

// Hardcoded credentials for production deployment
// Fallback to env vars for local development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nmljpvoknogugywtrigz.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbGpwdm9rbm9ndWd5d3RyaWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMDg3NjgsImV4cCI6MjA1MDg4NDc2OH0.wKnmHlylXZjtWFIXTJFXkg_XUzJ62zvECxFfXRqVHVU'

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase credentials missing!")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
