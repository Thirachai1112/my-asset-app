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
      phone,
      purpose,
      borrow_date,
      due_date,
      return_date,
      assets ( id, name, brand, contract_number, serial_number ),
      users ( id, full_name, emp_code )
    `)
    .order('borrow_date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: borrows })
}

// 2. POST: บันทึกการยืมอุปกรณ์แบบรองรับระบบตะกร้า (วนลูปบันทึกทุกชิ้นที่ส่งมา)
export async function POST(request: Request) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    
    // 👈 ✅ แกะค่าตามโครงสร้างที่หน้าบ้านส่งมาจริง
    const { 
      borrower_name, 
      department, // หน้าบ้านส่งฟิลด์นี้มา
      phone,      // หน้าบ้านส่งฟิลด์นี้มา
      return_date, // หน้าบ้านส่งฟิลด์นี้มา (due_date)
      items       // อาร์เรย์ของในตะกร้าครุภัณฑ์ [ { asset_id, ... }, ... ]
    } = body

    // Validation เบื้องต้น
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'กรุณาเลือกครุภัณฑ์ลงตะกร้าอย่างน้อย 1 ชิ้น' }, { status: 400 })
    }
    if (!borrower_name) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อผู้ยืม' }, { status: 400 })
    }

    const insertedBorrows = []

    // 🔄 วนลูปประมวลผลครุภัณฑ์ทีละชิ้นในตะกร้าสินค้า
    for (const item of items) {
      const currentAssetId = item.asset_id

      // [ขั้นตอนเซฟตี้] เช็คก่อนว่าสินทรัพย์ชิ้นนี้ว่างจริงไหม
      const { data: assetCheck } = await supabase
        .from('assets')
        .select('status')
        .eq('id', currentAssetId)
        .single()

      if (assetCheck && (assetCheck.status === 'Borrowed' || assetCheck.status === 'กำลังใช้งาน')) {
        return NextResponse.json({ error: `ครุภัณฑ์รหัส ${item.asset_code} ถูกยืมไปแล้ว ไม่สามารถยืมซ้ำได้` }, { status: 400 })
      }

      // ตั๋วที่ 1: บันทึกข้อมูลลงตาราง borrows ของชิ้นนั้น ๆ
      const { data: borrowData, error: borrowError } = await supabase
        .from('borrows')
        .insert([
          {
            doc_id: null,
            user_id: null,
            asset_id: currentAssetId,
            borrower_name: borrower_name,
            borrower_dept: department || null, // จับคู่ฟิลด์หน้าบ้าน -> หลังบ้าน
            phone: phone || null,             // บันทึกเบอร์โทรศัพท์ลงฐานข้อมูล
            purpose: null,
            borrow_date: new Date().toISOString(),
            due_date: return_date ? new Date(return_date).toISOString() : null // ใช้กำหนดวันส่งคืนจากหน้าบ้าน
          }
        ])
        .select()

      if (borrowError) {
        return NextResponse.json({ error: `เกิดข้อผิดพลาดในการบันทึก: ${borrowError.message}` }, { status: 500 })
      }

      // ตั๋วที่ 2: เปลี่ยนสถานะในตาราง assets ให้เป็น 'Borrowed' ทันที
      await supabase
        .from('assets')
        .update({ status: 'Borrowed' })
        .eq('id', currentAssetId)

      insertedBorrows.push(borrowData[0])
    }

    return NextResponse.json({ 
      success: true, 
      message: 'บันทึกคำขอยืมครุภัณฑ์ในตะกร้าทั้งหมดเรียบร้อยแล้ว', 
      data: insertedBorrows 
    }, { status: 201 })

  } catch (err) {
    return NextResponse.json({ error: 'รูปแบบโครงสร้างข้อมูลของหลังบ้านไม่ถูกต้อง' }, { status: 400 })
  }
}