import { NextResponse } from 'next/server'
import { createClient } from '../../../../utils/supabase/server'

// 1. PUT: แก้ไขข้อมูลครุภัณฑ์ (หรือเปลี่ยนสถานะ)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params // รับ id จาก URL เช่น /api/assets/5

  try {
    const body = await request.json()
    const { name, brand, serial_number, contract_number, status, type } = body

    const { data, error } = await supabase
      .from('assets')
      .update({ 
        name, 
        brand, 
        serial_number, 
        contract_number, 
        status,
        type
      })
      .eq('id', id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ', data: data[0] })
  } catch (err) {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 })
  }
}

// 2. DELETE: ลบครุภัณฑ์ออกชั่วคราว/ถาวร
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: `ลบครุภัณฑ์ ID: ${id} เรียบร้อยแล้ว` })
}