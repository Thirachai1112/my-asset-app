'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import TransferTable from '@/components/transfer'

export default function TransferPage() {
  return (
    <main className="min-h-screen bg-[#f8f7ff]">
      <div className="mx-auto w-full max-w-[1600px] p-3 sm:p-4 md:p-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:mb-8">
          <div>
            <h1
              className="text-2xl font-bold tracking-tight text-[#2d2b3a] sm:text-3xl"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              ทรัพย์สินสำหรับโอน
            </h1>
            <p className="mt-1 flex items-center gap-2 text-xs text-[#6b6580] sm:text-sm">
              <span className="h-2 w-2 shrink-0 rounded-full bg-violet-600" />
              รายการทรัพย์สินที่บันทึกไว้สำหรับการโอน
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-xl border border-violet-200 bg-white px-5 py-2.5 text-sm font-medium text-[#6b6580] transition-all hover:border-violet-300 md:w-auto"
          >
            <ArrowLeft size={14} className="mr-2" />
            กลับหน้าหลัก
          </Link>
        </div>

        <TransferTable />
      </div>
    </main>
  )
}
