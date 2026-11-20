 'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeftRight, FileText, MoreVertical, PackageSearch } from 'lucide-react'
import SearchInput from '@/components/ui/SearchInput'
import Pagination from '@/components/ui/Pagination'
import { generateTransferPDF } from '@/app/transfer/generateTransferPDF'

interface TransferredAsset {
  id: number
  asset_code: string | null
  sno: string | number | null
  asset_details: string | null
  's/n': string | null
  gotit_value: number | null
  decline_value: number | null
  book_value: number | null
  cost_center: string | null
  owner_asset: string | null
  employee_name: string | null
  affiliation: string | null
  contract: string | null
  date_received: string | null
}

const fmtNumber = (value: number | null) =>
  new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0)

export default function TransferTable() {
  const [assets, setAssets] = useState<TransferredAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [limit, setLimit] = useState(30)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const fetchAssets = useCallback(async (page = 1, search = '', pageSize = limit) => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      })
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/api/transfer?${params.toString()}`)
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถโหลดข้อมูลทรัพย์สินสำหรับโอนได้')
      }

      setAssets(json.data || [])
      setCurrentPage(json.pagination?.page || page)
      setTotalPages(json.pagination?.pages || 1)
      setTotalItems(json.pagination?.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลได้')
      setAssets([])
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchAssets(1, searchTerm)
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [fetchAssets, searchTerm])

  const indexOfFirstItem = (currentPage - 1) * limit
  const indexOfLastItem = indexOfFirstItem + assets.length

  return (
    <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-violet-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <ArrowLeftRight size={18} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">ทะเบียนทรัพย์สินสำหรับโอน</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">พบข้อมูลทั้งหมด {totalItems.toLocaleString('th-TH')} รายการ</p>
        </div>
        <div className="w-full sm:w-96">
          <SearchInput
            value={searchTerm}
            onChange={(value) => {
              setSearchTerm(value)
              setCurrentPage(1)
            }}
            placeholder="ค้นหา รหัสทรัพย์สิน, รายละเอียด, ชื่อพนักงาน, สังกัด..."
          />
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-400">
          <PackageSearch className="animate-pulse" size={20} />
          กำลังโหลดข้อมูลทรัพย์สินสำหรับโอน...
        </div>
      ) : error ? (
        <div className="p-10 text-center">
          <p className="font-semibold text-red-600">ไม่สามารถโหลดข้อมูลได้</p>
          <p className="mt-1 text-xs text-slate-500">{error}</p>
        </div>
      ) : assets.length === 0 ? (
        <div className="p-12 text-center text-sm text-slate-400">ไม่พบข้อมูลทรัพย์สินสำหรับโอน</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1460px] text-sm">
              <thead>
                <tr className="border-b border-violet-100 bg-violet-50/60 text-left text-xs text-slate-600">
                  <th className="px-4 py-3 font-semibold">รหัสทรัพย์สิน</th>
                  <th className="px-4 py-3 font-semibold">รายละเอียด</th>
                  <th className="px-4 py-3 font-semibold">Serial Number</th>
                  <th className="px-4 py-3 text-right font-semibold">มูลค่าทุน</th>
                  <th className="px-4 py-3 text-right font-semibold">ค่าเสื่อมราคา</th>
                  <th className="px-4 py-3 text-right font-semibold">มูลค่าตามบัญชี</th>
                  <th className="px-4 py-3 font-semibold">ศูนย์ต้นทุน</th>
                  <th className="px-4 py-3 font-semibold">ผู้ถือครอง</th>
                  <th className="px-4 py-3 font-semibold">ชื่อพนักงาน</th>
                  <th className="px-4 py-3 font-semibold">สังกัด</th>
                  <th className="px-4 py-3 font-semibold">สัญญา</th>
                  <th className="px-4 py-3 font-semibold">วันที่รับ</th>
                  <th className="sticky right-0 z-10 bg-violet-50/95 px-3 py-3 text-center font-semibold">เมนู</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.map((asset) => (
                  <tr key={asset.id} className="transition-colors hover:bg-violet-50/30">
                    <td className="px-4 py-3 font-mono font-semibold text-violet-700">
                      {asset.asset_code || '-'}{asset.sno != null && String(asset.sno).trim() !== '' ? `-${asset.sno}` : ''}
                    </td>
                    <td className="max-w-[260px] px-4 py-3 text-slate-700">
                      <p className="line-clamp-2">{asset.asset_details || '-'}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{asset['s/n'] || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{fmtNumber(asset.gotit_value)}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-600">{fmtNumber(asset.decline_value)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">{fmtNumber(asset.book_value)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{asset.cost_center || '-'}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">{asset.owner_asset || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{asset.employee_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{asset.affiliation || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{asset.contract || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{asset.date_received || '-'}</td>
                    <td className="sticky right-0 z-10 bg-white px-3 py-3 text-center">
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === asset.id ? null : asset.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                          aria-label={`เมนูสำหรับทรัพย์สิน ${asset.asset_code || ''}`}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === asset.id && (
                          <div className="absolute right-0 top-9 z-30 w-44 rounded-xl border border-violet-100 bg-white p-1.5 text-left shadow-lg">
                            <button
                              type="button"
                              onClick={async () => {
                                setOpenMenuId(null)
                                await generateTransferPDF(asset)
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-violet-50 hover:text-violet-700"
                            >
                              <FileText size={14} />
                              สร้างใบโอน PDF
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-2 pb-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              indexOfFirstItem={indexOfFirstItem}
              indexOfLastItem={indexOfLastItem}
              onPageChange={(page) => fetchAssets(page, searchTerm)}
              pageSize={limit}
              pageSizeOptions={[10, 30, 50, 100]}
              onPageSizeChange={(pageSize) => {
                setLimit(pageSize)
                setCurrentPage(1)
                fetchAssets(1, searchTerm, pageSize)
              }}
            />
          </div>
        </>
      )}
    </section>
  )
}