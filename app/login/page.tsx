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
    <main className="min-h-screen bg-[#f8f7ff] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decor - Purple Theme */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-[40%] right-[20%] w-[20%] h-[20%] bg-indigo-500/8 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-[rgba(124,58,237,0.15)] rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative z-10">
        <div className="text-center mb-10">
          {/* Logo Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#6D28D9] flex items-center justify-center text-3xl mx-auto mb-5 shadow-lg shadow-purple-500/20">
            📦
          </div>
          <h1 className="text-3xl font-black text-[#2d2b3a] tracking-tight mb-1">
            IT Asset
          </h1>
          <p className="text-sm text-[#6b6580]">ระบบบริหารจัดการทรัพย์สิน</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          

          <button
            type="button"
            onClick={() => {
              window.location.href = '/api/auth/login'
            }}
            className="w-full bg-gradient-to-r from-[#742183] to-[#9c27b0] hover:from-[#601a6d] hover:to-[#821c96] text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-900/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            ⚡ เข้าสู่ระบบด้วย PEA SSO
          </button>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full bg-[#f8f7ff] hover:bg-[#ede9fe] text-[#6b6580] hover:text-[#7c3aed] font-bold py-4 rounded-2xl transition-all active:scale-[0.98] border border-[rgba(124,58,237,0.12)] cursor-pointer"
          >
            ← กลับหน้าหลัก
          </button>
        </form>

        <div className="mt-8 text-center border-t border-[rgba(124,58,237,0.12)] pt-6">
          <p className="text-[#6b6580] text-xs">
            พบปัญหาการเข้าใช้งาน? ติดต่อ <span className="text-[#7c3aed] font-bold cursor-pointer hover:underline">แผนกไอที</span>
          </p>
        </div>
      </div>
    </main>
  )
}
