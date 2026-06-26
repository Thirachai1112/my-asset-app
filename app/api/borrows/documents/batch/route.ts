import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * POST /api/borrows/documents/batch
 * 
 * อัปโหลดเอกสาร 1 ไฟล์ และผูกกับรายการยืมหลายรายการพร้อมกัน
 * (ใช้สำหรับกรณีที่ผู้ยืมยืมอุปกรณ์หลายชิ้นในครั้งเดียว)
 * 
 * Body: FormData
 *   - file: File (required)
 *   - borrow_ids: string (JSON array of borrow IDs, required)
 *   - doc_type: string (optional)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. แยกข้อมูลจาก FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const borrowIdsRaw = formData.get('borrow_ids') as string | null
    const docType = (formData.get('doc_type') as string) || 'ใบขอยืมอุปกรณ์อนุมัติแล้ว'

    if (!file) {
      return NextResponse.json({ success: false, error: 'กรุณาเลือกไฟล์เอกสาร' }, { status: 400 })
    }
    if (!borrowIdsRaw) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุรายการยืมที่ต้องการผูกเอกสาร' }, { status: 400 })
    }

    // 2. แปลง borrow_ids จาก JSON string เป็น array
    let borrowIds: number[]
    try {
      borrowIds = JSON.parse(borrowIdsRaw)
    } catch {
      return NextResponse.json({ success: false, error: 'รูปแบบ borrow_ids ไม่ถูกต้อง' }, { status: 400 })
    }

    if (!Array.isArray(borrowIds) || borrowIds.length === 0) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุรายการยืมอย่างน้อย 1 รายการ' }, { status: 400 })
    }

    // 3. ตรวจสอบประเภทไฟล์
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'รองรับเฉพาะไฟล์ PDF และรูปภาพ (PNG, JPG) เท่านั้น' }, { status: 400 })
    }

    // 4. จำกัดขนาดไฟล์ไม่เกิน 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'ขนาดไฟล์ใหญ่เกินไป ห้ามเกิน 5MB' }, { status: 400 })
    }

    // 5. ตั้งชื่อไฟล์และอัปโหลดไปยัง Supabase Storage
    const fileExt = file.name.split('.').pop()
    const sessionPrefix = `session_${Date.now()}`
    const fileName = `admin_upload_${sessionPrefix}_${fileExt}`
    const filePath = `admin_docs/${fileName}`

    const { error: storageError } = await supabase.storage
      .from('borrow-documents')
      .upload(filePath, file, { cacheControl: '3600', upsert: true })

    if (storageError) throw storageError

    // 6. ดึง Public URL
    const { data: urlData } = supabase.storage
      .from('borrow-documents')
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    // 7. สร้าง document_id กลางก่อน (ใช้สำหรับอ้างอิง)
    const docNumber = `DOC-BATCH-${Date.now().toString().slice(-6)}`

    // 8. บันทึกเอกสารลงตาราง documents สำหรับทุกรายการยืม
    //    ใช้ file_url เดียวกันทั้งหมด (แชร์ไฟล์เดียวกัน)
    const documentsToInsert = borrowIds.map((borrowId) => ({
      doc_number: `${docNumber}-${borrowId}`,
      doc_type: docType,
      file_url: publicUrl,
      borrow_id: borrowId
    }))

    const { error: dbError } = await supabase
      .from('documents')
      .insert(documentsToInsert)

    if (dbError) throw dbError

    return NextResponse.json({
      success: true,
      message: `อัปโหลดเอกสารสำเร็จ! ผูกกับ ${borrowIds.length} รายการยืมเรียบร้อย`,
      data: {
        file_url: publicUrl,
        linked_borrow_ids: borrowIds,
        document_count: borrowIds.length
      }
    })

  } catch (error: any) {
    console.error('❌ Batch Upload Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถอัปโหลดไฟล์ได้' },
      { status: 500 }
    )
  }
}
