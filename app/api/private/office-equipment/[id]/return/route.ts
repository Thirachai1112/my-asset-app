import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyPrivateIP, forbiddenResponse } from '@/utils/ip-verifier'

export async function POST(
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
    const body = await req.json().catch(() => ({}))
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('return_office_equipment', {
      p_equipment_id: equipId,
      p_notes: body.notes || null,
    })

    if (error) {
      if (error.message.includes('no active loan record')) {
        return NextResponse.json(
          { error: 'Equipment is not currently marked as borrowed (no active loan record found)' },
          { status: 400 },
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, data: data[0] })
  } catch (error) {
    console.error('[POST /api/private/office-equipment/:id/return] Supabase error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
