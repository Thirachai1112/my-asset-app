import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function GET(request: Request) {
  try {
    const authUrl = process.env.SSO_AUTH_URL || 'https://sso2.pea.co.th/realms/pea-users/protocol/openid-connect/auth'
    const clientId = process.env.client_id
    
    // Auto-detect redirect URI to handle both localhost and IP addresses (e.g. 172.21.200.101)
    const reqUrl = new URL(request.url)
    const currentOrigin = `${reqUrl.protocol}//${reqUrl.host}`
    const redirectUri = process.env.REDIRECT_URI_CALLBACK || `${currentOrigin}/login/callback`

    if (!clientId) {
      console.error('[SSO Login] client_id is missing in environment variables')
      return NextResponse.json({ error: 'SSO configuration is incomplete: client_id is missing' }, { status: 500 })
    }

    // Generate a secure state token for CSRF protection
    const state = crypto.randomUUID()

    // Save state in a secure cookie (valid for 5 minutes)
    const cookieStore = await cookies()
    cookieStore.set('oauth_state', state, {
      path: '/',
      maxAge: 60 * 5, // 5 minutes
      httpOnly: true,
      secure: true, // Always secure since they run HTTPS
      sameSite: 'lax'
    })

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile',
      state: state
    })

    const redirectUrl = `${authUrl}?${params.toString()}`
    console.log('[SSO Login] Redirecting to:', redirectUrl)

    return NextResponse.redirect(redirectUrl)
  } catch (error: any) {
    console.error('[SSO Login] Error initiating login flow:', error)
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 })
  }
}
