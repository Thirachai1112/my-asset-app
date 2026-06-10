import { NextResponse } from 'next/server'
// 💡 ใช้ utils/supabase/server ตามโครงสร้างที่ถูกต้องของช่าง
import { createClient } from '@/utils/supabase/server' 

// 🟢 1. ขาดึงข้อมูลประวัติยืม-คืน (หน้าบ้านยิงมาตอนโหลดตาราง)
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: borrows, error } = await supabase
      .from('borrows')
      .select(`
        id,
        doc_id,
        borrower_name,
        position,
        borrower_dept,
        phone,
        purpose,
        borrow_date,
        due_date,
        return_date,
        quantity,
        assets ( id, name, brand, contract_number, serial_number, type )
      `
    )
      .order('borrow_date', { ascending: false })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, history: borrows })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// 🔵 2. ขาอัปเดตสถานะตอนกดปุ่ม "คืนของ"
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { borrowId, assetId } = await request.json()

    if (!borrowId || !assetId) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }

    // ตั๋วที่ 1: มาร์ควันเวลาคืนในประวัติการยืม
    const { error: borrowError } = await supabase
      .from('borrows')
      .update({ return_date: new Date().toISOString() })
      .eq('id', borrowId)

    if (borrowError) throw borrowError

    // ตั๋วที่ 2: ปรับสถานะครุภัณฑ์ในตลังให้กลับมาพร้อมใช้งาน (Available)
    const { error: assetError } = await supabase
      .from('assets')
      .update({ status: 'Available' })
      .eq('id', assetId)

    if (assetError) throw assetError

    return NextResponse.json({ success: true, message: 'บันทึกการคืนครุภัณฑ์เรียบร้อย' })

  } catch (error: any) {
    console.error('Return process error:', error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}