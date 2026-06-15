'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AssetTable from '../../components/AssetTable'
import BorrowTable from '../../components/BorrowTable'

export default function BorrowsDashboard() {
  const [activeTab, setActiveTab] = useState<'assets' | 'borrows'>('assets')
  const [stats, setStats] = useState({
    totalAssets: 0,
    activeBorrows: 0,
    returnedToday: 0,
    overdue: 0
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

          const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
          const now = new Date()

          const active = history.filter((b: any) => !b.return_date)
          const returned = history.filter((b: any) => 
            b.return_date && new Date(b.return_date).toLocaleDateString('en-CA') === today
          )
          const overdue = history.filter((b: any) => 
            !b.return_date && b.due_date && new Date(b.due_date) < now
          )

          setStats({
            totalAssets: assets.length,
            activeBorrows: active.length,
            returnedToday: returned.length,
            overdue: overdue.length
          })
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err)
      }
    }

    fetchStats()
  }, [])

  return (
    <main className="min-h-screen bg-[#f8fafc] p-4 md:p-10 text-slate-800">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              ระบบจัดการอุปกรณ์
            </h1>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              จัดการและตรวจสอบรายการอุปกรณ์ทั้งหมดในระบบ
            </p>
          </div>
          <Link 
            href="/" 
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm group"
          >
            <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span>
            กลับหน้าหลัก Portal
          </Link>
        </div>

        {/* Stats Overview (Quick Insights) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'อุปกรณ์ทั้งหมด', value: stats.totalAssets, icon: '📦', color: 'blue' },
            { label: 'กำลังถูกยืม', value: stats.activeBorrows, icon: '🤝', color: 'amber' },
            { label: 'คืนแล้ววันนี้', value: stats.returnedToday, icon: '✅', color: 'emerald' },
            { label: 'เกินกำหนดคืน', value: stats.overdue, icon: '🚨', color: 'red' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className={`w-10 h-10 flex items-center justify-center rounded-xl bg-${stat.color}-50 text-xl`}>
                  {stat.icon}
                </span>
              </div>
              <h3 className="text-slate-500 text-sm font-medium">{stat.label}</h3>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 inline-flex mb-8 shadow-sm">
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'assets'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            📦 อุปกรณ์ทั้งหมด
          </button>
          <button
            onClick={() => setActiveTab('borrows')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'borrows'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            🤝 ประวัติการยืม-คืน
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden min-h-[500px]">
          {activeTab === 'assets' ? <AssetTable /> : <BorrowTable />}
        </div>

      </div>
    </main>
  )
}