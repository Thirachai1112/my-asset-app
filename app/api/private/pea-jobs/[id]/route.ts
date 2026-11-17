import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyPrivateIP, forbiddenResponse } from '@/utils/ip-verifier'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyPrivateIP(req)) return forbiddenResponse()

  const { id } = await params
  const jobId = Number.parseInt(id, 10)
  if (!Number.isInteger(jobId)) {
    return NextResponse.json({ error: 'Invalid Job ID' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('peajobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/private/pea-jobs/:id] Supabase error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyPrivateIP(req)) return forbiddenResponse()

  const { id } = await params
  const jobId = Number.parseInt(id, 10)
  if (!Number.isInteger(jobId)) {
    return NextResponse.json({ error: 'Invalid Job ID' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const body = await req.json()
    const allowedFields = [
      'job_name',
      'job_description',
      'job_type',
      'priority',
      'department',
      'requester_name',
      'requester_emp_id',
      'requester_contact',
      'notification_doc_no',
    ]

    const updatePayload: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (body[key] !== undefined) updatePayload[key] = body[key]
    }

    updatePayload.user_id = null
    updatePayload.user_name = 'Unknown'

    if (Object.keys(updatePayload).length <= 2) {
      return NextResponse.json({ success: true, message: 'No fields to update' })
    }

    const { data: currentJob, error: fetchError } = await supabase
      .from('peajobs')
      .select('pea_site_id')
      .eq('id', jobId)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!currentJob) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    if (typeof updatePayload.job_name === 'string') {
      const trimmedName = updatePayload.job_name.trim()
      const { data: duplicateJob, error: duplicateError } = await supabase
        .from('peajobs')
        .select('id')
        .eq('pea_site_id', currentJob.pea_site_id)
        .eq('job_name', trimmedName)
        .neq('id', jobId)
        .maybeSingle()

      if (duplicateError) throw duplicateError
      if (duplicateJob) {
        return NextResponse.json(
          { error: `Job name '${trimmedName}' already exists for site ${currentJob.pea_site_id}` },
          { status: 400 },
        )
      }
      updatePayload.job_name = trimmedName
    }

    const { data, error } = await supabase
      .from('peajobs')
      .update(updatePayload)
      .eq('id', jobId)
      .select()
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[PUT /api/private/pea-jobs/:id] Supabase error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyPrivateIP(req)) return forbiddenResponse()

  const { id } = await params
  const jobId = Number.parseInt(id, 10)
  if (!Number.isInteger(jobId)) {
    return NextResponse.json({ error: 'Invalid Job ID' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('peajobs')
      .delete()
      .eq('id', jobId)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    return NextResponse.json({ success: true, message: 'Job deleted successfully' })
  } catch (error) {
    console.error('[DELETE /api/private/pea-jobs/:id] Supabase error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
