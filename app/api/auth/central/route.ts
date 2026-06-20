import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const { empCode, password } = await request.json()

    // 🚩 [ส่วนที่ 1] ตรวจสอบข้อมูลผู้ใช้งานและรหัสผ่านจากตาราง users ใน Supabase
    let finalUser = null

    try {
      const supabase = await createClient()
      
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('emp_code', empCode)
        .single()

      if (fetchError || !userData) {
        return NextResponse.json({ 
          success: false, 
          error: "ไม่พบสิทธิ์การใช้งานของรหัสพนักงานนี้ในระบบ" 
        }, { status: 403 })
      }

      // 1. ตรวจสอบรหัสผ่าน (เปรียบเทียบค่าตรงๆ ตามข้อมูลในตาราง)
      if (userData.password_hash !== password) {
        return NextResponse.json({ 
          success: false, 
          error: "รหัสพนักงานหรือรหัสผ่านเข้าเครื่องไม่ถูกต้อง" 
        }, { status: 401 })
      }

      // 2. ตรวจสอบสิทธิ์ว่าต้องเป็น admin เท่านั้น
      if (userData.role !== 'admin') {
        return NextResponse.json({ 
          success: false, 
          error: "ไม่มีสิทธิ์เข้าใช้งานระบบ (สำหรับผู้ดูแลระบบเท่านั้น)" 
        }, { status: 403 })
      }

      finalUser = userData
    } catch (dbError) {
      console.error("Database (Supabase) access error:", dbError)
      
      // กรณีเชื่อมต่อ Database ไม่ได้ ให้ยอมรับรหัส 'admin' / '1234' (Mock fallback เพื่อความปลอดภัยตอน Test)
      if (empCode === 'admin' && password === '1234') {
        finalUser = {
          id: 'admin-id',
          emp_code: 'admin',
          full_name: 'ผู้ดูแลระบบ (Mock Fallback)',
          department: 'กองคอมพิวเตอร์',
          role: 'admin'
        }
      } else {
        return NextResponse.json({ 
          success: false, 
          error: "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล" 
        }, { status: 500 })
      }
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
