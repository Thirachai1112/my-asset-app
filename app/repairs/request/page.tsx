'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Swal from 'sweetalert2'

export default function NewRepairPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Form states
  const [requesterName, setRequesterName] = useState('')
  const [requesterDept, setRequesterDept] = useState('')
  const [requesterPhone, setRequesterPhone] = useState('')
  const [requesterPosition, setRequesterPosition] = useState('')
  const [requesterEmpCode, setRequesterEmpCode] = useState('')

  const [problemDetail, setProblemDetail] = useState('')
  const [manualBrand, setManualBrand] = useState('')
  const [manualSN, setManualSN] = useState('')
  const [assetsNumber, setAssetsNumber] = useState('')
  const [manualContract, setManualContract] = useState('')
  const [typeItem, setTypeItem] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!problemDetail.trim() || !manualBrand.trim()) {
      Swal.fire({ icon: 'warning', title: 'คำเตือน', text: 'กรุณากรอกชื่ออุปกรณ์และอาการเสีย' })
      return
    }

    setLoading(true)
    const bodyData = {
      requester_name: requesterName,
      requester_dept: requesterDept,
      requester_phone: requesterPhone,
      requester_position: requesterPosition,
      requester_emp_code: requesterEmpCode,
      problem_detail: problemDetail,
      manual_brand: manualBrand,
      manual_sn: manualSN || null,
      assets_number: assetsNumber || null,
      manual_contract: manualContract || null,
      type_item: typeItem || null
    }

    try {
      const res = await fetch('/api/repairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      })

      const json = await res.json()
      if (json.success) {
        Swal.fire({
          icon: 'success',
          title: 'แจ้งซ่อมสำเร็จ!',
          text: 'ระบบได้รับข้อมูลการแจ้งซ่อมเรียบร้อยแล้ว',
          timer: 2000,
          showConfirmButton: false
        }).then(() => {
          router.push('/') // ไปหน้ารายการแจ้งซ่อม
        })
      } else {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: json.error || 'ไม่สามารถบันทึกข้อมูลได้' })
      }
    } catch (err) {
      console.error(err)
      Swal.fire({ icon: 'error', title: 'ล้มเหลว', text: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 text-slate-800">
      <div className="max-w-3xl mx-auto">
        
        {/* Navigation */}
        <div className="mb-8 flex items-center justify-end">
          <Link href="/" className="text-sm bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors shadow-sm font-medium flex items-center gap-2">
            🏠 <span>กลับหน้าหลัก Portal</span>
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 mb-8 flex items-center gap-6">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl border border-amber-200 shadow-inner">
            🔧
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">แจ้งซ่อมอุปกรณ์ใหม่</h1>
            <p className="text-slate-500 text-sm mt-1">กรุณากรอกข้อมูลผู้แจ้งและรายละเอียดอุปกรณ์ที่มีปัญหา</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            
            {/* ข้อมูลผู้แจ้ง */}
            <section>
              <h5 className="text-sm font-bold text-blue-600 mb-4 flex items-center gap-2">
                <span className="bg-blue-100 p-1.5 rounded-lg text-xs">👤</span> ข้อมูลผู้แจ้งซ่อม
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 ml-1">ชื่อผู้แจ้งซ่อม <span className="text-red-500">*</span></label>
                  <input type="text" value={requesterName} onChange={(e) => setRequesterName(e.target.value)} placeholder="ระบุชื่อ-นามสกุล" className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition-all outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 ml-1">รหัสพนักงาน</label>
                  <input type="text" value={requesterEmpCode} onChange={(e) => setRequesterEmpCode(e.target.value)} placeholder="เช่น EMP001" className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 ml-1">ตำแหน่งงาน</label>
                  <input type="text" value={requesterPosition} onChange={(e) => setRequesterPosition(e.target.value)} placeholder="เช่น เจ้าหน้าที่ไอที" className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 ml-1">แผนก /กอง/ ฝ่าย</label>
                  <input type="text" value={requesterDept} onChange={(e) => setRequesterDept(e.target.value)} placeholder="เช่น ไอที, บัญชี" className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 ml-1">เบอร์โทรศัพท์ติดต่อ</label>
                  <input type="text" value={requesterPhone} onChange={(e) => setRequesterPhone(e.target.value)} placeholder="ระบุเบอร์โทร" className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition-all outline-none" />
                </div>
              </div>
            </section>

            {/* ข้อมูลอุปกรณ์ */}
            <section>
              <h5 className="text-sm font-bold text-amber-600 mb-4 flex items-center gap-2">
                <span className="bg-amber-100 p-1.5 rounded-lg text-xs">📦</span> ข้อมูลอุปกรณ์ที่มีปัญหา
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 ml-1">ประเภทอุปกรณ์</label>
                  <input type="text" value={typeItem} onChange={(e) => setTypeItem(e.target.value)} placeholder="เช่น Notebook, Printer" className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 ml-1">ชื่ออุปกรณ์ / ยี่ห้อ / รุ่น <span className="text-red-500">*</span></label>
                  <input type="text" value={manualBrand} onChange={(e) => setManualBrand(e.target.value)} placeholder="เช่น Laptop Dell Latitude 5420" className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition-all outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 ml-1">Serial Number (S/N)</label>
                  <input type="text" value={manualSN} onChange={(e) => setManualSN(e.target.value)} placeholder="ระบุเลขซีเรียล" className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition-all outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 ml-1">เลขครุภัณฑ์ (Asset Number)</label>
                  <input type="text" value={assetsNumber} onChange={(e) => setAssetsNumber(e.target.value)} placeholder="เช่น 7440-001-0001" className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition-all outline-none font-mono" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 ml-1">เลขสัญญา</label>
                  <input type="text" value={manualContract} onChange={(e) => setManualContract(e.target.value)} placeholder="ระบุเลขที่อ้างอิง" className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition-all outline-none font-mono" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 ml-1">อาการเสีย / รายละเอียดงานซ่อม <span className="text-red-500">*</span></label>
                  <textarea value={problemDetail} onChange={(e) => setProblemDetail(e.target.value)} placeholder="กรุณาระบุอาการที่พบ หรือสิ่งที่ต้องการให้แก้ไข..." className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition-all outline-none" rows={4} required />
                </div>
              </div>
            </section>

            {/* Buttons */}
            <div className="flex gap-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-2xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-2xl shadow-lg shadow-slate-200 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
              >
                {loading ? 'กำลังบันทึกข้อมูล...' : '🚀 ยืนยันการแจ้งซ่อม'}
              </button>
            </div>

          </form>
        </div>

        {/* Footer Note */}
        <p className="mt-8 text-center text-slate-400 text-xs leading-relaxed">
          หากพบปัญหาในการใช้งานระบบ กรุณาติดต่อแผนกไอที <br />
          หรือโทรสายด่วน 064-9265-374 ต่อ 10366
        </p>

      </div>
    </main>
  )
}
