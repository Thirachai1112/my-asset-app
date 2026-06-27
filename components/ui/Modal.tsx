// ============================================
// 🪟 Reusable Modal Component
// ============================================
'use client'

import { ReactNode, useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
  darkHeader?: boolean
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  darkHeader = false,
}: ModalProps) {
  // ป้องกันการ scroll ด้านหลังตอนเปิด Modal
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-[#2d2b3a]/30 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className={`bg-white rounded-2xl w-full ${maxWidth} shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col`}
      >
        {/* Header */}
        <div
          className={`border-b px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center shrink-0 ${
            darkHeader
              ? 'bg-slate-900 text-white border-slate-800'
              : 'bg-slate-50 border-slate-100'
          }`}
        >
          <h4 className="font-bold text-sm sm:text-base truncate pr-2">{title}</h4>
          <button
            onClick={onClose}
            className={`text-xl sm:text-2xl leading-none hover:opacity-70 transition-opacity shrink-0 ${
              darkHeader ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}
