import { jsPDF } from "jspdf";

interface RepairData {
    id: number;
    requester_name?: string;
    requester_dept?: string;
    requester_phone?: string;
    grand_total?: number;
    fix_detail?: string | null;
    item?: {
        problem_detail?: string | null;
        manual_brand?: string | null;
        manual_sn?: string | null;
        manual_contract?: string | null;
        type_item?: string | null;
    } | null;
}

interface ProcurementFormValues {
    date?: string;
    prNo?: string;
    trackingNo?: string;
    headerNote?: string;
    quantity?: number;
    inspectorName?: string;
    inspectorPosition?: string;
}

const checkbox = (doc: jsPDF, x: number, y: number, label: string, checked = false) => {
    doc.rect(x, y - 3, 3.5, 3.5);
    if (checked) doc.text("x", x + 0.8, y);
    doc.text(label, x + 5, y);
};

const loadImageAsBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`โหลดรูปภาพไม่สำเร็จ: ${response.status}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const loadFont = async (doc: jsPDF) => {
    try {
        const response = await fetch("/api/font");
        if (!response.ok) throw new Error("โหลดฟอนต์ไม่สำเร็จ");
        const data = await response.json();
        doc.addFileToVFS("THSarabunNew.ttf", data.font);
        doc.addFont("THSarabunNew.ttf", "THSarabunNew", "normal");
        doc.addFont("THSarabunNew.ttf", "THSarabunNew", "bold");
        doc.setFont("THSarabunNew", "normal");
        return true;
    } catch (error) {
        console.error("โหลดฟอนต์ภาษาไทยล้มเหลว:", error);
        return false;
    }
};

const thaiNumberText = (value: number): string => {
    const digits = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
    const positions = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

    if (value === 0) return "ศูนย์";

    const integerText = (number: number): string => {
        if (number >= 1_000_000) {
            return `${integerText(Math.floor(number / 1_000_000))}ล้าน${number % 1_000_000 ? integerText(number % 1_000_000) : ""}`;
        }

        const numberString = String(number);
        return [...numberString].map((digit, index) => {
            const digitValue = Number(digit);
            const position = numberString.length - index - 1;
            if (digitValue === 0) return "";
            if (position === 1 && digitValue === 2) return "ยี่สิบ";
            if (position === 1 && digitValue === 1) return "สิบ";
            if (position === 0 && digitValue === 1 && numberString.length > 1) return "เอ็ด";
            return `${digits[digitValue]}${positions[position]}`;
        }).join("");
    };

    const absoluteValue = Math.abs(value);
    const baht = Math.floor(absoluteValue);
    const satang = Math.round((absoluteValue - baht) * 100);
    const bahtText = `${integerText(baht)}บาท`;
    const satangText = satang === 0 ? "ถ้วน" : `${integerText(satang)}สตางค์`;

    return `${value < 0 ? "ลบ" : ""}${bahtText}${satangText}`;
};

const generateHeaderSection = async (doc: jsPDF, repair: RepairData, formValues: ProcurementFormValues) => {
    const left = 5;

    // --- 1. หน้ากระดาษมุมขวาบน ---
    doc.setFontSize(16);
    doc.text("หน้า ______ 1 ______ / _________", 234, 10);

    // --- 2. ส่วนหัวกระดาษหลัก (3 แถว) ---
    const headerY = 12;
    const headerHeight = 15;
    doc.rect(left, headerY, 288, headerHeight);

    // เส้นแบ่งแนวตั้ง 3 เส้น (4 
    // คอลัมน์)
    doc.line(80, headerY, 80, headerY + headerHeight);
    doc.line(140, headerY, 140, headerY + headerHeight);
    doc.line(215, headerY, 215, headerY + headerHeight);

    // เส้นแบ่งแนวนอนเฉพาะ 2 คอลัมน์ตรงกลาง
    doc.line(80, headerY + 8, 215, headerY + 8);
    try {
        const logoData = await loadImageAsBase64("/pea-logo.png");
        doc.addImage(logoData, "PNG", 6, headerY + 1, 12, 12);
    } catch (error) {
        console.error("โหลดโลโก้ กฟภ. ล้มเหลว:", error);
    }
    // --- ข้อความในส่วนหัวกระดาษ ---
    // คอลัมน์ที่ 1 (ซ้ายสุด)
    doc.setFont("THSarabunNew", "bold");
    doc.setFontSize(13);
    doc.text("การไฟฟ้าส่วนภูมิภาค", 20, headerY + 6);
    doc.setFontSize(13);
    doc.text("ใบขอเสนอซื้อ/จ้าง (Purchase Requisition)", 17, headerY + 12.5);
    doc.setFont("THSarabunNew", "normal");

    // คอลัมน์ที่ 2
    doc.setFontSize(13);
    doc.text(`หน่วยงานผู้ขอเสนอซื้อ/จ้าง   ผคข.กดส.ฉ.2`, 85, headerY + 6);
    doc.text(`วันที่ส่งมอบ................/............../...........`, 85, headerY + 12.5);


    // คอลัมน์ที่ 3
    doc.setFontSize(13);
    doc.text("รหัสกลุ่มจัดซื้อของผู้ซื้อ/ผู้ว่าจ้าง ..........................................", 141, headerY + 6);
    doc.text("คลัง/สถานที่รับบริการ ( รง.) ...........................................", 141, headerY + 12.5);


    // คอลัมน์ที่ 4 (ขวาสุด)
    doc.setFontSize(13);
    doc.text(`เลขที่ใบขอเสนอซื้อ/จ้าง (PR No.) ........................................`, 216, headerY + 6);
    doc.text(`เลขที่ติดตาม (Tracking No.) .........................................`, 216, headerY + 12.5);


    // --- 3. ส่วนประเภทเอกสาร & หมวดรายการ ---
    const typeY = headerY + headerHeight + 1.5;
    doc.rect(left, typeY, 288, 34);


    // เส้นแบ่งแนวตั้ง 2 เส้น
    doc.line(80, typeY, 80, typeY + 24);
    doc.line(125, typeY, 125, typeY + 24);


    // แยกวาดเส้นแนวนอนหัวข้อเฉพาะในแต่ละคอลัมน์ (จะไม่วิ่งทะลุข้ามเส้นแนวตั้งครับ)
    doc.line(left, typeY + 7, 115, typeY + 7);   // ช่องซ้าย (ประเภทเอกสาร)
    doc.line(105, typeY + 7, 190, typeY + 7);  // ช่องกลาง (หมวดรายการ)
    // เปลี่ยนจากใช้ตัวแปร right ให้ใช้พิกัดขอบขวาของกล่องพอดี (left + 267)
    doc.line(190, typeY + 7, left + 288, typeY + 7);

    // ฝั่งซ้าย: ประเภทเอกสาร (Document Type)
    doc.setFontSize(13);
    doc.text("ประเภทเอกสาร (Document Type)", 20, typeY + 5);
    checkbox(doc, 6.5, typeY + 13, "PR มาตรฐาน (ZNB1)");
    checkbox(doc, 41, typeY + 13, "PR จากปฏิบัติงาน (ZNB3)");
    checkbox(doc, 6.5, typeY + 22, "PR จาก MRP (ZNB2)");
    checkbox(doc, 41, typeY + 22, "PR สัญญาล่วงหน้า (ZRV1)");

    // ฝั่งกลาง: หมวดรายการ (Item Category)
    doc.text("หมวดรายการ (Item Category ; I)", 81, typeY + 5);
    checkbox(doc, 85, typeY + 13, "มาตรฐาน ( )");
    checkbox(doc, 85, typeY + 22, "การรับเหมาช่วง (L)");

    // ฝั่งขวา: หมวดการกำหนดบัญชี (Account Assignment Category)
    doc.text("หมวดการกำหนดบัญชี (Account Assignment Category ; A)", 170, typeY + 5);
    checkbox(doc, 127, typeY + 13, "พัสดุสำรองคลัง ( )");
    checkbox(doc, 169, typeY + 13, "คชจ.เข้าหน่วยงาน(K)");
    checkbox(doc, 207, typeY + 13, "ทรัพย์สินถาวรพร้อมใช้ (Z)");
    checkbox(doc, 252, typeY + 13, "งานจ้างเหมาเบ็ดเสร็จ (P)");
    checkbox(doc, 127, typeY + 22, "พัสดุงานโครงการที่มีแผน (Q)");
    checkbox(doc, 169, typeY + 22, "คชจ.เข้าใบสั่งซ่อม/งานบริการ (F)");
    checkbox(doc, 252, typeY + 22, "งานจ้างเหมาบางส่วน (N)");


    // --- 4. บันทึกส่วนหัว (Header Note) ---
    const noteY = typeY + 24;

    // 1. ปรับความกว้างกล่อง rect จาก 288 เป็น 267 ให้เท่ากับตารางส่วนอื่น
    doc.rect(left, noteY, 288, 10);
    doc.setFontSize(13);

    const problemDetail = repair.item?.problem_detail?.trim() || "ไม่ระบุอาการเสีย";
    const installationLocation = repair.requester_dept?.trim() || "ไม่ระบุสถานที่ติดตั้ง";
    const headerNoteText = formValues.headerNote || `      :    ค่าซ่อมเครื่อง  (อาการ ${problemDetail} )  อุปกรณ์ใช้งานที่ ${installationLocation}`;

    // 2. ปรับพิกัด X ของข้อความจาก 7 ให้ขยับเข้ามาอยู่ในกรอบ (เช่นใช้ left + 3 หรือ 18)
    const textX = left + 3;
    const textY = noteY + 6;
    doc.text(`บันทึกส่วนหัว (Header Note) ${headerNoteText}`, textX, textY);

    // 3. ขีดเส้นใต้เฉพาะคำว่า "บันทึกส่วนหัว"
    const targetText = "บันทึกส่วนหัว";
    const textWidth = doc.getTextWidth(targetText);
    const lineY = noteY + 6.5; // ปรับความสูงเส้นใต้ไม่ให้ทับตัวหนังสือ
    doc.line(textX, lineY, textX + textWidth, lineY);

    // --- 5. ตารางใหม่ ---
    const tableY = noteY + 11;
    const tableHeight = 20;

    doc.setFillColor(190, 190, 190);
    doc.rect(left, tableY, 288, tableHeight, "F");
    doc.setFillColor(0, 0, 0);
    doc.rect(left, tableY, 288, tableHeight);

    // เส้นแบ่งคอลัมน์หลัก
    [15, 35, 55, 75, 140, 160, 180, 195].forEach((x) => {

        doc.line(left + x, tableY, left + x, tableY + tableHeight);
    });

    // เส้นแบ่งหัวตารางแถวที่ 2
    doc.line(left + 75, tableY + 8, left + 140, tableY + 8);
    doc.line(left + 288, tableY + 8, left + 195, tableY + 8);
    doc.line(left + 288, tableY + 13.5, left + 240, tableY + 13.5);

    // เส้นแบ่งย่อยภายในช่องรายละเอียด
    doc.line(left + 90, tableY + 8, left + 90, tableY + tableHeight);
    doc.line(left + 130, tableY + 8, left + 130, tableY + tableHeight);
    doc.line(left + 240, tableY + 8, left + 240, tableY + tableHeight);
   doc.line(left + 268, tableY + 13.5, left + 268, tableY + 20);
    doc.line(left + 245, tableY + 8, left + 260, tableY + 8);


    doc.setFontSize(11);
    doc.text("ลำดับที่", left + 3, tableY + 3.5);
    doc.text("รหัสวัสดุ", left + 20.5, tableY + 3.5);
    doc.text("ปริมาณ", left + 41.5, tableY + 3.5);
    doc.text("หน่วย", left + 62.5, tableY + 3.5);
    doc.text("วงเงินงบประมาณ", left + 100, tableY + 3.5);
    doc.text("ต่อหน่วย", left + 78, tableY + 11.5);
    doc.text("ราคารวม", left + 105.5, tableY + 11.5);
    doc.text("สกุล", left + 132.5, tableY + 11.5);
    doc.text("เงิน", left + 133, tableY + 16);
    doc.text("กลุ่มวัสดุ", left + 145.5, tableY + 3.5);
    doc.text("รหัสบัญชี G/L", left + 163.5, tableY + 3.5);
    doc.text("เงินทุน", left + 184, tableY + 3.5);
    doc.text("หมวดการกำหนดบัญชี", left + 225, tableY + 3.5);
    doc.text("ศูนย์ต้นทุน /องค์ประกอบWBS/", left + 200, tableY + 11.5);
    doc.text("รหัสงบประมาณ(WBS)/รหัสใบสั่ง", left + 200, tableY + 17.5);
    doc.text("งานจ้างเหมาบางส่วน", left + 255, tableY + 11.5);
    doc.text("รหัสโครงข่าย", left + 247, tableY + 17.5);
    doc.text("กิจกรรม", left + 273, tableY + 17.5);

    // --- 6. ตารางใหม่ ---
    const secondTableY = tableY + tableHeight + 0;
    const secondTableHeight = 8;

   doc.setFillColor(230, 230, 230);
    doc.rect(left, secondTableY, 288, secondTableHeight, "F");
    doc.setFillColor(0, 0, 0);
    doc.rect(left, secondTableY, 288, secondTableHeight);
    [ 75, 195, 240].forEach((x) => {
        doc.line(left + x, secondTableY, left + x, secondTableY + secondTableHeight);
    });
    doc.line(left, secondTableY + 8, left + 288, secondTableY + 8);

    doc.setFontSize(11);
    doc.text("รายการ(ข้อความแบบสั้น)", left + 24, secondTableY + 5);
    doc.text("ข้อความรายการ", left + 132, secondTableY + 5);
    doc.text("แหล่งเงินกู้", left + 212, secondTableY + 5);
    doc.text("เลขที่สัญญากู้", left + 260, secondTableY + 5);
 // --- 7. ตารางใหม่ ---
    const secondTableY01 = tableY + tableHeight + 10;
    const secondTableHeight01 = 8;
    doc.rect(left, secondTableY01, 288, secondTableHeight01);
    [ 15, 35, 55, 75,90,130, 140, 160, 180, 195,240,268].forEach((x) => {
        doc.line(left + x, secondTableY01, left + x, secondTableY01 + secondTableHeight01);
    });
    doc.line(left, secondTableY01 + 8, left + 288, secondTableY01 + 8);

    doc.setFontSize(11);
    doc.text("1", left + 6.5, secondTableY01 + 5);
    doc.text("1", left + 44.5, secondTableY01 + 5);
    doc.text("เครื่อง", left + 62.2, secondTableY01 + 5);
    const totalAmount = Number(repair.grand_total) || 0;
    doc.text(totalAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }), left + 78, secondTableY01 + 5);
    doc.text(totalAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }), left + 105, secondTableY01 + 5);
    doc.text("THB", left + 132.5, secondTableY01 + 5);
    doc.text("53051060", left + 165, secondTableY01 + 5);
    doc.text("E30102300", left + 211, secondTableY01 + 5);
    doc.text(`ค่าซ่อม ${repair.item?.type_item || "ไม่ระบุ"} ( ${repair.fix_detail || "ไม่ระบุวิธีการซ่อม"} )`, left + 5, secondTableY01 + 12);
    doc.text(`ยี่ห้อ  ${repair.item?.manual_brand || "ไม่ระบุ"}`, left + 5, secondTableY01 + 18);
    doc.text(`S/N  ${repair.item?.manual_sn || "ไม่ระบุ"}`, left + 34.5, secondTableY01 + 24);
    doc.text(`สัญญาเลขที่  ${repair.item?.manual_contract || "ไม่ระบุ"}`, left + 5, secondTableY01 + 24);
// --- 8. ตารางใหม่ ---
    // const secondTableY03 = tableY + tableHeight + 10;
    // const secondTableHeight03 = 31;

    // doc.rect(left, secondTableY03, 288, secondTableHeight03);
    // [ 75, 195, 240].forEach((x) => {
    //     doc.line(left + x, secondTableY03, left + x, secondTableY03 + secondTableHeight03);
    // });
    // doc.line(left, secondTableY03 + 8, left + 288, secondTableY03 + 8);

    //--9.ตารางใหม่---
    const secondTableY02 = tableY + tableHeight + 35;
    const secondTableHeight02 = 5;
    doc.rect(left, secondTableY02, 288, secondTableHeight02);
    [ 15, 35, 55, 75,90,130, 140, 160, 180, 195,240,268].forEach((x) => {
        doc.line(left + x, secondTableY02, left + x, secondTableY02 + secondTableHeight02);
    });
    //---10.ส่const secondTableY02 = tableY + tableHeight + 41;
    const secondTableY04 = tableY + tableHeight + 10;
    const secondTableHeight04 = 35;

    doc.rect(left, secondTableY04, 288, secondTableHeight04);
    [ 75, 195, 240].forEach((x) => {
        doc.line(left + x, secondTableY04, left + x, secondTableY04 + secondTableHeight04);
    });
    doc.line(left, secondTableY04 + 8, left + 288, secondTableY04 + 8);
    // --- 11. ส่วนลงนาม (Signature Section) ---
    const secondTableY05 = tableY + tableHeight + 55;
    const secondTableHeight05 = 5;
    doc.rect(left, secondTableY05, 288, secondTableHeight05);
    [ 15, 35, 55, 75,90,130, 140, 160, 180, 195,240,268].forEach((x) => {
        doc.line(left + x, secondTableY05, left + x, secondTableY05 + secondTableHeight05);
    });

    // -- 12. Footer
    // const secondTableY06 = tableY + tableHeight + 45;
    // const secondTableHeight06 = 10;

    // doc.rect(left, secondTableY06, 288, secondTableHeight06);
    // [ 75, 195, 240].forEach((x) => {
    //     doc.line(left + x, secondTableY06, left + x, secondTableY06 + secondTableHeight06);
    // });
    // doc.line(left, secondTableY04 + 8, left + 288, secondTableY04 + 8);

    //--- 13. Footer
    const secondTableY07 = tableY + tableHeight + 45;
    const secondTableHeight07 = 5;
    doc.rect(left, secondTableY07, 288, secondTableHeight07);
    [ 15, 35, 55, 75,90,130, 140, 160, 180, 195,240,268].forEach((x) => {
        doc.line(left + x, secondTableY07, left + x, secondTableY07 + secondTableHeight07);
    });
 //--- 14. Footer
 const secondTableY08 = tableY + tableHeight + 45;
    const secondTableHeight08 = 10;

    doc.rect(left, secondTableY08, 288, secondTableHeight08);
    [ 75, 195, 240].forEach((x) => {
        doc.line(left + x, secondTableY08, left + x, secondTableY08 + secondTableHeight08);
    });
    doc.line(left, secondTableY04 + 8, left + 288, secondTableY04 + 8);
//--- 15. Footer

    const secondTableY09 = tableY + tableHeight + 60;
    const secondTableHeight09 = 5;

    doc.rect(left, secondTableY09, 288, secondTableHeight09);
    [ 75, 195, 240].forEach((x) => {
        doc.line(left + x, secondTableY09, left + x, secondTableY09 + secondTableHeight09);
    });
    doc.line(left, secondTableY04 + 8, left + 288, secondTableY04 + 8);

    doc.setFontSize(11);
    doc.text("*ราคาไม่รวมภาษีมูลค่าเพิ่ม", left + 79, secondTableY + 63.2);
//--- 16. Footer

    const secondTableY10 = tableY + tableHeight + 66;
    const secondTableHeight10 = 15;

    doc.rect(left, secondTableY10, 288, secondTableHeight10);
    [ 75, 140, 288].forEach((x) => {
        doc.line(left + x, secondTableY10, left + x, secondTableY10 + secondTableHeight10);
    });
    doc.line(left, secondTableY04 + 8, left + 288, secondTableY04 + 8);

    doc.setFontSize(16);
    doc.text(`จำนวน  1 รายการ`, left + 5, secondTableY10 + 13);
    const totalAmount01 = Number(repair.grand_total) || 0;
    doc.text(totalAmount01.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }), left + 105, secondTableY10 + 13);


doc.text(thaiNumberText(totalAmount01), left + 165, secondTableY10 + 13);
    
//--- 17. Footer
    const secondTableY11 = tableY + tableHeight + 82;
    const secondTableHeight11 = 30;

    doc.rect(left, secondTableY11, 288, secondTableHeight11);
    [ 96, 192, 288].forEach((x) => {
        doc.line(left + x, secondTableY11, left + x, secondTableY11 + secondTableHeight11);
    });
    doc.line(left, secondTableY04 + 8, left + 288, secondTableY04 + 8);
    doc.setFontSize(13);
    doc.text("ผู้ขอเสนอซื้อ/จ้าง ...........................................................................", left + 5, secondTableY11 + 10);
    doc.text("( นายสุทธิศักดิ์ สรรพสาร )", left + 36, secondTableY11 + 18);
    doc.text("หผ.คข.กดส.ฉ.2", left + 43, secondTableY11 + 23);
    doc.text("ผู้อนุมัติ ................................................................................", left + 107, secondTableY11 + 10);
    doc.text("( นางสุภาวดี เตียวสุวัฒน์ )", left + 130, secondTableY11 + 18);
    doc.text("อก.ดส.ฉ.2", left + 140, secondTableY11 + 23);
    doc.text("ผู้บันทึก ................................................................................", left + 205, secondTableY11 + 10);
    const inspectorColumnCenter = left + 240;
    doc.text(`( ${formValues.inspectorName || "........................................................"} )`, inspectorColumnCenter, secondTableY11 + 18, { align: "center" });
    doc.text(formValues.inspectorPosition || "", inspectorColumnCenter, secondTableY11 + 23, { align: "center" });

    // --- 18. Footer
    doc.setFontSize(12);
    const noteX = left + 5;
    const footerNoteY = secondTableY11 + 35;
    const noteLabel = "หมายเหตุ";
    doc.text(`${noteLabel} -กรณีมีรายการเพิ่มเติมเกินจากแบบฟอร์มนี้ ให้กรอกรายการส่วนที่เพิ่มเติมบนแบบฟอร์ม: ใบขอเสนอซื้อ/จ้าง-เพิ่มเติม (Purchase Requisition-Additional)(PURIF02.2)`, noteX, footerNoteY);
    doc.line(noteX, footerNoteY + 0.1, noteX + doc.getTextWidth(noteLabel), footerNoteY + 0.1);
    doc.text('-กรณีหมวดรายการเป็นการรับเหมาช่วง(L) ต้องกรอกรายละเอียดส่วนประกอบบนแบบฟอร์ม: ใบขอเสนอซื้อ/จ้าง-ส่วนประกอบ (Purchase Requisition-Components)(PURIF02.3)', left + 15.9, secondTableY11 + 40);
};



 




export const generateProcurementPDF = async (
    repair: RepairData,
    formValues: ProcurementFormValues = {},
) => {
    const doc = new jsPDF({ orientation: "l", unit: "mm", format: "a4" });
    if (!await loadFont(doc)) {
        alert("ไม่สามารถโหลดฟอนต์ภาษาไทยได้");
        return;
    }

    await generateHeaderSection(doc, repair, formValues);
    doc.save(`procurement_requisition_${repair.id}.pdf`);
};