import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const { code, state } = await request.json()

    if (!code || !state) {
      return NextResponse.json({ success: false, error: 'Missing code or state' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const savedState = cookieStore.get('oauth_state')?.value

    // 1. ย้ายมาเช็ค State ให้เรียบร้อยก่อน ค่อยเคลียร์คุกกี้ทิ้ง
    if (!savedState || state !== savedState) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid state parameter (CSRF protection failed)' 
      }, { status: 400 })
    }

    // Clear the state cookie after validation passes
    cookieStore.set('oauth_state', '', { maxAge: 0, path: '/' })

    const tokenUrl = process.env.SSO_TOKEN_URL || 'https://sso.pea.co.th/oauth2/token'
    const userInfoUrl = process.env.SSO_USERINFO_URL || 'https://sso.pea.co.th/oauth2/userinfo'
    const clientId = process.env.client_id
    const clientSecret = process.env.client_secret
    const redirectUri = process.env.REDIRECT_URI_CALLBACK || 'http://localhost:3000/login/callback'

    if (!clientId || !clientSecret) {
      return NextResponse.json({ 
        success: false, 
        error: 'SSO client credentials are not configured on the server' 
      }, { status: 500 })
    }

    // Exchange authorization code for tokens
    const tokenParams = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams.toString()
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error('[SSO Callback] Token exchange failed:', errText)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to exchange code: ${tokenRes.statusText}` 
      }, { status: tokenRes.status })
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'No access token returned from SSO' }, { status: 400 })
    }

    // Fetch user info using the access token
    const userInfoRes = await fetch(userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!userInfoRes.ok) {
      console.error('[SSO Callback] Userinfo request failed:', userInfoRes.statusText)
      return NextResponse.json({ success: false, error: 'Failed to fetch userinfo from SSO' }, { status: userInfoRes.status })
    }

    const userinfo = await userInfoRes.json()
    console.log('[SSO Callback] Received userinfo (Full JSON):', JSON.stringify(userinfo, null, 2))

    // Map userinfo to emp_code
    const rawEmpCode = (
      userinfo.emp_code || 
      userinfo.preferred_username || 
      userinfo.username || 
      userinfo.uid || 
      userinfo.sub || 
      (userinfo.email ? userinfo.email.split('@')[0] : null)
    )

    const empCode = rawEmpCode ? String(rawEmpCode).trim() : ''
    console.log('[SSO Callback] Extracted & Cleaned empCode:', `"${empCode}"`)

    if (!empCode) {
      return NextResponse.json({ 
        success: false, 
        error: 'Could not extract employee code from SSO profile' 
      }, { status: 400 })
    }

    // Connect to Supabase to check if the employee code exists
    const supabase = await createClient()
    
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('*')
      .ilike('emp_code', empCode)
      .single()

    if (dbError || !userData) {
      console.warn(`[SSO Callback] Unauthorized employee login attempt: "${empCode}" | DB Error:`, dbError)
      return NextResponse.json({ 
        success: false, 
        error: `ไม่พบสิทธิ์การใช้งานของรหัสพนักงาน "${empCode}" ในระบบ` 
      }, { status: 403 })
    }

    // Generate Custom session cookie (consistent with central auth)
    cookieStore.set('custom-auth-session', 'true', {
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    })

    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        emp_code: userData.emp_code,
        full_name: userData.full_name,
        department: userData.department,
        role: userData.role
      }
    })

  } catch (error: any) {
    console.error('[SSO Callback] Server error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}