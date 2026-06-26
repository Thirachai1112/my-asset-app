// ============================================
// 📦 Shared TypeScript Types for My Asset App
// ============================================

// --- Asset (ครุภัณฑ์) ---
export interface Asset {
  id: number
  name: string
  brand: string | null
  type: string | null
  asset_code: string | null
  serial_number: string | null
  contract_number: string | null
  status: string
  created_at?: string
}

// --- Borrow (การยืม) ---
export interface Borrow {
  id: number
  doc_id: string | null
  user_id: number | null
  asset_id: number
  borrower_name: string
  borrower_dept: string | null
  position: string | null
  phone: string | null
  purpose: string | null
  borrow_date: string
  due_date: string | null
  return_date: string | null
  quantity: number
  renewal_count?: number
  assets?: Asset | null
  users?: User | null
  documents?: Document[] | null
  file_url?: string | null
}

// --- Repair (การซ่อม) ---
export interface Repair {
  id: number
  requester_name: string
  requester_dept: string | null
  requester_phone: string | null
  requester_position: string | null
  requester_emp_code: string | null
  status: string
  technician_name: string | null
  user_id: number | null
  fix_detail: string | null
  service_price: number | null
  repair_date: string
  repair_finish: string | null
  item?: RepairItem | null
  documents?: Document[] | null
  file_url?: string | null
  total_parts_cost?: number
  total_parts_qty?: number
  grand_total?: number
  technician_id?: number | null
  technician_name_inspect?: string | null
  technician_position_inspect?: string | null
  users?: User | null
}

export interface RepairItem {
  id: number
  repair_id: number
  problem_detail: string | null
  manual_brand: string | null
  manual_sn: string | null
  assets_number: string | null
  manual_contract: string | null
  type_item: string | null
  status: string | null
}

// --- Spare Part (อะไหล่) ---
export interface SparePart {
  id: number
  part_name: string
  part_brand: string | null
  part_serial_number: string | null
  stock_quantity: number
  unit_price: number
  part_date_in: string | null
  part_date_out: string | null
}

// --- Document (เอกสาร) ---
export interface Document {
  id: number
  doc_number: string | null
  doc_type: string | null
  file_url: string | null
  borrow_id: number | null
  repair_id: number | null
}

// --- Borrow Session Group (กลุ่มรายการยืมที่ยืมพร้อมกัน) ---
export interface BorrowSessionGroup {
  /** คีย์สำหรับจัดกลุ่ม (borrower_name + date) */
  key: string
  /** รายการยืมทั้งหมดในกลุ่มนี้ */
  borrows: Borrow[]
  /** ชื่อผู้ยืม (ใช้สำหรับจัดกลุ่ม) */
  borrower_name: string
  /** วันที่ยืม (ใช้สำหรับจัดกลุ่ม) */
  borrow_date: string
  /** เอกสารที่แชร์ร่วมกันในกลุ่มนี้ */
  shared_documents: Document[]
  /** มีเอกสารแนบแล้วหรือไม่ */
  has_documents: boolean
  /** จำนวนรายการยืมในกลุ่ม */
  item_count: number
  /** รวมจำนวนชิ้น */
  total_quantity: number
}

// --- User (พนักงาน) ---
export interface User {
  id: number
  emp_code: string
  full_name: string
  department: string | null
  role: string
  Job_position?: string | null
  password_hash?: string
}

// --- API Response Wrapper ---
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// --- Dashboard Stats ---
export interface DashboardStats {
  totalAssets: number
  availableAssets: number
  borrowedAssets: number
  activeBorrowsCount: number
  activeBorrowsQuantity: number
  overdueBorrowsCount: number
  overdueBorrowsQuantity: number
  activeRepairsCount: number
  pendingRepairsCount: number
  inProgressRepairsCount: number
  totalRepairCost: number
}

// --- Asset Type Breakdown ---
export interface AssetTypeBreakdown {
  type: string
  count: number
  percentage: number
}

// --- Repair Status Constants ---
export const REPAIR_STATUS_OPTIONS = [
  { value: 'Pending', label: '⏳ รอดำเนินการ (Pending)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'In Progress', label: '🛠️ กำลังซ่อม (In Progress)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'Completed', label: '✅ เสร็จสิ้น (Completed)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
] as const

// --- Asset Types for Dropdown ---
export const ASSET_TYPE_OPTIONS = [
  { value: 'Notebook', label: '💻 (Notebook)' },
  { value: 'Tablet', label: '📱 แท็บเล็ต (Tablet/iPad)' },
  { value: 'Desktop', label: '🖥️ คอมพิวเตอร์ตั้งโต๊ะ (PC)' },
  { value: 'Monitor', label: '📺 จอมอนิเตอร์ (Monitor)' },
  { value: 'Projector', label: '📹 โปรเจกเตอร์ (Projector)' },
  { value: 'Printer', label: '🖨️ เครื่องพิมพ์ (Printer)' },
  { value: 'UPS', label: '🔋 เครื่องสำรองไฟ (UPS)' },
  { value: 'network', label: '🌐 อุปกรณ์เน็ตเวิร์ก (network)' },
  { value: 'Wiring set', label: '🔌 ชุดสายไฟ (Wiring set)' },
  { value: 'Hand tools', label: '🛠️ เครื่องมือช่าง (Hand tools)' },
  { value: 'Signalcable', label: '🔌 สายสัญญาณ (Signalcable)' },
  { value: 'microphone', label: '🎤 ไมโครโฟน (Microphone)' }
] as const

// --- Asset Type Icons for Borrow Request ---
export const ASSET_TYPE_ICONS: Record<string, string> = {
  Notebook: '💻',
  Tablet: '📱',
  Desktop: '🖥️',
  Monitor: '📺',
  Projector: '📹',
  Printer: '🖨️',
  Scanner: '📑',
  UPS: '🔋',
  network: '🌐',
  Camera: '📷',
  Other: '🛠️',
  microphone: '🎤',
  Signalcable: '🔌',
  'Wiring set': '🔌'
}
