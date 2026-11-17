import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyPrivateIP, forbiddenResponse } from '@/utils/ip-verifier'

export async function POST(req: NextRequest) {
  if (!verifyPrivateIP(req)) return forbiddenResponse()

  try {
    const body = await req.json()
    const {
      equipment_ids,
      borrower_name,
      due_date,
      notes,
      borrower_emp_id,
      borrower_contact,
    } = body

    if (!Array.isArray(equipment_ids) || equipment_ids.length === 0) {
      return NextResponse.json({ error: 'equipment_ids array is required and must not be empty' }, { status: 400 })
    }
    if (!borrower_name || typeof borrower_name !== 'string' || borrower_name.trim() === '') {
      return NextResponse.json({ error: 'borrower_name is required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const batchId = `batch-${randomUUID()}`
    const { data, error } = await supabase.rpc('create_office_equipment_loans', {
      p_equipment_ids: equipment_ids.map(Number),
      p_borrower_name: borrower_name.trim(),
      p_borrower_emp_id: borrower_emp_id || null,
      p_borrower_contact: borrower_contact || null,
      p_due_date: due_date || null,
      p_notes: notes || null,
      p_batch_id: batchId,
    })

    if (error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'One or more equipment IDs were not found' }, { status: 404 })
      }
      if (error.message.includes('active loan')) {
        return NextResponse.json({ error: 'One or more items already have active loan records' }, { status: 400 })
      }
      if (error.message.includes('Duplicate equipment IDs')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({ success: true, data, batch_id: batchId }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/private/office-equipment/borrow-batch] Supabase error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
