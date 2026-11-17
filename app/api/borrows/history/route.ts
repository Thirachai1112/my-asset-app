import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

type BorrowDocument = {
  id: number
  borrow_id?: number | string | null
  borrow_id_int?: number | string | null
  file_url?: string | null
  [key: string]: unknown
}

type BorrowHistoryRow = {
  id: number | string
  borrower_name?: string | null
  borrow_date?: string | null
  quantity?: number | null
  documents?: BorrowDocument[]
  [key: string]: unknown
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const borrowerName = searchParams.get('borrower_name')

    let query = supabase
      .from('borrows')
      .select(`
        *,
        assets ( id, name, brand, serial_number, type, asset_code, contract_number )
      `)

    if (userId) {
      query = query.eq('user_id', Number(userId))
    } else if (borrowerName) {
      query = query.eq('borrower_name', borrowerName)
    }

    const { data: borrows, error: borrowError } = await query
      .order('id', { ascending: false })
      .limit(1000)

    if (borrowError) throw borrowError

    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('*')

    if (docError) throw docError

    const historyWithDocs = borrows.map((borrow: BorrowHistoryRow) => {
      const linkedDocuments = documents.filter((doc: BorrowDocument) => {
        const borrowId = Number(borrow.id)
        return Number(doc.borrow_id) === borrowId || Number(doc.borrow_id_int) === borrowId
      })

      return {
        ...borrow,
        documents: linkedDocuments,
        file_url: linkedDocuments.length > 0 ? linkedDocuments[0].file_url : null,
      }
    })

    const sessionGroups = groupBorrowsBySession(historyWithDocs, documents)

    return NextResponse.json({
      success: true,
      history: historyWithDocs,
      session_groups: sessionGroups,
    })
  } catch (error) {
    console.error('[GET /api/borrows/history] Request failed:', error)
    const message = error instanceof Error ? error.message : 'Server Error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    if (body.batch && Array.isArray(body.batch)) {
      if (body.batch.length === 0) {
        return NextResponse.json({ success: false, error: 'ไม่มีรายการที่ต้องการคืน' }, { status: 400 })
      }

      const now = new Date().toISOString()

      for (const item of body.batch) {
        if (!item.borrowId || !item.assetId) {
          return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วนในรายการ batch' }, { status: 400 })
        }

        const { error: borrowError } = await supabase
          .from('borrows')
          .update({ return_date: now })
          .eq('id', item.borrowId)

        if (borrowError) throw borrowError

        const { error: assetError } = await supabase
          .from('assets')
          .update({ status: 'Available' })
          .eq('id', item.assetId)

        if (assetError) throw assetError
      }

      return NextResponse.json({
        success: true,
        message: `คืนทั้งหมด ${body.batch.length} รายการเรียบร้อย`,
      })
    }

    const { borrowId, assetId } = body
    if (!borrowId || !assetId) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }

    const { error: borrowError } = await supabase
      .from('borrows')
      .update({ return_date: new Date().toISOString() })
      .eq('id', borrowId)

    if (borrowError) throw borrowError

    const { error: assetError } = await supabase
      .from('assets')
      .update({ status: 'Available' })
      .eq('id', assetId)

    if (assetError) throw assetError

    return NextResponse.json({ success: true, message: 'บันทึกสำเร็จ' })
  } catch (error) {
    console.error('[PATCH /api/borrows/history] Request failed:', error)
    const message = error instanceof Error ? error.message : 'Server Error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

function groupBorrowsBySession(borrows: BorrowHistoryRow[], documents: BorrowDocument[]) {
  const groups: Record<string, BorrowHistoryRow[]> = {}

  borrows.forEach((borrow) => {
    const date = borrow.borrow_date
      ? new Date(borrow.borrow_date).toISOString().split('T')[0]
      : 'unknown'
    const key = `${borrow.borrower_name || 'unknown'}_${date}`

    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(borrow)
  })

  return Object.entries(groups).map(([key, groupBorrows]) => {
    const groupDocIds = new Set<number>()
    groupBorrows.forEach((borrow) => {
      if (borrow.documents) {
        borrow.documents.forEach((doc) => groupDocIds.add(doc.id))
      }
    })

    const sharedDocuments = documents.filter((doc) => groupDocIds.has(doc.id))

    return {
      key,
      borrower_name: groupBorrows[0].borrower_name,
      borrow_date: groupBorrows[0].borrow_date,
      borrows: groupBorrows,
      shared_documents: sharedDocuments,
      has_documents: sharedDocuments.length > 0,
      item_count: groupBorrows.length,
      total_quantity: groupBorrows.reduce(
        (sum: number, borrow) => sum + (Number(borrow.quantity) || 1),
        0,
      ),
    }
  })
}
