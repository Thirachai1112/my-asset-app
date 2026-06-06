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

// 🗑️ ฟังก์ชันรองรับการลบครุภัณฑ์รายชิ้น
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const assetId = params.id

    if (!assetId) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID ของครุภัณฑ์' }, { status: 400 })
    }

    // 🔒 1. ด่านเช็คซ้ำฝั่งหลังบ้าน: เครื่องโดนยืมอยู่ ห้ามลบ!
    const { data: asset, error: checkError } = await supabase
      .from('assets')
      .select('status')
      .eq('id', assetId)
      .single()

    if (checkError) throw checkError
    if (asset?.status === 'Borrowed' || asset?.status === 'borrowed') {
      return NextResponse.json({ success: false, error: 'ครุภัณฑ์นี้กำลังถูกยืมอยู่ ไม่สามารถลบได้' }, { status: 400 })
    }

    // ⚡ 2. ปลดล็อกบัก Foreign Key: อัปเดตประวัติการยืมเก่าของอุปกรณ์ชิ้นนี้ให้ asset_id เป็น NULL
    const { error: updateBorrowError } = await supabase
      .from('borrows')
      .update({ asset_id: null }) // ปลดความสัมพันธ์เก่าออกอย่างปลอดภัย สถิติข้อมูลส่วนอื่นไม่พัง
      .eq('asset_id', assetId)

    if (updateBorrowError) {
      console.error('ปลดล็อก Foreign Key ใน borrows ไม่สำเร็จ:', updateBorrowError.message)
      throw updateBorrowError
    }

    // 🗑️ 3. สั่งลบอุปกรณ์จริงออกจากตาราง assets หลังปลดล็อกพันธนาการแล้ว
    const { error: deleteError } = await supabase
      .from('assets')
      .delete()
      .eq('id', assetId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true, message: 'ลบครุภัณฑ์ออกจากระบบสำเร็จ' })

  } catch (error: any) {
    console.error('Delete asset error:', error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}