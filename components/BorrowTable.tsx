'use client'

import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'

export default function BorrowTable() {
  const [borrows, setBorrows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // 🔢 1. จัดการระบบแบ่งหน้า (Pagination States)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10 // บังคับแสดงผลหน้าละ 10 แถว

  const fetchBorrows = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/borrows/history')
      const json = await res.json()
      if (json.success) setBorrows(json.history || json.data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBorrows()
  }, [])

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
        fetchBorrows() // 🔄 โหลดข้อมูลใหม่เปลี่ยนเป็นสีเขียวทันที
      } else {
        throw new Error(json.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'ล้มเหลว', text: err.message })
    }
  }

  // 🔍 ตัวจัดการพิมพ์ค้นหา (เมื่อพิมพ์ ให้เด้งกลับไปหน้า 1 เสมอเพื่อกันบั๊กข้อมูลไม่ครบหน้า)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  // ลอจิกการกรองข้อมูล
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

  // 🔢 2. คำนวณขอบเขตอาเรย์สำหรับแบ่งหน้าทีละ 10 รายการ
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
    <div className="p-6">
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
      <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
              {[
                { text: "ลำดับ", className: "p-4 w-16 text-center" },
                { text: "ชื่อผู้ยืม", className: "p-4" },
                { text: "แผนก", className: "p-4" },
                { text: "อุปกรณ์ที่ยืม", className: "p-4" },
                { text: "ประเภท", className: "p-4" },
                { text: "Serial Number", className: "p-4" },
                { text: "วันที่ยืม", className: "p-4" },
                { text: "กำหนดคืน", className: "p-4" },
                { text: "เบอร์ติดต่อ", className: "p-4 text-center" },
                { text: "สถานะการคืน", className: "p-4 text-center" },
                { text: "จัดการ", className: "p-4 text-center" }
              ].map((header, i) => (
                <th key={i} className={header.className}>
                  {header.text}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {currentRows.length > 0 ? (
              currentRows.map((borrow, index) => (
                <tr key={borrow.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* 💡 คำนวณรหัสลำดับให้รันต่อกันเมื่อเปลี่ยนหน้าอย่างถูกต้อง (เช่น หน้า 2 จะเริ่มที่ 11) */}
                  <td className="p-4 text-center text-slate-400 font-mono text-xs">
                    {indexOfFirstItem + index + 1}
                  </td>
                  <td className="p-4 font-semibold text-slate-900">{borrow.borrower_name}</td>
                  <td className="p-4 text-slate-600">{borrow.borrower_dept || '-'}</td>
                  <td className="p-4 font-medium text-slate-800">{borrow.assets?.name || 'ไม่พบข้อมูลอุปกรณ์'}</td>
                  <td className="p-4 text-slate-500 font-mono text-xs">{borrow.assets?.type || '-'}</td>
                  <td className="p-4 text-slate-500 font-mono text-xs">{borrow.assets?.serial_number || '-'}</td>
                  <td className="p-4 text-slate-500 text-xs">{new Date(borrow.borrow_date).toLocaleDateString('th-TH')}</td>
                  <td className="p-4 text-slate-500 text-xs">{borrow.due_date ? new Date(borrow.due_date).toLocaleDateString('th-TH') : '-'}</td>
                  <td className="p-4 text-center text-slate-700 font-mono text-xs font-medium">{borrow.phone || '-'}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      borrow.return_date ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {borrow.return_date ? '● คืนแล้ว' : '● กำลังยืมอยู่'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {!borrow.return_date ? (
                      <button
                        onClick={() => handleReturn(borrow.id, borrow.assets?.id)}
                        className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-medium transition-colors shadow-sm active:scale-95"
                      >
                        ↩️ คืนของ
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(borrow.return_date).toLocaleDateString('th-TH')}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="p-8 text-center text-slate-400">❌ ไม่พบประวัติการยืมที่ตรงกับเงื่อนไข</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 🔢 3. ส่วนควบคุมสำหรับเปลี่ยนหน้า (Pagination Controls) */}
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