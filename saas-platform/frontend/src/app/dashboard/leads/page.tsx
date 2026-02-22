"use client";

import { useEffect, useState } from "react";

interface Lead {
    id: string;
    name: string;
    grade: string;
    phone: string;
    status: string;
    course: string;
    createdAt: string;
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeads = async () => {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`${apiUrl}/products/line-enrollment/leads`, {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
                const responseData = await res.json();

                if (res.ok) {
                    // Adapt to ResponseInterceptor wrapping { success: true, data: [...] }
                    setLeads(responseData.data || []);
                }
            } catch (err) {
                console.error("Failed to fetch leads:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeads();
    }, []);

    return (
        <div className="max-w-6xl mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">My Leads</h1>
                    <p className="text-gray-500">ติดตามนักเรียนที่สนใจสมัครเรียนจาก LINE</p>
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">Export CSV</button>
            </div>

            <div className="bg-white shadow border border-gray-100 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-700 font-medium">
                            <tr>
                                <th className="px-6 py-4">ชื่อนักเรียน</th>
                                <th className="px-6 py-4">ระดับชั้น</th>
                                <th className="px-6 py-4">ความสนใจ (คอร์ส)</th>
                                <th className="px-6 py-4">เบอร์ติดต่อ</th>
                                <th className="px-6 py-4">สถานะ</th>
                                <th className="px-6 py-4">วันที่รับเข้า</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-400">กำลังโหลด...</td>
                                </tr>
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-400">ยังไม่มี Lead ในขณะนี้</td>
                                </tr>
                            ) : (
                                leads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 font-medium text-gray-900">{lead.name}</td>
                                        <td className="px-6 py-4 text-gray-600">{lead.grade}</td>
                                        <td className="px-6 py-4 text-gray-600">{lead.course}</td>
                                        <td className="px-6 py-4 text-gray-600">{lead.phone}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${lead.status === 'NEW' ? 'bg-red-100 text-red-700' :
                                                lead.status === 'CONTACTED' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-green-100 text-green-700'
                                                }`}>
                                                {lead.status === 'NEW' ? '🔥 ร้อน (มาใหม่)' :
                                                    lead.status === 'CONTACTED' ? 'กำลังพูดคุย' :
                                                        'สมัครแล้ว'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(lead.createdAt).toLocaleDateString('th-TH')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
