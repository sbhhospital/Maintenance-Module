"use client"

import { useState, useEffect } from "react"
import { Menu, LogOut } from "lucide-react"
import Sidebar from "./Sidebar"
import IndentPage from "./pages/IndentPage"
import ApprovalPage from "./pages/ApprovalPage"
import TechnicianAssignPage from "./pages/TechnicianAssignPage"
import WorkTrackingPage from "./pages/WorkTrackingPage"
import InspectionPage from "./pages/InspectionPage"
import PaymentPage from "./pages/PaymentPage"
import DashboardOverview from "./pages/DashboardOverview"

interface DashboardProps {
  userRole: string
  onLogout: () => void
}

export default function Dashboard({ userRole, onLogout }: DashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => (typeof window !== "undefined" ? window.innerWidth >= 768 : true))
  const [currentPage, setCurrentPage] = useState("dashboard")

  useEffect(() => {
    // Keep sidebar visible on desktop and hidden on small devices by default.
    const onResize = () => setSidebarOpen(window.innerWidth >= 768)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardOverview />
      case "indent":
        return <IndentPage />
      case "approval":
        return <ApprovalPage />
      case "technician":
        return <TechnicianAssignPage />
      case "work":
        return <WorkTrackingPage />
      case "inspection":
        return <InspectionPage />
      case "payment":
        return <PaymentPage />
      default:
        return <DashboardOverview />
    }
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar isOpen={sidebarOpen} currentPage={currentPage} onPageChange={setCurrentPage} userRole={userRole} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64">
            <Sidebar
              isOpen={true}
              currentPage={currentPage}
              onPageChange={(page) => {
                setCurrentPage(page)
                setSidebarOpen(false)
              }}
              userRole={userRole}
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
            <button
              onClick={onLogout}
              className="p-2 hover:bg-red-50 rounded-lg transition text-red-600"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">{renderPage()}</div>
      </div>
    </div>
  )
}
