'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'
import { generateRepairPDF } from '@/app/repairs/manage/generateRepairPDF'
import { generateRepairPDFquick } from '@/app/repairs/manage/generateRepairPDFquick'
import RepairDocumentUploader from './RepairDocumentUploader'
import type { Repair, SparePart } from '@/types'
import { REPAIR_STATUS_OPTIONS } from '@/types'
import { showSuccess, showError, confirmAction } from '@/utils/helpers'
import SearchInput from '@/components/ui/SearchInput'
import Modal from '@/components/ui/Modal'

export default function RepairTable() {
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [spareParts, setSpareParts] = useState<SparePart[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Filter states (Monthly Summary)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Export range states
  const [exportStartMonth, setExportStartMonth] = useState(new Date().getMonth() + 1)
  const [exportStartYear, setExportStartYear] = useState(new Date().getFullYear())
  const [exportEndMonth, setExportEndMonth] = useState(new Date().getMonth() + 1)
  const [exportEndYear, setExportEndYear] = useState(new Date().getFullYear())
  const [showExportRange, setShowExportRange] = useState(false)

  // Modal states (Editing Only)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null)

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
  const [fixDetail, setFixDetail] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [repairsRes, sparePartsRes] = await Promise.all([
        fetch('/api/repairs'),
        fetch('/api/spare-parts')
      ])
      const repairsJson = await repairsRes.json()
      const sparePartsJson = await sparePartsRes.json()
      if (repairsJson.success) {
        setRepairs(repairsJson.data || [])
      }
      if (sparePartsJson.success) {
        setSpareParts(sparePartsJson.data || [])
      }
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openModal = (repair: Repair) => {
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
    setFixDetail(repair.fix_detail || '')
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
      fix_detail: fixDetail,
      repair_item_id: editingRepair?.item?.id || null
    }

    try {
      const res = await fetch(`/api/repairs/${editingRepair!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      })

      const json = await res.json()
      if (json.success) {
        setIsModalOpen(false)
        showSuccess('อัปเดตข้อมูลสำเร็จ')
        fetchData()
      } else {
        showError('เกิดข้อผิดพลาด', json.error || 'ไม่สามารถบันทึกข้อมูลได้')
      }
    } catch (err) {
      console.error(err)
      showError('ล้มเหลว', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
  }

  const handleDelete = async (id: number) => {
    const confirmed = await confirmAction('ยืนยันการลบ?', 'คุณต้องการลบข้อมูลการแจ้งซ่อมนี้ใช่หรือไม่?')
    if (!confirmed) return

    try {
      const res = await fetch(`/api/repairs/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        showSuccess('ลบสำเร็จ')
        fetchData()
      } else {
        showError('ล้มเหลว', json.error || 'ลบข้อมูลไม่สำเร็จ')
      }
    } catch (err) {
      showError('ล้มเหลว', 'ลบข้อมูลไม่สำเร็จ')
    }
  }

  const filteredRepairs = repairs.filter((r) => {
    const searchLower = searchTerm.toLowerCase().trim()

    // ถ้ามีคำค้นหา → ค้นหาทุกเดือน (ไม่จำกัดเดือน)
    if (searchLower) {
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
    }

    // ถ้าไม่มีคำค้นหา → กรองตามเดือน/ปีที่เลือก
    const date = new Date(r.repair_date)
    return (date.getMonth() + 1) === selectedMonth && date.getFullYear() === selectedYear
  })

  // แสดงข้อมูลทั้งหมด ไม่ใช้ Pagination
  const currentRepairs = filteredRepairs
  const indexOfFirstItem = 0
  const indexOfLastItem = filteredRepairs.length

  if (loading) return <div className="p-12 text-center text-slate-400 animate-pulse">กำลังโหลดข้อมูลการซ่อม...</div>

  // คำนวณสรุปยอดรายเดือน (เฉพาะข้อมูลที่กรองตามเดือน/ปี)
  const monthlyData = repairs.filter(r => {
    const date = new Date(r.repair_date)
    return (date.getMonth() + 1) === selectedMonth && date.getFullYear() === selectedYear
  })

  const summary = {
    count: monthlyData.length,
    parts: monthlyData.reduce((sum, r) => sum + (Number(r.total_parts_cost) || 0), 0),
    partsQty: spareParts.reduce((sum, s) => sum + (Number(s.stock_quantity) || 0), 0),
    service: monthlyData.reduce((sum, r) => sum + (Number(r.service_price) || 0), 0),
    total: monthlyData.reduce((sum, r) => sum + (Number(r.grand_total) || 0), 0),
    countsByType: monthlyData.reduce((acc: Record<string, number>, r) => {
      const type = r.item?.type_item || 'ไม่ระบุประเภท'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  // ฟังก์ชันกรองข้อมูลตามช่วงเดือน
  const getDataInRange = (startMonth: number, startYear: number, endMonth: number, endYear: number) => {
    return repairs.filter(r => {
      const date = new Date(r.repair_date)
      const month = date.getMonth() + 1
      const year = date.getFullYear()
      // แปลงเป็นเลขเดือนสะสมเพื่อเปรียบเทียบ
      const startTotal = startYear * 12 + startMonth
      const endTotal = endYear * 12 + endMonth
      const currentTotal = year * 12 + month
      return currentTotal >= startTotal && currentTotal <= endTotal
    })
  }

  const exportToExcel = () => {
    try {
      // ใช้ข้อมูลตามช่วงเดือนที่เลือก
      const exportData = showExportRange
        ? getDataInRange(exportStartMonth, exportStartYear, exportEndMonth, exportEndYear)
        : monthlyData

      const detailedData = exportData.map((r, index) => ({
        'ลำดับ': index + 1,
        'วันที่แจ้งซ่อม': new Date(r.repair_date).toLocaleDateString('th-TH'),
        'วันที่เสร็จสิ้น': r.repair_finish ? new Date(r.repair_finish).toLocaleDateString('th-TH') : '-',
        'ชื่อผู้แจ้ง': r.requester_name,
        'แผนก': r.requester_dept,
        'อุปกรณ์': r.item?.manual_brand || '-',
        'เลขทรัพย์สิน': r.item?.assets_number || '-',
        'อาการเสีย': r.item?.problem_detail || '-',
        'วิธีการซ่อม': r.fix_detail || '-',
        'สถานะ': REPAIR_STATUS_OPTIONS.find(s => s.value === r.status)?.label.split(' ')[1] || r.status,
        'ค่าอะไหล่ (บาท)': r.total_parts_cost || 0,
        'ค่าบริการ (บาท)': r.service_price || 0,
        'ยอดรวมสุทธิ (บาท)': r.grand_total || 0,
        'ช่างผู้ซ่อม': r.technician_name || '-',
        'พนักงานตรวจสอบ': r.technician_name_inspect || '-',
      }))

      // คำนวณค่าใช้จ่ายแยกตามประเภทอุปกรณ์ (ใช้ exportData)
      const costByType = exportData.reduce((acc: Record<string, { count: number; parts: number; service: number; total: number }>, r) => {
        const type = r.item?.type_item || 'ไม่ระบุประเภท'
        if (!acc[type]) acc[type] = { count: 0, parts: 0, service: 0, total: 0 }
        acc[type].count++
        acc[type].parts += Number(r.total_parts_cost) || 0
        acc[type].service += Number(r.service_price) || 0
        acc[type].total += Number(r.grand_total) || 0
        return acc
      }, {} as Record<string, { count: number; parts: number; service: number; total: number }>)

      // คำนวณสรุปสำหรับข้อมูลที่ export
      const exportTotalParts = exportData.reduce((sum, r) => sum + (Number(r.total_parts_cost) || 0), 0)
      const exportTotalService = exportData.reduce((sum, r) => sum + (Number(r.service_price) || 0), 0)
      const exportTotalGrand = exportData.reduce((sum, r) => sum + (Number(r.grand_total) || 0), 0)

      const rangeLabel = showExportRange
        ? `${new Date(0, exportStartMonth - 1).toLocaleString('th-TH', { month: 'short' })} ${exportStartYear + 543} - ${new Date(0, exportEndMonth - 1).toLocaleString('th-TH', { month: 'short' })} ${exportEndYear + 543}`
        : `${new Date(0, selectedMonth - 1).toLocaleString('th-TH', { month: 'long' })} ${selectedYear + 543}`

      const summaryData = [
        { 'หัวข้อ': 'ช่วงเวลา', 'ข้อมูล': rangeLabel },
        { 'หัวข้อ': 'จำนวนงานซ่อมทั้งหมด', 'ข้อมูล': `${exportData.length} รายการ` },
        { 'หัวข้อ': 'รวมค่าอะไหล่', 'ข้อมูล': exportTotalParts.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
        { 'หัวข้อ': 'รวมค่าบริการ', 'ข้อมูล': exportTotalService.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
        { 'หัวข้อ': 'งบประมาณรวมทั้งสิ้น', 'ข้อมูล': exportTotalGrand.toLocaleString(undefined, { minimumFractionDigits: 2 }) }
      ]

      // สร้างข้อมูลค่าใช้จ่ายแยกตามประเภทอุปกรณ์
      const costByTypeData = Object.entries(costByType).map(([type, data]) => ({
        'ประเภทอุปกรณ์': type,
        'จำนวนที่ซ่อม': `${data.count} เครื่อง`,
        'รวมค่าอะไหล่': data.parts.toLocaleString(undefined, { minimumFractionDigits: 2 }),
        'รวมค่าบริการ': data.service.toLocaleString(undefined, { minimumFractionDigits: 2 }),
        'รวมทั้งสิ้น': data.total.toLocaleString(undefined, { minimumFractionDigits: 2 })
      }))

      const wb = XLSX.utils.book_new()
      const wsDetails = XLSX.utils.json_to_sheet(detailedData)
      const wsSummary = XLSX.utils.json_to_sheet(summaryData)
      const wsCostByType = XLSX.utils.json_to_sheet(costByTypeData)

      XLSX.utils.book_append_sheet(wb, wsSummary, "สรุปยอดรายเดือน")
      XLSX.utils.book_append_sheet(wb, wsCostByType, "ค่าใช้จ่ายแยกตามประเภท")
      XLSX.utils.book_append_sheet(wb, wsDetails, "รายละเอียดงานซ่อม")

      const fileName = showExportRange
        ? `รายงานการซ่อม_${exportStartMonth}-${exportStartYear + 543}_ถึง_${exportEndMonth}-${exportEndYear + 543}.xlsx`
        : `รายงานการซ่อม_${selectedMonth}_${selectedYear + 543}.xlsx`
      XLSX.writeFile(wb, fileName)

      showSuccess('ส่งออกไฟล์สำเร็จ', fileName)
    } catch (err) {
      console.error(err)
      showError('ส่งออกล้มเหลว', 'เกิดข้อผิดพลาดในการสร้างไฟล์ Excel')
    }
  }

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">Repair Management System</h3>
          <p className="text-sm text-slate-400">พบรายการแจ้งซ่อมทั้งหมด {filteredRepairs.length} รายการ</p>
        </div>
      </div>

      {/* 📊 Monthly Dashboard Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-xl text-white text-xl">📈</div>
            <div>
              <h4 className="text-xl font-bold text-slate-800">สรุปยอดการซ่อมรายเดือน</h4>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Financial & Repair Analytics</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowExportRange(!showExportRange)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border ${
                  showExportRange
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-100'
                    : 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100'
                }`}
              >
                <span>📊</span>
                {showExportRange ? 'เลือกช่วงเดือน' : 'Export to Excel'}
              </button>
              {showExportRange && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-5 z-50 min-w-[320px]">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">เลือกช่วงเดือนที่ต้องการ Export</p>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">ตั้งแต่</label>
                      <div className="flex gap-1">
                        <select value={exportStartMonth} onChange={(e) => setExportStartMonth(parseInt(e.target.value))}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none">
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('th-TH', { month: 'short' })}</option>
                          ))}
                        </select>
                        <select value={exportStartYear} onChange={(e) => setExportStartYear(parseInt(e.target.value))}
                          className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none">
                          {[2026, 2027, 2028, 2029, 2030].map(y => (<option key={y} value={y}>{y + 543}</option>))}
                        </select>
                      </div>
                    </div>
                    <span className="text-slate-300 text-lg mt-6">→</span>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">ถึง</label>
                      <div className="flex gap-1">
                        <select value={exportEndMonth} onChange={(e) => setExportEndMonth(parseInt(e.target.value))}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none">
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('th-TH', { month: 'short' })}</option>
                          ))}
                        </select>
                        <select value={exportEndYear} onChange={(e) => setExportEndYear(parseInt(e.target.value))}
                          className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none">
                          {[2026, 2027, 2028, 2029, 2030].map(y => (<option key={y} value={y}>{y + 543}</option>))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowExportRange(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs transition-colors">
                      ยกเลิก
                    </button>
                    <button onClick={() => { exportToExcel(); setShowExportRange(false) }}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-sm">
                      📊 Export ช่วงนี้
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
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
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
            >
              {[2026, 2027, 2028, 2029, 2030].map(y => (
                <option key={y} value={y}>{y + 543}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">จำนวนงานซ่อม</p>
            <p className="text-3xl font-black text-slate-800">{summary.count} <span className="text-sm font-medium text-slate-400">รายการ</span></p>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">ค่าอะไหล่รวม</p>
            <p className="text-3xl font-black text-emerald-600">฿{summary.parts.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">จำนวนอะไหล่รวม</p>
            <p className="text-3xl font-black text-amber-600">{summary.partsQty} <span className="text-sm font-medium text-slate-400">ชิ้น</span></p>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">ค่าบริการรวม</p>
            <p className="text-3xl font-black text-blue-600">฿{summary.service.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-blue-600 p-6 rounded-2xl shadow-lg shadow-blue-100 col-span-1 sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-bold text-blue-100 uppercase mb-2">งบประมาณรวมทั้งสิ้น</p>
            <p className="text-3xl font-black text-white">฿{summary.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* 📋 จำแนกตามประเภท (Unit Breakdown) */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-widest">จำแนกตามประเภทอุปกรณ์ (ยอดรวมรายเดือน)</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(summary.countsByType).map(([type, count]) => (
              <div key={type} className="bg-white border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
                <span className="text-sm font-bold text-slate-700">{type}</span>
                <span className="h-5 w-px bg-slate-200"></span>
                <span className="text-sm font-black text-blue-600">{count} <span className="text-xs font-medium text-slate-400">เครื่อง</span></span>
              </div>
            ))}
            {Object.keys(summary.countsByType).length === 0 && (
              <p className="text-sm text-slate-400 italic">ไม่มีข้อมูลการซ่อมในเดือนนี้</p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <SearchInput
          value={searchTerm}
          onChange={(value) => {
            setSearchTerm(value)
          }}
          placeholder="ค้นหาด้วย ชื่อ, รหัสพนักงาน, ครุภัณฑ์, สัญญา, อุปกรณ์..."
        />
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
        <table className="w-full text-left border-collapse min-w-[2400px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase font-bold tracking-wider">
              <th className="p-5 w-20 text-center">ลำดับ</th>
              <th className="p-5">วันที่แจ้ง/เสร็จสิ้น</th>
              <th className="p-5">รหัสพนักงาน</th>
              <th className="p-5">ผู้แจ้งซ่อม</th>
              <th className="p-5">เลขทรัพย์สิน</th>
              <th className="p-5">เลขที่สัญญา</th>
              <th className="p-5">ประเภท</th>
              <th className="p-5">อุปกรณ์ / S/N</th>
              <th className="p-5">อาการเสีย</th>
              <th className="p-5 ">วิธีการซ่อม</th>
              <th className="p-5 text-center">สถานะ</th>
              <th className="p-5 text-right">ยอดรวม (บาท)</th>
              <th className="p-5 text-center">เอกสาร</th>
              <th className="p-5 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {currentRepairs.length > 0 ? (
              currentRepairs.map((repair, index) => (
                <tr key={repair.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-5 text-center text-slate-400 font-mono text-sm align-top">{indexOfFirstItem + index + 1}</td>
                  <td className="p-5 align-top">
                    <div className="text-sm text-slate-500">📥 {new Date(repair.repair_date).toLocaleDateString('th-TH')}</div>
                    {repair.repair_finish && (
                      <div className="text-sm text-emerald-600 font-bold mt-1">✅ {new Date(repair.repair_finish).toLocaleDateString('th-TH')}</div>
                    )}
                  </td>
                  <td className="p-5 font-mono text-sm text-slate-600 font-bold uppercase align-top">
                    {repair.requester_emp_code || '-'}
                  </td>
                  <td className="p-5 align-top">
                    <div className="font-semibold text-slate-900">{repair.requester_name || 'ไม่ระบุชื่อ'}</div>
                    <div className="text-xs text-slate-500">{repair.requester_position || '-'} | {repair.requester_dept || '-'}</div>
                    <div className="text-xs text-blue-600 font-mono">{repair.requester_phone || '-'}</div>
                  </td>
                  <td className="p-5 font-mono text-sm text-amber-700 font-bold align-top">
                    {repair.item?.assets_number || '-'}
                  </td>
                  <td className="p-5 font-mono text-sm text-blue-700 font-bold align-top">
                    {repair.item?.manual_contract || '-'}
                  </td>
                  <td className="p-5 text-sm font-semibold text-slate-600 uppercase align-top">
                    {repair.item?.type_item || '-'}
                  </td>
                  <td className="p-5 align-top">
                    <div className="font-medium text-slate-800">{repair.item?.manual_brand || 'ไม่ระบุ'}</div>
                    <div className="text-xs text-slate-500 font-mono">SN: {repair.item?.manual_sn || '-'}</div>
                  </td>
                  <td className="p-5 text-slate-700 min-w-[200px] max-w-sm whitespace-normal break-words align-top">{repair.item?.problem_detail || '-'}</td>
                  <td className="p-5 text-slate-700 min-w-[200px] max-w-sm whitespace-normal break-words align-top">{repair.fix_detail || '-'}</td>
                  <td className="p-5 text-center align-top">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border whitespace-nowrap ${
                      REPAIR_STATUS_OPTIONS.find(s => s.value === repair.status)?.color || 'bg-slate-50 text-slate-700'
                    }`}>
                      {REPAIR_STATUS_OPTIONS.find(s => s.value === repair.status)?.label.split(' ')[1] || repair.status}
                    </span>
                  </td>
                  <td className="p-5 text-right font-mono font-bold text-blue-600 align-top text-sm">
                    {repair.grand_total ? repair.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </td>
                  <td className="p-5 text-center align-top">
                    {repair.file_url ? (
                      <div className="flex flex-col items-center gap-1">
                        <a
                          href={repair.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded text-xs font-bold border border-emerald-200 w-full"
                        >
                          👁️ ดูไฟล์
                        </a>
                        <div className="scale-90 opacity-70 hover:opacity-100 transition-opacity">
                          <RepairDocumentUploader repairId={repair.id} onUploadSuccess={fetchData} />
                        </div>
                      </div>
                    ) : (
                      <RepairDocumentUploader repairId={repair.id} onUploadSuccess={fetchData} />
                    )}
                  </td>
                  <td className="p-5 text-center align-top">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex flex-col gap-1 w-full min-w-[120px]">
                        <button
                          onClick={() => generateRepairPDF(repair as any)}
                          className="bg-slate-50 text-slate-600 hover:bg-slate-100 px-3 py-2 rounded text-xs font-bold border border-slate-200 whitespace-nowrap w-full"
                        >
                          🖨️ พิมพ์ใบซ่อมทำเสนอ
                        </button>

                        <button
                          onClick={() => generateRepairPDFquick(repair as any)}
                          className="bg-slate-50 text-slate-600 hover:bg-slate-100 px-3 py-2 rounded text-xs font-bold border border-slate-200 whitespace-nowrap w-full"
                        >
                          🖨️ พิมพ์ใบซ่อมด่วน
                        </button>
                      </div>

                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal(repair)}
                          className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded text-xs font-bold border border-blue-200"
                          title="แก้ไขข้อมูล"
                        >
                          📝
                        </button>
                        <button
                          onClick={() => handleDelete(repair.id)}
                          className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded text-xs font-bold border border-red-200"
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

      {/* Modal สำหรับการแก้ไข (Edit Only) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="📝 แก้ไขข้อมูลการซ่อม"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">สถานะการซ่อม</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 text-slate-800">
              {REPAIR_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
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
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">เลขทรัพย์สิน</label>
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

          <div className="border-t border-slate-100 pt-4">
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">วิธีการซ่อม (แก้ไข)</label>
            <textarea
              value={fixDetail}
              onChange={(e) => setFixDetail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 text-slate-800"
              rows={3}
              placeholder="ระบุวิธีการซ่อม..."
            />
          </div>

          <div className="flex space-x-3 pt-4 border-t sticky bottom-0 bg-white shrink-0">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 rounded-xl text-sm transition-colors">ยกเลิก</button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl text-sm shadow-sm transition-colors">บันทึกการแก้ไข</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
