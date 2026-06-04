// components/AssetTable.tsx
'use client'

import { useState, useEffect } from 'react'

export default function AssetTable() {
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // ➕ State สำหรับเก็บคำค้นหา
  const [searchTerm, setSearchTerm] = useState('')

  // States สำหรับควบคุม Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<any | null>(null)

  // States สำหรับข้อมูลในฟอร์ม
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [contractNumber, setContractNumber] = useState('')
  const [status, setStatus] = useState('Available')

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/assets')
      const json = await res.json()
      if (json.success) setAssets(json.data)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssets()
  }, [])

  // ➕ ลอจิกการกรองข้อมูลในตารางแบบสอดคล้องเรียลไทม์ (Client-side Filtering)
  const filteredAssets = assets.filter((asset) => {
    const searchLower = searchTerm.toLowerCase().trim()
    
    // ถ้าไม่ได้พิมพ์อะไรเลย ให้ปล่อยผ่านทั้งหมด
    if (!searchLower) return true

    // ตรวจสอบว่าคำค้นหาตรงกับฟิลด์ไหนบ้าง (รวมคำค้นหาของ Contract Number ด้วย)
    return (
      asset.name?.toLowerCase().includes(searchLower) ||
      asset.brand?.toLowerCase().includes(searchLower) ||
      asset.serial_number?.toLowerCase().includes(searchLower) ||
      asset.contract_number?.toLowerCase().includes(searchLower)
    )
  })

  const openModal = (asset: any | null = null) => {
    if (asset) {
      setEditingAsset(asset)
      setName(asset.name || '')
      setBrand(asset.brand || '')
      setSerialNumber(asset.serial_number || '')
      setContractNumber(asset.contract_number || '')
      setStatus(asset.status || 'Available')
    } else {
      setEditingAsset(null)
      setName('')
      setBrand('')
      setSerialNumber('')
      setContractNumber('')
      setStatus('Available')
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return alert('กรุณากรอกชื่อครุภัณฑ์')

    const bodyData = {
      name,
      brand,
      serial_number: serialNumber,
      contract_number: contractNumber,
      status
    }

    try {
      let res
      if (editingAsset) {
        res = await fetch(`/api/assets/${editingAsset.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
        })
      } else {
        res = await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
        })
      }

      const json = await res.json()
      if (json.success) {
        setIsModalOpen(false)
        fetchAssets()
      } else {
        alert(json.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
      }
    } catch (err) {
      console.error(err)
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
  }

  if (loading) return <div className="p-12 text-center text-slate-400 animate-pulse">กำลังโหลดข้อมูลครุภัณฑ์...</div>

  return (
    <div className="p-6">
      {/* แถบหัวข้อ + ปุ่มเพิ่มอุปกรณ์ */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">ทะเบียนคลังครุภัณฑ์</h3>
          <p className="text-xs text-slate-400">พบครุภัณฑ์ทั้งหมด {filteredAssets.length} รายการ</p>
        </div>
        <button
          onClick={() => openModal(null)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-1"
        >
          ➕ เพิ่มครุภัณฑ์ใหม่
        </button>
      </div>

      {/* ➕ ส่วนกล่องค้นหา (Search Bar Components) */}
      <div className="mb-6">
        <div className="relative max-w-md w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            🔍
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาด้วย ชื่อ, แบรนด์, S/N หรือเลขสัญญา..."
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none transition-colors text-slate-800"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ล้าง
            </button>
          )}
        </div>
      </div>

      {/* ตารางแสดงข้อมูล (เปลี่ยนมาวนลูปด้วย filteredAssets แทน assets ตัวเดิม) */}
      <div className="overflow-x-auto border border-slate-100 rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
              <th className="p-4 w-16 text-center">ID</th>
              <th className="p-4">ชื่อสินทรัพย์</th>
              <th className="p-4">แบรนด์</th>
              <th className="p-4">Serial Number</th>
              <th className="p-4">เลขที่สัญญา (Contract)</th>
              <th className="p-4 text-center">สถานะ</th>
              <th className="p-4 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredAssets.length > 0 ? (
              filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-center text-slate-400 font-mono text-xs">{asset.id}</td>
                  <td className="p-4 font-semibold text-slate-900">{asset.name}</td>
                  <td className="p-4 text-slate-600">{asset.brand || '-'}</td>
                  <td className="p-4 text-slate-500 font-mono text-xs">{asset.serial_number || '-'}</td>
                  <td className="p-4 text-slate-500 font-mono text-xs">{asset.contract_number || '-'}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      asset.status === 'Available' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {asset.status || 'Available'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => openModal(asset)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold border border-blue-200 hover:border-blue-400 px-2.5 py-1 rounded-md transition-colors">✏️ แก้ไข</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">❌ ไม่พบข้อมูลครุภัณฑ์ที่ตรงกับเงื่อนไขการค้นหา</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* หน้าต่างป๊อปอัปฟอร์ม (Modal) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <h4 className="font-bold text-slate-900 text-base">
                {editingAsset ? '📝 แก้ไขข้อมูลครุภัณฑ์' : '➕ เพิ่มครุภัณฑ์ใหม่'}
              </h4>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">ชื่อสินทรัพย์ / ครุภัณฑ์ <span className="text-red-500">*</span></label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น MacBook Pro 16" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-800" required />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">แบรนด์ / ยี่ห้อ</label>
                <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="เช่น Apple, HP" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-800" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Serial Number</label>
                <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="เช่น SN-987654321" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono text-slate-800" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">เลขที่สัญญา / ใบจัดซื้อ (Contract Number)</label>
                <input type="text" value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} placeholder="เช่น CN-2026-004" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono text-slate-800" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">สถานะอุปกรณ์</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-800" >
                  <option value="Available">Available (ว่างพร้อมใช้งาน)</option>
                  <option value="Borrowed">Borrowed (ถูกยืมไปใช้งาน)</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 rounded-xl text-sm transition-colors" >ยกเลิก</button>
                <button type="submit" className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl text-sm shadow-sm transition-colors" >{editingAsset ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}