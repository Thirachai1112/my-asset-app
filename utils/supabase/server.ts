// utils/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // ส่งคืน null หรือ throw error ที่สื่อสารได้ชัดเจนขึ้น
    // แต่เพื่อไม่ให้แอปพังทั้งหมด จะลอง return client เปล่าๆ หรือ handle ใน route
    // ในที่นี้เลือก throw เพื่อให้ route handle
    throw new Error('Supabase environment variables are missing')
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // บริหารจัดการใน Server Component
          }
        },
      },
    }
  )
}