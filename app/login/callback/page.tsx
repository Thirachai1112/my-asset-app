'use client'

import { useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Swal from 'sweetalert2'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasTriggered = useRef(false)

  useEffect(() => {
    // Prevent multiple execution in React 18/19 Strict Mode
    if (hasTriggered.current) return
    hasTriggered.current = true

    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      Swal.fire({
        icon: 'error',
        title: 'การเข้าสู่ระบบล้มเหลว',
        text: 'ไม่พบรหัสเข้าสู่ระบบ (code) หรือสถานะการเข้าถึง (state)',
      }).then(() => {
        router.push('/login')
      })
      return
    }

    const processSSOLogin = async () => {
      try {
        const res = await fetch('/api/auth/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state }),
        })

        const result = await res.json()

        if (res.ok && result.success) {
          // Save user profile in localStorage (consistent with normal login)
          localStorage.setItem('user_profile', JSON.stringify(result.user))

          Swal.fire({
            icon: 'success',
            title: 'เข้าสู่ระบบสำเร็จ',
            text: `ยินดีต้อนรับคุณ ${result.user.full_name}`,
            timer: 1500,
            showConfirmButton: false,
          }).then(() => {
            router.push('/')
            router.refresh()
          })
        } else {
          throw new Error(result.error || 'การยืนยันตัวตนล้มเหลว')
        }
      } catch (error: any) {
        console.error('SSO callback processing error:', error)
        Swal.fire({
          icon: 'error',
          title: 'เข้าสู่ระบบล้มเหลว',
          text: error.message || 'เกิดข้อผิดพลาดไม่คาดคิดขณะเชื่อมโยงกับระบบ SSO',
        }).then(() => {
          router.push('/login')
        })
      }
    }

    processSSOLogin()
  }, [router, searchParams])

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <span className="w-10 h-10 rounded-full animate-spin border-4 border-purple-200 border-t-purple-600"></span>
      <h2 className="text-xl font-bold text-[#2d2b3a]">
        กำลังเชื่อมต่อกับ PEA SSO
      </h2>
      <p className="text-sm text-[#6b6580] max-w-xs">
        กรุณารอสักครู่ ระบบกำลังตรวจสอบสิทธิ์การเข้าใช้งานของคุณ
      </p>
    </div>
  )
}

export default function SSOCallbackPage() {
  return (
    <main className="min-h-screen bg-[#f8f7ff] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decor - Purple Theme */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-[40%] right-[20%] w-[20%] h-[20%] bg-indigo-500/8 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-[rgba(124,58,237,0.15)] rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative z-10 text-center">
        {/* Logo/Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#6D28D9] flex items-center justify-center text-3xl mx-auto mb-6 shadow-lg shadow-purple-500/20">
          🔑
        </div>
        
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center space-y-4">
            <span className="w-10 h-10 rounded-full animate-spin border-4 border-purple-200 border-t-purple-600"></span>
            <h2 className="text-xl font-bold text-[#2d2b3a]">กำลังโหลด...</h2>
          </div>
        }>
          <CallbackHandler />
        </Suspense>
      </div>
    </main>
  )
}
