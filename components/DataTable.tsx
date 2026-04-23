import { FileText } from "lucide-react"

interface Column {
  key: string
  label: string
}

interface DataTableProps {
  columns: Column[]
  data: any[]
}

export default function DataTable({ columns, data }: DataTableProps) {
  return (
    <div className="bg-white rounded-[24px] border border-slate-100 shadow-soft hover:shadow-premium transition-all duration-500 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-teal-50/50 border-b border-teal-100/50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((row, idx) => (
              <tr
                key={idx}
                className="hover:bg-slate-50/50 transition-all duration-300 group"
              >
                {columns.map((column) => (
                  <td
                    key={`${idx}-${column.key}`}
                    className="px-6 py-4 text-sm font-medium text-slate-600 leading-relaxed"
                  >
                    {column.key === "priority" ? (
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter inline-block transform transition-transform group-hover:scale-105 duration-300 ${row[column.key] === "High"
                          ? "bg-red-100 text-red-700"
                          : row[column.key] === "Medium"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-teal-100 text-teal-700"
                          }`}
                      >
                        {row[column.key]}
                      </span>
                    ) : (
                      row[column.key]
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {data.length === 0 && (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-2">
              <FileText className="w-8 h-8 text-slate-300 opacity-40" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Records Found</p>
              <p className="text-[10px] text-slate-300 font-medium mt-1">Information will appear here once available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
