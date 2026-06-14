import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface RepairData {
    id: number;
    repair_date: string;
    repair_finish?: string;
    requester_name: string;
    requester_dept: string;
    requester_phone?: string;
    requester_position?: string;
    status: string;
    technician_name?: string;
    fix_detail?: string;
    item?: {
        manual_brand: string;
        assets_number?: string;
        manual_sn?: string;
        problem_detail: string;
        type_item?: string;
        manual_contract?: string;
    };
    parts?: Array<{
        part_name: string;
        quantity: number;
    }>;
}

export const generateRepairPDF = async (repair: RepairData) => {
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
    doc.setFontSize(22);
    doc.text("ใบแจ้งซ่อม / บันทึกการซ่อม", 105, 25, { align: "center" });
    doc.setFontSize(12);
    doc.text(`เลขที่ใบแจ้งซ่อม: RE-${repair.id.toString().padStart(5, '0')}`, 190, 20, { align: "right" });

    // 2. ข้อมูลผู้แจ้งซ่อม
    doc.rect(15, 32, 180, 8, 'F');
    doc.setFillColor(240, 240, 240);
    doc.rect(15, 32, 180, 8);
    doc.setFontSize(14);
    doc.text("ข้อมูลผู้แจ้งซ่อม", 20, 37.5);

    doc.rect(15, 40, 180, 25);
    doc.text(`ชื่อ-นามสกุล: ${repair.requester_name}`, 20, 47);
    doc.text(`หน่วยงาน/แผนก: ${repair.requester_dept}`, 110, 47);
    doc.text(`ตำแหน่ง: ${repair.requester_position || "-"}`, 20, 54);
    doc.text(`เบอร์โทรศัพท์: ${repair.requester_phone || "-"}`, 110, 54);
    doc.text(`วันที่แจ้งซ่อม: ${new Date(repair.repair_date).toLocaleDateString("th-TH")}`, 20, 61);

    // 3. รายละเอียดอุปกรณ์
    doc.rect(15, 70, 180, 8);
    doc.text("รายละเอียดอุปกรณ์", 20, 75.5);

    doc.rect(15, 78, 180, 32);
    doc.text(`อุปกรณ์: ${repair.item?.manual_brand || "-"}`, 20, 85);
    doc.text(`ประเภท: ${repair.item?.type_item || "-"}`, 110, 85);
    doc.text(`เลขครุภัณฑ์: ${repair.item?.assets_number || "-"}`, 20, 92);
    doc.text(`Serial Number: ${repair.item?.manual_sn || "-"}`, 110, 92);
    doc.text(`เลขที่สัญญา: ${repair.item?.manual_contract || "-"}`, 20, 99);
    doc.text(`สถานะปัจจุบัน: ${repair.status}`, 110, 99);
    doc.text(`อาการเสียที่แจ้ง: ${repair.item?.problem_detail || "-"}`, 20, 106);

    // 4. บันทึกการแก้ไข (สำหรับช่าง)
    doc.rect(15, 115, 180, 8);
    doc.text("บันทึกการแก้ไขและการดำเนินการ (สำหรับช่าง)", 20, 120.5);

    doc.rect(15, 123, 180, 45);
    doc.text(`ช่างผู้รับผิดชอบ: ${repair.technician_name || "-"}`, 20, 130);
    doc.text(`วันที่ซ่อมเสร็จ: ${repair.repair_finish ? new Date(repair.repair_finish).toLocaleDateString("th-TH") : "-"}`, 110, 130);
    
    doc.text("รายละเอียดการแก้ไข:", 20, 137);
    const splitFix = doc.splitTextToSize(repair.fix_detail || "-", 170);
    doc.text(splitFix, 25, 144);

    // 4.5 รายการอะไหล่ (ถ้ามี)
    let currentY = 175;
    if (repair.parts && repair.parts.length > 0) {
        autoTable(doc, {
            startY: 172,
            head: [['ลำดับ', 'รายการอะไหล่ที่เบิกใช้', 'จำนวน']],
            body: repair.parts.map((p, i) => [i + 1, p.part_name, `${p.quantity} ชิ้น`]),
            theme: 'grid',
            styles: { font: fontName, fontSize: 10, cellPadding: 2 },
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: 15, halign: 'center' }, 2: { cellWidth: 30, halign: 'center' } },
            margin: { left: 15, right: 15 },
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // 5. ส่วนลงนาม
    const sigY = Math.max(currentY, 215);
    const sigBoxWidth = 80;
    const sigBoxHeight = 35;

    // ฝั่งผู้แจ้งซ่อม
    doc.rect(20, sigY, sigBoxWidth, sigBoxHeight);
    doc.text("ผู้แจ้งซ่อม / ผู้รับอุปกรณ์คืน", 20 + sigBoxWidth/2, sigY + 7, { align: "center" });
    doc.text("ลงชื่อ..................................................", 20 + sigBoxWidth/2, sigY + 20, { align: "center" });
    doc.text("วันที่......../......../........", 20 + sigBoxWidth/2, sigY + 33, { align: "center" });

    // ฝั่งช่าง
    doc.rect(110, sigY, sigBoxWidth, sigBoxHeight);
    doc.text("ผู้ดำเนินการ / ผู้ส่งคืน", 110 + sigBoxWidth/2, sigY + 7, { align: "center" });
    doc.text("ลงชื่อ..................................................", 110 + sigBoxWidth/2, sigY + 20, { align: "center" });
    doc.text("วันที่......../......../........", 110 + sigBoxWidth/2, sigY + 33, { align: "center" });

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`เอกสารนี้พิมพ์โดยระบบบริหารจัดการทรัพย์สิน เมื่อวันที่ ${new Date().toLocaleString("th-TH")}`, 105, 275, { align: "center" });

    doc.save(`ใบแจ้งซ่อม_RE-${repair.id}_${repair.requester_name}.pdf`);
};
