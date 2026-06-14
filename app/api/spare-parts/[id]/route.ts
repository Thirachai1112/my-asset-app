import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// 1. PATCH: อัปเดตข้อมูลอะไหล่
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()
    const { 
      part_name, 
      stock_quantity, 
      unit_price, 
      part_brand, 
      part_serial_number, 
      part_date_in, 
      part_date_out 
    } = body

    const { data, error } = await supabase
      .from('spare_parts')
      .update({ 
        part_name, 
        stock_quantity, 
        unit_price, 
        part_brand, 
        part_serial_number, 
        part_date_in, 
        part_date_out 
      })
      .eq('id', id)
      .select()

    if (error) throw error
    return NextResponse.json({ success: true, data: data[0] })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// 2. DELETE: ลบรายการอะไหล่
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { error } = await supabase
      .from('spare_parts')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true, message: 'ลบสำเร็จ' })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
