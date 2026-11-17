import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { code, state } = await request.json()

    if (!code || !state) {
      return NextResponse.json({ success: false, error: 'Missing code or state' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const savedState = cookieStore.get('oauth_state')?.value

    if (!savedState || state !== savedState) {
      return NextResponse.json({
        success: false,
        error: 'Invalid state parameter (CSRF protection failed)'
      }, { status: 400 })
    }

    cookieStore.set('oauth_state', '', { maxAge: 0, path: '/' })

    const tokenUrl = process.env.SSO_TOKEN_URL || 'https://sso.pea.co.th/oauth2/token'
    const userInfoUrl = process.env.SSO_USERINFO_URL || 'https://sso.pea.co.th/oauth2/userinfo'
    const clientId = process.env.client_id
    const clientSecret = process.env.client_secret
    const requestUrl = new URL(request.url)
    const appOrigin = (process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin).replace(/\/$/, '')
    const redirectUri = process.env.REDIRECT_URI_CALLBACK || `${appOrigin}/login/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        error: 'SSO client credentials are not configured on the server'
      }, { status: 500 })
    }

    const tokenParams = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString()
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error('[SSO Callback] Token exchange failed:', errText)
      return NextResponse.json({ success: false, error: `Failed to exchange code: ${tokenRes.statusText}` }, { status: tokenRes.status })
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'No access token returned from SSO' }, { status: 400 })
    }

    const userInfoRes = await fetch(userInfoUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })

    if (!userInfoRes.ok) {
      console.error('[SSO Callback] Userinfo request failed:', userInfoRes.statusText)
      return NextResponse.json({ success: false, error: 'Failed to fetch userinfo from SSO' }, { status: userInfoRes.status })
    }

    const userinfo = await userInfoRes.json()
    console.log('[SSO Callback] Received userinfo (Full JSON):', JSON.stringify(userinfo, null, 2))

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
      return NextResponse.json({ success: false, error: 'Could not extract employee code from SSO profile' }, { status: 400 })
    }

    // สร้าง Admin Supabase Client ด้วย Service Role Key (sb_secret_...) เพื่อข้าม RLS
    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Match the employee code exactly and tolerate legacy duplicate rows.
    const userQuery = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('emp_code', empCode)
      .limit(1)
      .maybeSingle()
    let userData = userQuery.data
    const dbError = userQuery.error

    if (dbError) {
      console.error(`[SSO Callback] Database query error for "${empCode}" [${dbError.code ?? 'unknown'}]:`, dbError.message)
      return NextResponse.json({
        success: false,
        error: `Database query failed${dbError.code ? ` (${dbError.code})` : ''}`
      }, { status: 500 })
    }

    // ถ้ายังไม่มีข้อมูลในระบบ ให้ระบบทำการลงทะเบียน (Insert) ให้อัตโนมัติทันที
    if (!userData) {
      console.log(`[SSO Callback] Employee "${empCode}" not found in DB. Auto-registering...`)

      const { data: newUserData, error: insertError } = await supabaseAdmin
        .from('users')
        .insert([
          {
            emp_code: empCode,
            full_name: userinfo.hr_fullname_th || userinfo.name || 'พนักงาน PEA',
            department: userinfo.hr_department || userinfo.hr_dept_sap_full || null,
            Job_position: userinfo.hr_stell_text_full || userinfo.hr_position || null,
            role: 'user'
          }
        ])
        .select()
        .single()

      if (insertError) {
        console.error(`[SSO Callback] FULL INSERT ERROR:`, JSON.stringify(insertError, null, 2))
        return NextResponse.json({
          success: false,
          error: `Database Insert Failed: ${insertError.message}`
        }, { status: 500 })
      }

      userData = newUserData
    }

    // ตั้งค่า Custom session cookie สำหรับใช้งานในระบบ
    cookieStore.set('custom-auth-session', 'true', {
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
      httpOnly: true,
      secure: requestUrl.protocol === 'https:',
      sameSite: 'lax'
    })

    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        emp_code: userData.emp_code,
        full_name: userData.full_name,
        department: userData.department,
        role: userData.role,
        Job_position: userData.Job_position
      }
    })

  } catch (error: unknown) {
    console.error('[SSO Callback] Server error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}