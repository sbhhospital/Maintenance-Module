"use client"

import { LayoutDashboard, FileText, CheckSquare, Users, Wrench, Eye, CreditCard, ChevronRight, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"



const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "user"] },
  { id: "indent", label: "Create Indent", icon: FileText, roles: ["admin", "user"] },
  { id: "approval", label: "Approvals", icon: CheckSquare, roles: ["admin"] },
  { id: "technician", label: "Assign Technician", icon: Users, roles: ["admin"] },
  { id: "work", label: "Work Tracking", icon: Wrench, roles: ["admin"] },
  { id: "inspection", label: "Inspection", icon: Eye, roles: ["admin"] },
  { id: "payment", label: "Payment", icon: CreditCard, roles: ["admin"] },
]

export default function Sidebar({
  isOpen,
  userRole,
  userName,
  onLogout,
  onMobileClose
}: {
  isOpen: boolean;
  userRole: string;
  userName?: string;
  onLogout?: () => void;
  onMobileClose?: () => void
}) {
  const pathname = usePathname()
  const filteredItems = menuItems.filter((item) => item.roles.includes(userRole))

  return (
    <div
      className={`${isOpen ? "w-64" : "w-20"
        } bg-white transition-all duration-300 flex flex-col border-r border-teal-50 h-full relative z-50`}
    >
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-md shadow-teal-200 shrink-0">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          {isOpen && (
            <div className="flex flex-col">
              <span className="font-bold text-slate-800 leading-none">MAINTENANCE</span>
              <span className="text-[10px] font-bold text-teal-600 tracking-[0.2em] mt-1">MODULE</span>
            </div>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === `/${item.id}`
          return (
            <Link
              key={item.id}
              href={`/${item.id}`}
              onClick={onMobileClose}
              className={`group relative w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-300 ${isActive
                ? "bg-teal-50 text-teal-600 shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-teal-600"
                }`}
              title={!isOpen ? item.label : ""}
            >
              <div className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-teal-600" : "text-slate-400 group-hover:text-teal-500"}`}>
                <Icon className="w-5 h-5 shrink-0" />
              </div>

              {isOpen && (
                <span className={`flex-1 text-left text-sm font-semibold transition-colors duration-300 ${isActive ? "text-teal-700" : "text-slate-600 group-hover:text-teal-700"}`}>
                  {item.label}
                </span>
              )}

              {isOpen && isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-sm animate-pulse" />
              )}

              {!isOpen && isActive && (
                <div className="absolute left-0 w-1 h-6 bg-teal-500 rounded-r-full" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User & Logout section at bottom */}
      <div className="p-4 mt-auto">
        <div className={`p-3 rounded-2xl ${isOpen ? "bg-slate-50" : "items-center"} border border-slate-100/50 flex flex-col gap-3 transition-all duration-300`}>
          {isOpen ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 font-bold border border-teal-200">
                  {userName?.charAt(0) || "U"}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-slate-700 truncate">
                    {userName || "User"}
                  </span>
                  <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">
                    {userRole}
                  </span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white border border-red-100 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={onLogout}
              className="w-10 h-10 flex items-center justify-center bg-white border border-red-50 text-red-500 rounded-xl hover:bg-red-50 transition-all shadow-sm group"
              title="Logout"
            >
              <LogOut className="w-5 h-5 transition-transform group-hover:scale-110" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
