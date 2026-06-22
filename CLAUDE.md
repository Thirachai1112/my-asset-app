# Task Progress

## ปัญหา: เครื่องลูกที่เข้าผ่าน IP เด้งไปหน้า Login ตลอด

### สาเหตุหลัก
1. **Cookie `secure` flag**: ใน `app/api/auth/central/route.ts` มีการ set cookie ด้วย `secure: process.env.NODE_ENV === 'production'` ซึ่งเมื่อรันด้วย `next start` (production mode) ค่า `secure` จะเป็น `true` ทำให้ browser ไม่ยอม set cookie ถ้าเข้าเว็บผ่าน HTTP (ไม่ใช่ HTTPS) ส่งผลให้ `custom-auth-session` cookie ไม่ถูกส่งกลับไปยัง server ทำให้ proxy redirect ไปหน้า login ตลอด

2. **Missing `-H 0.0.0.0`**: คำสั่ง `next dev` และ `next start` โดยดีฟอลต์จะ bind เฉพาะ localhost เท่านั้น ทำให้เครื่องอื่นในเครือข่ายไม่สามารถเข้าถึงได้

3. **`allowedDevOrigins`**: ใช้ได้เฉพาะใน dev mode เท่านั้น

### แนวทางแก้ไข
- [x] วิเคราะห์สาเหตุของปัญหา
- [x] แก้ไข cookie ใน login API - เปลี่ยน `secure: false` เพื่อรองรับทั้ง HTTP และ HTTPS
- [x] แก้ไข `proxy.ts` - เพิ่ม error handling ในกรณี Supabase Auth ล้มเหลว
- [x] แก้ไข `package.json` - เพิ่ม `-H 0.0.0.0` ในทั้ง dev และ start script
- [x] แก้ไข `next.config.ts` - เพิ่มหมายเหตุและปรับปรุง config
