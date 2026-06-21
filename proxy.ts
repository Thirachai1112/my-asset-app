import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware สำหรับจัดการ Session และการเข้าถึงหน้าต่างๆ
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const path = request.nextUrl.pathname

  // 0. อนุญาตให้เข้าถึง API ทุกตัวโดยไม่ต้องผ่าน Middleware ตัวนี้
  if (path.startsWith('/api')) {
    return response
  }

  // สร้าง Supabase Client สำหรับ Middleware
  // เพิ่มการตรวจสอบเผื่อกรณีไม่ได้เซ็ตค่า Env
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // ถ้าไม่มี Env ให้ปล่อยผ่านไปก่อน (หรือจะ Redirect ไปหน้า Error ก็ได้)
    // ในที่นี้เลือกให้ไปที่หน้า Login หรือปล่อยผ่านเพื่อให้ App ไม่ล่ม
    return response
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // ตรวจสอบข้อมูล User จาก Auth Session (Supabase) และจาก Cookie (Custom API)
  const { data: { user } } = await supabase.auth.getUser()
  const hasCustomSession = request.cookies.has('custom-auth-session')
  const isLoggedIn = user || hasCustomSession

  // --- กฎการเข้าถึงหน้าต่างๆ (Access Rules) ---

  // 1. ถ้าไม่ได้ Login และพยายามเข้าหน้าอื่นๆ (ยกเว้นหน้าแรก / และหน้า /login)
  if (!isLoggedIn && path !== '/' && !path.startsWith('/login') && !path.startsWith('/repairs/request') && !path.startsWith('/borrows/request')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. ลบส่วนที่ Redirect ออกจากหน้า Login เพื่อลดความซับซ้อนและป้องกัน Loop
  // (เดิมเคยมีการ Redirect isLoggedIn && path.startsWith('/login') ไปที่ '/')

  return response
}

// กำหนดขอบเขตของ Middleware (ไม่ให้รันในไฟล์ Static)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
