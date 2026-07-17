import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = 'Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing in environment configuration.'
    console.error(`[Supabase Browser Client] Error: ${errorMsg}`)
    throw new Error(errorMsg)
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}