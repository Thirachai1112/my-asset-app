import Link from 'next/link'
import RepairManageTable from '@/components/RepairManageTable'

export default function TechnicianDashboard() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 text-slate-800">
      <div className="max-w-7xl mx-auto">
        
        {/* Navigation */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/" className="hover:text-blue-600 transition-colors">Portal</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">ศูนย์จัดการงานซ่อม (Technician)</span>
          </div>
          <Link href="/" className="text-sm bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors shadow-sm font-medium flex items-center gap-2">
            🏠 กลับหน้าหลัก
          </Link>
        </div>

        {/* Header Section */}
        <div className="bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-800 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 text-white">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-3xl border border-blue-500/30 shadow-inner">
              ⚙️
            </div>
            <div>
              <h1 className="text-2xl font-bold">Technician Service Center</h1>
              <p className="text-slate-400 text-sm mt-1">พื้นที่สำหรับช่าง: อัปเดตสถานะงานซ่อมและบันทึกรายละเอียดการแก้ไข</p>
            </div>
          </div>
          
          <div className="flex gap-4">
             <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl flex flex-col items-center justify-center min-w-[140px]">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">รับเรื่องแล้ว</span>
                <span className="text-xl font-bold mt-1">🛠️</span>
             </div>
             <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl flex flex-col items-center justify-center min-w-[140px]">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">ปิดงานซ่อม</span>
                <span className="text-xl font-bold mt-1">🏁</span>
             </div>
          </div>
        </div>

        {/* Manage Table Component */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <RepairManageTable />
        </div>

      </div>
    </main>
  )
}
