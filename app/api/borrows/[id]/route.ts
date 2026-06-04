import { NextResponse } from 'next/server'
import { createClient } from '../../../../utils/supabase/server'

// PUT: บันทึกการ "คืนอุปกรณ์" (อัปเดต return_date และเปลี่ยนสถานะ Asset กลับเป็น Available)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params // คืนรายการ borrows ID นี้

  try {
    const body = await request.json()
    // รับ asset_id มาด้วยเพื่อสลับสถานะตัวเครื่องคืนให้
    const { asset_id, return_date } = body 

    if (!asset_id) {
      return NextResponse.json({ error: 'กรุณาระบุ asset_id เพื่อทำการคืนสินทรัพย์' }, { status: 400 })
    }

    const actualReturnDate = return_date || new Date().toISOString()

    // 1. อัปเดตตาราง borrows บันทึกวันส่งคืน
    const { data: borrowData, error: borrowError } = await supabase
      .from('borrows')
      .update({ return_date: actualReturnDate })
      .eq('id', id)
      .select()

    if (borrowError) {
      return NextResponse.json({ error: borrowError.message }, { status: 500 })
    }

    // 2. ปลดล็อกสถานะในตาราง assets กลับมาเป็น 'Available' เพื่อให้คนอื่นยืมต่อได้
    await supabase
      .from('assets')
      .update({ status: 'Available' })
      .eq('id', asset_id)

    return NextResponse.json({ 
      success: true, 
      message: 'บันทึกการคืนสินทรัพย์สำเร็จและปลดล็อกตัวเครื่องแล้ว', 
      data: borrowData[0] 
    })

  } catch (err) {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 })
  }
}