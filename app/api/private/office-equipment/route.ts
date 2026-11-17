import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { findEquipmentDuplicates } from '@/utils/office-equipment'
import { verifyPrivateIP, forbiddenResponse } from '@/utils/ip-verifier'

export async function GET(req: NextRequest) {
  if (!verifyPrivateIP(req)) return forbiddenResponse()

  const { searchParams } = new URL(req.url)
  const department = searchParams.get('department')
  const equipmentType = searchParams.get('equipment_type')
  const peaSiteId = searchParams.get('pea_site_id')
  const excludePeaSiteId = searchParams.get('exclude_pea_site_id')
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.max(1, Number.parseInt(searchParams.get('limit') || '20', 10) || 20)
  const from = (page - 1) * limit

  try {
    const supabase = createAdminClient()
    let countQuery = supabase.from('officeequipments').select('id', { count: 'exact', head: true })
    let dataQuery = supabase.from('officeequipments').select('*')

    if (department) {
      countQuery = countQuery.eq('department', department)
      dataQuery = dataQuery.eq('department', department)
    }
    if (equipmentType) {
      countQuery = countQuery.eq('equipment_type', equipmentType)
      dataQuery = dataQuery.eq('equipment_type', equipmentType)
    }
    if (peaSiteId) {
      countQuery = countQuery.eq('pea_site_id', Number.parseInt(peaSiteId, 10))
      dataQuery = dataQuery.eq('pea_site_id', Number.parseInt(peaSiteId, 10))
    }
    if (excludePeaSiteId) {
      countQuery = countQuery.neq('pea_site_id', Number.parseInt(excludePeaSiteId, 10))
      dataQuery = dataQuery.neq('pea_site_id', Number.parseInt(excludePeaSiteId, 10))
    }
    if (status) {
      countQuery = countQuery.eq('status', status)
      dataQuery = dataQuery.eq('status', status)
    }
    if (search) {
      countQuery = countQuery.ilike('name', `%${search}%`)
      dataQuery = dataQuery.ilike('name', `%${search}%`)
    }

    const [{ count, error: countError }, { data, error }] = await Promise.all([
      countQuery,
      dataQuery.order('created_at', { ascending: false }).range(from, from + limit - 1),
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
    console.error('[GET /api/private/office-equipment] Supabase error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!verifyPrivateIP(req)) return forbiddenResponse()

  try {
    const supabase = createAdminClient()
    const body = await req.json()
    const {
      name,
      ip_address,
      mac_address,
      department,
      pea_site_id,
      equipment_type,
      status,
      notes,
      contract_no,
      contract_start_date,
      contract_expiry_date,
      vendor,
      serial_number,
      asset_number,
      asset_owner,
      asset_owner_emp_id,
      storage_location,
    } = body

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    if (ip_address) {
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
      if (!ipv4Regex.test(ip_address)) {
        return NextResponse.json({ error: 'ip_address must be a valid IPv4 address' }, { status: 400 })
      }
    }

    if (mac_address) {
      const macRegex = /^([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})$/
      if (!macRegex.test(mac_address)) {
        return NextResponse.json({ error: 'mac_address must be formatted as xx:xx:xx:xx:xx:xx or xx-xx-xx-xx-xx-xx' }, { status: 400 })
      }
    }

    const duplicates = await findEquipmentDuplicates(supabase, { ip_address, mac_address, serial_number, asset_number })
    if (duplicates.length > 0) {
      return NextResponse.json({ error: duplicates.join(', ') }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('officeequipments')
      .insert({
        name: name.trim(),
        ip_address: ip_address || null,
        mac_address: mac_address || null,
        department: department || null,
        pea_site_id: pea_site_id ? Number.parseInt(pea_site_id, 10) : null,
        equipment_type: equipment_type || null,
        status: status || 'ใช้งาน',
        notes: notes || null,
        contract_no: contract_no || null,
        contract_start_date: contract_start_date || null,
        contract_expiry_date: contract_expiry_date || null,
        vendor: vendor || null,
        serial_number: serial_number || null,
        asset_number: asset_number || null,
        asset_owner: asset_owner || null,
        asset_owner_emp_id: asset_owner_emp_id || null,
        storage_location: storage_location || null,
      })
      .select()
      .single()

    if (error) throw error

    if (asset_owner || asset_owner_emp_id) {
      const { error: logError } = await supabase
        .from('officeequipmentauditlogs')
        .insert({
          action_type: 'ASSET_INFO_CHANGE',
          target_table: 'officeequipments',
          target_id: data.id,
          notes: `Asset owner set to ${asset_owner} (emp_id: ${asset_owner_emp_id})`,
        })

      if (logError) throw logError
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/private/office-equipment] Supabase error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
