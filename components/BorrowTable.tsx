'use client'

import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
// นำเข้าตัวสร้าง Client จากตัวหลักของแพ็กเกจโดยตรง เพื่อแก้ปัญหาตัวแดง
import { createBrowserClient } from '@supabase/ssr'

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

  const [borrows, setBorrows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [uploadingId, setUploadingId] = useState<number | null>(null) // เช็กสถานะการอัปโหลดแต่ละแถว

  // 🔔 เพิ่ม State สำหรับเก็บรายการที่ต้องตามงาน
  const [urgentItems, setUrgentItems] = useState<any[]>([])

  // 🔢 จัดการระบบแบ่งหน้า (Pagination States)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  
  const fetchBorrows = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/borrows/history')
      const json = await res.json()

      // 🔎 ส่องดูข้อมูลภาพรวมที่ยิงมาจาก API หลังบ้าน
      console.log("📡 ข้อมูลดิบจาก API หลังบ้านที่ส่งมาถึงหน้าบ้าน:", json)

      if (json.success) {
        const data = json.history || json.data || []
        setBorrows(data)

        // 🔎 คำนวณหารายการที่ต้องตามคืน (เลยกำหนดหรือเหลือเวลา 2 วัน)
        const today = new Date()
        const urgent = data.filter((b: any) => {
          if (b.return_date || !b.due_date) return false
          const diffDays = (new Date(b.due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          return diffDays <= 2 // เตือนถ้าเหลือเวลา <= 2 วัน หรือเลยกำหนดไปแล้ว
        })
        setUrgentItems(urgent)
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBorrows()
  }, [])

  // 📁 ฟังก์ชันสำหรับแอดมินอัปโหลดเอกสารเซ็นแล้วย้อนหลัง (เข้าตาราง 'documents')
  const handleAdminUpload = async (event: React.ChangeEvent<HTMLInputElement>, targetBorrow: any) => {
    try {
      const file = event.target.files?.[0]
      if (!file) return

      // ดึง ID ออกมาจาก Object ของแถวนั้นตรงๆ ป้องกันการจำสลับแถว
      const borrowId = Number(targetBorrow.id)
      if (!borrowId) {
        Swal.fire("ข้อผิดพลาด", "ไม่พบ ID ของรายการยืม คาดว่าเป็น undefined", "error")
        return
      }

      // 1. ตรวจสอบประเภทไฟล์
      const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"]
      if (!allowedTypes.includes(file.type)) {
        Swal.fire("ข้อผิดพลาด", "รองรับเฉพาะไฟล์ PDF และรูปภาพ (PNG, JPG) เท่านั้นครับ", "error")
        return
      }

      // 2. จำกัดขนาดไฟล์ไม่เกิน 5MB
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire("ข้อผิดพลาด", "ขนาดไฟล์ใหญ่เกินไป ห้ามเกิน 5MB ครับ", "error")
        return
      }

      setUploadingId(borrowId)

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

      // 🌟 5. บันทึกข้อมูลแบบ Upsert (เช็กว่ามีเอกสารเดิมของรายการยืมนี้ไหม)
      const { data: existingDoc } = await supabase
        .from("documents")
        .select("id")
        .eq("borrow_id", borrowId)
        .maybeSingle()

      let dbResult;
      if (existingDoc) {
        // ถ้ามีอยู่แล้วให้ Update
        dbResult = await supabase
          .from("documents")
          .update({
            file_url: publicUrl,
            doc_number: `DOC-${borrowId}-${Date.now().toString().slice(-4)}`
          })
          .eq("id", existingDoc.id)
      } else {
        // ถ้ายังไม่มีให้ Insert
        dbResult = await supabase
          .from("documents")
          .insert([
            {
              doc_number: `DOC-${borrowId}-${Date.now().toString().slice(-4)}`,
              doc_type: "ใบขอยืมอุปกรณ์อนุมัติแล้ว",
              file_url: publicUrl,
              borrow_id: borrowId
            }
          ])
      }

      if (dbResult.error) throw dbResult.error

      Swal.fire({
        icon: "success",
        title: existingDoc ? "แก้ไขเอกสารสำเร็จ!" : "อัปโหลดเอกสารสำเร็จ!",
        text: `อัปเดตข้อมูลสำหรับรายการ ID: ${borrowId} เรียบร้อยแล้ว`,
        timer: 1500,
        showConfirmButton: false,
      })

      fetchBorrows() // 🔄 รีโหลดตารางเพื่อให้ปุ่มสลับเป็น "ดูไฟล์" ทันที

    } catch (error: any) {
      console.error("❌ Error Detail:", error);
      Swal.fire("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถอัปโหลดไฟล์ได้", "error")
    } finally {
      setUploadingId(null)
    }
  }

  // 🟢 ฟังก์ชันส่งข้อมูลไปอัปเดตสถานะการคืนของ
  const handleReturn = async (borrowId: number, assetId: number) => {
    const result = await Swal.fire({
      title: 'ยืนยันการคืนครุภัณฑ์?',
      text: "ระบบจะบันทึกวันที่คืนและเปลี่ยนสถานะอุปกรณ์ชิ้นนี้ให้พร้อมใช้งาน",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ยืนยันการคืน',
      cancelButtonText: 'ยกเลิก'
    })

    if (!result.isConfirmed) return

    try {
      const res = await fetch('/api/borrows/history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowId, assetId })
      })

      const json = await res.json()

      if (res.ok && json.success) {
        Swal.fire({ icon: 'success', title: 'บันทึกการคืนสำเร็จ', timer: 1500, showConfirmButton: false })
        fetchBorrows()
      } else {
        throw new Error(json.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'ล้มเหลว', text: err.message })
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const filteredBorrows = borrows.filter((borrow) => {
    const searchLower = searchTerm.toLowerCase().trim()
    if (!searchLower) return true
    const statusText = borrow.return_date ? 'คืนแล้ว' : 'กำลังยืมอยู่'
    return (
      borrow.borrower_name?.toLowerCase().includes(searchLower) ||
      borrow.borrower_dept?.toLowerCase().includes(searchLower) ||
      (borrow.phone || '').includes(searchLower) ||
      statusText.includes(searchLower) ||
      (borrow.assets?.name?.toLowerCase() || '').includes(searchLower) ||
      (borrow.assets?.serial_number?.toLowerCase() || '').includes(searchLower)
    )
  })

  // 🔢 คำนวณขอบเขตอาเรย์สำหรับการแบ่งหน้า
  const totalPages = Math.ceil(filteredBorrows.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentRows = filteredBorrows.slice(indexOfFirstItem, indexOfLastItem)

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber)
    }
  }

  if (loading) return <div className="p-12 text-center text-slate-400 animate-pulse">กำลังโหลดประวัติการยืม...</div>

  return (
    <div className="p-4 md:p-6 w-full max-w-full mx-auto">
      
      {/* 🚨 แผงแจ้งเตือนรายการที่ต้องตามงาน */}
      {urgentItems.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl shadow-sm animate-pulse">
          <h4 className="text-red-700 font-bold text-sm">🔔 ต้องติดตามคืนด่วน ({urgentItems.length} รายการ)</h4>
          <div className="text-xs text-red-600 mt-2 space-y-1">
            {urgentItems.map((item) => (
              <p key={item.id}>• <strong>{item.borrower_name}</strong> ยืม {item.assets?.name} (กำหนด: {new Date(item.due_date).toLocaleDateString('th-TH')})</p>
            ))}
          </div>
        </div>
      )}

      {/* ส่วนหัวแผงควบคุม */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">บันทึกประวัติการยืม-คืนครุภัณฑ์</h3>
          <p className="text-xs text-slate-400">พบประวัติการทำรายการทั้งหมด {filteredBorrows.length} รายการ</p>
        </div>
      </div>

      {/* แถบค้นหา */}
      <div className="mb-6">
        <div className="relative max-w-md w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="ค้นหาด้วย ชื่อ, แผนก, เบอร์โทร หรือพิมพ์ 'กำลังยืม'..."
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none text-slate-800"
          />
        </div>
      </div>

      {/* โครงสร้างตารางหลัก */}
      <div className="w-full overflow-x-auto border border-slate-100 rounded-xl bg-white shadow-sm">
        <table className="w-full min-w-[100px] text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
              {[
                { text: "ลำดับ", className: "p-3 w-16 text-center" },
                { text: "ชื่อผู้ยืม", className: "p-3 w-44" },
                { text: "แผนก", className: "p-3 w-32" },
                { text: "อุปกรณ์ที่ยืม", className: "p-3 w-56" },
                { text: "จำนวน", className: "p-3 w-24 text-center" },
                { text: "ประเภท", className: "p-3 w-32" },
                { text: "Serial Number", className: "p-3 w-40" },
                { text: "วันที่ยืม", className: "p-3 w-28" },
                { text: "กำหนดคืน", className: "p-3 w-28" },
                { text: "เบอร์ติดต่อ", className: "p-3 w-32 text-center" },
                { text: "สถานะการคืน", className: "p-3 w-32 text-center" },
                { text: "จัดการ", className: "p-3 w-56 text-center" }
              ].map((header, i) => (
                <th key={i} className={header.className}>{header.text}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {currentRows.length > 0 ? (
              currentRows.map((borrow, index) => {
                const isUrgent = !borrow.return_date && borrow.due_date && 
                  (new Date(borrow.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 2;

                return (
                  <tr key={borrow.id} className={`hover:bg-slate-50/50 transition-colors ${isUrgent ? 'bg-red-50' : ''}`}>
                    <td className="p-3 text-center text-slate-400 font-mono text-xs">
                      {indexOfFirstItem + index + 1}
                    </td>
                  <td className="p-3 font-semibold text-slate-900 break-words">{borrow.borrower_name}</td>
                  <td className="p-3 text-slate-600 break-words">{borrow.borrower_dept || '-'}</td>
                  <td className="p-3 font-medium text-slate-800 break-words">{borrow.assets?.name || 'ไม่พบข้อมูลอุปกรณ์'}</td>

                  <td className="p-3 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold text-xs border border-blue-100 whitespace-nowrap">
                      {borrow.quantity || 1} ชิ้น
                    </span>
                  </td>

                  <td className="p-3 text-slate-500 font-mono text-xs truncate">{borrow.assets?.type || '-'}</td>
                  <td className="p-3 text-slate-500 font-mono text-xs truncate">{borrow.assets?.serial_number || '-'}</td>
                  <td className="p-3 text-slate-500 text-xs whitespace-nowrap">{new Date(borrow.borrow_date).toLocaleDateString('th-TH')}</td>
                  <td className="p-3 text-slate-500 text-xs whitespace-nowrap">{borrow.due_date ? new Date(borrow.due_date).toLocaleDateString('th-TH') : '-'}</td>
                  <td className="p-3 text-center text-slate-700 font-mono text-xs font-medium truncate">{borrow.phone || '-'}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${borrow.return_date ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                      {borrow.return_date ? '● คืนแล้ว' : '● กำลังยืมอยู่'}
                    </span>
                  </td>

                  {/* ปุ่มควบคุมการทำงาน */}
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">

                      {/* ปุ่มคืนของ: แสดงเฉพาะเมื่อยังไม่มี return_date */}
                      {!borrow.return_date && (
                        <button
                          onClick={() => handleReturn(borrow.id, borrow.assets?.id)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold transition-colors"
                        >
                          ↩️ คืนของ
                        </button>
                      )}

                      {/* ปุ่มดูไฟล์ หรือ แนบ/แก้ไขไฟล์ */}
                      <div className="flex flex-col items-center gap-1">
                        {borrow.file_url && (
                          <a
                            href={borrow.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[10px] font-bold transition-colors w-full text-center"
                          >
                            👁️ ดูไฟล์
                          </a>
                        )}
                        <label className={`cursor-pointer px-2 py-1 rounded-lg text-[10px] font-bold border transition-all w-full text-center
                          ${borrow.file_url 
                            ? 'bg-slate-50 text-slate-400 border-slate-100 opacity-60 hover:opacity-100' 
                            : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                          } ${uploadingId === borrow.id ? 'cursor-wait opacity-50' : ''}`}
                        >
                          {uploadingId === borrow.id ? '⌛...' : (borrow.file_url ? '🔄 แก้ไข' : '📁 แนบไฟล์')}
                          <input
                            type="file"
                            className="hidden"
                            disabled={uploadingId !== null}
                            onChange={(e) => handleAdminUpload(e, borrow)}
                          />
                        </label>
                      </div>

                    </div>
                  </td>
                </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={12} className="p-8 text-center text-slate-400">❌ ไม่พบประวัติการยืมที่ตรงกับเงื่อนไข</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ระบบแบ่งหน้า (Pagination Controls) */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 py-3 px-4 bg-white border border-slate-100 rounded-xl text-xs sm:text-sm shadow-sm">
          <div className="text-slate-500 text-center sm:text-left">
            แสดงรายการที่ <span className="font-semibold text-slate-700">{indexOfFirstItem + 1}</span> ถึง{" "}
            <span className="font-semibold text-slate-700">
              {Math.min(indexOfLastItem, filteredBorrows.length)}
            </span>{" "}
            จากทั้งหมด <span className="font-semibold text-slate-700">{filteredBorrows.length}</span> รายการ
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white font-medium transition-all select-none"
            >
              ◀ ก่อนหน้า
            </button>
            <span className="text-slate-700 font-semibold bg-slate-100 px-3 py-1.5 rounded-lg">
              หน้า {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white font-medium transition-all select-none"
            >
              ถัดไป ▶
            </button>
          </div>
        </div>
      )}
    </div>
  )
}