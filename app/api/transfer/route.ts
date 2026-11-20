import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')?.trim() || ''
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '20', 10) || 20))
  const from = (page - 1) * limit
  const to = from + limit - 1

  try {
    const supabase = createAdminClient()

    let countQuery = supabase
      .from('transferred_asset_table')
      .select('id', { count: 'exact', head: true })

    let dataQuery = supabase
      .from('transferred_asset_table')
      .select('*')

    if (search) {
      const pattern = `%${search}%`
      const searchFilter =
        `asset_code.ilike.${pattern},` +
        `sno.ilike.${pattern},` +
        `asset_details.ilike.${pattern},` +
        `owner_asset.ilike.${pattern},` +
        `employee_name.ilike.${pattern},` +
        `affiliation.ilike.${pattern},` +
        `cost_center.ilike.${pattern},` +
        `contract.ilike.${pattern},` +
        `"s/n".ilike.${pattern}`

      countQuery = countQuery.or(searchFilter)
      dataQuery = dataQuery.or(searchFilter)
    }

    const [{ count, error: countError }, { data, error }] = await Promise.all([
      countQuery,
      dataQuery.order('id', { ascending: true }).range(from, to),
    ])

    if (countError) throw countError
    if (error) throw error

    const total = count || 0

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[GET /api/transfer] Supabase error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}