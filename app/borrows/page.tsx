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


        {/* ส่วนหัวระบบ */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            {/* หัวข้อหลักยังคงเป็นสีขาวเพื่อให้เด่นชัด */}
            <h1 className="text-3xl font-extrabold text-blue-600 flex items-center gap-3">
              จัดการรายการอุปกรณ์ที่ยืม-คืน
            </h1>
            {/* ปรับคำอธิบายให้เป็นสีเทาเข้มขึ้น (slate-500) จะได้ดูเป็นระเบียบและไม่แย่งสายตา */}
            <p className="text-slate-500 text-sm mt-1">จัดการและตรวจสอบรายการอุปกรณ์ที่ยืมและคืนในระบบ</p>
          </div>

          {/* ปรับปุ่มกลับหน้าหลักให้เป็นพื้นหลังสีดำ (bg-black) ขอบดำ และตัวหนังสือสีเทา (text-slate-400) จะสว่างขึ้นเมื่อ hover */}
          <Link href="/" className="mt-4 md:mt-0 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl transition-colors border border-slate-700">
            ← กลับหน้าหลัก
          </Link>
        </div>


        {/* ปุ่มสลับแท็บเมนู */}
        <div className="flex space-x-2 border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('assets')}
            className={`pb-3 px-4 text-sm font-semibold transition-colors ${activeTab === 'assets'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            📦 รายการอุปกรณ์ทั้งหมด
          </button>
          <button
            onClick={() => setActiveTab('borrows')}
            className={`pb-3 px-4 text-sm font-semibold transition-colors ${activeTab === 'borrows'
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