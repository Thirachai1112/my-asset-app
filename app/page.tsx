// app/page.tsx
import Link from 'next/link'


export default function PortalPage() {
  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="max-w-4xl w-full text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Asset Management Portal
        </h1>
        <p className="text-slate-400 mt-3 text-base md:text-lg">
          ระบบบริหารจัดการการซ่อมและยืม-คืนอุปกรณ์ กรุณาเลือกรายการที่ต้องการใช้งาน
        </p>
      </div>

      {/* บล็อกตัวเลือกทางเข้า (Selection Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">

        {/* การ์ดระบบยืม-คืน */}
        <Link
          href="/borrows/"
          className="group bg-slate-800 hover:bg-slate-750 border border-slate-700/50 hover:border-blue-500/50 rounded-2xl p-8 transition-all duration-300 shadow-xl hover:shadow-blue-950/20 flex flex-col justify-between text-left"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-2xl mb-6 border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
              🤝
            </div>
            <h2 className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors">
              จัดการรายการอุปกรณ์ที่ยืม-คืน
            </h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              จัดการรายการอุปกรณ์ที่ยืม-คืนทั้งหมด บันทึกประวัติการยืม-การส่งคืนอุปกรณ์ ติดตามสถานะทรัพย์สินที่ถูกยืม และตรวจสอบประวัติการใช้งานของอุปกรณ์แต่ละชิ้นได้อย่างง่ายดาย
            </p>
          </div>
        </Link>

        <Link
          href="/borrows/request"
          className="group bg-slate-800 hover:bg-slate-750 border border-slate-700/50 hover:border-blue-500/50 rounded-2xl p-8 transition-all duration-300 shadow-xl hover:shadow-blue-950/20 flex flex-col justify-between text-left"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-2xl mb-6 border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
              🛒
            </div>
            <h2 className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors">
              ส่งคำขอยืมอุปกรณ์
            </h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              บันทึกการส่งซ่อม ติดตามขั้นตอนของช่างซ่อม เบิกจ่ายอะไหล่จากคลัง และสรุปยอดค่าใช้จ่ายในงานซ่อมบำรุง
            </p>
          </div>
        </Link>

        {/* การ์ดระบบจัดการการซ่อม */}
        <Link href="/repairs" className="group bg-slate-800 hover:bg-slate-750 border border-slate-700/50 hover:border-amber-500/50 rounded-2xl p-8 transition-all duration-300 shadow-xl hover:shadow-amber-950/20 flex flex-col justify-between text-left">
          <div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-2xl mb-6 border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
              🛠️
            </div>
            <h2 className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors">
              การซ่อม / อะไหล่
            </h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              บันทึกการส่งซ่อม ติดตามขั้นตอนของช่างซ่อม เบิกจ่ายอะไหล่จากคลัง และสรุปยอดค่าใช้จ่ายในงานซ่อมบำรุง
            </p>
          </div>
          {/* <div className="mt-8 flex items-center text-sm font-semibold text-amber-400 group-hover:text-amber-300">
            เข้าสู่ระบบงานซ่อม <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
          </div> */}
        </Link>

        <Link href="/" className="group bg-slate-800 hover:bg-slate-750 border border-slate-700/50 hover:border-amber-500/50 rounded-2xl p-8 transition-all duration-300 shadow-xl hover:shadow-amber-950/20 flex flex-col justify-between text-left">
          <div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-2xl mb-6 border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
              🛠️
            </div>
            <h2 className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors">
              ส่งซ่อม
            </h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              ถ้าต้องการส่งซ่อมอุปกรณ์ที่มีปัญหา สามารถบันทึกข้อมูลการส่งซ่อม ได้ที่นี่
            </p>
          </div>
          {/* <div className="mt-8 flex items-center text-sm font-semibold text-amber-400 group-hover:text-amber-300">
            เข้าสู่ระบบงานซ่อม <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
          </div> */}
        </Link>

      </div>
    </main>
  )
}