'use client'

import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import type { Asset } from '@/types'
import { ASSET_TYPE_OPTIONS } from '@/types'
import { getAdminId, showSuccess, showError, confirmAction, showWarning } from '@/utils/helpers'
import { usePagination } from '@/hooks/usePagination'
import SearchInput from '@/components/ui/SearchInput'
import Pagination from '@/components/ui/Pagination'
import Modal from '@/components/ui/Modal'

export default function AssetTable() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [assetCode, setAssetCode] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [contractNumber, setContractNumber] = useState('')
  const [status, setStatus] = useState('Available')
  const [type, setType] = useState('Notebook')

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/assets')
      const json = await res.json()
      if (json.success) {
        setAssets(json.data || json.assets || [])
      }
    } catch (err) {
      console.error('Error fetching assets:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssets()
  }, [])

  const handleDelete = async (assetId: number, assetName: string, currentStatus: string) => {
    if (currentStatus === 'Borrowed' || currentStatus === 'borrowed') {
      showError('ไม่สามารถลบได้!', `ครุภัณฑ์ "${assetName}" กำลังถูกยืมอยู่ โปรดรับคืนอุปกรณ์ก่อนทำการลบ`)
      return
    }

    const confirmed = await confirmAction('ยืนยันการลบครุภัณฑ์?', `คุณกำลังจะลบ "${assetName}" ออกจากระบบอย่างถาวร ยืนยันหรือไม่?`)
    if (!confirmed) return

    const adminId = getAdminId()

    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: 'DELETE',
        headers: { 'x-admin-id': adminId || '' }
      })
      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('ลบข้อมูลสำเร็จ')
        fetchAssets()
      } else {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการลบ')
      }
    } catch (err: any) {
      showError('ล้มเหลว', err.message)
    }
  }

  // Filter logic
  const filteredAssets = assets.filter((asset) => {
    const searchLower = searchTerm.toLowerCase().trim()
    if (!searchLower) return true
    return (
      asset.name?.toLowerCase().includes(searchLower) ||
      asset.brand?.toLowerCase().includes(searchLower) ||
      asset.asset_code?.toLowerCase().includes(searchLower) ||
      asset.type?.toLowerCase().includes(searchLower) ||
      asset.serial_number?.toLowerCase().includes(searchLower) ||
      asset.contract_number?.toLowerCase().includes(searchLower)
    )
  })

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    currentItems: currentAssets,
    indexOfFirstItem,
    indexOfLastItem,
  } = usePagination(filteredAssets, 5)

  const openModal = (asset: Asset | null = null) => {
    if (asset) {
      setEditingAsset(asset)
      setName(asset.name || '')
      setBrand(asset.brand || '')
      setAssetCode(asset.asset_code || '')
      setSerialNumber(asset.serial_number || '')
      setContractNumber(asset.contract_number || '')
      setType(asset.type || 'Notebook')
      setStatus(asset.status || 'Available')
    } else {
      setEditingAsset(null)
      setName('')
      setBrand('')
      setAssetCode('')
      setSerialNumber('')
      setContractNumber('')
      setType('Notebook')
      setStatus('Available')
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      showWarning('คำเตือน', 'กรุณากรอกชื่อครุภัณฑ์')
      return
    }

    const finalAssetCode = assetCode.trim() === '' ? null : assetCode.trim()
    const finalSerialNumber = serialNumber.trim() === '' ? null : serialNumber.trim()
    const finalContractNumber = contractNumber.trim() === '' ? null : contractNumber.trim()

    const bodyData = editingAsset
      ? { name, brand, type, asset_code: finalAssetCode, serial_number: finalSerialNumber, contract_number: finalContractNumber }
      : { name, brand, type, asset_code: finalAssetCode, serial_number: finalSerialNumber, contract_number: finalContractNumber, status }

    const adminId = getAdminId()

    try {
      let res
      if (editingAsset) {
        res = await fetch(`/api/assets/${editingAsset.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-admin-id': adminId || '' },
          body: JSON.stringify(bodyData),
        })
      } else {
        res = await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-id': adminId || '' },
          body: JSON.stringify(bodyData),
        })
      }

      const json = await res.json()
      if (json.success) {
        setIsModalOpen(false)
        setEditingAsset(null)
        showSuccess(editingAsset ? 'อัปเดตข้อมูลสำเร็จ' : 'เพิ่มอุปกรณ์สำเร็จ')
        fetchAssets()
      } else {
        showError('เกิดข้อผิดพลาด', json.error || 'ไม่สามารถบันทึกข้อมูลได้')
      }
    } catch (err) {
      console.error(err)
      showError('ล้มเหลว', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
  }

  if (loading) return <div className="p-12 text-center text-slate-400 animate-pulse">กำลังโหลดข้อมูลครุภัณฑ์...</div>

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">ทะเบียนอุปกรณ์</h3>
          <p className="text-xs text-slate-400">พบอุปกรณ์ทั้งหมด {filteredAssets.length} รายการ</p>
        </div>
        <button
          onClick={() => openModal(null)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-1"
        >
          ➕ เพิ่มอุปกรณ์ใหม่
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchInput
          value={searchTerm}
          onChange={(value) => {
            setSearchTerm(value)
            setCurrentPage(1)
          }}
          placeholder="ค้นหาด้วย ชื่อ, แบรนด์, ประเภท, S/N..."
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
              <th className="p-4 w-16 text-center font-bold">ลำดับ</th>
              <th className="p-4">ชื่อ / รุ่น</th>
              <th className="p-4">ประเภท</th>
              <th className="p-4">แบรนด์</th>
              <th className="p-4">รหัสทรัพย์สิน</th>
              <th className="p-4">Serial Number</th>
              <th className="p-4">เลขที่สัญญา (Contract)</th>
              <th className="p-4 text-center">สถานะ</th>
              <th className="p-4 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {currentAssets.length > 0 ? (
              currentAssets.map((asset, index) => (
                <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-center text-slate-400 font-mono text-xs">{indexOfFirstItem + index + 1}</td>
                  <td className="p-4 font-semibold text-slate-900">{asset.name}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap">
                      <span>{ASSET_TYPE_OPTIONS.find(t => t.value === asset.type)?.label.split(' ')[0] || '💻'}</span>
                      <span>{asset.type || 'Notebook'}</span>
                    </span>
                  </td>
                  <td className="p-4 text-slate-600">{asset.brand || '-'}</td>
                  <td className="p-4 text-slate-700 font-mono text-xs font-semibold">{asset.asset_code || '-'}</td>
                  <td className="p-4 text-slate-500 font-mono text-xs">{asset.serial_number || '-'}</td>
                  <td className="p-4 text-slate-500 font-mono text-xs">{asset.contract_number || '-'}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      asset.status === 'Available'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {asset.status || 'Available'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openModal(asset)}
                        className="text-xs text-blue-600 hover:bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md transition-colors font-semibold"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(asset.id, asset.name, asset.status)}
                        className="text-xs text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-md transition-colors font-semibold"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">❌ ไม่พบข้อมูลครุภัณฑ์ที่ตรงกับเงื่อนไขการค้นหา</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredAssets.length}
        indexOfFirstItem={indexOfFirstItem}
        indexOfLastItem={indexOfLastItem}
        onPageChange={(page) => setCurrentPage(page)}
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingAsset(null) }}
        title={editingAsset ? '📝 แก้ไขข้อมูลครุภัณฑ์' : '➕ เพิ่มครุภัณฑ์ใหม่'}
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">ชื่อ / รุ่น <span className="text-red-500">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น MacBook Pro 16" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-800" required />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">ประเภทอุปกรณ์</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-800"
            >
              {ASSET_TYPE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">แบรนด์ / ยี่ห้อ</label>
            <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="เช่น Apple, HP" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-800" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">รหัสทรัพย์สิน (Asset Code)</label>
            <input type="text" value={assetCode} onChange={(e) => setAssetCode(e.target.value)} placeholder="เช่น AC-2026-001" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono text-slate-800" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Serial Number</label>
            <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="เช่น SN-987654321" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono text-slate-800" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">เลขที่สัญญา / ใบจัดซื้อ (Contract Number)</label>
            <input type="text" value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} placeholder="เช่น CN-2026-004" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono text-slate-800" />
          </div>

          <div className="flex space-x-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => { setIsModalOpen(false); setEditingAsset(null) }} className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 rounded-xl text-sm transition-colors">ยกเลิก</button>
            <button type="submit" className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl text-sm shadow-sm transition-colors">{editingAsset ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
