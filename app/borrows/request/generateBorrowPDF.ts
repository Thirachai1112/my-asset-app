// app/borrows/request/generateBorrowPDF.ts
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable"; // 🌟 อย่าลืมเช็กว่าได้ติดตั้ง/อิมพอร์ตตัวนี้แล้วหรือยังนะครับช่าง

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
    doc.rect(15, 15, 180, 267); 

    // ==========================================
    // 1. ส่วนหัวเอกสาร (Header Zone)
    // ==========================================
    doc.setFontSize(20);
    doc.text("เอกสารการขอยืมอุปกรณ์", 105, 24, { align: "center" });

    // กล่องที่ 1: บล็อกวันที่และข้อมูลเวลา
    doc.rect(19, 29, 172, 8); 
    doc.setFontSize(14);
    doc.text(`วันที่ทำรายการ: ${new Date().toLocaleDateString("th-TH")}`, 23, 34);
    doc.text(`กำหนดส่งคืน: ${new Date(borrowData.return_date).toLocaleDateString("th-TH")}`, 115, 34);

    // กล่องที่ 2: บล็อกข้อมูลผู้ขอยืม
    doc.rect(19, 40, 172, 18);
    doc.setFontSize(14);
    doc.text(`ชื่อ-นามสกุล ผู้ขอยืม: ${borrowData.borrower_name}`, 23, 46);
    doc.text(`แผนก/ฝ่าย/กอง: ${borrowData.department}`, 115, 46);
    doc.text(`เบอร์โทรศัพท์: ${borrowData.phone}`, 23, 53);
    doc.text(`วัตถุประสงค์: ${borrowData.borrower_purpose || "-"}`, 115, 53);

    // ==========================================
    // 2. ส่วนตารางรายการครุภัณฑ์ (AutoTable Mode 🚀)
    // ==========================================
    
    // แปลงข้อมูลไอเทมให้เข้า Format ของ autoTable Body
    const tableBodyData = items.map((item, index) => [
        index + 1,
        item.asset_code || "-",
        item.name || "-",
        item.brand || "-",
        item.type || "-",
        item.serial_number || "-",
        item.contract_number || "-"
    ]);

    autoTable(doc, {
        startY: 63, // เริ่มวาดต่อจากบล็อกข้อมูลด้านบน
        head: [['ลำดับ', 'รหัสทรัพย์สิน', 'ชื่ออุปกรณ์', 'แบรนด์', 'ประเภท', 'Serial Number', 'เลขที่สัญญา']],
        body: tableBodyData,
        theme: 'grid', // ใช้ธีมเส้นตารางครบช่องตาราง
        
        // 🛠️ กำหนดสไตล์ภาพรวม (การตัดคำและฟอนต์)
        styles: {
            font: 'THSarabunNew',
            fontSize: 12,          // ปรับขนาดฟอนต์ลงเล็กน้อยเพื่อความกระชับเหมาะสม
            cellPadding: 3,
            valign: 'middle',
            overflow: 'linebreak', // 🌟 ไฮไลต์เด็ด: ถ้ายาวเกินขอบคอลัมน์จะตัดขึ้นบรรทัดใหม่ให้อัตโนมัติ!
            lineColor: [0, 0, 0],  // สีเส้นตารางเป็นสีดำ
            lineWidth: 0.3,
            fontStyle: 'normal',
        },
        
       headStyles: {
            fillColor: [245, 245, 245], 
            textColor: [0, 0, 0],
            font: 'THSarabunNew',  // 🌟 บังคับย้ำฟอนต์ภาษาไทยให้หัวตารางอีกที
            fontStyle: 'normal',   // 🌟 เปลี่ยนจาก 'bold' เป็น 'normal' เพื่อแก้ปัญหิตัวอักษรต่างดาว
            halign: 'center',
        },

        // 📐 ล็อกความกว้างคอลัมน์ไม่ให้เบียดกัน (รวมกันได้ 172mm เท่าขนาดกล่องเดิมเป๊ะ)
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' }, // ลำดับ
            1: { cellWidth: 26, halign: 'center' }, // รหัสทรัพย์สิน
            2: { cellWidth: 42, halign: 'left' },   // ชื่ออุปกรณ์ (ให้พื้นที่มากที่สุด เผื่อชื่อรุ่นยาว)
            3: { cellWidth: 20, halign: 'center' }, // แบรนด์
            4: { cellWidth: 22, halign: 'center' }, // ประเภท
            5: { cellWidth: 28, halign: 'center' }, // Serial Number
            6: { cellWidth: 24, halign: 'center' }  // เลขที่สัญญา
        },

        margin: { left: 19, right: 19 }, // บังคับชิดขอบซ้ายขวาที่ 19mm ให้เท่ากับกล่องข้อมูลด้านบน
    });

    // ==========================================
    // 3. ส่วนลงนามลายเซ็น 4 ช่อง (Signature Zone)
    // ==========================================
    // ใช้คำสั่งนี้หาตำแหน่งวายล่าสุดท้ายของตาราง เพื่อให้โซนเซ็นไม่ซ้อนทับตารางกรณีตารางสั้นหรือยาว
    const finalTableY = (doc as any).lastAutoTable.finalY || 188;
    
    // วาดเส้นคั่นโซนพยาน (ให้อยู่ห่างจากขอบตารางชิ้นสุดท้ายลงมา 6 มิลลิเมตร)
    const dividerY = finalTableY + 6;
    doc.setDrawColor(0, 0, 0); 
    doc.setLineWidth(0.4);
    doc.line(15, dividerY, 195, dividerY);

    const sigBoxWidth = 80;
    const sigBoxHeight = 33;
    
    const leftBoxX = 22;   // พิกัดกล่องฝั่งซ้าย
    const rightBoxX = 108; // พิกัดกล่องฝั่งขวา

    // คำนวณพิกัด Y ของบล็อกเซ็นลายมือชื่อให้อยู่ต่อจากเส้นแบ่งแนวขวางอย่างพอดี
    const row1BoxY = dividerY + 5;
    const row2BoxY = row1BoxY + sigBoxHeight + 5;

    // --- แถวที่ 1 (บน) ---
    // ช่องซ้าย: ผู้ขอยืม
    doc.rect(leftBoxX, row1BoxY, sigBoxWidth, sigBoxHeight);
    doc.text("ลงชื่อ.......................................................ผู้ขอยืม", leftBoxX + 4, row1BoxY + 11);
    doc.text(`( ${borrowData.borrower_name} )`, leftBoxX + 14, row1BoxY + 20);
    doc.text("วันที่......./......./.......", leftBoxX + 22, row1BoxY + 28);

    // ช่องขวา: ผู้อนุมัติ
    doc.rect(rightBoxX, row1BoxY, sigBoxWidth, sigBoxHeight);
    doc.text("ลงชื่อ.......................................................ผู้อนุมัติ", rightBoxX + 4, row1BoxY + 11);
    doc.text("(...........................................................)", rightBoxX + 14, row1BoxY + 20);
    doc.text("วันที่......./......./.......", rightBoxX + 22, row1BoxY + 28);

    // --- แถวที่ 2 (ล่าง) ---
    // ช่องซ้าย: ผู้ส่งคืน
    doc.rect(leftBoxX, row2BoxY, sigBoxWidth, sigBoxHeight);
    doc.text("ลงชื่อ.......................................................ผู้ส่งคืน", leftBoxX + 4, row2BoxY + 11);
    doc.text("(...........................................................)", leftBoxX + 14, row2BoxY + 20);
    doc.text("วันที่......./......./.......", leftBoxX + 22, row2BoxY + 28);

    // ช่องขวา: ผู้รับคืน
    doc.rect(rightBoxX, row2BoxY, sigBoxWidth, sigBoxHeight);
    doc.text("ลงชื่อ.......................................................ผู้รับคืน", rightBoxX + 4, row2BoxY + 11);
    doc.text("(...........................................................)", rightBoxX + 14, row2BoxY + 20);
    doc.text("วันที่......./......./.......", rightBoxX + 22, row2BoxY + 28);

    // ==========================================
    // 4. สั่งดาวน์โหลดไฟล์ PDF ออกมา
    // ==========================================
    doc.save(`ใบยืมครุภัณฑ์_${borrowData.borrower_name}_${Date.now()}.pdf`);
};