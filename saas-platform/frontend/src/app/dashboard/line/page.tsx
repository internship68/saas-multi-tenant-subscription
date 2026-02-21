"use client";

import { useState } from "react";

export default function ConnectLinePage() {
    const [channelId, setChannelId] = useState("");
    const [channelSecret, setChannelSecret] = useState("");
    const [channelToken, setChannelToken] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        try {
            // Mocking the API call for now; this will match POST /line/connect on the backend
            const res = await fetch("http://localhost:3000/line/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({
                    channelId,
                    channelSecret,
                    channelAccessToken: channelToken,
                }),
            });

            if (res.ok) {
                setStatus("success");
            } else {
                setStatus("error");
            }
        } catch (err) {
            setStatus("error");
        }
    };

    return (
        <div className="max-w-xl mx-auto py-10">
            <h1 className="text-3xl font-bold mb-2">Connect LINE OA</h1>
            <p className="text-gray-500 mb-8">เชื่อมต่อ LINE Official Account เพื่อให้ AI เริ่มทำงาน</p>

            <form onSubmit={handleSubmit} className="bg-white p-6 shadow-sm rounded-xl border border-gray-100 flex flex-col gap-5">

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Channel ID</label>
                    <input
                        type="text"
                        required
                        value={channelId}
                        onChange={e => setChannelId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="e.g. 165.......4"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Channel Secret</label>
                    <input
                        type="text"
                        required
                        value={channelSecret}
                        onChange={e => setChannelSecret(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="e.g. 8a7d...................12"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Channel Access Token</label>
                    <textarea
                        required
                        rows={3}
                        value={channelToken}
                        onChange={e => setChannelToken(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Long lived access token..."
                    />
                </div>

                <button
                    disabled={status === 'loading'}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg mt-2 transition disabled:opacity-50"
                >
                    {status === 'loading' ? 'Connecting...' : 'Connect to LINE'}
                </button>

                {status === 'success' && <p className="text-green-600 font-medium text-center">✅ เชื่อมต่อสำเร็จ!</p>}
                {status === 'error' && <p className="text-red-600 font-medium text-center">❌ การเชื่อมต่อล้มเหลว โปรดตรวจสอบข้อมูล</p>}

            </form>
        </div>
    );
}
