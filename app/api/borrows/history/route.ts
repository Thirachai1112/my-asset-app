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
        assets ( id, name, brand, serial_number, type, asset_code, contract_number )
      `)
      .order('id', { ascending: false })
      .limit(1000)

    if (borrowError) throw borrowError

    // 2. ดึงข้อมูลเอกสารทั้งหมด (Documents)
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

    // 4. 🔥 จัดกลุ่มรายการยืมที่ยืมโดยคนเดียวกันในวันเดียวกัน
    //    เพื่อให้หน้าบ้านสามารถอัปโหลดเอกสารครั้งเดียวผูกทุกแถวได้
    const sessionGroups = groupBorrowsBySession(historyWithDocs, documents)

    return NextResponse.json({ 
      success: true, 
      history: historyWithDocs,
      session_groups: sessionGroups  // ส่งข้อมูลกลุ่มไปให้หน้าบ้านใช้
    })
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
    const body = await request.json()

    // 🔥 รองรับการคืนแบบ Batch (หลายรายการพร้อมกัน)
    if (body.batch && Array.isArray(body.batch)) {
      if (body.batch.length === 0) {
        return NextResponse.json({ success: false, error: 'ไม่มีรายการที่ต้องการคืน' }, { status: 400 })
      }

      const now = new Date().toISOString()

      // อัปเดต borrows ทุกรายการใน batch
      for (const item of body.batch) {
        if (!item.borrowId || !item.assetId) {
          return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วนในรายการ batch' }, { status: 400 })
        }

        const { error: borrowError } = await supabase
          .from('borrows')
          .update({ return_date: now })
          .eq('id', item.borrowId)

        if (borrowError) throw borrowError

        const { error: assetError } = await supabase
          .from('assets')
          .update({ status: 'Available' })
          .eq('id', item.assetId)

        if (assetError) throw assetError
      }

      return NextResponse.json({ 
        success: true, 
        message: `คืนทั้งหมด ${body.batch.length} รายการเรียบร้อย` 
      })
    }

    // 🔥 คืนรายการเดียว (แบบเดิม)
    const { borrowId, assetId } = body

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


/**
 * จัดกลุ่มรายการยืมที่ยืมโดยคนเดียวกันในวันเดียวกัน
 * เพื่อให้สามารถอัปโหลดเอกสารครั้งเดียวและผูกกับทุกรายการในกลุ่มได้
 */
function groupBorrowsBySession(borrows: any[], documents: any[]) {
  const groups: Record<string, any[]> = {}

  borrows.forEach((borrow) => {
    // สร้างคีย์จากชื่อผู้ยืม + วันที่ยืม (เฉพาะวัน ไม่รวมเวลา)
    const date = borrow.borrow_date 
      ? new Date(borrow.borrow_date).toISOString().split('T')[0] 
      : 'unknown'
    const key = `${borrow.borrower_name || 'unknown'}_${date}`

    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(borrow)
  })

  // แปลงเป็นอาร์เรย์ของ session groups
  return Object.entries(groups).map(([key, groupBorrows]) => {
    // หาเอกสารที่แชร์ร่วมกันในกลุ่มนี้
    const groupDocIds = new Set<number>()
    groupBorrows.forEach((b: any) => {
      if (b.documents) {
        b.documents.forEach((doc: any) => groupDocIds.add(doc.id))
      }
    })

    const sharedDocuments = documents.filter((doc) => groupDocIds.has(doc.id))

    return {
      key,
      borrower_name: groupBorrows[0].borrower_name,
      borrow_date: groupBorrows[0].borrow_date,
      borrows: groupBorrows,
      shared_documents: sharedDocuments,
      has_documents: sharedDocuments.length > 0,
      item_count: groupBorrows.length,
      total_quantity: groupBorrows.reduce((sum: number, b: any) => sum + (Number(b.quantity) || 1), 0)
    }
  })
}
