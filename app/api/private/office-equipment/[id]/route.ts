import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { findEquipmentDuplicates } from '@/utils/office-equipment'
import { verifyPrivateIP, forbiddenResponse } from '@/utils/ip-verifier'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyPrivateIP(req)) return forbiddenResponse()

  const { id } = await params
  const equipId = Number.parseInt(id, 10)
  if (!Number.isInteger(equipId)) {
    return NextResponse.json({ error: 'Invalid Equipment ID' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('officeequipments')
      .select('*')
      .eq('id', equipId)
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/private/office-equipment/:id] Supabase error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyPrivateIP(req)) return forbiddenResponse()

  const { id } = await params
  const equipId = Number.parseInt(id, 10)
  if (!Number.isInteger(equipId)) {
    return NextResponse.json({ error: 'Invalid Equipment ID' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const body = await req.json()
    const {
      name, ip_address, mac_address, department, pea_site_id, equipment_type, status, notes,
      contract_no, contract_start_date, contract_expiry_date, vendor, serial_number, asset_number,
      asset_owner, asset_owner_emp_id, storage_location,
    } = body

    const { data: currentEquipment, error: fetchError } = await supabase
      .from('officeequipments')
      .select('*')
      .eq('id', equipId)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!currentEquipment) return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })

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

    if (status && status !== currentEquipment.status) {
      const { data: activeLoan, error } = await supabase
        .from('officeequipmentloans')
        .select('id')
        .eq('equipment_id', equipId)
        .is('returned_at', null)
        .limit(1)
        .maybeSingle()

      if (error) throw error
      if (activeLoan) {
        return NextResponse.json({ error: 'Cannot change status while equipment is borrowed. Return it first.' }, { status: 400 })
      }
    }

    const duplicates = await findEquipmentDuplicates(
      supabase,
      { ip_address, mac_address, serial_number, asset_number },
      equipId,
    )
    if (duplicates.length > 0) {
      return NextResponse.json({ error: duplicates.join(', ') }, { status: 400 })
    }

    const rawPayload = {
      name, ip_address, mac_address, department, pea_site_id, equipment_type, status, notes,
      contract_no, contract_start_date, contract_expiry_date, vendor, serial_number, asset_number,
      asset_owner, asset_owner_emp_id, storage_location,
    }
    const updatePayload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(rawPayload)) {
      if (value !== undefined && value !== null && value !== '') {
        updatePayload[key] = value
      }
    }

    const isChanged = Object.entries(updatePayload).some(
      ([key, value]) => currentEquipment[key] !== value,
    )
    if (!isChanged) {
      return NextResponse.json({ success: true, message: 'No changes detected' })
    }

    const { data, error } = await supabase
      .from('officeequipments')
      .update(updatePayload)
      .eq('id', equipId)
      .select()
      .single()

    if (error) throw error

    const ownerChanged = (
      (asset_owner && asset_owner !== currentEquipment.asset_owner) ||
      (asset_owner_emp_id && asset_owner_emp_id !== currentEquipment.asset_owner_emp_id)
    )
    if (ownerChanged) {
      const { error: logError } = await supabase
        .from('officeequipmentauditlogs')
        .insert({
          action_type: 'ASSET_INFO_CHANGE',
          target_table: 'officeequipments',
          target_id: equipId,
          notes: `Asset owner updated from '${currentEquipment.asset_owner}' to '${asset_owner}'`,
        })

      if (logError) throw logError
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[PUT /api/private/office-equipment/:id] Supabase error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyPrivateIP(req)) return forbiddenResponse()

  const { id } = await params
  const equipId = Number.parseInt(id, 10)
  if (!Number.isInteger(equipId)) {
    return NextResponse.json({ error: 'Invalid Equipment ID' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('officeequipments')
      .delete()
      .eq('id', equipId)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    return NextResponse.json({ success: true, message: 'Equipment deleted successfully' })
  } catch (error) {
    console.error('[DELETE /api/private/office-equipment/:id] Supabase error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
