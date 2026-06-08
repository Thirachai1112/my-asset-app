// app/borrows/request/generateBorrowPDF.ts
import { jsPDF } from "jspdf";

interface Asset {
    id: number;
    asset_code: string;
    name: string;
    brand?: string;
    type?: string;
    serial_number?: string;
    contract_number?: string;
}

interface BorrowData {
    borrower_name: string;
    borrower_purpose: string;
    department: string;
    phone: string;
    return_date: string;
}

export const generateBorrowPDF = async (borrowData: BorrowData, items: Asset[]) => {
    const doc = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4", // กว้าง 210mm x สูง 297mm
    });

    // ==========================================
    // 🔤 ระบบดาวน์โหลดฟอนต์ภาษาไทยผ่าน API
    // ==========================================
    try {
        const response = await fetch("/api/font");
        if (!response.ok) throw new Error("ดึงฟอนต์ผ่าน API ล้มเหลว");
        
        const data = await response.json();
        const cleanBase64 = data.font;

        doc.addFileToVFS("THSarabunNew.ttf", cleanBase64);
        doc.addFont("THSarabunNew.ttf", "THSarabunNew", "normal");
        doc.setFont("THSarabunNew");
    } catch (err) {
        console.error("ระบบฟอนต์ขัดข้อง:", err);
        alert("ไม่สามารถโหลดฟอนต์ภาษาไทยได้ กรุณาตรวจเช็กไฟล์หลังบ้านครับ");
        return;
    }

    // ==========================================
    // 📐 วาดเส้นโครงสร้างกรอบหลักภายนอก (Outer Border Box)
    // ==========================================
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    // วาดกล่องใหญ่ครอบทั้งหน้า (เว้นระยะขอบกว้าง 15mm รอบกระดาษ)
    // rect(x, y, width, height) -> กว้าง 180mm, สูง 267mm
    doc.rect(15, 15, 180, 267); 

    // ==========================================
    // 1. ส่วนหัวเอกสาร (Header Zone)
    // ==========================================
    doc.setFontSize(20);
    doc.text("เอกสารการขอยืมอุปกรณ์", 105, 24, { align: "center" });

    // กล่องที่ 1: บล็อกวันที่และข้อมูลเวลา (ตรงกับกล่องเรียวบนสุดในแบบ)
    doc.rect(19, 29, 172, 8); 
    doc.setFontSize(14);
    doc.text(`วันที่ทำรายการ: ${new Date().toLocaleDateString("th-TH")}`, 23, 34);
    doc.text(`กำหนดส่งคืน: ${new Date(borrowData.return_date).toLocaleDateString("th-TH")}`, 115, 34);

    // กล่องที่ 2: บล็อกข้อมูลผู้ขอยืม (ตรงกับกล่องข้อความผู้ขอยืม)
    doc.rect(19, 40, 172, 18);
    doc.setFontSize(14);
    doc.text(`ชื่อ-นามสกุล ผู้ขอยืม: ${borrowData.borrower_name}`, 23, 46);
    doc.text(`แผนก/ฝ่าย/กอง: ${borrowData.department}`, 115, 46);
    doc.text(`เบอร์โทรศัพท์: ${borrowData.phone}`, 23, 53);
    doc.text(`วัตถุประสงค์: ${borrowData.borrower_purpose || "-"}`, 115, 53);

    // ==========================================
    // 2. ส่วนตารางรายการครุภัณฑ์ (Table Zone - ตรงกลาง)
    // ==========================================
    const tableTopY = 63;
    const tableHeight = 125;
    const tableBottomY = tableTopY + tableHeight; // 🟢 เพิ่มประกาศตัวแปรตรงนี้เพื่อแก้บั๊กคำนวณความสูงตาราง
    
    // วาดกรอบสี่เหลี่ยมผืนผ้าภายนอกล้อมรอบตาราง
    doc.rect(19, tableTopY, 172, tableHeight);

    // แถบหัวตาราง (Table Header background)
    doc.setFillColor(245, 245, 245);
    doc.rect(19, tableTopY, 172, 9, "F"); // ระบายสีพื้น
    doc.rect(19, tableTopY, 172, 9, "D"); // วาดเส้นขอบหัวตาราง

    doc.setFontSize(13);
    doc.text("ลำดับ", 24, tableTopY + 6, { align: "center" });
    doc.text("รหัสทรัพย์สิน", 31, tableTopY + 6);
    doc.text("ชื่ออุปกรณ์", 62, tableTopY + 6);  
    doc.text("แบรนด์", 94, tableTopY + 6);    
    doc.text("ประเภท", 114, tableTopY + 6);   
    doc.text("Serial Number", 137, tableTopY + 6);
    doc.text("เลขที่สัญญา", 166, tableTopY + 6);

    // วนลูปพ่นข้อมูลในตาราง
    let currentY = tableTopY + 15;
    items.forEach((item, index) => {
        if (currentY < tableBottomY - 5) {
            doc.text(`${index + 1}`, 24, currentY, { align: "center" }); // จัดกลางเลขลำดับ
            doc.text(`${item.asset_code || "-"}`, 31, currentY);
            
            doc.text(`${item.name || "-"}`, 62, currentY);
            doc.text(`${item.brand || "-"}`, 94, currentY);
            doc.text(`${item.type || "-"}`, 114, currentY);

            doc.text(`${item.serial_number || "-"}`, 137, currentY);
            doc.text(`${item.contract_number || "-"}`, 166, currentY);

            // วาดเส้นแนวนอนจาง ๆ คั่นแต่ละรายการไอเทม
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.2);
            doc.line(19, currentY + 3, 191, currentY + 3);
            
            currentY += 10;
        }
    });

    // 🟢 ==========================================
    // 🧱 เส้นแบ่งคอลัมน์แนวตั้งกั้นช่อง (Vertical Lines)
    // ==========================================
    doc.setDrawColor(0, 0, 0); 
    doc.setLineWidth(0.4);      

    // ลากเส้นแนวดิ่งกั้นห้องข้อมูลแยกคอลัมน์ ชื่อ/แบรนด์/ประเภท ออกจากกันอย่างเป็นระเบียบ
    doc.line(29, tableTopY, 29, tableBottomY);   // คั่นหลัง "ลำดับ"
    doc.line(60, tableTopY, 60, tableBottomY);   // คั่นหลัง "รหัสทรัพย์สิน"
    doc.line(92, tableTopY, 92, tableBottomY);   // คั่นหลัง "ชื่ออุปกรณ์"
    doc.line(112, tableTopY, 112, tableBottomY); // คั่นหลัง "แบรนด์"
    doc.line(135, tableTopY, 135, tableBottomY); // คั่นหลัง "ประเภท"
    doc.line(164, tableTopY, 164, tableBottomY); // คั่นหลัง "Serial Number"

    // เส้นแบ่งฝั่งล่าง (ขีดแบ่งโซนพยาน/ลายเซ็น ด้านล่างตาราง)
    doc.line(15, 194, 195, 194);

    // ==========================================
    // 3. ส่วนลงนามลายเซ็น 4 ช่อง (Signature Zone)
    // ==========================================
    const sigBoxWidth = 80;
    const sigBoxHeight = 35;
    
    const leftBoxX = 22;   // พิกัดกล่องฝั่งซ้าย
    const rightBoxX = 108; // พิกัดกล่องฝั่งขวา

    const row1BoxY = 199;  // พิกัดกล่องแถวบน (ผู้ขอยืม - ผู้อนุมัติ)
    const row2BoxY = 240;  // พิกัดกล่องแถวล่าง (ผู้ส่งคืน - ผู้รับคืน)

    // --- แถวที่ 1 (บน) ---
    // ช่องซ้าย: ผู้ขอยืม
    doc.rect(leftBoxX, row1BoxY, sigBoxWidth, sigBoxHeight);
    doc.text("ลงชื่อ.......................................................ผู้ขอยืม", leftBoxX + 4, row1BoxY + 12);
    doc.text(`( ${borrowData.borrower_name} )`, leftBoxX + 14, row1BoxY + 22);
    doc.text("วันที่......./......./.......", leftBoxX + 22, row1BoxY + 30);

    // ช่องขวา: ผู้อนุมัติ
    doc.rect(rightBoxX, row1BoxY, sigBoxWidth, sigBoxHeight);
    doc.text("ลงชื่อ.......................................................ผู้อนุมัติ", rightBoxX + 4, row1BoxY + 12);
    doc.text("(...........................................................)", rightBoxX + 14, row1BoxY + 22);
    doc.text("วันที่......./......./.......", rightBoxX + 22, row1BoxY + 30);


    // --- แถวที่ 2 (ล่าง) ---
    // ช่องซ้าย: ผู้ส่งคืน
    doc.rect(leftBoxX, row2BoxY, sigBoxWidth, sigBoxHeight);
    doc.text("ลงชื่อ.......................................................ผู้ส่งคืน", leftBoxX + 4, row2BoxY + 12);
    doc.text("(...........................................................)", leftBoxX + 14, row2BoxY + 22);
    doc.text("วันที่......./......./.......", leftBoxX + 22, row2BoxY + 30);

    // ช่องขวา: ผู้รับคืน
    doc.rect(rightBoxX, row2BoxY, sigBoxWidth, sigBoxHeight);
    doc.text("ลงชื่อ.......................................................ผู้รับคืน", rightBoxX + 4, row2BoxY + 12);
    doc.text("(...........................................................)", rightBoxX + 14, row2BoxY + 22);
    doc.text("วันที่......./......./.......", rightBoxX + 22, row2BoxY + 30);

    // ==========================================
    // 4. สั่งดาวน์โหลดไฟล์ PDF ออกมา
    // ==========================================
    doc.save(`ใบยืมครุภัณฑ์_${borrowData.borrower_name}_${Date.now()}.pdf`);
};