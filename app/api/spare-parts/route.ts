import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// 1. GET: ดึงรายการอะไหล่ทั้งหมด
export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('spare_parts')
      .select('*')
      .order('id', { ascending: false })

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// 2. POST: เพิ่มอะไหล่ใหม่
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { 
      part_name, 
      stock_quantity, 
      unit_price, 
      part_brand, 
      part_serial_umber, 
      part_date_in 
    } = body

    const { data, error } = await supabase
      .from('spare_parts')
      .insert([{ 
        part_name, 
        stock_quantity, 
        unit_price, 
        part_brand, 
        part_serial_umber, 
        part_date_in: part_date_in || new Date().toISOString()
      }])
      .select()

    if (error) throw error
    return NextResponse.json({ success: true, data: data[0] }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
