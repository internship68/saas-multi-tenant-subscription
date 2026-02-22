"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const router = useRouter();

    const handleLogout = () => {
        // 1. Clear tokens and local storage
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // 2. Clear cookies if any (optional based on implementation)
        // 3. Redirect to login page
        router.push("/login");
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
                <div className="h-16 flex items-center px-6 border-b border-gray-100">
                    <span className="font-bold text-xl text-blue-600 tracking-tight">AI LINE School</span>
                </div>

                <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
                    <Link href="/dashboard" className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all active:scale-95">
                        🏠 Dashboard
                    </Link>
                    <Link href="/dashboard/line" className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all active:scale-95">
                        🔗 Connect LINE
                    </Link>
                    <Link href="/dashboard/leads" className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all active:scale-95">
                        👥 My Leads
                    </Link>
                    <Link href="/dashboard/courses" className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all active:scale-95">
                        📚 My Courses
                    </Link>

                    <div className="border-t border-gray-100 my-2"></div>

                    <Link href="/dashboard/billing" className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all active:scale-95">
                        💳 Billing & Plans
                    </Link>
                    <Link href="/dashboard/users" className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all active:scale-95">
                        👤 Team Members
                    </Link>
                    <Link href="/dashboard/usage" className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all active:scale-95">
                        📊 Usage
                    </Link>
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-95 flex items-center gap-2"
                    >
                        🚪 ออกจากระบบ
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-gray-50/50">
                {children}
            </main>
        </div>
    );
}
