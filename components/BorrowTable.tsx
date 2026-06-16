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
      borrow.position?.toLowerCase().includes(searchLower) ||
      (borrow.phone || '').includes(searchLower) ||
      statusText.includes(searchLower) ||
      (borrow.assets?.name?.toLowerCase() || '').includes(searchLower) ||
      (borrow.assets?.serial_number?.toLowerCase() || '').includes(searchLower) ||
      (borrow.assets?.asset_code?.toLowerCase() || '').includes(searchLower) ||
      (borrow.assets?.contract_number?.toLowerCase() || '').includes(searchLower)
    )
  })

  // 🔢 คำนวณขอบเขตอาเรย์สำหรับการแบ่งหน้า
  const totalPages = Math.ceil(filteredBorrows.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentRows = filteredBorrows.slice(indexOfFirstItem, indexOfLastItem)

  // 🧮 คำนวณยอดรวมจำนวนชิ้นจริง (Sum of quantities)
  const totalQuantity = filteredBorrows.reduce((sum, b) => sum + (Number(b.quantity || b.qty || 0)), 0)
  const activeQuantity = filteredBorrows.filter(b => !b.return_date).reduce((sum, b) => sum + (Number(b.quantity || b.qty || 0)), 0)
  const urgentQuantity = urgentItems.reduce((sum, b) => sum + (Number(b.quantity || b.qty || 0)), 0)

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber)
    }
  }

  return (
    <div className="w-full">
      
      {/* 📊 Summary Dashboard (เหมือนหน้าซ่อม) */}
      <div className="mx-6 mt-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">📊</div>
          <div>
            <h4 className="font-bold text-slate-800">สรุปภาพรวมการยืม-คืน</h4>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Borrowing & Return Analytics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">จำนวนเครื่องที่ยืมอยู่</p>
            <p className="text-2xl font-black text-indigo-600">{activeQuantity} <span className="text-sm font-medium text-slate-400">ชิ้น</span></p>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">รายการที่เลยกำหนด</p>
            <p className="text-2xl font-black text-red-500">{urgentItems.length} <span className="text-sm font-medium text-slate-400">รายการ</span></p>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">รวมจำนวนชิ้นทั้งหมด</p>
            <p className="text-2xl font-black text-slate-800">{totalQuantity} <span className="text-sm font-medium text-slate-400">ชิ้น</span></p>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">ประวัติรายการทั้งหมด</p>
            <p className="text-2xl font-black text-slate-800">{filteredBorrows.length} <span className="text-sm font-medium text-slate-400">รายการ</span></p>
          </div>
        </div>
      </div>

      {/* 🚨 Urgent Alerts */}
      {urgentItems.length > 0 && (
        <div className="mx-6 mt-6 bg-red-50/50 border border-red-100 p-4 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center text-xl shrink-0">
            🔔
          </div>
          <div>
            <h4 className="text-red-900 font-bold text-sm">รายการที่ต้องติดตามคืนด่วน ({urgentItems.length} รายการ / รวม {urgentQuantity} ชิ้น)</h4>
            <div className="text-xs text-red-700/80 mt-1.5 space-y-1">
              {urgentItems.slice(0, 2).map((item) => (
                <p key={item.id}>• <span className="font-semibold text-red-800">{item.borrower_name}</span> ยืม {item.assets?.name} จำนวน {item.quantity || 1} ชิ้น (กำหนดคืน: {new Date(item.due_date).toLocaleDateString('th-TH')})</p>
              ))}
              {urgentItems.length > 2 && <p className="italic font-medium text-red-600">...และอีก {urgentItems.length - 2} รายการที่เหลือ</p>}
            </div>
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div className="p-6 pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">ประวัติการยืม-คืน</h3>
          <p className="text-sm text-slate-500">พบทั้งหมด {filteredBorrows.length} รายการ (รวม {totalQuantity} ชิ้น)</p>
        </div>
        
        <div className="relative group max-w-sm w-full">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <span className="text-slate-400 group-focus-within:text-blue-500 transition-colors">🔍</span>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="ค้นหาชื่อ, แผนก, อุปกรณ์..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 block pl-10 p-2.5 transition-all outline-none"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="p-6">
        <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[11px] uppercase font-bold tracking-widest border-b border-slate-100">
                <th className="px-4 py-4 text-center w-16">#</th>
                <th className="px-4 py-4">ข้อมูลผู้ยืม</th>
                <th className="px-4 py-4">อุปกรณ์</th>
                <th className="px-4 py-4 text-center">จำนวน</th>
                <th className="px-4 py-4">วันที่ทำรายการ</th>
                <th className="px-4 py-4 text-center">สถานะ</th>
                <th className="px-4 py-4 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {currentRows.length > 0 ? (
                currentRows.map((borrow, index) => {
                  const isUrgent = !borrow.return_date && borrow.due_date && 
                    (new Date(borrow.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 2;

                  return (
                    <tr key={borrow.id} className={`group hover:bg-slate-50/80 transition-all ${isUrgent ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-5 text-center text-slate-400 font-mono text-xs">
                        {(indexOfFirstItem + index + 1).toString().padStart(2, '0')}
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 leading-tight">{borrow.borrower_name}</span>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <span className="text-[11px] text-slate-600 font-medium">ตำแหน่ง: {borrow.position || '-'}</span>
                            <span className="text-[11px] text-slate-500">แผนก: {borrow.borrower_dept || '-'}</span>
                          </div>
                          <span className="text-[10px] text-blue-500 font-bold mt-1.5 inline-flex items-center gap-1">
                            📞 {borrow.phone || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex flex-col max-w-[220px]">
                          <span className="font-semibold text-slate-800 truncate" title={borrow.assets?.name}>
                            {borrow.assets?.name || 'ไม่พบข้อมูล'}
                          </span>
                          <div className="flex flex-col gap-0.5 mt-1.5">
                            <span className="text-[10px] text-slate-500 font-mono">
                              asset NO: <span className="text-blue-600 font-bold">{borrow.assets?.asset_code || '-'}</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              SN: <span className="text-slate-700">{borrow.assets?.serial_number || '-'}</span>
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Contract: {borrow.assets?.contract_number || '-'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-center">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200">
                          {borrow.quantity || 1}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex flex-col text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                            ยืม: {new Date(borrow.borrow_date).toLocaleDateString('th-TH')}
                          </div>
                          <div className={`flex items-center gap-1.5 mt-1.5 ${isUrgent ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isUrgent ? 'bg-red-500 animate-ping' : 'bg-slate-300'}`}></span>
                            คืน: {borrow.due_date ? new Date(borrow.due_date).toLocaleDateString('th-TH') : '-'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-center">
                        <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border ${
                          borrow.return_date 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${borrow.return_date ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                          {borrow.return_date ? 'Returned' : 'In Use'}
                        </div>
                      </td>
                      <td className="px-4 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!borrow.return_date && (
                            <button
                              onClick={() => handleReturn(borrow.id, borrow.assets?.id)}
                              className="p-2 bg-white text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-xl transition-all shadow-sm"
                              title="ยืนยันการคืน"
                            >
                              ↩️
                            </button>
                          )}
                          
                          <div className="flex flex-col gap-1">
                            {borrow.file_url && (
                              <a
                                href={borrow.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1 bg-white text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] font-bold transition-all shadow-sm text-center"
                              >
                                View Doc
                              </a>
                            )}
                            <label className={`cursor-pointer px-3 py-1 rounded-lg text-[10px] font-bold border transition-all shadow-sm text-center
                              ${borrow.file_url 
                                ? 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white hover:text-slate-600' 
                                : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                              } ${uploadingId === borrow.id ? 'cursor-wait opacity-50' : ''}`}
                            >
                              {uploadingId === borrow.id ? '...' : (borrow.file_url ? 'Edit' : 'Upload')}
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
                  <td colSpan={7} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-4xl mb-4 opacity-20">📂</span>
                      <p className="text-slate-400 font-medium">ไม่พบประวัติการทำรายการ</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Improved Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
            <p className="text-xs text-slate-500 font-medium">
              แสดง <span className="text-slate-900">{indexOfFirstItem + 1}</span> ถึง <span className="text-slate-900">{Math.min(indexOfLastItem, filteredBorrows.length)}</span> จาก <span className="text-slate-900">{filteredBorrows.length}</span> รายการ
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 transition-all"
              >
                ◀
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToPage(i + 1)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                    currentPage === i + 1
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                      : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 transition-all"
              >
                ▶
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}