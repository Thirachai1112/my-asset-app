import { NextResponse } from 'next/server'
import { createClient } from '../../../../utils/supabase/server'
import { logAdminActivity } from '../../../../utils/admin-logger'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const adminIdHeader = request.headers.get('x-admin-id')

  try {
    const body = await request.json()
    const { name, brand, asset_code, serial_number, contract_number, status, type } = body
    const { data, error } = await supabase
      .from('assets')
      .update({ name, brand, asset_code, serial_number, contract_number, status, type })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (adminIdHeader) {
      await logAdminActivity(supabase, parseInt(adminIdHeader), 'UPDATE_ASSET', 'assets', id)
    }

    return NextResponse.json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ', data })
  } catch (error) {
    console.error('[PUT /api/assets/:id] Request failed:', error)
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const adminIdHeader = request.headers.get('x-admin-id')

  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (adminIdHeader) {
    await logAdminActivity(supabase, parseInt(adminIdHeader), 'DELETE_ASSET', 'assets', id)
  }

  return NextResponse.json({ success: true, message: `ลบครุภัณฑ์ ID: ${id} เรียบร้อยแล้ว` })
}
