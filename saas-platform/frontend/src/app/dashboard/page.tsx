"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Notification {
    id: string;
    title: string;
    description: string;
    time: string;
    leadId: string;
    isRead: boolean;
}

export default function DashboardPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async (quiet = false) => {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
        if (!token) return;

        try {
            const res = await fetch(`${apiUrl}/products/line-enrollment/notifications`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const responseData = await res.json();
            if (res.ok) {
                setNotifications(responseData.data || []);
            }
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        } finally {
            if (!quiet) setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
        if (!token) return;

        try {
            await fetch(`${apiUrl}/products/line-enrollment/notifications/${id}/read`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            // Update local state immediately for snappy feel
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(() => fetchNotifications(true), 5000);
        return () => clearInterval(interval);
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="max-w-4xl mx-auto py-10 px-6">
            <header className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">Dashboard</h1>
                    <p className="text-gray-500">ติดตามความเคลื่อนไหวล่าสุดของคุณ</p>
                </div>
                <Link href="/dashboard/leads" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-lg shadow-blue-200">
                    ดู Lead ทั้งหมด
                </Link>
            </header>

            <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xl font-bold text-gray-900">กิจกรรมล่าสุด</h2>
                {unreadCount > 0 && (
                    <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-bold">
                        {unreadCount} รายการใหม่
                    </span>
                )}
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center text-gray-400">
                        <div className="animate-pulse flex flex-col items-center gap-4">
                            <div className="h-4 w-48 bg-gray-100 rounded-full"></div>
                            <div className="h-3 w-32 bg-gray-50 rounded-full"></div>
                        </div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center text-gray-400 flex flex-col items-center gap-4">
                        <div className="text-5xl">�</div>
                        <p className="font-medium">ยังไม่มีการแจ้งเตือนในขณะนี้</p>
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <div
                            key={notif.id}
                            onClick={() => markAsRead(notif.id)}
                            className={`group relative p-5 rounded-2xl transition-all border ${notif.isRead
                                    ? 'bg-white border-gray-100 opacity-75'
                                    : 'bg-white border-blue-200 shadow-md shadow-blue-50 ring-1 ring-blue-50'
                                } hover:border-blue-400 cursor-pointer`}
                        >
                            {!notif.isRead && (
                                <div className="absolute top-6 left-[-6px] w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
                            )}

                            <div className="flex justify-between items-start mb-2">
                                <div className="flex flex-col">
                                    <span className={`text-sm font-bold ${notif.isRead ? 'text-gray-700' : 'text-blue-700'}`}>
                                        {notif.title}
                                    </span>
                                    <span className="text-[11px] text-gray-400 font-medium">
                                        {new Date(notif.time).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                                    </span>
                                </div>
                                <span className="opacity-0 group-hover:opacity-100 text-blue-600 text-xs font-bold transition">คลิกเพื่ออ่าน</span>
                            </div>

                            <p className={`text-sm leading-relaxed ${notif.isRead ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>
                                {notif.description}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
