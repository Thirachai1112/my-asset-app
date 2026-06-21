// ============================================
// 📄 Reusable Pagination Hook
// ============================================
'use client'

import { useState, useMemo } from 'react'

interface UsePaginationResult<T> {
  currentPage: number
  setCurrentPage: (page: number) => void
  totalPages: number
  currentItems: T[]
  indexOfFirstItem: number
  indexOfLastItem: number
  goToPage: (page: number) => void
  goToNext: () => void
  goToPrev: () => void
}

export function usePagination<T>(
  items: T[],
  itemsPerPage: number = 5
): UsePaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = useMemo(
    () => Math.ceil(items.length / itemsPerPage),
    [items.length, itemsPerPage]
  )

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = useMemo(
    () => items.slice(indexOfFirstItem, indexOfLastItem),
    [items, indexOfFirstItem, indexOfLastItem]
  )

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const goToNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }

  const goToPrev = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    currentItems,
    indexOfFirstItem,
    indexOfLastItem,
    goToPage,
    goToNext,
    goToPrev,
  }
}
