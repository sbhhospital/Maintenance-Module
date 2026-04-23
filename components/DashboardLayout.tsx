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
        <div className="flex h-screen bg-background">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex">
                <Sidebar
                    isOpen={sidebarOpen}
                    userRole={userRole}
                    userName={userName}
                    onLogout={handleLogout}
                />
            </div>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div className="md:hidden fixed inset-0 z-40 flex">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
                    <div className="relative w-72">
                        <Sidebar
                            isOpen={true}
                            userRole={userRole}
                            userName={userName}
                            onLogout={handleLogout}
                            onMobileClose={() => setSidebarOpen(false)}
                        />
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-white/80 backdrop-blur-md border-b border-teal-100/50 px-6 py-4 flex items-center justify-between z-30">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 hover:bg-teal-50 rounded-xl transition text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Removed user profile info from header as it's in the sidebar */}
                    </div>
                </div>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background">
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
