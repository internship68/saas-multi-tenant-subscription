"use client";

import { useState } from "react";

export default function CoursesPage() {
    const [courses, setCourses] = useState([
        { id: 1, name: "ฟิสิกส์ ม.ปลาย สรุปเนื้อหา + ตะลุยโจทย์", grade: "ม.4-ม.6", price: "3,500 บาท", description: "คอร์สสำหรับเตรียมสอบ TCAS" },
        { id: 2, name: "เคมี ม.ต้น พื้นฐานแน่น", grade: "ม.1-ม.3", price: "2,500 บาท", description: "ทบทวนพื้นฐานเคมีตั้งแต่เริ่มต้น" }
    ]);

    const [showAddForm, setShowAddForm] = useState(false);

    return (
        <div className="max-w-6xl mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">My Courses</h1>
                    <p className="text-gray-500">จัดการข้อมูลคอร์สเรียนเพื่อให้ AI ใช้ตอบคำถาม</p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow transition"
                >
                    + เพิ่มคอร์สใหม่
                </button>
            </div>

            {showAddForm && (
                <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-xl mb-8 flex flex-col gap-4">
                    <h2 className="text-lg font-semibold border-b pb-2">เพิ่มคอร์สเรียนใหม่</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อคอร์ส</label>
                            <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="เช่น ฟิสิกส์ ม.ปลาย" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ระดับชั้น</label>
                            <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="เช่น ม.4-ม.6" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ราคา</label>
                            <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="เช่น 3,500 บาท" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียดแบบย่อ (ให้ AI อ่าน)</label>
                            <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="สรุปเนื้อหาคอร์สสั้นๆ ให้ AI เสนอขาย..." />
                        </div>
                    </div>
                    <div className="flex justify-end mt-2">
                        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium">บันทึก</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => (
                    <div key={course.id} className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-gray-900 leading-tight">{course.name}</h3>
                        </div>
                        <div className="flex flex-col gap-2 mb-4">
                            <span className="inline-block bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full w-max font-medium">📌 {course.grade}</span>
                            <span className="inline-block bg-green-50 text-green-700 text-sm px-3 py-1 rounded-full w-max font-medium">💵 {course.price}</span>
                        </div>
                        <p className="text-gray-600 text-sm line-clamp-3">{course.description}</p>
                        <div className="mt-6 border-t pt-4 flex gap-3 text-sm">
                            <button className="text-blue-600 font-medium hover:underline">แก้ไข</button>
                            <button className="text-red-600 font-medium hover:underline">ลบ</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
