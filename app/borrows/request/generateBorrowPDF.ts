// app/borrows/request/generateBorrowPDF.ts
import { jsPDF } from "jspdf";

interface Asset {
    id: number;
    asset_code: string;
    name: string;
    type?: string;
    serial_number?: string;
    contract_number?: string;
}

interface BorrowData {
    borrower_name: string;
    department: string;
    phone: string;
    return_date: string;
}

export const generateBorrowPDF = async (borrowData: BorrowData, items: Asset[]) => {
    const doc = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
    });

    // ==========================================
    // เรียกดึงฟอนต์ที่เสถียรที่สุดผ่านระบบ API หลังบ้าน
    // ==========================================
    try {
        const response = await fetch("/api/font");
        if (!response.ok) throw new Error("ดึงฟอนต์ผ่าน API ล้มเหลว");
        
        const data = await response.json();
        const cleanBase64 = data.font; // ได้รหัส Base64 ของแท้ที่สะอาด ไม่มีอักขระขยะฝัง

        doc.addFileToVFS("THSarabunNew.ttf", cleanBase64);
        doc.addFont("THSarabunNew.ttf", "THSarabunNew", "normal");
        doc.setFont("THSarabunNew");
        console.log('ติดตั้งระบบฟอนต์ไทยผ่านเซิร์ฟเวอร์สำเร็จ');
    } catch (err) {
        console.error("ระบบฟอนต์ขัดข้อง:", err);
        alert("ไม่สามารถโหลดฟอนต์ภาษาไทยได้ กรุณาตรวจเช็กไฟล์ในโฟลเดอร์ public/fonts ครับช่าง");
        return;
    }

    // 1. หัวเอกสาร (Header) - จุดนี้ผ่านฉลุยชัวร์เพราะโครงสร้างไบนารีฟอนต์ถูกส่งมาแบบสมบูรณ์
    doc.setFontSize(22);
    doc.text("เอกสารใบขออนุมัติยืมครุภัณฑ์", 105, 20, { align: "center" });
    
    doc.setFontSize(14);
    doc.text(`วันที่ทำรายการ: ${new Date().toLocaleDateString("th-TH")}`, 20, 32);
    doc.text(`กำหนดส่งคืน: ${new Date(borrowData.return_date).toLocaleDateString("th-TH")}`, 140, 32);

    // 2. ข้อมูลผู้ยืม
    doc.line(20, 36, 190, 36); 
    doc.setFontSize(16);
    doc.text("ข้อมูลผู้ขอยืม", 20, 44);
    doc.setFontSize(14);
    doc.text(`ชื่อ-นามสกุล: ${borrowData.borrower_name}`, 20, 52);
    doc.text(`แผนก/ฝ่าย: ${borrowData.department}`, 110, 52);
    doc.text(`เบอร์โทรศัพท์: ${borrowData.phone}`, 20, 60);
    doc.line(20, 65, 190, 65); 

    // 3. รายการอุปกรณ์ที่ยืม (ตาราง)
    doc.setFontSize(16);
    doc.text("รายการครุภัณฑ์ที่ขอยืม", 20, 73);
    
    // หัวตาราง
    doc.setFontSize(13);
    doc.setFillColor(241, 245, 249); 
    doc.rect(20, 78, 170, 8, "F");
    doc.text("ลำดับ", 25, 83);
    doc.text("รหัสครุภัณฑ์", 40, 83);
    doc.text("ชื่อครุภัณฑ์ / ประเภท", 80, 83);
    doc.text("Serial Number", 145, 83);
    
    let currentY = 92;
    items.forEach((item, index) => {
        doc.text(`${index + 1}`, 26, currentY);
        doc.text(`${item.asset_code || "-"}`, 40, currentY);
        doc.text(`${item.name} ${item.type ? `(${item.type})` : ''}`, 80, currentY);
        doc.text(`${item.serial_number || "-"}`, 145, currentY);
        
        doc.line(20, currentY + 3, 190, currentY + 3); 
        currentY += 10;
    });

    // 4. ส่วนลงนามเซ็นชื่อ (Signature Zone)
    currentY += 15;
    if (currentY > 250) { doc.addPage(); currentY = 30; } 

    doc.text("ลงชื่อ...........................................................ผู้ขอยืม", 30, currentY);
    doc.text("(...........................................................) ", 34, currentY + 8);
    doc.text(`วันที่ ......./......./.......`, 43, currentY + 16);

    doc.text("ลงชื่อ...........................................................ผู้อนุมัติ", 115, currentY);
    doc.text("(...........................................................) ", 119, currentY + 8);
    doc.text(`วันที่ ......./......./.......`, 128, currentY + 16);

    // 5. สั่งดาวน์โหลดไฟล์ PDF ออกมา
    doc.save(`ใบยืมครุภัณฑ์_${borrowData.borrower_name}_${Date.now()}.pdf`);
};