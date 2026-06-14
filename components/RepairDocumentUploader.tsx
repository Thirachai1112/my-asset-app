"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Swal from "sweetalert2";

// ฟังก์ชันสร้างอินสแตนซ์ Supabase หน้าบ้าน
let supabaseInstance: any = null
function createClient() {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return supabaseInstance
}

interface RepairUploaderProps {
  repairId: number;
  onUploadSuccess?: () => void;
}

export default function RepairDocumentUploader({ repairId, onUploadSuccess }: RepairUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // 1. ตรวจสอบประเภทไฟล์
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

      // 3. ตั้งชื่อไฟล์และอัปโหลดไปยัง storage
      const fileExt = file.name.split(".").pop();
      const fileName = `repair_upload_${repairId}_${Date.now()}.${fileExt}`;
      const filePath = `repair_docs/${fileName}`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from("repair-documents") // ต้องสร้าง Bucket นี้ใน Supabase Storage
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (storageError) {
        // ถ้าไม่มี Bucket อาจจะเกิด Error นี้ แนะนำให้สร้าง Bucket ชื่อ 'repair-documents'
        throw storageError;
      }

      // 4. ดึง Public URL
      const { data: urlData } = supabase.storage
        .from("repair-documents")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // 5. บันทึกข้อมูลเข้าตาราง 'documents' แบบ Upsert
      // โดยใช้ repair_id เป็นเกณฑ์ในการเช็กว่ามีเอกสารเดิมอยู่แล้วหรือไม่
      
      // ดึงเอกสารเดิมถ้ามี
      const { data: existingDoc } = await supabase
        .from("documents")
        .select("id")
        .eq("repair_id", repairId)
        .maybeSingle();

      let dbResult;
      if (existingDoc) {
        // ถ้ามีอยู่แล้วให้ Update
        dbResult = await supabase
          .from("documents")
          .update({
            file_url: publicUrl,
            doc_number: `RE-DOC-${repairId}-${Date.now().toString().slice(-4)}`
          })
          .eq("id", existingDoc.id);
      } else {
        // ถ้ายังไม่มีให้ Insert
        dbResult = await supabase
          .from("documents")
          .insert([
            {
              doc_number: `RE-DOC-${repairId}-${Date.now().toString().slice(-4)}`,
              doc_type: "เอกสารประกอบการซ่อม",
              file_url: publicUrl,
              repair_id: repairId
            }
          ]);
      }

      if (dbResult.error) throw dbResult.error;

      Swal.fire({
        icon: "success",
        title: "อัปโหลดเอกสารสำเร็จ!",
        text: "ไฟล์เอกสารได้รับการบันทึกเรียบร้อยแล้ว",
        timer: 1500,
        showConfirmButton: false,
      });

      if (onUploadSuccess) onUploadSuccess();
      
    } catch (error: any) {
      console.error("Upload Error:", error);
      Swal.fire("เกิดข้อผิดพลาด", error.message || "ไม่สามารถอัปโหลดไฟล์ได้ (ตรวจสอบว่ามี Bucket 'repair-documents' และคอลัมน์ 'repair_id' ในตาราง 'documents' หรือไม่)", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center">
      <label className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all border
        ${uploading 
          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
          : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
        }`}
      >
        <span>{uploading ? "⌛..." : "📁 แนบไฟล์"}</span>
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
