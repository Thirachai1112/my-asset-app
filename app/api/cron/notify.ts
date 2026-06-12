import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  // 1. สร้าง Client ด้วย Service Role Key (ใช้สำหรับงานหลังบ้านเท่านั้น)
  // ห้ามใช้คีย์นี้ในหน้าบ้าน (Client Component) เด็ดขาด
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.SUPABASE_SERVICE_KEY! // ใส่คีย์นี้ในไฟล์ .env ของคุณ
  );

  // 2. ดึงรายการที่ยังไม่คืน และมี due_date
  const { data, error } = await supabase
    .from('borrows')
    .select('*, assets(*)')
    .is('return_date', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 3. กรองรายการที่ถึงกำหนดแล้ว
  const today = new Date();
  const urgentList = (data || []).filter((item: any) => {
    if (!item.due_date) return false;
    const dueDate = new Date(item.due_date);
    // เช็คว่าเลยกำหนด หรือเหลือเวลาอีก 1 วัน
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 1;
  });

  return NextResponse.json({ success: true, urgentList });
}