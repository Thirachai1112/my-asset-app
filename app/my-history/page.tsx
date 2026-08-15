'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import {
  ArrowLeft,
  Package,
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  User,
  Phone,
  Building,
  FileText,
  Search,
  ExternalLink,
  ChevronRight,
  RefreshCw
} from 'lucide-react'

// --- Color Palette (White-Purple Theme) ---
const COLORS = {
  primary: "#7c3aed",
  primaryLight: "rgba(124,58,237,0.08)",
  primaryBorder: "rgba(124,58,237,0.15)",
  bg: "#f8f7ff",
  card: "#ffffff",
  cardBorder: "rgba(124,58,237,0.12)",
  text: "#2d2b3a",
  muted: "#6b6580",
  green: "#10b981",
  red: "#ef4444",
  blue: "#3b82f6",
  amber: "#f59e0b",
}

export default function MyHistoryPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'borrows' | 'repairs'>('borrows')

  // History State
  const [borrows, setBorrows] = useState<any[]>([])
  const [repairs, setRepairs] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const storedProfile = localStorage.getItem('user_profile')
    if (!storedProfile) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเข้าสู่ระบบ',
        text: 'กรุณาเข้าสู่ระบบเพื่อดูประวัติของท่าน',
        confirmButtonColor: COLORS.primary
      }).then(() => {
        router.push('/login')
      })
      return
    }

    const parsedProfile = JSON.parse(storedProfile)
    setProfile(parsedProfile)

    const fetchData = async () => {
      try {
        setLoading(true)
        // Fetch borrows matching user_id or borrower_name
        let borrowsUrl = `/api/borrows/history`
        if (parsedProfile.id) {
          borrowsUrl += `?user_id=${parsedProfile.id}`
        } else if (parsedProfile.full_name) {
          borrowsUrl += `?borrower_name=${encodeURIComponent(parsedProfile.full_name)}`
        }

        // Fetch repairs matching emp_code
        let repairsUrl = `/api/repairs`
        if (parsedProfile.emp_code) {
          repairsUrl += `?emp_code=${parsedProfile.emp_code}`
        }

        const [borrowsRes, repairsRes] = await Promise.all([
          fetch(borrowsUrl),
          fetch(repairsUrl)
        ])

        const borrowsData = await borrowsRes.json()
        const repairsData = await repairsRes.json()

        if (borrowsData.success) {
          setBorrows(borrowsData.history || [])
        }
        if (repairsData.success) {
          setRepairs(repairsData.data || [])
        }
      } catch (err) {
        console.error('Error fetching user history:', err)
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถโหลดข้อมูลประวัติได้'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const getBorrowStatus = (borrow: any) => {
    if (borrow.return_date) {
      return { label: 'คืนแล้ว', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 }
    }

    if (borrow.due_date) {
      const due = new Date(borrow.due_date)
      due.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (due < today) {
        return { label: 'เลยกำหนดส่ง', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertTriangle }
      }
    }

    return { label: 'กำลังยืม', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock }
  }

  const getRepairStatus = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'เสร็จสิ้น':
        return { label: 'เสร็จสิ้น', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 }
      case 'in progress':
      case 'กำลังดำเนินการ':
      case 'กำลังซ่อม':
        return { label: 'กำลังซ่อม', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock }
      default:
        return { label: 'รอดำเนินการ', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle }
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Filter items
  const filteredBorrows = borrows.filter(b => {
    const assetName = b.assets?.name?.toLowerCase() || ''
    const assetCode = b.assets?.asset_code?.toLowerCase() || ''
    const purpose = b.purpose?.toLowerCase() || ''
    const search = searchTerm.toLowerCase()
    return assetName.includes(search) || assetCode.includes(search) || purpose.includes(search)
  })

  const filteredRepairs = repairs.filter(r => {
    const problem = r.problem_detail?.toLowerCase() || ''
    const brand = r.manual_brand?.toLowerCase() || ''
    const search = searchTerm.toLowerCase()
    return problem.includes(search) || brand.includes(search)
  })

  if (loading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f7ff]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full mx-auto animate-spin border-3 border-purple-200 border-t-purple-600" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">กำลังโหลดข้อมูลประวัติของคุณ...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen pb-12" style={{ background: COLORS.bg, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header Banner */}
      <div className="w-full text-white py-12 px-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)' }}>
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl">
              👤
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">ประวัติและสถานะการทำรายการ</h1>
              <p className="text-white/80 text-sm mt-1">
                {profile?.full_name || "ผู้ใช้งาน"} {profile?.department || " "}
              </p>
            </div>
          </div>
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-sm font-medium border border-white/20">
            <ArrowLeft size={16} />
            กลับหน้าหลัก
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-8">

        {/* Statistics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-[rgba(124,58,237,0.12)]">
            <p className="text-xs text-slate-500 font-medium mb-1">รายการยืมทั้งหมด</p>
            <p className="text-2xl font-bold text-slate-800">{borrows.length} <span className="text-xs font-normal text-slate-400">รายการ</span></p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[rgba(124,58,237,0.12)]">
            <p className="text-xs text-slate-500 font-medium mb-1">กำลังยืมอยู่</p>
            <p className="text-2xl font-bold text-violet-600">
              {borrows.filter(b => !b.return_date).length} <span className="text-xs font-normal text-slate-400">รายการ</span>
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[rgba(124,58,237,0.12)]">
            <p className="text-xs text-slate-500 font-medium mb-1">แจ้งซ่อมทั้งหมด</p>
            <p className="text-2xl font-bold text-slate-800">{repairs.length} <span className="text-xs font-normal text-slate-400">รายการ</span></p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[rgba(124,58,237,0.12)]">
            <p className="text-xs text-slate-500 font-medium mb-1">กำลังดำเนินการซ่อม</p>
            <p className="text-2xl font-bold text-blue-600">
              {repairs.filter(r => r.status === 'In Progress').length} <span className="text-xs font-normal text-slate-400">รายการ</span>
            </p>
          </div>
        </div>

        {/* Tab Controls & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
            <button
              onClick={() => { setActiveTab('borrows'); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'borrows'
                ? 'bg-white shadow-sm text-violet-700'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Package size={16} />
              รายการยืมอุปกรณ์ ({borrows.length})
            </button>
            <button
              onClick={() => { setActiveTab('repairs'); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'repairs'
                ? 'bg-white shadow-sm text-violet-700'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Wrench size={16} />
              รายการแจ้งซ่อม ({repairs.length})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={activeTab === 'borrows' ? "ค้นหาครุภัณฑ์, หมายเลขครุภัณฑ์, วัตถุประสงค์..." : "ค้นหาอาการเสีย, ยี่ห้อ..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-700"
            />
          </div>
        </div>

        {/* List Content */}
        {activeTab === 'borrows' ? (
          <div className="space-y-4">
            {filteredBorrows.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[rgba(124,58,237,0.12)] p-12 text-center">
                <span className="text-4xl block mb-3">📦</span>
                <p className="text-slate-800 font-bold text-lg">ไม่พบประวัติการยืมอุปกรณ์</p>
                <p className="text-slate-500 text-sm mt-1">ท่านยังไม่ได้ยืมอุปกรณ์ใดๆ ในระบบ หรือข้อมูลไม่ตรงกับการค้นหา</p>
              </div>
            ) : (
              filteredBorrows.map((borrow) => {
                const status = getBorrowStatus(borrow)
                const StatusIcon = status.icon

                return (
                  <div
                    key={borrow.id}
                    className="bg-white rounded-2xl border border-[rgba(124,58,237,0.12)] p-5 hover:shadow-lg hover:border-purple-500/20 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-xl shrink-0 mt-1">
                        💻
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-base">{borrow.assets?.name || 'อุปกรณ์ไม่มีชื่อ'}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">S/N: {borrow.assets?.serial_number || '-'}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-3">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar size={14} className="text-slate-400" />
                            <span>วันที่ยืม: {formatDate(borrow.borrow_date)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar size={14} className="text-slate-400" />
                            <span>กำหนดคืน: {formatDate(borrow.due_date)}</span>
                          </div>
                          {borrow.return_date && (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 sm:col-span-2">
                              <CheckCircle2 size={14} />
                              <span>คืนแล้วเมื่อ: {formatDate(borrow.return_date)}</span>
                            </div>
                          )}
                        </div>

                        {borrow.purpose && (
                          <div className="mt-2 text-xs text-slate-600 bg-slate-50 py-1 px-2.5 rounded-lg border border-slate-100 w-fit">
                            วัตถุประสงค์: {borrow.purpose}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t border-slate-100 pt-4 md:border-t-0 md:pt-0">
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${status.color}`}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      </div>
                      {borrow.file_url && (
                        <a
                          href={borrow.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all border border-slate-100"
                          title="ดูเอกสาร"
                        >
                          <FileText size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRepairs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[rgba(124,58,237,0.12)] p-12 text-center">
                <span className="text-4xl block mb-3">🔧</span>
                <p className="text-slate-800 font-bold text-lg">ไม่พบประวัติการแจ้งซ่อม</p>
                <p className="text-slate-500 text-sm mt-1">ท่านยังไม่มีรายการแจ้งซ่อมใดๆ ในระบบ หรือข้อมูลไม่ตรงกับการค้นหา</p>
              </div>
            ) : (
              filteredRepairs.map((repair) => {
                const status = getRepairStatus(repair.status)
                const StatusIcon = status.icon

                return (
                  <div
                    key={repair.id}
                    className="bg-white rounded-2xl border border-[rgba(124,58,237,0.12)] p-5 hover:shadow-lg hover:border-purple-500/20 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-xl shrink-0 mt-1">
                        🛠️
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-base">{repair.item?.manual_brand || 'ระบุยี่ห้อ: ' + (repair.manual_brand || '-')}</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          <span className="font-semibold text-slate-700">อาการเสีย: </span>{repair.problem_detail || repair.item?.problem_detail || '-'}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-3">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar size={14} className="text-slate-400" />
                            <span>วันที่แจ้งซ่อม: {formatDate(repair.repair_date)}</span>
                          </div>
                          {repair.repair_finish && (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                              <CheckCircle2 size={14} />
                              <span>ซ่อมเสร็จเมื่อ: {formatDate(repair.repair_finish)}</span>
                            </div>
                          )}
                          {repair.technician_name_inspect && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 sm:col-span-2">
                              <User size={14} className="text-slate-400" />
                              <span>ช่างผู้ดูแล: {repair.technician_name_inspect} ({repair.technician_position_inspect || 'เจ้าหน้าที่ไอที'})</span>
                            </div>
                          )}
                        </div>

                        {repair.fix_detail && (
                          <div className="mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 max-w-xl">
                            <span className="font-semibold text-slate-800 block mb-0.5">บันทึกการซ่อมจากช่าง:</span>
                            {repair.fix_detail}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t border-slate-100 pt-4 md:border-t-0 md:pt-0">
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${status.color}`}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      </div>
                      {repair.file_url && (
                        <a
                          href={repair.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all border border-slate-100"
                          title="ดูใบแจ้งซ่อม"
                        >
                          <FileText size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

      </div>
    </main>
  )
}
