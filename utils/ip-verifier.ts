import { NextRequest, NextResponse } from 'next/server'

/**
 * Verifies if the request source IP is inside the allowlist of PRIVATE_API_ALLOWED_IPS.
 * Returns true if allowed, false otherwise.
 */
export function verifyPrivateIP(req: NextRequest): boolean {
  // Read allowed IPs from environment variable
  const allowedIPsEnv = process.env.PRIVATE_API_ALLOWED_IPS || ''
  
  // Split allowed IPs by comma and clean up spaces
  const allowedIPs = allowedIPsEnv
    .split(',')
    .map(ip => ip.trim())
    .filter(ip => ip.length > 0)

  // NextRequest no longer exposes req.ip, so use the proxy-provided IP headers.
  const xForwardedFor = req.headers.get('x-forwarded-for')
  const clientIP = req.headers.get('x-real-ip') || xForwardedFor?.split(',')[0].trim() || ''

  // If allowlist is empty, default reject for security
  if (allowedIPs.length === 0) {
    console.warn('[verifyPrivateIP] PRIVATE_API_ALLOWED_IPS is empty. Request rejected by default.')
    return false
  }

  const isAllowed = allowedIPs.includes(clientIP)
  
  if (!isAllowed) {
    console.warn(`[verifyPrivateIP] Request blocked. Client IP: ${clientIP}. Allowed: ${JSON.stringify(allowedIPs)}`)
  }

  return isAllowed
}

/**
 * Shortcut helper to generate 403 response if IP verification fails
 */
export function forbiddenResponse() {
  return NextResponse.json(
    { error: 'Forbidden: Access denied' },
    { status: 403 }
  )
}
