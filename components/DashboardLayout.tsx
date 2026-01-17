"use client"

import { useState, useEffect } from "react"
import { Menu, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import Sidebar from "./Sidebar"

interface DashboardLayoutProps {
    children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(true)
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [userRole, setUserRole] = useState("")
    const [userName, setUserName] = useState("")
    const [isHydrated, setIsHydrated] = useState(false)
    const router = useRouter()

    useEffect(() => {
        // Initial sidebar state based on window width
        if (typeof window !== "undefined") {
            setSidebarOpen(window.innerWidth >= 768)
        }

        const onResize = () => setSidebarOpen(window.innerWidth >= 768)
        window.addEventListener("resize", onResize)

        // Check login state
        const storedLoginState = localStorage.getItem("maintenance_login_state")
        if (storedLoginState) {
            try {
                const { isLoggedIn: savedIsLoggedIn, userRole: savedUserRole, userName: savedUserName } = JSON.parse(storedLoginState)
                if (savedIsLoggedIn) {
                    setIsLoggedIn(true)
                    setUserRole(savedUserRole)
                    setUserName(savedUserName)
                } else {
                    router.push("/")
                }
            } catch (error) {
                console.error("Failed to restore login state:", error)
                localStorage.removeItem("maintenance_login_state")
                router.push("/")
            }
        } else {
            router.push("/")
        }

        setIsHydrated(true)
        return () => window.removeEventListener("resize", onResize)
    }, [router])

    const handleLogout = () => {
        localStorage.removeItem("maintenance_login_state")
        setIsLoggedIn(false)
        router.push("/")
    }

    if (!isHydrated || !isLoggedIn) {
        return null // or a loading spinner
    }

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex">
                <Sidebar isOpen={sidebarOpen} userRole={userRole} />
            </div>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div className="md:hidden fixed inset-0 z-40 flex">
                    <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
                    <div className="relative w-64">
                        <Sidebar
                            isOpen={true}
                            userRole={userRole}
                            onMobileClose={() => setSidebarOpen(false)}
                        />
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition"
                        >
                            <Menu className="w-5 h-5 text-slate-600" />
                        </button>
                        <h2 className="text-xl font-bold text-slate-900">Maintenance Management</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-600">{userRole === "admin" ? "Admin" : "User"} Mode</span>
                        {userName && <span className="text-sm font-semibold text-slate-800 hidden sm:block">{userName}</span>}
                        <button
                            onClick={handleLogout}
                            className="p-2 hover:bg-red-50 rounded-lg transition text-red-600"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-auto">{children}</div>
            </div>
        </div>
    )
}
