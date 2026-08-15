import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// GET: ดึงข้อมูลอะไหล่รายตัว พร้อมประวัติการใช้งาน
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const partId = parseInt(id)

    if (isNaN(partId)) {
      return NextResponse.json({ success: false, error: 'ID อะไหล่ไม่ถูกต้อง' }, { status: 400 })
    }

    // 1. ดึงข้อมูลอะไหล่หลัก
    const { data: partData, error: partError } = await supabase
      .from('spare_parts')
      .select('*')
      .eq('id', partId)
      .single()

    if (partError) throw partError

    // 2. ดึงประวัติการเบิกใช้อะไหล่
    const { data: usageData, error: usageError } = await supabase
      .from('repair_parts_usage')
      .select('id, quantity_used, total_price, created_at, repair_id')
      .eq('part_id', partId)

    // กำหนด Type ให้ชัดเจนตรงนี้ เพื่อแก้ปัญหา Error 7034
    let enrichedUsages: any[] = []

    if (usageData && usageData.length > 0) {
      const repairIds = usageData.map(u => u.repair_id)
      const { data: repairData } = await supabase
        .from('repairs')
        .select(`id, repair_items(assets_number, problem_detail)`)
        .in('id', repairIds)

      enrichedUsages = usageData.map(u => ({
        ...u,
        repairs: repairData?.find(r => r.id === u.repair_id) || null
      }))
    }

    return NextResponse.json({
      success: true,
      data: { ...partData, usage_history: enrichedUsages }
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// PATCH: อัปเดตข้อมูลอะไหล่
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()
    const { part_name, stock_quantity, unit_price, part_brand, part_serial_number, part_date_in, part_date_out } = body

    const { data, error } = await supabase
      .from('spare_parts')
      .update({ part_name, stock_quantity, unit_price, part_brand, part_serial_number, part_date_in, part_date_out })
      .eq('id', id)
      .select()

    if (error) throw error
    return NextResponse.json({ success: true, data: data[0] })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// DELETE: ลบอะไหล่
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const { error } = await supabase.from('spare_parts').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true, message: 'ลบสำเร็จ' })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}