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
      technician_id,
      fix_detail,
      service_price,
      repair_item_id,
      parts_usage, // 💡 รายการอะไหล่ที่ใช้: [{ part_id, quantity }]
      // ฟิลด์จาก RepairTable (History Edit)
      requester_name,
      requester_dept,
      requester_phone,
      requester_position,
      requester_emp_code,
      problem_detail,
      assets_number,
      manual_contract,
      type_item
    } = body

    const repairId = parseInt(id)

    if (isNaN(repairId)) {
      return NextResponse.json({ success: false, error: 'ID ไม่ถูกต้อง' }, { status: 400 })
    }

    // 1. อัปเดตข้อมูลการซ่อมหลัก (เฉพาะฟิลด์ที่ส่งมาเท่านั้น)
    const repairUpdates: any = {}

    if (status !== undefined) repairUpdates.status = status
    if (technician_name !== undefined) repairUpdates.technician_name = technician_name
    if (technician_id !== undefined) repairUpdates.user_id = technician_id
    if (fix_detail !== undefined) repairUpdates.fix_detail = fix_detail
    if (service_price !== undefined) repairUpdates.service_price = service_price

    if (status === 'Completed') {
      repairUpdates.repair_finish = new Date().toISOString()
    }

    const { error: repairError } = await supabase
      .from('repairs')
      .update(repairUpdates)
      .eq('id', repairId)

    if (repairError) throw repairError

    // 1.5 อัปเดตข้อมูลผู้แจ้งซ่อมในตาราง repairs (จาก History Edit)
    const requesterUpdates: any = {}
    if (requester_name !== undefined) requesterUpdates.requester_name = requester_name
    if (requester_dept !== undefined) requesterUpdates.requester_dept = requester_dept
    if (requester_phone !== undefined) requesterUpdates.requester_phone = requester_phone
    if (requester_position !== undefined) requesterUpdates.requester_position = requester_position
    if (requester_emp_code !== undefined) requesterUpdates.requester_emp_code = requester_emp_code

    if (Object.keys(requesterUpdates).length > 0) {
      const { error: requesterError } = await supabase
        .from('repairs')
        .update(requesterUpdates)
        .eq('id', repairId)

      if (requesterError) throw requesterError
    }

    // 1.6 อัปเดตข้อมูล repair_items (จาก History Edit)
    const itemUpdates: any = {}
    if (problem_detail !== undefined) itemUpdates.problem_detail = problem_detail
    if (assets_number !== undefined) itemUpdates.assets_number = assets_number
    if (manual_contract !== undefined) itemUpdates.manual_contract = manual_contract
    if (type_item !== undefined) itemUpdates.type_item = type_item

    if (Object.keys(itemUpdates).length > 0 && repair_item_id) {
      const { error: itemError } = await supabase
        .from('repair_items')
        .update(itemUpdates)
        .eq('id', repair_item_id)

      if (itemError) throw itemError
    }

    // 2. จัดการเรื่องอะไหล่ (ถ้ามีการส่งมา)
    if (parts_usage && Array.isArray(parts_usage)) {
      for (const item of parts_usage) {
        // ดึงข้อมูลราคาและสต็อกปัจจุบัน
        const { data: partData } = await supabase
          .from('spare_parts')
          .select('stock_quantity, unit_price')
          .eq('id', item.part_id)
          .single()

        if (partData) {
          const quantityUsed = item.quantity
          const unitPrice = partData.unit_price || 0
          const priceExclVat = unitPrice * quantityUsed
          const vatPercent = 7.00
          const totalPrice = priceExclVat * (1 + vatPercent / 100)

          // บันทึกการใช้งานอะไหล่พร้อมรายละเอียดราคา
          const { error: usageError } = await supabase
            .from('repair_parts_usage')
            .insert([{
              repair_id: repairId,
              part_id: item.part_id,
              quantity_used: quantityUsed,
              price_excl_vat: priceExclVat,
              vat_percent: vatPercent,
              total_price: totalPrice
            }])

          if (usageError) throw usageError

          // ตัดสต็อกอะไหล่
          await supabase
            .from('spare_parts')
            .update({ stock_quantity: partData.stock_quantity - quantityUsed })
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
