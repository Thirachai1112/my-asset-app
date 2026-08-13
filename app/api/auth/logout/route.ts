import { NextResponse } from 'next/server'

export async function POST() {
  const logoutUrl = process.env.SSO_LOGOUT_URL
  const clientId = process.env.client_id
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  let ssoLogoutUrl = ''
  if (logoutUrl && clientId) {
    const params = new URLSearchParams({
      client_id: clientId,
      post_logout_redirect_uri: appUrl,
      lockout: 'true'
    })
    ssoLogoutUrl = `${logoutUrl}?${params.toString()}`
  }

  const response = NextResponse.json({ 
    success: true, 
    message: 'Logged out',
    logoutUrl: ssoLogoutUrl 
  })
  
  // ลบ Cookie บัตรผ่านออกเพื่อให้ Middleware ตรวจสอบไม่ผ่าน
  response.cookies.set('custom-auth-session', '', {
    path: '/',
    maxAge: 0, // สั่งให้หมดอายุทันที
  })

  return response
}
