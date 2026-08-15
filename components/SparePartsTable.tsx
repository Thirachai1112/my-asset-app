'use client'

import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import type { SparePart } from '@/types'
import { showSuccess, showError, confirmAction } from '@/utils/helpers'
import SearchInput from '@/components/ui/SearchInput'
import Modal from '@/components/ui/Modal'

export default function SparePartsTable() {
  const [parts, setParts] = useState<SparePart[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal states (สำหรับเพิ่ม/แก้ไขอะไหล่)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPart, setEditingPart] = useState<SparePart | null>(null)

  // Modal states (สำหรับดูประวัติการใช้งานอะไหล่กับเครื่อง)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [selectedPartHistory, setSelectedPartHistory] = useState<any>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  // Form states
  const [partName, setPartName] = useState('')
  const [partBrand, setPartBrand] = useState('')
  const [partSN, setPartSN] = useState('')
  const [stockQuantity, setStockQuantity] = useState(0)
  const [unitPrice, setUnitPrice] = useState(0)
  const [dateIn, setDateIn] = useState('')
  const [dateOut, setDateOut] = useState('')

  const fetchParts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/spare-parts')
      const json = await res.json()
      if (json.success) setParts(json.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchParts()
  }, [])

  const openModal = (part: SparePart | null = null) => {
    if (part) {
      setEditingPart(part)
      setPartName(part.part_name || '')
      setPartBrand(part.part_brand || '')
      setPartSN(part.part_serial_number || '')
      setStockQuantity(part.stock_quantity || 0)
      setUnitPrice(part.unit_price || 0)
      setDateIn(part.part_date_in ? new Date(part.part_date_in).toISOString().split('T')[0] : '')
      setDateOut(part.part_date_out ? new Date(part.part_date_out).toISOString().split('T')[0] : '')
    } else {
      setEditingPart(null)
      setPartName('')
      setPartBrand('')
      setPartSN('')
      setStockQuantity(0)
      setUnitPrice(0)
      setDateIn(new Date().toISOString().split('T')[0])
      setDateOut('')
    }
    setIsModalOpen(true)
  }

  // ฟังก์ชันเปิดดูประวัติการใช้อะไหล่รายตัว
  const openHistoryModal = async (partId: number) => {
    setIsHistoryModalOpen(true)
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/spare-parts/${partId}`)
      const json = await res.json()
      if (json.success) {
        setSelectedPartHistory(json.data)
      } else {
        showError('เกิดข้อผิดพลาด', json.error || 'ไม่สามารถโหลดประวัติได้')
      }
    } catch (err) {
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const bodyData = {
      part_name: partName,
      part_brand: partBrand,
      part_serial_number: partSN,
      stock_quantity: stockQuantity,
      unit_price: unitPrice,
      part_date_in: dateIn || null,
      part_date_out: dateOut || null
    }

    try {
      const url = editingPart ? `/api/spare-parts/${editingPart.id}` : '/api/spare-parts'
      const method = editingPart ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      })

      const json = await res.json()
      if (json.success) {
        setIsModalOpen(false)
        showSuccess('บันทึกสำเร็จ')
        fetchParts()
      } else {
        showError('เกิดข้อผิดพลาด', json.error || 'ไม่สามารถบันทึกข้อมูลได้')
      }
    } catch (err) {
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
  }

  const handleDelete = async (id: number) => {
    const confirmed = await confirmAction('ยืนยันการลบ?', 'คุณต้องการลบอะไหล่ชิ้นนี้ใช่หรือไม่?')
    if (!confirmed) return

    try {
      const res = await fetch(`/api/spare-parts/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        showSuccess('ลบสำเร็จ')
        fetchParts()
      } else {
        showError('ลบไม่สำเร็จ', json.error)
      }
    } catch (err) {
      showError('ลบไม่สำเร็จ', 'เกิดข้อผิดพลาดในการเชื่อมต่อ')
    }
  }

  const filteredParts = parts.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      p.part_name.toLowerCase().includes(searchLower) ||
      p.part_brand?.toLowerCase().includes(searchLower) ||
      p.part_serial_number?.toLowerCase().includes(searchLower);

    return matchesSearch;
  });

  if (loading) return <div className="p-12 text-center text-slate-400 animate-pulse">กำลังโหลดคลังอะไหล่...</div>

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">คลังอะไหล่ (Spare Parts Stock)</h3>
          <p className="text-xs text-slate-500">จัดการรายละเอียดอะไหล่ ยี่ห้อ S/N และวันที่นำเข้า-ส่งออก</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 active:scale-95"
        >
          ➕ เพิ่มอะไหล่ใหม่
        </button>
      </div>

      <div className="mb-6">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="ค้นหาชื่ออะไหล่, ยี่ห้อ, Serial Number..."
        />
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-3xl bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
              <th className="p-4">รายการ / ยี่ห้อ</th>
              <th className="p-4">Serial Number</th>
              <th className="p-4 text-center">คงเหลือ</th>
              <th className="p-4 text-right">ราคา/หน่วย</th>
              <th className="p-4">วันที่นำเข้า</th>
              <th className="p-4 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredParts.length > 0 ? (
              filteredParts.map((part) => (
                <tr key={part.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4">
                    {/* คลิกที่ชื่ออะไหล่เพื่อดูประวัติการใช้งานกับเครื่องได้ */}
                    <button
                      onClick={() => openHistoryModal(part.id)}
                      className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors text-left hover:underline"
                    >
                      {part.part_name} 🔍
                    </button>
                    <div className="text-[10px] text-slate-400 font-medium uppercase">{part.part_brand || '-'}</div>
                  </td>
                  <td className="p-4 font-mono text-xs text-slate-500">
                    {part.part_serial_number || '-'}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border ${part.stock_quantity > 5
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-red-50 text-red-700 border-red-100'
                      }`}>
                      {part.stock_quantity} ชิ้น
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono text-xs text-slate-600 font-bold">
                    {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(part.unit_price)}
                  </td>
                  <td className="p-4 text-[10px] text-slate-500">
                    {part.part_date_in ? new Date(part.part_date_in).toLocaleDateString('th-TH') : '-'}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => openHistoryModal(part.id)} title="ดูประวัติการใช้งาน" className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">📦</button>
                      <button onClick={() => openModal(part)} title="แก้ไข" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">✏️</button>
                      <button onClick={() => handleDelete(part.id)} title="ลบ" className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-400 text-sm italic">ไม่พบข้อมูลอะไหล่ในสต็อก</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: เพิ่ม / แก้ไขอะไหล่ */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPart ? '📝 แก้ไขข้อมูลอะไหล่' : '➕ เพิ่มอะไหล่ใหม่'}
        darkHeader
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-widest">ชื่ออะไหล่ <span className="text-red-500">*</span></label>
              <input type="text" value={partName} onChange={(e) => setPartName(e.target.value)} placeholder="เช่น RAM DDR4 8GB" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none transition-all" required />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-widest">ยี่ห้อ (Brand)</label>
              <input type="text" value={partBrand} onChange={(e) => setPartBrand(e.target.value)} placeholder="เช่น Kingston, WD" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none transition-all" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-widest">Serial Number</label>
              <input type="text" value={partSN} onChange={(e) => setPartSN(e.target.value)} placeholder="ระบุ S/N" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none transition-all font-mono" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-widest">จำนวนในสต็อก</label>
              <input type="number" value={stockQuantity} onChange={(e) => setStockQuantity(parseInt(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none transition-all" required />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-widest">ราคาต่อหน่วย (บาท)</label>
              <input type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(parseFloat(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none transition-all" required />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-widest">วันที่นำเข้า</label>
              <input type="date" value={dateIn} onChange={(e) => setDateIn(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none transition-all" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-widest">วันที่ส่งออก</label>
              <input type="date" value={dateOut} onChange={(e) => setDateOut(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none transition-all" />
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-2xl transition-all">ยกเลิก</button>
            <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-emerald-100 transition-all active:scale-95">บันทึกข้อมูลอะไหล่</button>
          </div>
        </form>
      </Modal>

      {/* Modal: ดูประวัติการนำไปใช้กับเครื่อง/ครุภัณฑ์ */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="📋 ประวัติการเบิกใช้อะไหล่กับครุภัณฑ์"
        darkHeader
        maxWidth="max-w-2xl"
      >
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {historyLoading ? (
            <div className="text-center py-10 text-slate-400 animate-pulse">กำลังโหลดประวัติการใช้งาน...</div>
          ) : selectedPartHistory ? (
            <div>
              <div className="bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-100">
                <h4 className="font-bold text-slate-800 text-base">{selectedPartHistory.part_name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  ยี่ห้อ: <span className="font-semibold text-slate-700">{selectedPartHistory.part_brand || '-'}</span> |
                  Serial Number: <span className="font-mono text-slate-700">{selectedPartHistory.part_serial_number || '-'}</span>
                </p>
              </div>

              <h5 className="font-bold text-slate-700 text-sm mb-2">ประวัติการถูกนำไปใช้ซ่อมเครื่อง/ครุภัณฑ์:</h5>

              {selectedPartHistory.usage_history && selectedPartHistory.usage_history.length > 0 ? (
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold">
                        <th className="p-3">วันที่เบิก</th>
                        <th className="p-3">เลขครุภัณฑ์ (Assets)</th>
                        <th className="p-3">อาการ / รายละเอียด</th>
                        <th className="p-3 text-center">จำนวนที่ใช้</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPartHistory.usage_history.map((usage: any, idx: number) => {
                        const repairItem = usage.repairs?.repair_items?.[0] || {}
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 text-slate-500">
                              {new Date(usage.created_at).toLocaleDateString('th-TH')}
                            </td>
                            <td className="p-3 font-semibold text-emerald-600 font-mono">
                              {repairItem.assets_number || 'ไม่ระบุ'}
                            </td>
                            <td className="p-3 text-slate-700">
                              {repairItem.problem_detail || '-'}
                            </td>
                            <td className="p-3 text-center font-bold text-slate-800">
                              {usage.quantity_used} ชิ้น
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm italic">
                  ยังไม่มีประวัติการนำอะไหล่นี้ไปใช้งานกับเครื่องใดๆ
                </div>
              )}
            </div>
          ) : null}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => setIsHistoryModalOpen(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-2.5 rounded-xl transition-all"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}