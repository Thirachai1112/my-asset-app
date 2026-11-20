// ============================================
// 🔢 Reusable Pagination Component
// ============================================
'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  indexOfFirstItem: number
  indexOfLastItem: number
  onPageChange: (page: number) => void
  pageSize?: number
  pageSizeOptions?: number[]
  onPageSizeChange?: (pageSize: number) => void
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  indexOfFirstItem,
  indexOfLastItem,
  onPageChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
}: PaginationProps) {
  if (totalItems === 0) return null

  const firstItem = totalItems === 0 ? 0 : indexOfFirstItem + 1
  const lastItem = Math.min(indexOfLastItem, totalItems)

  return (
    <div className="mt-4 flex flex-col items-end gap-3 px-2 sm:flex-row sm:justify-end sm:gap-5">
      {pageSize && onPageSizeChange && pageSizeOptions?.length ? (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="whitespace-nowrap">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-violet-400"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <p className="whitespace-nowrap text-xs text-slate-500">
        {firstItem}-{lastItem} of {totalItems}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="หน้าแรก"
          className="flex h-8 w-8 items-center justify-center text-violet-600 transition-colors hover:text-violet-800 disabled:text-slate-300"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="หน้าก่อนหน้า"
          className="flex h-8 w-8 items-center justify-center text-violet-600 transition-colors hover:text-violet-800 disabled:text-slate-300"
        >
          <ChevronLeft size={17} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="หน้าถัดไป"
          className="flex h-8 w-8 items-center justify-center text-violet-600 transition-colors hover:text-violet-800 disabled:text-slate-300"
        >
          <ChevronRight size={17} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="หน้าสุดท้าย"
          className="flex h-8 w-8 items-center justify-center text-violet-600 transition-colors hover:text-violet-800 disabled:text-slate-300"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  )
}
