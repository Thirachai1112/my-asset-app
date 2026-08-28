import { jsPDF } from "jspdf";
import Swal from "sweetalert2";

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
    technician_id?: string;
    technician_name_inspect?: string;
    technician_position_inspect?: string;
    fix_detail?: string;
    service_price?: number;
    brand?: string;
    contract_number?: string;
    asset_number?: string;
    serial_number?: string;
    problem_description?: string;
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

const loadImageAsBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// const drawPEALogo = (doc: jsPDF, x: number, y: number, logoBase64: string | null) => {
//     if (logoBase64) {
//         doc.addImage(logoBase64, "PNG", x - 9, y - 9, 18, 18);
//     } else {
//         doc.setFillColor(116, 33, 131);
//         doc.circle(x, y, 9, 'F');
//         doc.setFillColor(253, 197, 0);
//         doc.circle(x, y, 7, 'F');
//     }
//     doc.setTextColor(116, 33, 131);
//     doc.setFont("THSarabunNew", "bold");
//     doc.setFontSize(15);
//     doc.text("การไฟฟ้าส่วนภูมิภาค", x, y + 13, { align: "center" });
//     doc.setTextColor(0, 0, 0);
// };

export function thaiBaht(number: any) {
    const roundedNumber = Math.round(Number(number) || 0);
    if (roundedNumber === 0) return "ศูนย์บาทถ้วน";
    const integerPart = String(roundedNumber);
    const units = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
    const digits = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];

    function convert(nums: string) {
        let text = "";
        for (let i = 0; i < nums.length; i++) {
            let digit = parseInt(nums[nums.length - 1 - i]);
            if (digit !== 0) {
                if (i % 6 === 1 && digit === 1) text = "เอ็ด" + text;
                else if (i % 6 === 1 && digit === 2) text = "ยี่" + units[i % 6] + text;
                else if (i % 6 === 1 && digit === 1) text = "สิบ" + text;
                else if (i % 6 === 0 && i > 0 && digit === 1) text = "เอ็ด" + text;
                else text = digits[digit] + units[i % 6] + text;
            }
            if (i % 6 === 0 && i > 0) text = units[6] + text;
        }
        return text.replace("หนึ่งสิบ", "สิบ").replace("สองสิบ", "ยี่สิบ").replace("สิบหนึ่ง", "สิบเอ็ด");
    }
    return convert(integerPart) + "บาทถ้วน";
}

export async function handleFinishAndGeneratePDF(repair: RepairData) {
    const defaultPrice = repair.service_price || 2420;

    const { value: formValues } = await Swal.fire({
        title: 'บันทึกรายละเอียดรายงานขอจัดซ่อม',
        html: `
            <style>
                .swal-form-grid { display: grid; grid-template-columns: 140px 1fr; gap: 8px; align-items: center; text-align: left; font-size: 14px; }
                .swal-form-grid label { font-weight: bold; }
                .swal-form-grid input { height: 32px !important; margin: 0 !important; width: 100% !important; box-sizing: border-box !important; padding: 4px; }
            </style>
            <div class="swal-form-grid">
                <label>เลขที่อนุมัติ:</label> 
                <input id="swal-input-approve" class="swal2-input" value="1496/2569">
                
                <label>ตามอนุมัติ:</label> 
                <input id="swal-input-approve02" class="swal2-input" value="1408/2569">
                
                <label>วันที่อนุมัติ:</label> 
                <input id="swal-input-date" class="swal2-input" type="date">
                
                <label>เงินไม่รวม VAT:</label> 
                <input id="swal-input-amount" class="swal2-input" type="number" value="${defaultPrice}">
            </div>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'สร้าง PDF',
        preConfirm: () => ({
            approveId: (document.getElementById('swal-input-approve') as HTMLInputElement)?.value || '',
            approveNo02: (document.getElementById('swal-input-approve02') as HTMLInputElement)?.value || '',
            date: (document.getElementById('swal-input-date') as HTMLInputElement)?.value || '',
            amount: (document.getElementById('swal-input-amount') as HTMLInputElement)?.value || ''
        })
    });

    if (formValues) {
        await generateApprovalPDF(repair, formValues);
    }
}

export const generateApprovalPDF = async (repair: RepairData, formValues?: any) => {
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

    const approveNo = formValues?.approveId || "1496/2569";
    const approve = formValues?.approveNo02 || "1408/2569";
    const locationName = formValues?.location || "กฟส.หนองกุงศรี";
    const accountCode = formValues?.accountCode || "53051060";
    const costCenter = formValues?.costCenter || "E301023000";

    // --- เช็คและแปลงวันที่จากฟอร์ม (ตรงนี้แหละครับที่ทำให้เปลี่ยนตามปฏิทิน) ---
    let approveDate = "13 สิงหาคม 2569"; // ค่าสำรองเผื่อไม่ได้เลือก
    if (formValues?.date) {
        const [year, month, day] = formValues.date.split("-");
        if (year && month && day) {
            const thaiMonthsFull = [
                "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", 
                "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
            ];
            const thaiYear = parseInt(year, 10) + 543;
            const monthName = thaiMonthsFull[parseInt(month, 10)];
            const thaiDay = parseInt(day, 10);
            
            approveDate = `${thaiDay} ${monthName} ${thaiYear}`;
        }
    }
    // -----------------------------------------------------------------

    const amountVal = Number(formValues?.amount || 2420);
    const vatVal = Math.round(amountVal * 0.07 * 100) / 100;
    const totalVal = amountVal + vatVal;
    const totalText = thaiBaht(totalVal);
    
    if (!await loadFont(doc, "THSarabunNew")) {
        alert("ไม่สามารถโหลดฟอนต์ภาษาไทยได้");
        return;
    }

    let logoBase64: string | null = null;
    try {
        logoBase64 = await loadImageAsBase64("/pea-logo.png");
    } catch (e) { console.error(e); }

    // หัวกระดาษมุมขวาบน
    doc.setFont("THSarabunNew", "normal");
    doc.setFontSize(10);
    

    // ตราสัญลักษณ์และหัวข้อหลักด้านบน
    // drawPEALogo(doc, 25, 15, logoBase64);

    // ตั้งค่าฟอนต์เป็นตัวหนาทั้งหมด
    doc.setFont("THSarabunNew", "bold");

    // หัวข้อหน่วยงาน
    doc.setFontSize(20);
    doc.text("การไฟฟ้าส่วนภูมิภาค", 105, 13, { align: "center" });
    
    // หัวข้อรายงาน
    doc.setFontSize(18);
    doc.text("รายงานขอจัดซ่อมและอนุมัติดำเนินการสั่งซ่อม", 105, 20, { align: "center" });

    // เลขที่รายงาน (ตัวหนา)
    doc.setFontSize(18);
    doc.text(`เลขที่ ฉ.2กดส.(ผคข.) ${approveNo}/2569`, 105, 26, { align: "center" });
    
    // สำหรับเนื้อหาด้านล่าง หากต้องการให้เป็นตัวหนาด้วย ให้คงฟอนต์ "bold" ไว้ (ปรับขนาดตามต้องการ เช่น 12)
    doc.setFont("THSarabunNew", "bold");
    doc.setFontSize(12);

    // ตั้งค่าฟอนต์ปกติสำหรับพิมพ์ซ้ำทับกันเพื่อให้ดูหนาขึ้น
    doc.setFont("THSarabunNew", "normal");

    // หัวข้อหน่วยงาน (พิมพ์ 2 รอบเหลื่อมแกน X เล็กน้อย)
    doc.setFontSize(20);
    doc.text("การไฟฟ้าส่วนภูมิภาค", 105, 13, { align: "center" });
    doc.text("การไฟฟ้าส่วนภูมิภาค", 105.15, 13, { align: "center" });
    
    // หัวข้อรายงาน
    doc.setFontSize(18);
    doc.text("รายงานขอจัดซ่อมและอนุมัติดำเนินการสั่งซ่อม", 105, 20, { align: "center" });
    doc.text("รายงานขอจัดซ่อมและอนุมัติดำเนินการสั่งซ่อม", 105.15, 20, { align: "center" });

    // เลขที่รายงาน
    doc.setFontSize(18);
    doc.text(`เลขที่ ฉ.2กดส.(ผคข.) ${approveNo}/2569`, 105, 26, { align: "center" });
    doc.text(`เลขที่ ฉ.2กดส.(ผคข.) ${approveNo}/2569`, 105.15, 26, { align: "center" });
    
    // ตั้งค่ากลับเป็นขนาดปกติสำหรับเนื้อหาถัดไป
    doc.setFontSize(15);
    // ==========================================
    // กำหนดพิกัดโครงสร้างตาราง 4 ช่อง
    // ==========================================
    const startX = 15;
    const startY = 27;           // เริ่มต้นตารางที่ Y = 24
    const totalWidth = 190;
    const topSectionHeight = 135;  // ความสูงของตารางชุดบน
    const bottomSectionHeight = 118;// ความสูงของตารางชุดล่าง
    const midX = startX + (totalWidth / 2); // 105 มม.
    const rightSubHeight = topSectionHeight / 2; // 52 มม.

    // 1. ช่องซ้ายยาว (บรรจุเนื้อหาขอจัดซ่อมทั้งหมด)
    doc.rect(startX, startY, totalWidth / 2, topSectionHeight);

    // 2. ช่องขวาบน
    doc.rect(midX, startY, totalWidth / 2, rightSubHeight);

    // 3. ช่องขวากลาง
    doc.rect(midX, startY + rightSubHeight, totalWidth / 2, rightSubHeight);

    // 4. ช่องล่างสุด (เต็มความกว้าง)
    doc.rect(startX, startY + topSectionHeight, totalWidth, bottomSectionHeight);


    // ==========================================
    // ใส่เนื้อหาลงใน "ช่องซ้ายยาว" (อยู่ภายในตาราง)
    // ==========================================
    let leftX = 18;
    let leftY = startY + 6;

    doc.text("เรียน หผ.คข.กดส.ฉ.2", leftX, leftY);
    

    leftY += 6;
    doc.text("ด้วย ผคข.กดส.ฉ.2 มีความประสงค์ขอจัดซ่อม/ขอจ้าง", leftX + 6, leftY);
    leftY += 5;
    doc.text("ดำเนินการ โดยวิธีเฉพาะเจาะจงตามรายการ ดังนี้", leftX, leftY);

    const brand = repair.brand || repair.item?.manual_brand || "Asus รุ่น D700MCES";
    const sn = repair.serial_number || repair.item?.manual_sn || "N6PFCG01744826D";
    const contract = repair.contract_number || repair.item?.manual_contract || "บ.36/2565";
    const problem = repair.problem_description || repair.item?.problem_detail || "เครื่องเปิดไม่ติด";

    leftY += 6;
    doc.text(`1. ค่าซ่อมคอมพิวเตอร์ (อาการ ${problem})`, leftX + 6, leftY);
    leftY += 5.5;
    doc.text(`ยี่ห้อ ${brand}`, leftX, leftY);
    leftY += 5.6;
    doc.text(`S/N ${sn} สัญญาเลขที่ ${contract}`, leftX, leftY);
    leftY += 5.5;
    doc.text(`ซึ่งเป็นอุปกรณ์ใช้งานที่ ${locationName}`, leftX, leftY);
    leftY += 5.5;
    doc.text(`ตามอนุมัติ อก.ดส.ฉ.2 เลขที่  ${approve}`, leftX, leftY);
    leftY += 5.5;
    doc.text(`ลงวันที่ ${approveDate}`, leftX, leftY);

    leftY += 6.5;
    doc.text(`2. เบิกจ่ายจากรหัสบัญชี ${accountCode} ศูนย์ต้นทุน`, leftX + 6, leftY);
    leftY += 5.5;
    doc.text(`${costCenter} วงเงินประมาณการ ${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2 })} บาท`, leftX, leftY);
    leftY += 5.5;
    doc.text("(ราคารวมภาษีมูลค่าเพิ่ม)  โดยมีคณะกรรมการตรวจรับตาม", leftX, leftY);
    leftY += 5.5;
    doc.text("คำสั่งเลขที่ ฉ.2 กดส.(พ.)01/2569 ลงวันที่ 5 มกราคม 2569", leftX, leftY);
    leftY += 5.5;
    doc.text("เป็นผู้ตรวจรับการจัดซ่อม/จัดจ้าง ในวาระนี้.-", leftX, leftY);
    leftY += 20;
    doc.text("......................................................", leftX + 23, leftY);
    leftY += 21;
   

    // ==========================================
    // ใส่เนื้อหาลงใน "ช่องขวาบน"
    // ==========================================
    doc.text("เรียน อก.ดส.ฉ.2", midX + 3, startY + 6);
    doc.text("เพื่อโปรดเห็นชอบรายงานขอจัดซื้อดำเนินการตามรายการ", midX + 10, startY + 12);
    doc.text("ดังกล่าวข้างต้นต่อไป", midX + 3, startY + 18);

    doc.text("(.....................................................)", midX + 45, startY + 44, { align: "center" });
    doc.text("นายสุทธิศักดิ์ สรรพสาร", midX + 45, startY + 50, { align: "center" });
    doc.text("หผ.คข.กดส.ฉ.2", midX + 45, startY + 57, { align: "center" });
    doc.text(`วันที่ ..............................................`, midX + 45, startY + 63, { align: "center" });


    // ==========================================
    // ใส่เนื้อหาลงใน "ช่องขวากลาง"
    // ==========================================
    const midBoxY = startY + rightSubHeight;
    doc.text("เห็นชอบรายงานขอซื้อ/ขอจ้าง และอนุมัติสั่งซื้อ/สั่งจ้าง", midX + 10, midBoxY + 6);
    doc.text("ดำเนินการได้โดยปฏิบัติให้ถูกต้องตามระเบียบ", midX + 3, midBoxY + 12);

    doc.text("......................................................", midX + 45, midBoxY + 40, { align: "center" });
    doc.text("(.....................................................)", midX + 45, midBoxY + 46, { align: "center" });
    doc.text("......................................................", midX + 45, midBoxY + 52, { align: "center" });
    doc.text(`วันที่ ..............................................`, midX + 45, midBoxY + 58, { align: "center" });


    // ==========================================
    // ใส่เนื้อหาลงใน "ช่องล่างสุด"
    // ==========================================
    const bottomBoxY = startY + topSectionHeight;
    doc.text("เรียน อก.ดส.ฉ.2", startX + 3, bottomBoxY + 6);
    doc.text(`ด้วย ผคข.กดส.ฉ.2 มีความประสงค์จัดซ่อมเครื่องคอมพิวเตอร์ ซึ่งเป็นอุปกรณ์ใช้งานที่ ${locationName} ดำเนินการแล้ว`, startX + 9, bottomBoxY + 12);
    doc.text("ปรากฏว่ามีค่าใช้จ่ายตามรายการ ดังต่อไปนี้", startX + 3, bottomBoxY + 18);

    doc.text(`1. ค่าซ่อมเครื่องคอม ${repair.fix_detail || '-'} `, startX + 10, bottomBoxY + 24);
    doc.text(`จำนวน 1 เครื่อง`, startX + 90, bottomBoxY + 24);
    doc.text("เป็นเงิน", 130, bottomBoxY + 24);
    doc.text(`${amountVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 175, bottomBoxY + 22, { align: "right" });
    doc.text("บาท", 190, bottomBoxY + 22);

    doc.text("ภาษี 7%", startX + 90, bottomBoxY + 29);
    doc.text("เป็นเงิน", 130, bottomBoxY + 29);
    doc.text(`${vatVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 175, bottomBoxY + 29, { align: "right" });
    doc.text("บาท", 190, bottomBoxY + 29);

    doc.text("รวมเป็นเงิน", startX + 115, bottomBoxY + 36);
    doc.text(`${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 175, bottomBoxY + 36, { align: "right" });
    doc.text("บาท", 190, bottomBoxY + 36);

    doc.text("จึงเรียนมาเพื่อโปรดลงนามอนุมัติจ่ายเงินในใบสำคัญจ่ายเงินหมุนเวียนที่แนบมาพร้อมนี้จำนวน", startX + 9, bottomBoxY + 45);
    doc.text("1", 165, bottomBoxY + 45);
    doc.text("ฉบับ", 170, bottomBoxY + 45);

    doc.text(`รวมเป็นเงิน    ${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}    บาท    ( ${totalText} )   ต่อไปด้วย`, startX + 3, bottomBoxY + 52);
    doc.text("......................................................", 105, bottomBoxY + 87, { align: "center" });
    doc.text("(นายสุทธิศักดิ์ สรรพสาร)", 105, bottomBoxY + 93, { align: "center" });
    doc.text("หผ.คข.กดส.ฉ.2", 105, bottomBoxY + 100, { align: "center" });
    doc.text("วันที่ ..............................................", 105, bottomBoxY + 107, { align: "center" });


    // ข้อความท้ายกระดาษ
    doc.setFont("THSarabunNew", "normal");
    doc.setFontSize(15);
    doc.text("ตจ.6 ป.61", 15, 285);

    doc.save(`report_repair_${repair.id}.pdf`);
};