'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Swal from 'sweetalert2'

const REPAIR_STATUS = [
  { value: 'Pending', label: '⏳ รอดำเนินการ (Pending)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'In Progress', label: '🛠️ กำลังซ่อม (In Progress)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'Completed', label: '✅ เสร็จสิ้น (Completed)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
]

export default function RepairTable() {
  const [repairs, setRepairs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Modal states (Editing Only)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRepair, setEditingRepair] = useState<any | null>(null)

  // Form states (For Editing)
  const [requesterName, setRequesterName] = useState('')
  const [requesterDept, setRequesterDept] = useState('')
  const [requesterPhone, setRequesterPhone] = useState('')
  const [requesterPosition, setRequesterPosition] = useState('')
  const [requesterEmpCode, setRequesterEmpCode] = useState('')
  const [problemDetail, setProblemDetail] = useState('')
  const [assetsNumber, setAssetsNumber] = useState('')
  const [manualContract, setManualContract] = useState('')
  const [typeItem, setTypeItem] = useState('')
  const [status, setStatus] = useState('Pending')

  const fetchRepairs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/repairs')
      const json = await res.json()
      if (json.success) {
        setRepairs(json.data || [])
      }
    } catch (err) {
      console.error('Error fetching repairs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRepairs()
  }, [])

  const openModal = (repair: any) => {
    setEditingRepair(repair)
    setRequesterName(repair.requester_name || '')
    setRequesterDept(repair.requester_dept || '')
    setRequesterPhone(repair.requester_phone || '')
    setRequesterPosition(repair.requester_position || '')
    setRequesterEmpCode(repair.requester_emp_code || '')
    setProblemDetail(repair.item?.problem_detail || '')
    setAssetsNumber(repair.item?.assets_number || '')
    setManualContract(repair.item?.manual_contract || '')
    setTypeItem(repair.item?.type_item || '')
    setStatus(repair.status || 'Pending')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const bodyData = {
      requester_name: requesterName,
      requester_dept: requesterDept,
      requester_phone: requesterPhone,
      requester_position: requesterPosition,
      requester_emp_code: requesterEmpCode,
      problem_detail: problemDetail,
      assets_number: assetsNumber,
      manual_contract: manualContract,
      type_item: typeItem,
      status,
      repair_item_id: editingRepair?.item?.id || null
    }

    try {
      const res = await fetch(`/api/repairs/${editingRepair.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      })

      const json = await res.json()
      if (json.success) {
        setIsModalOpen(false)
        Swal.fire({
          icon: 'success',
          title: 'อัปเดตข้อมูลสำเร็จ',
          timer: 1500,
          showConfirmButton: false
        })
        fetchRepairs()
      } else {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: json.error || 'ไม่สามารถบันทึกข้อมูลได้' })
      }
    } catch (err) {
      console.error(err)
      Swal.fire({ icon: 'error', title: 'ล้มเหลว', text: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' })
    }
  }

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: "คุณต้องการลบข้อมูลการแจ้งซ่อมนี้ใช่หรือไม่?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก'
    })

    if (!result.isConfirmed) return

    try {
      const res = await fetch(`/api/repairs/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1500, showConfirmButton: false })
        fetchRepairs()
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ล้มเหลว', text: 'ลบข้อมูลไม่สำเร็จ' })
    }
  }

  const filteredRepairs = repairs.filter((r) => {
    const searchLower = searchTerm.toLowerCase().trim()
    if (!searchLower) return true
    return (
      r.requester_name?.toLowerCase().includes(searchLower) ||
      r.requester_emp_code?.toLowerCase().includes(searchLower) ||
      r.requester_dept?.toLowerCase().includes(searchLower) ||
      r.item?.manual_brand?.toLowerCase().includes(searchLower) ||
      r.item?.problem_detail?.toLowerCase().includes(searchLower) ||
      r.item?.manual_sn?.toLowerCase().includes(searchLower) ||
      r.item?.assets_number?.toLowerCase().includes(searchLower) ||
      r.item?.manual_contract?.toLowerCase().includes(searchLower) ||
      r.item?.type_item?.toLowerCase().includes(searchLower)
    )
  })

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentRepairs = filteredRepairs.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredRepairs.length / itemsPerPage)

  if (loading) return <div className="p-12 text-center text-slate-400 animate-pulse">กำลังโหลดข้อมูลการซ่อม...</div>

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Repair Management System</h3>
          <p className="text-xs text-slate-400">พบรายการแจ้งซ่อมทั้งหมด {filteredRepairs.length} รายการ</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="ค้นหาด้วย ชื่อ, รหัสพนักงาน, ครุภัณฑ์, สัญญา, อุปกรณ์..."
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none text-slate-800"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
              <th className="p-4 w-16 text-center">ลำดับ</th>
              <th className="p-4">วันที่แจ้ง/เสร็จสิ้น</th>
              <th className="p-4">รหัสพนักงาน</th>
              <th className="p-4">ผู้แจ้งซ่อม</th>
              <th className="p-4">เลขครุภัณฑ์</th>
              <th className="p-4">เลขที่สัญญา</th>
              <th className="p-4">ประเภท</th>
              <th className="p-4">อุปกรณ์ / S/N</th>
              <th className="p-4">อาการเสีย</th>
              <th className="p-4 text-center">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {currentRepairs.length > 0 ? (
              currentRepairs.map((repair, index) => (
                <tr key={repair.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-center text-slate-400 font-mono text-xs">{indexOfFirstItem + index + 1}</td>
                  <td className="p-4">
                    <div className="text-xs text-slate-500">📥 {new Date(repair.repair_date).toLocaleDateString('th-TH')}</div>
                    {repair.repair_finish && (
                      <div className="text-xs text-emerald-600 font-bold mt-1">✅ {new Date(repair.repair_finish).toLocaleDateString('th-TH')}</div>
                    )}
                  </td>
                  <td className="p-4 font-mono text-xs text-slate-600 font-bold uppercase">
                    {repair.requester_emp_code || '-'}
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-900">{repair.requester_name || 'ไม่ระบุชื่อ'}</div>
                    <div className="text-[10px] text-slate-500">{repair.requester_position || '-'} | {repair.requester_dept || '-'}</div>
                    <div className="text-[10px] text-blue-600 font-mono">{repair.requester_phone || '-'}</div>
                  </td>
                  <td className="p-4 font-mono text-xs text-amber-700 font-bold">
                    {repair.item?.assets_number || '-'}
                  </td>
                  <td className="p-4 font-mono text-xs text-blue-700 font-bold">
                    {repair.item?.manual_contract || '-'}
                  </td>
                  <td className="p-4 text-xs font-semibold text-slate-600 uppercase">
                    {repair.item?.type_item || '-'}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-slate-800">{repair.item?.manual_brand || 'ไม่ระบุ'}</div>
                    <div className="text-[10px] text-slate-500 font-mono">SN: {repair.item?.manual_sn || '-'}</div>
                  </td>
                  <td className="p-4 text-slate-700 max-w-xs truncate">{repair.item?.problem_detail || '-'}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${
                      REPAIR_STATUS.find(s => s.value === repair.status)?.color || 'bg-slate-50 text-slate-700'
                    }`}>
                      {REPAIR_STATUS.find(s => s.value === repair.status)?.label.split(' ')[1] || repair.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-400">❌ ไม่พบข้อมูลการซ่อม</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-4">
          <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">ก่อนหน้า</button>
          <span className="text-sm font-medium">หน้า {currentPage} / {totalPages}</span>
          <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">ถัดไป</button>
        </div>
      )}

      {/* Modal สำหรับการแก้ไข (Edit Only) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-slate-50 border-b px-6 py-4 flex justify-between items-center shrink-0">
              <h4 className="font-bold text-slate-900">📝 แก้ไขข้อมูลการซ่อม</h4>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">สถานะการซ่อม</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 text-slate-800">
                  {REPAIR_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">ข้อมูลผู้แจ้งซ่อม</h5>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">ชื่อผู้แจ้ง</label>
                    <input type="text" value={requesterName} onChange={(e) => setRequesterName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 text-slate-800" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">รหัสพนักงาน</label>
                      <input type="text" value={requesterEmpCode} onChange={(e) => setRequesterEmpCode(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">ตำแหน่ง</label>
                      <input type="text" value={requesterPosition} onChange={(e) => setRequesterPosition(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 text-slate-800" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">แผนก</label>
                      <input type="text" value={requesterDept} onChange={(e) => setRequesterDept(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">เบอร์โทร</label>
                      <input type="text" value={requesterPhone} onChange={(e) => setRequesterPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 text-slate-800" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">ประเภทอุปกรณ์</label>
                  <input type="text" value={typeItem} onChange={(e) => setTypeItem(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 text-slate-800" />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">เลขครุภัณฑ์</label>
                    <input type="text" value={assetsNumber} onChange={(e) => setAssetsNumber(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 text-slate-800 font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">เลขที่สัญญา</label>
                    <input type="text" value={manualContract} onChange={(e) => setManualContract(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 text-slate-800 font-mono" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">อาการเสีย (แก้ไข)</label>
                <textarea
                  value={problemDetail}
                  onChange={(e) => setProblemDetail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 text-slate-800"
                  rows={3}
                />
              </div>

              <div className="flex space-x-3 pt-4 border-t sticky bottom-0 bg-white shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 rounded-xl text-sm transition-colors">ยกเลิก</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl text-sm shadow-sm transition-colors">บันทึกการแก้ไข</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
