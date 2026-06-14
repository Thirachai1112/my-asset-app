import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// 1. GET: ดึงรายการซ่อมทั้งหมด พร้อมข้อมูลจาก repair_items
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: repairs, error } = await supabase
      .from('repairs')
      .select(`
        *,
        repair_items (
          *
        )
      `)
      .order('id', { ascending: false })

    if (error) {
      console.error('[GET /api/repairs] Supabase error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // 2. ดึงข้อมูลเอกสารที่เกี่ยวข้อง
    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .not('repair_id', 'is', null)

    // 3. ดึงข้อมูลค่าใช้จ่ายอะไหล่
    const { data: partCosts } = await supabase
      .from('repair_parts_usage')
      .select('repair_id, total_price, quantity_used')

    // แปรรูปข้อมูลให้แบน (Flatten) และแนบเอกสารพร้อมคำนวณราคา
    const formattedData = repairs.map((r: any) => {
      const repairDocs = documents?.filter((doc: any) => Number(doc.repair_id) === Number(r.id)) || []
      
      // คำนวณยอดรวมอะไหล่และจำนวน
      const repairParts = partCosts?.filter((p: any) => Number(p.repair_id) === Number(r.id)) || []
      const totalPartsCost = repairParts.reduce((sum: number, p: any) => sum + (Number(p.total_price) || 0), 0)
      const totalPartsQty = repairParts.reduce((sum: number, p: any) => sum + (Number(p.quantity_used) || 0), 0)

      return {
        ...r,
        item: r.repair_items?.[0] || null,
        documents: repairDocs,
        file_url: repairDocs.length > 0 ? repairDocs[0].file_url : null,
        total_parts_cost: totalPartsCost,
        total_parts_qty: totalPartsQty,
        grand_total: totalPartsCost + (Number(r.service_price) || 0)
      }
    })

    return NextResponse.json({ success: true, data: formattedData })
  } catch (err) {
    console.error('[GET /api/repairs] Exception:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

// 2. POST: เพิ่มรายการแจ้งซ่อมใหม่ (Manual Input ทั้งหมด)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { 
      problem_detail, 
      requester_name, 
      requester_dept, 
      requester_phone,
      requester_position,
      requester_emp_code,
      manual_brand,
      manual_sn,
      assets_number,
      manual_contract,
      type_item
    } = body

    if (!manual_brand || !problem_detail) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุชื่ออุปกรณ์และอาการเสีย' }, { status: 400 })
    }

    // 1. บันทึกลงตาราง repairs
    const { data: repairData, error: repairError } = await supabase
      .from('repairs')
      .insert([
        {
          requester_name,
          requester_dept,
          requester_phone,
          requester_position,
          requester_emp_code,
          status: 'Pending'
        }
      ])
      .select()

    if (repairError) throw repairError
    const newRepair = repairData[0]

    // 2. บันทึกลงตาราง repair_items
    const { error: itemError } = await supabase
      .from('repair_items')
      .insert([
        {
          repair_id: newRepair.id,
          problem_detail,
          manual_brand,
          manual_sn: manual_sn || null,
          assets_number: assets_number || null,
          manual_contract: manual_contract || null,
          type_item: type_item || null,
          status: 'Under Repair'
        }
      ])

    if (itemError) throw itemError

    return NextResponse.json({ success: true, data: newRepair }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/repairs] Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
