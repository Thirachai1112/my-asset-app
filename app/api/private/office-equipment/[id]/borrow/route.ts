import { randomUUID } from 'node:crypto'
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
    const body = await req.json()
    const { borrower_name, due_date, notes, borrower_emp_id, borrower_contact } = body
    if (!borrower_name || typeof borrower_name !== 'string' || borrower_name.trim() === '') {
      return NextResponse.json({ error: 'borrower_name is required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('create_office_equipment_loans', {
      p_equipment_ids: [equipId],
      p_borrower_name: borrower_name.trim(),
      p_borrower_emp_id: borrower_emp_id || null,
      p_borrower_contact: borrower_contact || null,
      p_due_date: due_date || null,
      p_notes: notes || null,
      p_batch_id: `batch-${randomUUID()}`,
    })

    if (error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
      }
      if (error.message.includes('active loan')) {
        return NextResponse.json({ error: 'Equipment is already borrowed and has an active loan' }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({ success: true, data: data[0] }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/private/office-equipment/:id/borrow] Supabase error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
