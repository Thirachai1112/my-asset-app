"use strict";
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
// 📄 นำเข้าฟังก์ชันสร้างเอกสาร PDF ที่อยู่ข้างกันเข้ามาใช้งาน
import { generateBorrowPDF } from "./generateBorrowPDF";

interface Asset {
    id: string;
    asset_code: string;
    borrower_purpose: string;
    name: string;
    brand: string;
    type: string;
    serial_number: string;
    contract_number: string;
    status: string; // ว่าง, กำลังใช้งาน, ชำรุด
}

// 🎯 โครงสร้างไอเทมในตะกร้า (ขยายเพิ่มฟิลด์ quantity เพื่อเก็บจำนวนชิ้น)
interface CartItem extends Asset {
    quantity: number;
}

// 🗺️ ออบเจกต์แมปไอคอนตามประเภทอุปกรณ์ สำหรับธีมดาร์ก
const ASSET_TYPES: { [key: string]: string } = {
    Notebook: "💻",
    Tablet: "📱",
    Desktop: "🖥️",
    Monitor: "📺",
    Projector: "📹",
    Printer: "🖨️",
    Scanner: "📑",
    UPS: "🔋",
    network: "🌐",
    Camera: "📷",
    Other: "🛠️",
    microphone: "🎤",
    Signalcable: "🔌",
    "Wiring set": "🔌"
};

export default function BorrowRequestPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]); // 🎯 ปรับ State รองรับ CartItem ชนิดใหม่ที่มีจำนวนชิ้น
    const [loading, setLoading] = useState(true);

    // ข้อมูลฟอร์มผู้ยืม
    const [borrowerPurpose, setBorrowerPurpose] = useState("");
    const [borrowerName, setBorrowerName] = useState("");
    const [position, setPosition] = useState(""); // 🛠️ State สำหรับตำแหน่งงาน
    const [department, setDepartment] = useState("");
    const [phone, setPhone] = useState("");
    const [returnDate, setReturnDate] = useState("");

    // 🎯 State สำหรับระบบ Pagination (แบ่งตารางหน้าละ 5 รายการ)
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // 1. ดึงข้อมูลครุภัณฑ์ทั้งหมดจากหลังบ้าน
    useEffect(() => {
        fetch("/api/assets")
            .then((res) => res.json())
            .then((responseBody) => {
                const assetsArray = Array.isArray(responseBody.data) ? responseBody.data : [];
                setAssets(assetsArray);
                setLoading(false);
                setIsMounted(true);
            })
            .catch((err) => {
                console.error("Error fetching assets:", err);
                loading && setLoading(false);
                setIsMounted(true);
            });
    }, [loading]);

    // 2. ฟังก์ชันเพิ่มของเข้าตะกร้า (ถ้าซ้ำชิ้นเดิมจะไปบวกเพิ่มจำนวนที่หางตะกร้า)
    const addToCart = (asset: Asset) => {
        setCart((prevCart) => {
            const existing = prevCart.find((item) => item.id === asset.id);
            if (existing) {
                Swal.fire({ icon: "success", title: "เพิ่มจำนวนอุปกรณ์ในตะกร้าแล้ว", timer: 1000, showConfirmButton: false });
                return prevCart.map((item) =>
                    item.id === asset.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            Swal.fire({ icon: "success", title: "เพิ่มลงตะกร้าสำเร็จ", timer: 1000, showConfirmButton: false });
            return [...prevCart, { ...asset, quantity: 1 }];
        });
    };

    // 🎯 ฟังก์ชันเพิ่ม/ลดจำนวนชิ้นอุปกรณ์ในหน้าตะกร้าโดยตรง
    const updateQuantity = (id: string, newQty: number) => {
        if (newQty < 1) return; // ล็อกไม่ให้ลดจนติดลบหรือเป็น 0 (ถ้าจะเอาออกให้กดรูปถังขยะ)
        setCart((prevCart) =>
            prevCart.map((item) => (item.id === id ? { ...item, quantity: newQty } : item))
        );
    };

    // 3. ฟังก์ชันลบของออกจากตะกร้า
    const removeFromCart = (id: string) => {
        setCart(cart.filter((item) => item.id !== id));
    };

    // 🔍 4. ตรรกะการกรองค้นหา และแยกประเภทออกเป็น 2 ตาราง
    const searchLower = searchTerm.toLowerCase().trim();

    const searchedAssets = assets.filter((asset) => {
        const name = asset?.name ? asset.name.toLowerCase() : "";
        const brand = asset?.brand ? asset.brand.toLowerCase() : "";
        const code = asset?.asset_code ? asset.asset_code.toLowerCase() : "";
        const type = asset?.type ? asset.type.toLowerCase() : "";
        const serial = asset?.serial_number ? asset.serial_number.toLowerCase() : "";
        return name.includes(searchLower) || code.includes(searchLower) || type.includes(searchLower) || serial.includes(searchLower) || brand.includes(searchLower);
    });

    // 🟢 ตารางบน: ครุภัณฑ์ที่พร้อมให้ยืม (สถานะ ว่าง หรือ Available)
    const availableAssets = searchedAssets.filter(
        (item) => item.status === "ว่าง" || item.status === "Available"
    );

    // 🎯 คำนวณตัดแบ่งข้อมูลครุภัณฑ์ที่พร้อมยืม ให้เหลือแสดงหน้าละ 5 รายการ
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentAvailableAssets = availableAssets.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(availableAssets.length / itemsPerPage);

    // 🔒 ตารางล่าง: ครุภัณฑ์ที่ถูกยืมอยู่ หรือไม่ว่างชั่วคราว
    const borrowedAssets = searchedAssets.filter(
        (item) => item.status !== "ว่าง" && item.status !== "Available"
    );

    // 5. ส่งคำขอยืมชุดใหญ่ไปที่หลังบ้าน
    const handleSubmitBorrow = async (e: React.FormEvent) => {
        e.preventDefault();

        if (cart.length === 0) {
            Swal.fire({ icon: "error", title: "กรุณาเลือกอุปกรณ์ลงตะกร้าอย่างน้อย 1 ชิ้น" });
            return;
        }

        Swal.fire({
            title: "กำลังบันทึกข้อมูล...",
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            const response = await fetch("/api/borrows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    borrower_name: borrowerName,
                    position: position, // 🛠️ ส่งค่าตำแหน่งไปยัง API
                    borrower_purpose: borrowerPurpose,
                    department: department,
                    phone: phone,
                    return_date: returnDate,
                    items: cart.map((item) => ({
                        asset_id: item.id,
                        asset_name: item.name,
                        asset_brand: item.brand,
                        asset_type: item.type,
                        serial_number: item.serial_number,
                        contract_number: item.contract_number,
                        quantity: item.quantity // 🎯 แนบจำนวนชิ้นแต่ละไอเทมส่งไปหลังบ้าน
                    }))
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.message || `Server ตอบกลับด้วยรหัสสถานะ ${response.status}`);
            }

            // 📄 เรียกใช้ไฟล์ Utility เพื่อสั่งสร้างและดาวน์โหลดเอกสาร PDF ทันที
            await generateBorrowPDF(
                {
                    borrower_name: borrowerName,
                    position: position, // 🛠️ ส่งค่าตำแหน่งไปพ่นใน PDF
                    borrower_purpose: borrowerPurpose,
                    department: department,
                    phone: phone,
                    return_date: returnDate
                },
                cart.map(item => ({
                    id: Number(item.id),
                    asset_code: item.asset_code,
                    name: item.name,
                    brand: item.brand,
                    type: item.type,
                    serial_number: item.serial_number,
                    contract_number: item.contract_number,
                    quantity: item.quantity // 🎯 แนบจำนวนชิ้นส่งไปจัดสไตล์พ่นในไฟล์ PDF
                }))
            );

            Swal.fire({
                icon: "success",
                title: "ส่งคำขอยืมสำเร็จแล้ว!",
                text: "ระบบได้บันทึกข้อมูลและกำลังดาวน์โหลดใบอนุมัติยืม PDF",
                confirmButtonColor: "#3b82f6"
            }).then(() => {
                setCart([]);
                setBorrowerName("");
                setPosition(""); // 🛠️ ล้างค่าหลังส่งฟอร์มสำเร็จ
                setDepartment("");
                setPhone("");
                setReturnDate("");
                window.location.reload();
            });

        } catch (error: any) {
            console.error(error);
            Swal.fire({
                icon: "error",
                title: "เกิดข้อผิดพลาดในการบันทึก",
                text: error.message || "กรุณาตรวจสอบการเชื่อมต่อระบบฐานข้อมูล",
                confirmButtonColor: "#ef4444"
            });
        }
    };

    if (!isMounted) return null;

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto">

                {/* ส่วนหัวหน้าจอ */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-4 border-b border-slate-800">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                            🛒 ระบบส่งคำขอยืมอุปกรณ์
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">เลือกอุปกรณ์ที่ต้องการใส่ตะกร้า จากนั้นกรอกข้อมูลยืมด้านขวาได้เลย</p>
                    </div>
                    <Link href="/" className="mt-4 md:mt-0 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl transition-colors border border-slate-700">
                        ← กลับหน้าหลัก
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* ================= ฝั่งซ้าย: โซนตารางข้อมูลครุภัณฑ์ ================= */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* 🟢 ตารางที่ 1: อุปกรณ์ที่พร้อมให้ยืม */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                🟢 อุปกรณ์ที่พร้อมให้ยืม ({availableAssets.length} รายการ)
                            </h2>

                            {/* ช่องค้นหา */}
                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder="🔍 ค้นหาด้วย ชื่ออุปกรณ์, แบรนด์, ประเภท, รหัส หรือ Serial Number..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm transition-colors"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1); // ดีดกลับหน้า 1 อัตโนมัติป้องกันบั๊กหน้าว่าง
                                    }}
                                />
                            </div>

                            {/* ตารางข้อมูลที่พร้อมยืม */}
                            {loading ? (
                                <div className="text-center py-8 text-slate-400">กำลังโหลดรายการอุปกรณ์...</div>
                            ) : availableAssets.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">❌ ไม่พบข้อมูลอุปกรณ์ที่พร้อมยืม</div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                                                    <th className="p-3">ชื่ออุปกรณ์</th>
                                                    <th className="p-3">แบรนด์</th>
                                                    <th className="p-3">ประเภท</th>
                                                    <th className="p-3">รหัส/Serial</th>
                                                    <th className="p-3">รหัสทรัพย์สิน</th>
                                                    <th className="p-3">เลขที่สัญญา</th>
                                                    <th className="p-3 text-center">การกระทำ</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/60">
                                                {currentAvailableAssets.map((asset) => {
                                                    const assetType = asset.type || "Other";
                                                    const typeIcon = ASSET_TYPES[assetType] || "🛠️";

                                                    return (
                                                        <tr key={asset.id} className="hover:bg-slate-800/30 transition-colors">
                                                            <td className="p-3">
                                                                <div className="text-white font-semibold">{asset.name || "-"}</div>
                                                            </td>
                                                            <td className="p-3 text-slate-300 font-mono text-xs">
                                                                {asset.brand || "-"}
                                                            </td>
                                                            <td className="p-3">
                                                                <span className="px-2.5 py-1 bg-slate-950 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium inline-flex items-center gap-1.5">
                                                                    {typeIcon} {assetType}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-slate-300 font-mono text-xs">
                                                                {asset.serial_number || "-"}
                                                            </td>
                                                            <td className="p-3 text-slate-300 font-mono text-xs">
                                                                {asset.asset_code || "-"}
                                                            </td>
                                                            <td className="p-3 text-xs font-mono text-slate-400">
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
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* 🎯 บล็อกชุดปุ่มกด Pagination ใต้ตาราง Available */}
                                    {totalPages > 1 && (
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t border-slate-800/60 gap-3">
                                            <p className="text-xs text-slate-500 text-center sm:text-left">
                                                แสดง {indexOfFirstItem + 1} ถึง {Math.min(indexOfLastItem, availableAssets.length)} จากทั้งหมด {availableAssets.length} รายการ
                                            </p>
                                            <div className="flex items-center justify-center space-x-1.5">
                                                <button
                                                    type="button"
                                                    disabled={currentPage === 1}
                                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 transition-colors"
                                                >
                                                    ก่อนหน้า
                                                </button>

                                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                                    <button
                                                        key={page}
                                                        type="button"
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${currentPage === page
                                                                ? "bg-blue-600 text-white"
                                                                : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                                                            }`}
                                                    >
                                                        {page}
                                                    </button>
                                                ))}

                                                <button
                                                    type="button"
                                                    disabled={currentPage === totalPages}
                                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 transition-colors"
                                                >
                                                    ถัดไป
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* 🔒 ตารางที่ 2: ครุภัณฑ์ที่อยู่ระหว่างการยืมหรือชำรุด */}
                        {!loading && (
                            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
                                <h2 className="text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">
                                    🔒 อุปกรณ์ที่ไม่ว่างชั่วคราว ({borrowedAssets.length} รายการ)
                                </h2>
                                <p className="text-xs text-slate-600 mb-4">อุปกรณ์กลุ่มนี้อยู่ระหว่างการใช้งานหรือชำรุด จะเปิดให้ยืมเมื่อได้รับการส่งคืนและปรับสถานะ</p>

                                {borrowedAssets.length === 0 ? (
                                    <div className="text-center py-6 text-slate-600 text-xs">✨ ไม่มีอุปกรณ์ถูกยืมอยู่ ทุกชิ้นพร้อมใช้งานทั้งหมด</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs sm:text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-800/60 text-slate-500 font-medium">
                                                    <th className="p-3">ชื่ออุปกรณ์</th>
                                                    <th className="p-3">แบรนด์</th>
                                                    <th className="p-3">ประเภท</th>
                                                    <th className="p-3">รหัส/Serial</th>
                                                    <th className="p-3">รหัสทรัพย์สิน</th>
                                                    <th className="p-3">เลขที่สัญญา</th>
                                                    <th className="p-3 text-center">สถานะ</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/30 text-slate-400">
                                                {borrowedAssets.map((asset) => {
                                                    const assetType = asset.type || "Other";
                                                    const typeIcon = ASSET_TYPES[assetType] || "🛠️";
                                                    const isBroken = asset.status === "ชำรุด";

                                                    return (
                                                        <tr key={asset.id} className="hover:bg-slate-800/10 transition-colors opacity-70">
                                                            <td className="p-3">
                                                                <div className="text-slate-400 font-medium">{asset.name || "-"}</div>
                                                            </td>
                                                            <td className="p-3 text-slate-500 font-mono text-xs">
                                                                {asset.brand || "-"}
                                                            </td>
                                                            <td className="p-3">
                                                                <span className="px-2 py-0.5 bg-slate-950/50 text-slate-500 border border-slate-900 rounded text-xs inline-flex items-center gap-1">
                                                                    {typeIcon} {assetType}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-slate-500 font-mono text-xs">
                                                                {asset.serial_number || "-"}
                                                            </td>
                                                            <td className="p-3 text-slate-500 font-mono text-xs">
                                                                {asset.asset_code || "-"}
                                                            </td>
                                                            <td className="p-3 text-xs font-mono text-slate-600">
                                                                {asset.contract_number || "-"}
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${isBroken
                                                                        ? "bg-red-950/40 text-red-400 border-red-900/40"
                                                                        : "bg-amber-950/40 text-amber-400 border-amber-900/40"
                                                                    }`}>
                                                                    ● {asset.status || "ถูกยืมอยู่"}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ================= ฝั่งขวา: ตะกร้าและฟอร์มส่งข้อมูล ================= */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-6">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center justify-between">
                                📋 รายการใบยืมของคุณ
                                <span className="text-xs bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full border border-blue-500/20">
                                    {cart.reduce((sum, item) => sum + item.quantity, 0)} ชิ้น
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
                                        <div key={item.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs hover:border-slate-700 transition-colors gap-2">
                                            <div className="truncate max-w-[50%]">
                                                <div className="font-bold text-white truncate">{item.name}</div>
                                                <div className="text-slate-500 font-mono mt-0.5">{item.asset_code}</div>
                                            </div>

                                            {/* ปุ่มเพิ่ม-ลดจำนวนชิ้นของอุปกรณ์แต่ละชิ้น */}
                                            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors font-bold text-sm"
                                                >
                                                    -
                                                </button>
                                                <span className="text-white font-bold w-5 text-center text-xs">{item.quantity}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors font-bold text-sm"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => removeFromCart(item.id)}
                                                className="text-red-400 hover:text-red-300 font-bold p-1 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* ฟอร์มกรอกข้อมูลผู้ยืม */}
                            <form onSubmit={handleSubmitBorrow} className="space-y-4 border-t border-slate-800 pt-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">วัตถุประสงค์การใช้งาน</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="ระบุวัตถุประสงค์การใช้งาน"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                                        value={borrowerPurpose}
                                        onChange={(e) => setBorrowerPurpose(e.target.value)}
                                    />
                                </div>

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

                                {/* 🛠️ เพิ่มฟิลด์ตำแหน่งงาน (Job Position) ตรงนี้ */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">ตำแหน่งงาน (Position)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="เช่น Engineer, Technician, Admin"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                                        value={position}
                                        onChange={(e) => setPosition(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">แผนก/ฝ่าย (Department)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="ระบุฝ่ายหรือแผนกสังกัด"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">เบอร์โทรศัพท์ติดต่อ</label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="ระบุเบอร์โทรศัพท์ 10 หลัก"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">วันกำหนดส่งคืนอุปกรณ์</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                                        value={returnDate}
                                        onChange={(e) => setReturnDate(e.target.value)}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors shadow-lg shadow-blue-900/30 mt-2"
                                >
                                    💾 ยืนยันคำขอยืมและพิมพ์ใบอนุมัติ
                                </button>
                            </form>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
}