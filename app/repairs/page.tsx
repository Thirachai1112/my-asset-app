'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import RepairTable from '@/components/RepairTable'
import RepairManageTable from '@/components/RepairManageTable'
import SparePartsTable from '@/components/SparePartsTable'
import { Wrench, Package, ClipboardList, ArrowLeft } from 'lucide-react'

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

function RepairsContent() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'history'
  const [activeTab, setActiveTab] = useState(initialTab)
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) setActiveTab(tab)
  }, [searchParams])

  const tabs = [
    { key: 'history', label: 'ประวัติ', icon: ClipboardList, color: COLORS.primary },
    { key: 'manage', label: 'จัดการงาน', icon: Wrench, color: COLORS.blue },
    { key: 'stock', label: 'สต็อกอะไหล่', icon: Package, color: COLORS.green },
  ]

  return (
    <div className="w-full px-2 sm:px-4">
      {/* Breadcrumb */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm" style={{ color: COLORS.muted }}>
          <Link href="/" className="transition-colors" style={{ color: COLORS.primary }}>Portal</Link>
          <span>/</span>
          <span className="font-medium" style={{ color: COLORS.text }}>ระบบบริหารงานซ่อม & อะไหล่</span>
        </div>
        <Link 
          href="/" 
          className="text-sm px-4 py-2 rounded-xl transition-colors font-medium flex items-center gap-2"
          style={{ 
            background: COLORS.card, 
            border: `1px solid ${COLORS.primaryBorder}`, 
            color: COLORS.muted 
          }}
        >
          <ArrowLeft size={14} />
          กลับหน้าหลัก
        </Link>
      </div>

      {/* Header */}
      <div 
        className="p-8 rounded-3xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
        style={{ 
          background: COLORS.card, 
          border: `1px solid ${COLORS.primaryBorder}` 
        }}
      >
        <div className="flex items-center gap-6">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all duration-500"
            style={{ 
              background: activeTab === 'manage' 
                ? 'rgba(59,130,246,0.12)' 
                : activeTab === 'stock' 
                  ? 'rgba(16,185,129,0.12)' 
                  : COLORS.primaryLight,
              border: `1px solid ${
                activeTab === 'manage' 
                  ? 'rgba(59,130,246,0.2)' 
                  : activeTab === 'stock' 
                    ? 'rgba(16,185,129,0.2)' 
                    : COLORS.primaryBorder
              }`
            }}
          >
            {activeTab === 'manage' ? '⚙️' : activeTab === 'stock' ? '📦' : '📜'}
          </div>
          <div>
            <h1 
              className="text-2xl font-bold"
              style={{ fontFamily: "'Playfair Display', serif", color: COLORS.text }}
            >
              {activeTab === 'manage' ? 'Technician Center' : activeTab === 'stock' ? 'Inventory Management' : 'Repair History'}
            </h1>
            <p className="text-sm mt-1" style={{ color: COLORS.muted }}>
              {activeTab === 'manage' 
                ? 'พื้นที่สำหรับช่าง: อัปเดตสถานะงานซ่อมและบันทึกรายละเอียดการแก้ไข' 
                : activeTab === 'stock'
                ? 'จัดการคลังอะไหล่: ตรวจสอบจำนวนคงเหลือและเพิ่มรายการอะไหล่ใหม่'
                : 'ระบบบันทึกประวัติการซ่อมแซมครุภัณฑ์ ติดตามสถานะ และรายละเอียดงานซ่อม'}
            </p>
          </div>
        </div>
        
        {/* Tab Switcher */}
        <div 
          className="flex p-1.5 rounded-2xl"
          style={{ background: COLORS.bg, border: `1px solid ${COLORS.primaryBorder}` }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: activeTab === tab.key ? tab.color : 'transparent',
                color: activeTab === tab.key ? "#FFFFFF" : COLORS.muted,
              }}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Content */}
      <div 
        className="rounded-3xl overflow-hidden min-h-[500px]"
        style={{ 
          background: COLORS.card, 
          border: `1px solid ${COLORS.primaryBorder}`,
          boxShadow: '0 20px 60px rgba(139,92,246,0.08)'
        }}
      >
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
    <main className="min-h-screen p-6 md:p-12" style={{ background: COLORS.bg }}>
      <Suspense fallback={
        <div className="text-center p-12" style={{ color: COLORS.muted }}>
          <div 
            className="w-10 h-10 rounded-full mx-auto mb-4 animate-spin"
            style={{
              border: "3px solid rgba(139,92,246,0.1)",
              borderTopColor: COLORS.primary,
            }}
          />
          กำลังโหลดระบบซ่อม...
        </div>
      }>
        <RepairsContent />
      </Suspense>
    </main>
  )
}
