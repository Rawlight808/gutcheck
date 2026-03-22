import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function createSafeClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'undefined') {
    console.error('ChewClue: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
    // Plausible URL shape so createClient doesn't throw; auth will fail gracefully
    return createClient('https://placeholder.invalid', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.invalid')
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = createSafeClient()
