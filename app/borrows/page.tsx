'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AssetTable from '@/components/AssetTable'
import BorrowTable from '@/components/BorrowTable'
import { Package, RefreshCw, CheckCircle2, AlertTriangle, ArrowLeft, Search, Plus } from 'lucide-react'

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
}

function fmtNum(n: number) {
  return new Intl.NumberFormat("th-TH").format(n)
}

export default function BorrowsDashboard() {
  const [activeTab, setActiveTab] = useState<'assets' | 'borrows'>('assets')
  const [stats, setStats] = useState({
    totalAssets: 0,
    activeBorrows: 0,
    activeBorrowsQty: 0,
    returnedToday: 0,
    overdue: 0,
    overdueCount: 0
  })

  useEffect(() => {
    async function fetchStats() {
      try {
        const [assetsRes, historyRes] = await Promise.all([
          fetch('/api/assets'),
          fetch('/api/borrows/history')
        ])

        const assetsJson = await assetsRes.json()
        const historyJson = await historyRes.json()

        if (assetsJson.success && historyJson.success) {
          const assets = assetsJson.data || []
          const history = historyJson.history || []

          const today = new Date().toLocaleDateString('en-CA')
          const now = new Date()

          const active = history.filter((b: any) => !b.return_date)
          const activeBorrowsQty = active.reduce((sum: number, b: any) => sum + (Number(b.quantity) || 0), 0)
          const returned = history.filter((b: any) => 
            b.return_date && new Date(b.return_date).toLocaleDateString('en-CA') === today
          )
          const overdue = history.filter((b: any) => {
            if (!b.return_date && b.due_date) {
              const due = new Date(b.due_date)
              due.setHours(0, 0, 0, 0)
              const todayDate = new Date()
              todayDate.setHours(0, 0, 0, 0)
              return due < todayDate
            }
            return false
          })
          const overdueQty = overdue.reduce((sum: number, b: any) => sum + (Number(b.quantity) || 0), 0)

          setStats({
            totalAssets: assets.length,
            activeBorrows: active.length,
            activeBorrowsQty,
            returnedToday: returned.length,
            overdue: overdueQty,
            overdueCount: overdue.length
          })
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err)
      }
    }

    fetchStats()
  }, [])

  return (
    <main className="min-h-screen" style={{ background: COLORS.bg }}>
      <div className="max-w-full mx-auto p-3 sm:p-4 md:p-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <h1 
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif", color: COLORS.text }}
            >
              ระบบจัดการอุปกรณ์
            </h1>
            <p className="text-xs sm:text-sm mt-1 flex items-center gap-2" style={{ color: COLORS.muted }}>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0" style={{ background: COLORS.primary }}></span>
              <span className="truncate">จัดการและตรวจสอบรายการอุปกรณ์ทั้งหมดในระบบ</span>
            </p>
          </div>
          <Link 
            href="/" 
            className="inline-flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-xl transition-all w-full md:w-auto"
            style={{ 
              background: COLORS.card, 
              border: `1px solid ${COLORS.primaryBorder}`, 
              color: COLORS.muted 
            }}
          >
            <ArrowLeft size={14} className="mr-2 shrink-0" />
            กลับหน้าหลัก
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="rounded-xl p-3 sm:p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2 sm:mb-3" style={{ background: "rgba(59,130,246,0.08)" }}>
              <Package size={16} style={{ color: COLORS.blue }} />
            </div>
            <p className="text-[10px] sm:text-xs mb-1" style={{ color: COLORS.muted }}>อุปกรณ์ทั้งหมด</p>
            <p className="text-lg sm:text-2xl font-bold" style={{ fontFamily: "'DM Mono', monospace", color: COLORS.text }}>
              {fmtNum(stats.totalAssets)}
            </p>
          </div>

          <div className="rounded-xl p-3 sm:p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2 sm:mb-3" style={{ background: "rgba(139,92,246,0.08)" }}>
              <RefreshCw size={16} style={{ color: COLORS.primary }} />
            </div>
            <p className="text-[10px] sm:text-xs mb-1" style={{ color: COLORS.muted }}>กำลังถูกยืม</p>
            <p className="text-lg sm:text-2xl font-bold" style={{ fontFamily: "'DM Mono', monospace", color: COLORS.text }}>
              {fmtNum(stats.activeBorrowsQty)} <span className="text-[10px] sm:text-sm font-normal" style={{ color: COLORS.muted }}>ชิ้น</span>
            </p>
            <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: COLORS.muted }}>{stats.activeBorrows} รายการ</p>
          </div>

          <div className="rounded-xl p-3 sm:p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2 sm:mb-3" style={{ background: "rgba(16,185,129,0.08)" }}>
              <CheckCircle2 size={16} style={{ color: COLORS.green }} />
            </div>
            <p className="text-[10px] sm:text-xs mb-1" style={{ color: COLORS.muted }}>คืนแล้ววันนี้</p>
            <p className="text-lg sm:text-2xl font-bold" style={{ fontFamily: "'DM Mono', monospace", color: COLORS.text }}>
              {fmtNum(stats.returnedToday)}
            </p>
          </div>

          {/* Overdue card - was missing */}
          {/* <div className="rounded-xl p-3 sm:p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2 sm:mb-3" style={{ background: "rgba(239,68,68,0.08)" }}>
              <AlertTriangle size={16} style={{ color: COLORS.red }} />
            </div>
            <p className="text-[10px] sm:text-xs mb-1" style={{ color: COLORS.muted }}>เกินกำหนด</p>
            <p className="text-lg sm:text-2xl font-bold" style={{ fontFamily: "'DM Mono', monospace", color: COLORS.text }}>
              {fmtNum(stats.overdue)} <span className="text-[10px] sm:text-sm font-normal" style={{ color: COLORS.muted }}>ชิ้น</span>
            </p>
            <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: COLORS.muted }}>{stats.overdueCount} รายการ</p>
          </div> */}
        </div>

        {/* Tabs */}
        <div className="flex p-1 sm:p-1.5 rounded-2xl mb-6 sm:mb-8 overflow-x-auto" style={{ background: COLORS.card, border: `1px solid ${COLORS.primaryBorder}` }}>
          <button
            onClick={() => setActiveTab('assets')}
            className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-1 sm:flex-none justify-center"
            style={{
              background: activeTab === 'assets' ? COLORS.primary : 'transparent',
              color: activeTab === 'assets' ? "#FFFFFF" : COLORS.muted,
            }}
          >
            <Package size={14} className="shrink-0" />
            อุปกรณ์ทั้งหมด
          </button>
          <button
            onClick={() => setActiveTab('borrows')}
            className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-1 sm:flex-none justify-center"
            style={{
              background: activeTab === 'borrows' ? COLORS.primary : 'transparent',
              color: activeTab === 'borrows' ? "#FFFFFF" : COLORS.muted,
            }}
          >
            <RefreshCw size={14} className="shrink-0" />
            ประวัติการยืม-คืน
          </button>
        </div>

        {/* Content */}
        <div 
          className="rounded-2xl sm:rounded-[2rem] overflow-hidden min-h-[400px] sm:min-h-[500px]"
          style={{ 
            background: COLORS.card, 
            border: `1px solid ${COLORS.primaryBorder}`,
            boxShadow: '0 20px 60px rgba(139,92,246,0.08)'
          }}
        >
          {activeTab === 'assets' ? <AssetTable /> : <BorrowTable />}
        </div>

      </div>
    </main>
  )
}
