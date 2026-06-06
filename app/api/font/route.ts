// app/api/font/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // 1. ลองหาแบบโปรเจกต์ทั่วไป (Root level)
    let fontPath = path.join(process.cwd(), "public", "fonts", "THSarabunNew.ttf");
    
    // 2. ถ้าไม่เจอ ลองหาแบบ src/ directory (เผื่อช่างใช้โครงสร้างแบบมี src)
    if (!fs.existsSync(fontPath)) {
      fontPath = path.join(process.cwd(), "src", "public", "fonts", "THSarabunNew.ttf");
    }

    // 3. ถ้ายังไม่เจออีก รอบนี้ให้พิมพ์บอกใน Terminal เลยว่าระบบวิ่งไปหาที่ไหนแล้วไม่เจอ
    if (!fs.existsSync(fontPath)) {
      const serverTargetRoot = path.join(process.cwd(), "public", "fonts");
      console.error(`❌ [Font Error] หาไฟล์ไม่เจอ! กรุณานำไฟล์ฟอนต์ไปวางไว้ที่พิกัดนี้ในเครื่องช่าง: ${serverTargetRoot}`);
      return NextResponse.json({ error: `ไม่พบไฟล์ฟอนต์ในเซิร์ฟเวอร์` }, { status: 404 });
    }

    // อ่านไฟล์ระบบดิบ (Buffer) ส่งกลับหน้าบ้าน
    const fontBuffer = fs.readFileSync(fontPath);
    const base64Font = fontBuffer.toString("base64");

    return NextResponse.json({ font: base64Font });
  } catch (error) {
    console.error(" เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" }, { status: 500 });
  }
}