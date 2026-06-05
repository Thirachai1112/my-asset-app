"use strict";
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Swal from "sweetalert2";

interface Asset {
    id: string;
    asset_code: string;
    name: string;
    serial_number: string;
    contract_number: string;
    status: string; // ว่าง, กำลังใช้งาน, ชำรุด
}

export default function BorrowRequestPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);

    // ข้อมูลฟอร์มผู้ยืม
    const [borrowerName, setBorrowerName] = useState("");
    const [department, setDepartment] = useState("");
    const [phone, setPhone] = useState("");
    const [returnDate, setReturnDate] = useState("");

    // 1. ดึงข้อมูลครุภัณฑ์จากหลังบ้านเฉพาะชิ้นที่ "ว่าง"
    useEffect(() => {
        fetch("/api/assets")
            .then((res) => res.json())
            .then((responseBody) => {
                // ดึงอาร์เรย์จากคีย์ responseBody.data ที่หลังบ้านส่งมา (ถ้าไม่มีให้เป็นอาร์เรย์ว่าง)
                const assetsArray = Array.isArray(responseBody.data) ? responseBody.data : [];

                // กรองเอาเฉพาะชิ้นที่สถานะเป็น "ว่าง" หรือ "Available"
                const availableAssets = assetsArray.filter(
                    (item: Asset) => item.status === "ว่าง" || item.status === "Available"
                );

                setAssets(availableAssets);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching assets:", err);
                setLoading(false);
            });
    }, []);

    // 2. ฟังก์ชันเพิ่มของเข้าตะกร้า
    const addToCart = (asset: Asset) => {
        if (cart.some((item) => item.id === asset.id)) {
            Swal.fire({ icon: "warning", title: "มีอุปกรณ์ชิ้นนี้ในตะกร้าแล้ว", timer: 1500, showConfirmButton: false });
            return;
        }
        setCart([...cart, asset]);
    };

    // 3. ฟังก์ชันลบของออกจากตะกร้า
    const removeFromCart = (id: string) => {
        setCart(cart.filter((item) => item.id !== id));
    };

    // 4. กรองข้อมูลค้นหาจากตาราง
    const filteredAssets = assets.filter((asset) => {
        const name = asset?.name ? asset.name.toLowerCase() : "";
        const code = asset?.asset_code ? asset.asset_code.toLowerCase() : "";
        const serial = asset?.serial_number ? asset.serial_number.toLowerCase() : "";
        const search = searchTerm.toLowerCase();

        return name.includes(search) || code.includes(search) || serial.includes(search);
    });

    // 5. ส่งคำขอยืมชุดใหญ่ไปที่หลังบ้าน
    const handleSubmitBorrow = async (e: React.FormEvent) => {
        e.preventDefault();

        if (cart.length === 0) {
            Swal.fire({ icon: "error", title: "กรุณาเลือกครุภัณฑ์ลงตะกร้าอย่างน้อย 1 ชิ้น" });
            return;
        }

        Swal.fire({
            title: "กำลังบันทึกข้อมูล...",
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            // ยิง API บันทึกการยืม (ส่งข้อมูลตะกร้า และ รายละเอียดคนยืมพ่วงไปด้วยกัน)
            const response = await fetch("/api/borrows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    borrower_name: borrowerName,
                    department: department,
                    phone: phone,
                    return_date: returnDate,
                    items: cart.map((item) => ({ asset_id: item.id, asset_code: item.asset_code, asset_name: item.name, serial_number: item.serial_number }))
                })
            });

            if (!response.ok) throw new Error("บันทึกไม่สำเร็จ");

            Swal.fire({
                icon: "success",
                title: "ส่งคำขอยืมสำเร็จแล้ว!",
                text: "ระบบได้ทำการบันทึกข้อมูลเข้าประวัติเรียบร้อย",
                confirmButtonColor: "#3b82f6"
            }).then(() => {
                // ล้างค่าฟอร์มและตะกร้า
                setCart([]);
                setBorrowerName("");
                setDepartment("");
                setReturnDate("");
                // อัปเดตรีเฟรชข้อมูลตารางครุภัณฑ์ใหม่
                window.location.reload();
            });

        } catch (error) {
            console.error(error);
            Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาดในการเชื่อมต่อ", text: "กรุณาลองใหม่อีกครั้ง" });
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto">

                {/* ส่วนหัวหน้าจอ */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-4 border-b border-slate-800">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                            🛒 ระบบส่งคำขอยืมครุภัณฑ์
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">เลือกอุปกรณ์ที่ต้องการใส่ตะกร้า จากนั้นกรอกข้อมูลยืมด้านขวาได้เลย</p>
                    </div>
                    <Link href="/borrows" className="mt-4 md:mt-0 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl transition-colors border border-slate-700">
                        ← กลับหน้าประวัติการยืม
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* ================= ฝั่งซ้าย: รายการครุภัณฑ์ที่ว่าง (ความกว้าง 2 ส่วน) ================= */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                📦 ครุภัณฑ์ที่พร้อมให้ยืม ({assets.length} รายการ)
                            </h2>

                            {/* ช่องค้นหา */}
                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder="🔍 ค้นหาด้วย ชื่อครุภัณฑ์, รหัส หรือ Serial Number..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm transition-colors"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* ตารางข้อมูล */}
                            {loading ? (
                                <div className="text-center py-8 text-slate-400">กำลังโหลดรายการครุภัณฑ์...</div>
                            ) : filteredAssets.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">❌ ไม่พบข้อมูลครุภัณฑ์ที่พร้อมยืม</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                                                <th className="p-3">ชื่อครุภัณฑ์</th>
                                                <th className="p-3">รหัส/Serial</th>
                                                <th className="p-3">เลขที่สัญญา</th>
                                                <th className="p-3 text-center">การกระทำ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/60">
                                            {filteredAssets.map((asset) => (
                                                <tr key={asset.id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-3 font-mono text-xs">
                                                        <div className="text-blue-400 font-bold">{asset.asset_code}</div>
                                                        <div className="text-slate-500">{asset.serial_number || "-"}</div>
                                                    </td>
                                                    <td className="p-3 font-semibold text-white">{asset.name || "ไม่ระบุชื่อ"}</td>

                                                    {/* 👈 ✅ ช่องแสดงผลเลขสัญญาคอลลัมน์ใหม่ (ดึงตามชื่อฟิลด์จริงใน Supabase ของช่าง เช่น contract_number) */}
                                                    <td className="p-3 text-sm font-mono text-slate-300">
                                                        {asset.contract_number || "-"}
                                                    </td>

                                                    <td className="p-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => addToCart(asset)}
                                                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium text-xs transition-colors flex items-center gap-1 mx-auto shadow-lg shadow-blue-900/20"
                                                        >
                                                            <span>+</span> ใส่ตะกร้า
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ================= ฝั่งขวา: ตะกร้าและฟอร์มส่งข้อมูล (ความกว้าง 1 ส่วน) ================= */}
                    <div className="space-y-6">
                        <form onSubmit={handleSubmitBorrow} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-6">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center justify-between">
                                <span>📋 รายการใบยืมของคุณ</span>
                                <span className="text-xs bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full border border-blue-500/20">
                                    {cart.length} ชิ้น
                                </span>
                            </h2>

                            {/* รายการของในตะกร้า */}
                            <div className="mb-6 space-y-2 max-h-48 overflow-y-auto pr-1">
                                {cart.length === 0 ? (
                                    <div className="text-center py-6 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                                        🛒 ตะกร้ายังว่างเปล่า <br />กรุณากดเลือกอุปกรณ์จากฝั่งซ้าย
                                    </div>
                                ) : (
                                    cart.map((item) => (
                                        <div key={item.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs hover:border-slate-700 transition-colors">
                                            <div className="truncate max-w-[80%]">
                                                <div className="font-bold text-white truncate">{item.name}</div>
                                                <div className="text-slate-500 font-mono mt-0.5">{item.asset_code}</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFromCart(item.id)}
                                                className="text-red-400 hover:text-red-300 font-bold p-1 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* ฟอร์มกรอกข้อมูลผู้ยืม */}
                            <div className="space-y-4 border-t border-slate-800 pt-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">ชื่อ-นามสกุล ผู้ยืม</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="ระบุชื่อจริงของคุณ"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                                        value={borrowerName}
                                        onChange={(e) => setBorrowerName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">แผนก/กอง/ฝ่าย</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="เช่น ไอที, ซ่อมบำรุง, บัญชี"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                    />
                                </div>
                                {/* 👈 จุดที่ 3: บล็อกกล่องรับข้อมูลช่องทางติดต่อที่เพิ่มใหม่ */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">เบอร์โทร / ช่องทางติดต่อ</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="เบอร์โทรศัพท์ หรือ ID Line"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">กำหนดส่งคืนอุปกรณ์</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500 color-scheme-dark"
                                        value={returnDate}
                                        onChange={(e) => setReturnDate(e.target.value)}
                                    />
                                </div>

                                {/* ปุ่มกดยืนยันส่งข้อมูล */}
                                <button
                                    type="submit"
                                    disabled={cart.length === 0}
                                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 text-sm mt-2"
                                >
                                    🚀 ยืนยันคำขอยืมครุภัณฑ์
                                </button>
                            </div>

                        </form>
                    </div>

                </div>
            </div>
        </main>
    );
}