"use client"

import { LayoutDashboard, FileText, CheckSquare, Users, Wrench, Eye, CreditCard, ChevronRight } from "lucide-react"
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

export default function Sidebar({ isOpen, userRole, onMobileClose }: { isOpen: boolean; userRole: string; onMobileClose?: () => void }) {
  const pathname = usePathname()
  const filteredItems = menuItems.filter((item) => item.roles.includes(userRole))

  return (
    <div
      className={`${isOpen ? "w-64" : "w-20"
        } bg-gradient-to-b from-blue-800 to-cyan-900 text-white transition-all duration-300 flex flex-col border-r border-slate-700 h-full`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-lg">
            M
          </div>
          {isOpen && <span className="font-bold text-lg">Maintenance</span>}
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === `/${item.id}`
          return (
            <Link
              key={item.id}
              href={`/${item.id}`}
              onClick={onMobileClose}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition ${isActive ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white" : "text-slate-300 hover:bg-slate-700"
                }`}
              title={!isOpen ? item.label : ""}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {isOpen && <span className="flex-1 text-left text-sm font-medium">{item.label}</span>}
              {isOpen && isActive && <ChevronRight className="w-4 h-4" />}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
