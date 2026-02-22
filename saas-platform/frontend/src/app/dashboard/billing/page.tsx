"use client";

import { useEffect, useState } from "react";

interface SubscriptionInfo {
    id: string;
    plan: string;
    status: string;
    currentPeriodEnd: string;
    isActive: boolean;
}

const PLANS = [
    {
        id: "FREE",
        name: "Free",
        price: "฿0",
        period: "/เดือน",
        description: "เริ่มต้นใช้งานฟรี สำหรับลองระบบ",
        features: [
            "สมาชิกในทีมได้ 3 คน",
            "1 โปรเจค/สาขา",
            "รับ Lead จาก LINE",
            "Dashboard พื้นฐาน",
        ],
        notIncluded: [
            "AI ตอบแชทอัตโนมัติ",
            "Custom Domain",
            "Analytics ขั้นสูง",
            "Priority Support",
        ],
        accent: "gray",
        popular: false,
        priceId: null,
    },
    {
        id: "PRO",
        name: "Pro",
        price: "฿999",
        period: "/เดือน",
        description: "สำหรับโรงเรียนกวดวิชาที่ต้องการเติบโต",
        features: [
            "สมาชิกในทีมได้ 10 คน",
            "5 โปรเจค/สาขา",
            "รับ Lead จาก LINE",
            "AI ตอบแชทอัตโนมัติ",
            "Custom Domain",
            "Analytics ขั้นสูง",
        ],
        notIncluded: [
            "Priority Support",
        ],
        accent: "blue",
        popular: true,
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "price_pro_placeholder",
    },
    {
        id: "ENTERPRISE",
        name: "Enterprise",
        price: "฿2,999",
        period: "/เดือน",
        description: "สำหรับสถาบันขนาดใหญ่ ไม่มีข้อจำกัด",
        features: [
            "สมาชิกไม่จำกัด",
            "โปรเจคไม่จำกัด",
            "รับ Lead จาก LINE",
            "AI ตอบแชทอัตโนมัติ",
            "Custom Domain",
            "Analytics ขั้นสูง",
            "Priority Support ตอบภายใน 1 ชม.",
        ],
        notIncluded: [],
        accent: "purple",
        popular: false,
        priceId: process.env.NEXT_PUBLIC_STRIPE_ENT_PRICE_ID || "price_enterprise_placeholder",
    },
];

export default function BillingPage() {
    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchSubscription();
    }, []);

    const fetchSubscription = async () => {
        const token = localStorage.getItem("token");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
        if (!token) return;

        try {
            const res = await fetch(`${apiUrl}/billing/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
                setSubscription(data.data?.subscription || data.subscription || null);
            }
        } catch (err) {
            console.error("Failed to fetch subscription:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckout = async (plan: string) => {
        const token = localStorage.getItem("token");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
        if (!token) return;

        setCheckoutLoading(plan);
        try {
            const res = await fetch(`${apiUrl}/billing/checkout`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    plan: plan,
                    successUrl: `${window.location.origin}/dashboard/billing?success=true`,
                    cancelUrl: `${window.location.origin}/dashboard/billing?canceled=true`,
                }),
            });
            const data = await res.json();
            if (data.data?.url || data.url) {
                window.location.href = data.data?.url || data.url;
            }
        } catch (err) {
            console.error("Checkout failed:", err);
        } finally {
            setCheckoutLoading(null);
        }
    };

    const currentPlan = subscription?.plan || "FREE";
    const isActive = subscription?.isActive || false;

    return (
        <div className="max-w-6xl mx-auto py-10 px-6">
            {/* Header */}
            <header className="mb-10 text-center">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
                    แพ็กเกจ & การชำระเงิน
                </h1>
                <p className="text-gray-500 text-lg max-w-xl mx-auto">
                    เลือกแพ็กเกจที่เหมาะกับโรงเรียนกวดวิชาของคุณ อัปเกรดได้ทุกเมื่อ
                </p>
            </header>

            {/* Current Plan Badge */}
            {!loading && (
                <div className="flex justify-center mb-10">
                    <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-6 py-3 shadow-sm">
                        <div className={`w-3 h-3 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}></div>
                        <span className="text-sm text-gray-600">แพลนปัจจุบัน:</span>
                        <span className="font-bold text-gray-900">{currentPlan}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                            }`}>
                            {isActive ? "ใช้งาน" : "ไม่ได้ใช้งาน"}
                        </span>
                        {subscription?.currentPeriodEnd && (
                            <span className="text-xs text-gray-400">
                                หมดอายุ {new Date(subscription.currentPeriodEnd).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Pricing Cards */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-pulse flex flex-col items-center gap-4">
                        <div className="h-4 w-48 bg-gray-200 rounded-full"></div>
                        <div className="h-3 w-32 bg-gray-100 rounded-full"></div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {PLANS.map((plan) => {
                        const isCurrent = currentPlan === plan.id;
                        const isPopular = plan.popular;

                        return (
                            <div
                                key={plan.id}
                                className={`relative bg-white rounded-3xl border-2 transition-all hover:shadow-xl hover:-translate-y-1 ${isCurrent
                                    ? "border-blue-500 shadow-lg shadow-blue-100 ring-4 ring-blue-50"
                                    : isPopular
                                        ? "border-blue-200 shadow-md"
                                        : "border-gray-100 shadow-sm"
                                    }`}
                            >
                                {/* Popular Badge */}
                                {isPopular && !isCurrent && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                                            ⭐ แนะนำ
                                        </span>
                                    </div>
                                )}

                                {/* Current Badge */}
                                {isCurrent && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                                            ✓ แพลนปัจจุบัน
                                        </span>
                                    </div>
                                )}

                                <div className="p-8">
                                    {/* Plan Name */}
                                    <h3 className={`text-lg font-bold mb-1 ${plan.accent === "blue" ? "text-blue-600" :
                                        plan.accent === "purple" ? "text-purple-600" : "text-gray-700"
                                        }`}>
                                        {plan.name}
                                    </h3>
                                    <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

                                    {/* Price */}
                                    <div className="mb-8">
                                        <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                                        <span className="text-gray-400 text-sm ml-1">{plan.period}</span>
                                    </div>

                                    {/* CTA Button */}
                                    {isCurrent ? (
                                        <button
                                            disabled
                                            className="w-full py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-400 cursor-not-allowed"
                                        >
                                            ใช้งานอยู่แล้ว
                                        </button>
                                    ) : plan.id !== "FREE" ? (
                                        <button
                                            onClick={() => handleCheckout(plan.id)}
                                            disabled={checkoutLoading === plan.id}
                                            className={`w-full py-3 rounded-xl font-bold text-sm transition shadow-lg ${plan.accent === "blue"
                                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-200"
                                                : plan.accent === "purple"
                                                    ? "bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-purple-200"
                                                    : "bg-gray-900 hover:bg-gray-800 text-white shadow-gray-200"
                                                } ${checkoutLoading === plan.id ? "opacity-60" : ""}`}
                                        >
                                            {checkoutLoading === plan.id
                                                ? "กำลังเปิดหน้าชำระเงิน..."
                                                : `อัปเกรดเป็น ${plan.name}`}
                                        </button>
                                    ) : (
                                        <button
                                            disabled
                                            className="w-full py-3 rounded-xl font-bold text-sm bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed"
                                        >
                                            แพลนฟรี
                                        </button>
                                    )}

                                    {/* Divider */}
                                    <div className="border-t border-gray-100 my-6"></div>

                                    {/* Features */}
                                    <ul className="space-y-3">
                                        {plan.features.map((f, i) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                                                <span className="mt-0.5 text-green-500 font-bold text-base">✓</span>
                                                {f}
                                            </li>
                                        ))}
                                        {plan.notIncluded.map((f, i) => (
                                            <li key={`no-${i}`} className="flex items-start gap-2.5 text-sm text-gray-300">
                                                <span className="mt-0.5 font-bold text-base">✗</span>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* FAQ */}
            <div className="mt-16 max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">คำถามที่พบบ่อย</h2>
                <div className="space-y-4">
                    <details className="bg-white border border-gray-100 rounded-2xl p-5 group cursor-pointer">
                        <summary className="font-bold text-gray-800 text-sm list-none flex justify-between items-center">
                            เปลี่ยนแพ็กเกจได้เมื่อไหร่?
                            <span className="text-gray-300 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                            คุณสามารถอัปเกรดหรือดาวน์เกรดแพ็กเกจได้ทุกเมื่อ การเปลี่ยนแปลงจะมีผลทันทีและจะคำนวณส่วนต่างราคาให้อัตโนมัติ
                        </p>
                    </details>
                    <details className="bg-white border border-gray-100 rounded-2xl p-5 group cursor-pointer">
                        <summary className="font-bold text-gray-800 text-sm list-none flex justify-between items-center">
                            ยกเลิกได้ไหม?
                            <span className="text-gray-300 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                            ได้ครับ! คุณสามารถยกเลิกได้ทุกเมื่อ ระบบจะยังคงใช้งานได้จนกว่าจะถึงสิ้นรอบบิลปัจจุบัน จากนั้นจะกลับเป็นแพลน Free
                        </p>
                    </details>
                    <details className="bg-white border border-gray-100 rounded-2xl p-5 group cursor-pointer">
                        <summary className="font-bold text-gray-800 text-sm list-none flex justify-between items-center">
                            รองรับการชำระเงินแบบไหน?
                            <span className="text-gray-300 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                            รองรับบัตรเครดิต/เดบิต (Visa, Mastercard, JCB) ผ่านระบบ Stripe ที่ปลอดภัย ข้อมูลบัตรจะไม่ถูกเก็บในเซิร์ฟเวอร์ของเรา
                        </p>
                    </details>
                </div>
            </div>
        </div>
    );
}
