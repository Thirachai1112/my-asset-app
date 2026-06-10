// app/borrows/request/generateBorrowPDF.ts
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface Asset {
    id: number;
    asset_code: string;
    name: string;
    brand?: string;
    type?: string;
    serial_number?: string;
    contract_number?: string;
    quantity: number; 
}

interface BorrowData {
    borrower_name: string;
    borrower_purpose: string;
    department: string;
    phone: string;
    return_date: string;
    position?: string; // เพิ่ม position ในข้อมูลการยืม
}

export const generateBorrowPDF = async (borrowData: BorrowData, items: Asset[]) => {
    const doc = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4", // กว้าง 210mm x สูง 297mm
    });

    const fontName = "THSarabunNew";

    // ฟังก์ชันช่วยสำหรับวาดกรอบนอก (Outer Border Box) เพื่อใช้ซ้ำกรณีขึ้นหน้าใหม่
    const drawOuterBorder = () => {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.4);
        doc.rect(15, 15, 180, 267); // ขอบซ้าย 15mm กว้าง 180mm สิ้นสุดที่ 195mm พอดี
    };

    // ==========================================
    // 🔤 ระบบดาวน์โหลดฟอนต์ภาษาไทยผ่าน API
    // ==========================================
    try {
        const response = await fetch("/api/font");
        if (!response.ok) throw new Error("ดึงฟอนต์ผ่าน API ล้มเหลว");
        
        const data = await response.json();
        const cleanBase64 = data.font;

        doc.addFileToVFS("THSarabunNew.ttf", cleanBase64);
        doc.addFont("THSarabunNew.ttf", fontName, "normal");
        doc.setFont(fontName);
    } catch (err) {
        console.error("ระบบฟอนต์ขัดข้อง:", err);
        alert("ไม่สามารถโหลดฟอนต์ภาษาไทยได้ กรุณาตรวจเช็กไฟล์หลังบ้านครับ");
        return;
    }

    // วาดกรอบนอกหน้าแรก
    drawOuterBorder();

    // ==========================================
    // 1. ส่วนหัวเอกสาร (Header Zone)
    // ==========================================
    doc.setFontSize(20);
    doc.text("เอกสารการขอยืมอุปกรณ์", 105, 24, { align: "center" });

    // กล่องที่ 1: บล็อกวันที่และข้อมูลเวลา (ปรับให้ชิดขอบ 15mm - 195mm)
    doc.rect(15, 29, 180, 8); 
    doc.setFontSize(14);
    doc.text(`วันที่ทำรายการ: ${new Date().toLocaleDateString("th-TH")}`, 19, 34);
    doc.text(`กำหนดส่งคืน: ${new Date(borrowData.return_date).toLocaleDateString("th-TH")}`, 115, 34);

    // 🌟 กล่องที่ 2: บล็อกข้อมูลผู้ขอยืม (ขยายความสูงเป็น 24mm เพื่อรองรับ 3 แถว)
    doc.rect(15, 40, 180, 24);
    doc.setFontSize(14);
    
    // แถวที่ 1: ชื่อ และ ตำแหน่ง
    doc.text(`ชื่อ-นามสกุล ผู้ขอยืม: ${borrowData.borrower_name}`, 19, 46);
    doc.text(`ตำแหน่ง: ${borrowData.position || "-"}`, 115, 46);
    
    // แถวที่ 2: แผนก และ เบอร์โทรศัพท์
    doc.text(`แผนก/ฝ่าย/กอง: ${borrowData.department}`, 19, 53);
    doc.text(`เบอร์โทรศัพท์: ${borrowData.phone}`, 115, 53);
    
    // แถวที่ 3: วัตถุประสงค์
    doc.text(`วัตถุประสงค์: ${borrowData.borrower_purpose || "-"}`, 19, 60);

    // ==========================================
    // 2. ส่วนตารางรายการครุภัณฑ์ (AutoTable Mode 🚀)
    // ==========================================
    const tableBodyData = items.map((item, index) => [
        index + 1,
        item.asset_code || "-",
        item.name || "-",
        item.brand || "-",
        `${item.quantity || 1} ชิ้น`, 
        item.type || "-",
        item.serial_number || "-",
        item.contract_number || "-"
    ]);

    autoTable(doc, {
        startY: 69, // 🌟 ขยับลงมาที่ 69 เพื่อไม่ให้ชนท้ายกล่องข้อความข้อมูลผู้ขอยืม
        head: [['ลำดับ', 'รหัสทรัพย์สิน', 'ชื่ออุปกรณ์', 'แบรนด์', 'จำนวน', 'ประเภท', 'Serial Number', 'เลขที่สัญญา']],
        body: tableBodyData,
        theme: 'grid', 
        
        styles: {
            font: fontName,
            fontSize: 12,          
            cellPadding: 3,
            valign: 'middle',
            overflow: 'linebreak', 
            lineColor: [0, 0, 0],  
            lineWidth: 0.3,
            fontStyle: 'normal',
        },
        
        headStyles: {
            fillColor: [245, 245, 245], 
            textColor: [0, 0, 0],
            font: fontName,  
            fontStyle: 'normal',   
            halign: 'center',
        },

        columnStyles: {
            0: { cellWidth: 10, halign: 'center' }, 
            1: { cellWidth: 25, halign: 'center' }, 
            2: { cellWidth: 40, halign: 'left' },   
            3: { cellWidth: 20, halign: 'center' }, 
            4: { cellWidth: 15, halign: 'center' }, 
            5: { cellWidth: 20, halign: 'center' }, 
            6: { cellWidth: 25, halign: 'center' }, 
            7: { cellWidth: 25, halign: 'center' }  
        },

        margin: { left: 15, right: 15 }, // 🌟 ปรับเป็น 15mm เพื่อให้หน้าตารางขอบตรงกับกล่องพอดี
        
        didDrawPage: (data) => {
            if (data.pageNumber > 1) {
                drawOuterBorder();
                doc.setFont(fontName); // ป้องกันฟอนต์เพี้ยนเป็นสี่เหลี่ยมเมื่อขึ้นหน้าใหม่
            }
        }
    });

    // ==========================================
    // 3. ส่วนลงนามลายเซ็น 4 ช่อง (Signature Zone)
    // ==========================================
    const finalTableY = (doc as any).lastAutoTable?.finalY || 188;
    
    const sigBoxWidth = 82; // 🌟 ขยายกล่องเป็น 82mm เพื่อให้รับกับ Grid พอดี
    const sigBoxHeight = 33;
    const spaceRequired = sigBoxHeight * 2 + 20; 
    const pageHeight = doc.internal.pageSize.height; 
    const maxAllowedY = pageHeight - 15 - spaceRequired; 

    let currentY = finalTableY;

    // ตรวจสอบพื้นที่ลายเซ็น
    if (finalTableY > maxAllowedY) {
        doc.addPage();       
        drawOuterBorder();   
        doc.setFont(fontName);
        currentY = 20;       
    }

    // วาดเส้นคั่นโซนพยาน (กว้างเริ่ม 15 ถึง 195 เท่ากับขอบอื่นๆ ทั้งหน้ากระดาษ)
    const dividerY = currentY + 6;
    doc.setDrawColor(0, 0, 0); 
    doc.setLineWidth(0.4);
    doc.line(15, dividerY, 195, dividerY);
    
    // 🌟 จัดขอบซ้าย-ขวาแบบสมมาตร: ซ้ายเริ่ม 15 | ขวาเริ่ม 113 จบที่ 195 เป๊ะพอดี
    const leftBoxX = 15;   
    const rightBoxX = 113; 

    const row1BoxY = dividerY + 5;
    const row2BoxY = row1BoxY + sigBoxHeight + 5;

    doc.setFontSize(14);

    // --- แถวที่ 1 (บน) ---
    // ช่องซ้าย: ผู้ขอยืม
    doc.rect(leftBoxX, row1BoxY, sigBoxWidth, sigBoxHeight);
    doc.text("ลงชื่อ.......................................................ผู้ขอยืม", leftBoxX + 5, row1BoxY + 11);
    doc.text("(...........................................................)", leftBoxX + 15, row1BoxY + 20);
    doc.text("วันที่......./......./.......", leftBoxX + 24, row1BoxY + 28);

    // ช่องขวา: ผู้อนุมัติ
    doc.rect(rightBoxX, row1BoxY, sigBoxWidth, sigBoxHeight);
    doc.text("ลงชื่อ.......................................................ผู้อนุมัติ", rightBoxX + 5, row1BoxY + 11);
    doc.text("(...........................................................)", rightBoxX + 15, row1BoxY + 20);
    doc.text("วันที่......./......./.......", rightBoxX + 24, row1BoxY + 28);

    // --- แถวที่ 2 (ล่าง) ---
    // ช่องซ้าย: ผู้ส่งคืน
    doc.rect(leftBoxX, row2BoxY, sigBoxWidth, sigBoxHeight);
    doc.text("ลงชื่อ.......................................................ผู้ส่งคืน", leftBoxX + 5, row2BoxY + 11);
    doc.text("(...........................................................)", leftBoxX + 15, row2BoxY + 20);
    doc.text("วันที่......./......./.......", leftBoxX + 24, row2BoxY + 28);

    // ช่องขวา: ผู้รับคืน
    doc.rect(rightBoxX, row2BoxY, sigBoxWidth, sigBoxHeight);
    doc.text("ลงชื่อ.......................................................ผู้รับคืน", rightBoxX + 5, row2BoxY + 11);
    doc.text("(...........................................................)", rightBoxX + 15, row2BoxY + 20);
    doc.text("วันที่......./......./.......", rightBoxX + 24, row2BoxY + 28);

    // ==========================================
    // 4. สั่งดาวน์โหลดไฟล์ PDF ออกมา
    // ==========================================
    doc.save(`ใบยืมครุภัณฑ์_${borrowData.borrower_name}_${Date.now()}.pdf`);
};