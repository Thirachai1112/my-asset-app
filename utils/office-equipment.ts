import type { SupabaseClient } from '@supabase/supabase-js'

type DuplicateFields = {
  ip_address?: string | null
  mac_address?: string | null
  serial_number?: string | null
  asset_number?: string | null
}

export async function findEquipmentDuplicates(
  supabase: SupabaseClient,
  fields: DuplicateFields,
  excludeId?: number,
) {
  const columns = [
    ['ip_address', 'IP Address'],
    ['mac_address', 'MAC Address'],
    ['serial_number', 'Serial Number'],
    ['asset_number', 'Asset Number'],
  ] as const
  const duplicates: string[] = []

  for (const [column, label] of columns) {
    const value = fields[column]
    if (!value) continue

    let query = supabase
      .from('officeequipments')
      .select('name')
      .eq(column, value)

    if (excludeId !== undefined) query = query.neq('id', excludeId)

    const { data, error } = await query.limit(1).maybeSingle()
    if (error) throw error
    if (data) duplicates.push(`${label} matches existing equipment '${data.name}'`)
  }

  return duplicates
}
