import Link from 'next/link'
import RepairManageTable from '@/components/RepairManageTable'

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
}

export default function TechnicianDashboard() {
  return (
    <main className="min-h-screen p-6 md:p-12" style={{ background: COLORS.bg }}>
      <div className="max-w-7xl mx-auto">
        
        {/* Navigation */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm" style={{ color: COLORS.muted }}>
            <Link href="/" className="transition-colors" style={{ color: COLORS.primary }}>Portal</Link>
            <span>/</span>
            <span className="font-medium" style={{ color: COLORS.text }}>ศูนย์จัดการงานซ่อม (Technician)</span>
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
            ← กลับหน้าหลัก
          </Link>
        </div>

        {/* Header Section */}
        <div 
          className="p-8 rounded-3xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
          style={{ 
            background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)",
            border: `1px solid ${COLORS.primaryBorder}`,
          }}
        >
          <div className="flex items-center gap-6">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              ⚙️
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Technician Service Center</h1>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>
                พื้นที่สำหรับช่าง: อัปเดตสถานะงานซ่อมและบันทึกรายละเอียดการแก้ไข
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
             <div 
               className="p-4 rounded-2xl flex flex-col items-center justify-center min-w-[140px]"
               style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
             >
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.6)" }}>รับเรื่องแล้ว</span>
                <span className="text-xl font-bold mt-1">🛠️</span>
             </div>
             <div 
               className="p-4 rounded-2xl flex flex-col items-center justify-center min-w-[140px]"
               style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
             >
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.6)" }}>ปิดงานซ่อม</span>
                <span className="text-xl font-bold mt-1">🏁</span>
             </div>
          </div>
        </div>

        {/* Manage Table Component */}
        <div 
          className="rounded-3xl overflow-hidden"
          style={{ 
            background: COLORS.card, 
            border: `1px solid ${COLORS.primaryBorder}`,
            boxShadow: '0 20px 60px rgba(139,92,246,0.08)'
          }}
        >
          <RepairManageTable />
        </div>

      </div>
    </main>
  )
}
