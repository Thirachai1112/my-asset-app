'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import RepairTable from '@/components/RepairTable'
import RepairManageTable from '@/components/RepairManageTable'
import SparePartsTable from '@/components/SparePartsTable'

function RepairsContent() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'history'
  const [activeTab, setActiveTab] = useState(initialTab)
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) setActiveTab(tab)
  }, [searchParams])

  return (
    <div className="max-w-7xl mx-auto">
        
        {/* Navigation */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/" className="hover:text-blue-600 transition-colors">Portal</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">ระบบบริหารงานซ่อม & อะไหล่</span>
          </div>
          <Link href="/" className="text-sm bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors shadow-sm font-medium flex items-center gap-2">
             <span>กลับหน้าหลัก Portal</span>
          </Link>
        </div>

        {/* Header Section */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner border transition-all duration-500 
              ${activeTab === 'manage' ? 'bg-slate-900 border-slate-800 text-white' : 
                activeTab === 'stock' ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-amber-100 border-amber-200'}`}>
              {activeTab === 'manage' ? '⚙️' : activeTab === 'stock' ? '📦' : '📜'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {activeTab === 'manage' ? 'Technician Center' : activeTab === 'stock' ? 'Inventory Management' : 'Repair History'}
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                {activeTab === 'manage' 
                  ? 'พื้นที่สำหรับช่าง: อัปเดตสถานะงานซ่อมและบันทึกรายละเอียดการแก้ไข' 
                  : activeTab === 'stock'
                  ? 'จัดการคลังอะไหล่: ตรวจสอบจำนวนคงเหลือและเพิ่มรายการอะไหล่ใหม่'
                  : 'ระบบบันทึกประวัติการซ่อมแซมครุภัณฑ์ ติดตามสถานะ และรายละเอียดงานซ่อม'}
              </p>
            </div>
          </div>
          
          {/* Tab Switcher */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              📜 ประวัติ
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'manage' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
            >
              🛠️ จัดการงาน
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'stock' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
            >
              📦 สต็อกอะไหล่
            </button>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
          {activeTab === 'history' && (
            <div className="animate-in fade-in duration-500">
              <RepairTable />
            </div>
          )}
          {activeTab === 'manage' && (
            <div className="animate-in fade-in duration-500">
              <RepairManageTable />
            </div>
          )}
          {activeTab === 'stock' && (
            <div className="animate-in fade-in duration-500">
              <SparePartsTable />
            </div>
          )}
        </div>
    </div>
  )
}

export default function UnifiedRepairsDashboard() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 text-slate-800">
      <Suspense fallback={<div className="text-center p-12 text-slate-400">กำลังโหลดระบบซ่อม...</div>}>
        <RepairsContent />
      </Suspense>
    </main>
  )
}
