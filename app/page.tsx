// app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function DashboardPortal() {
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

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch all required data concurrently
      const [assetsRes, borrowsRes, repairsRes, partsRes] = await Promise.all([
        fetch('/api/assets').then((r) => r.json()),
        fetch('/api/borrows/history').then((r) => r.json()),
        fetch('/api/repairs').then((r) => r.json()),
        fetch('/api/spare-parts').then((r) => r.json()),
      ])

      // 1. Process Assets
      const assets = assetsRes.success ? (assetsRes.data || []) : []
      const totalAssets = assets.length
      const availableAssets = assets.filter((a: any) => a.status === 'Available').length
      const borrowedAssets = assets.filter((a: any) => a.status === 'Borrowed' || a.status === 'borrowed').length

      // Group assets by type
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
        .slice(0, 5) // Top 5 categories

      // 2. Process Borrows & Overdue
      const borrows = borrowsRes.success ? (borrowsRes.history || []) : []
      const today = new Date()
      
      const activeBorrows = borrows.filter((b: any) => !b.return_date)
      const activeBorrowsCount = activeBorrows.length

      const urgent = activeBorrows.filter((b: any) => {
        if (!b.due_date) return false
        const diffTime = new Date(b.due_date).getTime() - today.getTime()
        const diffDays = diffTime / (1000 * 60 * 60 * 24)
        return diffDays <= 2 // Overdue or due within 2 days
      })
      const overdueBorrowsCount = urgent.length

      // 3. Process Repairs
      const repairs = repairsRes.success ? (repairsRes.data || []) : []
      const activeRepairs = repairs.filter((r: any) => r.status === 'Pending' || r.status === 'In Progress')
      const activeRepairsCount = activeRepairs.length
      const pendingRepairsCount = repairs.filter((r: any) => r.status === 'Pending').length
      const inProgressRepairsCount = repairs.filter((r: any) => r.status === 'In Progress').length
      const totalRepairCost = repairs.reduce((sum: number, r: any) => sum + (Number(r.grand_total) || 0), 0)
      const latestRepairs = repairs.slice(0, 5) // Recent 5 tickets

      // 4. Process Spare Parts Stock
      const parts = partsRes.success ? (partsRes.data || []) : []
      const lowStock = parts.filter((p: any) => p.stock_quantity <= 5)

      // Set State
      setStats({
        totalAssets,
        availableAssets,
        borrowedAssets,
        activeBorrowsCount,
        overdueBorrowsCount,
        activeRepairsCount,
        pendingRepairsCount,
        inProgressRepairsCount,
        totalRepairCost,
      })
      setUrgentReturns(urgent)
      setLowStockParts(lowStock)
      setAssetTypes(sortedTypes)
      setRecentRepairs(latestRepairs)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 text-sm animate-pulse">กำลังโหลดสถิติภาพรวมระบบ (Dashboard)...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      {/* 🚀 Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Asset IT Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            ข้อมูลสรุปและสถานะการดำเนินงานของระบบครุภัณฑ์ งานแจ้งซ่อม และอะไหล่แบบเรียลไทม์
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-2 text-xs font-mono text-slate-300 shadow-lg backdrop-blur-sm self-start">
          <span>🕒 อัปเดตล่าสุด: {new Date().toLocaleTimeString('th-TH')}</span>
          <button 
            onClick={fetchDashboardData}
            className="text-blue-400 hover:text-blue-300 transition-colors font-bold pl-2 border-l border-slate-800"
          >
            🔄 รีเฟรช
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* 📊 Row 1: KPI Stats Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Assets */}
          <div className="relative overflow-hidden bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md hover:border-slate-700/80 transition-all group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ครุภัณฑ์ทั้งหมด</span>
              <span className="text-2xl">📦</span>
            </div>
            <div className="text-3xl font-black text-white">{stats.totalAssets} <span className="text-sm font-medium text-slate-500">ชิ้น</span></div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-3">
              <span className="text-emerald-400">ว่าง: {stats.availableAssets}</span>
              <span className="text-indigo-400">ถูกยืม: {stats.borrowedAssets}</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${stats.totalAssets > 0 ? (stats.availableAssets / stats.totalAssets) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          {/* Card 2: Active Borrows */}
          <div className="relative overflow-hidden bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md hover:border-slate-700/80 transition-all group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">การยืมขณะนี้</span>
              <span className="text-2xl">🤝</span>
            </div>
            <div className="text-3xl font-black text-white">{stats.activeBorrowsCount} <span className="text-sm font-medium text-slate-500">รายการ</span></div>
            <div className="mt-4 flex items-center justify-between text-xs border-t border-slate-800/60 pt-3">
              <span className="text-slate-400">กำลังยืมปกติ</span>
              {stats.overdueBorrowsCount > 0 ? (
                <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-900 font-bold text-[10px] animate-pulse">
                  🚨 ด่วน: {stats.overdueBorrowsCount}
                </span>
              ) : (
                <span className="text-slate-500">ไม่มีเลยกำหนด</span>
              )}
            </div>
          </div>

          {/* Card 3: Repairs Status */}
          <div className="relative overflow-hidden bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md hover:border-slate-700/80 transition-all group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-colors"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">กำลังส่งซ่อม</span>
              <span className="text-2xl">🛠️</span>
            </div>
            <div className="text-3xl font-black text-white">{stats.activeRepairsCount} <span className="text-sm font-medium text-slate-500">เคส</span></div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-3">
              <span className="text-amber-400">รอดำเนินการ: {stats.pendingRepairsCount}</span>
              <span className="text-blue-400">กำลังซ่อม: {stats.inProgressRepairsCount}</span>
            </div>
          </div>
        </div>

        {/* 🚨 Row 2: Urgent Alerts Board */}
        {(urgentReturns.length > 0 || lowStockParts.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Urgent Returns Alert */}
            {urgentReturns.length > 0 && (
              <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🚨</span>
                  <h3 className="font-bold text-red-400 text-sm uppercase tracking-wider">ต้องติดตามส่งคืนครุภัณฑ์ (เลยกำหนด/ใกล้กำหนด)</h3>
                </div>
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                  {urgentReturns.map((b) => (
                    <div key={b.id} className="flex items-center justify-between bg-red-950/40 border border-red-900/30 px-4 py-2.5 rounded-xl text-xs">
                      <div>
                        <div className="font-bold text-red-200">{b.borrower_name}</div>
                        <div className="text-slate-400 mt-0.5">ยืม: {b.assets?.name || 'อุปกรณ์'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-red-400 font-mono font-bold">
                          {b.due_date ? new Date(b.due_date).toLocaleDateString('th-TH') : '-'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{b.phone || '-'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Low Stock Alert */}
            {lowStockParts.length > 0 && (
              <div className="bg-amber-950/20 border border-amber-900/40 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">⚠️</span>
                  <h3 className="font-bold text-amber-400 text-sm uppercase tracking-wider">สต็อกอะไหล่สำรองใกล้หมด (เหลือน้อยกว่า 5 ชิ้น)</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-2">
                  {lowStockParts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-amber-950/40 border border-amber-900/30 px-4 py-2.5 rounded-xl text-xs">
                      <div>
                        <div className="font-bold text-amber-200">{p.part_name}</div>
                        <div className="text-slate-400 text-[10px] uppercase font-semibold mt-0.5">{p.part_brand || '-'}</div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 font-black font-mono border border-red-900 text-[10px]">
                          {p.stock_quantity} ชิ้น
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 📊 Row 3: Charts & Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Asset Category Distribution (CSS Charts) */}
          <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">สัดส่วนประเภทครุภัณฑ์ (Top Categories)</h3>
              <span className="text-xs text-slate-500 font-mono">Real-time</span>
            </div>
            <div className="space-y-5">
              {assetTypes.map((item) => (
                <div key={item.type} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">{item.type}</span>
                    <span className="text-slate-400 font-semibold">{item.count} ชิ้น ({item.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              {assetTypes.length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-6">ไม่พบข้อมูลประเภทอุปกรณ์</p>
              )}
            </div>
          </div>

          {/* Recent Repairs Feed */}
          <div className="lg:col-span-3 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">บันทึกการแจ้งซ่อมล่าสุด</h3>
              <Link href="/repairs?tab=history" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-bold">
                ดูทั้งหมด →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-slate-400 pb-2">
                    <th className="pb-3 font-bold">ผู้แจ้งซ่อม / แผนก</th>
                    <th className="pb-3 font-bold">อุปกรณ์ที่เสีย</th>
                    <th className="pb-3 font-bold text-center">สถานะ</th>
                    <th className="pb-3 font-bold text-right">วันที่แจ้ง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {recentRepairs.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="py-3 pr-2">
                        <div className="font-bold text-slate-200">{r.requester_name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{r.requester_dept || '-'}</div>
                      </td>
                      <td className="py-3 pr-2 font-medium">
                        <div>{r.item?.manual_brand || 'ไม่ระบุ'}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[150px]">{r.item?.problem_detail || '-'}</div>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          r.status === 'Completed' 
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60'
                            : r.status === 'In Progress'
                            ? 'bg-blue-950/40 text-blue-400 border-blue-900/60'
                            : 'bg-amber-950/40 text-amber-400 border-amber-900/60'
                        }`}>
                          {r.status === 'Completed' ? 'เสร็จสิ้น' : r.status === 'In Progress' ? 'กำลังซ่อม' : 'รอดำเนินการ'}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono text-slate-500">
                        {new Date(r.repair_date).toLocaleDateString('th-TH')}
                      </td>
                    </tr>
                  ))}
                  {recentRepairs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500 italic">ไม่พบข้อมูลประวัติงานซ่อม</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 🗺️ Row 4: Navigation Hub / Action Entrance */}
        <div className="border-t border-slate-900 pt-8">
          <h3 className="font-black text-slate-400 text-xs uppercase tracking-widest mb-6">เมนูการทำรายการทั้งหมด</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            
            {/* Nav Card 1: Asset and Borrow Database */}
            <Link 
              href="/borrows"
              className="group bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800 hover:border-blue-500/40 p-6 rounded-2xl shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-xl mb-4 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                  🤝
                </div>
                <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors text-base">จัดการงานยืม-คืนอุปกรณ์</h4>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                  ทะเบียนทรัพย์สินของบริษัท จัดการรับคืนอุปกรณ์ ตรวจสอบประวัติการใช้งาน ยืมคืน และการอัปโหลดใบรับของ
                </p>
              </div>
            </Link>

            {/* Nav Card 2: Request Borrowing */}
            <Link 
              href="/borrows/request"
              className="group bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800 hover:border-indigo-500/40 p-6 rounded-2xl shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-xl mb-4 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                  🛒
                </div>
                <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors text-base">ส่งคำขอยืมครุภัณฑ์</h4>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                  เลือกอุปกรณ์คอมพิวเตอร์และเครื่องมือลงตะกร้า ทำฟอร์มกรอกข้อมูลผู้ยืม และดาวน์โหลดใบขอยืมไฟล์ PDF ภาษาไทย
                </p>
              </div>
            </Link>

            {/* Nav Card 3: Repair Center & Stock */}
            <Link 
              href="/repairs"
              className="group bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800 hover:border-purple-500/40 p-6 rounded-2xl shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-xl mb-4 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
                  ⚙️
                </div>
                <h4 className="font-bold text-white group-hover:text-purple-400 transition-colors text-base">ศูนย์บำรุงรักษาและอะไหล่</h4>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                  พื้นที่สำหรับช่างเทคนิค: บันทึกข้อมูลการซ่อม เบิกอะไหล่ ตัดสต็อกอะไหล่สำรอง และพิมพ์ใบส่งซ่อมสำเร็จ
                </p>
              </div>
            </Link>

            {/* Nav Card 4: Repair Request */}
            <Link 
              href="/repairs/request"
              className="group bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 p-6 rounded-2xl shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-xl mb-4 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                  🔧
                </div>
                <h4 className="font-bold text-white group-hover:text-emerald-400 transition-colors text-base">แจ้งขอส่งซ่อมอุปกรณ์</h4>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                  กรอกข้อมูลอาการเสียระบุรายละเอียดแบรนด์/รุ่น/เลขครุภัณฑ์ที่มีปัญหา เพื่อส่งคำขอให้ช่างเทคนิคดำเนินการตรวจสอบ
                </p>
              </div>
            </Link>

          </div>
        </div>
      </div>
    </main>
  )
}