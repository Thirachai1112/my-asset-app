import { jsPDF } from "jspdf";

interface RepairData {
    id: number;
    repair_date: string;
    repair_finish?: string;
    requester_name: string;
    requester_dept: string;
    requester_phone?: string;
    requester_position?: string;
    requester_emp_code?: string;
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
        doc.addFont("THSarabunNew.ttf", fontName, "bold");
        doc.setFont(fontName);
        return true;
    } catch (err) {
        console.error("ระบบฟอนต์ขัดข้อง:", err);
        return false;
    }
};

const formatThaiDate = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "........................";
        const thaiMonths = [
            "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
            "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
        ];
        const day = date.getDate();
        const month = thaiMonths[date.getMonth()];
        const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
        return `${day} ${month} ${year}`;
    } catch {
        return "........................";
    }
};

const drawCheckbox = (doc: jsPDF, x: number, y: number, label: string, isChecked: boolean) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(x, y, 3.5, 3.5);
    if (isChecked) {
        doc.setFont("THSarabunNew", "bold");
        doc.setFontSize(14);
        doc.text("✓", x + 0.6, y + 2.8);
    }
    doc.setFont("THSarabunNew", "normal");
    doc.setFontSize(14);
    doc.text(label, x + 5, y + 3);
};

const drawPEALogo = (doc: jsPDF, x: number, y: number) => {
    // 💜 วาดตราสัญลักษณ์ กฟภ. (สีม่วง-เหลือง)
    doc.setFillColor(116, 33, 131); // ม่วง PEA
    doc.circle(x, y, 9, 'F');

    doc.setFillColor(253, 197, 0); // เหลืองทอง PEA
    doc.circle(x, y, 7, 'F');

    // แผนที่ประเทศไทยจำลองในวงกลม
    doc.setDrawColor(116, 33, 131);
    doc.setLineWidth(0.4);
    doc.line(x - 1, y - 4, x, y - 5);
    doc.line(x, y - 5, x + 1, y - 4);
    doc.line(x + 1, y - 4, x + 1.5, y - 2);
    doc.line(x + 1.5, y - 2, x + 1, y);
    doc.line(x + 1, y, x + 2, y + 2);
    doc.line(x + 2, y + 2, x + 0.5, y + 4);
    doc.line(x + 0.5, y + 4, x - 0.5, y + 4);
    doc.line(x - 0.5, y + 4, x - 1, y + 1);
    doc.line(x - 1, y + 1, x - 1.5, y - 1);
    doc.line(x - 1.5, y - 1, x - 1, y - 4);

    // ข้อความใต้โลโก้
    doc.setTextColor(116, 33, 131);
    doc.setFont("THSarabunNew", "bold");
    doc.setFontSize(15);
    doc.text("การไฟฟ้าส่วนภูมิภาค", x, y + 13, { align: "center" });
    doc.setFontSize(7.5);
    doc.text("PROVINCIAL ELECTRICITY AUTHORITY", x, y + 16.5, { align: "center" });
    doc.setTextColor(0, 0, 0); // รีเซ็ตสีกรรมการวาดรูปกลับเป็นสีดำ
};

export const generateRepairPDF = async (repair: RepairData) => {
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

    // 1. ส่วนหัวและตราสัญลักษณ์ กฟภ.
    drawPEALogo(doc, 32, 20);

    doc.setFont("THSarabunNew", "normal");
    doc.setFontSize(15);

    // เมทาดาต้าส่วนหัวบันทึกข้อความ
    // คอลัมน์ซ้าย
    doc.text("จาก", 20, 48);
    doc.setFont("THSarabunNew", "bold");
    doc.text(repair.requester_dept || "-", 35, 48);
    doc.setFont("THSarabunNew", "normal");

    doc.text("เลขที่", 20, 55);


    doc.text("เรื่อง", 20, 62);
    doc.setFont("THSarabunNew", "bold");
    doc.text("ขอให้จัดซ่อมเครื่องคอมพิวเตอร์ และอุปกรณ์ประกอบ", 35, 62);
    doc.setFont("THSarabunNew", "normal");

    doc.text("เรียน", 20, 69);
    doc.text("หผ.คข.", 35, 69);

    // คอลัมน์ขวา
    doc.text("ถึง", 110, 48);
    doc.text("กดส.ฉ.2", 120, 48);

    doc.text("วันที่", 110, 55);
    doc.text(formatThaiDate(repair.repair_date), 120, 55);

    // 2. เนื้อหารายการอุปกรณ์ที่แจ้งชำรุด
    doc.text("ขอแจ้งเครื่องชำรุดเพื่อส่งซ่อมตามรายการดังนี้.-", 25, 77);

    // ตรวจจับประเภทของอุปกรณ์เพื่อติ๊กเลือกใน Checkbox
    const type = (repair.item?.type_item || "").toLowerCase();
    const isCPU = type.includes("cpu") || type.includes("desktop") || type.includes("คอมพิวเตอร์");
    const isMonitor = type.includes("monitor") || type.includes("จอ");
    const isPrinter = type.includes("printer") || type.includes("เครื่องพิมพ์");
    const isUPS = type.includes("ups") || type.includes("สำรองไฟ");
    const isOther = !isCPU && !isMonitor && !isPrinter && !isUPS;

    // แถวที่ 1 ของ Checkboxes
    drawCheckbox(doc, 28, 83, "CPU", isCPU);
    drawCheckbox(doc, 68, 83, "Monitor", isMonitor);
    drawCheckbox(doc, 108, 83, "Printer", isPrinter);
    drawCheckbox(doc, 148, 83, "UPS", isUPS);

    // แถวที่ 2 และรายละเอียดแบรนด์/รุ่น
    drawCheckbox(doc, 28, 90, "อื่นๆ", isOther);
    if (isOther && repair.item?.type_item) {
        doc.text(repair.item.type_item, 45, 93);
    } else {
        doc.text("-", 45, 93);
    }

    doc.text("ยี่ห้อ/รุ่น", 110, 93);
    doc.text(repair.item?.manual_brand || "-", 135, 93);

    // รหัสทรัพย์สิน และสัญญาเลขที่
    doc.text("รหัสทรัพย์สิน", 25, 100);
    doc.text(repair.item?.assets_number || "-", 55, 100);

    doc.text("สัญญาเลขที่", 110, 100);
    doc.text(repair.item?.manual_contract || "-", 135, 100);

    // รหัสเครื่อง (Serial Number)
    doc.text("รหัสเครื่อง", 25, 107);
    doc.text(repair.item?.manual_sn || "-", 55, 107);

    // สถานะสัญญาประกัน
    const hasContract = !!repair.item?.manual_contract?.trim();
    drawCheckbox(doc, 28, 114, "อยู่ในสัญญาประกัน", hasContract);
    drawCheckbox(doc, 73, 114, "ไม่อยู่ในสัญญาประกัน", !hasContract);

    // อาการเสีย และตำแหน่งที่ติดตั้ง
    doc.text("อาการ", 25, 122);
    doc.text(repair.item?.problem_detail || "-", 55, 122);

    doc.text("ซึ่งติดตั้งใช้งานที่", 25, 129);
    doc.text(repair.requester_dept || "-", 55, 129);

    // 3. กรอบข้อความอนุมัติค่าใช้จ่ายกรณีหมดประกัน
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(15, 134, 180, 15);

    doc.setFont("THSarabunNew", "bold");
    doc.text("ในกรณีที่ไม่อยู่ในสัญญาประกัน ขอให้ กตส.ฉ.2 ดำเนินการซ่อม", 105, 139, { align: "center" });
    doc.text("และตัดงบค่าใช้จ่ายจากศูนย์ต้นทุนของ E301023000 รหัสบัญชี 53051060", 105, 145, { align: "center" });
    doc.setFont("THSarabunNew", "normal");

    // ข้อความส่งท้าย
    doc.text("จึงเรียนมาเพื่อโปรดแจ้งผู้เกี่ยวข้องดำเนินการต่อไปด้วย", 25, 156);

    // 4. ลายมือชื่อผู้แจ้งซ่อม
    const reqY = 166;
    const positionText = repair.requester_position || "-";
    const empCodeText = repair.requester_emp_code ? `   รหัสพนักงาน   ${repair.requester_emp_code}` : "";
    
    doc.text(`ชื่อ-สกุล   ${repair.requester_name}`, 130, reqY);
    doc.text(`ตำแหน่ง   ${positionText}${empCodeText}`, 120, reqY + 6);
    doc.text(`เบอร์โทรติดต่อกลับ   ${repair.requester_phone || "-"}`, 120, reqY + 12);

    // 5. กล่องการตรวจสอบอุปกรณ์ก่อนส่งซ่อม (ผคช.กตส.-บริหาร)
    const checkY = 186;
    doc.rect(15, checkY, 180, 36);

    doc.setFont("THSarabunNew", "bold");
    doc.text("การตรวจสอบอุปกรณ์ก่อนส่งซ่อม ( ผคช.กตส.-บริหาร )", 20, checkY + 7);
    doc.setFont("THSarabunNew", "normal");
    doc.text("..........................................................................................................................................................", 20, checkY + 15);

    doc.text(`ผู้รับเครื่อง/ตรวจสอบ   ${repair.technician_name || "-"}`, 117, checkY + 23);
    doc.text("ตำแหน่ง   นรค.5", 133, checkY + 29);
    doc.text("วันที่   ........................................", 137, checkY + 35);

    // 6. กล่องสองคอลัมน์ด้านล่าง (การจัดซ่อม/การอนุมัติ)
    const bottomY = 226;
    const currentThaiYear = new Date().getFullYear() + 543;

    doc.rect(15, bottomY, 180, 56);
    doc.line(105, bottomY, 105, bottomY + 56); // เส้นแบ่งแนวตั้งกึ่งกลาง

    // คอลัมน์ซ้าย (สำหรับ หผ. เสนออนุมัติ)
    doc.text("เรียน อก.ตส.ฉ.2", 20, bottomY + 5);
    doc.text("ดำเนินการซ่อมโดยวิธี", 20, bottomY + 11);

    drawCheckbox(doc, 22, bottomY + 17, "จัดซื้ออุปกรณ์มาเปลี่ยน", false);
    drawCheckbox(doc, 22, bottomY + 23, "ส่งให้บริษัทดำเนินการ", false);
    drawCheckbox(doc, 22, bottomY + 29, "ไม่ดำเนินการซ่อม", false);

    doc.text("เพื่อโปรดพิจารณา อนุมัติ", 25, bottomY + 36);
    doc.text("(นายสุทธิศักดิ์ สรรพสาร)", 35, bottomY + 44);
    doc.text("ตำแหน่ง หผ. ผคช.กตส.-บริหาร", 30, bottomY + 50);
    doc.text("วันที่   ........................................", 30, bottomY + 55);

    // คอลัมน์ขวา (สำหรับการอนุมัติผล)
    doc.text(`ที่ ฉ.2กตส.(คช.)........./${currentThaiYear}`, 110, bottomY + 5);

    doc.setFont("THSarabunNew", "bold");
    doc.text("อนุมัติ", 150, bottomY + 20, { align: "center" });
    doc.setFont("THSarabunNew", "normal");

    doc.text("(........................................................)", 115, bottomY + 36);
    doc.text("ตำแหน่ง   ....................................................", 115, bottomY + 44);
    doc.text("วันที่   ........................................", 115, bottomY + 50);

    // บันทึกไฟล์เอกสาร PDF
    doc.save(`ใบซ่อมทำเสนอ_RE-${repair.id}_${repair.requester_name}.pdf`);
};
