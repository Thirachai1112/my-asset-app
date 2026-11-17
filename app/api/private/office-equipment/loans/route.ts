import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyPrivateIP, forbiddenResponse } from '@/utils/ip-verifier'

export async function GET(req: NextRequest) {
  if (!verifyPrivateIP(req)) return forbiddenResponse()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const equipmentId = searchParams.get('equipment_id')
  const peaSiteId = searchParams.get('pea_site_id')
  const search = searchParams.get('search')
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.max(1, Number.parseInt(searchParams.get('limit') || '20', 10) || 20)
  const from = (page - 1) * limit

  try {
    const supabase = createAdminClient()
    let countQuery = supabase
      .from('officeequipmentloans')
      .select('id, officeequipments!inner(pea_site_id)', { count: 'exact', head: true })
    let dataQuery = supabase
      .from('officeequipmentloans')
      .select(`
        *,
        office_equipment:officeequipments!inner(
          id, name, ip_address, mac_address, pea_site_id, status
        )
      `)

    if (equipmentId) {
      countQuery = countQuery.eq('equipment_id', Number.parseInt(equipmentId, 10))
      dataQuery = dataQuery.eq('equipment_id', Number.parseInt(equipmentId, 10))
    }

    if (status === 'active') {
      countQuery = countQuery.is('returned_at', null)
      dataQuery = dataQuery.is('returned_at', null)
    } else if (status === 'returned') {
      countQuery = countQuery.not('returned_at', 'is', null)
      dataQuery = dataQuery.not('returned_at', 'is', null)
    }

    if (search) {
      countQuery = countQuery.ilike('borrower_name', `%${search}%`)
      dataQuery = dataQuery.ilike('borrower_name', `%${search}%`)
    }

    if (peaSiteId) {
      const siteId = Number.parseInt(peaSiteId, 10)
      countQuery = countQuery.eq('officeequipments.pea_site_id', siteId)
      dataQuery = dataQuery.eq('officeequipments.pea_site_id', siteId)
    }

    const [{ count, error: countError }, { data, error }] = await Promise.all([
      countQuery,
      dataQuery.order('borrowed_at', { ascending: false }).range(from, from + limit - 1),
    ])
    if (countError) throw countError
    if (error) throw error

    const total = count || 0
    return NextResponse.json({
      success: true,
      data,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('[GET /api/private/office-equipment/loans] Supabase error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
