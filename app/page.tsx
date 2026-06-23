// app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import type { DashboardStats, AssetTypeBreakdown, Borrow, Repair, SparePart } from '@/types'

// --- Chart & Icon Imports ---
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  LayoutDashboard,
  TrendingUp,
  Building2,
  Bitcoin,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  Settings,
  ChevronRight,
  BarChart3,
  FileText,
  LogOut,
  Search,
  Plus,
  Package,
  Wrench,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Box,
  RefreshCw,
} from "lucide-react"

// --- Helper ---
function fmt(n: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtNum(n: number) {
  return new Intl.NumberFormat("th-TH").format(n)
}

// --- Custom Tooltip for AreaChart ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(124,58,237,0.15)",
          borderRadius: 8,
          padding: "8px 14px",
          fontFamily: "'DM Mono', monospace",
          fontSize: 12,
        }}
      >
        <p style={{ color: "#6B7280", marginBottom: 2 }}>{label}</p>
        <p style={{ color: "#7C3AED", fontWeight: 500 }}>
          {fmtNum(payload[0].value)}
        </p>
      </div>
    )
  }
  return null
}

// --- Navigation Items ---
const navItems = [
  { icon: LayoutDashboard, label: "ภาพรวม", href: "/", active: true },
  { icon: Package, label: "ครุภัณฑ์", href: "/borrows" },
  { icon: Wrench, label: "งานซ่อม", href: "/repairs" },
]

// --- Color Palette (White-Purple Theme via CSS Variables) ---
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
}

export default function DashboardPortal() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    availableAssets: 0,
    borrowedAssets: 0,
    activeBorrowsCount: 0,
    activeBorrowsQuantity: 0,
    overdueBorrowsCount: 0,
    overdueBorrowsQuantity: 0,
    activeRepairsCount: 0,
    pendingRepairsCount: 0,
    inProgressRepairsCount: 0,
    totalRepairCost: 0,
  })

  const [urgentReturns, setUrgentReturns] = useState<Borrow[]>([])
  const [lowStockParts, setLowStockParts] = useState<SparePart[]>([])
  const [assetTypes, setAssetTypes] = useState<AssetTypeBreakdown[]>([])
  const [recentRepairs, setRecentRepairs] = useState<Repair[]>([])
  const [borrowRange, setBorrowRange] = useState<'1M' | '3M' | '6M' | '1Y'>('6M')
  const [repairRange, setRepairRange] = useState<'1M' | '3M' | '6M' | '1Y'>('6M')
  const [borrowChartData, setBorrowChartData] = useState<{ month: string; value: number }[]>([])
  const [repairChartData, setRepairChartData] = useState<{ month: string; value: number }[]>([])
  const [allBorrowMonths, setAllBorrowMonths] = useState<{ month: string; value: number }[]>([])
  const [allRepairMonths, setAllRepairMonths] = useState<{ month: string; value: number }[]>([])

  const supabase = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    : null

  const checkUser = async () => {
    try {
      const storedProfile = localStorage.getItem('user_profile')

      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile)
        setProfile(parsedProfile)
        setUser({ email: `${parsedProfile.emp_code}@pea.co.th` })

        if (parsedProfile.role === 'admin') {
          fetchDashboardData()
        } else {
          setLoading(false)
        }
      } else if (supabase) {
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
      localStorage.removeItem('user_profile')
      await fetch('/api/auth/logout', { method: 'POST' })
      if (supabase) {
        await supabase.auth.signOut()
      }
      router.push('/login')
      router.refresh()
    } catch (err) {
      console.error('Logout error:', err)
      router.push('/login')
    }
  }

  const fetchDashboardData = async () => {
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
      const activeBorrowsQuantity = activeBorrows.reduce((sum: number, b: any) => sum + (Number(b.quantity) || 0), 0)
      const urgent = activeBorrows.filter((b: any) => {
        if (!b.due_date) return false
        const diffDays = (new Date(b.due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        return diffDays <= 2
      })
      const urgentQuantity = urgent.reduce((sum: number, b: any) => sum + (Number(b.quantity) || 0), 0)

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
        activeBorrowsQuantity,
        overdueBorrowsCount: urgent.length,
        overdueBorrowsQuantity: urgentQuantity,
        activeRepairsCount: activeRepairs.length,
        pendingRepairsCount: repairs.filter((r: any) => r.status === 'Pending').length,
        inProgressRepairsCount: repairs.filter((r: any) => r.status === 'In Progress').length,
        totalRepairCost,
      })
      setUrgentReturns(urgent)
      setLowStockParts(lowStock)
      setAssetTypes(sortedTypes)
      setRecentRepairs(repairs.slice(0, 5))

      // --- Process borrow data by month ---
      const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
      const now = new Date()
      const borrowCountByMonth: Record<string, number> = {}
      const repairCountByMonth: Record<string, number> = {}

      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        borrowCountByMonth[key] = 0
        repairCountByMonth[key] = 0
      }

      // Count borrows by month (use created_at or borrow_date)
      borrows.forEach((b: any) => {
        const dateStr = b.created_at || b.borrow_date
        if (!dateStr) return
        const d = new Date(dateStr)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (borrowCountByMonth[key] !== undefined) {
          borrowCountByMonth[key]++
        }
      })

      // Count repairs by month (try multiple date fields)
      repairs.forEach((r: any) => {
        const dateStr = r.created_at || r.repair_date || r.request_date || r.updated_at
        if (!dateStr) {
          // If no date at all, count it in current month
          const now = new Date()
          const key = `${now.getFullYear()}-${now.getMonth()}`
          if (repairCountByMonth[key] !== undefined) {
            repairCountByMonth[key]++
          }
          return
        }
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) {
          // Invalid date, count in current month
          const now = new Date()
          const key = `${now.getFullYear()}-${now.getMonth()}`
          if (repairCountByMonth[key] !== undefined) {
            repairCountByMonth[key]++
          }
          return
        }
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (repairCountByMonth[key] !== undefined) {
          repairCountByMonth[key]++
        }
      })

      // Build chart data arrays
      const borrowMonths: { month: string; value: number }[] = []
      const repairMonths: { month: string; value: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        borrowMonths.push({ month: thaiMonths[d.getMonth()], value: borrowCountByMonth[key] || 0 })
        repairMonths.push({ month: thaiMonths[d.getMonth()], value: repairCountByMonth[key] || 0 })
      }

      setAllBorrowMonths(borrowMonths)
      setAllRepairMonths(repairMonths)
      setBorrowChartData(borrowMonths)
      setRepairChartData(repairMonths)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkUser()
  }, [])

  // --- Loading Screen ---
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
        <div className="text-center space-y-4">
          <div
            className="w-12 h-12 rounded-full mx-auto animate-spin"
            style={{
              border: "3px solid rgba(124,58,237,0.1)",
              borderTopColor: COLORS.primary,
            }}
          />
          <p className="text-sm font-medium animate-pulse" style={{ color: COLORS.muted }}>
            กำลังตรวจสอบสิทธิ์การใช้งาน...
          </p>
        </div>
      </main>
    )
  }

  // --- Not Logged In ---
  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden" style={{ background: COLORS.bg }}>
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-5%] left-[5%] w-[30%] h-[30%] bg-purple-500/8 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-5%] right-[5%] w-[30%] h-[30%] bg-violet-600/8 rounded-full blur-[100px]"></div>
          <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[150px]"></div>
        </div>

        <div className="relative z-10">
          {/* Animated Logo */}
          <div
            className="w-28 h-28 rounded-[2rem] flex items-center justify-center text-6xl mb-8 shadow-2xl mx-auto animate-float"
            style={{
                background: `linear-gradient(135deg, ${COLORS.primary}, #6D28D9)`,
                boxShadow: `0 20px 60px rgba(124,58,237,0.15)`,
                animation: "float 3s ease-in-out infinite",
            }}
          >
            📦
          </div>
          <h1
            className="text-4xl md:text-5xl font-black tracking-tight mb-4"
            style={{ color: COLORS.text }}
          >
            Asset Management Portal
          </h1>
          <p className="max-w-lg mb-12 leading-relaxed text-lg" style={{ color: COLORS.muted }}>
            ระบบบริหารจัดการครุภัณฑ์และงานแจ้งซ่อมแบบครบวงจร <br />
            กรุณาเข้าสู่ระบบเพื่อดำเนินการขอยืมอุปกรณ์ หรือแจ้งซ่อม
          </p>
          
          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
            <Link
              href="/login"
              className="group relative font-bold py-6 px-6 rounded-2xl shadow-lg text-center overflow-hidden transition-all duration-300 hover:-translate-y-1"
              style={{
                background: `linear-gradient(135deg, ${COLORS.primary}, #6D28D9)`,
                color: "#FFFFFF",
                boxShadow: `0 8px 30px rgba(124,58,237,0.2)`,
              }}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: "linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
                }}
              />
              <div className="relative z-10">
                <span className="block text-3xl mb-3">🔐</span>
                <span className="block text-sm font-bold">เข้าสู่ระบบ</span>
                <span className="block text-[10px] mt-1.5 font-normal" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  สำหรับเจ้าหน้าที่
                </span>
              </div>
            </Link>

            <Link
              href="/borrows/request"
              className="group relative font-bold py-6 px-6 rounded-2xl shadow-lg text-center overflow-hidden transition-all duration-300 hover:-translate-y-1"
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.primaryBorder}`,
                color: COLORS.text,
              }}
            >
              <div className="relative z-10">
                <span className="block text-3xl mb-3">📦</span>
                <span className="block text-sm font-bold">ยืมอุปกรณ์</span>
                <span className="block text-[10px] mt-1.5 font-normal" style={{ color: COLORS.muted }}>
                  ขอยืมอุปกรณ์
                </span>
              </div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: COLORS.primaryLight }}
              />
            </Link>

            <Link
              href="/repairs/request"
              className="group relative font-bold py-6 px-6 rounded-2xl shadow-lg text-center overflow-hidden transition-all duration-300 hover:-translate-y-1"
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.primaryBorder}`,
                color: COLORS.text,
              }}
            >
              <div className="relative z-10">
                <span className="block text-3xl mb-3">🔧</span>
                <span className="block text-sm font-bold">แจ้งซ่อม</span>
                <span className="block text-[10px] mt-1.5 font-normal" style={{ color: COLORS.muted }}>
                  แจ้งอาการเสีย
                </span>
              </div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: COLORS.primaryLight }}
              />
            </Link>
          </div>

          {/* Footer */}
          <p className="mt-12 text-xs" style={{ color: COLORS.muted }}>
            พบปัญหา? ติดต่อ <span className="text-[#8b5cf6] font-medium">แผนกไอที</span>
          </p>
        </div>
      </main>
    )
  }
  // --- Admin Dashboard (Premium Design) ---
  if (profile?.role === 'admin') {
    const monthChange = stats.totalAssets > 0
      ? ((stats.availableAssets - stats.borrowedAssets) / stats.totalAssets * 100).toFixed(1)
      : "0"

    const pieData = [
      { name: "ว่าง", value: stats.availableAssets, color: COLORS.green },
      { name: "ถูกยืม", value: stats.borrowedAssets, color: COLORS.blue },
      { name: "ซ่อม", value: stats.activeRepairsCount, color: COLORS.red },
    ].filter(d => d.value > 0)

    const rangeMap: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 }
    const getChartData = (all: { month: string; value: number }[], range: '1M' | '3M' | '6M' | '1Y') => {
      const count = rangeMap[range]
      if (count >= all.length) return all
      return all.slice(-count)
    }
    const borrowData = getChartData(allBorrowMonths, borrowRange)
    const repairData = getChartData(allRepairMonths, repairRange)
    const rangeLabels: Record<string, string> = { '1M': '1 เดือน', '3M': '3 เดือน', '6M': '6 เดือน', '1Y': '1 ปี' }

    return (
      <div
        className="flex h-screen w-full overflow-hidden"
        style={{ fontFamily: "'DM Sans', sans-serif", background: COLORS.bg }}
      >
        {/* ===== SIDEBAR ===== */}
        <aside
          className="flex flex-col w-64 shrink-0 h-full py-8 px-5"
          style={{
            background: "#110e25",
            borderRight: `1px solid ${COLORS.primaryBorder}`,
          }}
        >
          <div className="mb-10 px-1">
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 20,
                fontWeight: 600,
                color: COLORS.primary,
                letterSpacing: "-0.02em",
              }}
            >
              MyAsset
            </span>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: COLORS.muted,
                display: "block",
                letterSpacing: "0.12em",
                marginTop: 1,
              }}
            >
              PORTFOLIO MANAGER
            </span>
          </div>

          <nav className="flex flex-col gap-1 flex-1">
            {navItems.map((item, i) => (
              <Link
                key={i}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
                style={{
                  color: item.active ? COLORS.primary : COLORS.muted,
                  background: item.active ? COLORS.primaryLight : "transparent",
                  borderLeft: item.active ? `2px solid ${COLORS.primary}` : "2px solid transparent",
                  fontWeight: item.active ? 500 : 400,
                }}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
          </nav>

          <div
            className="mt-auto pt-6"
            style={{ borderTop: `1px solid ${COLORS.primaryBorder}` }}
          >
            <div className="flex items-center gap-3 px-2 mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ background: COLORS.primary, color: "#FFFFFF" }}
              >
                {profile?.full_name?.charAt(0) || "อ"}
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: COLORS.text }}>
                  {profile?.full_name || "ผู้ดูแลระบบ"}
                </p>
                <p className="text-xs" style={{ color: COLORS.muted }}>
                  Admin
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-xs transition-colors"
              style={{ color: COLORS.muted }}
            >
              <LogOut size={13} />
              ออกจากระบบ
            </button>
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <header
            className="flex items-center justify-between px-8 py-5 shrink-0"
            style={{ borderBottom: `1px solid ${COLORS.primaryBorder}` }}
          >
            <div>
              <h1
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 22,
                  fontWeight: 600,
                  color: COLORS.text,
                  letterSpacing: "-0.02em",
                }}
              >
                ภาพรวมสินทรัพย์
              </h1>
              <p className="text-xs mt-0.5" style={{ color: COLORS.muted }}>
                อัปเดตล่าสุด: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })} ·{" "}
                {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
              </p>
            </div>

            <div className="flex items-center gap-3"></div>
          </header>

          <div className="flex-1 overflow-y-auto px-8 py-6">
            {/* ===== HERO ===== */}
            <div
              className="rounded-2xl p-7 mb-6 relative overflow-hidden"
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

              <div className="flex items-start justify-between relative">
                <div>
                  <p
                    className="text-xs mb-3 tracking-widest uppercase"
                    style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'DM Mono', monospace" }}
                  >
                    ครุภัณฑ์ทั้งหมด
                  </p>
                  <h2
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 42,
                      fontWeight: 700,
                      color: "#FFFFFF",
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                    }}
                  >
                    {fmtNum(stats.totalAssets)}
                    <span className="text-lg font-normal ml-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                      ชิ้น
                    </span>
                  </h2>
                  <div className="flex items-center gap-2 mt-3">
                    <span
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: "rgba(255,255,255,0.12)", color: "#FFFFFF" }}
                    >
                      <ArrowUpRight size={12} />
                      +{monthChange}% เดือนนี้
                    </span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                      ว่าง {fmtNum(stats.availableAssets)} ชิ้น · ถูกยืม {fmtNum(stats.borrowedAssets)} ชิ้น
                    </span>
                  </div>
                </div>

                {pieData.length > 0 && (
                  <div className="flex items-center gap-4">
                    <PieChart width={90} height={90}>
                      <Pie
                        data={pieData}
                        cx={45}
                        cy={45}
                        innerRadius={30}
                        outerRadius={42}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                    <div className="flex flex-col gap-1.5">
                      {pieData.map((d) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{d.name}</span>
                          <span
                            className="text-xs font-medium ml-auto"
                            style={{ color: "#FFFFFF", fontFamily: "'DM Mono', monospace" }}
                          >
                            {d.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ===== KPI CARDS ===== */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4" style={{ background: "rgba(16,185,129,0.08)" }}>
                  <CheckCircle2 size={16} style={{ color: COLORS.green }} />
                </div>
                <p className="text-xs mb-1" style={{ color: COLORS.muted }}>พร้อมใช้งาน</p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500, color: COLORS.text }}>
                  {fmtNum(stats.availableAssets)}
                </p>
                <p className="text-xs mt-1" style={{ color: COLORS.green }}>
                  {stats.totalAssets > 0 ? Math.round(stats.availableAssets / stats.totalAssets * 100) : 0}% ของทั้งหมด
                </p>
              </div>

              <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4" style={{ background: "rgba(59,130,246,0.08)" }}>
                  <RefreshCw size={16} style={{ color: COLORS.blue }} />
                </div>
                <p className="text-xs mb-1" style={{ color: COLORS.muted }}>กำลังถูกยืม</p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500, color: COLORS.text }}>
                  {fmtNum(stats.activeBorrowsQuantity)}
                </p>
                <p className="text-xs mt-1" style={{ color: COLORS.blue }}>{fmtNum(stats.activeBorrowsCount)} รายการ</p>
              </div>

              <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4" style={{ background: "rgba(239,68,68,0.08)" }}>
                  <AlertTriangle size={16} style={{ color: COLORS.red }} />
                </div>
                <p className="text-xs mb-1" style={{ color: COLORS.muted }}>ใกล้กำหนดคืน</p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500, color: COLORS.text }}>
                  {fmtNum(stats.overdueBorrowsQuantity)}
                </p>
                <p className="text-xs mt-1" style={{ color: COLORS.red }}>{fmtNum(stats.overdueBorrowsCount)} รายการ</p>
              </div>

              <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4" style={{ background: "rgba(239,68,68,0.08)" }}>
                  <Wrench size={16} style={{ color: COLORS.red }} />
                </div>
                <p className="text-xs mb-1" style={{ color: COLORS.muted }}>งานซ่อม</p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500, color: COLORS.text }}>
                  {fmtNum(stats.activeRepairsCount)}
                </p>
                <p className="text-xs mt-1" style={{ color: COLORS.red }}>
                  รอ {fmtNum(stats.pendingRepairsCount)} · กำลังซ่อม {fmtNum(stats.inProgressRepairsCount)}
                </p>
              </div>
            </div>

            {/* ===== CURRENT MONTH STATS ===== */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-4">
              <div
                className="rounded-xl p-5 flex items-center justify-between"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}
              >
                <div>
                  <p className="text-xs mb-1" style={{ color: COLORS.muted }}>📦 กำลังถูกยืม</p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 600, color: COLORS.blue }}>
                    {stats.activeBorrowsQuantity}
                  </p>
                  <p className="text-xs mt-1" style={{ color: COLORS.muted }}>
                    {stats.activeBorrowsCount} รายการ · {stats.overdueBorrowsCount} รายการใกล้กำหนดคืน
                  </p>
                </div>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(59,130,246,0.1)" }}
                >
                  <span className="text-2xl">📦</span>
                </div>
              </div>

              <div
                className="rounded-xl p-5 flex items-center justify-between"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}
              >
                <div>
                  <p className="text-xs mb-1" style={{ color: COLORS.muted }}>🔧 สถิติการซ่อมเดือนนี้</p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 600, color: COLORS.red }}>
                    {allRepairMonths.length > 0 ? allRepairMonths[allRepairMonths.length - 1].value : 0}
                  </p>
                  <p className="text-xs mt-1" style={{ color: COLORS.muted }}>
                    {allRepairMonths.length > 0 ? allRepairMonths[allRepairMonths.length - 1].month : '-'} · {stats.pendingRepairsCount} รายการรอดำเนินการ
                  </p>
                </div>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.1)" }}
                >
                  <span className="text-2xl">🔧</span>
                </div>
              </div>
            </div>

            {/* ===== TWO CHARTS: BORROW + REPAIR ===== */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Borrow Chart */}
              <div
                className="rounded-xl p-6"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600, color: COLORS.text }}>
                      📦 แนวโน้มการยืม
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: COLORS.muted }}>ย้อนหลัง 6 เดือน</p>
                  </div>
                  <div className="flex gap-1">
                    {(["1M", "3M", "6M", "1Y"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setBorrowRange(t)}
                        className="px-2.5 py-1 rounded text-xs transition-colors cursor-pointer"
                        style={{
                          background: borrowRange === t ? COLORS.primaryLight : "transparent",
                          color: borrowRange === t ? COLORS.primary : COLORS.muted,
                          fontFamily: "'DM Mono', monospace",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={borrowData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.06)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={(v) => fmtNum(v)}
                      tick={{ fill: COLORS.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#3B82F6"
                      strokeWidth={1.5}
                      fill="url(#blueGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: "#3B82F6", stroke: COLORS.card, strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Repair Chart */}
              <div
                className="rounded-xl p-6"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600, color: COLORS.text }}>
                      🔧 แนวโน้มการซ่อม
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: COLORS.muted }}>ย้อนหลัง 6 เดือน</p>
                  </div>
                  <div className="flex gap-1">
                    {(["1M", "3M", "6M", "1Y"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setRepairRange(t)}
                        className="px-2.5 py-1 rounded text-xs transition-colors cursor-pointer"
                        style={{
                          background: repairRange === t ? COLORS.primaryLight : "transparent",
                          color: repairRange === t ? COLORS.primary : COLORS.muted,
                          fontFamily: "'DM Mono', monospace",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={repairData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(239,68,68,0.06)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={(v) => fmtNum(v)}
                      tick={{ fill: COLORS.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#EF4444"
                      strokeWidth={1.5}
                      fill="url(#redGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: "#EF4444", stroke: COLORS.card, strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ===== TWO RECENT ACTIVITY SECTIONS ===== */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mt-4">
              {/* Recent Borrows */}
              <div
                className="rounded-xl p-6"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}
              >
                <div className="flex items-center justify-between mb-5">
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600, color: COLORS.text }}>
                    📦 รายการยืมล่าสุด
                  </p>
                  <Link href="/borrows" className="flex items-center gap-1 text-xs transition-colors" style={{ color: COLORS.primary }}>
                    ดูทั้งหมด <ChevronRight size={12} />
                  </Link>
                </div>

                <div className="flex flex-col gap-0">
                  {urgentReturns.length === 0 ? (
                    <p className="text-xs py-4 text-center" style={{ color: COLORS.muted }}>ไม่มีรายการยืมล่าสุด</p>
                  ) : (
                    urgentReturns.slice(0, 4).map((b, i) => (
                      <div
                        key={b.id || `urgent-${i}`}
                        className="flex items-center justify-between py-3"
                        style={{
                          borderBottom: i < Math.min(urgentReturns.length, 4) - 1
                            ? `1px solid ${COLORS.primaryBorder}`
                            : "none",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${COLORS.red}15` }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: COLORS.red }} />
                          </div>
                          <div>
                            <p className="text-xs font-medium" style={{ color: COLORS.text }}>
                              {b.assets?.name || `คืนครุภัณฑ์ #${b.id}`}
                            </p>
                            <p className="text-xs" style={{ color: COLORS.muted }}>
                              {b.due_date ? `ถึงกำหนด: ${new Date(b.due_date).toLocaleDateString('th-TH')}` : 'ใกล้กำหนดคืน'}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-medium" style={{ fontFamily: "'DM Mono', monospace", color: COLORS.red }}>
                          {b.quantity || 1}x
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Repairs */}
              <div
                className="rounded-xl p-6"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}
              >
                <div className="flex items-center justify-between mb-5">
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600, color: COLORS.text }}>
                    🔧 รายการซ่อมล่าสุด
                  </p>
                  <Link href="/repairs" className="flex items-center gap-1 text-xs transition-colors" style={{ color: COLORS.primary }}>
                    ดูทั้งหมด <ChevronRight size={12} />
                  </Link>
                </div>

                <div className="flex flex-col gap-0">
                  {recentRepairs.length === 0 ? (
                    <p className="text-xs py-4 text-center" style={{ color: COLORS.muted }}>ไม่มีรายการซ่อมล่าสุด</p>
                  ) : (
                    recentRepairs.slice(0, 4).map((r, i) => (
                      <div
                        key={r.id || `repair-${i}`}
                        className="flex items-center justify-between py-3"
                        style={{
                          borderBottom: i < Math.min(recentRepairs.length, 4) - 1
                            ? `1px solid ${COLORS.primaryBorder}`
                            : "none",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${COLORS.primary}15` }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: COLORS.primary }} />
                          </div>
                          <div>
                            <p className="text-xs font-medium" style={{ color: COLORS.text }}>
                              {r.item?.assets_number || `แจ้งซ่อม #${r.id}`}
                            </p>
                            <p className="text-xs" style={{ color: COLORS.muted }}>
                              {r.status === 'Pending' ? 'รอดำเนินการ' : r.status === 'In Progress' ? 'กำลังซ่อม' : r.status}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-medium" style={{ fontFamily: "'DM Mono', monospace", color: COLORS.primary }}>
                          {r.status === 'Pending' ? 'รอดำเนินการ' : 'กำลังซ่อม'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // --- User Dashboard (Simplified) ---
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden" style={{ background: COLORS.bg }}>
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-5%] left-[5%] w-[30%] h-[30%] bg-purple-500/8 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-5%] right-[5%] w-[30%] h-[30%] bg-violet-600/8 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10">
        <div
          className="w-24 h-24 rounded-[2rem] flex items-center justify-center text-5xl mb-8 shadow-2xl mx-auto"
          style={{
            background: `linear-gradient(135deg, ${COLORS.primary}, #6D28D9)`,
            boxShadow: `0 20px 60px rgba(124,58,237,0.15)`,
          }}
        >
          📦
        </div>
        <h1
          className="text-4xl md:text-5xl font-black tracking-tight mb-2"
          style={{ color: COLORS.text }}
        >
          ยินดีต้อนรับ
        </h1>
        <p className="max-w-lg mb-10 leading-relaxed text-lg" style={{ color: COLORS.muted }}>
          {profile?.full_name || "ผู้ใช้งาน"} · {profile?.department || "ระบบ"}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
          <Link
            href="/borrows/request"
            className="group relative font-bold py-6 px-6 rounded-2xl shadow-lg text-center overflow-hidden transition-all duration-300 hover:-translate-y-1"
            style={{
              background: `linear-gradient(135deg, ${COLORS.primary}, #6D28D9)`,
              color: "#FFFFFF",
              boxShadow: `0 8px 30px rgba(124,58,237,0.2)`,
            }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: "linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
              }}
            />
            <div className="relative z-10">
              <span className="block text-3xl mb-2">📦</span>
              <span className="block text-sm font-bold">ขอยืมอุปกรณ์</span>
            </div>
          </Link>
          <Link
            href="/repairs/request"
            className="group relative font-bold py-6 px-6 rounded-2xl shadow-lg text-center overflow-hidden transition-all duration-300 hover:-translate-y-1"
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.primaryBorder}`,
              color: COLORS.text,
            }}
          >
            <div className="relative z-10">
              <span className="block text-3xl mb-2">🔧</span>
              <span className="block text-sm font-bold">แจ้งซ่อม</span>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: COLORS.primaryLight }}
            />
          </Link>
        </div>
        <button
          onClick={handleLogout}
          className="mt-10 text-sm px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5"
          style={{ 
            color: COLORS.muted, 
            border: `1px solid ${COLORS.primaryBorder}`,
            background: COLORS.card,
          }}
        >
          ออกจากระบบ
        </button>
      </div>
    </main>
  )
}
