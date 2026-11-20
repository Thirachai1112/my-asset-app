import { jsPDF } from 'jspdf'

export interface TransferAssetData {
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

const formatNumber = (value: number | null) =>
  new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0)

const formatThaiDate = (date: Date) =>
  `${date.getDate()} ${[
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม',
  ][date.getMonth()]} ${date.getFullYear() + 543}`

export const generateTransferPDF = async (asset: TransferAssetData) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const fontName = 'THSarabunNew'

  try {
    const response = await fetch('/api/font')
    if (!response.ok) throw new Error('ไม่สามารถโหลดฟอนต์ภาษาไทยได้')

    const data = await response.json()
    doc.addFileToVFS('THSarabunNew.ttf', data.font)
    doc.addFont('THSarabunNew.ttf', fontName, 'normal')
    doc.addFont('THSarabunNew.ttf', fontName, 'bold')
  } catch (error) {
    console.error(error)
    alert('ไม่สามารถโหลดฟอนต์ภาษาไทยสำหรับสร้างใบโอนได้')
    return
  }

  doc.setFont(fontName, 'bold')
  doc.setFontSize(18)
  doc.text('บันทึกข้อมูลการโอนทรัพย์สิน', 105, 20, { align: 'center' })

  doc.setFont(fontName, 'normal')
  doc.setFontSize(13)
  doc.setDrawColor(0)
  doc.rect(15, 27, 180, 8)
  doc.text(`วันที่ทำรายการ: ${formatThaiDate(new Date())}`, 19, 32)

  doc.rect(15, 38, 180, 70)
  doc.text(`รหัสทรัพย์สิน: ${asset.asset_code || '-'}${asset.sno != null ? `-${asset.sno}` : ''}`, 19, 45)
  doc.text(`รายละเอียด: ${asset.asset_details || '-'}`, 19, 53)
  doc.text(`Serial Number: ${asset['s/n'] || '-'}`, 19, 61)
  doc.text(`เลขที่สัญญา: ${asset.contract || '-'}`, 19, 69)
  doc.text(`วันที่รับ: ${asset.date_received || '-'}`, 19, 77)
  doc.text(`ศูนย์ต้นทุน: ${asset.cost_center || '-'}`, 19, 85)
  doc.text(`ผู้ถือครอง: ${asset.owner_asset || '-'}`, 19, 93)
  doc.text(`ชื่อพนักงาน: ${asset.employee_name || '-'}`, 110, 93)
  doc.text(`สังกัด: ${asset.affiliation || '-'}`, 19, 101)

  doc.rect(15, 112, 180, 30)
  doc.text('มูลค่าทุน', 22, 120)
  doc.text(formatNumber(asset.gotit_value), 55, 120)
  doc.text('บาท', 75, 120)
  doc.text('ค่าเสื่อมราคา', 22, 128)
  doc.text(formatNumber(asset.decline_value), 55, 128)
  doc.text('บาท', 75, 128)
  doc.text('มูลค่าตามบัญชี', 110, 120)
  doc.text(formatNumber(asset.book_value), 155, 120)
  doc.text('บาท', 175, 120)

  doc.rect(15, 150, 84, 38)
  doc.rect(111, 150, 84, 38)
  doc.text('ผู้โอน', 57, 158, { align: 'center' })
  doc.text('ลงชื่อ..........................................', 20, 169)
  doc.text('(..........................................)', 25, 179)
  doc.text('ผู้รับโอน', 153, 158, { align: 'center' })
  doc.text('ลงชื่อ..........................................', 116, 169)
  doc.text('(..........................................)', 121, 179)

  doc.text(`วันที่......./......./...............`, 20, 200)
  doc.text(`วันที่......./......./...............`, 116, 200)

  const assetCode = asset.asset_code || 'unknown'
  doc.save(`ใบโอนทรัพย์สิน_${assetCode}_${asset.sno ?? ''}.pdf`)
}
