import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const { empCode, password } = await request.json()

    // 🚩 [ส่วนที่ 1] จำลองการเช็คกับส่วนกลาง (Mock Central Auth)
    let isCentralAuthSuccess = false
    let centralUserData = null

    if ((empCode === "admin" && password === "1234") || (empCode === "user" && password === "1234")) {
      isCentralAuthSuccess = true
      centralUserData = {
        emp_code: empCode,
        full_name: empCode === "admin" ? "ผู้ดูแลระบบ กฟภ." : "พนักงาน กฟภ.",
        department: "กองคอมพิวเตอร์"
      }
    }

    if (!isCentralAuthSuccess) {
      return NextResponse.json({ success: false, error: "รหัสพนักงานหรือรหัสผ่านเข้าเครื่องไม่ถูกต้อง" }, { status: 401 })
    }

    // 🚩 [ส่วนที่ 2] เชื่อมต่อกับตาราง public.users ใน Supabase (ถ้ามี)
    let finalUser = {
      id: empCode === 'admin' ? 'admin-id' : 'user-id',
      emp_code: centralUserData?.emp_code,
      full_name: centralUserData?.full_name,
      department: centralUserData?.department,
      role: empCode === 'admin' ? 'admin' : 'user'
    }

    try {
      const supabase = await createClient()
      
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('emp_code', empCode)
        .single()

      if (userData) {
        finalUser = userData
      } else {
        // 🌟 [ส่วนที่ 3] ถ้ายังไม่มีในระบบ ให้ลงทะเบียนอัตโนมัติ
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([
            {
              emp_code: centralUserData?.emp_code,
              full_name: centralUserData?.full_name,
              department: centralUserData?.department,
              role: empCode === 'admin' ? 'admin' : 'user'
            }
          ])
          .select()
          .single()

        if (!insertError && newUser) {
          finalUser = newUser
        }
      }
    } catch (dbError) {
      console.error("Database (Supabase) is not available, using mock user data:", dbError)
      // ใช้ finalUser (mock) ต่อไป
    }

    // ✅ สร้าง Response พร้อมข้อมูล User
    const response = NextResponse.json({
      success: true,
      user: {
        id: finalUser.id,
        emp_code: finalUser.emp_code,
        full_name: finalUser.full_name,
        department: finalUser.department,
        role: finalUser.role
      }
    })

    // 🍪 เซ็ต Cookie เพื่อเป็นบัตรผ่านให้ Middleware (มีอายุ 1 วัน)
    response.cookies.set('custom-auth-session', 'true', {
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })

    return response

  } catch (error: any) {
    console.error("Auth Bridge Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
