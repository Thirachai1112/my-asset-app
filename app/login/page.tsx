'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'

export default function LoginPage() {
  const router = useRouter()
  const [empCode, setEmpCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Login attempt started:', { empCode })
    
    if (!empCode.trim()) {
      Swal.fire({ icon: 'warning', title: 'คำเตือน', text: 'กรุณากรอกรหัสพนักงาน' })
      return
    }

    setLoading(true)

    try {
      console.log('Fetching auth API...')
      // 🚀 ส่งข้อมูลไปตรวจที่ API สะพานเชื่อม (Central Auth Bridge)
      const res = await fetch('/api/auth/central', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empCode: empCode.trim(), password })
      })

      console.log('API Response Status:', res.status)
      const result = await res.json()
      console.log('API Result:', result)

      if (res.ok && result.success) {
        console.log('Login success, saving to localStorage...')
        // ✅ ตรวจสอบสำเร็จ! (จากระบบจำลอง หรือระบบจริงในอนาคต)
        
        // บันทึกข้อมูลพนักงานชั่วคราวลง Session (เพื่อความง่ายใน Prototype)
        localStorage.setItem('user_profile', JSON.stringify(result.user))

        Swal.fire({
          icon: 'success',
          title: 'เข้าสู่ระบบสำเร็จ',
          text: `ยินดีต้อนรับคุณ ${result.user.full_name}`,
          timer: 1500,
          showConfirmButton: false,
        }).then(() => {
          console.log('Redirecting to dashboard...')
          router.push('/')
          router.refresh()
        })
      } else {
        console.error('Login failed:', result.error)
        throw new Error(result.error || 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง')
      }
    } catch (error: any) {
      console.error('Login catch error:', error)
      Swal.fire({
        icon: 'error',
        title: 'เข้าสู่ระบบล้มเหลว',
        text: error.message,
      })
    } finally {
      setLoading(false)
      console.log('Login process finished.')
    }
  }
  

  return (
    <main className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative z-10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-lg shadow-blue-500/20 mb-6 font-bold text-white">
            PEA
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2 uppercase italic">
            IT Asset
          </h1>
          <p className="text-slate-400 text-sm">ระบบจัดการครุภัณฑ์ (เข้าใช้งานด้วยรหัสพนักงาน)</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
              รหัสพนักงาน (Employee Code)
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-purple-500 transition-colors">
                🆔
              </span>
              <input
                type="text"
                value={empCode}
                onChange={(e) => setEmpCode(e.target.value)}
                placeholder="เช่น 50xxxx"
                className="w-full bg-slate-800/50 border border-slate-700 text-white text-sm rounded-2xl block pl-11 p-3.5 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
              รหัสผ่านเข้าเครื่อง (Computer Password)
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-purple-500 transition-colors">
                🔒
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800/50 border border-slate-700 text-white text-sm rounded-2xl block pl-11 p-3.5 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? 'กำลังตรวจสอบสิทธิ์...' : 'เข้าสู่ระบบ'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-2xl transition-all active:scale-[0.98] mt-2"
          >
            กลับหน้าหลัก (Portal)
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-800 pt-6">
          <p className="text-slate-500 text-xs">
            พบปัญหาการเข้าใช้งาน? ติดต่อ <span className="text-purple-400 font-bold cursor-pointer hover:underline">แผนกไอที</span>
          </p>
        </div>
      </div>
    </main>
  )
}
