import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: number
  icon: LucideIcon
  color: "blue" | "orange" | "green" | "cyan"
}

const colorClasses = {
  blue: "from-blue-50 to-blue-100 text-blue-600 border-blue-200",
  orange: "from-orange-50 to-orange-100 text-orange-600 border-orange-200",
  green: "from-green-50 to-green-100 text-green-600 border-green-200",
  cyan: "from-cyan-50 to-cyan-100 text-cyan-600 border-cyan-200",
}

export default function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-2xl p-6 border shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-600 text-sm font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <Icon className="w-8 h-8 opacity-50" />
      </div>
    </div>
  )
}
