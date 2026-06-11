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
    position?: string;
}

export const generateBorrowPDF = async (borrowData: BorrowData, items: Asset[]) => {
    const doc = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
    });

    const fontName = "THSarabunNew";

    const drawOuterBorder = () => {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.4);
        doc.rect(15, 15, 180, 267);
    };

    // 🔤 ระบบโหลดฟอนต์
    try {
        const response = await fetch("/api/font");
        if (!response.ok) throw new Error("ดึงฟอนต์ผ่าน API ล้มเหลว");
        const data = await response.json();
        doc.addFileToVFS("THSarabunNew.ttf", data.font);
        doc.addFont("THSarabunNew.ttf", fontName, "normal");
        doc.setFont(fontName);
    } catch (err) {
        console.error("ระบบฟอนต์ขัดข้อง:", err);
        alert("ไม่สามารถโหลดฟอนต์ภาษาไทยได้");
        return;
    }

    drawOuterBorder();

    // 1. ส่วนหัวเอกสาร
    doc.setFontSize(20);
    doc.text("เอกสารการขอยืมอุปกรณ์", 105, 24, { align: "center" });

    doc.rect(15, 29, 180, 8); 
    doc.setFontSize(14);
    doc.text(`วันที่ทำรายการ: ${new Date().toLocaleDateString("th-TH")}`, 19, 34);
    doc.text(`กำหนดส่งคืน: ${new Date(borrowData.return_date).toLocaleDateString("th-TH")}`, 115, 34);

    doc.rect(15, 40, 180, 24);
    doc.text(`ชื่อ-นามสกุล ผู้ขอยืม: ${borrowData.borrower_name}`, 19, 46);
    doc.text(`ตำแหน่ง: ${borrowData.position || "-"}`, 115, 46);
    doc.text(`แผนก/ฝ่าย/กอง: ${borrowData.department}`, 19, 53);
    doc.text(`เบอร์โทรศัพท์: ${borrowData.phone}`, 115, 53);
    doc.text(`วัตถุประสงค์: ${borrowData.borrower_purpose || "-"}`, 19, 60);

    // 2. ตารางรายการครุภัณฑ์
    const tableBodyData = items.map((item, index) => [
        index + 1, item.asset_code || "-", item.name || "-", item.brand || "-",
        `${item.quantity || 1} ชิ้น`, item.type || "-", item.serial_number || "-", item.contract_number || "-"
    ]);

    autoTable(doc, {
        startY: 69,
        head: [['ลำดับ', 'รหัสทรัพย์สิน', 'ชื่ออุปกรณ์', 'แบรนด์', 'จำนวน', 'ประเภท', 'Serial Number', 'เลขที่สัญญา']],
        body: tableBodyData,
        theme: 'grid',
        styles: { font: fontName, fontSize: 12, cellPadding: 3, valign: 'middle', lineColor: [0,0,0], lineWidth: 0.3 },
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'normal', halign: 'center' },
        columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 25, halign: 'center' }, 2: { cellWidth: 40 }, 3: { cellWidth: 20, halign: 'center' }, 4: { cellWidth: 15, halign: 'center' }, 5: { cellWidth: 20, halign: 'center' }, 6: { cellWidth: 25, halign: 'center' }, 7: { cellWidth: 25, halign: 'center' } },
        margin: { left: 15, right: 15 },
        didDrawPage: (data) => { if (data.pageNumber > 1) { drawOuterBorder(); doc.setFont(fontName); } }
    });

    // 3. ส่วนลงนามลายเซ็น (แก้ไขให้ไม่ติดขอบกระดาษ)
    const finalTableY = (doc as any).lastAutoTable?.finalY || 188;
    const pageMargin = 20; 
    const sigBoxWidth = (210 - (pageMargin * 2) - 10) / 2;
    const sigBoxHeight = 30;
    const gapY = 5;

    let currentY = finalTableY + 10;
    if (currentY + (sigBoxHeight * 2) + 20 > doc.internal.pageSize.height - 15) {
        doc.addPage();
        drawOuterBorder();
        doc.setFont(fontName);
        currentY = 25;
    }

    const drawSignatureBox = (x: number, y: number, label: string) => {
        doc.rect(x, y, sigBoxWidth, sigBoxHeight);
        doc.text(`ลงชื่อ......................................${label}`, x + 7, y + 10);
        doc.text("(..........................................)", x + 12, y + 20);
        doc.text("วันที่......./......./.......", x + 18, y + 27);
    };

    drawSignatureBox(pageMargin, currentY, "ผู้ขอยืม");
    drawSignatureBox(pageMargin + sigBoxWidth + 10, currentY, "ผู้อนุมัติ");
    drawSignatureBox(pageMargin, currentY + sigBoxHeight + gapY, "ผู้ส่งคืน");
    drawSignatureBox(pageMargin + sigBoxWidth + 10, currentY + sigBoxHeight + gapY, "ผู้รับคืน");

    doc.save(`ใบยืมครุภัณฑ์_${borrowData.borrower_name}_${Date.now()}.pdf`);
};