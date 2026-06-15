import { SupabaseClient } from '@supabase/supabase-js'

/**
 * ฟังก์ชันสำหรับบันทึก Log การทำงานของ Admin
 * @param supabase - อินสแตนซ์ของ Supabase Client
 * @param adminId - ID ของ Admin (จากตาราง users.id)
 * @param actionType - ประเภทการกระทำ เช่น 'CREATE_ASSET', 'DELETE_REPAIR'
 * @param targetTable - ชื่อตารางที่ถูกกระทำ เช่น 'assets', 'repairs'
 * @param targetId - ID ของแถวข้อมูลที่ถูกกระทำ
 */
export async function logAdminActivity(
  supabase: SupabaseClient,
  adminId: number | null,
  actionType: string,
  targetTable: string,
  targetId: number | string
) {
  try {
    const { error } = await supabase
      .from('admin_activity_logs')
      .insert([
        {
          admin_id: adminId,
          action_type: actionType,
          target_table: targetTable,
          target_id: typeof targetId === 'string' ? parseInt(targetId) : targetId
        }
      ])

    if (error) {
      console.error('❌ Failed to save admin log:', error.message)
    }
  } catch (err) {
    console.error('❌ Logger Error:', err)
  }
}
