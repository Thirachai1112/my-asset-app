// app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'

export default function DashboardPortal() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalAssets: 0,
    availableAssets: 0,
    borrowedAssets: 0,
    activeBorrowsCount: 0,
    overdueBorrowsCount: 0,
    activeRepairsCount: 0,
    pendingRepairsCount: 0,
    inProgressRepairsCount: 0,
    totalRepairCost: 0,
  })

  const [urgentReturns, setUrgentReturns] = useState<any[]>([])
  const [lowStockParts, setLowStockParts] = useState<any[]>([])
  const [assetTypes, setAssetTypes] = useState<{ type: string; count: number; percentage: number }[]>([])
  const [recentRepairs, setRecentRepairs] = useState<any[]>([])

  // ย้ายการสร้าง supabase client เข้ามาอยู่ใน useMemo หรือเช็คค่าก่อน
  const supabase = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    : null

  const checkUser = async () => {
    try {
      // 1. ตรวจสอบข้อมูลจาก localStorage (ระบบล็อคอินใหม่)
      const storedProfile = localStorage.getItem('user_profile')

      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile)
        setProfile(parsedProfile)
        setUser({ email: `${parsedProfile.emp_code}@pea.co.th` }) // จำลอง user object เพื่อให้ UI ทำงานต่อได้

        // 2. ถ้าเป็น Admin ให้ดึงข้อมูลสถิติ
        if (parsedProfile.role === 'admin') {
          fetchDashboardData()
        } else {
          setLoading(false)
        }
      } else if (supabase) {
        // 3. ถ้าไม่มีข้อมูลในเครื่อง และมี supabase ให้ลองเช็คจาก Supabase Auth (กรณีเดิม)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUser(user)
          const { data: dbProfile } = await supabase
            .from('users')
            .select('*')
            .eq('emp_code', user.email?.split('@')[0])
            .single()

          setProfile(dbProfile || { role: 'user' })
          if (dbProfile?.role === 'admin') {
            fetchDashboardData()
          } else {
            setLoading(false)
          }
        } else {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    } catch (err) {
      console.error('Check User Error:', err)
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      // 1. ลบข้อมูลจาก localStorage
      localStorage.removeItem('user_profile')

      // 2. ลบ Cookie ผ่าน API (สำหรับ Middleware)
      await fetch('/api/auth/logout', { method: 'POST' })

      // 3. ออกจากระบบ Supabase (กรณีที่มีค้างไว้)
      if (supabase) {
        await supabase.auth.signOut()
      }

      // 4. ดีดกลับไปหน้า Login และเคลียร์หน้าจอ
      router.push('/login')
      router.refresh()
    } catch (err) {
      console.error('Logout error:', err)
      // เผื่อกรณี API พัง ก็สั่ง Redirect อย่างเดียว
      router.push('/login')
      router.push('/')
    }
  }

  const fetchDashboardData = async () => {
    // ... existing fetchDashboardData logic ...
    try {
      const [assetsRes, borrowsRes, repairsRes, partsRes] = await Promise.all([
        fetch('/api/assets').then((r) => r.json()),
        fetch('/api/borrows/history').then((r) => r.json()),
        fetch('/api/repairs').then((r) => r.json()),
        fetch('/api/spare-parts').then((r) => r.json()),
      ])

      const assets = assetsRes.success ? (assetsRes.data || []) : []
      const totalAssets = assets.length
      const availableAssets = assets.filter((a: any) => a.status === 'Available').length
      const borrowedAssets = assets.filter((a: any) => a.status === 'Borrowed' || a.status === 'borrowed').length

      const typeCounts: Record<string, number> = {}
      assets.forEach((a: any) => {
        const type = a.type || 'Other'
        typeCounts[type] = (typeCounts[type] || 0) + 1
      })
      const sortedTypes = Object.entries(typeCounts)
        .map(([type, count]) => ({
          type,
          count,
          percentage: totalAssets > 0 ? Math.round((count / totalAssets) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      const borrows = borrowsRes.success ? (borrowsRes.history || []) : []
      const today = new Date()
      const activeBorrows = borrows.filter((b: any) => !b.return_date)
      const urgent = activeBorrows.filter((b: any) => {
        if (!b.due_date) return false
        const diffDays = (new Date(b.due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        return diffDays <= 2
      })

      const repairs = repairsRes.success ? (repairsRes.data || []) : []
      const activeRepairs = repairs.filter((r: any) => r.status === 'Pending' || r.status === 'In Progress')
      const totalRepairCost = repairs.reduce((sum: number, r: any) => sum + (Number(r.grand_total) || 0), 0)

      const parts = partsRes.success ? (partsRes.data || []) : []
      const lowStock = parts.filter((p: any) => p.stock_quantity <= 5)

      setStats({
        totalAssets,
        availableAssets,
        borrowedAssets,
        activeBorrowsCount: activeBorrows.length,
        overdueBorrowsCount: urgent.length,
        activeRepairsCount: activeRepairs.length,
        pendingRepairsCount: repairs.filter((r: any) => r.status === 'Pending').length,
        inProgressRepairsCount: repairs.filter((r: any) => r.status === 'In Progress').length,
        totalRepairCost,
      })
      setUrgentReturns(urgent)
      setLowStockParts(lowStock)
      setAssetTypes(sortedTypes)
      setRecentRepairs(repairs.slice(0, 5))
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkUser()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 text-sm font-medium animate-pulse">กำลังตรวจสอบสิทธิ์การใช้งาน...</p>
        </div>
      </main>
    )
  }

  // 1. หน้าจอสำหรับคนที่ยังไม่ได้ Login
  if (!user) {
    return (
      <main className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[2rem] flex items-center justify-center text-5xl mb-8 shadow-2xl shadow-blue-500/20">
          📦
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          Asset Management Portal
        </h1>
        <p className="text-slate-400 max-w-lg mb-10 leading-relaxed text-lg">
          ระบบบริหารจัดการครุภัณฑ์และงานแจ้งซ่อมแบบครบวงจร <br />
          กรุณาเข้าสู่ระบบเพื่อดำเนินการขอยืมอุปกรณ์ หรือแจ้งซ่อม
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Link href="/login" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-blue-500/20 transition-all text-lg">
            เข้าสู่ระบบ-จัดการ
            (Login-Admin)
          </Link>
          <Link href="/repairs/request" className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-8 rounded-2xl transition-all text-lg">
            แจ้งซ่อม (Guest)
          </Link>
        </div>
      </main>
    )
  }

  // 2. หน้าจอสำหรับ Admin (แสดง Dashboard เต็มรูปแบบ)
  if (profile?.role === 'admin') {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Admin  Dashboard
            </h1>

          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleLogout} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl text-xs font-bold transition-all">
              ออกจากระบบ 🚪
            </button>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs font-mono text-slate-300">
              🕒 {new Date().toLocaleTimeString('th-TH')}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto space-y-8">
          {/* Row 1: KPI Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
              <div className="flex justify-between mb-4"><span className="text-[10px] font-bold text-slate-500 tracking-wider">ครุภัณฑ์ทั้งหมด</span><span>📦</span></div>
              <div className="text-3xl font-black text-white">{stats.totalAssets} <span className="text-sm font-medium text-slate-500">ชิ้น</span></div>
              <div className="mt-4 flex justify-between text-xs border-t border-slate-800 pt-3">
                <span className="text-emerald-400">ว่าง: {stats.availableAssets}</span>
                <span className="text-indigo-400">ถูกยืม: {stats.borrowedAssets}</span>
              </div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
              <div className="flex justify-between mb-4"><span className="text-[10px] font-bold text-slate-500 tracking-wider">กำลังถูกยืม</span><span>🤝</span></div>
              <div className="text-3xl font-black text-white">{stats.activeBorrowsCount} <span className="text-sm font-medium text-slate-500">รายการ</span></div>
              <div className="mt-4 flex justify-between text-xs border-t border-slate-800 pt-3">
                <span className="text-slate-400">ปกติ</span>
                {stats.overdueBorrowsCount > 0 && <span className="text-red-400 font-bold animate-pulse">🚨 เลยกำหนด: {stats.overdueBorrowsCount}</span>}
              </div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
              <div className="flex justify-between mb-4"><span className="text-[10px] font-bold text-slate-500 tracking-wider">งานซ่อมปัจจุบัน</span><span>🛠️</span></div>
              <div className="text-3xl font-black text-white">{stats.activeRepairsCount} <span className="text-sm font-medium text-slate-500">เคส</span></div>
              <div className="mt-4 flex justify-between text-xs border-t border-slate-800 pt-3">
                <span className="text-amber-400">รอ: {stats.pendingRepairsCount}</span>
                <span className="text-blue-400">ซ่อม: {stats.inProgressRepairsCount}</span>
              </div>
            </div>
          </div>

          {/* Navigation Menu for Admin */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <Link href="/borrows" className="p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-blue-500/50 transition-all group">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">📂</div>
              <h4 className="font-bold text-white mb-2">จัดการครุภัณฑ์ & ยืมคืน</h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">ทะเบียนอุปกรณ์ทั้งหมด ตรวจสอบการยืม และจัดการคืนของ</p>
            </Link>
            <Link href="/repairs" className="p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-purple-500/50 transition-all group">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:bg-purple-600 group-hover:text-white transition-all">⚙️</div>
              <h4 className="font-bold text-white mb-2">จัดการงานซ่อม & อะไหล่</h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">ควบคุมคิวงานแจ้งซ่อม จัดการสต็อกอะไหล่ และบันทึกค่าใช้จ่าย</p>
            </Link>
            <Link href="/borrows/request" className="p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-indigo-500/50 transition-all group">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all">🛒</div>
              <h4 className="font-bold text-white mb-2">ฟอร์มขอยืมอุปกรณ์</h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">สำหรับทำรายการยืมใหม่และดาวน์โหลดเอกสาร PDF ภาษาไทย</p>
            </Link>
            <Link href="/repairs/request" className="p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-emerald-500/50 transition-all group">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">🔧</div>
              <h4 className="font-bold text-white mb-2">ฟอร์มแจ้งซ่อมอุปกรณ์</h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">บันทึกข้อมูลอาการเสียเพื่อส่งเรื่องให้ช่างดำเนินการแก้ไข</p>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // 3. หน้าจอสำหรับ User ทั่วไป (Simplified Menu)
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-black text-white mb-2">Service Portal</h1>
            <p className="text-slate-400">ยินดีต้อนรับคุณ {user.email}</p>
          </div>
          <button onClick={handleLogout} className="bg-slate-900 text-slate-400 hover:text-white px-4 py-2 rounded-xl text-xs font-bold border border-slate-800 transition-all">
            ออกจากระบบ 🚪
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link href="/borrows/request" className="group p-10 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800 rounded-[2.5rem] hover:border-indigo-500/50 transition-all shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 text-6xl opacity-10 group-hover:opacity-20 transition-opacity">🛒</div>
            <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-lg shadow-indigo-500/20">🤝</div>
            <h3 className="text-2xl font-bold mb-4">ขอยืมอุปกรณ์คอมพิวเตอร์</h3>
            <p className="text-slate-400 leading-relaxed">เบิกยืม Notebook, Monitor หรืออุปกรณ์อื่นๆ เพื่อใช้ในการปฏิบัติงาน</p>
          </Link>

          <Link href="/repairs/request" className="group p-10 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800 rounded-[2.5rem] hover:border-emerald-500/50 transition-all shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 text-6xl opacity-10 group-hover:opacity-20 transition-opacity">🔧</div>
            <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-lg shadow-emerald-500/20">🛠️</div>
            <h3 className="text-2xl font-bold mb-4">แจ้งซ่อมอุปกรณ์เสีย</h3>
            <p className="text-slate-400 leading-relaxed">แจ้งอาการเสียของคอมพิวเตอร์หรืออุปกรณ์ต่างๆ เพื่อให้ช่างตรวจสอบแก้ไข</p>
          </Link>
        </div>

        <div className="mt-12 bg-slate-900/40 border border-slate-800 p-8 rounded-[2rem] text-center">
          <h4 className="font-bold text-slate-300 mb-2">ตรวจสอบสถานะรายการของคุณ</h4>
          <p className="text-slate-500 text-sm mb-6">คุณสามารถดูรายการที่คุณเคยแจ้งซ่อมหรือยืมอุปกรณ์ไว้ได้ที่นี่</p>
          <div className="flex justify-center gap-4">
            <Link href="/repairs" className="text-xs font-bold text-indigo-400 hover:underline">ประวัติการแจ้งซ่อม</Link>
            <span className="text-slate-700">|</span>
            <Link href="/borrows" className="text-xs font-bold text-indigo-400 hover:underline">ประวัติการยืม-คืน</Link>
          </div>
        </div>
      </div>
    </main>
  )
}