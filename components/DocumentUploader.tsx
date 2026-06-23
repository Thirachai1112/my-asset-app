// components/DocumentUploader.tsx
"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Swal from "sweetalert2";

// เรียกใช้งาน Supabase Client ของคุณ
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UploaderProps {
  borrowId: number;             // ID ของรายการยืมจากแถวในตาราง
  onUploadSuccess?: () => void;  // ฟังก์ชันสั่งโหลดข้อมูลในหน้าตารางใหม่หลังอัปโหลดเสร็จ
}

export default function DocumentUploader({ borrowId, onUploadSuccess }: UploaderProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // 1. ตรวจสอบประเภทไฟล์ (PDF, PNG, JPG)
      const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
      if (!allowedTypes.includes(file.type)) {
        Swal.fire("ข้อผิดพลาด", "รองรับเฉพาะไฟล์ PDF และรูปภาพ (PNG, JPG) เท่านั้นครับ", "error");
        return;
      }

      // 2. จำกัดขนาดไฟล์ไม่เกิน 5MB
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire("ข้อผิดพลาด", "ขนาดไฟล์ใหญ่เกินไป ห้ามเกิน 5MB ครับ", "error");
        return;
      }

      setUploading(true);

      // 3. ตั้งชื่อไฟล์เพื่อนำไปเก็บใน Storage (แบ่งโฟลเดอร์สำหรับแอดมินอัปโหลดแยกไว้)
      const fileExt = file.name.split(".").pop();
      const fileName = `admin_upload_${borrowId}_${Date.now()}.${fileExt}`;
      const filePath = `admin_docs/${fileName}`;

      // 4. สั่งอัปโหลดไฟล์ไปยัง Supabase Storage Bucket ('borrow-documents')
      const { data: storageData, error: storageError } = await supabase.storage
        .from("borrow-documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (storageError) throw storageError;

      // 5. ดึง Public URL เพื่อเอามาเก็บในดาต้าเบส
      const { data: urlData } = supabase.storage
        .from("borrow-documents")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // 🌟 6. บันทึกข้อมูลแยกเข้าตาราง 'documents' โดยเอาไปผูกกับ borrowId ของแถวนั้น
      const { error: dbError } = await supabase
        .from("documents")
        .insert([
          {
            doc_number: `DOC-${borrowId}-${Date.now().toString().slice(-4)}`, // เจนรหัสเอกสารอ้างอิง ID รายการยืม
            doc_type: "ใบขอยืมอุปกรณ์อนุมัติแล้ว", // ระบุประเภทเอกสารย้อนหลัง
            file_url: publicUrl,                 // เก็บลิงก์ไฟล์ไว้ที่นี่
            borrow_id: borrowId                  // 🔗 ผูกความสัมพันธ์กับไอดีรายการยืมย้อนหลัง
          }
        ]);

      if (dbError) throw dbError;

      Swal.fire({
        icon: "success",
        title: "อัปโหลดเอกสารย้อนหลังสำเร็จ!",
        text: "ไฟล์เอกสารได้รับการบันทึกเข้าตารางเรียบร้อยแล้ว",
        timer: 2000,
        showConfirmButton: false,
      });

      // สั่งให้หน้าหลักดึงข้อมูลใหม่ เพื่ออัปเดตสถานะปุ่ม
      if (onUploadSuccess) onUploadSuccess();
      
    } catch (error: any) {
      console.error("Upload Error:", error);
      Swal.fire("เกิดข้อผิดพลาด", error.message || "ไม่สามารถอัปโหลดไฟล์ได้", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center">
      <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border
        ${uploading 
          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
          : "bg-[#7c3aed] text-white border-[#7c3aed] hover:bg-[#6d28d9]"
        }`}
      >
        <span>{uploading ? "กำลังอัปโหลด..." : "📁 อัปโหลดเอกสารย้อนหลัง"}</span>
        <input
          type="file"
          accept=".pdf, .png, .jpg, .jpeg"
          className="hidden"
          onChange={handleFileUpload}
          disabled={uploading}
        />
      </label>
    </div>
  );
}