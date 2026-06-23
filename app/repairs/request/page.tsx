'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Swal from 'sweetalert2'

const COLORS = {
    primary: "#7c3aed",
    primaryLight: "rgba(124,58,237,0.10)",
    primaryBorder: "rgba(124,58,237,0.15)",
    bg: "#f8f7ff",
    card: "#ffffff",
    cardBorder: "rgba(124,58,237,0.12)",
    text: "#2d2b3a",
    muted: "#6b6580",
    green: "#10b981",
    red: "#ef4444",
    blue: "#3b82f6",
    purple: "#7c3aed",
    indigo: "#6366F1",
    amber: "#f59e0b",
    emerald: "#10b981",
};

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
          router.push('/')
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
    <main
      className="min-h-screen p-4 md:p-8"
      style={{ background: COLORS.bg, fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="max-w-3xl mx-auto">
        {/* ===== HEADER ===== */}
        <div
          className="rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)",
            border: `1px solid ${COLORS.primaryBorder}`,
          }}
        >
          <div
            className="absolute -top-16 -right-16 w-64 h-64 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
            }}
          />
          <div className="flex flex-col md:flex-row md:items-center md:justify-between relative">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: "rgba(255,255,255,0.12)" }}
              >
                🔧
              </div>
              <div>
                <h1
                  className="text-2xl md:text-3xl font-bold text-white"
                  style={{ fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }}
                >
                  แจ้งซ่อมอุปกรณ์ใหม่
                </h1>
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>
                  กรุณากรอกข้อมูลผู้แจ้งและรายละเอียดอุปกรณ์ที่มีปัญหา
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="mt-4 md:mt-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#FFFFFF",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              ← กลับหน้าหลัก
            </Link>
          </div>
        </div>

        {/* Form Card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}
        >
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
            
            {/* ข้อมูลผู้แจ้ง */}
            <section>
              <h5
                className="text-sm font-bold mb-4 flex items-center gap-2"
                style={{ color: COLORS.blue }}
              >
                <span
                  className="p-1.5 rounded-lg text-xs"
                  style={{ background: COLORS.primaryLight }}
                >
                  👤
                </span>
                ข้อมูลผู้แจ้งซ่อม
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>
                    ชื่อผู้แจ้งซ่อม <span style={{ color: COLORS.red }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder="ระบุชื่อ-นามสกุล"
                    className="w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                    style={{
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.primaryBorder}`,
                      color: COLORS.text,
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>
                    รหัสพนักงาน
                  </label>
                  <input
                    type="text"
                    value={requesterEmpCode}
                    onChange={(e) => setRequesterEmpCode(e.target.value)}
                    placeholder="เช่น EMP001"
                    className="w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                    style={{
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.primaryBorder}`,
                      color: COLORS.text,
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>
                    ตำแหน่งงาน
                  </label>
                  <input
                    type="text"
                    value={requesterPosition}
                    onChange={(e) => setRequesterPosition(e.target.value)}
                    placeholder="เช่น เจ้าหน้าที่ไอที"
                    className="w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                    style={{
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.primaryBorder}`,
                      color: COLORS.text,
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>
                    แผนก / กอง / ฝ่าย
                  </label>
                  <input
                    type="text"
                    value={requesterDept}
                    onChange={(e) => setRequesterDept(e.target.value)}
                    placeholder="เช่น ไอที, บัญชี"
                    className="w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                    style={{
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.primaryBorder}`,
                      color: COLORS.text,
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <input
                    type="text"
                    value={requesterPhone}
                    onChange={(e) => setRequesterPhone(e.target.value)}
                    placeholder="ระบุเบอร์โทร"
                    className="w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                    style={{
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.primaryBorder}`,
                      color: COLORS.text,
                    }}
                  />
                </div>
              </div>
            </section>

            {/* ข้อมูลอุปกรณ์ */}
            <section>
              <h5
                className="text-sm font-bold mb-4 flex items-center gap-2"
                style={{ color: COLORS.amber }}
              >
                <span
                  className="p-1.5 rounded-lg text-xs"
                  style={{ background: COLORS.primaryLight }}
                >
                  📦
                </span>
                ข้อมูลอุปกรณ์ที่มีปัญหา
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>
                    ประเภทอุปกรณ์
                  </label>
                  <input
                    type="text"
                    value={typeItem}
                    onChange={(e) => setTypeItem(e.target.value)}
                    placeholder="เช่น Notebook, Printer"
                    className="w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                    style={{
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.primaryBorder}`,
                      color: COLORS.text,
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>
                    ชื่ออุปกรณ์ / ยี่ห้อ / รุ่น <span style={{ color: COLORS.red }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={manualBrand}
                    onChange={(e) => setManualBrand(e.target.value)}
                    placeholder="เช่น Laptop Dell Latitude 5420"
                    className="w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                    style={{
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.primaryBorder}`,
                      color: COLORS.text,
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>
                    Serial Number (S/N)
                  </label>
                  <input
                    type="text"
                    value={manualSN}
                    onChange={(e) => setManualSN(e.target.value)}
                    placeholder="ระบุเลขซีเรียล"
                    className="w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none font-mono"
                    style={{
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.primaryBorder}`,
                      color: COLORS.text,
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>
                    เลขทรัพย์สิน (Asset Number)
                  </label>
                  <input
                    type="text"
                    value={assetsNumber}
                    onChange={(e) => setAssetsNumber(e.target.value)}
                    placeholder="เช่น 7440-001-0001"
                    className="w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none font-mono"
                    style={{
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.primaryBorder}`,
                      color: COLORS.text,
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>
                    เลขสัญญา
                  </label>
                  <input
                    type="text"
                    value={manualContract}
                    onChange={(e) => setManualContract(e.target.value)}
                    placeholder="ระบุเลขที่อ้างอิง"
                    className="w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none font-mono"
                    style={{
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.primaryBorder}`,
                      color: COLORS.text,
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>
                    อาการเสีย / รายละเอียดงานซ่อม <span style={{ color: COLORS.red }}>*</span>
                  </label>
                  <textarea
                    value={problemDetail}
                    onChange={(e) => setProblemDetail(e.target.value)}
                    placeholder="กรุณาระบุอาการที่พบ หรือสิ่งที่ต้องการให้แก้ไข..."
                    className="w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                    style={{
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.primaryBorder}`,
                      color: COLORS.text,
                    }}
                    rows={4}
                    required
                  />
                </div>
              </div>
            </section>

            {/* Buttons */}
            <div className="flex gap-4 pt-4" style={{ borderTop: `1px solid ${COLORS.primaryBorder}` }}>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 font-bold py-3 rounded-2xl transition-colors text-sm"
                style={{
                  background: COLORS.bg,
                  color: COLORS.muted,
                  border: `1px solid ${COLORS.primaryBorder}`,
                }}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 font-bold py-3 rounded-2xl transition-all text-sm"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.primary}, #6D28D9)`,
                  color: "#FFFFFF",
                  boxShadow: `0 8px 25px rgba(139,92,246,0.3)`,
                  opacity: loading ? 0.5 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'กำลังบันทึกข้อมูล...' : '🚀 ยืนยันการแจ้งซ่อม'}
              </button>
            </div>

          </form>
        </div>

        {/* Footer Note */}
        <p className="mt-8 text-center text-xs leading-relaxed" style={{ color: COLORS.muted }}>
          หากพบปัญหาในการใช้งานระบบ กรุณาติดต่อแผนกไอที <br />
          หรือโทรสายด่วน 064-9265-374 ต่อ 10366
        </p>

      </div>
    </main>
  )
}
