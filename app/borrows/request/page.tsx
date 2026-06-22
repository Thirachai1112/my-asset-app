"use strict";
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
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
    status: string;
}

interface CartItem extends Asset {
    quantity: number;
}

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

const COLORS = {
    primary: "#8b5cf6",
    primaryLight: "rgba(139,92,246,0.12)",
    primaryBorder: "rgba(139,92,246,0.18)",
    bg: "#0d0b1a",
    card: "#15112b",
    cardBorder: "rgba(139,92,246,0.18)",
    text: "#ece9f8",
    muted: "#9585c4",
    green: "#34d399",
    red: "#ef4444",
    blue: "#60a5fa",
    purple: "#8b5cf6",
    indigo: "#6366F1",
    amber: "#f59e0b",
    emerald: "#34d399",
};

export default function BorrowRequestPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [borrowerPurpose, setBorrowerPurpose] = useState("");
    const [borrowerName, setBorrowerName] = useState("");
    const [position, setPosition] = useState("");
    const [department, setDepartment] = useState("");
    const [phone, setPhone] = useState("");
    const [returnDate, setReturnDate] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

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

    const updateQuantity = (id: string, newQty: number) => {
        if (newQty < 1) return;
        setCart((prevCart) =>
            prevCart.map((item) => (item.id === id ? { ...item, quantity: newQty } : item))
        );
    };

    const removeFromCart = (id: string) => {
        setCart(cart.filter((item) => item.id !== id));
    };

    const searchLower = searchTerm.toLowerCase().trim();

    const searchedAssets = assets.filter((asset) => {
        const name = asset?.name ? asset.name.toLowerCase() : "";
        const brand = asset?.brand ? asset.brand.toLowerCase() : "";
        const code = asset?.asset_code ? asset.asset_code.toLowerCase() : "";
        const type = asset?.type ? asset.type.toLowerCase() : "";
        const serial = asset?.serial_number ? asset.serial_number.toLowerCase() : "";
        return name.includes(searchLower) || code.includes(searchLower) || type.includes(searchLower) || serial.includes(searchLower) || brand.includes(searchLower);
    });

    const availableAssets = searchedAssets.filter(
        (item) => item.status === "ว่าง" || item.status === "Available"
    );

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentAvailableAssets = availableAssets.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(availableAssets.length / itemsPerPage);

    const borrowedAssets = searchedAssets.filter(
        (item) => item.status !== "ว่าง" && item.status !== "Available"
    );

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
                    position: position,
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
                        quantity: item.quantity
                    }))
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.message || `Server ตอบกลับด้วยรหัสสถานะ ${response.status}`);
            }

            await generateBorrowPDF(
                {
                    borrower_name: borrowerName,
                    position: position,
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
                    quantity: item.quantity
                }))
            );

            Swal.fire({
                icon: "success",
                title: "ส่งคำขอยืมสำเร็จแล้ว!",
                text: "ระบบได้บันทึกข้อมูลและกำลังดาวน์โหลดใบอนุมัติยืม PDF",
                confirmButtonColor: "#8b5cf6"
            }).then(() => {
                setCart([]);
                setBorrowerName("");
                setPosition("");
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
        <main
            className="min-h-screen p-4 md:p-8"
            style={{ background: COLORS.bg, fontFamily: "'DM Sans', sans-serif" }}
        >
            <div className="max-w-7xl mx-auto">
                {/* ===== HEADER ===== */}
                <div
                    className="rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden"
                    style={{
                        background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)",
                        border: `1px solid ${COLORS.primaryBorder}`,
                    }}
                >
                    <div
                        className="absolute -top-16 -right-16 w-64 h-64 rounded-full"
                        style={{
                            background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
                        }}
                    />
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between relative">
                        <div className="flex items-center gap-4">
                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                                style={{ background: "rgba(255,255,255,0.12)" }}
                            >
                                🛒
                            </div>
                            <div>
                                <h1
                                    className="text-2xl md:text-3xl font-bold text-white"
                                    style={{ fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }}
                                >
                                    ระบบส่งคำขอยืมอุปกรณ์
                                </h1>
                                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>
                                    เลือกอุปกรณ์ที่ต้องการใส่ตะกร้า จากนั้นกรอกข้อมูลยืมด้านขวาได้เลย
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/"
                            className="mt-4 md:mt-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                            style={{
                                background: "rgba(255,255,255,0.1)",
                                color: "#FFFFFF",
                                border: "1px solid rgba(255,255,255,0.15)",
                            }}
                        >
                            ← กลับหน้าหลัก
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* ================= ฝั่งซ้าย: โซนตารางข้อมูลครุภัณฑ์ ================= */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* 🟢 ตารางที่ 1: อุปกรณ์ที่พร้อมให้ยืม */}
                        <div
                            className="rounded-2xl p-6"
                            style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h2
                                    className="text-lg font-bold flex items-center gap-2"
                                    style={{ color: COLORS.text, fontFamily: "'Playfair Display', serif" }}
                                >
                                    <span className="w-3 h-3 rounded-full" style={{ background: COLORS.green }}></span>
                                    อุปกรณ์ที่พร้อมให้ยืม
                                    <span
                                        className="text-xs px-2.5 py-1 rounded-full font-mono"
                                        style={{ background: COLORS.primaryLight, color: COLORS.primary }}
                                    >
                                        {availableAssets.length} รายการ
                                    </span>
                                </h2>
                            </div>

                            {/* ช่องค้นหา */}
                            <div className="mb-5">
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none" style={{ color: COLORS.muted }}>
                                        🔍
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="ค้นหาด้วย ชื่ออุปกรณ์, แบรนด์, ประเภท, รหัส หรือ Serial Number..."
                                        className="w-full rounded-xl pl-11 pr-4 py-3 text-sm transition-all outline-none"
                                        style={{
                                            background: COLORS.bg,
                                            border: `1px solid ${COLORS.primaryBorder}`,
                                            color: COLORS.text,
                                        }}
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                    />
                                </div>
                            </div>

                            {/* ตารางข้อมูลที่พร้อมยืม */}
                            {loading ? (
                                <div className="text-center py-12" style={{ color: COLORS.muted }}>
                                    <div
                                        className="w-10 h-10 rounded-full mx-auto mb-4 animate-spin"
                                        style={{
                                            border: "3px solid rgba(139,92,246,0.1)",
                                            borderTopColor: COLORS.primary,
                                        }}
                                    />
                                    กำลังโหลดรายการอุปกรณ์...
                                </div>
                            ) : availableAssets.length === 0 ? (
                                <div className="text-center py-12" style={{ color: COLORS.muted }}>
                                    <span className="text-4xl block mb-3">📭</span>
                                    ไม่พบข้อมูลอุปกรณ์ที่พร้อมยืม
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COLORS.primaryBorder}` }}>
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr style={{ background: COLORS.bg, borderBottom: `1px solid ${COLORS.primaryBorder}` }}>
                                                    <th className="p-4 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.muted }}>ชื่ออุปกรณ์</th>
                                                    <th className="p-4 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.muted }}>แบรนด์</th>
                                                    <th className="p-4 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.muted }}>ประเภท</th>
                                                    <th className="p-4 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.muted }}>รหัส/Serial</th>
                                                    <th className="p-4 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.muted }}>รหัสทรัพย์สิน</th>
                                                    <th className="p-4 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.muted }}>เลขที่สัญญา</th>
                                                    <th className="p-4 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.muted }}>การกระทำ</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y" style={{ borderColor: COLORS.primaryBorder }}>
                                                {currentAvailableAssets.map((asset) => {
                                                    const assetType = asset.type || "Other";
                                                    const typeIcon = ASSET_TYPES[assetType] || "🛠️";

                                                    return (
                                                        <tr key={asset.id} className="transition-colors hover:bg-white/[0.02]">
                                                            <td className="p-4">
                                                                <div className="font-semibold" style={{ color: COLORS.text }}>{asset.name || "-"}</div>
                                                            </td>
                                                            <td className="p-4 font-mono text-xs" style={{ color: COLORS.muted }}>
                                                                {asset.brand || "-"}
                                                            </td>
                                                            <td className="p-4">
                                                                <span
                                                                    className="px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
                                                                    style={{
                                                                        background: COLORS.primaryLight,
                                                                        color: COLORS.primary,
                                                                        border: `1px solid ${COLORS.primaryBorder}`,
                                                                    }}
                                                                >
                                                                    {typeIcon} {assetType}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 font-mono text-xs" style={{ color: COLORS.muted }}>
                                                                {asset.serial_number || "-"}
                                                            </td>
                                                            <td className="p-4 font-mono text-xs" style={{ color: COLORS.muted }}>
                                                                {asset.asset_code || "-"}
                                                            </td>
                                                            <td className="p-4 text-xs font-mono" style={{ color: COLORS.muted }}>
                                                                {asset.contract_number || "-"}
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => addToCart(asset)}
                                                                    className="px-4 py-2 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 mx-auto"
                                                                    style={{
                                                                        background: COLORS.primary,
                                                                        color: "#FFFFFF",
                                                                        boxShadow: `0 4px 15px rgba(139,92,246,0.3)`,
                                                                    }}
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

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-5 pt-4 gap-3" style={{ borderTop: `1px solid ${COLORS.primaryBorder}` }}>
                                            <p className="text-xs" style={{ color: COLORS.muted }}>
                                                แสดง {indexOfFirstItem + 1} ถึง {Math.min(indexOfLastItem, availableAssets.length)} จากทั้งหมด {availableAssets.length} รายการ
                                            </p>
                                            <div className="flex items-center justify-center space-x-1.5">
                                                <button
                                                    type="button"
                                                    disabled={currentPage === 1}
                                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                                                    style={{
                                                        background: COLORS.bg,
                                                        border: `1px solid ${COLORS.primaryBorder}`,
                                                        color: COLORS.muted,
                                                    }}
                                                >
                                                    ก่อนหน้า
                                                </button>

                                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                                    <button
                                                        key={page}
                                                        type="button"
                                                        onClick={() => setCurrentPage(page)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors"
                                                        style={{
                                                            background: currentPage === page ? COLORS.primary : COLORS.bg,
                                                            color: currentPage === page ? "#FFFFFF" : COLORS.muted,
                                                            border: currentPage === page ? "none" : `1px solid ${COLORS.primaryBorder}`,
                                                        }}
                                                    >
                                                        {page}
                                                    </button>
                                                ))}

                                                <button
                                                    type="button"
                                                    disabled={currentPage === totalPages}
                                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                                                    style={{
                                                        background: COLORS.bg,
                                                        border: `1px solid ${COLORS.primaryBorder}`,
                                                        color: COLORS.muted,
                                                    }}
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
                            <div
                                className="rounded-2xl p-6"
                                style={{ background: COLORS.card, border: `1px solid ${COLORS.primaryBorder}` }}
                            >
                                <h2 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: COLORS.muted }}>
                                    🔒 อุปกรณ์ที่ไม่ว่างชั่วคราว
                                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: COLORS.red }}>
                                        {borrowedAssets.length} รายการ
                                    </span>
                                </h2>
                                <p className="text-xs mb-5" style={{ color: COLORS.muted }}>
                                    อุปกรณ์กลุ่มนี้อยู่ระหว่างการใช้งานหรือชำรุด จะเปิดให้ยืมเมื่อได้รับการส่งคืนและปรับสถานะ
                                </p>

                                {borrowedAssets.length === 0 ? (
                                    <div className="text-center py-8 text-xs" style={{ color: COLORS.muted }}>
                                        ✨ ไม่มีอุปกรณ์ถูกยืมอยู่ ทุกชิ้นพร้อมใช้งานทั้งหมด
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COLORS.primaryBorder}` }}>
                                        <table className="w-full text-left text-xs sm:text-sm">
                                            <thead>
                                                <tr style={{ background: COLORS.bg, borderBottom: `1px solid ${COLORS.primaryBorder}` }}>
                                                    <th className="p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.muted }}>ชื่ออุปกรณ์</th>
                                                    <th className="p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.muted }}>แบรนด์</th>
                                                    <th className="p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.muted }}>ประเภท</th>
                                                    <th className="p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.muted }}>รหัส/Serial</th>
                                                    <th className="p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.muted }}>รหัสทรัพย์สิน</th>
                                                    <th className="p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.muted }}>เลขที่สัญญา</th>
                                                    <th className="p-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.muted }}>สถานะ</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y" style={{ borderColor: COLORS.primaryBorder }}>
                                                {borrowedAssets.map((asset) => {
                                                    const assetType = asset.type || "Other";
                                                    const typeIcon = ASSET_TYPES[assetType] || "🛠️";
                                                    const isBroken = asset.status === "ชำรุด";

                                                    return (
                                                        <tr key={asset.id} className="transition-colors opacity-60 hover:opacity-80">
                                                            <td className="p-3">
                                                                <div className="font-medium" style={{ color: COLORS.text }}>{asset.name || "-"}</div>
                                                            </td>
                                                            <td className="p-3 font-mono text-xs" style={{ color: COLORS.muted }}>
                                                                {asset.brand || "-"}
                                                            </td>
                                                            <td className="p-3">
                                                                <span
                                                                    className="px-2 py-0.5 rounded text-xs inline-flex items-center gap-1"
                                                                    style={{
                                                                        background: COLORS.bg,
                                                                        color: COLORS.muted,
                                                                        border: `1px solid ${COLORS.primaryBorder}`,
                                                                    }}
                                                                >
                                                                    {typeIcon} {assetType}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 font-mono text-xs" style={{ color: COLORS.muted }}>
                                                                {asset.serial_number || "-"}
                                                            </td>
                                                            <td className="p-3 font-mono text-xs" style={{ color: COLORS.muted }}>
                                                                {asset.asset_code || "-"}
                                                            </td>
                                                            <td className="p-3 text-xs font-mono" style={{ color: COLORS.muted }}>
                                                                {asset.contract_number || "-"}
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <span
                                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border"
                                                                    style={{
                                                                        background: isBroken ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                                                                        color: isBroken ? COLORS.red : COLORS.amber,
                                                                        borderColor: isBroken ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)",
                                                                    }}
                                                                >
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
                        <div
                            className="rounded-2xl p-6 sticky top-6"
                            style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}
                        >
                            <h2 className="text-lg font-bold mb-5 flex items-center justify-between" style={{ color: COLORS.text, fontFamily: "'Playfair Display', serif" }}>
                                📋 รายการใบยืมของคุณ
                                <span
                                    className="text-xs px-3 py-1 rounded-full font-mono"
                                    style={{ background: COLORS.primaryLight, color: COLORS.primary, border: `1px solid ${COLORS.primaryBorder}` }}
                                >
                                    {cart.reduce((sum, item) => sum + item.quantity, 0)} ชิ้น
                                </span>
                            </h2>

                            {/* รายการของในตะกร้า */}
                            <div className="mb-6 space-y-2 max-h-48 overflow-y-auto pr-1">
                                {cart.length === 0 ? (
                                    <div
                                        className="text-center py-8 rounded-xl text-xs"
                                        style={{
                                            border: `2px dashed ${COLORS.primaryBorder}`,
                                            color: COLORS.muted,
                                        }}
                                    >
                                        🛒 ตะกร้ายังว่างเปล่า <br />กรุณากดเลือกอุปกรณ์จากฝั่งซ้าย
                                    </div>
                                ) : (
                                    cart.map((item) => (
                                        <div
                                            key={item.id}
                                            className="rounded-xl p-3 flex items-center justify-between text-xs gap-2 transition-colors"
                                            style={{
                                                background: COLORS.bg,
                                                border: `1px solid ${COLORS.primaryBorder}`,
                                            }}
                                        >
                                            <div className="truncate max-w-[45%]">
                                                <div className="font-bold truncate" style={{ color: COLORS.text }}>{item.name}</div>
                                                <div className="font-mono mt-0.5" style={{ color: COLORS.muted }}>{item.asset_code}</div>
                                            </div>

                                            <div
                                                className="flex items-center gap-1.5 rounded-lg p-1 shrink-0"
                                                style={{ background: COLORS.card, border: `1px solid ${COLORS.primaryBorder}` }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="w-6 h-6 flex items-center justify-center rounded transition-colors font-bold text-sm"
                                                    style={{ color: COLORS.muted }}
                                                >
                                                    -
                                                </button>
                                                <span className="font-bold w-6 text-center text-xs" style={{ color: COLORS.text }}>{item.quantity}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="w-6 h-6 flex items-center justify-center rounded transition-colors font-bold text-sm"
                                                    style={{ color: COLORS.muted }}
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => removeFromCart(item.id)}
                                                className="p-1.5 rounded-lg transition-colors shrink-0"
                                                style={{ color: COLORS.red }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* ฟอร์มกรอกข้อมูลผู้ยืม */}
                            <form onSubmit={handleSubmitBorrow} className="space-y-4" style={{ borderTop: `1px solid ${COLORS.primaryBorder}` }}>
                                <div className="pt-4 space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>วัตถุประสงค์การใช้งาน</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="ระบุวัตถุประสงค์การใช้งาน"
                                            className="w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                                            style={{
                                                background: COLORS.bg,
                                                border: `1px solid ${COLORS.primaryBorder}`,
                                                color: COLORS.text,
                                            }}
                                            value={borrowerPurpose}
                                            onChange={(e) => setBorrowerPurpose(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>ชื่อ-นามสกุล ผู้ยืม</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="ระบุชื่อจริงของคุณ"
                                            className="w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                                            style={{
                                                background: COLORS.bg,
                                                border: `1px solid ${COLORS.primaryBorder}`,
                                                color: COLORS.text,
                                            }}
                                            value={borrowerName}
                                            onChange={(e) => setBorrowerName(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>ตำแหน่งงาน (Position)</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="เช่น Engineer, Technician, Admin"
                                            className="w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                                            style={{
                                                background: COLORS.bg,
                                                border: `1px solid ${COLORS.primaryBorder}`,
                                                color: COLORS.text,
                                            }}
                                            value={position}
                                            onChange={(e) => setPosition(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>แผนก/ฝ่าย (Department)</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="ระบุฝ่ายหรือแผนกสังกัด"
                                            className="w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                                            style={{
                                                background: COLORS.bg,
                                                border: `1px solid ${COLORS.primaryBorder}`,
                                                color: COLORS.text,
                                            }}
                                            value={department}
                                            onChange={(e) => setDepartment(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>เบอร์โทรศัพท์ติดต่อ</label>
                                        <input
                                            type="tel"
                                            required
                                            placeholder="ระบุเบอร์โทรศัพท์ 10 หลัก"
                                            className="w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                                            style={{
                                                background: COLORS.bg,
                                                border: `1px solid ${COLORS.primaryBorder}`,
                                                color: COLORS.text,
                                            }}
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>วันกำหนดส่งคืนอุปกรณ์</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                                            style={{
                                                background: COLORS.bg,
                                                border: `1px solid ${COLORS.primaryBorder}`,
                                                color: COLORS.text,
                                            }}
                                            value={returnDate}
                                            onChange={(e) => setReturnDate(e.target.value)}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full font-bold py-3.5 px-4 rounded-xl text-sm transition-all mt-2"
                                        style={{
                                            background: `linear-gradient(135deg, ${COLORS.primary}, #6D28D9)`,
                                            color: "#FFFFFF",
                                            boxShadow: `0 8px 25px rgba(139,92,246,0.3)`,
                                        }}
                                    >
                                        💾 ยืนยันคำขอยืมและพิมพ์ใบอนุมัติ
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
