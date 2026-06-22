import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 🛡️ อนุญาตให้เข้าถึงจาก IP ในเครือข่ายขณะพัฒนา (Dev mode)
  allowedDevOrigins: ['172.21.200.101', '192.168.100.33','192.168.1.213' ],
  
  // 🌐 รองรับการเข้าถึงจากทุก IP ในเครือข่าย (Production mode)
  // กรณีรันด้วย `next start` หรือ deploy บนเซิร์ฟเวอร์
  serverExternalPackages: [],
};


export default nextConfig;
