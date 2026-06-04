// app/borrows/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import AssetTable from '../../components/AssetTable'
import BorrowTable from '../../components/BorrowTable'

export default function BorrowsDashboard() {
  const [activeTab, setActiveTab] = useState<'assets' | 'borrows'>('assets')

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 text-slate-800">
      <div className="max-w-6xl mx-auto">
        
        {/* ปุ่มกลับหน้าแรก Portal */}
        <div className="mb-4">
          <Link href="/" className="text-sm text-slate-500 hover:text-blue-600 font-medium inline-flex items-center transition-colors">
            ← กลับหน้าเลือกโมดูล
          </Link>
        </div>

        {/* ส่วนหัวระบบ */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            🤝 ระบบยืม-คืนครุภัณฑ์
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            จัดการและตรวจสอบสถานะเครื่องยืมในระบบแบบสอดคล้องกันเรียลไทม์
          </p>
        </div>

        {/* ปุ่มสลับแท็บเมนู */}
        <div className="flex space-x-2 border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('assets')}
            className={`pb-3 px-4 text-sm font-semibold transition-colors ${
              activeTab === 'assets'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            📦 รายการครุภัณฑ์ทั้งหมด
          </button>
          <button
            onClick={() => setActiveTab('borrows')}
            className={`pb-3 px-4 text-sm font-semibold transition-colors ${
              activeTab === 'borrows'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            🤝 ประวัติการยืม-คืน
          </button>
        </div>

        {/* เรียกใช้งานชิ้นส่วนที่เราแยกไว้ */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {activeTab === 'assets' ? <AssetTable /> : <BorrowTable />}
        </div>

      </div>
    </main>
  )
}