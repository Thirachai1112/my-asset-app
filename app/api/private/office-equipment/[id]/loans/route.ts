import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyPrivateIP, forbiddenResponse } from '@/utils/ip-verifier'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyPrivateIP(req)) return forbiddenResponse()

  const { id } = await params
  const equipId = Number.parseInt(id, 10)
  if (!Number.isInteger(equipId)) {
    return NextResponse.json({ error: 'Invalid Equipment ID' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('officeequipmentloans')
      .select('*')
      .eq('equipment_id', equipId)
      .order('borrowed_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/private/office-equipment/:id/loans] Supabase error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
