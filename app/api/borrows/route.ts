import { NextResponse } from 'next/server'
import { createClient } from '../../../utils/supabase/server'

// 1. GET: ดึงประวัติการยืมทั้งหมด พร้อมดึงข้อมูล Assets และ Users มารวมด้วย (Join)
export async function GET() {
  const supabase = await createClient()

  const { data: borrows, error } = await supabase
    .from('borrows')
    .select(`
      id,
      doc_id,
      borrower_name,
      borrower_dept,
      purpose,
      borrow_date,
      due_date,
      return_date,
      assets ( id, name, brand, serial_number ),
      users ( id, full_name, emp_code )
    `)
    .order('borrow_date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: borrows })
}

// 2. POST: บันทึกการยืมอุปกรณ์ชิ้นใหม่ (ทำรายการยืม + อัปเดตสถานะของชิ้นนั้น)
export async function POST(request: Request) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { 
      doc_id, user_id, asset_id, borrower_name, 
      borrower_dept, purpose, borrow_date, due_date 
    } = body

    // Validation เบื้องต้น
    if (!asset_id || !borrower_name) {
      return NextResponse.json({ error: 'กรุณาระบุข้อมูลสินทรัพย์และชื่อผู้ยืม' }, { status: 400 })
    }

    // [ขั้นตอนพิเศษ] เช็คก่อนว่าสินทรัพย์ชิ้นนี้ว่างให้ยืมไหม
    const { data: assetCheck } = await supabase
      .from('assets')
      .select('status')
      .eq('id', asset_id)
      .single()

    if (assetCheck && assetCheck.status === 'Borrowed') {
      return NextResponse.json({ error: 'สินทรัพย์ชิ้นนี้ถูกยืมไปแล้ว ไม่สามารถยืมซ้ำได้' }, { status: 400 })
    }

    // ตั๋วที่ 1: บันทึกข้อมูลลงตาราง borrows
    const { data: borrowData, error: borrowError } = await supabase
      .from('borrows')
      .insert([
        {
          doc_id: doc_id || null,
          user_id: user_id || null,
          asset_id,
          borrower_name,
          borrower_dept: borrower_dept || null,
          purpose: purpose || null,
          borrow_date: borrow_date || new Date().toISOString(),
          due_date: due_date || null
        }
      ])
      .select()

    if (borrowError) {
      return NextResponse.json({ error: borrowError.message }, { status: 500 })
    }

    // ตั๋วที่ 2: เปลี่ยนสถานะในตาราง assets ให้เป็น 'Borrowed' ทันที
    await supabase
      .from('assets')
      .update({ status: 'Borrowed' })
      .eq('id', asset_id)

    return NextResponse.json({ 
      success: true, 
      message: 'บันทึกการยืมเรียบร้อยและล็อกสถานะสินทรัพย์แล้ว', 
      data: borrowData[0] 
    }, { status: 201 })

  } catch (err) {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 })
  }
}