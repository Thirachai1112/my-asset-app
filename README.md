🚀 ส่วนประกอบของระบบที่เกี่ยวข้อง

    app/api/font/route.ts: API Route หลังบ้าน ทำหน้าที่ใช้ Node.js วิ่งไปกวาดอ่านค่าไบนารีดั้งเดิมของไฟล์ฟอนต์ผ่านระบบ fs.readFileSync แล้วแปลงเป็นข้อความ Base64 ที่สะอาดบริสุทธิ์ ส่งกลับมาให้ฝั่ง Client-side ปลอดภัยจากการถอดรหัสผิดพลาดแน่นอน

    app/borrows/request/generateBorrowPDF.ts: ฟังก์ชันหลักในการจัดเลย์เอาต์เอกสารใบยืมครุภัณฑ์ รองรับการดึงฟอนต์จาก API นำไปลงทะเบียนใน Virtual File System (addFileToVFS) ของ jsPDF และเซ็ตค่าแบบแปลนหน้ากระดาษ A4 อัตโนมัติ พร้อมตรรกะคำนวณพื้นที่ท้ายกระดาษไม่ให้ลายเซ็นล้นหน้า (Signature Zone Validation)

📝 บันทึกการแก้ไขปัญหา (Troubleshooting Log)

    ปัญหา widths, a.metadata.Unicode is undefined: เกิดจากเนื้อฟอนต์ตัวเก่าไม่มีตารางมาร์กพิกัดอักษรไทย แก้ไขโดยการเปลี่ยนไปใช้ฟอนต์ THSarabunNew.ttf ตัวสมบูรณ์สำหรับ Web Developer ขนาด 114 KB

    ปัญหา InvalidCharacterError: เกิดจากการฝังข้อความ Base64 ยาวๆ ในไฟล์โปรเจกต์แล้วมีเศษเว้นวรรค/ขึ้นบรรทัดใหม่หลุดเข้าไป แก้ไขโดยยกเลิกการฝังสตริง แล้วให้หลังบ้านอ่านค่าแบบ Buffer แทน

⚙️ สิ่งที่ต้อง Setup เพิ่มเติมสำหรับระบบพิมพ์ PDF (Setup Guide)

เพื่อให้โมดูลออกเอกสาร PDF ภาษาไทยทำงานได้ถูกต้อง ไร้ข้อผิดพลาด ช่างต้องทำตามขั้นตอนการตั้งค่าเพิ่มเติมเหล่านี้หลังจากการติดตั้งปกติ:
1. ติดตั้งระบบฟอนต์ภาษาไทย (Font Setup)

    ดาวน์โหลดไฟล์ฟอนต์ THSarabunNew.ttf ตัวที่สมบูรณ์ (ขนาดประมาณ 114 KB)

    สร้างโฟลเดอร์ชื่อ fonts ไว้ข้างในโฟลเดอร์ public

    นำไฟล์ฟอนต์ไปวางไว้ที่พิกัด public/fonts/THSarabunNew.ttf

        สำคัญมาก: ตรวจสอบการสะกดชื่อไฟล์ให้เป็น THSarabunNew.ttf เป๊ะๆ (ตัวพิมพ์ใหญ่-เล็กมีผลกับระบบ Linux/Vercel ตอนนำขึ้นโปรดักชัน) และห้ามตั้งชื่อมีวรรคหรือจุดเสริม เช่น TH Sarabun New.ttf หรือ THSarabunNew.v1.ttf

2. อัปเดตการใช้งานไฟล์ในระบบ Git (.gitignore Check)

ตรวจสอบให้มั่นใจว่าไม่ได้ใส่โฟลเดอร์ฟอนต์ไว้ใน .gitignore เพื่อให้ไฟล์ฟอนต์ตามไปทำงานบน Server จริงด้วยเมื่อทำการ Deploy:

    เปิดไฟล์ .gitignore ที่นอกสุดของโปรเจกต์

    เช็คให้ชัวร์ว่า ไม่มี บรรทัดคำสั่งที่ระบุว่า public/fonts/ หรือ *.ttf (ถ้ามีให้ลบออก เพื่อให้ Git ยอมติดตามไฟล์ฟอนต์นี้ขึ้นระบบคลาวด์)

3. ตรวจสอบ dependencies ใน package.json

เช็คให้มั่นใจว่าไลบรารีหลักสำหรับสร้าง PDF ถูกติดตั้งในโปรเจกต์แล้ว หากยังไม่มี ให้รันคำสั่งติดตั้งที่ Terminal:
Bash

npm install jspdf

4. วิธีทดสอบหน้างานหลังจากตั้งค่าสำเร็จ (Verification)

    รันระบบทดสอบในเครื่องด้วยคำสั่ง npm run dev

    เปิดเบราว์เซอร์แล้วเคลียร์แคชเก่าด้วยการกด Ctrl + F5 (Windows) หรือ Cmd + Shift + R (Mac)

    เข้าไปที่หน้า /borrows ทำรายการและกดพิมพ์รายงาน

    ตรวจสอบในหน้าต่าง Console ของเบราว์เซอร์ (กด F12) จะต้องขึ้นข้อความล็อกว่า: === ติดตั้งระบบฟอนต์ไทยผ่านเซิร์ฟเวอร์สำเร็จ ===

📁 โครงสร้างโปรเจคที่สำคัญ (Project Structure)
Plaintext

my-asset-app/
├── app/
│   ├── api/                    # Backend Route Handlers (API Endpoints)
│   │   ├── assets/             # API จัดการครุภัณฑ์ (GET, POST, PUT)
│   │   ├── borrows/            # API จัดการประวัติการยืม-คืน (GET)
│   │   └── font/
│   │       └── route.ts        # [NEW] API หลังบ้านแปลงไฟล์ฟอนต์ดิบเป็น Base64
│   ├── borrows/
│   │   ├── request/
│   │   │   └── generateBorrowPDF.ts # [UPDATE] ตัวคำนวณและสร้างเอกสาร PDF ภาษาไทย
│   │   └── page.tsx            # หน้าหลักอินเตอร์เฟสระบบยืม-คืน (/borrows)
│   ├── layout.tsx              # โครงสร้าง Layout หลักของแอปพลิเคชัน
│   └── page.tsx                # หน้าแรกของระบบ
├── components/                 # คอมโพเนนต์ UI หน้าบ้านที่นำกลับมาใช้ซ้ำ
│   ├── AssetTable.tsx          # ตารางจัดการทะเบียนครุภัณฑ์ + ฟอร์มค้นหา/เพิ่ม/แก้ไข
│   └── BorrowTable.tsx         # ตารางแสดงประวัติและค้นหาการยืม-คืนครุภัณฑ์
├── public/                     # ไฟล์สาธารณะสำหรับหน้าบ้าน
│   └── fonts/
│       └── THSarabunNew.ttf    # [NEW] ไฟล์ฟอนต์ไทยแท้ตัวสมบูรณ์สำหรับพิมพ์ PDF
├── .env.local                  # ไฟล์เก็บรหัสลับในการเชื่อมต่อฐานข้อมูล Supabase (Local)
└── tsconfig.json               # ไฟล์ตั้งค่าระบบ TypeScript และ Path Alias (@/*)

🚀 การติดตั้งและเปิดใช้งานในเครื่อง (Local Development)

    Clone โปรเจคลงเครื่อง:
    Bash

    git clone [https://github.com/YOUR_USERNAME/my-asset-app.git](https://github.com/YOUR_USERNAME/my-asset-app.git)
    cd my-asset-app

    ติดตั้ง Dependencies:
    Bash

    npm install

    ตั้งค่ารหัสลับฐานข้อมูล (Environment Variables):
    สร้างไฟล์ชื่อ .env.local ไว้ที่โฟลเดอร์นอกสุดของโปรเจค แล้วนำค่า URL และ Key จาก Supabase Project ของคุณมาใส่:
    Plaintext

    NEXT_PUBLIC_SUPABASE_URL=[https://your-project-id.supabase.co](https://your-project-id.supabase.co)
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

    รันเซิร์ฟเวอร์ทดสอบ:
    Bash

    npm run dev

    จากนั้นเปิดเว็บเบราว์เซอร์ไปที่: http://localhost:3000/borrows