// ============================================
// 🔢 Reusable Pagination Component
// ============================================
'use client'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  indexOfFirstItem: number
  indexOfLastItem: number
  onPageChange: (page: number) => void
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  indexOfFirstItem,
  indexOfLastItem,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 px-2 gap-3">
      <p className="text-xs text-slate-500 text-center sm:text-left">
        แสดง {indexOfFirstItem + 1} ถึง {Math.min(indexOfLastItem, totalItems)} จากทั้งหมด{' '}
        {totalItems} รายการ
      </p>

      <div className="flex items-center justify-center space-x-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-40 disabled:hover:bg-white"
        >
          ก่อนหน้า
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`w-7 h-7 flex items-center justify-center border rounded-lg text-xs font-semibold transition-colors ${
              currentPage === page
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-40 disabled:hover:bg-white"
        >
          ถัดไป
        </button>
      </div>
    </div>
  )
}
