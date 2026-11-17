import { NextResponse } from 'next/server'
import { createClient } from '../../../utils/supabase/server'
import { logAdminActivity } from '../../../utils/admin-logger'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: assets, error } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[GET /api/assets] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: assets })
  } catch (error) {
    console.error('[GET /api/assets] Exception:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const adminIdHeader = request.headers.get('x-admin-id')
    const body = await request.json()
    const { name, brand, asset_code, serial_number, contract_number, status, type } = body

    if (!name) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อสินทรัพย์ (name)' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('assets')
      .insert({
        name,
        brand: brand || null,
        asset_code: asset_code || null,
        serial_number: serial_number || null,
        contract_number: contract_number || null,
        status: status || 'Available',
        type: type || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (adminIdHeader) {
      await logAdminActivity(supabase, parseInt(adminIdHeader), 'CREATE_ASSET', 'assets', data.id)
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/assets] Request failed:', error)
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 })
  }
}
