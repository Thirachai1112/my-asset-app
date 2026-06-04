import { NextResponse } from 'next/server'
import { createClient } from '../../../utils/supabase/server'

// 1. GET: ดึงรายการครุภัณฑ์ทั้งหมด
export async function GET() {
  const supabase = await createClient()
  
  const { data: assets, error } = await supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: false }) // เอาตัวใหม่ขึ้นก่อน

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: assets })
}

// 2. POST: เพิ่มครุภัณฑ์ชิ้นใหม่
export async function POST(request: Request) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { name, brand, serial_number, contract_number, status } = body

    if (!name) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อสินทรัพย์ (name)' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('assets')
      .insert([
        { 
          name, 
          brand: brand || null, 
          serial_number: serial_number || null,
          contract_number: contract_number || null,
          status: status || 'Available'
        }
      ])
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data[0] }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 })
  }
}