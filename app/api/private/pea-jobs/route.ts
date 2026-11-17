import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyPrivateIP, forbiddenResponse } from '@/utils/ip-verifier'

export async function GET(req: NextRequest) {
  if (!verifyPrivateIP(req)) return forbiddenResponse()

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('peajobs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/private/pea-jobs] Supabase error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!verifyPrivateIP(req)) return forbiddenResponse()

  try {
    const supabase = createAdminClient()
    const body = await req.json()
    const {
      pea_site_id,
      job_name,
      job_description,
      job_type,
      priority,
      department,
      requester_name,
      requester_emp_id,
      requester_contact,
      notification_doc_no,
      equipment_ids,
      problem_equipment_ids,
      budget_transaction_ids,
    } = body

    if (pea_site_id === undefined || pea_site_id === null) {
      return NextResponse.json({ error: 'pea_site_id is required' }, { status: 400 })
    }
    if (typeof job_name !== 'string' || job_name.trim() === '') {
      return NextResponse.json({ error: 'job_name is required and cannot be empty' }, { status: 400 })
    }

    const trimmedJobName = job_name.trim()
    const { data: existingJob, error: duplicateError } = await supabase
      .from('peajobs')
      .select('id')
      .eq('pea_site_id', pea_site_id)
      .eq('job_name', trimmedJobName)
      .maybeSingle()

    if (duplicateError) throw duplicateError
    if (existingJob) {
      return NextResponse.json({ error: `Job name '${trimmedJobName}' already exists for site ${pea_site_id}` }, { status: 400 })
    }

    const equipmentCheckList = [...new Set([...(equipment_ids || []), ...(problem_equipment_ids || [])])]
    if (equipmentCheckList.length > 0) {
      const { data: foundEquipment, error } = await supabase
        .from('officeequipments')
        .select('id')
        .in('id', equipmentCheckList)

      if (error) throw error
      if (!foundEquipment || foundEquipment.length !== equipmentCheckList.length) {
        return NextResponse.json({ error: 'One or more equipment IDs not found' }, { status: 404 })
      }
    }

    const { data, error } = await supabase
      .from('peajobs')
      .insert({
        pea_site_id,
        job_name: trimmedJobName,
        job_description: job_description || null,
        job_type: job_type || null,
        priority: priority || 'ปกติ',
        department: department || null,
        requester_name: requester_name || null,
        requester_emp_id: requester_emp_id || null,
        requester_contact: requester_contact || null,
        notification_doc_no: notification_doc_no || null,
        equipment_ids: equipment_ids ?? null,
        problem_equipment_ids: problem_equipment_ids ?? null,
        budget_transaction_ids: budget_transaction_ids ?? null,
        status: 'เปิดงาน',
        user_id: null,
        user_name: 'Unknown',
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/private/pea-jobs] Supabase error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
