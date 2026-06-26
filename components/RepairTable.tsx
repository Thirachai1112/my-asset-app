'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'
import { generateRepairPDF } from '@/app/repairs/manage/generateRepairPDF'
import { generateRepairPDFquick } from '@/app/repairs/manage/generateRepairPDFquick'
import RepairDocumentUploader from './RepairDocumentUploader'

const REPAIR_STATUS = [
  { value: 'Pending', label: '⏳ รอดำเนินการ (Pending)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'In Progress', label: '🛠️ กำลังซ่อม (In Progress)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'Completed', label: '✅ เสร็จสิ้น (Completed)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
]

export default function RepairTable() {
  const [repairs, setRepairs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Filter states (Monthly Summary)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

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

  // 🗑️ ฟังก์ชันลบเอกสารของรายการซ่อม
  const handleDeleteDocument = async (repair: any) => {
    try {
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

      const res = await fetch('/api/repairs/documents/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repair_id: repair.id })
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถลบเอกสารได้')
      }
      Swal.fire({
        icon: 'success',
        title: 'ลบเอกสารสำเร็จ!',
        text: 'คุณสามารถอัปโหลดเอกสารใหม่ได้',
        timer: 1500,
        showConfirmButton: false,
      })
      fetchRepairs()
    } catch (error: any) {
      console.error('❌ Delete Document Error:', error)
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error?.message || 'ไม่สามารถลบเอกสารได้' })
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

  // คำนวณสรุปยอดรายเดือน (เฉพาะข้อมูลที่กรองตามเดือน/ปี)
  const monthlyData = repairs.filter(r => {
    const date = new Date(r.repair_date)
    return (date.getMonth() + 1) === selectedMonth && date.getFullYear() === selectedYear
  })

  const summary = {
    count: monthlyData.length,
    parts: monthlyData.reduce((sum, r) => sum + (Number(r.total_parts_cost) || 0), 0),
    partsQty: monthlyData.reduce((sum, r) => sum + (Number(r.total_parts_qty) || 0), 0),
    service: monthlyData.reduce((sum, r) => sum + (Number(r.service_price) || 0), 0),
    total: monthlyData.reduce((sum, r) => sum + (Number(r.grand_total) || 0), 0),
    // 📊 เพิ่มการจำแนกตามประเภทอุปกรณ์
    countsByType: monthlyData.reduce((acc: any, r) => {
      const type = r.item?.type_item || 'ไม่ระบุประเภท'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})
  }

  const exportToExcel = () => {
    try {
      // 1. เตรียมข้อมูลสำหรับ Sheet รายละเอียด
      const detailedData = monthlyData.map((r, index) => ({
        'ลำดับ': index + 1,
        'วันที่แจ้งซ่อม': new Date(r.repair_date).toLocaleDateString('th-TH'),
        'วันที่เสร็จสิ้น': r.repair_finish ? new Date(r.repair_finish).toLocaleDateString('th-TH') : '-',
        'ชื่อผู้แจ้ง': r.requester_name,
        'แผนก': r.requester_dept,
        'อุปกรณ์': r.item?.manual_brand || '-',
        'เลขครุภัณฑ์': r.item?.assets_number || '-',
        'อาการเสีย': r.item?.problem_detail || '-',
        'วิธีการซ่อม': r.fix_detail || '-',
        'สถานะ': REPAIR_STATUS.find(s => s.value === r.status)?.label.split(' ')[1] || r.status,
        'ค่าอะไหล่ (บาท)': r.total_parts_cost || 0,
        'ค่าบริการ (บาท)': r.service_price || 0,
        'ยอดรวมสุทธิ (บาท)': r.grand_total || 0,
        'ช่างผู้ซ่อม': r.technician_name || '-'
      }))

      // 2. เตรียมข้อมูลสำหรับ Sheet สรุปยอด
      const summaryData = [
        { 'หัวข้อ': 'เดือน/ปี', 'ข้อมูล': `${new Date(0, selectedMonth - 1).toLocaleString('th-TH', { month: 'long' })} ${selectedYear + 543}` },
        { 'หัวข้อ': 'จำนวนงานซ่อมทั้งหมด', 'ข้อมูล': `${summary.count} รายการ` },
        { 'หัวข้อ': 'รวมค่าอะไหล่', 'ข้อมูล': summary.parts.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
        { 'หัวข้อ': 'จำนวนอะไหล่ที่ใช้รวม', 'ข้อมูล': `${summary.partsQty} ชิ้น` },
        { 'หัวข้อ': 'รวมค่าบริการ', 'ข้อมูล': summary.service.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
        { 'หัวข้อ': 'งบประมาณรวมทั้งสิ้น', 'ข้อมูล': summary.total.toLocaleString(undefined, { minimumFractionDigits: 2 }) }
      ]

      // 3. สร้าง Workbook และเพิ่ม Sheets
      const wb = XLSX.utils.book_new()
      const wsDetails = XLSX.utils.json_to_sheet(detailedData)
      const wsSummary = XLSX.utils.json_to_sheet(summaryData)

      XLSX.utils.book_append_sheet(wb, wsSummary, "สรุปยอดรายเดือน")
      XLSX.utils.book_append_sheet(wb, wsDetails, "รายละเอียดงานซ่อม")

      // 4. บันทึกไฟล์
      const fileName = `รายงานการซ่อม_${selectedMonth}_${selectedYear + 543}.xlsx`
      XLSX.writeFile(wb, fileName)

      Swal.fire({ icon: 'success', title: 'ส่งออกไฟล์สำเร็จ', text: fileName, timer: 2000, showConfirmButton: false })
    } catch (err) {
      console.error(err)
      Swal.fire({ icon: 'error', title: 'ส่งออกล้มเหลว', text: 'เกิดข้อผิดพลาดในการสร้างไฟล์ Excel' })
    }
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Repair Management System</h3>
          <p className="text-xs text-slate-400">พบรายการแจ้งซ่อมทั้งหมด {filteredRepairs.length} รายการ</p>
        </div>
      </div>

      {/* 📊 Monthly Dashboard Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">📈</div>
            <div>
              <h4 className="font-bold text-slate-800">สรุปยอดการซ่อมรายเดือน</h4>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Financial & Repair Analytics</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={exportToExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-100 flex items-center gap-2"
            >
              <span>📊</span> Export to Excel
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('th-TH', { month: 'long' })}
                </option>
              ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y + 543}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">จำนวนงานซ่อม</p>
            <p className="text-2xl font-black text-slate-800">{summary.count} <span className="text-sm font-medium text-slate-400">รายการ</span></p>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">ค่าอะไหล่รวม</p>
            <p className="text-2xl font-black text-emerald-600">฿{summary.parts.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">จำนวนอะไหล่รวม</p>
            <p className="text-2xl font-black text-amber-600">{summary.partsQty} <span className="text-sm font-medium text-slate-400">ชิ้น</span></p>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">ค่าบริการรวม</p>
            <p className="text-2xl font-black text-blue-600">฿{summary.service.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-100 col-span-1 sm:col-span-2 lg:col-span-1">
            <p className="text-[10px] font-bold text-blue-100 uppercase mb-1">งบประมาณรวมทั้งสิ้น</p>
            <p className="text-2xl font-black text-white">฿{summary.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* 📋 จำแนกตามประเภท (Unit Breakdown) */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">จำแนกตามประเภทอุปกรณ์ (ยอดรวมรายเดือน)</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.countsByType).map(([type, count]: [string, any]) => (
              <div key={type} className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm">
                <span className="text-xs font-bold text-slate-700">{type}</span>
                <span className="h-4 w-px bg-slate-200"></span>
                <span className="text-xs font-black text-blue-600">{count} <span className="text-[10px] font-medium text-slate-400">เครื่อง</span></span>
              </div>
            ))}
            {Object.keys(summary.countsByType).length === 0 && (
              <p className="text-xs text-slate-400 italic">ไม่มีข้อมูลการซ่อมในเดือนนี้</p>
            )}
          </div>
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
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none text-slate-800"
          />
        </div>
      </div>

      {/* ===== DESKTOP TABLE VIEW (hidden on small screens) ===== */}
      <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
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
              <th className="p-4 text-center">วิธีการซ่อม</th>
              <th className="p-4 text-center">สถานะ</th>
              <th className="p-4 text-right">ยอดรวม (บาท)</th>
              <th className="p-4 text-center">เอกสาร</th>
              <th className="p-4 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {currentRepairs.length > 0 ? (
              currentRepairs.map((repair, index) => (
                <tr key={repair.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-center text-slate-400 font-mono text-xs align-top">{indexOfFirstItem + index + 1}</td>
                  <td className="p-4 align-top">
                    <div className="text-xs text-slate-500">📥 {new Date(repair.repair_date).toLocaleDateString('th-TH')}</div>
                    {repair.repair_finish && (
                      <div className="text-xs text-emerald-600 font-bold mt-1">✅ {new Date(repair.repair_finish).toLocaleDateString('th-TH')}</div>
                    )}
                  </td>
                  <td className="p-4 font-mono text-xs text-slate-600 font-bold uppercase align-top">
                    {repair.requester_emp_code || '-'}
                  </td>
                  <td className="p-4 align-top">
                    <div className="font-semibold text-slate-900">{repair.requester_name || 'ไม่ระบุชื่อ'}</div>
                    <div className="text-[10px] text-slate-500">{repair.requester_position || '-'} | {repair.requester_dept || '-'}</div>
                    <div className="text-[10px] text-blue-600 font-mono">{repair.requester_phone || '-'}</div>
                  </td>
                  <td className="p-4 font-mono text-xs text-amber-700 font-bold align-top">
                    {repair.item?.assets_number || '-'}
                  </td>
                  <td className="p-4 font-mono text-xs text-blue-700 font-bold align-top">
                    {repair.item?.manual_contract || '-'}
                  </td>
                  <td className="p-4 text-xs font-semibold text-slate-600 uppercase align-top">
                    {repair.item?.type_item || '-'}
                  </td>
                  <td className="p-4 align-top">
                    <div className="font-medium text-slate-800">{repair.item?.manual_brand || 'ไม่ระบุ'}</div>
                    <div className="text-[10px] text-slate-500 font-mono">SN: {repair.item?.manual_sn || '-'}</div>
                  </td>
                  <td className="p-4 text-slate-700 min-w-[150px] max-w-xs whitespace-normal break-words align-top">{repair.item?.problem_detail || '-'}</td>
                  <td className="p-4 text-slate-700 min-w-[150px] max-w-xs whitespace-normal break-words align-top">{repair.fix_detail || '-'}</td>
                  <td className="p-4 text-center align-top">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${
                      REPAIR_STATUS.find(s => s.value === repair.status)?.color || 'bg-slate-50 text-slate-700'
                    }`}>
                      {REPAIR_STATUS.find(s => s.value === repair.status)?.label.split(' ')[1] || repair.status}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-blue-600 align-top">
                    {repair.grand_total ? repair.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </td>
                  <td className="p-4 text-center align-top">
                    {repair.file_url ? (
                      <div className="flex flex-col items-center gap-1">
                        <a
                          href={repair.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-2 py-1 rounded text-[10px] font-bold border border-emerald-200 w-full"
                        >
                          👁️ ดูไฟล์
                        </a>
                        <button
                          onClick={() => handleDeleteDocument(repair)}
                          className="bg-white text-red-500 hover:bg-red-500 hover:text-white px-2 py-1 rounded text-[10px] font-bold border border-red-200 w-full transition-all"
                          title="ลบเอกสารเพื่ออัปโหลดใหม่"
                        >
                          🗑️ ลบ
                        </button>
                        <div className="scale-90 opacity-70 hover:opacity-100 transition-opacity">
                          <RepairDocumentUploader repairId={repair.id} onUploadSuccess={fetchRepairs} />
                        </div>
                      </div>
                    ) : (
                      <RepairDocumentUploader repairId={repair.id} onUploadSuccess={fetchRepairs} />
                    )}
                  </td>
                  <td className="p-4 text-center align-top">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex flex-col gap-1 w-full min-w-[100px]">
                        <button
                          onClick={() => generateRepairPDF(repair)}
                          className="bg-slate-50 text-slate-600 hover:bg-slate-100 px-2 py-1.5 rounded text-[10px] font-bold border border-slate-200 whitespace-nowrap w-full"
                        >
                          🖨️ พิมพ์ใบซ่อม
                        </button>

                        <button
                          onClick={() => generateRepairPDFquick(repair)}
                          className="bg-slate-50 text-slate-600 hover:bg-slate-100 px-2 py-1.5 rounded text-[10px] font-bold border border-slate-200 whitespace-nowrap w-full"
                        >
                          🖨️ พิมพ์ใบซ่อมด่วน
                        </button>
                      </div>

                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal(repair)}
                          className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1.5 rounded text-[10px] font-bold border border-blue-200"
                          title="แก้ไขข้อมูล"
                        >
                          📝
                        </button>
                        <button
                          onClick={() => handleDelete(repair.id)}
                          className="bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1.5 rounded text-[10px] font-bold border border-red-200"
                          title="ลบรายการ"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={13} className="p-8 text-center text-slate-400">❌ ไม่พบข้อมูลการซ่อม</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== MOBILE CARD VIEW (shown on small screens) ===== */}
      <div className="md:hidden space-y-3">
        {currentRepairs.length > 0 ? (
          currentRepairs.map((repair, index) => (
            <div
              key={repair.id}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3"
            >
              {/* Header: Index + Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                    #{indexOfFirstItem + index + 1}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    REPAIR_STATUS.find(s => s.value === repair.status)?.color || 'bg-slate-50 text-slate-700'
                  }`}>
                    {REPAIR_STATUS.find(s => s.value === repair.status)?.label.split(' ')[1] || repair.status}
                  </span>
                </div>
                <div className="text-xs font-mono font-bold text-blue-600">
                  ฿{repair.grand_total ? repair.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">วันที่แจ้ง</span>
                  <span className="font-medium text-slate-700">{new Date(repair.repair_date).toLocaleDateString('th-TH')}</span>
                </div>
                {repair.repair_finish && (
                  <div>
                    <span className="text-[10px] text-slate-400 block">วันที่เสร็จ</span>
                    <span className="font-medium text-emerald-600">{new Date(repair.repair_finish).toLocaleDateString('th-TH')}</span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-slate-400 block">รหัสพนักงาน</span>
                  <span className="font-mono font-bold text-slate-600 uppercase">{repair.requester_emp_code || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">เลขครุภัณฑ์</span>
                  <span className="font-mono font-bold text-amber-700">{repair.item?.assets_number || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 block">ผู้แจ้งซ่อม</span>
                  <span className="font-semibold text-slate-900">{repair.requester_name || 'ไม่ระบุชื่อ'}</span>
                  <span className="text-slate-500"> | {repair.requester_dept || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 block">อุปกรณ์</span>
                  <span className="font-medium text-slate-800">{repair.item?.manual_brand || 'ไม่ระบุ'}</span>
                  <span className="text-slate-500 font-mono"> (SN: {repair.item?.manual_sn || '-'})</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 block">อาการเสีย</span>
                  <span className="text-slate-700 line-clamp-2">{repair.item?.problem_detail || '-'}</span>
                </div>
                {repair.fix_detail && (
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block">วิธีการซ่อม</span>
                    <span className="text-slate-700 line-clamp-2">{repair.fix_detail}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                {/* Document */}
                <div className="flex items-center gap-1">
                  {repair.file_url ? (
                    <>
                      <a href={repair.file_url} target="_blank" rel="noreferrer"
                        className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-2 py-1 rounded text-[10px] font-bold border border-emerald-200">
                        👁️ ดูไฟล์
                      </a>
                      <button onClick={() => handleDeleteDocument(repair)}
                        className="bg-white text-red-500 hover:bg-red-500 hover:text-white px-2 py-1 rounded text-[10px] font-bold border border-red-200 transition-all">
                        🗑️ ลบ
                      </button>
                    </>
                  ) : null}
                  <RepairDocumentUploader repairId={repair.id} onUploadSuccess={fetchRepairs} />
                </div>

                <div className="flex-1"></div>

                {/* Action Buttons */}
                <button onClick={() => generateRepairPDF(repair)}
                  className="bg-slate-50 text-slate-600 hover:bg-slate-100 px-2 py-1 rounded text-[10px] font-bold border border-slate-200">
                  🖨️ ใบซ่อม
                </button>
                <button onClick={() => generateRepairPDFquick(repair)}
                  className="bg-slate-50 text-slate-600 hover:bg-slate-100 px-2 py-1 rounded text-[10px] font-bold border border-slate-200">
                  🖨️ ด่วน
                </button>
                <button onClick={() => openModal(repair)}
                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded text-[10px] font-bold border border-blue-200">
                  📝
                </button>
                <button onClick={() => handleDelete(repair.id)}
                  className="bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded text-[10px] font-bold border border-red-200">
                  🗑️
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-xl">
            ❌ ไม่พบข้อมูลการซ่อม
          </div>
        )}
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
