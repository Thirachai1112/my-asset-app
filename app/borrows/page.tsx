'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AssetTable from '@/components/AssetTable'
import BorrowTable from '@/components/BorrowTable'
import { Package, RefreshCw, CheckCircle2, AlertTriangle, ArrowLeft, Search, Plus } from 'lucide-react'

const COLORS = {
  primary: "#8b5cf6",
  primaryLight: "rgba(139,92,246,0.12)",
  primaryBorder: "rgba(139,92,246,0.18)",
  bg: "#0d0b1a",
  card: "#15112b",
  cardBorder: "rgba(139,92,246,0.18)",
  text: "#ece9f8",
  muted: "#9585c4",
  green: "#34d399",
  red: "#ef4444",
  blue: "#60a5fa",
  purple: "#8b5cf6",
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
      <div className="max-w-7xl mx-auto p-4 md:p-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 
              className="text-3xl font-bold tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif", color: COLORS.text }}
            >
              ระบบจัดการอุปกรณ์
            </h1>
            <p className="text-sm mt-1 flex items-center gap-2" style={{ color: COLORS.muted }}>
              <span className="w-2 h-2 rounded-full" style={{ background: COLORS.primary }}></span>
              จัดการและตรวจสอบรายการอุปกรณ์ทั้งหมดในระบบ
            </p>
          </div>
          <Link 
            href="/" 
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-xl transition-all"
            style={{ 
              background: COLORS.card, 
              border: `1px solid ${COLORS.primaryBorder}`, 
              color: COLORS.muted 
            }}
          >
            <ArrowLeft size={14} className="mr-2" />
            กลับหน้าหลัก
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(59,130,246,0.08)" }}>
              <Package size={18} style={{ color: COLORS.blue }} />
            </div>
            <p className="text-xs mb-1" style={{ color: COLORS.muted }}>อุปกรณ์ทั้งหมด</p>
            <p className="text-2xl font-bold" style={{ fontFamily: "'DM Mono', monospace", color: COLORS.text }}>
              {fmtNum(stats.totalAssets)}
            </p>
          </div>

          <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(139,92,246,0.08)" }}>
              <RefreshCw size={18} style={{ color: COLORS.primary }} />
            </div>
            <p className="text-xs mb-1" style={{ color: COLORS.muted }}>กำลังถูกยืม</p>
            <p className="text-2xl font-bold" style={{ fontFamily: "'DM Mono', monospace", color: COLORS.text }}>
              {fmtNum(stats.activeBorrowsQty)} <span className="text-sm font-normal" style={{ color: COLORS.muted }}>ชิ้น</span>
            </p>
            <p className="text-xs mt-0.5" style={{ color: COLORS.muted }}>{stats.activeBorrows} รายการ</p>
          </div>

          <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(16,185,129,0.08)" }}>
              <CheckCircle2 size={18} style={{ color: COLORS.green }} />
            </div>
            <p className="text-xs mb-1" style={{ color: COLORS.muted }}>คืนแล้ววันนี้</p>
            <p className="text-2xl font-bold" style={{ fontFamily: "'DM Mono', monospace", color: COLORS.text }}>
              {fmtNum(stats.returnedToday)}
            </p>
          </div>

          
        </div>

        {/* Tabs */}
        <div className="inline-flex p-1.5 rounded-2xl mb-8" style={{ background: COLORS.card, border: `1px solid ${COLORS.primaryBorder}` }}>
          <button
            onClick={() => setActiveTab('assets')}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: activeTab === 'assets' ? COLORS.primary : 'transparent',
              color: activeTab === 'assets' ? "#FFFFFF" : COLORS.muted,
            }}
          >
            <Package size={14} />
            อุปกรณ์ทั้งหมด
          </button>
          <button
            onClick={() => setActiveTab('borrows')}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: activeTab === 'borrows' ? COLORS.primary : 'transparent',
              color: activeTab === 'borrows' ? "#FFFFFF" : COLORS.muted,
            }}
          >
            <RefreshCw size={14} />
            ประวัติการยืม-คืน
          </button>
        </div>

        {/* Content */}
        <div 
          className="rounded-[2rem] overflow-hidden min-h-[500px]"
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
