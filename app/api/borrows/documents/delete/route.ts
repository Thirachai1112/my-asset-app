import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * DELETE /api/borrows/documents/delete
 * 
 * ลบเอกสารที่แนบกับรายการยืม (หรือหลายรายการใน session เดียวกัน)
 * เพื่อให้ผู้ใช้อัปโหลดเอกสารใหม่แทนที่เอกสารเดิม
 * 
 * Body: JSON
 *   - borrow_id: number (required) - ID ของรายการยืมที่ต้องการลบเอกสาร
 *   - delete_all_session: boolean (optional) - ถ้า true จะลบเอกสารทั้งหมดใน session เดียวกัน
 *   - session_key: string (optional) - คีย์ของ session สำหรับลบทั้งหมด
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { borrow_id, delete_all_session, session_key, borrow_ids } = body

    if (!borrow_id && !borrow_ids) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุรายการยืมที่ต้องการลบเอกสาร' }, { status: 400 })
    }

    // 🔥 กรณีลบเอกสารทั้งหมดใน session (หลายรายการ)
    if (delete_all_session && borrow_ids && Array.isArray(borrow_ids) && borrow_ids.length > 0) {
      // ดึง document IDs ที่เกี่ยวข้องกับ borrow_ids เหล่านี้
      const { data: docsToDelete, error: fetchError } = await supabase
        .from('documents')
        .select('id, file_url')
        .in('borrow_id', borrow_ids)

      if (fetchError) throw fetchError

      if (!docsToDelete || docsToDelete.length === 0) {
        return NextResponse.json({ success: false, error: 'ไม่พบเอกสารที่ต้องการลบ' }, { status: 404 })
      }

      // ลบไฟล์ออกจาก Storage (เฉพาะไฟล์ที่ไม่ซ้ำกัน)
      const uniqueFileUrls = [...new Set(docsToDelete.map(d => d.file_url).filter(Boolean))]
      for (const fileUrl of uniqueFileUrls) {
        if (fileUrl) {
          // ดึง path จาก public URL
          const urlParts = fileUrl.split('/')
          const bucketIndex = urlParts.indexOf('borrow-documents')
          if (bucketIndex !== -1) {
            const filePath = urlParts.slice(bucketIndex + 1).join('/')
            if (filePath) {
              const { error: storageError } = await supabase.storage
                .from('borrow-documents')
                .remove([filePath])
              if (storageError) {
                console.warn('⚠️ ไม่สามารถลบไฟล์ออกจาก Storage:', storageError.message)
              }
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
        message: `ลบเอกสารเรียบร้อยแล้ว ${docsToDelete.length} รายการ`,
        data: { deleted_count: docsToDelete.length }
      })
    }

    // 🔥 กรณีลบเอกสารของรายการเดียว
    // ดึงเอกสารที่เกี่ยวข้องกับ borrow_id นี้
    const { data: docsToDelete, error: fetchError } = await supabase
      .from('documents')
      .select('id, file_url')
      .eq('borrow_id', borrow_id)

    if (fetchError) throw fetchError

    if (!docsToDelete || docsToDelete.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบเอกสารที่ต้องการลบ' }, { status: 404 })
    }

    // ลบไฟล์ออกจาก Storage
    for (const doc of docsToDelete) {
      if (doc.file_url) {
        const urlParts = doc.file_url.split('/')
        const bucketIndex = urlParts.indexOf('borrow-documents')
        if (bucketIndex !== -1) {
          const filePath = urlParts.slice(bucketIndex + 1).join('/')
          if (filePath) {
            const { error: storageError } = await supabase.storage
              .from('borrow-documents')
              .remove([filePath])
            if (storageError) {
              console.warn('⚠️ ไม่สามารถลบไฟล์ออกจาก Storage:', storageError.message)
            }
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
    console.error('❌ Delete Document Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถลบเอกสารได้' },
      { status: 500 }
    )
  }
}
