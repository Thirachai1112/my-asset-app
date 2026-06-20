'use client'

import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import { createClient } from '@/utils/supabase/client'

const REPAIR_STATUS = [
  { value: 'Pending', label: '⏳ รอดำเนินการ', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'In Progress', label: '🛠️ กำลังซ่อม', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'Completed', label: '✅ เสร็จสิ้น', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
]

export default function RepairManageTable() {
  const supabase = createClient()
  const [repairs, setRepairs] = useState<any[]>([])
  const [parts, setParts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRepair, setEditingRepair] = useState<any | null>(null)

  // Form states for Technician
  const [status, setStatus] = useState('Pending')
  const [technicianName, setTechnicianName] = useState('')

  const [technicianId, setTechnicianId] = useState('')
  const [fixDetail, setFixDetail] = useState('')
  const [servicePrice, setServicePrice] = useState<number>(0)

  // Spare Parts Usage State: [{ part_id, quantity }]
  const [partsUsage, setPartsUsage] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([]) // เพิ่มบรรทัดนี้

  const fetchRepairs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/repairs')
      const json = await res.json()
      if (json.success) setRepairs(json.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }


  const fetchParts = async () => {
    try {
      const res = await fetch('/api/spare-parts')
      const json = await res.json()
      if (json.success) setParts(json.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const fetchUsers = async () => {
    try {
      // ใช้ supabase ที่คุณประกาศไว้ผ่าน createClient()
      const { data, error } = await supabase
        .from('users') // ตัวนี้คือ Supabase Client
        .select('id, full_name, Job_position')
        .order('full_name')

      if (error) throw error
      if (data) setUsers(data)
    } catch (err) {
      console.error('Error fetching users:', err)
    }
  }

  useEffect(() => {
    fetchRepairs()
    fetchParts()
    fetchUsers()
  }, [])

  const openManageModal = (repair: any) => {
    setEditingRepair(repair)
    setStatus(repair.status || 'Pending')
    setTechnicianName(repair.technician_name || '')
    setTechnicianId(repair.technician_id || '')
    setFixDetail(repair.fix_detail || '')
    setServicePrice(repair.service_price || 0)
    setPartsUsage([]) // รีเซ็ตรายการอะไหล่ทุกครั้งที่เปิดใหม่
    setIsModalOpen(true)
  }

  const addPartRow = () => {
    setPartsUsage([...partsUsage, { part_id: '', quantity: 1 }])
  }

  const removePartRow = (index: number) => {
    const newList = [...partsUsage]
    newList.splice(index, 1)
    setPartsUsage(newList)
  }

  const updatePartUsage = (index: number, field: string, value: any) => {
    const newList = [...partsUsage]
    newList[index][field] = value
    setPartsUsage(newList)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    // กรองเอาเฉพาะแถวที่เลือกอะไหล่จริงๆ
    const validPartsUsage = partsUsage.filter(p => p.part_id !== '')

    // 🚩 Validation: ถ้ามีการเบิกอะไหล่ ต้องเปลี่ยนสถานะเป็น 'Completed' เท่านั้น
    if (validPartsUsage.length > 0 && status !== 'Completed') {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่สามารถบันทึกได้',
        text: 'หากมีการเบิกใช้อะไหล่ กรุณาเปลี่ยนสถานะงานเป็น "เสร็จสิ้น" เพื่อตัดสต็อกและปิดงานครับ',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    const bodyData = {
      status,
      technician_name: technicianName,
      technician_id: technicianId,
      fix_detail: fixDetail,
      service_price: servicePrice,
      parts_usage: validPartsUsage,
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
        Swal.fire({ icon: 'success', title: 'อัปเดตงานซ่อมเรียบร้อย', timer: 1500, showConfirmButton: false })
        fetchRepairs()
        fetchParts() // โหลดสต็อกใหม่หลังตัดสต็อก
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด' })
    }
  }

  const filteredRepairs = repairs.filter((r) => {
    if (r.status === 'Completed') return false
    const searchLower = searchTerm.toLowerCase().trim()
    return (
      r.requester_name?.toLowerCase().includes(searchLower) ||
      r.item?.manual_brand?.toLowerCase().includes(searchLower) ||
      r.item?.assets_number?.toLowerCase().includes(searchLower)
    )
  })

  if (loading) return <div className="p-12 text-center text-slate-400">กำลังโหลดรายการงานซ่อม...</div>

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h3 className="font-bold text-slate-800">งานซ่อมที่กำลังดำเนินการ</h3>
        <div className="relative max-w-xs w-full">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อผู้แจ้ง, เลขครุภัณฑ์..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-100 rounded-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b">
              <th className="p-4">วันที่แจ้ง</th>
              <th className="p-4">ผู้แจ้ง / แผนก</th>
              <th className="p-4">อุปกรณ์ / อาการเสีย</th>
              <th className="p-4 text-center">สถานะ</th>
              <th className="p-4 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRepairs.map((repair) => (
              <tr key={repair.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                <td className="p-4 text-xs text-slate-500">
                  {new Date(repair.repair_date).toLocaleDateString('th-TH')}
                </td>
                <td className="p-4">
                  <div className="font-bold text-slate-900">{repair.requester_name}</div>
                  <div className="text-[10px] text-slate-500 uppercase">{repair.requester_dept}</div>
                </td>
                <td className="p-4">
                  <div className="font-semibold text-blue-600">{repair.item?.manual_brand}</div>
                  <div className="text-[10px] text-slate-400 font-mono italic">{repair.item?.problem_detail}</div>
                </td>
                <td className="p-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${REPAIR_STATUS.find(s => s.value === repair.status)?.color}`}>
                    {REPAIR_STATUS.find(s => s.value === repair.status)?.label.split(' ')[1] || repair.status}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => openManageModal(repair)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-sm"
                  >
                    🛠️ ดำเนินการ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
              <h4 className="font-bold flex items-center gap-2"><span>🛠️</span> บันทึกการดำเนินการซ่อม</h4>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-6 overflow-y-auto">
              {/* ข้อมูลเบื้องต้น */}
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-xs space-y-1">
                <p className="font-bold text-blue-800 mb-2">📌 รายละเอียดเบื้องต้น:</p>
                <p className="text-blue-700"><b>อุปกรณ์:</b> {editingRepair?.item?.manual_brand} </p>
                <p className="text-blue-700"><b>อาการ:</b> {editingRepair?.item?.problem_detail}</p>
              </div>

              {/* ส่วนจัดการสถานะ */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">สถานะงาน</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-blue-500 outline-none">
                    {REPAIR_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">ช่างผู้รับผิดชอบ</label>
                  <input type="text" value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} placeholder="ระบุชื่อช่าง" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-blue-500 outline-none" required />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    พนักงานผู้ตรวจสอบ
                  </label>
                  <select
                    value={technicianId}
                    onChange={(e) => setTechnicianId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-blue-500 outline-none"
                    required
                  >
                    <option value="">-- เลือกชื่อพนักงานผู้ตรวจสอบ --</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.Job_position})
                      </option>
                    ))}
                  </select>
                </div>
              </div>


              {/* ส่วนของอะไหล่ */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-bold uppercase text-emerald-600 flex items-center gap-1">
                    <span>📦</span> การเบิกใช้อะไหล่
                  </label>
                  <button type="button" onClick={addPartRow} className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-1 rounded-lg font-bold hover:bg-emerald-100 transition-colors">
                    + เพิ่มอะไหล่
                  </button>
                </div>

                {partsUsage.length > 0 ? (
                  <div className="space-y-3">
                    {partsUsage.map((usage, idx) => (
                      <div key={idx} className="flex gap-2 items-center animate-in fade-in slide-in-from-left-2 duration-300">
                        <select
                          value={usage.part_id}
                          onChange={(e) => updatePartUsage(idx, 'part_id', e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-emerald-500 outline-none"
                        >
                          <option value="">-- เลือกอะไหล่ --</option>
                          {parts.map(p => (
                            <option key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>
                              {p.part_name} (คงเหลือ: {p.stock_quantity})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          value={usage.quantity}
                          onChange={(e) => updatePartUsage(idx, 'quantity', parseInt(e.target.value))}
                          className="w-16 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs text-center focus:border-emerald-500 outline-none"
                        />
                        <button type="button" onClick={() => removePartRow(idx)} className="text-red-400 hover:text-red-600 p-1">✕</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic text-center py-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">ยังไม่มีการเบิกอะไหล่</p>
                )}
              </div>

              {/* รายละเอียดการแก้ไข */}
              <div className="border-t border-slate-100 pt-5">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">รายละเอียดการแก้ไข</label>
                    <textarea
                      value={fixDetail}
                      onChange={(e) => setFixDetail(e.target.value)}
                      placeholder="ช่างทำการแก้ไขอย่างไรบ้าง..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 outline-none"
                      rows={3}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">ค่าบริการ / ค่าดำเนินการ (บาท)</label>
                    <input
                      type="number"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-blue-500 outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-2 italic">* ไม่รวมค่าอะไหล่ที่เบิกใช้</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 sticky bottom-0 bg-white shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-2xl transition-colors">ยกเลิก</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-95">บันทึกปิดงาน</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

