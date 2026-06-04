// app/repairs/page.tsx
import Link from 'next/link'

export default function RepairsDashboard() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 text-slate-800 flex flex-col items-center justify-center">
      <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="text-4xl mb-4">🛠️</div>
        <h1 className="text-2xl font-bold text-slate-900">ระบบแจ้งซ่อม & อะไหล่</h1>
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
          โมดูลการทำงานนี้กำลังเตรียมเชื่อมต่อข้อมูลจากตาราง repairs และ spare_parts บน Supabase ของคุณ
        </p>
        <div className="mt-6">
          <Link href="/" className="inline-block bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            กลับหน้าหลัก Portal
          </Link>
        </div>
      </div>
    </main>
  )
}