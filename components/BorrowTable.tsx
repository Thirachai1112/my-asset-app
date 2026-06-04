// components/BorrowTable.tsx
'use client'

import { useState, useEffect } from 'react'

export default function BorrowTable() {
  const [borrows, setBorrows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // ➕ State สำหรับเก็บคำค้นหาประวัติการยืม
  const [searchTerm, setSearchTerm] = useState('')

  const fetchBorrows = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/borrows')
      const json = await res.json()
      if (json.success) setBorrows(json.data) // อ้างอิงตาม API หลังบ้านของคุณ
      // หมายเหตุ: หากโครงสร้าง API ของคุณส่งกลับมาในชื่อ json.data ให้ใช้ setBorrows(json.data)
      if (json.success) setBorrows(json.data)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBorrows()
  }, [])

  // ➕ ลอจิกการกรองข้อมูลประวัติการยืมแบบเรียลไทม์
  const filteredBorrows = borrows.filter((borrow) => {
    const searchLower = searchTerm.toLowerCase().trim()
    
    // ถ้าไม่ได้พิมพ์อะไรเลย ให้โชว์ทั้งหมด
    if (!searchLower) return true

    // ตรวจสอบสถานะคำค้นหาภาษาไทย "คืนแล้ว" / "กำลังยืม" เพื่อให้ค้นหาด้วยสเตตัสได้ด้วย
    const statusText = borrow.return_date ? 'คืนแล้ว' : 'กำลังยืมอยู่'
    const assetName = borrow.assets?.name?.toLowerCase() || ''
    const assetSn = borrow.assets?.serial_number?.toLowerCase() || ''

    // ค้นหาจาก ชื่อผู้ยืม, แผนก หรือ สถานะการคืน
    return (
      borrow.borrower_name?.toLowerCase().includes(searchLower) ||
      borrow.borrower_dept?.toLowerCase().includes(searchLower) ||
      statusText.includes(searchLower)
        || assetName.includes(searchLower) // เพิ่มการค้นหาจากชื่อสินทรัพย์
        || assetSn.includes(searchLower) // เพิ่มการค้นหาจากหมายเลขซีเรีย
    )
  })

  if (loading) return <div className="p-12 text-center text-slate-400 animate-pulse">กำลังโหลดประวัติการยืม...</div>

  return (
    <div className="p-6">
      {/* แถบหัวข้อรายละเอียด */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">บันทึกประวัติการยืม-คืนครุภัณฑ์</h3>
          <p className="text-xs text-slate-400">พบประวัติการทำรายการทั้งหมด {filteredBorrows.length} รายการ</p>
        </div>
      </div>

      {/* ➕ กล่องค้นหาประวัติ (Search Bar) */}
      <div className="mb-6">
        <div className="relative max-w-md w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            🔍
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาด้วย ชื่อผู้ยืม, แผนก หรือพิมพ์ 'กำลังยืม', 'คืนแล้ว'..."
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none transition-colors text-slate-800"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ล้าง
            </button>
          )}
        </div>
      </div>

      {/* โครงสร้างตารางยืม-คืนแบบปลอดภัย ไร้ช่องว่างระหว่างแท็กภายใน tr */}
<div className="overflow-x-auto border border-slate-100 rounded-xl">
  <table className="w-full text-left border-collapse">
    <thead>
      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
        <th className="p-4 w-16 text-center">ID</th>
        <th className="p-4">ชื่อผู้ยืม</th>
        <th className="p-4">แผนก</th>
        <th className="p-4">อุปกรณ์ที่ยืม</th>
        <th className="p-4">Serial Number</th>
        <th className="p-4">วันที่ยืม</th>
        <th className="p-4">กำหนดคืน</th>
        <th className="p-4 text-center">สถานะการคืน</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100 text-sm">
      {filteredBorrows.length > 0 ? (
        filteredBorrows.map((borrow) => (
          <tr key={borrow.id} className="hover:bg-slate-50/50 transition-colors">
            <td className="p-4 text-center text-slate-400 font-mono text-xs">{borrow.id}</td>
            <td className="p-4 font-semibold text-slate-900">{borrow.borrower_name}</td>
            <td className="p-4 text-slate-600">{borrow.borrower_dept || '-'}</td>
            <td className="p-4 font-medium text-slate-800">{borrow.assets?.name || 'ไม่พบข้อมูลอุปกรณ์'}</td>
            <td className="p-4 text-slate-500 font-mono text-xs">{borrow.assets?.serial_number || '-'}</td>
            <td className="p-4 text-slate-500 text-xs">{new Date(borrow.borrow_date).toLocaleDateString('th-TH')}</td>
            <td className="p-4 text-slate-500 text-xs">{borrow.due_date ? new Date(borrow.due_date).toLocaleDateString('th-TH') : '-'}</td>
            <td className="p-4 text-center">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                borrow.return_date ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>{borrow.return_date ? 'คืนแล้ว' : 'กำลังยืมอยู่'}</span>
            </td>
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan={8} className="p-8 text-center text-slate-400">❌ ไม่พบประวัติการยืมที่ตรงกับเงื่อนไข</td>
        </tr>
      )}
    </tbody>
  </table>
</div>
    </div>
  )
}