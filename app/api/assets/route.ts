import { NextResponse } from 'next/server'
import { createClient } from '../../../utils/supabase/server'
import { logAdminActivity } from '../../../utils/admin-logger'

// 1. GET: ดึงรายการครุภัณฑ์ทั้งหมด
// ... (GET remains unchanged)
export async function GET() {
  try {
    console.log('[GET /api/assets] Starting request...')
    const supabase = await createClient()
    console.log('[GET /api/assets] Supabase client created')
    
    const { data: assets, error } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false }) // เอาตัวใหม่ขึ้นก่อน

    if (error) {
      console.error('[GET /api/assets] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[GET /api/assets] Success, returned', assets?.length, 'assets')
    return NextResponse.json({ success: true, data: assets })
  } catch (err) {
    console.error('[GET /api/assets] Exception:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// 2. POST: เพิ่มครุภัณฑ์ชิ้นใหม่
export async function POST(request: Request) {
  const supabase = await createClient()
  const adminIdHeader = request.headers.get('x-admin-id')

  try {
    const body = await request.json()
    const { name, brand, asset_code, serial_number, contract_number, status, type } = body

    if (!name) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อสินทรัพย์ (name)' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('assets')
      .insert([
        { 
          name, 
          brand: brand || null,
          asset_code: asset_code || null, 
          serial_number: serial_number || null,
          contract_number: contract_number || null,
          status: status || 'Available',
          type: type || null
        }
      ])
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 📝 บันทึก Log การสร้าง
    if (adminIdHeader) {
      await logAdminActivity(supabase, parseInt(adminIdHeader), 'CREATE_ASSET', 'assets', data[0].id)
    }

    return NextResponse.json({ success: true, data: data[0] }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 })
  }
}