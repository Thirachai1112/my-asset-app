// app/borrows/renew/generateRenewPDF.ts
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface RenewData {
  borrower_name: string;
  borrower_dept: string | null;
  position: string | null;
  phone: string | null;
  purpose: string | null;
  asset_name: string;
  asset_code: string | null;
  serial_number: string | null;
  contract_number: string | null;
  old_due_date: string;
  new_due_date: string;
  renewal_count: number;
  quantity: number;
}

// ฟังก์ชันแปลงวันที่เป็นรูปแบบไทย d/m/y
function formatDateThai(dateStr: string): string {
  // ถ้าเป็น ISO format (YYYY-MM-DD)
  if (dateStr.includes('-')) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('th-TH')
  }
  // ถ้าเป็น d/m/y อยู่แล้ว
  return dateStr
}

export const generateRenewPDF = async (data: RenewData) => {
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

  // 🔤 โหลดฟอนต์
  try {
    const response = await fetch("/api/font");
    if (!response.ok) throw new Error("ดึงฟอนต์ผ่าน API ล้มเหลว");
    const fontData = await response.json();
    doc.addFileToVFS("THSarabunNew.ttf", fontData.font);
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
  doc.text("เอกสารต่ออายุการยืมอุปกรณ์", 105, 24, { align: "center" });

  doc.rect(15, 29, 180, 8);
  doc.setFontSize(14);
  doc.text(`วันที่ทำรายการ: ${new Date().toLocaleDateString("th-TH")}`, 19, 34);
  doc.text(`ต่ออายุครั้งที่: ${data.renewal_count}`, 115, 34);

  // 2. ข้อมูลผู้ยืมและอุปกรณ์
  doc.rect(15, 40, 180, 32);
  doc.text(`ชื่อ-นามสกุล ผู้ยืม: ${data.borrower_name}`, 19, 47);
  doc.text(`ตำแหน่ง: ${data.position || "-"}`, 115, 47);
  doc.text(`แผนก/ฝ่าย/กอง: ${data.borrower_dept || "-"}`, 19, 54);
  doc.text(`เบอร์โทรศัพท์: ${data.phone || "-"}`, 115, 54);
  doc.text(`วัตถุประสงค์: ${data.purpose || "-"}`, 19, 61);
  doc.text(`จำนวน: ${data.quantity} ชิ้น`, 115, 61);

  // 3. ตารางรายละเอียดการต่ออายุ
  autoTable(doc, {
    startY: 77,
    head: [['รายการ', 'รายละเอียด']],
    body: [
      ['ชื่ออุปกรณ์', data.asset_name || '-'],
      ['รหัสทรัพย์สิน', data.asset_code || '-'],
      ['Serial Number', data.serial_number || '-'],
      ['เลขที่สัญญา', data.contract_number || '-'],
      ['วันที่คืนเดิม', formatDateThai(data.old_due_date)],
      ['วันที่คืนใหม่', formatDateThai(data.new_due_date)],
      ['จำนวนครั้งที่ต่ออายุ', `${data.renewal_count} / 3 ครั้ง`],
    ],
    theme: 'grid',
    styles: { font: fontName, fontSize: 13, cellPadding: 4, valign: 'middle', lineColor: [0,0,0], lineWidth: 0.3 },
    headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255], fontStyle: 'normal', halign: 'center' },
    columnStyles: { 0: { cellWidth: 50, halign: 'center' }, 1: { cellWidth: 130 } },
    margin: { left: 15, right: 15 },
    didDrawPage: (tableData) => { if (tableData.pageNumber > 1) { drawOuterBorder(); doc.setFont(fontName); } }
  });

  // 4. ส่วนลงนาม
  const finalTableY = (doc as any).lastAutoTable?.finalY || 150;
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

  drawSignatureBox(pageMargin, currentY, "ผู้ยืม");
  drawSignatureBox(pageMargin + sigBoxWidth + 10, currentY, "ผู้อนุมัติ");
  drawSignatureBox(pageMargin, currentY + sigBoxHeight + gapY, "ผู้ส่งคืน");
  drawSignatureBox(pageMargin + sigBoxWidth + 10, currentY + sigBoxHeight + gapY, "ผู้รับคืน");

  doc.save(`ต่ออายุการยืม_${data.borrower_name}_${Date.now()}.pdf`);
};
