import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out' })
  
  // ลบ Cookie บัตรผ่านออกเพื่อให้ Middleware ตรวจสอบไม่ผ่าน
  response.cookies.set('custom-auth-session', '', {
    path: '/',
    maxAge: 0, // สั่งให้หมดอายุทันที
  })

  return response
}
