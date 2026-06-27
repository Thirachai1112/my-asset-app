'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Swal from 'sweetalert2'
import { createBrowserClient } from '@supabase/ssr'
import type { Borrow, BorrowSessionGroup } from '@/types'
import { showSuccess, showError, confirmAction } from '@/utils/helpers'
import { usePagination } from '@/hooks/usePagination'
import SearchInput from '@/components/ui/SearchInput'
import Pagination from '@/components/ui/Pagination'
import Modal from '@/components/ui/Modal'
import { generateRenewPDF } from '@/app/borrows/renew/generateRenewPDF'

// ฟังก์ชันสร้างอินสแตนซ์ Supabase หน้าบ้าน ทำงานร่วมกับระบบคุกกี้เซิร์ฟเวอร์
let supabaseInstance: any = null
function createClient() {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return supabaseInstance
}

export default function BorrowTable() {
  const supabase = createClient()

  const [borrows, setBorrows] = useState<Borrow[]>([])
  const [sessionGroups, setSessionGroups] = useState<BorrowSessionGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>('all')

  // 🔔 State สำหรับเก็บรายการที่ต้องตามงาน
  const [urgentItems, setUrgentItems] = useState<Borrow[]>([])

  // 🔄 State สำหรับ Modal ต่ออายุการยืม
  const [renewModalOpen, setRenewModalOpen] = useState(false)
  const [renewTarget, setRenewTarget] = useState<Borrow | null>(null)
  const [newDueDate, setNewDueDate] = useState('')
  const [renewing, setRenewing] = useState(false)

  const fetchBorrows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/borrows/history')
      const json = await res.json()

      if (json.success) {
        const data = json.history || json.data || []
        setBorrows(data)

        // 🔥 เก็บ session_groups ที่ API ส่งมาให้
        if (json.session_groups) {
          setSessionGroups(json.session_groups)
        }

        // 🔎 คำนวณหารายการที่ต้องตามคืน (เลยกำหนดหรือเหลือเวลา 2 วัน)
        const today = new Date()
        const urgent = data.filter((b: Borrow) => {
          if (b.return_date || !b.due_date) return false
          const diffDays = (new Date(b.due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          return diffDays <= 2
        })
        setUrgentItems(urgent)
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBorrows()
  }, [fetchBorrows])

  /**
   * 🔥 ค้นหากลุ่ม session ที่ borrow นี้อยู่
   * ใช้สำหรับเช็คว่ามีรายการอื่นที่ยืมโดยคนเดียวกันในวันเดียวกันหรือไม่
   */
  const findSessionGroup = (borrow: Borrow): BorrowSessionGroup | null => {
    if (!borrow.borrow_date) return null
    const date = new Date(borrow.borrow_date).toISOString().split('T')[0]
    const key = `${borrow.borrower_name || 'unknown'}_${date}`
    
    return sessionGroups.find(g => g.key === key) || null
  }

  /**
   * 📁 อัปโหลดเอกสารแบบอัจฉริยะ
   * - ถ้ามีรายการอื่นใน session เดียวกัน จะถามก่อนว่าจะให้ผูกกับทุกรายการหรือไม่
   * - ถ้าไม่มี ก็อัปโหลดให้เฉพาะรายการนี้ตามปกติ
   */
  const handleSmartUpload = async (event: React.ChangeEvent<HTMLInputElement>, targetBorrow: Borrow) => {
    try {
      const file = event.target.files?.[0]
      if (!file) return

      const borrowId = Number(targetBorrow.id)
      if (!borrowId) {
        showError('ข้อผิดพลาด', 'ไม่พบ ID ของรายการยืม')
        return
      }

      // 1. ตรวจสอบประเภทไฟล์
      const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"]
      if (!allowedTypes.includes(file.type)) {
        showError('ข้อผิดพลาด', 'รองรับเฉพาะไฟล์ PDF และรูปภาพ (PNG, JPG) เท่านั้นครับ')
        return
      }

      // 2. จำกัดขนาดไฟล์ไม่เกิน 5MB
      if (file.size > 5 * 1024 * 1024) {
        showError('ข้อผิดพลาด', 'ขนาดไฟล์ใหญ่เกินไป ห้ามเกิน 5MB ครับ')
        return
      }

      // 3. 🔥 ค้นหากลุ่ม session ของรายการนี้
      const sessionGroup = findSessionGroup(targetBorrow)
      const hasRelatedItems = sessionGroup && sessionGroup.item_count > 1

      // 4. 🔥 ถ้ามีรายการอื่นใน session เดียวกัน ให้ถามก่อน
      let applyToAll = false
      if (hasRelatedItems) {
        const otherItems = sessionGroup!.borrows.filter(b => b.id !== borrowId)
        const result = await Swal.fire({
          icon: 'question',
          title: 'พบรายการยืมอื่นในครั้งเดียวกัน',
          showCloseButton: true,
          html: `
            <div style="text-align: left; font-size: 13px;">
              <p style="margin-bottom: 8px;">ผู้ยืม: <strong>${sessionGroup!.borrower_name}</strong></p>
              <p style="margin-bottom: 8px;">วันที่: <strong>${new Date(sessionGroup!.borrow_date).toLocaleDateString('th-TH')}</strong></p>
              <p style="margin-bottom: 12px;">พบรายการยืมทั้งหมด <strong>${sessionGroup!.item_count}</strong> รายการในครั้งนี้</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 8px 0;">
              <p style="font-size: 12px; color: #6b7280;">รายการอื่นๆ ที่จะผูกเอกสารเดียวกัน:</p>
              <ul style="font-size: 12px; color: #374151; margin-top: 4px; padding-left: 16px;">
                ${otherItems.map(b => `<li>${b.assets?.name || 'อุปกรณ์'} (${b.assets?.asset_code || '-'})</li>`).join('')}
              </ul>
            </div>
          `,
          showCancelButton: true,
          confirmButtonColor: '#7c3aed',
          cancelButtonColor: '#64748b',
          confirmButtonText: '✅ ใช่ แนบให้ทุกรายการ',
          cancelButtonText: 'เฉพาะรายการนี้เท่านั้น',
          reverseButtons: true,
        })
        if (result.isDismissed) {
          // 🔥 กดปิด (X) หรือกด ESC ให้ออกเลย ไม่ต้องทำอะไร
          return
        }
        applyToAll = result.isConfirmed
      }

      setUploadingId(borrowId)

      if (applyToAll && sessionGroup) {
        // ===== 🔥 อัปโหลดแบบ Batch: ผูกเอกสารกับทุกรายการใน session =====
        const allBorrowIds = sessionGroup.borrows.map(b => b.id)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('borrow_ids', JSON.stringify(allBorrowIds))
        formData.append('doc_type', 'ใบขอยืมอุปกรณ์อนุมัติแล้ว')
        const response = await fetch('/api/borrows/documents/batch', {
          method: 'POST',
          body: formData,
        })
        const result = await response.json()
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'ไม่สามารถอัปโหลดไฟล์ได้')
        }
        showSuccess('อัปโหลดเอกสารสำเร็จ!', `ผูกเอกสารกับ ${allBorrowIds.length} รายการยืมเรียบร้อย`)
      } else {

        // ===== อัปโหลดแบบปกติ: ผูกเอกสารกับรายการนี้เท่านั้น =====
        // 3. อัปโหลดไฟล์ขึ้น Supabase Storage (ถัง 'borrow-documents')
        const fileExt = file.name.split(".").pop()
        const fileName = `admin_upload_${borrowId}_${Date.now()}.${fileExt}`
        const filePath = `admin_docs/${fileName}`

        const { error: storageError } = await supabase.storage
          .from("borrow-documents")
          .upload(filePath, file, { cacheControl: "3600", upsert: true })

        if (storageError) throw storageError

        // 4. ดึง Public URL ของไฟล์ออกมา
        const { data: urlData } = supabase.storage
          .from("borrow-documents")
          .getPublicUrl(filePath)

        const publicUrl = urlData.publicUrl

        // 5. บันทึกข้อมูลแบบ Upsert (เช็กว่ามีเอกสารเดิมของรายการยืมนี้ไหม)
        const { data: existingDoc } = await supabase
          .from("documents")
          .select("id")
          .eq("borrow_id", borrowId)
          .maybeSingle()

        let dbResult;
        if (existingDoc) {
          dbResult = await supabase
            .from("documents")
            .update({
              file_url: publicUrl,
              doc_number: `DOC-${borrowId}-${Date.now().toString().slice(-4)}`
            })
            .eq("id", existingDoc.id)
        } else {
          dbResult = await supabase
            .from("documents")
            .insert([{
              doc_number: `DOC-${borrowId}-${Date.now().toString().slice(-4)}`,
              doc_type: "ใบขอยืมอุปกรณ์อนุมัติแล้ว",
              file_url: publicUrl,
              borrow_id: borrowId
            }])
        }

        if (dbResult.error) throw dbResult.error

        showSuccess(existingDoc ? 'แก้ไขเอกสารสำเร็จ!' : 'อัปโหลดเอกสารสำเร็จ!')
      }

      fetchBorrows()

    } catch (error: any) {
      console.error("❌ Error Detail:", error);
      showError('เกิดข้อผิดพลาด', error?.message || 'ไม่สามารถอัปโหลดไฟล์ได้')
    } finally {
      setUploadingId(null)
    }
  }

  // 🔄 ฟังก์ชันเปิด Modal ต่ออายุการยืม
  const openRenewModal = (borrow: Borrow) => {
    setRenewTarget(borrow)
    // กำหนดวันที่เริ่มต้นเป็นวันถัดจาก due_date ปัจจุบัน
    if (borrow.due_date) {
      const nextDay = new Date(borrow.due_date)
      nextDay.setDate(nextDay.getDate() + 1)
      setNewDueDate(nextDay.toISOString().split('T')[0])
    } else {
      setNewDueDate('')
    }
    setRenewModalOpen(true)
  }

  // 🔄 ฟังก์ชันยืนยันการต่ออายุ
  const handleRenew = async () => {
    if (!renewTarget || !newDueDate) return

    const renewalCount = renewTarget.renewal_count || 0

    setRenewing(true)
    try {
      const res = await fetch(`/api/borrows/${renewTarget.id}/renew`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_due_date: newDueDate })
      })

      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('ต่ออายุการยืมสำเร็จ!', `ต่ออายุครั้งที่ ${renewalCount + 1}`)
        setRenewModalOpen(false)

        // 📄 สร้างเอกสาร PDF ต่ออายุการยืม
        try {
          await generateRenewPDF({
            borrower_name: renewTarget.borrower_name,
            borrower_dept: renewTarget.borrower_dept,
            position: renewTarget.position,
            phone: renewTarget.phone,
            purpose: renewTarget.purpose,
            asset_name: renewTarget.assets?.name || '-',
            asset_code: renewTarget.assets?.asset_code || null,
            serial_number: renewTarget.assets?.serial_number || null,
            contract_number: renewTarget.assets?.contract_number || null,
            old_due_date: renewTarget.due_date!,
            new_due_date: newDueDate,
            renewal_count: renewalCount + 1,
            quantity: renewTarget.quantity || 1,
          })
        } catch (pdfErr) {
          console.error('สร้าง PDF ล้มเหลว:', pdfErr)
        }

        setRenewTarget(null)
        setNewDueDate('')
        fetchBorrows()
      } else {
        throw new Error(json.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err: any) {
      showError('ล้มเหลว', err.message)
    } finally {
      setRenewing(false)
    }
  }

  // 🗑️ ฟังก์ชันลบเอกสาร
  const handleDeleteDocument = async (borrow: Borrow) => {
    try {
      // 🔥 เช็คว่ารายการนี้อยู่ใน session ที่มีรายการอื่นหรือไม่
      const sessionGroup = findSessionGroup(borrow)
      const isPartOfGroup = sessionGroup && sessionGroup.item_count > 1
      const hasSharedDocs = isPartOfGroup && sessionGroup?.has_documents

      if (hasSharedDocs && sessionGroup) {
        // 🔥 ถ้ามีเอกสารแชร์กันในกลุ่ม ให้ถามก่อนว่าลบทั้งหมดหรือไม่
        const otherItems = sessionGroup.borrows.filter(b => b.id !== borrow.id)
        const result = await Swal.fire({
          icon: 'warning',
          title: 'เอกสารนี้ถูกแชร์กับรายการอื่น',
          showCloseButton: true,
          html: `
            <div style="text-align: left; font-size: 13px;">
              <p style="margin-bottom: 8px;">ผู้ยืม: <strong>${sessionGroup.borrower_name}</strong></p>
              <p style="margin-bottom: 8px;">วันที่: <strong>${new Date(sessionGroup.borrow_date).toLocaleDateString('th-TH')}</strong></p>
              <p style="margin-bottom: 12px;">เอกสารนี้ถูกแชร์กับ <strong>${sessionGroup.item_count - 1}</strong> รายการอื่น</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 8px 0;">
              <p style="font-size: 12px; color: #6b7280;">รายการที่ใช้เอกสารเดียวกัน:</p>
              <ul style="font-size: 12px; color: #374151; margin-top: 4px; padding-left: 16px;">
                ${sessionGroup.borrows.map(b => `<li>${b.assets?.name || 'อุปกรณ์'} (${b.assets?.asset_code || '-'})</li>`).join('')}
              </ul>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 8px 0;">
              <p style="font-size: 12px; color: #dc2626; font-weight: bold;">⚠️ การลบเอกสารจะลบไฟล์ออกจากระบบทั้งหมด คุณสามารถอัปโหลดใหม่ได้ภายหลัง</p>
            </div>
          `,
          showCancelButton: true,
          confirmButtonColor: '#dc2626',
          cancelButtonColor: '#64748b',
          confirmButtonText: '🗑️ ใช่ ลบทั้งหมด',
          cancelButtonText: 'ลบเฉพาะรายการนี้เท่านั้น',
          reverseButtons: true,
        })

        if (result.isDismissed) {
          return
        }

        if (result.isConfirmed) {
          // 🔥 ลบเอกสารทั้งหมดใน session
          const allBorrowIds = sessionGroup.borrows.map(b => b.id)
          const res = await fetch('/api/borrows/documents/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              borrow_ids: allBorrowIds,
              delete_all_session: true,
              session_key: sessionGroup.key
            })
          })
          const json = await res.json()
          if (!res.ok || !json.success) {
            throw new Error(json.error || 'ไม่สามารถลบเอกสารได้')
          }
          showSuccess('ลบเอกสารสำเร็จ!', `ลบเอกสารของ ${allBorrowIds.length} รายการเรียบร้อย`)
        } else {
          // 🔥 ลบเฉพาะรายการนี้เท่านั้น
          const res = await fetch('/api/borrows/documents/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ borrow_id: borrow.id })
          })
          const json = await res.json()
          if (!res.ok || !json.success) {
            throw new Error(json.error || 'ไม่สามารถลบเอกสารได้')
          }
          showSuccess('ลบเอกสารสำเร็จ!', 'คุณสามารถอัปโหลดเอกสารใหม่ได้')
        }
      } else {
        // 🔥 ลบเอกสารของรายการเดียว (ไม่มีกลุ่ม)
        const confirmed = await Swal.fire({
          icon: 'question',
          title: 'ยืนยันการลบเอกสาร?',
          text: 'เอกสารจะถูกลบออกจากระบบ คุณสามารถอัปโหลดใหม่ได้ภายหลัง',
          showCancelButton: true,
          confirmButtonColor: '#dc2626',
          cancelButtonColor: '#64748b',
          confirmButtonText: '🗑️ ใช่ ลบเลย',
          cancelButtonText: 'ยกเลิก',
          reverseButtons: true,
        })
        if (!confirmed.isConfirmed) return

        const res = await fetch('/api/borrows/documents/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ borrow_id: borrow.id })
        })
        const json = await res.json()
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'ไม่สามารถลบเอกสารได้')
        }
        showSuccess('ลบเอกสารสำเร็จ!', 'คุณสามารถอัปโหลดเอกสารใหม่ได้')
      }

      fetchBorrows()
    } catch (error: any) {
      console.error('❌ Delete Document Error:', error)
      showError('เกิดข้อผิดพลาด', error?.message || 'ไม่สามารถลบเอกสารได้')
    }
  }

  // 🟢 ฟังก์ชันส่งข้อมูลไปอัปเดตสถานะการคืนของ
  const handleReturn = async (borrowId: number, assetId: number, borrow?: Borrow) => {
    // 🔥 ตรวจสอบว่ารายการนี้อยู่ในกลุ่ม session ที่มีรายการอื่นหรือไม่
    const sessionGroup = borrow ? findSessionGroup(borrow) : null
    const hasRelatedItems = sessionGroup && sessionGroup.item_count > 1

    if (hasRelatedItems && sessionGroup) {
      // 🔥 ถ้ามีรายการอื่นใน session เดียวกัน ให้ถามก่อนว่าคืนทั้งหมดหรือไม่
      const otherItems = sessionGroup.borrows.filter(b => b.id !== borrowId && !b.return_date)
      const unreturnedItems = sessionGroup.borrows.filter(b => !b.return_date)

      if (unreturnedItems.length > 1) {
        const result = await Swal.fire({
          icon: 'question',
          title: 'พบรายการยืมอื่นในครั้งเดียวกัน',
          showCloseButton: true,
          html: `
            <div style="text-align: left; font-size: 13px;">
              <p style="margin-bottom: 8px;">ผู้ยืม: <strong>${sessionGroup.borrower_name}</strong></p>
              <p style="margin-bottom: 8px;">วันที่: <strong>${new Date(sessionGroup.borrow_date).toLocaleDateString('th-TH')}</strong></p>
              <p style="margin-bottom: 12px;">พบรายการที่ยังไม่คืนทั้งหมด <strong>${unreturnedItems.length}</strong> รายการในครั้งนี้</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 8px 0;">
              <p style="font-size: 12px; color: #6b7280;">รายการที่จะคืนพร้อมกัน:</p>
              <ul style="font-size: 12px; color: #374151; margin-top: 4px; padding-left: 16px;">
                ${unreturnedItems.map(b => `<li>${b.assets?.name || 'อุปกรณ์'} (${b.assets?.asset_code || '-'}) จำนวน ${b.quantity || 1} ชิ้น</li>`).join('')}
              </ul>
            </div>
          `,
          showCancelButton: true,
          confirmButtonColor: '#10b981',
          cancelButtonColor: '#64748b',
          confirmButtonText: '✅ คืนทั้งหมดพร้อมกัน',
          cancelButtonText: 'คืนเฉพาะรายการนี้เท่านั้น',
          reverseButtons: true,
        })

        if (result.isDismissed) {
          // 🔥 กดปิด (X) หรือกด ESC ให้ออกเลย ไม่ต้องทำอะไร
          return
        }

        if (result.isConfirmed) {
          // 🔥 คืนทั้งหมดใน session
          try {
            const unreturnedBorrows = unreturnedItems.map(b => ({
              borrowId: b.id,
              assetId: b.assets?.id
            }))

            const res = await fetch('/api/borrows/history', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ batch: unreturnedBorrows })
            })

            const json = await res.json()

            if (res.ok && json.success) {
              showSuccess('บันทึกการคืนสำเร็จ!', `คืนทั้งหมด ${unreturnedItems.length} รายการเรียบร้อย`)
              fetchBorrows()
            } else {
              throw new Error(json.error || 'เกิดข้อผิดพลาด')
            }

          } catch (err: any) {
            showError('ล้มเหลว', err.message)
          }
          return
        }

      }
    }

    // 🔥 ถ้าไม่มีกลุ่ม หรือเลือกคืนเฉพาะรายการนี้ ให้คืนตามปกติ
    const confirmed = await confirmAction('ยืนยันการคืนครุภัณฑ์?', 'ระบบจะบันทึกวันที่คืนและเปลี่ยนสถานะอุปกรณ์ชิ้นนี้ให้พร้อมใช้งาน')
    if (!confirmed) return

    try {
      const res = await fetch('/api/borrows/history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowId, assetId })
      })

      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('บันทึกการคืนสำเร็จ')
        fetchBorrows()
      } else {
        throw new Error(json.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err: any) {
      showError('ล้มเหลว', err.message)
    }
  }


  // 📅 สร้างรายการเดือนจากข้อมูล borrows ทั้งหมด
  const monthOptions = React.useMemo(() => {
    const months = new Set<string>()
    borrows.forEach((b) => {
      if (b.borrow_date) {
        const d = new Date(b.borrow_date)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        months.add(key)
      }
    })
    return Array.from(months).sort().reverse()
  }, [borrows])

  // แปลง key ที่เลือกเป็นข้อความภาษาไทย
  const getMonthLabel = (key: string) => {
    const [year, month] = key.split('-')
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    return `${monthNames[parseInt(month) - 1]} ${parseInt(year) + 543}`
  }

  const filteredBorrows = borrows.filter((borrow) => {
    // กรองตามเดือน
    if (selectedMonth !== 'all') {
      const d = new Date(borrow.borrow_date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (key !== selectedMonth) return false
    }

    // กรองตามคำค้นหา
    const searchLower = searchTerm.toLowerCase().trim()
    if (!searchLower) return true
    const statusText = borrow.return_date ? 'คืนแล้ว' : 'กำลังยืมอยู่'
    return (
      borrow.borrower_name?.toLowerCase().includes(searchLower) ||
      borrow.borrower_dept?.toLowerCase().includes(searchLower) ||
      borrow.position?.toLowerCase().includes(searchLower) ||
      (borrow.phone || '').includes(searchLower) ||
      statusText.includes(searchLower) ||
      (borrow.assets?.name?.toLowerCase() || '').includes(searchLower) ||
      (borrow.assets?.serial_number?.toLowerCase() || '').includes(searchLower) ||
      (borrow.assets?.asset_code?.toLowerCase() || '').includes(searchLower) ||
      (borrow.assets?.contract_number?.toLowerCase() || '').includes(searchLower)
    )
  })

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    currentItems: currentRows,
    indexOfFirstItem,
    indexOfLastItem,
  } = usePagination(filteredBorrows, 5)

  // 🧮 คำนวณยอดรวมจำนวนชิ้นจริง (Sum of quantities)
  // totalQuantity = เฉพาะรายการที่กำลังยืมอยู่ (ยังไม่คืน) เท่านั้น
  const activeQuantity = filteredBorrows.filter(b => !b.return_date).reduce((sum, b) => sum + (Number(b.quantity || 0)), 0)
  const totalQuantity = activeQuantity
  const urgentQuantity = urgentItems.reduce((sum, b) => sum + (Number(b.quantity || 0)), 0)

  return (
    <div className="w-full">
      {/* 📊 Summary Dashboard */}
      <div className="mx-4 sm:mx-6 mt-4 sm:mt-6 bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="p-2 bg-indigo-600 rounded-lg text-white shrink-0">📊</div>
          <div className="min-w-0">
            <h4 className="font-bold text-slate-800 text-sm sm:text-base truncate">สรุปภาพรวมการยืม-คืน</h4>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate">Borrowing & Return Analytics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-slate-50 border border-slate-100 p-3 sm:p-4 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">จำนวนเครื่องที่ยืมอยู่</p>
            <p className="text-xl sm:text-2xl font-black text-indigo-600">{activeQuantity} <span className="text-sm font-medium text-slate-400">ชิ้น</span></p>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-3 sm:p-4 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">รายการที่เลยกำหนด</p>
            <p className="text-xl sm:text-2xl font-black text-red-500">{urgentItems.length} <span className="text-sm font-medium text-slate-400">รายการ</span></p>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-3 sm:p-4 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">ประวัติรายการทั้งหมด</p>
            <p className="text-xl sm:text-2xl font-black text-slate-800">{filteredBorrows.length} <span className="text-sm font-medium text-slate-400">รายการ</span></p>
          </div>
        </div>
      </div>

      {/* 🚨 Urgent Alerts */}
      {urgentItems.length > 0 && (
        <div className="mx-4 sm:mx-6 mt-4 sm:mt-6 bg-red-50/50 border border-red-100 p-3 sm:p-4 rounded-2xl flex items-start gap-3 sm:gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center text-base sm:text-xl shrink-0">
            🔔
          </div>
          <div className="min-w-0">
            <h4 className="text-red-900 font-bold text-xs sm:text-sm">รายการที่ต้องติดตามคืนด่วน ({urgentItems.length} รายการ / รวม {urgentQuantity} ชิ้น)</h4>
            <div className="text-[11px] sm:text-xs text-red-700/80 mt-1.5 space-y-1">
              {urgentItems.slice(0, 3).map((item) => (
                <p key={item.id} className="leading-relaxed">• <span className="font-semibold text-red-800">{item.borrower_name}</span> ยืม {item.assets?.name} จำนวน {item.quantity || 1} ชิ้น (กำหนดคืน: {new Date(item.due_date!).toLocaleDateString('th-TH')})</p>
              ))}
              {urgentItems.length > 3 && <p className="italic font-medium text-red-600">...และอีก {urgentItems.length - 3} รายการที่เหลือ</p>}
            </div>
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div className="p-4 sm:p-6 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 truncate">ประวัติการยืม-คืน</h3>
            <p className="text-xs sm:text-sm text-slate-500">พบทั้งหมด {filteredBorrows.length} รายการ (รวม {totalQuantity} ชิ้น)</p>
          </div>

          {/* 📅 Month Filter */}
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value)
              setCurrentPage(1)
            }}
            className="sm:ml-4 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm cursor-pointer w-full sm:w-auto"
          >
            <option value="all">📅 ทุกเดือน</option>
            {monthOptions.map((key) => (
              <option key={key} value={key}>
                {getMonthLabel(key)}
              </option>
            ))}
          </select>
        </div>

        <SearchInput
          value={searchTerm}
          onChange={(value) => {
            setSearchTerm(value)
            setCurrentPage(1)
          }}
          placeholder="ค้นหาชื่อ, แผนก, อุปกรณ์..."
        />
      </div>

      {/* Table Container */}
      <div className="p-3 sm:p-6">
        <div className="overflow-x-auto rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm">
          <table className="w-full text-left border-collapse min-w-[900px] lg:min-w-0">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[10px] sm:text-[11px] uppercase font-bold tracking-widest border-b border-slate-100">
                <th className="px-2 sm:px-4 py-3 sm:py-4 text-center w-10 sm:w-16">#</th>
                <th className="px-2 sm:px-4 py-3 sm:py-4">ข้อมูลผู้ยืม</th>
                <th className="px-2 sm:px-4 py-3 sm:py-4">อุปกรณ์</th>
                <th className="px-2 sm:px-4 py-3 sm:py-4 text-center">จำนวน</th>
                <th className="px-2 sm:px-4 py-3 sm:py-4">วันที่ทำรายการ</th>
                <th className="px-2 sm:px-4 py-3 sm:py-4 text-center">สถานะ</th>
                <th className="px-2 sm:px-4 py-3 sm:py-4 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {currentRows.length > 0 ? (
                currentRows.map((borrow, index) => {
                  const isUrgent = !borrow.return_date && borrow.due_date &&
                    (new Date(borrow.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 2;

                  // 🔥 เช็คว่ารายการนี้อยู่ใน session ที่มีรายการอื่นหรือไม่
                  const sessionGroup = findSessionGroup(borrow)
                  const isPartOfGroup = sessionGroup && sessionGroup.item_count > 1
                  const isFirstInGroup = isPartOfGroup && sessionGroup!.borrows[0]?.id === borrow.id

                  return (
                    <tr key={borrow.id} className={`group hover:bg-slate-50/80 transition-all ${isUrgent ? 'bg-red-50/30' : ''}`}>
                      <td className="px-2 sm:px-4 py-3 sm:py-5 text-center text-slate-400 font-mono text-[10px] sm:text-xs">
                        {(indexOfFirstItem + index + 1).toString().padStart(2, '0')}
                      </td>
                      <td className="px-2 sm:px-4 py-3 sm:py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 leading-tight text-xs sm:text-sm">{borrow.borrower_name}</span>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium">ตำแหน่ง: {borrow.position || '-'}</span>
                            <span className="text-[10px] sm:text-[11px] text-slate-500">แผนก: {borrow.borrower_dept || '-'}</span>
                          </div>
                          <span className="text-[9px] sm:text-[10px] text-blue-500 font-bold mt-1.5 inline-flex items-center gap-1">
                            📞 {borrow.phone || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-3 sm:py-5">
                        <div className="flex flex-col max-w-[180px] sm:max-w-[220px]">
                          <span className="font-semibold text-slate-800 truncate text-xs sm:text-sm" title={borrow.assets?.name}>
                            {borrow.assets?.name || 'ไม่พบข้อมูล'}
                          </span>
                          <div className="flex flex-col gap-0.5 mt-1.5">
                            <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono">
                              asset NO: <span className="text-blue-600 font-bold">{borrow.assets?.asset_code || '-'}</span>
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono">
                              SN: <span className="text-slate-700">{borrow.assets?.serial_number || '-'}</span>
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-slate-400">
                              Contract: {borrow.assets?.contract_number || '-'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-3 sm:py-5 text-center">
                        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] sm:text-xs font-bold border border-slate-200">
                          {borrow.quantity || 1}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-3 sm:py-5">
                        <div className="flex flex-col text-[10px] sm:text-[11px]">
                          <div className="flex items-center gap-1 sm:gap-1.5 text-slate-600">
                            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                            <span className="truncate">ยืม: {new Date(borrow.borrow_date).toLocaleDateString('th-TH')}</span>
                          </div>
                          <div className={`flex items-center gap-1 sm:gap-1.5 mt-1 sm:mt-1.5 ${isUrgent ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                            <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full shrink-0 ${isUrgent ? 'bg-red-500 animate-ping' : 'bg-slate-300'}`}></span>
                            <span className="truncate">คืน: {borrow.due_date ? new Date(borrow.due_date).toLocaleDateString('th-TH') : '-'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-3 sm:py-5 text-center">
                        <div className={`inline-flex items-center px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wide uppercase border ${
                          borrow.return_date
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full mr-1 ${borrow.return_date ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                          {borrow.return_date ? 'Returned' : 'In Use'}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-3 sm:py-5 text-center">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                          {!borrow.return_date && (
                            <div className="flex items-center gap-1 sm:gap-2">
                              <button
                                onClick={() => handleReturn(borrow.id, borrow.assets?.id!, borrow)}
                                className="p-1.5 sm:p-2 bg-white text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg sm:rounded-xl transition-all shadow-sm text-xs sm:text-base"
                                title="ยืนยันการคืน"
                              >
                                ↩️
                              </button>

                              <button
                                onClick={() => openRenewModal(borrow)}
                                className="p-1.5 sm:p-2 bg-white text-amber-600 hover:bg-amber-600 hover:text-white border border-amber-200 rounded-lg sm:rounded-xl transition-all shadow-sm text-xs sm:text-base"
                                title="ต่ออายุการยืม"
                              >
                                🔄
                              </button>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {/* 🔥 แสดงปุ่ม View Doc - ใช้ shared document ถ้ามี */}
                            {(borrow.file_url || (isPartOfGroup && sessionGroup?.has_documents)) && (
                              <a
                                href={borrow.file_url || (sessionGroup?.shared_documents[0]?.file_url || '#')}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all shadow-sm text-center whitespace-nowrap"
                              >
                                View Doc
                              </a>
                            )}
                            
                            {/* 🔥 ปุ่มอัปโหลด - แสดงไอคอนกลุ่มถ้ามีรายการอื่นใน session เดียวกัน */}
                            <label className={`cursor-pointer px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-bold border transition-all shadow-sm text-center whitespace-nowrap
                              ${borrow.file_url || (isPartOfGroup && sessionGroup?.has_documents)
                                ? 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white hover:text-slate-600'
                                : isPartOfGroup
                                  ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                                  : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                              } ${uploadingId === borrow.id ? 'cursor-wait opacity-50' : ''}`}
                              title={isPartOfGroup ? 'อัปโหลดครั้งเดียวผูกทุกรายการในกลุ่ม' : 'อัปโหลดเอกสาร'}
                            >
                              {uploadingId === borrow.id 
                                ? '...' 
                                : (borrow.file_url || (isPartOfGroup && sessionGroup?.has_documents) 
                                  ? 'Edit' 
                                  : isPartOfGroup 
                                    ? '📎 แนบกลุ่ม' 
                                    : 'Upload'
                                  )
                              }
                              <input
                                type="file"
                                className="hidden"
                                disabled={uploadingId !== null}
                                onChange={(e) => handleSmartUpload(e, borrow)}
                              />
                            </label>

                            {/* 🗑️ ปุ่มลบเอกสาร - แสดงเมื่อมีเอกสารแนบอยู่ */}
                            {(borrow.file_url || (isPartOfGroup && sessionGroup?.has_documents)) && (
                              <button
                                onClick={() => handleDeleteDocument(borrow)}
                                className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white text-red-500 hover:bg-red-500 hover:text-white border border-red-200 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all shadow-sm text-center whitespace-nowrap"
                                title="ลบเอกสารเพื่ออัปโหลดใหม่"
                              >
                                🗑️ ลบ
                              </button>
                            )}

                            {/* 🔥 แสดง badge "แชร์เอกสาร" ถ้ารายการนี้ใช้เอกสารร่วมกับรายการอื่น */}
                            {isPartOfGroup && sessionGroup?.has_documents && (
                              <span className="text-[8px] sm:text-[9px] text-indigo-500 font-medium w-full text-center">
                                📎 แชร์กับ {sessionGroup.item_count - 1} รายการ
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-2 sm:px-4 py-10 sm:py-20 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-3xl sm:text-4xl mb-3 sm:mb-4 opacity-20">📂</span>
                      <p className="text-slate-400 font-medium text-xs sm:text-sm">ไม่พบประวัติการทำรายการ</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredBorrows.length}
          indexOfFirstItem={indexOfFirstItem}
          indexOfLastItem={indexOfLastItem}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>

      {/* 🔄 Modal ต่ออายุการยืม */}
      <Modal
        isOpen={renewModalOpen}
        onClose={() => {
          setRenewModalOpen(false)
          setRenewTarget(null)
          setNewDueDate('')
        }}
        title="🔄 ต่ออายุการยืม"
        maxWidth="max-w-lg"
      >
        {renewTarget && (
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
            {/* ข้อมูลรายการยืม */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 sm:p-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                <span className="text-[11px] sm:text-xs font-semibold text-amber-700 uppercase tracking-wider">รายละเอียดการยืม</span>
                <span className="text-[9px] sm:text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold self-start sm:self-auto">
                  ต่ออายุครั้งที่ {renewTarget.renewal_count || 0}/3
                </span>
              </div>
              <div className="text-xs sm:text-sm space-y-1">
                <p><span className="font-semibold text-slate-700">ผู้ยืม:</span> <span className="text-slate-900">{renewTarget.borrower_name}</span></p>
                <p><span className="font-semibold text-slate-700">อุปกรณ์:</span> <span className="text-slate-900">{renewTarget.assets?.name || '-'}</span></p>
                <p><span className="font-semibold text-slate-700">วันที่คืนเดิม:</span> <span className="text-slate-900">{renewTarget.due_date ? new Date(renewTarget.due_date).toLocaleDateString('th-TH') : '-'}</span></p>
              </div>
            </div>

            {/* เลือกวันที่คืนใหม่ (มีปฏิทิน + แสดง d/m/y) */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                เลือกวันที่คืนใหม่ <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  min={renewTarget.due_date ? new Date(renewTarget.due_date).toISOString().split('T')[0] : undefined}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all [color-scheme:light]"
                />
                {newDueDate && (
                  <div className="mt-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-amber-50 border border-amber-100 rounded-lg text-xs sm:text-sm text-amber-800 font-medium inline-block">
                    📅 {new Date(newDueDate).toLocaleDateString('th-TH')}
                  </div>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5">
                วันที่คืนใหม่ต้องมากกว่าวันที่คืนเดิม
              </p>
            </div>

            {/* ปุ่มดำเนินการ */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
              <button
                onClick={() => {
                  setRenewModalOpen(false)
                  setRenewTarget(null)
                  setNewDueDate('')
                }}
                className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all order-2 sm:order-1"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleRenew}
                disabled={!newDueDate || renewing}
                className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                style={{
                  background: !newDueDate || renewing ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  boxShadow: !newDueDate || renewing ? 'none' : '0 4px 15px rgba(245,158,11,0.3)',
                }}
              >
                {renewing ? 'กำลังดำเนินการ...' : '✅ ยืนยันต่ออายุ'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
