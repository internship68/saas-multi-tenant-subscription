import Link from "next/link";
import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="h-16 flex items-center px-6 border-b border-gray-100">
                    <span className="font-bold text-xl text-blue-600">AI LINE School</span>
                </div>

                <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
                    <Link href="/dashboard" className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition">
                        🏠 Dashboard
                    </Link>
                    <Link href="/dashboard/line" className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition">
                        🔗 Connect LINE
                    </Link>
                    <Link href="/dashboard/leads" className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition">
                        👥 My Leads
                    </Link>
                    <Link href="/dashboard/courses" className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition">
                        📚 My Courses
                    </Link>
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition">
                        🚪 Logout
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
