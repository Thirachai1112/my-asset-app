# 📦 Borrowing & Inventory System (ระบบคลังครุภัณฑ์และประวัติการยืม-คืน)

ระบบเว็บแอปพลิเคชันสำหรับบริหารจัดการคลังครุภัณฑ์/สินทรัพย์ และบันทึกประวัติการยืม-คืนอุปกรณ์อย่างเป็นระบบ พัฒนาด้วย **Next.js (App Router)** ร่วมกับ **Supabase** เป็นระบบฐานข้อมูลหลังบ้าน พร้อมการออกแบบหน้าตาที่ทันสมัยด้วย **Tailwind CSS**

---

## ✨ ฟีเจอร์เด่นของระบบ (Features)

### 🖥️ โมดูลจัดการคลังครุภัณฑ์ (Asset Management)
- **Dashboard & Table:** แสดงรายการครุภัณฑ์ทั้งหมดในคลัง พร้อมรหัส ID, ชื่อสินทรัพย์, แบรนด์, และ Serial Number
- **Contract Tracking:** รองรับการบันทึกเลขที่สัญญา หรือใบจัดซื้อ (`contract_number`) เพื่อใช้ในการตรวจรับและเช็คระยะประกัน
- **Real-time CRUD:** สามารถเพิ่มครุภัณฑ์ใหม่ และแก้ไขข้อมูล/สถานะอุปกรณ์ผ่านหน้าต่างป๊อปอัป (Modal Form) โดยข้อมูลหน้าจอจะอัปเดตสอดคล้องทันทีโดยไม่ต้องรีเฟรชหน้าเว็บ
- **Instant Search:** ระบบค้นหาอัจฉริยะฝั่งหน้าบ้าน (Client-side Filtering) ทำงานเร็วสายฟ้าแลบ สามารถพิมพ์ค้นหาด้วย ชื่อ, ยี่ห้อ, S/N หรือเลขที่สัญญาได้ทันที

### 📋 โมดูลประวัติการยืม-คืน (Borrow & Return History)
- **Relational Data Table:** แสดงประวัติการทำรายการยืม-คืนอย่างละเอียด โดยระบบจะดึงข้อมูลเชื่อมโยง (Join Relation) ระหว่างตารางใบยืมและตารางครุภัณฑ์มาแสดงผลร่วมกัน ทั้งชื่อผู้ยืม, แผนก, วันที่ยืม, กำหนดคืน รวมถึง "ชื่ออุปกรณ์" และ "Serial Number" อย่างครบถ้วน
- **Status Badges:** แสดงสถานะการยืมแบบแยกสีเด่นชัด (`กำลังยืมอยู่` / `คืนแล้ว`) เพื่อความสะดวกในการตรวจสอบของแอดมิน
- **Advanced History Search:** รองรับการเสิร์ชกรองประวัติการยืมด้วยชื่อบุคคล, แผนก หรือพิมพ์ค้นหาตามสถานะเช่นคำว่า 'กำลังยืม' หรือ 'คืนแล้ว' ได้ทันที

---

## 🛠️ เทคโนโลยีที่เลือกใช้ (Tech Stack)

- **Frontend Framework:** Next.js 14+ (TypeScript) พร้อมโครงสร้าง App Router
- **Styling:** Tailwind CSS (เน้นโทนสี Slate/Blue สไตล์ Clean & Modern Minimalist)
- **Database & Backend-as-a-Service:** Supabase (PostgreSQL)
- **HTTP Client:** Fetch API สำหรับเชื่อมต่อ Route Handlers หลังบ้าน

---

## 📁 โครงสร้างโปรเจคที่สำคัญ (Project Structure)

```text
my-asset-app/
├── app/
│   ├── api/                 # Backend Route Handlers (API Endpoints)
│   │   ├── assets/          # API จัดการครุภัณฑ์ (GET, POST, PUT)
│   │   └── borrows/         # API จัดการประวัติการยืม-คืน (GET)
│   ├── borrows/
│   │   └── page.tsx         # หน้าหลักอินเตอร์เฟสระบบยืม-คืน (/borrows)
│   ├── layout.tsx           # โครงสร้าง Layout หลักของแอปพลิเคชัน
│   └── page.tsx             # หน้าแรกของระบบ
├── components/              # คอมโพเนนต์ UI หน้าบ้านที่นำกลับมาใช้ซ้ำ
│   ├── AssetTable.tsx       # ตารางจัดการทะเบียนครุภัณฑ์ + ฟอร์มค้นหา/เพิ่ม/แก้ไข
│   └── BorrowTable.tsx      # ตารางแสดงประวัติและค้นหาการยืม-คืนครุภัณฑ์
├── .env.local               # ไฟล์เก็บรหัสลับในการเชื่อมต่อฐานข้อมูล (Local)
└── tsconfig.json            # ไฟล์ตั้งค่าระบบ TypeScript และ Path Alias (@/*)

การติดตั้งและเปิดใช้งานในเครื่อง (Local Development)
Clone โปรเจคลงเครื่อง:

Bash
git clone [https://github.com/YOUR_USERNAME/my-asset-app.git](https://github.com/YOUR_USERNAME/my-asset-app.git)
cd my-asset-app
ติดตั้ง Dependencies:

Bash
npm install
ตั้งค่ารหัสลับฐานข้อมูล (Environment Variables):
สร้างไฟล์ชื่อ .env.local ไว้ที่โฟลเดอร์นอกสุดของโปรเจค แล้วนำค่า URL และ Key จาก Supabase Project ของคุณมาใส่:

ข้อมูลโค้ด
NEXT_PUBLIC_SUPABASE_URL=[https://your-project-id.supabase.co](https://your-project-id.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
รันเซิร์ฟเวอร์ทดสอบ:

Bash
npm run dev
จากนั้นเปิดเว็บเบราว์เซอร์ไปที่: http://localhost:3000/borrows