import { NextResponse } from 'next/server'
import { createClient } from '../../../utils/supabase/server'

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
      quantity,
      position,
      assets ( id, name, brand, contract_number, serial_number ),
      users ( id, full_name, emp_code )
    `)
    .order('borrow_date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: borrows })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const {
      borrower_name,
      position,
      borrower_purpose,
      department,
      phone,
      return_date,
      user_id,
      items,
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'กรุณาเลือกครุภัณฑ์ลงตะกร้าอย่างน้อย 1 ชิ้น' }, { status: 400 })
    }
    if (!borrower_name) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อผู้ยืม' }, { status: 400 })
    }
    if (!borrower_purpose) {
      return NextResponse.json({ error: 'กรุณาระบุวัตถุประสงค์การใช้งาน' }, { status: 400 })
    }

    const insertedBorrows = []

    for (const item of items) {
      const currentAssetId = item.asset_id
      const currentQuantity = item.quantity || 1
      const { data: assetCheck } = await supabase
        .from('assets')
        .select('status')
        .eq('id', currentAssetId)
        .single()

      if (assetCheck && (assetCheck.status === 'Borrowed' || assetCheck.status === 'กำลังใช้งาน')) {
        return NextResponse.json({ error: `อุปกรณ์ ${item.name || 'ชิ้นนี้'} ถูกยืมไปแล้ว ไม่สามารถยืมซ้ำได้` }, { status: 400 })
      }

      const { data: borrowData, error: borrowError } = await supabase
        .from('borrows')
        .insert({
          doc_id: null,
          user_id: user_id ? Number(user_id) : null,
          asset_id: currentAssetId,
          borrower_name,
          position: position || null,
          borrower_dept: department || null,
          phone: phone || null,
          purpose: borrower_purpose || null,
          borrow_date: new Date().toISOString(),
          due_date: return_date ? new Date(return_date).toISOString() : null,
          quantity: currentQuantity,
        })
        .select()

      if (borrowError) {
        return NextResponse.json({ error: `เกิดข้อผิดพลาดในการบันทึก: ${borrowError.message}` }, { status: 500 })
      }

      await supabase
        .from('assets')
        .update({ status: 'Borrowed' })
        .eq('id', currentAssetId)

      if (borrowData && borrowData.length > 0) {
        insertedBorrows.push(borrowData[0])
      }
    }

    return NextResponse.json({
      success: true,
      message: 'บันทึกคำขอยืมครุภัณฑ์ในตะกร้าทั้งหมดเรียบร้อยแล้ว',
      data: insertedBorrows,
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/borrows] Request failed:', error)
    return NextResponse.json({ error: 'รูปแบบโครงสร้างข้อมูลของหลังบ้านไม่ถูกต้อง' }, { status: 400 })
  }
}
