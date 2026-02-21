"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
    } else {
      router.replace("/dashboard/line");
    }
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center text-gray-500">
      กำลังพาดำเนินการ...
    </div>
  );
}
