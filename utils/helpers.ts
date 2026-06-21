// ============================================
// 🛠️ Shared Utility Functions
// ============================================
import Swal from 'sweetalert2'

/**
 * ดึง Admin ID จาก localStorage
 */
export function getAdminId(): string | null {
  try {
    const profile = localStorage.getItem('user_profile')
    if (profile) {
      const parsed = JSON.parse(profile)
      return parsed.id ? String(parsed.id) : null
    }
  } catch {
    // ignore
  }
  return null
}

/**
 * ดึง User Profile จาก localStorage
 */
export function getUserProfile(): Record<string, any> | null {
  try {
    const profile = localStorage.getItem('user_profile')
    return profile ? JSON.parse(profile) : null
  } catch {
    return null
  }
}

/**
 * แสดง Swal Success
 */
export function showSuccess(title: string, message?: string) {
  return Swal.fire({
    icon: 'success',
    title,
    text: message,
    timer: 1500,
    showConfirmButton: false,
  })
}

/**
 * แสดง Swal Error
 */
export function showError(title: string, message?: string) {
  return Swal.fire({
    icon: 'error',
    title,
    text: message,
  })
}

/**
 * แสดง Swal Warning
 */
export function showWarning(title: string, message?: string) {
  return Swal.fire({
    icon: 'warning',
    title,
    text: message,
  })
}

/**
 * แสดงกล่องยืนยัน (Confirm Dialog)
 */
export async function confirmAction(
  title: string,
  text: string,
  confirmButtonText = 'ใช่, ดำเนินการ',
  cancelButtonText = 'ยกเลิก'
): Promise<boolean> {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText,
    cancelButtonText,
  })
  return result.isConfirmed
}

/**
 * แสดง Loading Alert
 */
export function showLoading(title = 'กำลังบันทึกข้อมูล...') {
  return Swal.fire({
    title,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  })
}

/**
 * จัดการ Error จาก API Response
 */
export async function handleApiResponse<T = any>(response: Response): Promise<T> {
  const json = await response.json()
  if (!response.ok || !json.success) {
    throw new Error(json.error || json.message || `Server error: ${response.status}`)
  }
  return json as T
}

/**
 * ฟังก์ชันเรียก API แบบมี Header Admin ID
 */
export async function fetchWithAdmin(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const adminId = getAdminId()
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'x-admin-id': adminId || '',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
}

/**
 * แปลงวันที่เป็นรูปแบบไทย
 */
export function toThaiDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('th-TH')
}

/**
 * แปลงตัวเลขเป็นรูปแบบสกุลเงินบาท
 */
export function toCurrency(amount: number | null | undefined): string {
  const num = Number(amount) || 0
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
