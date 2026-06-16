import { jsPDF } from "jspdf";

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

const loadFont = async (doc: jsPDF, fontName: string) => {
    try {
        const response = await fetch("/api/font");
        if (!response.ok) throw new Error("ดึงฟอนต์ผ่าน API ล้มเหลว");
        const data = await response.json();
        doc.addFileToVFS("THSarabunNew.ttf", data.font);
        doc.addFont("THSarabunNew.ttf", fontName, "normal");
        doc.setFont(fontName);
        return true;
    } catch (err) {
        console.error("ระบบฟอนต์ขัดข้อง:", err);
        return false;
    }
};

const drawOuterBorder = (doc: jsPDF) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(15, 15, 180, 267);
};

export const generateRepairPDFquick = async (repair: RepairData) => {
    const doc = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
    });

    const fontName = "THSarabunNew";
    if (!await loadFont(doc, fontName)) {
        alert("ไม่สามารถโหลดฟอนต์ภาษาไทยได้");
        return;
    }

    drawOuterBorder(doc);

    // 1. ส่วนหัวเอกสาร (แบบด่วน)
    doc.setFontSize(22);
    doc.setTextColor(220, 20, 60); // สีแดงเข้มสำหรับ "ด่วน"
    doc.text("ใบแจ้งซ่อมด่วน (Express Repair)", 105, 25, { align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`เลขที่ใบแจ้งซ่อม: ${repair.id.toString().padStart(5, '0')}`, 190, 20, { align: "right" });

    // 2. ข้อมูลผู้แจ้งซ่อม
    doc.rect(15, 32, 180, 8, 'F');
    doc.setFillColor(240, 240, 240);
    doc.rect(15, 32, 180, 8);
    doc.setFontSize(14);
    doc.text("ข้อมูลผู้แจ้งซ่อม", 20, 37.5);

    doc.rect(15, 40, 180, 25);
    doc.text(`ชื่อ-นามสกุล: ${repair.requester_name}`, 20, 47);
    doc.text(`หน่วยงาน/แผนก: ${repair.requester_dept}`, 110, 47);
    doc.text(`เบอร์โทรศัพท์: ${repair.requester_phone || "-"}`, 20, 54);
    doc.text(`วันที่แจ้งซ่อม: ${new Date(repair.repair_date).toLocaleDateString("th-TH")}`, 110, 54);

    // 3. รายละเอียดอุปกรณ์
    doc.rect(15, 70, 180, 8);
    doc.text("รายละเอียดอุปกรณ์", 20, 75.5);

    doc.rect(15, 78, 180, 25);
    doc.text(`อุปกรณ์: ${repair.item?.manual_brand || "-"}`, 20, 85);
    doc.text(`ประเภท: ${repair.item?.type_item || "-"}`, 110, 85);
    doc.text(`เลขครุภัณฑ์: ${repair.item?.assets_number || "-"}`, 20, 92);
    doc.text(`อาการเสียที่แจ้ง: ${repair.item?.problem_detail || "-"}`, 20, 99);

    // 4. บันทึกการแก้ไข (แบบด่วน - ย่อส่วน)
    doc.rect(15, 110, 180, 8);
    doc.text("สรุปผลการซ่อม (สำหรับช่าง)", 20, 115.5);

    doc.rect(15, 118, 180, 35);
    doc.text(`ช่างผู้ดำเนินการ: ${repair.technician_name || "-"}`, 20, 125);
    doc.text(`วันที่เสร็จสิ้น: ${repair.repair_finish ? new Date(repair.repair_finish).toLocaleDateString("th-TH") : "-"}`, 110, 125);
    
    doc.text("ผลการดำเนินการ:", 20, 132);
    const splitFix = doc.splitTextToSize(repair.fix_detail || "-", 170);
    doc.text(splitFix, 25, 139);

    // 5. ส่วนลงนาม (แบบย่อ)
    const sigY = 165;
    const sigBoxWidth = 80;
    const sigBoxHeight = 30;

    doc.rect(20, sigY, sigBoxWidth, sigBoxHeight);
    doc.text("ผู้แจ้งซ่อม", 20 + sigBoxWidth/2, sigY + 7, { align: "center" });
    doc.text("ลงชื่อ..................................................", 20 + sigBoxWidth/2, sigY + 20, { align: "center" });

    doc.rect(110, sigY, sigBoxWidth, sigBoxHeight);
    doc.text("ช่างผู้ดำเนินการ", 110 + sigBoxWidth/2, sigY + 7, { align: "center" });
    doc.text("ลงชื่อ..................................................", 110 + sigBoxWidth/2, sigY + 20, { align: "center" });

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`ใบแจ้งซ่อมฉบับด่วน พิมพ์เมื่อวันที่ ${new Date().toLocaleString("th-TH")}`, 105, 275, { align: "center" });

    doc.save(`ใบแจ้งซ่อมด่วน${repair.id}_${repair.requester_name}.pdf`);
};
