"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import SplashCursor from "@/components/SplashCursor";
import { Loader2, Mail, Lock, User, Building2 } from "lucide-react";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [orgName, setOrgName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
            const res = await fetch(`${apiUrl}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    password,
                    name,
                    organizationName: orgName
                }),
            });

            const data = await res.json();

            if (res.ok) {
                alert("สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ");
                router.push("/login");
            } else {
                setError(data.message || "Registration failed");
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-black">
            <SplashCursor />

            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-transparent to-blue-500/10 pointer-events-none animate-pulse" />

            <Card className="z-10 w-full max-w-md bg-white/5 backdrop-blur-2xl border-white/10 shadow-2xl text-white">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-3xl font-bold tracking-tight text-center bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                        Create Account
                    </CardTitle>
                    <CardDescription className="text-center text-gray-400">
                        Join the future of student enrollment automation
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleRegister}>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="p-3 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg text-center animate-shake">
                                {error}
                            </div>
                        )}
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-gray-300">Full Name</Label>
                                <div className="relative group">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                                    <Input
                                        id="name"
                                        placeholder="John Doe"
                                        required
                                        value={name}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                                        className="bg-white/5 border-white/10 focus:border-purple-500/50 pl-10 h-11 text-white placeholder:text-gray-600 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="orgName" className="text-gray-300">Organization Name</Label>
                                <div className="relative group">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                                    <Input
                                        id="orgName"
                                        placeholder="Starlight Academy"
                                        required
                                        value={orgName}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrgName(e.target.value)}
                                        className="bg-white/5 border-white/10 focus:border-purple-500/50 pl-10 h-11 text-white placeholder:text-gray-600 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        required
                                        value={email}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                        className="bg-white/5 border-white/10 focus:border-purple-500/50 pl-10 h-11 text-white placeholder:text-gray-600 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" title="Password" className="text-gray-300">Password</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                                    <Input
                                        id="password"
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                        className="bg-white/5 border-white/10 focus:border-purple-500/50 pl-10 h-11 text-white placeholder:text-gray-600 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4">
                        <Button
                            type="submit"
                            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-none shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : null}
                            {loading ? "Registering..." : "Sign Up Now"}
                        </Button>
                        <div className="text-center text-sm text-gray-400">
                            Already have an account?{" "}
                            <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                                Sign In
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
