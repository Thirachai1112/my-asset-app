import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * DELETE /api/repairs/documents/delete
 * 
 * ลบเอกสารที่แนบกับรายการซ่อม
 * เพื่อให้ผู้ใช้อัปโหลดเอกสารใหม่แทนที่เอกสารเดิม
 * 
 * Body: JSON
 *   - repair_id: number (required) - ID ของรายการซ่อมที่ต้องการลบเอกสาร
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { repair_id } = body

    if (!repair_id) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุรายการซ่อมที่ต้องการลบเอกสาร' }, { status: 400 })
    }

    // ดึงเอกสารที่เกี่ยวข้องกับ repair_id นี้
    const { data: docsToDelete, error: fetchError } = await supabase
      .from('documents')
      .select('id, file_url')
      .eq('repair_id', repair_id)

    if (fetchError) throw fetchError

    if (!docsToDelete || docsToDelete.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบเอกสารที่ต้องการลบ' }, { status: 404 })
    }

    // ลบไฟล์ออกจาก Storage
    for (const doc of docsToDelete) {
      if (doc.file_url) {
        // ดึง path จาก public URL สำหรับ bucket repair-documents
        let filePath = ''
        const urlParts = doc.file_url.split('/')
        
        // ลองหา bucket name ทั้งสองแบบ
        const bucketIndex = urlParts.indexOf('repair-documents')
        if (bucketIndex !== -1) {
          filePath = urlParts.slice(bucketIndex + 1).join('/')
        }
        
        if (filePath) {
          const { error: storageError } = await supabase.storage
            .from('repair-documents')
            .remove([filePath])
          if (storageError) {
            console.warn('⚠️ ไม่สามารถลบไฟล์ออกจาก Storage:', storageError.message)
          }
        }
      }
    }

    // ลบ records ออกจากตาราง documents
    const docIds = docsToDelete.map(d => d.id)
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .in('id', docIds)

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
      message: 'ลบเอกสารเรียบร้อยแล้ว',
      data: { deleted_count: docsToDelete.length }
    })

  } catch (error: any) {
    console.error('❌ Delete Repair Document Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถลบเอกสารได้' },
      { status: 500 }
    )
  }
}
