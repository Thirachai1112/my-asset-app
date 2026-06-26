import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// PATCH: ต่ออายุการยืม (Renew Borrow)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const body = await request.json()
    const { new_due_date } = body

    if (!new_due_date) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุวันที่คืนใหม่' }, { status: 400 })
    }

    // 1. ตรวจสอบว่ารายการยืมนี้มีอยู่จริง และยังไม่คืน
    const { data: borrow, error: fetchError } = await supabase
      .from('borrows')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !borrow) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการยืมนี้' }, { status: 404 })
    }

    if (borrow.return_date) {
      return NextResponse.json({ success: false, error: 'รายการนี้คืนอุปกรณ์ไปแล้ว ไม่สามารถต่ออายุได้' }, { status: 400 })
    }

    // 2. ตรวจสอบจำนวนครั้งที่ต่ออายุแล้ว (จำกัดสูงสุด 3 ครั้ง)
    const currentRenewalCount = borrow.renewal_count || 0
    if (currentRenewalCount >= 3) {
      return NextResponse.json({ success: false, error: 'ต่ออายุได้สูงสุด 3 ครั้งเท่านั้น กรุณาติดต่อเจ้าหน้าที่' }, { status: 400 })
    }

    // 3. แปลงวันที่จากรูปแบบ d/m/y (ไทย) เป็น ISO
    let parsedDate: Date
    const dateParts = new_due_date.split('/')
    if (dateParts.length === 3) {
      // รูปแบบ d/m/y (ไทย)
      const day = parseInt(dateParts[0], 10)
      const month = parseInt(dateParts[1], 10) - 1 // JS months are 0-indexed
      let year = parseInt(dateParts[2], 10)
      if (year > 2500) year -= 543 // แปลง พ.ศ. -> ค.ศ.
      parsedDate = new Date(year, month, day)
    } else {
      // รูปแบบ ISO fallback
      parsedDate = new Date(new_due_date)
    }

    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ success: false, error: 'รูปแบบวันที่ไม่ถูกต้อง กรุณากรอกเป็น วันที่/เดือน/ปี พ.ศ.' }, { status: 400 })
    }

    // 4. ตรวจสอบว่าวันที่คืนใหม่ต้องมากกว่าวันที่คืนเดิม
    const oldDueDate = new Date(borrow.due_date)
    oldDueDate.setHours(0, 0, 0, 0)
    parsedDate.setHours(0, 0, 0, 0)
    
    if (parsedDate <= oldDueDate) {
      return NextResponse.json({ success: false, error: 'วันที่คืนใหม่ต้องมากกว่าวันที่คืนเดิม' }, { status: 400 })
    }

    // 5. อัปเดต due_date และเพิ่ม renewal_count
    const { data: updatedBorrow, error: updateError } = await supabase
      .from('borrows')
      .update({
        due_date: parsedDate.toISOString(),
        renewal_count: currentRenewalCount + 1
      })
      .eq('id', id)
      .select(`
        id,
        doc_id,
        borrower_name,
        borrower_dept,
        phone,
        purpose,
        borrow_date,
        due_date,
        return_date,
        quantity,
        renewal_count,
        assets ( id, name, brand, contract_number, serial_number )
      `)
      .single()

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `ต่ออายุการยืมสำเร็จ ครั้งที่ ${currentRenewalCount + 1}`,
      data: updatedBorrow
    })

  } catch (err) {
    return NextResponse.json({ success: false, error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 })
  }
}
