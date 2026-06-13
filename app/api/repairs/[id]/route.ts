import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const resolvedParams = await params
    const id = resolvedParams.id
    const body = await request.json()
    
    const { 
      status, 
      technician_name, 
      fix_detail, 
      repair_item_id,
      parts_usage // 💡 รายการอะไหล่ที่ใช้: [{ part_id, quantity }]
    } = body

    const repairId = parseInt(id)

    if (isNaN(repairId)) {
      return NextResponse.json({ success: false, error: 'ID ไม่ถูกต้อง' }, { status: 400 })
    }

    // 1. อัปเดตข้อมูลการซ่อมหลัก
    const repairUpdates: any = {
      status,
      technician_name,
      fix_detail
    }

    if (status === 'Completed') {
      repairUpdates.repair_finish = new Date().toISOString()
    }

    const { error: repairError } = await supabase
      .from('repairs')
      .update(repairUpdates)
      .eq('id', repairId)

    if (repairError) throw repairError

    // 2. จัดการเรื่องอะไหล่ (ถ้ามีการส่งมา)
    if (parts_usage && Array.isArray(parts_usage)) {
      for (const item of parts_usage) {
        // บันทึกการใช้งานอะไหล่
        const { error: usageError } = await supabase
          .from('repair_parts_usage')
          .insert([{
            repair_id: repairId,
            part_id: item.part_id,
            quantity_used: item.quantity
          }])
        
        if (usageError) throw usageError

        // ตัดสต็อกอะไหล่ (ใช้ rpc หรือ update แบบคำนวณ)
        // เพื่อความง่ายในที่นี้จะดึงมาก่อนแล้วหัก (ในระบบจริงควรใช้ rpc เพื่อความแม่นยำ)
        const { data: partData } = await supabase
          .from('spare_parts')
          .select('stock_quantity')
          .eq('id', item.part_id)
          .single()

        if (partData) {
          await supabase
            .from('spare_parts')
            .update({ stock_quantity: partData.stock_quantity - item.quantity })
            .eq('id', item.part_id)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error(`[PATCH /api/repairs] Error:`, err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const repairId = parseInt(id)

    await supabase.from('repair_parts_usage').delete().eq('repair_id', repairId)
    await supabase.from('repair_items').delete().eq('repair_id', repairId)
    const { error } = await supabase.from('repairs').delete().eq('id', repairId)

    if (error) throw error
    return NextResponse.json({ success: true, message: 'ลบรายการสำเร็จ' })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
