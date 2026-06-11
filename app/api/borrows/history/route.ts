import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server' 

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. ดึงข้อมูลรายการยืม (Borrows) และอุปกรณ์ (Assets)
    const { data: borrows, error: borrowError } = await supabase
      .from('borrows')
      .select(`
        *,
        assets ( id, name, brand, serial_number, type )
      `)
      .order('id', { ascending: false })

    if (borrowError) throw borrowError

    // 2. ดึงข้อมูลเอกสารทั้งหมด (Documents) โดยดึงทุกคอลัมน์มาดูก่อน
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('*')

    if (docError) throw docError

    // 3. รวมร่างข้อมูลด้วยลอจิก "เช็กทุกคอลัมน์ที่น่าจะเป็น ID เชื่อม"
    const historyWithDocs = borrows.map((borrow) => {
      // ตรงนี้คือหัวใจสำคัญ: สแกนว่าในตารางเอกสาร มีแถวไหนที่เลข ID ตรงกับรายการยืมนี้บ้าง
      const linkedDocuments = documents.filter((doc) => {
        const borrowId = Number(borrow.id)
        return (
          Number(doc.borrow_id) === borrowId || 
          Number(doc.borrow_id_int) === borrowId
        )
      })

      return {
        ...borrow,
        documents: linkedDocuments,
        // ส่ง file_url ตรงไปให้หน้าบ้านเช็กง่ายๆ
        file_url: linkedDocuments.length > 0 ? linkedDocuments[0].file_url : null
      }
    })

    return NextResponse.json({ success: true, history: historyWithDocs })
  } catch (err: any) {
    console.error('❌ API Error Detail:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Server Error' }, 
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { borrowId, assetId } = await request.json()

    if (!borrowId || !assetId) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }

    // อัปเดตวันที่คืน
    const { error: borrowError } = await supabase
      .from('borrows')
      .update({ return_date: new Date().toISOString() })
      .eq('id', borrowId)

    if (borrowError) throw borrowError

    // อัปเดตสถานะอุปกรณ์
    const { error: assetError } = await supabase
      .from('assets')
      .update({ status: 'Available' })
      .eq('id', assetId)

    if (assetError) throw assetError

    return NextResponse.json({ success: true, message: 'บันทึกสำเร็จ' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}