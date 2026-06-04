// app/page.tsx
'use client'

import { useState } from 'react'
import AssetTable from '@/components/AssetTable'
import BorrowTable from '@/components/BorrowTable'

export default function HomePage() {
  const [tab, setTab] = useState<'assets' | 'borrows'>('assets')

  return (
    <main className="max-w-7xl mx-auto py-8 px-4">
      {/* ส่วนหัวของเว็บ */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">📦 ระบบบริหารจัดการสินทรัพย์และครุภัณฑ์</h1>
        <p className="text-sm text-slate-500">จัดการทะเบียน ค้นหาครุภัณฑ์ และตรวจสอบประวัติการยืม-คืน</p>
      </div>

      {/* แถบปุ่มสลับหน้า (Tabs) */}
      <div className="flex space-x-2 mb-6 border-b border-slate-200 pb-4">
        <button 
          onClick={() => setTab('assets')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            tab === 'assets' 
              ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🗃️ ทะเบียนครุภัณฑ์ทั้งหมด
        </button>
        <button 
          onClick={() => setTab('borrows')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            tab === 'borrows' 
              ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📋 ประวัติการยืม-คืนอุปกรณ์
        </button>
      </div>

      {/* พื้นที่แสดงตารางตามแท็บที่แอดมินเลือก */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {tab === 'assets' ? <AssetTable /> : <BorrowTable />}
      </div>
    </main>
  )
}