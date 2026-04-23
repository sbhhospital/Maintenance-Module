import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: number
  icon: LucideIcon
  color: "blue" | "orange" | "green" | "cyan"
  loading?: boolean
}

const colorClasses = {
  blue: {
    bg: "bg-blue-50/50",
    text: "text-blue-600",
    icon: "bg-blue-100 text-blue-600",
    border: "border-blue-100/30"
  },
  orange: {
    bg: "bg-orange-50/50",
    text: "text-orange-600",
    icon: "bg-orange-100 text-orange-600",
    border: "border-orange-100/30"
  },
  green: {
    bg: "bg-emerald-50/50",
    text: "text-emerald-600",
    icon: "bg-emerald-100 text-emerald-600",
    border: "border-emerald-100/30"
  },
  cyan: {
    bg: "bg-teal-50/50",
    text: "text-teal-600",
    icon: "bg-teal-100 text-teal-600",
    border: "border-teal-100/30"
  },
}

export default function StatCard({ title, value, icon: Icon, color, loading }: StatCardProps) {
  const theme = colorClasses[color]

  return (
    <div className={`bg-white rounded-[32px] p-8 border ${theme.border} shadow-soft hover:shadow-premium transition-all duration-500 group relative overflow-hidden h-full`}>
      <div className={`absolute top-0 right-0 w-32 h-32 ${theme.bg} rounded-full -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-125`} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">{title}</p>
          {loading ? (
            <div className="h-10 w-24 bg-slate-50 animate-pulse rounded-xl mt-1"></div>
          ) : (
            <p className={`text-4xl font-black ${theme.text} tracking-tight mt-1`}>
              {value.toLocaleString()}
            </p>
          )}
        </div>

        <div className={`p-4 rounded-2xl ${theme.icon} transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-sm`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className="mt-8 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color === 'orange' ? 'bg-orange-400' : 'bg-teal-400'} animate-pulse`} />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time stats</span>
      </div>
    </div>
  )
}
